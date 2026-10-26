import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, FileText, Layers, Link as LinkIcon, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { parseApiResponse } from '../services/apiError';

export default function HistoryDrawer({ isOpen, onClose, onLoadFile, onShowToast }) {
  const { authFetch } = useAuth();
  const { isDark } = useTheme();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/history');
      const data = await parseApiResponse(res);
      if (data.success) {
        setHistoryItems(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex justify-end backdrop-blur-sm font-sans ${isDark ? 'bg-neutral-950/80' : 'bg-slate-900/30'
          }`}>
          {/* Backdrop Click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`relative w-full max-w-md border-l shadow-2xl h-full flex flex-col z-10 font-sans ${isDark ? 'bg-zinc-950 border-zinc-800 shadow-black/90' : 'bg-[var(--surface)] border-[var(--border-default)] shadow-[var(--shadow-lg)]'
              }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-5 border-b ${isDark ? 'border-zinc-800 bg-black' : 'border-[var(--border-subtle)] bg-[var(--surface-hover)]'
              }`}>
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-emerald-500" />
                <h3 className={`font-bold text-base font-outfit ${isDark ? 'text-white' : 'text-[var(--text-primary)]'
                  }`}>
                  Generated Test Suites
                </h3>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className={`flex-1 overflow-y-auto p-6 space-y-3 ${isDark ? 'bg-zinc-950' : 'bg-[var(--bg-tertiary)]'
              }`}>
              {loading ? (
                <div className={`text-center py-12 text-xs ${isDark ? 'text-zinc-500' : 'text-[var(--text-disabled)]'}`}>
                  Loading saved test suites...
                </div>
              ) : historyItems.length === 0 ? (
                <div className={`text-center py-12 text-xs ${isDark ? 'text-zinc-500' : 'text-[var(--text-disabled)]'}`}>
                  No historical JSON test suites found.
                </div>
              ) : (
                historyItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 border rounded-xl transition-all space-y-2 group ${isDark
                      ? 'bg-black border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-950/20'
                      : 'bg-[var(--surface)] border-[var(--border-default)] hover:border-emerald-500/60 hover:bg-[var(--surface-active)] shadow-[var(--shadow-xs)]'
                      }`}
                  >
                    <div
                      onClick={() => {
                        onLoadFile(item.id || item.fileName);
                        onClose();
                      }}
                      className="cursor-pointer space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-xs font-bold transition-colors line-clamp-1 font-outfit group-hover:text-emerald-500 ${isDark ? 'text-zinc-200' : 'text-[var(--text-primary)]'
                          }`}>
                          {item.featureName}
                        </h4>
                        <FileText className={`w-4 h-4 shrink-0 ${isDark ? 'text-zinc-500' : 'text-[var(--text-disabled)]'}`} />
                      </div>

                      <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-zinc-400' : 'text-[var(--text-muted)]'
                        }`}>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-emerald-500" />
                          {item.sectionsCount} Sections • {item.totalTestCases} Scenarios
                        </span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {item.publicLink && (
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-dashed border-zinc-800/80">
                        <a
                          href={item.publicLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-500 hover:text-sky-400 truncate"
                        >
                          <LinkIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">Public Suite Link</span>
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(item.publicLink);
                            if (onShowToast) onShowToast('Link copied to clipboard!');
                          }}
                          title="Copy public link"
                          className={`p-1 rounded shrink-0 ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
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
