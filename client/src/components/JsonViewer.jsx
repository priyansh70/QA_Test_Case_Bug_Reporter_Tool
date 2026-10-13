import React from 'react';
import { Copy, FileCode } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function JsonViewer({ suiteData, onShowToast }) {
  const { isDark } = useTheme();
  const jsonString = JSON.stringify(suiteData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    onShowToast('Copied JSON string to clipboard!');
  };

  return (
    <div className={`relative border rounded-2xl overflow-hidden shadow-xl font-sans transition-colors ${
      isDark ? 'bg-black border-zinc-800 shadow-black/80' : 'bg-[var(--surface)] border-[var(--border-subtle)] shadow-[var(--shadow-sm)]'
    }`}>
      <div className={`flex items-center justify-between px-5 py-3 border-b ${
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-[var(--surface-hover)] border-[var(--border-subtle)]'
      }`}>
        <div className={`flex items-center gap-2 text-xs font-bold font-outfit ${
          isDark ? 'text-slate-200' : 'text-[var(--text-primary)]'
        }`}>
          <FileCode className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span>Raw JSON Response</span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700 hover:border-emerald-500/40'
              : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-emerald-500'
          }`}
        >
          <Copy className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span>Copy JSON</span>
        </button>
      </div>

      <pre className={`p-5 overflow-x-auto text-xs font-mono leading-relaxed max-h-[650px] ${
        isDark ? 'text-emerald-400 bg-slate-950' : 'text-[var(--text-primary)] bg-[var(--bg-secondary)]'
      }`}>
        <code>{jsonString}</code>
      </pre>
    </div>
  );
}
