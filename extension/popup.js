const LABELS = {
  idle: 'Not connected',
  needs_access: 'Website access required',
  connecting: 'Connecting...',
  recording: 'Connected - recording',
  offline: 'Offline - retrying',
  tab_closed: 'Disconnected - session tab closed',
  stopped: 'Session stopped',
  error: 'Disconnected',
};
const TONE = { recording: 'recording', offline: 'warn', needs_access: 'warn', connecting: 'warn', tab_closed: 'warn', error: 'bad' };

const $ = (id) => document.getElementById(id);

function render(s) {
  if (!s) return;
  $('status').className = `status ${TONE[s.status] || ''}`;
  $('status-label').textContent = LABELS[s.status] || s.status;
  $('details').hidden = !s.sessionId;
  $('session-id').textContent = s.sessionId || '';
  $('target').textContent = s.targetUrl || '';
  $('queued').textContent = `${s.queued} event(s)${s.dropped ? `, ${s.dropped} dropped` : ''}`;
  $('error').hidden = !s.lastError;
  $('error').textContent = s.lastError || '';
  $('hint').hidden = Boolean(s.sessionId) && s.status !== 'stopped';
  $('grant').hidden = s.status !== 'needs_access';
  $('stop').hidden = !s.sessionId || ['idle', 'stopped', 'error'].includes(s.status);
}

async function refresh() {
  render(await chrome.runtime.sendMessage({ type: 'POPUP_STATUS' }));
}

// Must run from this user gesture: Chrome only shows the permission prompt for extension pages.
$('grant').addEventListener('click', async () => {
  const granted = await chrome.permissions.request({ origins: ['<all_urls>'] });
  if (granted) render(await chrome.runtime.sendMessage({ type: 'POPUP_GRANTED' }));
});

$('stop').addEventListener('click', async () => {
  $('stop').disabled = true;
  render(await chrome.runtime.sendMessage({ type: 'POPUP_STOP' }));
  $('stop').disabled = false;
});

refresh();
setInterval(refresh, 2000);
