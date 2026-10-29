import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Plus, Globe, Bug, Clock, LoaderCircle, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import SearchableSelect from './SearchableSelect';
import ConfirmModal from './ConfirmModal';
import SessionDashboard, { SessionStatusBadge } from './SessionDashboard';
import { useRecorderExtension } from '../hooks/useRecorderExtension';
import {
  fetchAzureProjects,
  fetchAzureIterations,
  createTestingSession,
  fetchTestingSessions,
  deleteTestingSession,
} from '../services/api';

const DEFAULT_URL = '';
const DEFAULT_PROJECT_NAME = 'SMS Plus';

function themeClasses(isDark) {
  return {
    isDark,
    panel: isDark ? 'bg-neutral-900/95 border-neutral-800' : 'bg-[var(--surface)] border-[var(--border-subtle)]',
    card: isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-[var(--surface-hover)] border-[var(--border-default)]',
    text: isDark ? 'text-white' : 'text-[var(--text-primary)]',
    muted: isDark ? 'text-neutral-400' : 'text-[var(--text-muted)]',
    input: isDark
      ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-600'
      : 'bg-[var(--surface-hover)] border-[var(--border-default)] text-[var(--text-primary)]',
    ghostBtn: isDark
      ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800'
      : 'bg-[var(--surface-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)]',
  };
}

function validateWebsiteUrl(value) {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return 'Only http:// and https:// URLs are supported.';
    if (url.username || url.password) return 'Remove credentials from the URL.';
    return null;
  } catch {
    return 'Enter a valid URL, e.g. https://example.com';
  }
}

