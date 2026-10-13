import React from 'react';
import { LayoutGrid, Code2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function FeatureBanner({ suiteData, activeView, setActiveView }) {
  const { isDark } = useTheme();
  const featureTitle = suiteData?.feature || 'Generated QA Test Suite';

  return (
    <div className={`border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
      isDark
        ? 'bg-gradient-to-r from-neutral-900/95 via-neutral-900/90 to-neutral-900/95 border-emerald-500/30 shadow-black/50'
        : 'bg-[var(--surface)] border-[var(--border-subtle)] shadow-[var(--shadow-sm)]'
    }`}>
      <div className="space-y-1">
        <span className="text-[11px] font-extrabold tracking-widest text-emerald-500 uppercase font-outfit">
          FEATURE TEST SUITE
        </span>
        <h2 className={`text-2xl font-bold tracking-tight font-outfit ${
          isDark ? 'text-white' : 'text-[var(--text-primary)]'
        }`}>
          {featureTitle}
        </h2>
      </div>

      <div className={`flex items-center p-1 border rounded-xl self-start md:self-auto ${
        isDark ? 'bg-black border-zinc-800' : 'bg-[var(--surface-hover)] border-[var(--border-default)]'
      }`}>
        <button
          onClick={() => setActiveView('visual')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeView === 'visual'
              ? 'bg-emerald-500 text-black shadow-md font-extrabold'
              : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Visual View</span>
        </button>
        <button
          onClick={() => setActiveView('json')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeView === 'json'
              ? 'bg-emerald-500 text-black shadow-md font-extrabold'
              : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>JSON View</span>
        </button>
      </div>
    </div>
  );
}
