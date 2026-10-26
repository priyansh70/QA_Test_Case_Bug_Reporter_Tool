import { useState, useEffect, useCallback } from 'react';

/**
 * Talks to the QA Session Recorder Chrome extension through its bridge content script
 * (window.postMessage, same origin only). Resolves null when the extension does not answer.
 */
function request(type, payload, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const onMessage = (e) => {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data;
      if (!d || d.source !== 'qa-extension' || d.requestId !== requestId) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(d.payload ?? null);
    };
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(null);
    }, timeoutMs);
    window.addEventListener('message', onMessage);
    window.postMessage({ source: 'qa-platform', type, requestId, payload }, window.location.origin);
  });
}

export function useRecorderExtension(pollMs = 3000) {
  const [ext, setExt] = useState({ checked: false, installed: false, status: 'idle' });

  const refresh = useCallback(async () => {
    const res = await request('PING');
    setExt(res && res.installed ? { checked: true, ...res } : { checked: true, installed: false, status: 'idle' });
    return res;
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, pollMs);
    return () => clearInterval(timer);
  }, [refresh, pollMs]);

  // The extension opens the target tab itself so it records only that tab.
  const connect = useCallback(
    async ({ sessionId, token, targetUrl }) => {
      const res = await request('CONNECT', { sessionId, token, targetUrl }, 10000);
      await refresh();
      return res;
    },
    [refresh],
  );

  const stop = useCallback(
    async (sessionId) => {
      const res = await request('STOP', { sessionId });
      await refresh();
      return res;
    },
    [refresh],
  );

  return { ext, refresh, connect, stop };
}
