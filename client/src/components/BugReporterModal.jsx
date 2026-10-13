import React, { useState, useEffect } from 'react';
import { parseApiResponse, sanitizeUserErrorMessage } from '../services/apiError';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bug,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FolderGit2,
  ListFilter,
  FileCode,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchAzureProjects, fetchAzureWorkItems, fetchAzureIterations, fetchScripts } from '../services/api';
import SearchableSelect from './SearchableSelect';

export default function BugReporterModal({ isOpen, onClose, selectedProject, selectedStory, onShowToast }) {
  const { authFetch } = useAuth();
  const { isDark } = useTheme();

  // Project & Story selection state
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [currentProject, setCurrentProject] = useState(selectedProject || '');

  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [parentStory, setParentStory] = useState(selectedStory || null);

  // Sprint / Iteration state
  const [iterations, setIterations] = useState([]);
  const [loadingIterations, setLoadingIterations] = useState(false);
  const [selectedIteration, setSelectedIteration] = useState('');

  // Script selection state
  const [allScripts, setAllScripts] = useState([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState('');

  // Bug Generator & Publish state
  const [bugTitle, setBugTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [generatedReport, setGeneratedReport] = useState(null);
  const [publishResult, setPublishResult] = useState(null);
  const [error, setError] = useState(null);

  // Fetch projects when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProjects();
      loadScripts();
    }
  }, [isOpen]);

  // Sync selectedProject prop when passed
  useEffect(() => {
    if (selectedProject) {
      setCurrentProject(selectedProject);
    }
  }, [selectedProject]);

  // Sync selectedStory prop when passed
  useEffect(() => {
    if (selectedStory) {
      setParentStory(selectedStory);
    }
  }, [selectedStory]);

  // Load stories and iterations when currentProject changes
  useEffect(() => {
    if (isOpen && currentProject) {
      loadStoriesForProject(currentProject);
      loadIterationsForProject(currentProject);
    }
  }, [isOpen, currentProject]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await fetchAzureProjects();
      if (data.success && Array.isArray(data.projects)) {
        setProjects(data.projects);
        if (data.projects.length > 0 && !currentProject) {
          const firstProj = data.projects[0].name;
          setCurrentProject(firstProj);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Azure projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadStoriesForProject = async (projectName) => {
    setLoadingStories(true);
    try {
      const data = await fetchAzureWorkItems(projectName);
      if (data.success && Array.isArray(data.workItems)) {
        setStories(data.workItems);
        if (data.workItems.length > 0) {
          const match = data.workItems.find((s) => String(s.id) === String(parentStory?.id));
          setParentStory(match || data.workItems[0]);
        } else {
          setParentStory(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user stories:', err);
      setStories([]);
    } finally {
      setLoadingStories(false);
    }
  };

  const loadIterationsForProject = async (projectName) => {
    setLoadingIterations(true);
    try {
      const data = await fetchAzureIterations(projectName);
      if (data.success && Array.isArray(data.iterations)) {
        setIterations(data.iterations);
        if (data.iterations.length > 0) {
          const currentSprint = data.iterations.find((it) => it.isCurrent) || data.iterations[0];
          setSelectedIteration(currentSprint.path);
        } else {
          setSelectedIteration('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch iterations:', err);
      setIterations([]);
      setSelectedIteration('');
    } finally {
      setLoadingIterations(false);
    }
  };

  const loadScripts = async () => {
    setLoadingScripts(true);
    try {
      const data = await fetchScripts();
      if (data.success && Array.isArray(data.scripts)) {
        setAllScripts(data.scripts);
      }
    } catch (err) {
      console.error('Failed to fetch test scripts:', err);
    } finally {
      setLoadingScripts(false);
    }
  };

  // Filter scripts by parent story if applicable
  const availableScripts = React.useMemo(() => {
    if (!parentStory?.id) return allScripts;
    const storyIdStr = String(parentStory.id);
    const matched = allScripts.filter((s) => String(s.workItemId) === storyIdStr);
    const unmatched = allScripts.filter((s) => String(s.workItemId) !== storyIdStr);
    return [...matched, ...unmatched];
  }, [allScripts, parentStory]);

  const handleGenerateBug = async (e) => {
    e.preventDefault();
    if (!bugTitle.trim()) return;

    setLoading(true);
    setError(null);
    setPublishResult(null);

    const chosenScriptObj = allScripts.find((s) => s.id === selectedScriptId);
    const scriptText = chosenScriptObj ? chosenScriptObj.fullScriptText || chosenScriptObj.title : selectedScriptId;

    try {
      const res = await authFetch('/api/bugs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bugTitle: bugTitle.trim(),
          storyContext: {
            id: parentStory?.id || null,
            title: parentStory?.title || '',
            description: parentStory?.description || '',
            script: scriptText || null,
          },
        }),
      });

      const data = await parseApiResponse(res);
      if (data.success && data.bugReport) {
        setGeneratedReport(data.bugReport);
      } else {
        setError(data.error || 'Failed to generate bug report.');
      }
    } catch (err) {
      setError(sanitizeUserErrorMessage(err.message || 'Error generating bug report.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePublishBug = async () => {
    if (!generatedReport) return;

    setPublishing(true);
    setError(null);

    try {
      const res = await authFetch('/api/bugs/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bugReport: generatedReport,
          projectName: currentProject || null,
          parentWorkItemId: parentStory?.id || null,
          workItemId: parentStory?.id || null,
          iterationPath: selectedIteration || null,
        }),
      });

      const data = await parseApiResponse(res);
      if (data.success) {
        const msg = data.message || 'Bug successfully created in Azure DevOps!';
        if (onShowToast) {
          onShowToast(msg);
        }
        resetForm();
        onClose();
      } else {
        setError(sanitizeUserErrorMessage(data.error || 'Failed to publish bug.'));
      }
    } catch (err) {
      setError(sanitizeUserErrorMessage(err.message || 'Error publishing bug.'));
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setBugTitle('');
    setGeneratedReport(null);
    setPublishResult(null);
    setError(null);
    setSelectedScriptId('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${
          isDark ? 'bg-black/80' : 'bg-slate-900/30'
        }`}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-3xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans ${
            isDark
              ? 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-black/80'
              : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] shadow-[var(--shadow-lg)]'
          }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-5 border-b ${
              isDark ? 'border-zinc-800 bg-black' : 'border-[var(--border-subtle)] bg-[var(--surface-hover)]'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/20 text-red-500 rounded-xl border border-red-500/30">
                  <Bug className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`font-bold text-lg font-outfit ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>AI Bug Reporter & Parent Linker</h3>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[var(--text-muted)]'}`}>
                    Select Azure Project, Parent Story & Sprint to auto-generate & log bug to Azure DevOps
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {error && (
                <div className={`p-3.5 border rounded-xl text-red-300 text-xs flex items-center gap-2 ${
                  isDark
                    ? 'bg-red-950/60 border-red-500/40'
                    : 'bg-[var(--danger-soft)] border-[var(--danger-soft-border)] text-[var(--danger-soft-text)]'
                }`}>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Controls: Project, Parent Story, Sprint Selectors */}
              <div className={`grid grid-cols-1 gap-3 p-4 border rounded-2xl ${
                isDark ? 'bg-black border-zinc-800' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'
              }`}>
                {/* Azure Project Select */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                      <FolderGit2 className="w-3.5 h-3.5" />
                      1. Azure Project
                    </span>
                    <button
                      type="button"
                      onClick={loadProjects}
                      className={`text-[10px] flex items-center gap-1 ${
                        isDark ? 'text-zinc-500 hover:text-emerald-400' : 'text-[var(--text-disabled)] hover:text-emerald-600'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                  <SearchableSelect
                    value={currentProject}
                    onChange={setCurrentProject}
                    disabled={loadingProjects}
                    placeholder="Search projects..."
                    options={
                      loadingProjects
                        ? [{ value: '', label: 'Loading Projects...' }]
                        : projects.length === 0
                          ? [{ value: '', label: 'No projects found' }]
                          : projects.map((p) => ({ value: p.name, label: `📁 ${p.name}` }))
                    }
                  />
                </div>

                {/* Parent User Story Select */}
                <div>
                  <span className="block text-xs font-semibold mb-1.5 flex items-center gap-1 text-emerald-500">
                    <ListFilter className="w-3.5 h-3.5" />
                    2. Parent User Story
                  </span>
                  <SearchableSelect
                    value={parentStory ? String(parentStory.id) : ''}
                    onChange={(val) => {
                      const found = stories.find((s) => String(s.id) === val);
                      setParentStory(found || null);
                    }}
                    disabled={loadingStories || stories.length === 0}
                    placeholder="Search stories..."
                    options={
                      loadingStories
                        ? [{ value: '', label: 'Loading Stories...' }]
                        : stories.length === 0
                          ? [{ value: '', label: 'No stories in project' }]
                          : stories.map((s) => ({
                              value: String(s.id),
                              label: `#${s.id} - ${s.title}`,
                            }))
                    }
                  />
                </div>

                {/* Sprint / Iteration Path Select */}
                <div>
                  <span className="block text-xs font-semibold mb-1.5 flex items-center gap-1 text-emerald-500">
                    <Calendar className="w-3.5 h-3.5" />
                    3. Sprint / Iteration
                  </span>
                  <SearchableSelect
                    value={selectedIteration}
                    onChange={setSelectedIteration}
                    disabled={loadingIterations || iterations.length === 0}
                    placeholder="Search sprints..."
                    options={
                      loadingIterations
                        ? [{ value: '', label: 'Loading Sprints...' }]
                        : iterations.length === 0
                          ? [{ value: '', label: 'Default Iteration' }]
                          : iterations.map((it) => ({
                              value: it.path,
                              label: `⚡ ${it.name} ${it.isCurrent ? '(Current)' : ''}`,
                            }))
                    }
                  />
                </div>
              </div>

              {/* Bug Title Input Form */}
              <form onSubmit={handleGenerateBug} className="space-y-3">
                <label className={`block text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-[var(--text-secondary)]'}`}>
                  Single-Line Bug Title / Defect Summary
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={bugTitle}
                    onChange={(e) => setBugTitle(e.target.value)}
                    placeholder="e.g. Payment submit button freezes when clicked twice on mobile view"
                    className={`w-full px-4 py-3 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${
                      isDark
                        ? 'bg-black border-zinc-800 text-zinc-100 placeholder-zinc-500'
                        : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={loading || !bugTitle.trim()}
                    className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 active:scale-95"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-black" />
                        <span>Generate Bug</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* AI Generated Bug Report Preview */}
              {generatedReport && (
                <div className={`p-5 border rounded-2xl space-y-4 animate-fadeIn ${
                  isDark ? 'bg-black border-zinc-800' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'
                }`}>
                  <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${
                    isDark ? 'border-zinc-800' : 'border-[var(--border-subtle)]'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold uppercase tracking-wider font-outfit ${
                        isDark ? 'text-zinc-400' : 'text-[var(--text-muted)]'
                      }`}>
                        AI Generated Bug Preview
                      </span>
                      {parentStory && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[10px] font-semibold rounded-md border border-emerald-500/30">
                          Parent Story: #{parentStory.id}
                        </span>
                      )}
                      {selectedIteration && (
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${
                          isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)]'
                        }`}>
                          Sprint: {selectedIteration}
                        </span>
                      )}
                    </div>
                    <span className="px-2.5 py-1 bg-red-500/20 text-red-500 text-[11px] font-bold rounded-lg border border-red-500/30">
                      Severity: {generatedReport.severity}
                    </span>
                  </div>

                  <div className={`space-y-3 text-xs ${isDark ? 'text-zinc-300' : 'text-[var(--text-secondary)]'}`}>
                    <div>
                      <strong className={`block mb-1 ${isDark ? 'text-zinc-400' : 'text-[var(--text-muted)]'}`}>Title:</strong>
                      <p className={`p-3 rounded-xl border font-bold ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                      }`}>
                        {generatedReport.title}
                      </p>
                    </div>

                    <div>
                      <strong className={`block mb-1 ${isDark ? 'text-zinc-400' : 'text-[var(--text-muted)]'}`}>Description:</strong>
                      <p className={`p-3 rounded-xl border ${
                        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-[var(--surface)] border-[var(--border-subtle)]'
                      }`}>
                        {generatedReport.description}
                      </p>
                    </div>

                    <div>
                      <strong className={`block mb-1 ${isDark ? 'text-zinc-400' : 'text-[var(--text-muted)]'}`}>Steps to Reproduce:</strong>
                      <pre className={`p-3 rounded-xl border font-mono text-[11px] whitespace-pre-wrap ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                      }`}>
                        {generatedReport.stepsToReproduce}
                      </pre>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <strong className="text-emerald-500 block mb-1">Expected Result:</strong>
                        <p className={`p-2.5 rounded-xl border ${
                          isDark ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-[var(--brand-soft)] border-[var(--brand-border)] text-emerald-900'
                        }`}>
                          {generatedReport.expectedResult}
                        </p>
                      </div>
                      <div>
                        <strong className="text-red-500 block mb-1">Actual Result:</strong>
                        <p className={`p-2.5 rounded-xl border ${
                          isDark ? 'bg-red-950/30 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-900'
                        }`}>
                          {generatedReport.actualResult}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`pt-3 border-t flex justify-end gap-3 ${isDark ? 'border-zinc-800' : 'border-[var(--border-subtle)]'}`}>
                    <button
                      type="button"
                      onClick={handlePublishBug}
                      disabled={publishing}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 active:scale-95"
                    >
                      {publishing ? (
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Publish Bug to Azure DevOps</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
