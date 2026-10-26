import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Globe, Clock, Bug, Plug, CircleStop, ExternalLink, MousePointerClick, Navigation,
  FileInput, Send, LoaderCircle, TriangleAlert, Info, Camera, Trash2, Link as LinkIcon, Copy,
} from 'lucide-react';
import CapturedBugPanel from './CapturedBugPanel';
import ConfirmModal from './ConfirmModal';
import {
  fetchTestingSession,
  fetchSessionBugs,
  fetchSessionEvents,
  rotateSessionConnectToken,
  stopTestingSession,
  deleteCapturedBug,
  fetchCapturedBugScreenshotUrl,
} from '../services/api';

const STATUS_STYLES = {
  created: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  recording: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  stopped: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30',
  failed: 'bg-red-500/15 text-red-500 border-red-500/30',
};

const EVENT_ICONS = { page_load: Globe, navigation: Navigation, click: MousePointerClick, input: FileInput, submit: Send };

export function SessionStatusBadge({ status }) {
  return <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${STATUS_STYLES[status] || ''}`}>{status}</span>;
}

function describeEvent(e) {
  const tgt = e.target || {};
  const name = tgt.label || tgt.name || tgt.id || tgt.testId || tgt.tag || 'element';
  if (e.type === 'page_load') return `Opened "${e.title || e.url}"`;
  if (e.type === 'navigation') return `Navigated to "${e.title || e.url}"`;
  if (e.type === 'click') return `Clicked ${tgt.tag || 'element'} "${name}"`;
  if (e.type === 'input') return `Changed field "${name}"`;
  if (e.type === 'submit') return `Submitted form "${name}"`;
  return e.type;
}

function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}h ` : ''}${m}m ${s % 60}s`;
}

function BugThumb({ bugId, hasScreenshot }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!hasScreenshot) return undefined;
    let url = null;
    let cancelled = false;
    fetchCapturedBugScreenshotUrl(bugId).then((u) => {
      url = u;
      if (!cancelled) setSrc(u);
      else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [bugId, hasScreenshot]);
  if (!src) {
    return (
      <div className="w-24 h-16 rounded-lg bg-neutral-500/10 flex items-center justify-center shrink-0">
        <Camera className="w-4 h-4 text-neutral-500" aria-label={hasScreenshot ? 'Loading screenshot' : 'No screenshot'} />
      </div>
    );
  }
  return <img src={src} alt="Bug screenshot preview" className="w-24 h-16 object-cover rounded-lg border border-neutral-500/20 shrink-0" />;
}

export default function SessionDashboard({ t, sessionId, launch, extension, provider, model, onBack, onShowToast }) {
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [error, setError] = useState(null);
  const [selectedBugId, setSelectedBugId] = useState(null);
  const [busy, setBusy] = useState(null); // 'connect' | 'stop'
  const [now, setNow] = useState(() => Date.now());
  const lastSeqRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [s, b, e] = await Promise.all([
        fetchTestingSession(sessionId),
        fetchSessionBugs(sessionId),
        fetchSessionEvents(sessionId, lastSeqRef.current),
      ]);
      setSession(s.session);
      setBugs(b.bugs || []);
      if (e.events?.length) {
        lastSeqRef.current = e.events[e.events.length - 1].seq;
        setEvents((prev) => [...prev, ...e.events].slice(-500));
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [sessionId]);

  const stopped = session?.status === 'stopped';

  useEffect(() => {
    refresh();
    if (stopped) return undefined;
    const poll = setInterval(refresh, 4000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [refresh, stopped]);

  const handleConnect = async () => {
    setBusy('connect');
    try {
      const { connectToken } = await rotateSessionConnectToken(sessionId);
      const res = await extension.connect({ sessionId, token: connectToken, targetUrl: session.website_url });
      if (!res || res.ok === false) onShowToast(res?.error || 'The extension did not respond. Reload this page and try again.');
      await refresh();
    } catch (err) {
      onShowToast(err.message);
    } finally {
      setBusy(null);
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    onShowToast('Link copied to clipboard!');
  };

  const [pendingBug, setPendingBug] = useState(null);
  const [deletingBug, setDeletingBug] = useState(false);

  const handleDeleteBug = async () => {
    setDeletingBug(true);
    try {
      await deleteCapturedBug(pendingBug.id);
      onShowToast('Captured bug deleted.');
      setPendingBug(null);
      await refresh();
    } catch (err) {
      onShowToast(err.message);
    } finally {
      setDeletingBug(false);
    }
  };

  const handleStop = async () => {
    if (!window.confirm('Stop this testing session? Recording ends and the session cannot be restarted.')) return;
    setBusy('stop');
    try {
      await stopTestingSession(sessionId);
      await extension.stop(sessionId);
      onShowToast('Testing session stopped and saved.');
      await refresh();
    } catch (err) {
      onShowToast(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (!session) {
    return (
      <div className={`text-xs ${t.muted}`}>
        {error ? <p className="text-red-500">{error}</p> : <p>Loading session...</p>}
        <button onClick={onBack} className={`mt-3 px-3 py-1.5 rounded-xl border ${t.ghostBtn}`}>Back</button>
      </div>
    );
  }

  const ext = extension.ext;
  const extForThis = ext.installed && ext.sessionId === sessionId ? ext : null;
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : null;
  const durationMs = startedAt ? (session.ended_at ? new Date(session.ended_at).getTime() : now) - startedAt : 0;

  // Recording is only reported once the backend has seen the extension's heartbeat.
  let recording;
  if (stopped) recording = { label: 'Stopped', tone: 'text-neutral-400' };
  else if (session.extension_connected) recording = { label: 'Recording - extension connected', tone: 'text-emerald-500' };
  else if (extForThis?.status === 'needs_access')
    recording = { label: 'Waiting for website access', tone: 'text-amber-500', hint: 'Click the QA Session Recorder icon in the Chrome toolbar and press "Grant website access & start recording".' };
  else if (session.status === 'recording')
    recording = { label: 'Extension disconnected', tone: 'text-amber-500', hint: 'Events captured while offline are queued by the extension. Use "Reconnect extension" if the session tab was closed.' };
  else recording = { label: 'Not recording yet - waiting for the extension to connect', tone: 'text-amber-500' };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border ${t.ghostBtn}`}>
        <ArrowLeft className="w-3.5 h-3.5" /> All sessions
      </button>

      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className={`rounded-2xl border p-4 space-y-3 ${t.card}`} aria-label="Session details">
            <div className="flex items-center gap-2 flex-wrap">
              <SessionStatusBadge status={session.status} />
              <span className={`text-[11px] font-mono ${t.muted}`}>{session.id}</span>
            </div>
            <p className={`text-sm font-bold ${recording.tone}`} role="status">{recording.label}</p>
            {recording.hint && <p className={`text-xs ${t.muted}`}>{recording.hint}</p>}
            <dl className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs ${t.text}`}>
              <dt className={t.muted}>Website</dt>
              <dd className="break-all">{session.website_url}</dd>
              <dt className={t.muted}>Project</dt>
              <dd>{session.azure_project_name}</dd>
              <dt className={t.muted}>Sprint</dt>
              <dd>{session.azure_iteration_path}</dd>
              <dt className={t.muted}>Duration</dt>
              <dd className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {startedAt ? formatDuration(durationMs) : 'not started'}</dd>
              <dt className={t.muted}>Events</dt>
              <dd>{session.event_count}</dd>
              <dt className={t.muted}>Bugs</dt>
              <dd>{session.bug_count}</dd>
            </dl>

            {launch?.connectResult && launch.connectResult.ok === false && (
              <p className="text-xs text-red-500 flex gap-1.5" role="alert">
                <TriangleAlert className="w-4 h-4 shrink-0" /> {launch.connectResult.error}
              </p>
            )}

            {!stopped && ext.checked && !ext.installed && (
              <div className="text-xs rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5">
                <p className="font-bold text-amber-500 flex items-center gap-1.5"><Info className="w-4 h-4" /> Recorder extension not detected</p>
                <ol className={`list-decimal pl-4 space-y-0.5 ${t.text}`}>
                  <li>Open <code>chrome://extensions</code> and enable Developer mode.</li>
                  <li>Click "Load unpacked" and select the <code>extension/</code> folder of this project.</li>
                  <li>Reload this page, then click "Reconnect extension".</li>
                </ol>
                <p className={t.muted}>Until then, nothing is being recorded{launch?.openedManually ? ' (the website was opened in a new tab without recording)' : ''}.</p>
              </div>
            )}

            {!stopped && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleConnect}
                  disabled={!ext.installed || busy !== null}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-extrabold rounded-xl"
                >
                  {busy === 'connect' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                  {session.status === 'created' ? 'Connect extension' : 'Reconnect extension'}
                </button>
                <a
                  href={session.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border ${t.ghostBtn}`}
                >
                  <ExternalLink className="w-4 h-4" /> Open website
                </a>
                <button
                  onClick={handleStop}
                  disabled={busy !== null}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl"
                >
                  {busy === 'stop' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <CircleStop className="w-4 h-4" />}
                  Stop session
                </button>
              </div>
            )}
          </section>

          <section className={`rounded-2xl border p-4 ${t.card}`} aria-label="Event timeline">
            <h3 className={`text-xs font-bold mb-2 ${t.text}`}>Event timeline</h3>
            {events.length === 0 ? (
              <p className={`text-xs ${t.muted}`}>No events recorded yet.</p>
            ) : (
              <ol className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {events.map((e) => {
                  const Icon = EVENT_ICONS[e.type] || Globe;
                  return (
                    <li key={e.seq} className={`flex gap-2 text-xs ${t.text}`}>
                      <span className={`font-mono shrink-0 ${t.muted}`}>{new Date(e.ts).toLocaleTimeString()}</span>
                      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" aria-hidden="true" />
                      <span className="break-all">{describeEvent(e)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <div className="lg:col-span-3">
          {selectedBugId ? (
            <CapturedBugPanel
              t={t}
              bugId={selectedBugId}
              provider={provider}
              model={model}
              onBack={() => setSelectedBugId(null)}
              onChanged={refresh}
              onShowToast={onShowToast}
            />
          ) : (
            <section className={`rounded-2xl border p-4 ${t.card}`} aria-label="Captured bugs">
              <h3 className={`text-xs font-bold mb-3 flex items-center gap-1.5 ${t.text}`}>
                <Bug className="w-4 h-4 text-red-500" /> Captured bugs ({bugs.length})
              </h3>
              {bugs.length === 0 ? (
                <p className={`text-xs ${t.muted}`}>Use the floating "Report Bug" button on the website to capture a bug with a screenshot.</p>
              ) : (
                <ul className="space-y-2">
                  {bugs.map((b) => (
                    <li key={b.id} className="flex items-stretch gap-2">
                      <button
                        onClick={() => setSelectedBugId(b.id)}
                        className={`flex-1 min-w-0 text-left flex gap-3 rounded-xl border p-2.5 hover:border-emerald-500/50 ${t.card}`}
                      >
                        <BugThumb bugId={b.id} hasScreenshot={Boolean(b.screenshot_file)} />
                        <div className="min-w-0 space-y-1">
                          <p className={`text-xs font-bold truncate ${t.text}`}>{b.title}</p>
                          <p className={`text-[11px] truncate ${t.muted}`}>{b.page_title || b.page_url}</p>
                          <p className={`text-[11px] ${t.muted}`}>
                            {new Date(b.captured_at).toLocaleTimeString()} · Report: {b.report_status.replace('_', ' ')} · Azure:{' '}
                            {b.azure_status === 'created' ? `#${b.azure_work_item_id}` : b.azure_status.replace('_', ' ')}
                          </p>
                        </div>
                      </button>
                      <div className="flex flex-col justify-center gap-1">
                        {b.azure_status === 'created' && b.azure_url && (
                          <a href={b.azure_url} target="_blank" rel="noopener noreferrer" title="Open in Azure DevOps" aria-label="Open in Azure DevOps" className={`p-1.5 rounded-lg border ${t.ghostBtn}`}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {b.public_link && (
                          <>
                            <a href={b.public_link} target="_blank" rel="noopener noreferrer" title="Open public link" aria-label="Open public link" className={`p-1.5 rounded-lg border ${t.ghostBtn}`}>
                              <LinkIcon className="w-3.5 h-3.5" />
                            </a>
                            {/* <button onClick={() => copyLink(b.public_link)} title="Copy public link" aria-label="Copy public link" className={`p-1.5 rounded-lg border ${t.ghostBtn}`}>
                              <Copy className="w-3.5 h-3.5" />
                            </button> */}
                          </>
                        )}
                        <button
                          onClick={() => setPendingBug(b)}
                          disabled={b.azure_status === 'creating'}
                          title="Delete bug"
                          aria-label="Delete bug"
                          className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
      <ConfirmModal
        t={t}
        open={Boolean(pendingBug)}
        busy={deletingBug}
        title="Delete captured bug?"
        message={`"${pendingBug?.title || ''}" and its screenshot will be permanently deleted.${pendingBug?.azure_status === 'created' ? ' The Azure DevOps bug is not deleted.' : ''}`}
        onConfirm={handleDeleteBug}
        onCancel={() => setPendingBug(null)}
      />
    </div>
  );
}
