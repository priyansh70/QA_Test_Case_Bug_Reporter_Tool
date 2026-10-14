import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Bug as BugIcon, ExternalLink, Link as LinkIcon, Copy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { fetchBugs } from '../services/api';

const severityColor = {
  '1 - Critical': 'bg-red-500/15 text-red-400 border-red-500/30',
  '2 - High': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  '3 - Medium': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  '4 - Low': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export default function BugHistoryDrawer({ isOpen, onClose, onShowToast }) {
  const { isDark } = useTheme();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBugHistory();
    }
  }, [isOpen]);

  const fetchBugHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchBugs();
      if (data.success) {
        setBugs(data.bugs || []);
      }
    } catch (err) {
      console.error('Failed to load bug history:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    if (onShowToast) onShowToast('Link copied to clipboard!');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex justify-end backdrop-blur-sm font-sans ${
          isDark ? 'bg-neutral-950/80' : 'bg-slate-900/30'
        }`}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`relative w-full max-w-md border-l shadow-2xl h-full flex flex-col z-10 font-sans ${
              isDark ? 'bg-zinc-950 border-zinc-800 shadow-black/90' : 'bg-[var(--surface)] border-[var(--border-default)] shadow-[var(--shadow-lg)]'
            }`}
          >
            <div className={`flex items-center justify-between px-6 py-5 border-b ${
              isDark ? 'border-zinc-800 bg-black' : 'border-[var(--border-subtle)] bg-[var(--surface-hover)]'
            }`}>
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-emerald-500" />
                <h3 className={`font-bold text-base font-outfit ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                  Bug Report History
                </h3>
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

            <div className={`flex-1 overflow-y-auto p-6 space-y-3 ${isDark ? 'bg-zinc-950' : 'bg-[var(--bg-tertiary)]'}`}>
              {loading ? (
                <div className={`text-center py-12 text-xs ${isDark ? 'text-zinc-500' : 'text-[var(--text-disabled)]'}`}>
                  Loading published bugs...
                </div>
              ) : bugs.length === 0 ? (
                <div className={`text-center py-12 text-xs ${isDark ? 'text-zinc-500' : 'text-[var(--text-disabled)]'}`}>
                  No bugs published yet.
                </div>
              ) : (
                bugs.map((bug) => (
                  <div
                    key={bug.id}
                    className={`p-4 border rounded-xl space-y-2.5 ${
                      isDark ? 'bg-black border-zinc-800' : 'bg-[var(--surface)] border-[var(--border-default)] shadow-[var(--shadow-xs)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-xs font-bold line-clamp-2 font-outfit flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-[var(--text-primary)]'}`}>
                        <BugIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        {bug.title}
                      </h4>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border shrink-0 ${severityColor[bug.severity] || severityColor['3 - Medium']}`}>
                        {bug.severity}
                      </span>
                    </div>

                    <div className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-[var(--text-muted)]'}`}>
                      {new Date(bug.created_at).toLocaleString()}
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1.5 border-t border-dashed border-zinc-800/80">
                      {bug.azure_bug_id && bug.azure_url ? (
                        <a
                          href={bug.azure_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500 hover:text-emerald-400"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Azure Bug #{bug.azure_bug_id} (redirect link)
                        </a>
                      ) : (
                        <span className="text-[11px] text-zinc-500">Not published to Azure DevOps</span>
                      )}

                      {bug.public_link && (
                        <div className="flex items-center justify-between gap-2">
                          <a
                            href={bug.public_link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-500 hover:text-sky-400 truncate"
                          >
                            <LinkIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate">Public Bug Link</span>
                          </a>
                          <button
                            onClick={() => copyLink(bug.public_link)}
                            title="Copy public link"
                            className={`p-1 rounded shrink-0 ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
