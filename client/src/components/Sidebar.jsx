import React, { useState, useEffect } from 'react';
import { Target, Zap, Search, FolderGit2, ListFilter, RefreshCw, PanelLeftClose, PanelLeftOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { parseApiResponse } from '../services/apiError';
import { fetchAzureWorkItems, fetchAzureWorkItemById } from '../services/api';
import SearchableSelect from './SearchableSelect';

export default function Sidebar({
  workItemId,
  setWorkItemId,
  provider,
  setProvider,
  model,
  setModel,
  onGenerate,
  loading,
  workItemPreview,
  setWorkItemPreview,
  totalCases,
  totalSections,
  selectedProject,
  setSelectedProject,
  selectedStory,
  setSelectedStory,
  isOpen = true,
  onToggle,
  azureConfigured = false,
  generationMode = 'direct',
  setGenerationMode,
  onReviewUserStory,
  onShowToast,
}) {
  const { authFetch, user } = useAuth();
  const { isDark } = useTheme();

  const [inputMode, setInputMode] = useState('dropdown'); // 'dropdown' | 'manual'
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Fetch Projects when in dropdown mode or when user PAT updates
  useEffect(() => {
    if (inputMode === 'dropdown') {
      fetchProjects();
    }
  }, [inputMode, user?.hasAzurePat, user?.azureOrg]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await authFetch('/api/azure/projects');
      const data = await parseApiResponse(res);
      if (data.success && Array.isArray(data.projects)) {
        setProjects(data.projects);
        if (data.projects.length > 0 && !selectedProject) {
          handleSelectProject(data.projects[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load Azure projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSelectProject = async (projectName) => {
    setSelectedProject(projectName);
    setSelectedStory(null);
    setStories([]);
    if (!projectName) return;

    setLoadingStories(true);
    try {
      const data = await fetchAzureWorkItems(projectName);
      if (data.success && Array.isArray(data.workItems)) {
        setStories(data.workItems);
        if (data.workItems.length > 0) {
          handleSelectStory(data.workItems[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load work items for project:', err);
    } finally {
      setLoadingStories(false);
    }
  };

  const handleSelectStory = (story) => {
    setSelectedStory(story);
    if (story && story.id) {
      setWorkItemId(String(story.id));
      setFetchError('');
      fetchWorkItemPreview(story.id);
    }
  };

  const fetchWorkItemPreview = async (id) => {
    const rawId = id !== undefined ? id : workItemId;
    const targetId = rawId ? String(rawId).trim() : '';

    if (!targetId) {
      const msg = 'Please enter an Azure DevOps Work Item ID.';
      setFetchError(msg);
      if (onShowToast) onShowToast(msg);
      return;
    }

    setFetchingPreview(true);
    setFetchError('');

    try {
      const data = await fetchAzureWorkItemById(targetId);
      if (data && data.success && data.workItem) {
        setWorkItemPreview(data.workItem);
        setFetchError('');
      } else {
        const errorMsg = data?.error || `Work Item #${targetId} was not found in Azure DevOps.`;
        setWorkItemPreview(null);
        setFetchError(errorMsg);
        if (onShowToast) onShowToast(errorMsg);
      }
    } catch (err) {
      console.error('Failed to fetch preview:', err);
      const errorMsg = err?.message || `Work Item #${targetId} was not found in Azure DevOps.`;
      setWorkItemPreview(null);
      setFetchError(errorMsg);
      if (onShowToast) onShowToast(errorMsg);
    } finally {
      setFetchingPreview(false);
    }
  };

  if (!isOpen) {
    return (
      <aside
        title="Open Sidebar"
        className={`hidden lg:flex w-14 shrink-0 flex-col items-center gap-3 py-4 rounded-2xl border backdrop-blur-xl shadow-xl transition-colors ${isDark
          ? 'bg-neutral-900/90 border-neutral-800 shadow-black/50'
          : 'bg-[var(--surface)] border-[var(--border-subtle)] shadow-[var(--shadow-sm)]'
          }`}
      >
        <button
          type="button"
          onClick={onToggle}
          title="Open Sidebar"
          className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${isDark
            ? 'bg-black border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40'
            : 'bg-[var(--surface-hover)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-emerald-600 hover:border-emerald-400'
            }`}
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <span className={`p-2 rounded-xl border ${isDark ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-500' : 'bg-[var(--brand-soft)] border-[var(--brand-border)] text-emerald-600'
          }`}>
          <Target className="w-4 h-4" />
        </span>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col gap-5 w-full lg:w-96 shrink-0 font-sans">
      {/* Input Mode Selector Card */}
      <div className={`backdrop-blur-xl border rounded-2xl p-6 shadow-xl flex flex-col gap-4 transition-colors ${isDark
        ? 'bg-neutral-900/90 border-neutral-800 shadow-black/50'
        : 'bg-[var(--surface)] border-[var(--border-subtle)] shadow-[var(--shadow-sm)]'
        }`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className={`text-base font-bold flex items-center gap-2 font-outfit ${isDark ? 'text-white' : 'text-[var(--text-primary)]'
            }`}>
            <Target className="w-5 h-5 text-emerald-500" />
            <span>Work Item Input</span>
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggle}
              title="Close Sidebar"
              className={`hidden lg:flex w-7 h-7 items-center justify-center rounded-lg border transition-all active:scale-95 ${isDark
                ? 'bg-black border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40'
                : 'bg-[var(--surface-hover)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-emerald-600 hover:border-emerald-400'
                }`}
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>

            <div className={`flex p-1 border rounded-xl ${isDark ? 'bg-black border-zinc-800' : 'bg-[var(--surface-hover)] border-[var(--border-default)]'
              }`}>
              <button
                type="button"
                onClick={() => {
                  setInputMode('dropdown');
                  setFetchError('');
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${inputMode === 'dropdown'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
              >
                Explorer
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('manual');
                  setFetchError('');
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${inputMode === 'manual'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
              >
                Manual ID
              </button>
            </div>
          </div>
        </div>

        {/* Generation Mode Selector: Quick Generate vs Review & Edit First */}
        <div className={`flex p-1 border rounded-xl ${isDark ? 'bg-black border-zinc-800' : 'bg-[var(--surface-hover)] border-[var(--border-default)]'}`}>
          <button
            type="button"
            onClick={() => setGenerationMode && setGenerationMode('direct')}
            className={`flex-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${generationMode === 'direct'
              ? 'bg-emerald-500 text-black shadow-sm'
              : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            Quick Generate
          </button>
          <button
            type="button"
            onClick={() => setGenerationMode && setGenerationMode('review')}
            className={`flex-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${generationMode === 'review'
              ? 'bg-emerald-500 text-black shadow-sm'
              : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            Review & Edit First
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (generationMode === 'review') {
              onReviewUserStory && onReviewUserStory();
            } else {
              onGenerate();
            }
          }}
          className="space-y-4"
        >
          {inputMode === 'dropdown' ? (
            <div className="space-y-3">
              {/* Azure Project Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                    <FolderGit2 className="w-3.5 h-3.5" />
                    Azure Project
                  </span>
                  <button
                    type="button"
                    onClick={fetchProjects}
                    className={`text-[10px] flex items-center gap-1 transition-colors ${isDark ? 'text-zinc-500 hover:text-emerald-400' : 'text-[var(--text-disabled)] hover:text-emerald-600'
                      }`}
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
                <SearchableSelect
                  value={selectedProject || ''}
                  onChange={handleSelectProject}
                  disabled={loadingProjects}
                  placeholder="Search projects..."
                  options={
                    loadingProjects
                      ? [{ value: '', label: 'Loading Projects...' }]
                      : projects.length === 0
                        ? [{ value: '', label: 'No projects found (Add PAT in Profile)' }]
                        : projects.map((p) => ({ value: p.name, label: `📁 ${p.name}` }))
                  }
                />
              </div>

              {/* User Story / Task Dropdown */}
              <div>
                <span className="block text-xs font-semibold mb-1.5 flex items-center gap-1 text-emerald-500">
                  <ListFilter className="w-3.5 h-3.5" />
                  Select User Story
                </span>
                <SearchableSelect
                  value={selectedStory ? String(selectedStory.id) : ''}
                  onChange={(val) => {
                    const found = stories.find((s) => String(s.id) === val);
                    if (found) handleSelectStory(found);
                  }}
                  disabled={loadingStories || stories.length === 0}
                  placeholder="Search stories..."
                  options={
                    loadingStories
                      ? [{ value: '', label: 'Loading Stories...' }]
                      : stories.length === 0
                        ? [{ value: '', label: 'No stories in selected project' }]
                        : stories.map((s) => ({
                          value: String(s.id),
                          label: `#${s.id} - ${s.title}`,
                        }))
                  }
                />
              </div>
            </div>
          ) : (
            /* Manual Work Item ID Input */
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-zinc-400' : 'text-[var(--text-secondary)]'}`}>
                Azure DevOps Work Item ID
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={workItemId}
                  onChange={(e) => {
                    setWorkItemId(e.target.value);
                    if (fetchError) setFetchError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fetchWorkItemPreview();
                    }
                  }}
                  placeholder="e.g. 42516"
                  className={`[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-1 transition-colors ${fetchError
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
                    : isDark
                      ? 'border-zinc-800 focus:border-emerald-500 focus:ring-emerald-500'
                      : 'border-[var(--border-default)] focus:border-emerald-500 focus:ring-emerald-500'
                    } ${isDark
                      ? 'bg-black text-zinc-100 placeholder-zinc-600'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => fetchWorkItemPreview()}
                  disabled={fetchingPreview || !workItemId || !azureConfigured}
                  className={`px-3.5 py-2.5 disabled:opacity-50 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 active:scale-95 ${isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-emerald-500/40'
                    : 'bg-[var(--surface-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-emerald-500'
                    }`}
                >
                  {fetchingPreview ? <span className="animate-spin text-emerald-500">🌀</span> : <Search className="w-3.5 h-3.5 text-emerald-500" />}
                  Fetch
                </button>
              </div>

              {/* Error message when Work Item does not exist or fetch fails */}
              {fetchError && (
                <div className={`p-3 border rounded-xl text-[11px] flex items-start gap-2 mt-2.5 animate-fadeIn ${isDark
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                  <span className="flex-1 font-medium leading-relaxed">{fetchError}</span>
                </div>
              )}

              {!azureConfigured && (
                <div className={`p-3 border rounded-xl text-[11px] flex items-start gap-2 mt-4 animate-fadeIn ${isDark ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                  }`}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Azure PAT is not configured. Add your Organization Name & PAT in <b>Profile</b> before fetching or generating test cases.</span>
                </div>
              )}
            </div>
          )}

          {/* Work Item Preview Card */}
          {workItemPreview && (
            <div className={`p-3.5 border rounded-xl space-y-1.5 animate-fadeIn ${isDark
              ? 'bg-emerald-950/40 border-emerald-500/30'
              : 'bg-[var(--brand-soft)] border-[var(--brand-border)]'
              }`}>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--brand-soft)] text-[var(--brand-text)] border border-[var(--brand-border)]'
                  }`}>
                  {workItemPreview.type}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)]'
                  }`}>
                  #{workItemPreview.id}
                </span>
              </div>
              <h4 className={`text-xs font-semibold line-clamp-2 ${isDark ? 'text-zinc-200' : 'text-[var(--text-primary)]'}`}>
                {workItemPreview.title}
              </h4>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-[var(--text-muted)]'}`}>State: {workItemPreview.state}</p>
            </div>
          )}

          {/* AI Provider Settings */}
          {/* <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-zinc-400' : 'text-[var(--text-secondary)]'}`}>Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${
                  isDark ? 'bg-black border-zinc-800 text-zinc-200' : 'bg-[var(--bg-tertiary)] border-[var(--border-default)] text-[var(--text-primary)]'
                }`}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-zinc-400' : 'text-[var(--text-secondary)]'}`}>Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${
                  isDark ? 'bg-black border-zinc-800 text-zinc-200' : 'bg-[var(--bg-tertiary)] border-[var(--border-default)] text-[var(--text-primary)]'
                }`}
              >
                <option value="gemini-3.6-flash">gemini-3.6-flash</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
              </select>
            </div>
          </div> */}

          {/* Action Buttons */}
          <button
            type="submit"
            disabled={loading || (inputMode === 'manual' && !azureConfigured) || (generationMode === 'review' && !workItemPreview)}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4 fill-black" />
                <span>{generationMode === 'review' ? 'Review & Edit User Story' : 'Generate QA Test Suite'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Overview Stats Widget */}
      {totalCases > 0 && (
        <div className={`backdrop-blur-xl border rounded-2xl p-5 shadow-xl space-y-3 ${isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-[var(--surface)] border-[var(--border-subtle)]'
          }`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-[var(--text-muted)]'}`}>
            Test Suite Overview
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 border rounded-xl text-center ${isDark ? 'bg-black/80 border-neutral-800/80' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'
              }`}>
              <span className="text-2xl font-extrabold text-emerald-500 block font-outfit">
                {totalCases}
              </span>
              <span className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-[var(--text-muted)]'}`}>Total Scenarios</span>
            </div>
            <div className={`p-3 border rounded-xl text-center ${isDark ? 'bg-black/80 border-neutral-800/80' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'
              }`}>
              <span className="text-2xl font-extrabold text-emerald-600 block font-outfit">
                {totalSections}
              </span>
              <span className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-[var(--text-muted)]'}`}>Components</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
