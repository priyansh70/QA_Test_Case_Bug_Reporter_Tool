/**
 * Injected by the service worker into the testing-session tab only (never declared for all sites).
 * Records navigation, clicks, field changes and form submits as metadata. Typed values are never
 * read; sensitive fields are masked via QARedact. Adds the floating "Report Bug" control.
 */
(() => {
  if (window.__qaRecorderLoaded) return;
  window.__qaRecorderLoaded = true;

  const R = globalThis.QARedact;
  let stopped = false;
  let host = null;
  let lastUrl = location.href;

  const send = (msg) => chrome.runtime.sendMessage(msg).catch(() => null);

  const INTERACTIVE = 'a,button,input,select,textarea,summary,label,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=option]';
  const FORM_TAGS = ['input', 'select', 'textarea'];

  function fieldLabel(el) {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) return lbl.innerText;
    }
    const wrapping = el.closest('label');
    if (wrapping) return wrapping.innerText;
    return el.getAttribute('placeholder') || el.getAttribute('name') || '';
  }

  function selectorFor(el) {
    const tag = el.tagName.toLowerCase();
    const testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-cy');
    if (testId) return `${tag}[data-testid="${testId}"]`;
    if (el.id) return `${tag}#${el.id}`;
    if (el.getAttribute('name')) return `${tag}[name="${el.getAttribute('name')}"]`;
    const cls = Array.from(el.classList).slice(0, 2).join('.');
    return cls ? `${tag}.${cls}` : tag;
  }

  /** Builds safe element metadata. Never includes the value of form fields. */
  function describe(rawEl) {
    const interactive = rawEl.closest && rawEl.closest(INTERACTIVE);
    const el = interactive || rawEl;
    if (!el || !el.tagName) return null;
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || '').toLowerCase();
    const isField = FORM_TAGS.includes(tag);
    const desc = {
      tag,
      type,
      id: el.id || '',
      name: el.getAttribute('name') || '',
      role: el.getAttribute('role') || '',
      testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-cy') || '',
      autocomplete: el.getAttribute('autocomplete') || '',
      selector: selectorFor(el),
      sensitive: Boolean(el.closest('[data-qa-mask],[data-private]')),
    };
    if (isField) {
      // Button-like inputs show their value as the visible label; every other field value is ignored.
      desc.label = ['submit', 'button', 'reset'].includes(type) ? el.value : fieldLabel(el);
      desc.sensitive = desc.sensitive || R.isSensitiveField(desc);
    } else if (interactive) {
      // Only interactive elements get a text label; arbitrary containers may hold page content.
      desc.label = el.getAttribute('aria-label') || (el.innerText || '').slice(0, 120) || el.getAttribute('title') || el.getAttribute('alt') || '';
    }
    return R.sanitizeTarget(desc);
  }

  function record(type, target = null) {
    if (stopped) return;
    send({
      type: 'EVENT',
      event: { type, url: R.redactUrl(location.href), title: R.redactText(document.title, 120), ts: new Date().toISOString(), target },
    });
  }

  const isOwn = (e) => host && e.composedPath().includes(host);

  const onClick = (e) => {
    if (!isOwn(e)) record('click', describe(e.target));
  };
  const onChange = (e) => {
    if (!isOwn(e) && FORM_TAGS.includes(e.target.tagName?.toLowerCase())) record('input', describe(e.target));
  };
  const onSubmit = (e) => {
    if (!isOwn(e)) record('submit', describe(e.target));
  };
  const checkNavigation = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      record('navigation');
    }
  };

  document.addEventListener('click', onClick, true);
  document.addEventListener('change', onChange, true);
  document.addEventListener('submit', onSubmit, true);
  window.addEventListener('popstate', checkNavigation);
  window.addEventListener('hashchange', checkNavigation);
  // pushState in the page's world is invisible to this isolated world, so poll for SPA URL changes.
  const navTimer = setInterval(checkNavigation, 1000);

  // ---------- Floating Report Bug control (closed shadow DOM isolates styles from the page) ----------
  host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .wrap { font: 13px/1.4 -apple-system, Segoe UI, Arial, sans-serif; display:flex; flex-direction:column; align-items:flex-end; gap:8px; }
      .pill { background:#0a0a0a; color:#e5e5e5; border:1px solid #2a2a2a; border-radius:999px; padding:4px 10px; font-size:11px; display:flex; align-items:center; gap:6px; }
      .dot { width:8px; height:8px; border-radius:50%; background:#10b981; }
      .dot.off { background:#f59e0b; } .dot.stop { background:#ef4444; }
      button { font: inherit; cursor:pointer; border-radius:12px; border:0; padding:10px 16px; font-weight:700; }
      .report { background:#dc2626; color:#fff; box-shadow:0 8px 24px rgba(0,0,0,.35); }
      .report:focus-visible, .primary:focus-visible, .ghost:focus-visible, input:focus-visible { outline:2px solid #34d399; outline-offset:2px; }
      .panel { background:#141414; color:#e5e5e5; border:1px solid #2a2a2a; border-radius:14px; padding:12px; width:300px; box-shadow:0 12px 32px rgba(0,0,0,.45); display:none; }
      .panel.open { display:block; }
      label { display:block; font-size:11px; color:#a3a3a3; margin-bottom:4px; }
      input { width:100%; box-sizing:border-box; background:#0a0a0a; color:#fff; border:1px solid #333; border-radius:8px; padding:8px; font: inherit; }
      .row { display:flex; gap:8px; justify-content:flex-end; margin-top:10px; }
      .primary { background:#10b981; color:#000; } .ghost { background:#262626; color:#e5e5e5; }
      .toast { background:#0a0a0a; color:#e5e5e5; border:1px solid #2a2a2a; border-radius:10px; padding:8px 12px; max-width:300px; display:none; }
      .toast.show { display:block; } .toast.err { border-color:#dc2626; }
    </style>
    <div class="wrap">
      <div class="toast" role="status" aria-live="polite"></div>
      <div class="panel" role="dialog" aria-label="Report a bug">
        <label for="qa-title">One-line bug title (optional, editable later)</label>
        <input id="qa-title" maxlength="200" autocomplete="off" placeholder="e.g. Checkout total does not update" />
        <div class="row"><button class="ghost" data-act="cancel">Cancel</button><button class="primary" data-act="capture">Capture bug</button></div>
      </div>
      <div class="pill"><span class="dot"></span><span class="label">Recording</span></div>
      <button class="report" data-act="open">🐞 Report Bug</button>
    </div>`;
  document.documentElement.appendChild(host);

  const $ = (s) => root.querySelector(s);
  const panel = $('.panel');
  const titleInput = $('#qa-title');
  const toast = $('.toast');
  let toastTimer;

  function showToast(text, isError = false) {
    toast.textContent = text;
    toast.className = `toast show${isError ? ' err' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.className = 'toast';
    }, 4000);
  }

  function setStatus(status) {
    const labels = { recording: 'Recording', offline: 'Offline - retrying', connecting: 'Connecting...', needs_access: 'Waiting for access', tab_closed: 'Disconnected', error: 'Disconnected', stopped: 'Stopped' };
    $('.label').textContent = labels[status] || status;
    $('.dot').className = `dot${status === 'recording' ? '' : status === 'stopped' || status === 'error' ? ' stop' : ' off'}`;
    if (status === 'stopped' || status === 'error' || status === 'idle') shutdown();
  }

  function shutdown() {
    if (stopped) return;
    stopped = true;
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('change', onChange, true);
    document.removeEventListener('submit', onSubmit, true);
    window.removeEventListener('popstate', checkNavigation);
    window.removeEventListener('hashchange', checkNavigation);
    clearInterval(navTimer);
    setTimeout(() => host.remove(), 1500);
    window.__qaRecorderLoaded = false;
  }

  async function capture() {
    const captureBtn = $('[data-act="capture"]');
    captureBtn.disabled = true;
    const title = titleInput.value.trim();
    panel.className = 'panel';
    // Hide the overlay so it does not appear in the screenshot.
    host.style.visibility = 'hidden';
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50))));
    const res = await send({ type: 'REPORT_BUG', payload: { title, url: R.redactUrl(location.href), pageTitle: R.redactText(document.title, 200) } });
    host.style.visibility = 'visible';
    captureBtn.disabled = false;
    if (res && res.ok) {
      titleInput.value = '';
      showToast(res.warning || 'Bug captured. Keep testing - review it in the dashboard.', Boolean(res.warning));
    } else {
      showToast((res && res.error) || 'Failed to capture bug.', true);
    }
  }

  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'open') {
      panel.className = 'panel open';
      titleInput.focus();
    } else if (act === 'cancel') {
      panel.className = 'panel';
    } else if (act === 'capture') {
      capture();
    }
  });
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') capture();
    if (e.key === 'Escape') panel.className = 'panel';
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'STATUS') setStatus(msg.status);
  });

  send({ type: 'RECORDER_STATUS' }).then((res) => setStatus(res?.status || 'stopped'));
  record('page_load');
})();
