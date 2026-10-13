import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldCheck,
  Lock,
  User,
  Mail,
  KeyRound,
  Sparkles,
  ArrowRight,
  LogIn,
  UserPlus,
  AlertCircle,
  FlaskConical,
  Building,
  Key,
} from 'lucide-react';

import { sanitizeUserErrorMessage } from '../services/apiError';

export default function AuthView() {
  const { login, register } = useAuth();
  const { isDark } = useTheme();
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [azureOrg, setAzureOrg] = useState('');
  const [azurePat, setAzurePat] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLoginMode) {
        await login(username, password);
      } else {
        await register({ email, password, name, azureOrg, azurePat });
      }
    } catch (err) {
      setError(sanitizeUserErrorMessage(err.message || 'Authentication error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans transition-colors ${
      isDark ? 'bg-black text-neutral-100' : 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
    }`}>
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 shadow-xl shadow-emerald-500/10 mb-2">
            <FlaskConical className="w-8 h-8" />
          </div>
          <h1 className={`text-3xl font-extrabold tracking-tight font-outfit ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
            QA Test Suite Generator
          </h1>
          <p className={`text-sm max-w-sm mx-auto ${isDark ? 'text-neutral-400' : 'text-[var(--text-muted)]'}`}>
            AI-Driven Azure DevOps QA Test Suite Creator. Please authenticate to access the platform.
          </p>
        </div>

        {/* Auth Card Container */}
      <div className={`backdrop-blur-xl border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 transition-all ${
        isDark
          ? 'bg-zinc-950/90 border-zinc-800 shadow-black/80'
          : 'bg-[var(--surface)] border-[var(--border-subtle)] shadow-[var(--shadow-md)]'
      }`}>
          {/* Mode Switcher Tabs */}
          <div className={`grid grid-cols-2 p-1.5 border rounded-2xl ${
            isDark ? 'bg-black border-zinc-800' : 'bg-[var(--surface-hover)] border-[var(--border-default)]'
          }`}>
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(true);
                setError(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                isLoginMode
                  ? 'bg-emerald-500 text-black shadow-md'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLoginMode(false);
                setError(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                !isLoginMode
                  ? 'bg-emerald-500 text-black shadow-md'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className={`p-3.5 border rounded-2xl text-xs flex items-center gap-3 animate-shake ${
              isDark
                ? 'bg-red-950/60 border-red-500/40 text-red-300'
                : 'bg-[var(--danger-soft)] border-[var(--danger-soft-border)] text-[var(--danger-soft-text)]'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <>
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-[var(--text-secondary)]'}`}>
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all ${
                      isDark ? 'bg-black border-zinc-800 text-zinc-100 placeholder-zinc-500' : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-[var(--text-secondary)]'}`}>
                    <Mail className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. jane@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all ${
                      isDark ? 'bg-black border-zinc-800 text-zinc-100 placeholder-zinc-500' : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]'
                    }`}
                  />
                </div>
              </>
            )}

            {isLoginMode && (
              <div className="space-y-1.5">
                <label className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-[var(--text-secondary)]'}`}>
                  <User className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jane@company.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all ${
                    isDark ? 'bg-black border-zinc-800 text-zinc-100 placeholder-zinc-500' : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]'
                  }`}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-[var(--text-secondary)]'}`}>
                <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                <span>Password</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all ${
                  isDark ? 'bg-black border-zinc-800 text-zinc-100 placeholder-zinc-500' : 'bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLoginMode ? 'Access Platform' : 'Create & Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Note Footer */}
        <div className={`text-center text-[11px] flex items-center justify-center gap-1.5 ${isDark ? 'text-neutral-500' : 'text-[var(--text-muted)]'}`}>
          <Lock className="w-3 h-3 text-emerald-500" />
          <span>Secured API Session • QA Test Case Suite Platform</span>
        </div>
      </div>
    </div>
  );
}
