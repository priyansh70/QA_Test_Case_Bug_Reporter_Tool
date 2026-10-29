import React, { useState, useEffect, useRef } from 'react';
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
  User,
  Users,
  Paperclip,
  UploadCloud,
  Image as ImageIcon,
  Video,
  Trash2,
  Edit3,
  Link as LinkIcon,
  Check,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  fetchAzureProjects,
  fetchAzureWorkItems,
  fetchAzureIterations,
  fetchAzureUsers,
  fetchScripts,
  publishBug,
} from '../services/api';
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

  // Project Users / Assigned To state
  const [projectUsers, setProjectUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');

  // Script selection state
  const [allScripts, setAllScripts] = useState([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState('');

  // Media / Screenshot / Video state
  const [mediaMode, setMediaMode] = useState('upload'); // 'upload' | 'url'
  const [mediaUrl, setMediaUrl] = useState('');
  const [attachedFile, setAttachedFile] = useState(null); // { name, size, type, dataUrl }
  const fileInputRef = useRef(null);

  // Bug Generator & Publish state
  const [bugTitle, setBugTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [error, setError] = useState(null);
  const [mediaError, setMediaError] = useState(null);

  // Review & Edit Mode Form States (All editable!)
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewSeverity, setReviewSeverity] = useState('3 - Medium');
  const [reviewAssignedTo, setReviewAssignedTo] = useState('');
  const [reviewIteration, setReviewIteration] = useState('');
  const [reviewDescription, setReviewDescription] = useState('');
  const [reviewSteps, setReviewSteps] = useState('');
  const [reviewExpected, setReviewExpected] = useState('');
  const [reviewActual, setReviewActual] = useState('');
  const [reviewMediaUrl, setReviewMediaUrl] = useState('');
  const [reviewAttachedFile, setReviewAttachedFile] = useState(null);

  // Process image file to base64 DataURL
  const processImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const filePayload = {
        name: file.name || `screenshot_${Date.now()}.png`,
        size: file.size,
        type: file.type,
        dataUrl: e.target.result,
      };
      if (isReviewMode) {
        setReviewAttachedFile(filePayload);
      } else {
        setAttachedFile(filePayload);
      }
    };
    reader.readAsDataURL(file);
  };

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

  const loadUsersForProject = async (projectName) => {
    setLoadingUsers(true);
    try {
      const data = await fetchAzureUsers(projectName);
      if (data.success && Array.isArray(data.users)) {
        setProjectUsers(data.users);
      } else {
        setProjectUsers([]);
      }
    } catch (err) {
      console.error('Failed to fetch project users:', err);
      setProjectUsers([]);
    } finally {
      setLoadingUsers(false);
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

  // Fetch projects and scripts when modal opens
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

  // Load stories, iterations, and project users when currentProject changes
  useEffect(() => {
    if (isOpen && currentProject) {
      loadStoriesForProject(currentProject);
      loadIterationsForProject(currentProject);
      loadUsersForProject(currentProject);
    }
  }, [isOpen, currentProject]);

  // Clipboard paste listener for screenshots
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, isReviewMode]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Generate bug report via AI
  const handleGenerateBug = async (e) => {
    e.preventDefault();
    if (!bugTitle.trim()) return;

    setLoading(true);
    setError(null);

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
        const report = data.bugReport;
        // Populate editable review fields
        setReviewTitle(report.title || bugTitle.trim());
        setReviewSeverity(report.severity || '3 - Medium');
        setReviewDescription(report.description || '');
        setReviewSteps(report.stepsToReproduce || '');
        setReviewExpected(report.expectedResult || '');
        setReviewActual(report.actualResult || '');
        setReviewAssignedTo(assignedTo);
        setReviewIteration(selectedIteration);
        setReviewMediaUrl(mediaUrl);
        setReviewAttachedFile(attachedFile);
        setIsReviewMode(true);
      } else {
        setError(data.error || 'Failed to generate bug report.');
      }
    } catch (err) {
      setError(sanitizeUserErrorMessage(err.message || 'Error generating bug report.'));
    } finally {
      setLoading(false);
    }
  };

  // Open manual review directly without AI
  const handleManualDraft = () => {
    if (!bugTitle.trim()) {
      setError('Please provide at least a summary title for the bug.');
      return;
    }
    setError(null);
    setReviewTitle(bugTitle.trim());
    setReviewSeverity('3 - Medium');
    setReviewDescription('');
    setReviewSteps('1. Open application\n2. Perform step\n3. Observe defect');
    setReviewExpected('');
    setReviewActual('');
    setReviewAssignedTo(assignedTo);
    setReviewIteration(selectedIteration);
    setReviewMediaUrl(mediaUrl);
    setReviewAttachedFile(attachedFile);
    setIsReviewMode(true);
  };

  // Media URL validation errors belong under the field, not in the top banner
  const showPublishError = (msg) => (/media url/i.test(msg) ? setMediaError(msg) : setError(msg));

  // Publish bug to Azure DevOps
  const handlePublishBug = async () => {
    if (!reviewTitle.trim()) {
      setError('Bug Title is required before publishing.');
      return;
    }

    setPublishing(true);
    setError(null);
    setMediaError(null);

    const activeAttachment = reviewAttachedFile || attachedFile;
    const activeMediaUrl = reviewMediaUrl || mediaUrl;

    try {
      const data = await publishBug({
        bugReport: {
          title: reviewTitle.trim(),
          severity: reviewSeverity,
          description: reviewDescription,
          stepsToReproduce: reviewSteps,
          expectedResult: reviewExpected,
          actualResult: reviewActual,
        },
        projectName: currentProject || null,
        parentWorkItemId: parentStory?.id || null,
        workItemId: parentStory?.id || null,
        iterationPath: reviewIteration || selectedIteration || null,
        assignedTo: reviewAssignedTo || assignedTo || null,
        mediaUrl: activeMediaUrl?.trim() || null,
        attachment: activeAttachment ? {
          fileName: activeAttachment.name,
          data: activeAttachment.dataUrl,
          contentType: activeAttachment.type,
        } : null,
      });

      if (data.success) {
        const baseMsg = data.message || 'Bug successfully created in Azure DevOps!';
        // const msg = data.publicLink ? `${baseMsg} Public link: ${data.publicLink}` : baseMsg;
        if (onShowToast) {
          onShowToast(baseMsg);
        }
        resetForm();
        onClose();
      } else {
        showPublishError(sanitizeUserErrorMessage(data.error || 'Failed to publish bug.'));
      }
    } catch (err) {
      showPublishError(sanitizeUserErrorMessage(err.message || 'Error publishing bug.'));
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setBugTitle('');
    setIsReviewMode(false);
    setError(null);
    setMediaError(null);
    setSelectedScriptId('');
    setAssignedTo('');
    setMediaUrl('');
    setAttachedFile(null);
    setReviewTitle('');
    setReviewSeverity('3 - Medium');
    setReviewAssignedTo('');
    setReviewIteration('');
    setReviewDescription('');
    setReviewSteps('');
    setReviewExpected('');
    setReviewActual('');
    setReviewMediaUrl('');
    setReviewAttachedFile(null);
  };

  // User dropdown options
  const userSelectOptions = React.useMemo(() => {
    const list = [
      { value: '', label: '👤 Unassigned' },
      ...projectUsers.map((u) => ({
        value: u.uniqueName || u.displayName,
        label: `${u.displayName}${u.uniqueName ? ` (${u.uniqueName})` : ''}`,
      })),
    ];
    return list;
  }, [projectUsers]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md ${isDark ? 'bg-black/80' : 'bg-slate-900/40'
          }`}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className={`w-full max-w-4xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[92vh] ${isDark
              ? 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-black/90'
              : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] shadow-[var(--shadow-lg)]'
              }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-zinc-800/80 bg-zinc-950/70' : 'border-[var(--border-subtle)] bg-[var(--surface-hover)]'
              }`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-red-500/20 to-orange-500/20 text-red-500 rounded-xl border border-red-500/30 shadow-inner">
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-base sm:text-lg font-outfit ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                      {isReviewMode ? 'Review & Edit Bug Before Publishing' : 'AI Bug Logger & Azure DevOps Publisher'}
                    </h3>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${isReviewMode
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                      {isReviewMode ? 'Editable Review Mode' : 'Step 1: Setup'}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-[var(--text-muted)]'}`}>
                    {isReviewMode
                      ? 'Refine all details, reassign user, check attachments & submit directly to Azure DevOps'
                      : 'Select Project, Assignee, Iteration, Evidence & auto-generate defect report'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isReviewMode && (
                  <button
                    onClick={() => setIsReviewMode(false)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    title="Return to initial configuration"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Back to Setup</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {error && (
                <div className={`p-3.5 border rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn ${isDark
                  ? 'bg-red-950/50 border-red-500/40 text-red-200'
                  : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* ======================================================== */}
              {/* CREATION PHASE (STEP 1: METADATA, ASSIGNEE, MEDIA, TITLE) */}
              {/* ======================================================== */}
              {!isReviewMode ? (
                <>
                  {/* Controls Grid: Project, Story, Sprint, Assignee */}
                  <div className={`p-4 border rounded-2xl space-y-4 ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'
                    }`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* 1. Azure Project Select */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold">
                            <FolderGit2 className="w-3.5 h-3.5" />
                            1. Azure Project
                          </span>
                          <button
                            type="button"
                            onClick={loadProjects}
                            className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-zinc-500 hover:text-emerald-400' : 'text-[var(--text-disabled)] hover:text-emerald-600'
                              }`}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
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

                      {/* 2. Parent User Story Select */}
                      <div>
                        <span className="block text-xs font-semibold mb-1.5 flex items-center gap-1.5 text-emerald-500">
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

                      {/* 3. Sprint / Iteration Path Select */}
                      <div>
                        <span className="block text-xs font-semibold mb-1.5 flex items-center gap-1.5 text-emerald-500">
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
                                ? [{ value: '', label: 'Default Project Iteration' }]
                                : iterations.map((it) => ({
                                  value: it.path,
                                  label: `⚡ ${it.name} ${it.isCurrent ? '(Current)' : ''}`,
                                }))
                          }
                        />
                      </div>

                      {/* 4. Assign To (Project Users List) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="block text-xs font-semibold flex items-center gap-1.5 text-emerald-500">
                            <Users className="w-3.5 h-3.5" />
                            4. Assign To (Project Team Member)
                          </span>
                          {loadingUsers && (
                            <span className="text-[10px] text-zinc-500 animate-pulse">Loading members...</span>
                          )}
                        </div>
                        <SearchableSelect
                          value={assignedTo}
                          onChange={setAssignedTo}
                          disabled={loadingUsers}
                          placeholder={loadingUsers ? 'Loading project users...' : 'Select user to assign...'}
                          options={
                            loadingUsers
                              ? [{ value: '', label: 'Loading users...' }]
                              : userSelectOptions
                          }
                        />
                      </div>
                    </div>

                    {/* 5. Screenshot Attachment & Video URL Section */}
                    <div className="pt-2 border-t border-dashed border-zinc-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold">
                          <Paperclip className="w-3.5 h-3.5" />
                          5. Media Evidence (Screenshot or Video URL)
                        </span>

                        {/* Mode Switcher Tabs */}
                        <div className={`p-0.5 rounded-lg flex items-center gap-1 text-[11px] font-medium border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
                          }`}>
                          <button
                            type="button"
                            onClick={() => setMediaMode('upload')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${mediaMode === 'upload'
                              ? 'bg-emerald-500 text-black font-bold shadow-sm'
                              : isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'
                              }`}
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Attach Screenshot</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaMode('url')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${mediaMode === 'url'
                              ? 'bg-emerald-500 text-black font-bold shadow-sm'
                              : isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'
                              }`}
                          >
                            <Video className="w-3 h-3" />
                            <span>Video / Media URL</span>
                          </button>
                        </div>
                      </div>

                      {/* Tab 1: File Upload / Drag & Drop / Clipboard Paste */}
                      {mediaMode === 'upload' ? (
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                          />

                          {!attachedFile ? (
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={handleDrop}
                              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${isDark
                                ? 'border-zinc-800 hover:border-emerald-500/60 bg-black/40 hover:bg-zinc-900/50'
                                : 'border-zinc-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/20'
                                }`}
                            >
                              <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <UploadCloud className="w-5 h-5" />
                              </div>
                              <div className="text-xs">
                                <span className="font-semibold text-emerald-500">Click to upload screenshot</span>
                                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}> or drag and drop image here</span>
                              </div>
                              <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                PNG, JPG, GIF or WebP. You can also press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">Ctrl+V</kbd> to paste directly!
                              </p>
                            </div>
                          ) : (
                            <div className={`p-3 border rounded-xl flex items-center justify-between gap-3 ${isDark ? 'bg-black/60 border-zinc-800' : 'bg-white border-zinc-200'
                              }`}>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 shrink-0 bg-zinc-900 flex items-center justify-center">
                                  <img
                                    src={attachedFile.dataUrl}
                                    alt="Screenshot preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold truncate">{attachedFile.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                                      {formatFileSize(attachedFile.size)}
                                    </span>
                                  </div>
                                  <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                    Will be attached to Azure DevOps work item
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAttachedFile(null)}
                                className={`p-2 rounded-lg text-red-400 hover:text-red-300 transition-colors ${isDark ? 'hover:bg-red-950/40' : 'hover:bg-red-50'
                                  }`}
                                title="Remove screenshot"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Tab 2: Media / Video URL Input */
                        <div className="space-y-1.5">
                          <div className="relative">
                            <input
                              type="url"
                              value={mediaUrl}
                              onChange={(e) => { setMediaUrl(e.target.value); setMediaError(null); }}
                              placeholder="e.g. https://www.loom.com/share/... or https://youtu.be/... or image URL"
                              className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${mediaError ? 'border-red-500' : ''} ${isDark
                                ? 'bg-black border-zinc-800 text-zinc-100 placeholder-zinc-600'
                                : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]'
                                }`}
                            />
                            <LinkIcon className={`w-3.5 h-3.5 absolute left-3 top-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                          </div>
                          <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Supports Loom recordings, YouTube demos, S3/CDN media, or hosted screenshot URLs.
                          </p>
                        </div>
                      )}
                      {/* Outside the tab switch so it shows whichever tab is active */}
                      {mediaError && (
                        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-500">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{mediaError}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bug Title Form & Action Buttons */}
                  <form onSubmit={handleGenerateBug} className="space-y-3 pt-1">
                    <label className={`block text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-[var(--text-secondary)]'}`}>
                      Single-Line Defect Summary / Bug Title <span className="text-red-400">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        required
                        value={bugTitle}
                        onChange={(e) => setBugTitle(e.target.value)}
                        placeholder="e.g. Payment checkout button freezes when clicked twice on mobile layout"
                        className={`w-full px-4 py-3 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${isDark
                          ? 'bg-black border-zinc-800 text-zinc-100 placeholder-zinc-500'
                          : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]'
                          }`}
                      />

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="submit"
                          disabled={loading || !bugTitle.trim()}
                          className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 active:scale-95 cursor-pointer"
                        >
                          {loading ? (
                            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 fill-black" />
                              <span>Generate with AI</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleManualDraft}
                          disabled={loading || !bugTitle.trim()}
                          className={`px-4 py-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40 cursor-pointer ${isDark
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                            : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                            }`}
                          title="Skip AI generation and enter review mode directly"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Direct Review</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                /* ======================================================== */
                /* REVIEW & EDIT MODE (ALL FIELDS IN FULL EDIT MODE!) */
                /* ======================================================== */
                <div className={`p-5 border rounded-2xl space-y-5 animate-fadeIn ${isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'
                  }`}>
                  {/* Review Mode Banner */}
                  <div className={`flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b ${isDark ? 'border-zinc-800' : 'border-[var(--border-subtle)]'
                    }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Interactive Review Mode</span>
                      </div>
                      {parentStory && (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-500 text-[11px] font-semibold rounded-md border border-emerald-500/30">
                          Story: #{parentStory.id}
                        </span>
                      )}
                      <span className={`px-2 py-1 text-[11px] font-semibold rounded-md border ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-white text-zinc-700 border-zinc-200'
                        }`}>
                        Project: {currentProject}
                      </span>
                    </div>

                    <span className="text-[11px] text-zinc-400 font-medium">
                      All fields are editable before publishing to Azure DevOps
                    </span>
                  </div>

                  {/* Form Field 1: Bug Title */}
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-bold flex items-center justify-between ${isDark ? 'text-zinc-200' : 'text-zinc-800'
                      }`}>
                      <span>1. Defect Title / Summary:</span>
                      <span className="text-[10px] text-emerald-400 font-normal">Editable</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${isDark
                        ? 'bg-black border-zinc-800 text-white'
                        : 'bg-white border-[var(--border-default)] text-black'
                        }`}
                    />
                  </div>

                  {/* Form Field 2: Severity, Assign To & Sprint in a 3-column Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Severity Selector */}
                    <div className="space-y-1.5">
                      <label className={`block text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        2. Severity:
                      </label>
                      <select
                        value={reviewSeverity}
                        onChange={(e) => setReviewSeverity(e.target.value)}
                        className={`w-full px-3 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${isDark
                          ? 'bg-black border-zinc-800 text-zinc-100'
                          : 'bg-white border-[var(--border-default)] text-black'
                          }`}
                      >
                        <option value="1 - Critical">🔴 1 - Critical</option>
                        <option value="2 - High">🟠 2 - High</option>
                        <option value="3 - Medium">🟡 3 - Medium</option>
                        <option value="4 - Low">🔵 4 - Low</option>
                      </select>
                    </div>

                    {/* Assigned To in Review */}
                    <div className="space-y-1.5">
                      <label className={`block text-xs font-bold flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        <User className="w-3.5 h-3.5 text-emerald-500" />
                        <span>3. Assigned To:</span>
                      </label>
                      <SearchableSelect
                        value={reviewAssignedTo}
                        onChange={setReviewAssignedTo}
                        disabled={loadingUsers}
                        placeholder="Search team member..."
                        options={userSelectOptions}
                      />
                    </div>

                    {/* Iteration / Sprint in Review */}
                    <div className="space-y-1.5">
                      <label className={`block text-xs font-bold flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>4. Sprint / Iteration:</span>
                      </label>
                      <SearchableSelect
                        value={reviewIteration}
                        onChange={setReviewIteration}
                        disabled={loadingIterations}
                        placeholder="Select sprint..."
                        options={
                          iterations.length === 0
                            ? [{ value: '', label: 'Default Project Sprint' }]
                            : iterations.map((it) => ({
                              value: it.path,
                              label: `${it.name} ${it.isCurrent ? '(Current)' : ''}`,
                            }))
                        }
                      />
                    </div>
                  </div>

                  {/* Form Field 3: Description */}
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-bold flex items-center justify-between ${isDark ? 'text-zinc-200' : 'text-zinc-800'
                      }`}>
                      <span>5. Defect Description & Context:</span>
                      <span className="text-[10px] text-zinc-400 font-normal">Markdown / Plain Text</span>
                    </label>
                    <textarea
                      rows={3}
                      value={reviewDescription}
                      onChange={(e) => setReviewDescription(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${isDark
                        ? 'bg-black border-zinc-800 text-zinc-200'
                        : 'bg-white border-[var(--border-default)] text-black'
                        }`}
                    />
                  </div>

                  {/* Form Field 4: Steps to Reproduce */}
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-bold flex items-center justify-between ${isDark ? 'text-zinc-200' : 'text-zinc-800'
                      }`}>
                      <span>6. Steps to Reproduce:</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Numbered Steps</span>
                    </label>
                    <textarea
                      rows={4}
                      value={reviewSteps}
                      onChange={(e) => setReviewSteps(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl font-mono text-[11px] leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${isDark
                        ? 'bg-black border-zinc-800 text-emerald-300'
                        : 'bg-white border-[var(--border-default)] text-emerald-800'
                        }`}
                    />
                  </div>

                  {/* Form Field 5: Expected vs Actual Result (2 columns) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-emerald-500">
                        7. Expected Result:
                      </label>
                      <textarea
                        rows={3}
                        value={reviewExpected}
                        onChange={(e) => setReviewExpected(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${isDark
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                          : 'bg-emerald-50/50 border-emerald-300 text-emerald-900'
                          }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-red-500">
                        8. Actual Result:
                      </label>
                      <textarea
                        rows={3}
                        value={reviewActual}
                        onChange={(e) => setReviewActual(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs leading-relaxed focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 ${isDark
                          ? 'bg-red-950/20 border-red-500/30 text-red-200'
                          : 'bg-red-50/50 border-red-300 text-red-900'
                          }`}
                      />
                    </div>
                  </div>

                  {/* Form Field 6: Screenshot & Video Evidence in Review */}
                  <div className={`p-3.5 border rounded-xl space-y-2.5 ${isDark ? 'bg-black/60 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-500">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>9. Attached Screenshot & Video URL Evidence:</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">Review & modify evidence</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Attached Screenshot Review */}
                      <div>
                        {reviewAttachedFile ? (
                          <div className={`p-2.5 border rounded-lg flex items-center justify-between gap-2 ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                            }`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={reviewAttachedFile.dataUrl}
                                alt="Screenshot"
                                className="w-10 h-10 rounded object-cover border border-zinc-700 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{reviewAttachedFile.name}</p>
                                <p className="text-[10px] text-zinc-400 font-mono">{formatFileSize(reviewAttachedFile.size)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReviewAttachedFile(null)}
                              className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-500/10"
                              title="Remove attachment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              id="reviewFileInput"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                            <label
                              htmlFor="reviewFileInput"
                              className={`p-2.5 border border-dashed rounded-lg flex items-center justify-center gap-2 text-xs cursor-pointer transition-colors ${isDark
                                ? 'border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40 bg-zinc-950/40'
                                : 'border-zinc-300 text-zinc-600 hover:text-emerald-600 hover:border-emerald-400 bg-white'
                                }`}
                            >
                              <UploadCloud className="w-4 h-4 text-emerald-500" />
                              <span>Attach / Replace Screenshot</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Video / External Media URL Review */}
                      <div className="relative">
                        <input
                          type="url"
                          value={reviewMediaUrl}
                          onChange={(e) => { setReviewMediaUrl(e.target.value); setMediaError(null); }}
                          placeholder="Video URL (Loom, YouTube, CDN)..."
                          className={`w-full pl-8 pr-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-emerald-500 ${mediaError ? 'border-red-500' : ''} ${isDark
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-600'
                            : 'bg-white border-zinc-200 text-black placeholder-zinc-400'
                            }`}
                        />
                        <LinkIcon className={`w-3.5 h-3.5 absolute left-2.5 top-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                      </div>
                      {mediaError && <p role="alert" className="mt-1.5 text-[11px] text-red-500">{mediaError}</p>}
                    </div>
                  </div>

                  {/* Review Actions Footer */}
                  <div className={`pt-4 border-t flex flex-wrap items-center justify-between gap-3 ${isDark ? 'border-zinc-800' : 'border-[var(--border-subtle)]'
                    }`}>
                    <button
                      type="button"
                      onClick={() => setIsReviewMode(false)}
                      className={`px-4 py-2.5 border rounded-xl text-xs font-semibold transition-all ${isDark
                        ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                        : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                        }`}
                    >
                      <span>← Back to Setup</span>
                    </button>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handlePublishBug}
                        disabled={publishing || !reviewTitle.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {publishing ? (
                          <>
                            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            <span>Publishing to Azure DevOps...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Publish Bug to Azure DevOps</span>
                          </>
                        )}
                      </button>
                    </div>
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
