import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileEdit, Save, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { sanitizeUserErrorMessage } from '../services/apiError';

export default function ReviewUserStoryModal({
  isOpen,
  onClose,
  workItem,
  projectName,
  onSaveUserStory,
  onGenerateTestCases,
  onShowToast,
  isGenerating,
}) {
  const { isDark } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && workItem) {
      setTitle(workItem.title || '');
      setDescription(workItem.description || '');
      setAcceptanceCriteria(workItem.acceptanceCriteria || '');
      setSaved(false);
      setError(null);
    }
  }, [isOpen, workItem]);

  if (!workItem) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await onSaveUserStory(workItem.id, { title, description, acceptanceCriteria }, projectName);
      if (result && result.success) {
        onShowToast && onShowToast(`User Story #${workItem.id} updated in Azure DevOps!`);
        setSaved(true);
      } else {
        setError(sanitizeUserErrorMessage(result?.error || 'Failed to update user story.'));
      }
    } catch (err) {
      setError(sanitizeUserErrorMessage(err.message || 'Failed to update user story.'));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateWithoutSaving = () => {
    onGenerateTestCases({ title, description, acceptanceCriteria });
    onClose();
  };

  const handleGenerateAfterSave = () => {
    onGenerateTestCases(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md ${
          isDark ? 'bg-black/80' : 'bg-slate-900/40'
        }`}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className={`w-full max-w-2xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[92vh] ${
              isDark
                ? 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-black/90'
                : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] shadow-[var(--shadow-lg)]'
            }`}
          >
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDark ? 'border-zinc-800/80 bg-zinc-950/70' : 'border-[var(--border-subtle)] bg-[var(--surface-hover)]'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-500 rounded-xl border border-emerald-500/30">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base font-outfit ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                    Review & Edit User Story #{workItem.id}
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-[var(--text-muted)]'}`}>
                    {saved ? 'User story updated. Ready to generate test cases.' : 'Edit the content, then save to Azure or generate directly.'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className={`p-3.5 border rounded-xl text-xs flex items-center gap-2.5 ${
                  isDark ? 'bg-red-950/50 border-red-500/40 text-red-200' : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {saved && (
                <div className={`p-3.5 border rounded-xl text-xs flex items-center gap-2.5 ${
                  isDark ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>User story saved to Azure DevOps.</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className={`block text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Title</label>
                <input
                  type="text"
                  value={title}
                  disabled={saved}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 ${
                    isDark ? 'bg-black border-zinc-800 text-white' : 'bg-white border-[var(--border-default)] text-black'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`block text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Description</label>
                <textarea
                  rows={5}
                  value={description}
                  disabled={saved}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 ${
                    isDark ? 'bg-black border-zinc-800 text-zinc-200' : 'bg-white border-[var(--border-default)] text-black'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`block text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Acceptance Criteria</label>
                <textarea
                  rows={5}
                  value={acceptanceCriteria}
                  disabled={saved}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 ${
                    isDark ? 'bg-black border-zinc-800 text-zinc-200' : 'bg-white border-[var(--border-default)] text-black'
                  }`}
                />
              </div>
            </div>

            <div className={`px-5 sm:px-6 py-4 border-t flex items-center justify-end gap-2.5 shrink-0 ${
              isDark ? 'border-zinc-800' : 'border-[var(--border-subtle)]'
            }`}>
              {!saved ? (
                <>
                  <button
                    type="button"
                    onClick={handleGenerateWithoutSaving}
                    disabled={saving || isGenerating || !title.trim()}
                    className={`px-4 py-2.5 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800' : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Generate Without Saving</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || isGenerating || !title.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save User Story & Continue</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateAfterSave}
                  disabled={isGenerating}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>Generate Test Cases</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
