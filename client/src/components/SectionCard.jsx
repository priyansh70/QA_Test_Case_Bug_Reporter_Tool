import React, { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle2, Copy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function SectionCard({ section, searchQuery, forceExpanded, onShowToast }) {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setIsExpanded(forceExpanded);
  }, [forceExpanded]);

  const name = section?.name || 'Component Section';
  const testCases = Array.isArray(section?.testCases) ? section.testCases : [];

  // Filter test cases by search query
  const filteredCases = searchQuery
    ? testCases.filter((tc) => tc.toLowerCase().includes(searchQuery.toLowerCase()))
    : testCases;

  if (searchQuery && filteredCases.length === 0) {
    return null; // Hide card if no cases match filter
  }

  const handleCopySection = (e) => {
    e.stopPropagation();
    const formatted = `### ${name}\n` + testCases.map((c, i) => `${i + 1}. ${c}`).join('\n');
    navigator.clipboard.writeText(formatted);
    onShowToast(`Copied ${testCases.length} cases from "${name}"`);
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className={`backdrop-blur-xl border rounded-2xl overflow-hidden transition-all shadow-lg font-sans ${
      isDark
        ? 'bg-neutral-900/90 border-neutral-800 hover:border-emerald-500/40 shadow-black/40'
        : 'bg-[var(--surface)] border-[var(--border-subtle)] hover:border-emerald-500/60 shadow-[var(--shadow-sm)]'
    }`}>
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center justify-between px-5 py-4 cursor-pointer select-none border-b transition-colors ${
          isDark
            ? 'bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-800/50'
            : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'
        }`}
      >
        <div className="flex items-center gap-3">
          <h3 className={`font-bold text-sm font-outfit ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>{name}</h3>
          <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-full ${
            isDark
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-[var(--brand-soft)] border-[var(--brand-border)] text-[var(--brand-text)]'
          }`}>
            {filteredCases.length} Cases
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySection}
            title="Copy section test cases"
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-neutral-800 text-neutral-400 hover:text-emerald-400'
                : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-emerald-600'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isDark ? 'text-neutral-400' : 'text-[var(--text-muted)]'
            } ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
          />
        </div>
      </div>

      {/* Test Cases List */}
      {isExpanded && (
        <div className="p-4 space-y-2">
          {filteredCases.map((tc, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 border rounded-xl transition-all ${
                isDark
                  ? 'bg-neutral-950/80 border-neutral-800/60 hover:border-emerald-500/40 hover:bg-emerald-950/20 text-neutral-200'
                  : 'bg-[var(--surface)] border-[var(--border-subtle)] hover:border-emerald-500/50 hover:bg-[var(--surface-active)] text-[var(--text-primary)]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed font-normal">
                {highlightMatch(tc, searchQuery)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
