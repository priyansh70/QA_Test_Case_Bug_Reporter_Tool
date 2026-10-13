import React from 'react';
import { Search, X, Maximize2, Minimize2, Copy, FileCode, Download, FileSpreadsheet } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Toolbar({
  searchQuery,
  setSearchQuery,
  allExpanded,
  onToggleExpandAll,
  onCopyAllCases,
  onCopyJson,
  onDownloadJson,
  onDownloadCsv,
}) {
  const { isDark } = useTheme();

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center font-sans">
      {/* Search Input Box */}
      <div className="relative flex-1">
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-[var(--text-disabled)]'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search test scenarios across all components..."
          className={`w-full pl-10 pr-9 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm ${
            isDark
              ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500'
              : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]'
          }`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)]'}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onToggleExpandAll}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all active:scale-95 ${
            isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border-default)]'
          }`}
        >
          {allExpanded ? <Minimize2 className="w-3.5 h-3.5 text-emerald-500" /> : <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />}
          <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
        </button>

        <button
          onClick={onCopyAllCases}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all active:scale-95 ${
            isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              : 'bg-[var(--surface)] hover:bg-[var(--brand-soft)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-emerald-500 hover:text-emerald-700'
          }`}
        >
          <Copy className="w-3.5 h-3.5 text-emerald-500" />
          <span>Copy Cases</span>
        </button>

        <button
          onClick={onCopyJson}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all active:scale-95 ${
            isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              : 'bg-[var(--surface)] hover:bg-[var(--brand-soft)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-emerald-500 hover:text-emerald-700'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-emerald-500" />
          <span>Copy JSON</span>
        </button>

        <button
          onClick={onDownloadCsv}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl shadow-md shadow-emerald-500/25 transition-all active:scale-95"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Download CSV</span>
        </button>

        <button
          onClick={onDownloadJson}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl shadow-md shadow-emerald-500/25 transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download JSON</span>
        </button>
      </div>
    </div>
  );
}
