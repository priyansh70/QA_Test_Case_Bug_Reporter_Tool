import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Sparkles, Save, Send, LoaderCircle, ExternalLink, TriangleAlert, CircleCheck, Trash2, Link as LinkIcon, Copy } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import {
  deleteCapturedBug,
  fetchCapturedBug,
  updateCapturedBug,
  generateCapturedBugReport,
  createCapturedBugInAzure,
  fetchCapturedBugScreenshotUrl,
} from '../services/api';

const SEVERITIES = ['1 - Critical', '2 - High', '3 - Medium', '4 - Low'];
const REPORT_FIELDS = [
  ['description', 'Description', 4],
  ['stepsToReproduce', 'Steps to Reproduce', 5],
  ['actualResult', 'Actual Result', 3],
  ['expectedResult', 'Expected Result', 3],
];
const EMPTY_REPORT = { title: '', severity: '3 - Medium', description: '', stepsToReproduce: '', expectedResult: '', actualResult: '' };

export default function CapturedBugPanel({ t, bugId, provider, model, onBack, onChanged, onShowToast }) {
  const [bug, setBug] = useState(null);
  const [title, setTitle] = useState('');
  const [report, setReport] = useState(EMPTY_REPORT);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(null); // 'title' | 'generate' | 'save' | 'azure'
  const [error, setError] = useState(null);
  const [shotUrl, setShotUrl] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const apply = useCallback((b) => {
    setBug(b);
    setTitle(b.title);
    setReport({ ...EMPTY_REPORT, ...(b.report || {}) });
    setDirty(false);
  }, []);

  useEffect(() => {
    fetchCapturedBug(bugId)
      .then((d) => apply(d.bug))
      .catch((err) => setError(err.message));
  }, [bugId, apply]);

  useEffect(() => {
    if (!bug?.screenshot_file) return undefined;
    let url = null;
    let cancelled = false;
    fetchCapturedBugScreenshotUrl(bug.id).then((u) => {
      url = u;
      if (!cancelled) setShotUrl(u);
      else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [bug?.id, bug?.screenshot_file]);

  // Runs an action, then re-reads the bug so status/error fields always reflect the server.
  const run = async (kind, fn, successMsg) => {
    setBusy(kind);
    setError(null);
    try {
      const data = await fn();
      if (data?.bug) apply(data.bug);
      if (successMsg) onShowToast(typeof successMsg === 'function' ? successMsg(data) : successMsg);
      onChanged();
      return true;
    } catch (err) {
      setError(err.message);
      onShowToast(err.message);
      const fresh = await fetchCapturedBug(bugId).catch(() => null);
      if (fresh?.bug) apply(fresh.bug);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const locked = bug?.azure_status === 'created' || bug?.azure_status === 'creating';
  const hasReport = Boolean(report.title.trim() && report.description.trim());

  const saveTitle = () => run('title', () => updateCapturedBug(bugId, { title }), 'Bug title saved.');
  const saveReport = () => run('save', () => updateCapturedBug(bugId, { report }), 'Bug report saved.');
  const generate = async () => {
    if (title !== bug.title && !(await run('title', () => updateCapturedBug(bugId, { title })))) return;
    await run('generate', () => generateCapturedBugReport(bugId, { provider, model }), (d) =>
      d.rateLimitFallback ? 'AI rate limit reached - a template report was generated from the recorded steps.' : 'Bug report generated. Review and edit before sending.',
    );
  };
  const createInAzure = async () => {
    if (dirty && !(await run('save', () => updateCapturedBug(bugId, { report })))) return;
    await run('azure', () => createCapturedBugInAzure(bugId), (d) => d.message);
  };

  const deleteBug = async () => {
    setBusy('delete');
    try {
      await deleteCapturedBug(bugId);
      onShowToast('Captured bug deleted.');
      onChanged();
      onBack();
    } catch (err) {
      setError(err.message);
      onShowToast(err.message);
      setBusy(null);
    }
  };

  if (!bug) {
    return (
      <div className={`rounded-2xl border p-4 text-xs ${t.card} ${t.muted}`}>
        {error ? <p className="text-red-500">{error}</p> : 'Loading bug...'}
      </div>
    );
  }

  const fieldClass = `w-full px-3 py-2 text-xs rounded-xl border outline-none focus:border-emerald-500 disabled:opacity-60 ${t.input}`;
  const updateField = (key, value) => {
    setReport((r) => ({ ...r, [key]: value }));
    setDirty(true);
  };

  return (
    <section className={`rounded-2xl border p-4 space-y-4 ${t.card}`} aria-label="Captured bug review">
      <button onClick={onBack} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border ${t.ghostBtn}`}>
        <ArrowLeft className="w-3.5 h-3.5" /> Captured bugs
      </button>

      {shotUrl ? (
        <a href={shotUrl} target="_blank" rel="noopener noreferrer" title="Open full-size screenshot">
          <img src={shotUrl} alt={`Screenshot of ${bug.page_title || bug.page_url}`} className="w-full max-h-72 object-contain rounded-xl border border-neutral-500/20 bg-black/20" />
        </a>
      ) : (
        <p className={`text-xs ${t.muted}`}>{bug.screenshot_file ? 'Loading screenshot...' : 'No screenshot was captured for this bug.'}</p>
      )}

      <dl className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs ${t.text}`}>
        <dt className={t.muted}>Page</dt>
        <dd className="break-all">{bug.page_title || '-'}</dd>
        <dt className={t.muted}>URL</dt>
        <dd className="break-all">{bug.page_url}</dd>
        <dt className={t.muted}>Captured</dt>
        <dd>{new Date(bug.captured_at).toLocaleString()}</dd>
        <dt className={t.muted}>Sprint</dt>
        <dd>{bug.azure_iteration_path}</dd>
      </dl>

      <div>
        <label htmlFor="cb-title" className={`block text-xs font-semibold mb-1.5 ${t.muted}`}>One-line bug title</label>
        <div className="flex gap-2">
          <input id="cb-title" value={title} maxLength={200} disabled={locked} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          <button
            onClick={saveTitle}
            disabled={locked || busy !== null || !title.trim() || title === bug.title}
            className={`flex items-center gap-1 px-3 text-xs font-semibold rounded-xl border disabled:opacity-50 ${t.ghostBtn}`}
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      <details className={`text-xs ${t.text}`}>
        <summary className={`cursor-pointer font-semibold ${t.muted}`}>Recent actions before capture ({(bug.recent_events || []).length})</summary>
        <ol className="mt-2 space-y-1 list-decimal pl-5">
          {(bug.recent_events || []).map((e) => (
            <li key={e.seq} className="break-all">
              <span className={t.muted}>{new Date(e.ts).toLocaleTimeString()}</span> {e.type}
              {e.target?.label ? ` "${e.target.label}"` : ''} {e.type === 'page_load' || e.type === 'navigation' ? e.url : ''}
            </li>
          ))}
        </ol>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={generate}
          disabled={locked || busy !== null || !title.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-extrabold rounded-xl"
        >
          {busy === 'generate' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {bug.report_status === 'generated' ? 'Regenerate Bug Report' : 'Generate Bug Report'}
        </button>
        <span className={`text-[11px] ${t.muted}`}>
          Report: {bug.report_status.replace('_', ' ')}
          {bug.report_source === 'template' ? ' (offline template)' : ''}
        </span>
      </div>
      {bug.report_status === 'failed' && bug.report_error && (
        <p className="text-xs text-red-500 flex gap-1.5" role="alert">
          <TriangleAlert className="w-4 h-4 shrink-0" /> {bug.report_error} - you can retry.
        </p>
      )}

      <fieldset disabled={locked} className="space-y-3">
        <legend className={`text-xs font-bold mb-2 ${t.text}`}>Bug report (editable)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2">
            <label htmlFor="cb-r-title" className={`block text-[11px] font-semibold mb-1 ${t.muted}`}>Title</label>
            <input id="cb-r-title" value={report.title} onChange={(e) => updateField('title', e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="cb-r-sev" className={`block text-[11px] font-semibold mb-1 ${t.muted}`}>Severity</label>
            <select id="cb-r-sev" value={report.severity} onChange={(e) => updateField('severity', e.target.value)} className={fieldClass}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {REPORT_FIELDS.map(([key, label, rows]) => (
          <div key={key}>
            <label htmlFor={`cb-r-${key}`} className={`block text-[11px] font-semibold mb-1 ${t.muted}`}>{label}</label>
            <textarea id={`cb-r-${key}`} rows={rows} value={report[key]} onChange={(e) => updateField(key, e.target.value)} className={fieldClass} />
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={saveReport}
          disabled={locked || busy !== null || !dirty}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border disabled:opacity-50 ${t.ghostBtn}`}
        >
          {busy === 'save' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save report
        </button>
        {bug.azure_status === 'created' ? (
          <>
            <a
              href={bug.azure_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
            >
              <CircleCheck className="w-4 h-4" /> Azure Bug #{bug.azure_work_item_id} <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {bug.public_link && (
              <>
                <a
                  href={bug.public_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border ${t.ghostBtn}`}
                >
                  <LinkIcon className="w-4 h-4" /> Public link
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(bug.public_link);
                    onShowToast('Link copied to clipboard!');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border ${t.ghostBtn}`}
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
              </>
            )}
          </>
        ) : (
          <button
            onClick={createInAzure}
            disabled={!hasReport || busy !== null || bug.azure_status === 'creating'}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl"
          >
            {busy === 'azure' || bug.azure_status === 'creating' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {bug.azure_status === 'failed' ? 'Retry Create in Azure DevOps' : 'Create Bug in Azure DevOps'}
          </button>
        )}
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={busy !== null || bug.azure_status === 'creating'}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-50 ml-auto"
        >
          {busy === 'delete' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete bug
        </button>
      </div>
      {!hasReport && !locked &&<p className={`text-[11px] ${t.muted}`}>Generate or write a report title and description before creating the Azure bug.</p>}
      {bug.azure_status === 'failed' && bug.azure_error && (
        <p className="text-xs text-red-500 flex gap-1.5" role="alert">
          <TriangleAlert className="w-4 h-4 shrink-0" /> {bug.azure_error}
        </p>
      )}
      {error && !bug.report_error && !bug.azure_error && <p className="text-xs text-red-500" role="alert">{error}</p>}
      <ConfirmModal
        t={t}
        open={confirmDelete}
        busy={busy === 'delete'}
        title="Delete captured bug?"
        message={`This bug and its screenshot will be permanently deleted.${bug.azure_status === 'created' ? ' The Azure DevOps bug is not deleted.' : ''}`}
        onConfirm={deleteBug}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}
