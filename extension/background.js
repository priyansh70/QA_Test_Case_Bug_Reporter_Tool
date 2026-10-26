/**
 * QA Session Recorder - service worker.
 * Holds the active testing session (id + session-scoped connect token) in chrome.storage.session,
 * which content scripts cannot read. Batches recorder events, retries transient failures with the
 * same sequence numbers (the server de-duplicates), heartbeats the backend and captures screenshots.
 */

const PLATFORM_ORIGINS = chrome.runtime
  .getManifest()
  .content_scripts.flatMap((cs) => cs.matches)
  .map((m) => new URL(m.replace(/\*$/, '')).origin);
const ALL_URLS = { origins: ['<all_urls>'] };
const MAX_QUEUE = 1000;
const BATCH_SIZE = 50;
const FLUSH_DELAY_MS = 2000;
const HEARTBEAT_ALARM = 'qa-heartbeat';

// status: idle | needs_access | connecting | recording | offline | tab_closed | stopped | error
let state = null;
let loading = null;
let flushing = null;
let flushTimer = null;

// Memoized so concurrent handlers after a service-worker restart share one state object.
function load() {
  if (state) return Promise.resolve(state);
  if (!loading) {
    loading = chrome.storage.session.get('qa').then((stored) => {
      state = state || stored.qa || { status: 'idle', queue: [], nextSeq: 1, dropped: 0 };
      return state;
    });
  }
  return loading;
}

function save() {
  return chrome.storage.session.set({ qa: state });
}

function isActive() {
  return Boolean(state && state.sessionId && !['idle', 'stopped', 'error'].includes(state.status));
}

function hostAllowed(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.replace(/^www\./, '');
    return host === state.targetHost || host.endsWith(`.${state.targetHost}`);
  } catch (e) {
    return false;
  }
}

function publicStatus() {
  return {
    installed: true,
    version: chrome.runtime.getManifest().version,
    status: state?.status || 'idle',
    sessionId: state?.sessionId || null,
    targetUrl: state?.targetUrl || null,
    queued: state?.queue?.length || 0,
    dropped: state?.dropped || 0,
    lastError: state?.lastError || null,
  };
}

async function setStatus(status, lastError = null) {
  state.status = status;
  state.lastError = lastError;
  await save();
  const badge = { recording: 'REC', offline: '!', needs_access: '?', tab_closed: '!' }[status] || '';
  chrome.action.setBadgeText({ text: badge });
  chrome.action.setBadgeBackgroundColor({ color: status === 'recording' ? '#059669' : '#d97706' });
  if (state.tabId) chrome.tabs.sendMessage(state.tabId, { type: 'STATUS', status }).catch(() => {});
}

