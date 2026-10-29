import React from 'react';
import { Sparkles, Activity, History, LogOut, Bug, Settings, Sun, Moon, PanelLeftClose, PanelLeftOpen, ListChecks, Video, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Header({ config, sidebarOpen, onToggleSidebar, onOpenHistory, onOpenProfile, onOpenBugLogger, onOpenBugHistory, onOpenTestingSessions }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const isConnected = config?.configured || (user?.azureOrg && user?.hasAzurePat);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className={`flex flex-col sm:flex-row justify-between items-center px-6 py-4 rounded-2xl border transition-all duration-200 gap-4 font-sans ${isDark
      ? 'bg-neutral-900/90 backdrop-blur-xl border-neutral-800 shadow-2xl shadow-black/50'
      : 'bg-[var(--surface)] backdrop-blur-xl border-[var(--border-subtle)] shadow-[var(--shadow-header)]'
      }`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-tr from-emerald-600 via-green-500 to-emerald-400 rounded-xl text-neutral-950 shadow-lg shadow-emerald-500/30">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className={`font-bold text-xl tracking-tight font-outfit ${isDark
            ? 'bg-gradient-to-r from-white via-neutral-100 to-emerald-400 bg-clip-text text-transparent'
            : 'text-[var(--text-primary)]'
            }`}>
            QA Test Suite Generator
          </h1>
          <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-[var(--text-muted)]'}`}>
            AI-Driven Azure DevOps Test Case Suite Creator & Bug Logger
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Sidebar open/close toggle */}
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
          aria-label={sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all active:scale-95 shadow-sm ${isDark
            ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800 hover:border-emerald-500/40'
            : 'bg-[var(--surface-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-emerald-400'
            }`}
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4 text-emerald-500" /> : <PanelLeftOpen className="w-4 h-4 text-emerald-500" />}
          <span className="hidden sm:inline">{sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}</span>
        </button>

        {/* Environment status pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${isDark
          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-950/50'
          : 'bg-[var(--brand-soft)] border border-[var(--brand-border)] text-[var(--brand-text)] shadow-[var(--shadow-xs)]'
          }`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Activity className="w-3.5 h-3.5" />
          <span>
            {isConnected
              ? `Azure PAT Active (${user?.azureOrg || config?.azureOrg || 'Connected'})`
              : 'PAT Setup Pending'}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all active:scale-95 shadow-sm ${isDark
            ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-neutral-700'
            : 'bg-[var(--surface-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)]'
            }`}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              <span>Light Theme</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-emerald-600 fill-emerald-600/20" />
              <span>Dark Theme</span>
            </>
          )}
        </button>

        {/* AI Bug Logger trigger */}
        <button
          onClick={onOpenBugLogger}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all active:scale-95 shadow-sm ${isDark
            ? 'bg-gradient-to-r from-red-950/60 to-emerald-950/60 hover:from-red-900/60 hover:to-emerald-900/60 text-red-200 border-red-500/30'
            : 'bg-[var(--danger-soft)] hover:bg-[#FEE2E2] text-[var(--danger)] border-[var(--danger-soft-border)]'
            }`}
        >
          <Bug className="w-4 h-4 text-red-500" />
          <span>Log AI Bug</span>
        </button>

        {/* Website testing sessions (Chrome extension recording) */}
        <button
          onClick={onOpenTestingSessions}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all active:scale-95 shadow-sm ${isDark
            ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800 hover:border-emerald-500/40'
            : 'bg-[var(--surface-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-emerald-400'
            }`}
        >
          <Video className="w-4 h-4 text-emerald-500" />
          <span>Testing Sessions</span>
        </button>

        {/* History drawer button */}
        <button
          onClick={onOpenHistory}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all active:scale-95 shadow-sm ${isDark
            ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800 hover:border-emerald-500/40'
            : 'bg-[var(--surface-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-emerald-400'
            }`}
        >
          <History className="w-4 h-4 text-emerald-500" />
          <span>History</span>
        </button>

        {/* Bug History drawer button */}
        <button
          onClick={onOpenBugHistory}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all active:scale-95 shadow-sm ${isDark
            ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800 hover:border-emerald-500/40'
            : 'bg-[var(--surface-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-emerald-400'
            }`}
        >
          <ListChecks className="w-4 h-4 text-emerald-500" />
          <span>Bug History</span>
        </button>

        {/* Swagger API Documentation link */}
        {/* <a
          href="/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Swagger API Documentation"
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all active:scale-95 shadow-sm ${isDark
              ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800 hover:border-emerald-500/40'
              : 'bg-[var(--surface-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-emerald-400'
            }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-500" />
          <span>API Docs</span>
        </a> */}

        {/* User profile avatar pill */}
        {user && (
          <div
            onClick={onOpenProfile}
            title="Open Profile & PAT Settings"
            className={`flex items-center gap-2.5 pl-2.5 pr-2 py-1 border rounded-xl cursor-pointer transition-all ${isDark
              ? 'bg-neutral-950/80 hover:bg-neutral-950 border-neutral-800 hover:border-emerald-500/50 text-neutral-200'
              : 'bg-[var(--surface-hover)] hover:bg-[var(--bg-tertiary)] border-[var(--border-default)] hover:border-emerald-500/50 text-[var(--text-primary)]'
              }`}
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-black flex items-center justify-center font-extrabold text-[11px] shadow-sm">
              {getInitials(user.name || user.username)}
            </div>
            <div className="text-left leading-tight hidden md:block">
              <div className="text-xs font-semibold flex items-center gap-1">
                <span>{user.name || user.username}</span>
                <Settings className="w-3 h-3 text-slate-400 hover:text-emerald-500" />
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }}
              title="Sign Out"
              className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