function NewSessionForm({ t, onCreated, onCancel, onShowToast }) {
  const [websiteUrl, setWebsiteUrl] = useState(DEFAULT_URL);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [iterations, setIterations] = useState([]);
  const [iterationId, setIterationId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingIterations, setLoadingIterations] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    setLoadingProjects(true);
    fetchAzureProjects()
      .then((data) => {
        const list = Array.isArray(data.projects) ? data.projects : [];
        setProjects(list);
        const preferred = list.find((p) => p.name.toLowerCase() === DEFAULT_PROJECT_NAME.toLowerCase());
        if (preferred) setProjectId(preferred.id);
      })
      .catch((err) => setErrors((e) => ({ ...e, project: err.message })))
      .finally(() => setLoadingProjects(false));
  }, []);

  const projectName = projects.find((p) => p.id === projectId)?.name || '';

  useEffect(() => {
    setIterations([]);
    setIterationId('');
    if (!projectName) return undefined;
    let cancelled = false;
    setLoadingIterations(true);
    fetchAzureIterations(projectName)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data.iterations) ? data.iterations : [];
        setIterations(list);
        const current = list.find((it) => it.isCurrent) || list[0];
        if (current) setIterationId(String(current.id));
      })
      .catch((err) => {
        if (!cancelled) setErrors((e) => ({ ...e, iteration: err.message }));
      })
      .finally(() => {
        if (!cancelled) setLoadingIterations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return; // guard against double clicks before re-render
    const next = {};
    const urlError = validateWebsiteUrl(websiteUrl);
    if (urlError) next.websiteUrl = urlError;
    if (!projectId) next.project = 'Select an Azure DevOps project.';
    if (!iterationId) next.iteration = 'Select a sprint / iteration.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const data = await createTestingSession({ websiteUrl: websiteUrl.trim(), projectId, iterationId });
      await onCreated(data.session, data.connectToken);
    } catch (err) {
      setErrors({ form: err.message });
      onShowToast(err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const fieldError = (key) =>
    errors[key] && (
      <p className="mt-1 text-[11px] text-red-500" role="alert">
        {errors[key]}
      </p>
    );

  return (
    <form onSubmit={handleSubmit} noValidate className={`rounded-2xl border p-5 space-y-4 ${t.card}`}>
      <h3 className={`font-bold text-sm ${t.text}`}>Start Testing Session</h3>

      <div>
        <label htmlFor="ts-url" className={`block text-xs font-semibold mb-1.5 ${t.muted}`}>
          Website URL
        </label>
        <input
          id="ts-url"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="www.example.com"
          aria-invalid={Boolean(errors.websiteUrl)}
          className={`w-full px-3 py-2 text-xs rounded-xl border outline-none focus:border-emerald-500 ${t.input}`}
        />
        {fieldError('websiteUrl')}
      </div>

      <div>
        <SearchableSelect
          label="Azure DevOps Project"
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          placeholder={loadingProjects ? 'Loading projects...' : 'Select project'}
          disabled={loadingProjects || projects.length === 0}
        />
        {fieldError('project')}
      </div>

      <div>
        <SearchableSelect
          label="Sprint / Iteration"
          value={iterationId}
          onChange={setIterationId}
          options={iterations.map((it) => ({ value: String(it.id), label: it.isCurrent ? `${it.name} (Current Sprint)` : it.name }))}
          placeholder={!projectId ? 'Select a project first' : loadingIterations ? 'Loading sprints...' : 'Select sprint'}
          disabled={!projectId || loadingIterations || iterations.length === 0}
        />
        {fieldError('iteration')}
      </div>

      {fieldError('form')}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`px-4 py-2 text-xs font-semibold rounded-xl border ${t.ghostBtn}`}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black text-xs font-extrabold rounded-xl shadow-md active:scale-95"
        >
          {submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
          {submitting ? 'Creating session...' : 'Start Session'}
        </button>
      </div>
    </form>
  );
}

export default function TestingSessionsModal({ isOpen, onClose, onShowToast, provider, model }) {
  const { isDark } = useTheme();
  const t = themeClasses(isDark);
  const extension = useRecorderExtension();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'new' | 'detail'
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [launch, setLaunch] = useState(null); // { connectResult, openedManually } for a just-created session

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTestingSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      onShowToast(err.message);
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    if (isOpen && view === 'list') loadSessions();
  }, [isOpen, view, loadSessions]);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSession = async () => {
    const s = pendingDelete;
    setDeleting(true);
    try {
      await deleteTestingSession(s.id);
      if (extension.ext.sessionId === s.id) await extension.stop(s.id);
      onShowToast('Testing session deleted.');
      setPendingDelete(null);
      await loadSessions();
    } catch (err) {
      onShowToast(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreated = async (session, connectToken) => {
    setActiveSessionId(session.id);
    setView('detail');
    // Open the target only after the session exists. With the extension installed it opens the tab
    // itself so only that tab is recorded; otherwise open it directly and show setup instructions.
    if (extension.ext.installed) {
      const connectResult = await extension.connect({ sessionId: session.id, token: connectToken, targetUrl: session.website_url });
      setLaunch({ connectResult, openedManually: false });
    } else {
      window.open(session.website_url, '_blank', 'noopener,noreferrer');
      setLaunch({ connectResult: null, openedManually: true });
    }
    onShowToast(`Testing session ${session.id} created.`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm font-sans ${isDark ? 'bg-neutral-950/80' : 'bg-slate-900/30'}`}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Website testing sessions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={`relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl border shadow-2xl p-5 sm:p-6 space-y-5 ${t.panel}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  <Video className="w-5 h-5" />
                </span>
                <div>
                  <h2 className={`font-bold text-lg font-outfit ${t.text}`}>Website Testing Sessions</h2>
                  <p className={`text-xs ${t.muted}`}>Record a session in Chrome, capture bugs, and send them to Azure DevOps.</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className={`p-2 rounded-xl border ${t.ghostBtn}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {view === 'detail' && activeSessionId ? (
              <SessionDashboard
                t={t}
                sessionId={activeSessionId}
                launch={launch}
                extension={extension}
                provider={provider}
                model={model}
                onBack={() => {
                  setLaunch(null);
                  setView('list');
                }}
                onShowToast={onShowToast}
              />
            ) : view === 'new' ? (
              <NewSessionForm t={t} onCreated={handleCreated} onCancel={() => setView('list')} onShowToast={onShowToast} />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className={`text-xs ${t.muted}`}>
                    Recorder extension:{' '}
                    {!extension.ext.checked ? 'checking...' : extension.ext.installed ? `installed (v${extension.ext.version})` : 'not detected'}
                  </p>
                  <button
                    onClick={() => setView('new')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl shadow-md active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> New Session
                  </button>
                </div>
                {loading ? (
                  <p className={`text-xs ${t.muted}`}>Loading sessions...</p>
                ) : sessions.length === 0 ? (
                  <p className={`text-xs ${t.muted}`}>No testing sessions yet. Start one to record a website.</p>
                ) : (
                  <ul className="space-y-2">
                    {sessions.map((s) => (
                      <li key={s.id} className="flex items-stretch gap-2">
                        <button
                          onClick={() => {
                            setActiveSessionId(s.id);
                            setView('detail');
                          }}
                          className={`flex-1 min-w-0 text-left rounded-xl border p-3 flex flex-wrap items-center gap-3 hover:border-emerald-500/50 ${t.card}`}
                        >
                          <SessionStatusBadge status={s.status} />
                          <span className={`flex items-center gap-1 text-xs font-semibold ${t.text}`}>
                            <Globe className="w-3.5 h-3.5 text-emerald-500" /> {s.website_url}
                          </span>
                          <span className={`text-xs ${t.muted}`}>
                            {s.azure_project_name} / {s.azure_iteration_name}
                          </span>
                          <span className={`ml-auto flex items-center gap-3 text-xs ${t.muted}`}>
                            <span className="flex items-center gap-1">
                              <Bug className="w-3.5 h-3.5" /> {s.bug_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {new Date(s.created_at).toLocaleString()}
                            </span>
                          </span>
                        </button>
                        <button
                          onClick={() => setPendingDelete(s)}
                          title="Delete session"
                          aria-label="Delete session"
                          className="px-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </motion.div>
          <ConfirmModal
            t={t}
            open={Boolean(pendingDelete)}
            busy={deleting}
            title="Delete testing session?"
            message={`This permanently deletes the session, its ${pendingDelete?.bug_count ?? 0} captured bug(s), recorded events and screenshots. Bugs already published to Azure DevOps are not deleted.`}
            onConfirm={handleDeleteSession}
            onCancel={() => setPendingDelete(null)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