async function api(path, body) {
  const res = await fetch(`${state.apiBase}/api/testing-sessions/${encodeURIComponent(state.sessionId)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Token': state.token },
    body: JSON.stringify(body || {}),
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // non-JSON body; status code is enough
  }
  return { status: res.status, data };
}

/** Handles responses that mean the session can no longer be recorded. Returns true if handled. */
async function handleTerminal(status, data) {
  if (status === 409) {
    await teardown('stopped', data?.error || 'Session stopped.');
    return true;
  }
  if (status === 401 || status === 404) {
    await teardown('error', data?.error || 'Session token rejected. Reconnect from the dashboard.');
    return true;
  }
  return false;
}

async function teardown(status, message) {
  chrome.alarms.clear(HEARTBEAT_ALARM);
  clearTimeout(flushTimer);
  const tabId = state.tabId;
  state.token = null;
  state.queue = [];
  await setStatus(status, message);
  if (tabId) chrome.tabs.sendMessage(tabId, { type: 'STATUS', status: 'stopped' }).catch(() => {});
}

async function injectRecorder(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !hostAllowed(tab.url)) return;
    await chrome.scripting.executeScript({ target: { tabId }, files: ['redact.js', 'recorder.js'] });
  } catch (e) {
    // Tab still loading or not scriptable; tabs.onUpdated retries on 'complete'.
  }
}

/** Handshake with the backend; on success resumes ordering from the server's last_seq. */
async function startRecording() {
  if (!(await chrome.permissions.contains(ALL_URLS))) {
    await setStatus('needs_access', 'Click the extension icon and grant website access to start recording.');
    return;
  }
  await setStatus('connecting');
  let res;
  try {
    res = await api('/connect');
  } catch (e) {
    await setStatus('offline', 'Cannot reach the QA platform. Retrying...');
    return;
  }
  if (await handleTerminal(res.status, res.data)) return;
  if (res.status !== 200) {
    await setStatus('offline', res.data?.error || `Connect failed (${res.status}). Retrying...`);
    return;
  }
  state.nextSeq = Math.max(state.nextSeq, (res.data.session.last_seq || 0) + 1);
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.5 });
  await setStatus('recording');
  if (state.tabId) await injectRecorder(state.tabId);
  scheduleFlush(0);
}

function scheduleFlush(delay = FLUSH_DELAY_MS) {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flush(), delay);
}

/** Sends queued events in order, one batch in flight at a time. Events leave the queue only after the server persisted them. */
function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    await load();
    while (isActive() && state.token && state.queue.length > 0) {
      const batch = state.queue.slice(0, BATCH_SIZE);
      let res;
      try {
        res = await api('/events/batch', { events: batch });
      } catch (e) {
        await setStatus('offline', 'Network error - events are queued and will be retried.');
        scheduleFlush(10000);
        return;
      }
      if (await handleTerminal(res.status, res.data)) return;
      if (res.status === 200 || res.status === 400 || res.status === 413) {
        // 400/413 = invalid batch or session event cap reached; drop it rather than retrying forever.
        if (res.status !== 200) state.dropped += batch.length;
        const sent = new Set(batch.map((e) => e.seq));
        state.queue = state.queue.filter((e) => !sent.has(e.seq));
        if (state.status === 'offline') await setStatus('recording');
        else await save();
      } else {
        await setStatus('offline', res.data?.error || `Server error (${res.status}) - retrying.`);
        scheduleFlush(10000);
        return;
      }
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function enqueue(event) {
  if (!isActive() || state.status === 'needs_access') return;
  state.queue.push({ ...event, seq: state.nextSeq++ });
  if (state.queue.length > MAX_QUEUE) {
    state.dropped += state.queue.length - MAX_QUEUE;
    state.queue = state.queue.slice(-MAX_QUEUE);
  }
  await save();
  if (state.queue.length >= BATCH_SIZE) scheduleFlush(0);
  else scheduleFlush();
}

async function reportBug({ title, url, pageTitle }) {
  if (!isActive() || !state.token) return { ok: false, error: 'No active testing session.' };
  await flush(); // persist preceding actions so the server attaches them to this bug

  let screenshot = null;
  let captureError = null;
  try {
    const tab = await chrome.tabs.get(state.tabId);
    screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 70 });
  } catch (e) {
    captureError = e.message;
  }

  const body = { clientBugId: crypto.randomUUID(), title, url, pageTitle, capturedAt: new Date().toISOString(), screenshot };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await api('/bugs', body);
      if (res.status === 200 || res.status === 201) {
        return { ok: true, bugId: res.data.bug.id, warning: captureError ? `Saved without screenshot: ${captureError}` : null };
      }
      if (await handleTerminal(res.status, res.data)) return { ok: false, error: res.data?.error || 'Session ended.' };
      if (res.status < 500) return { ok: false, error: res.data?.error || `Rejected (${res.status}).` };
    } catch (e) {
      // network error: retry with the same clientBugId (server de-duplicates)
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  return { ok: false, error: 'Could not reach the QA platform. Please try again.' };
}

async function openTargetTab() {
  if (state.tabId) {
    try {
      await chrome.tabs.update(state.tabId, { active: true });
      return;
    } catch (e) {
      state.tabId = null;
    }
  }
  const tab = await chrome.tabs.create({ url: state.targetUrl, active: true });
  state.tabId = tab.id;
  await save();
}

async function onBridgeConnect(payload, sender) {
  const { sessionId, token, targetUrl } = payload || {};
  let target;
  try {
    target = new URL(targetUrl);
  } catch (e) {
    return { ok: false, error: 'Invalid target URL.' };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(String(sessionId || '')) || !/^[a-f0-9]{64}$/.test(String(token || '')) || !/^https?:$/.test(target.protocol)) {
    return { ok: false, error: 'Invalid session connection details.' };
  }
  if (isActive() && state.sessionId !== sessionId) {
    await teardown('idle', null); // one recorded session at a time
  }
  const sameSession = state.sessionId === sessionId;
  state = {
    ...state,
    sessionId,
    token,
    apiBase: new URL(sender.url).origin,
    targetUrl: target.toString(),
    targetHost: target.hostname.replace(/^www\./, ''),
    tabId: sameSession ? state.tabId : null,
    queue: sameSession ? state.queue : [],
    nextSeq: sameSession ? state.nextSeq : 1,
    dropped: sameSession ? state.dropped : 0,
  };
  await save();
  await openTargetTab();
  await startRecording();
  return { ok: true, ...publicStatus() };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    await load();
    const fromPlatform = sender.tab && sender.url && PLATFORM_ORIGINS.includes(new URL(sender.url).origin);
    const fromPopup = !sender.tab && sender.id === chrome.runtime.id;
    const fromSessionTab = sender.tab && state.tabId && sender.tab.id === state.tabId;

    switch (msg?.type) {
      case 'BRIDGE_PING':
        return fromPlatform ? publicStatus() : null;
      case 'BRIDGE_CONNECT':
        return fromPlatform ? onBridgeConnect(msg.payload, sender) : null;
      case 'BRIDGE_STOP':
        if (fromPlatform && msg.payload?.sessionId === state.sessionId) await teardown('stopped', null);
        return fromPlatform ? publicStatus() : null;
      case 'POPUP_STATUS':
        return fromPopup ? publicStatus() : null;
      case 'POPUP_GRANTED':
        if (fromPopup && state.sessionId && state.token) await startRecording();
        return fromPopup ? publicStatus() : null;
      case 'POPUP_STOP':
        if (fromPopup && isActive() && state.token) {
          await flush();
          try {
            await api('/stop');
          } catch (e) {
            // backend unreachable; local recording still stops
          }
          await teardown('stopped', null);
        }
        return fromPopup ? publicStatus() : null;
      case 'EVENT':
        if (fromSessionTab && state.status !== 'stopped') await enqueue(msg.event);
        return null;
      case 'REPORT_BUG':
        return fromSessionTab ? reportBug(msg.payload || {}) : { ok: false, error: 'This tab is not part of the testing session.' };
      case 'RECORDER_STATUS':
        return fromSessionTab ? { status: state.status } : { status: 'stopped' };
      default:
        return null;
    }
  })().then(sendResponse, (e) => sendResponse({ ok: false, error: e.message }));
  return true; // async response
});

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  await load();
  if (tabId === state.tabId && info.status === 'complete' && ['recording', 'offline'].includes(state.status)) {
    await injectRecorder(tabId);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await load();
  if (tabId === state.tabId) {
    state.tabId = null;
    await flush();
    if (isActive()) await setStatus('tab_closed', 'The session tab was closed. Reconnect from the dashboard to reopen it.');
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== HEARTBEAT_ALARM) return;
  await load();
  if (!isActive() || !state.token) return;
  try {
    const res = await api('/connect');
    if (await handleTerminal(res.status, res.data)) return;
    if (res.status === 200 && state.status === 'offline') await setStatus(state.tabId ? 'recording' : 'tab_closed');
  } catch (e) {
    await setStatus('offline', 'Cannot reach the QA platform. Retrying...');
  }
  flush();
});
