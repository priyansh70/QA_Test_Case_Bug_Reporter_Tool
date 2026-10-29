import { FlaskConical } from "lucide-react";

function CenteredState({ className = "", children }) {
  return (
    <div
      className={`themed-panel rounded-2xl text-center flex flex-col items-center justify-center flex-1 shadow-xl ${className}`}
    >
      {children}
    </div>
  );
}

export function OnboardingBanner({ onConfigure }) {
  return (
    <div className="themed-brand-panel p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all animate-fadeIn">
      <div className="flex items-center gap-3 text-xs">
        <span className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl border border-emerald-500/30">
          🔑
        </span>
        <div>
          <p className="font-bold themed-text-primary">Azure DevOps Credentials Required</p>
          <p className="themed-text-secondary">
            Please add your Azure Organization Name and Personal Access Token (PAT) to fetch live
            projects & work items.
          </p>
        </div>
      </div>
      <button
        onClick={onConfigure}
        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl shadow-md transition-all shrink-0 active:scale-95"
      >
        Configure Azure PAT →
      </button>
    </div>
  );
}

export function GeneratingState() {
  return (
    <CenteredState className="p-16 space-y-4">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      <h3 className="font-bold text-lg font-outfit themed-text-primary">
        Generating AI Test Suite...
      </h3>
      <p className="text-xs max-w-sm themed-text-muted">
        Analyzing requirements and generating test cases based on acceptance criteria.
      </p>
    </CenteredState>
  );
}

export function EmptyState() {
  return (
    <CenteredState className="p-12 sm:p-16 space-y-6">
      <div className="themed-brand-panel p-4 rounded-2xl text-emerald-500 shadow-xl">
        <FlaskConical className="w-12 h-12" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl font-bold font-outfit themed-text-primary">
          Ready to Generate QA Test Suite
        </h2>
        <p className="text-xs leading-relaxed themed-text-muted">
          Select a Project & User Story from the Azure Explorer dropdowns or enter a Work Item ID to
          create structured QA test suites.
        </p>
      </div>
    </CenteredState>
  );
}
