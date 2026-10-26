/**
 * Runs only on the QA platform origin (see manifest). Relays window.postMessage requests from the
 * React app to the service worker and posts the reply back. Only same-window, same-origin messages
 * tagged { source: 'qa-platform' } with a known type are forwarded.
 */
(() => {
  const ORIGIN = window.location.origin;
  const ALLOWED = ['PING', 'CONNECT', 'STOP'];

  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== ORIGIN) return;
    const msg = event.data;
    if (!msg || msg.source !== 'qa-platform' || !ALLOWED.includes(msg.type)) return;

    let payload;
    try {
      payload = await chrome.runtime.sendMessage({ type: `BRIDGE_${msg.type}`, payload: msg.payload });
    } catch (e) {
      payload = { ok: false, error: 'The QA Session Recorder extension was updated. Reload this page.' };
    }
    window.postMessage({ source: 'qa-extension', type: `${msg.type}_RESULT`, requestId: msg.requestId, payload }, ORIGIN);
  });
})();
