import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import FeatureBanner from "./components/FeatureBanner";
import Toolbar from "./components/Toolbar";
import SectionCard from "./components/SectionCard";
import JsonViewer from "./components/JsonViewer";
import HistoryDrawer from "./components/HistoryDrawer";
import ProfileModal from "./components/ProfileModal";
import BugReporterModal from "./components/BugReporterModal";
import Toast from "./components/Toast";
import AuthView from "./components/AuthView";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import {
  fetchConfig,
  generateTestCases,
  fetchHistoryItem,
} from "./services/api";
import { useToast } from "./hooks/useToast";
import { FlaskConical, Play, Search } from "lucide-react";

function Dashboard({ user }) {
  const { isDark } = useTheme();
  const { toastMessage, showToast } = useToast();
  const [config, setConfig] = useState(null);
  const [workItemId, setWorkItemId] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-3.6-flash");

  const [selectedProject, setSelectedProject] = useState("");
  const [selectedStory, setSelectedStory] = useState(null);

  const [loading, setLoading] = useState(false);
  const [workItemPreview, setWorkItemPreview] = useState(null);
  const [suiteData, setSuiteData] = useState(null);

  const [activeView, setActiveView] = useState("visual"); // 'visual' | 'json'
  const [searchQuery, setSearchQuery] = useState("");
  const [allExpanded, setAllExpanded] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Modals state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bugLoggerOpen, setBugLoggerOpen] = useState(false);

  // Reset state to guarantee clean slate if user changes
  useEffect(() => {
    setSuiteData(null);
    setWorkItemId("");
    setSelectedProject("");
    setSelectedStory(null);
    setWorkItemPreview(null);
    setSearchQuery("");
    setHistoryOpen(false);
    setProfileOpen(false);
    setBugLoggerOpen(false);
  }, [user?.id]);

  // Check config on mount when authenticated
  useEffect(() => {
    fetchConfig()
      .then((data) => {
        if (data.success !== false) {
          setConfig(data);
          if (data.provider) setProvider(data.provider);
          if (data.model) setModel(data.model);
        }
      })
      .catch((err) => {
        if (err.message && err.message.includes("session has expired")) {
          showToast(err.message);
        }
        console.error("Failed to load config:", err);
      });
  }, [user?.id]);

  // Generate Test Cases
  const handleGenerate = async () => {
    const targetId = workItemId.trim();
    if (!targetId) {
      showToast("Please enter or select a valid Azure DevOps Work Item ID.");
      return;
    }

    if (!azureConfigured) {
      showToast(
        "Azure PAT is not configured. Add your Organization Name & PAT in Profile first.",
      );
      return;
    }

    setLoading(true);

    try {
      const result = await generateTestCases({
        workItemId: targetId,
        provider,
        model,
        project: selectedProject,
      });

      if (result.success && result.data) {
        setSuiteData(result.data);
        showToast("QA Test Suite generated successfully!");
      } else {
        showToast(result.error || "Failed to generate test cases.");
      }
    } catch (err) {
      showToast(err.message || "Failed to generate test cases.");
    } finally {
      setLoading(false);
    }
  };

  // Load Historical Suite
  const handleLoadHistoryFile = async (id) => {
    setLoading(true);
    try {
      const result = await fetchHistoryItem(id);
      if (result.success && result.data) {
        setSuiteData(result.data);
        showToast(`Loaded test suite from database.`);
      } else {
        showToast("Failed to load file.");
      }
    } catch (err) {
      showToast(err.message || "Failed to load file.");
    } finally {
      setLoading(false);
    }
  };

  // Copy & Export Handlers
  const handleCopyAllCases = () => {
    if (!suiteData || !Array.isArray(suiteData.sections)) return;
    let fullText = `# Feature: ${suiteData.feature || "Test Suite"}\n\n`;
    suiteData.sections.forEach((sec) => {
      fullText += `## ${sec.name}\n`;
      if (Array.isArray(sec.testCases)) {
        sec.testCases.forEach((tc, i) => {
          fullText += `${i + 1}. ${tc}\n`;
        });
      }
      fullText += "\n";
    });
    navigator.clipboard.writeText(fullText);
    showToast("Copied all test cases to clipboard!");
  };

  const handleCopyJson = () => {
    if (!suiteData) return;
    navigator.clipboard.writeText(JSON.stringify(suiteData, null, 2));
    showToast("Copied JSON string to clipboard!");
  };

  const handleDownloadJson = () => {
    if (!suiteData) return;
    const jsonStr = JSON.stringify(suiteData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (suiteData.feature || "test-cases")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");
    a.download = `${safeTitle}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded JSON file!");
  };

  const handleDownloadCsv = () => {
    if (!suiteData || !Array.isArray(suiteData.sections)) return;
    const rows = [];
    if (suiteData.feature) rows.push(["Feature", suiteData.feature]);
    rows.push(["Section", "Test Case ID", "Test Case"]);
    let id = 0;
    suiteData.sections.forEach((sec) => {
      const cases = Array.isArray(sec.testCases) ? sec.testCases : [];
      cases.forEach((tc) => {
        id += 1;
        rows.push([
          sec.name,
          `TC${id}`,
          typeof tc === "string" ? tc : tc.title || "",
        ]);
      });
    });
    const csvData = rows
      .map((r) =>
        r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csvData}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (suiteData.feature || "test-cases")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");
    a.download = `${safeTitle}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded CSV file!");
  };

  const sections = Array.isArray(suiteData?.sections) ? suiteData.sections : [];
  const totalCases = sections.reduce(
    (acc, sec) =>
      acc + (Array.isArray(sec.testCases) ? sec.testCases.length : 0),
    0,
  );

  const azureConfigured = Boolean(
    (user?.azureOrg && user?.azurePat) || config?.configured,
  );

  return (
    <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-6 min-h-screen flex flex-col font-sans">
      {/* Header Navigation */}
      <Header
        config={config}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenBugLogger={() => setBugLoggerOpen(true)}
      />

      {/* Onboarding Azure PAT Setup Banner */}
      {(!user?.azureOrg || !user?.azurePat) && (
        <div
          className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border transition-all animate-fadeIn ${
            isDark
              ? "bg-gradient-to-r from-neutral-900/90 via-emerald-950/40 to-neutral-900/90 border-emerald-500/40 shadow-xl shadow-emerald-950/30"
              : "bg-[var(--brand-soft)] border-[var(--brand-border)] shadow-[var(--shadow-sm)]"
          }`}
        >
          <div className="flex items-center gap-3 text-xs">
            <span className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl border border-emerald-500/30">
              🔑
            </span>
            <div>
              <p
                className={`font-bold ${isDark ? "text-white" : "text-[var(--text-primary)]"}`}
              >
                Azure DevOps Credentials Required
              </p>
              <p className={isDark ? "text-neutral-400" : "text-[var(--text-secondary)]"}>
                Please add your Azure Organization Name and Personal Access
                Token (PAT) to fetch live projects & work items.
              </p>
            </div>
          </div>
          <button
            onClick={() => setProfileOpen(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl shadow-md transition-all shrink-0 active:scale-95"
          >
            Configure Azure PAT →
          </button>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        {/* Sidebar Input Controls */}
        <Sidebar
          workItemId={workItemId}
          setWorkItemId={setWorkItemId}
          provider={provider}
          setProvider={setProvider}
          model={model}
          setModel={setModel}
          onGenerate={handleGenerate}
          loading={loading}
          workItemPreview={workItemPreview}
          setWorkItemPreview={setWorkItemPreview}
          totalCases={totalCases}
          totalSections={sections.length}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          selectedStory={selectedStory}
          setSelectedStory={setSelectedStory}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          azureConfigured={azureConfigured}
        />

        {/* Workspace Viewer Container */}
        <main className="flex-1 flex flex-col min-w-0">
          {loading ? (
            /* Loading Spinner State */
            <div
              className={`backdrop-blur-xl border rounded-2xl p-16 text-center flex flex-col items-center justify-center flex-1 space-y-4 shadow-xl ${
                isDark
                  ? "bg-neutral-900/80 border-neutral-800"
                  : "bg-[var(--surface)] border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
              }`}
            >
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <h3
                className={`font-bold text-lg font-outfit ${isDark ? "text-white" : "text-[var(--text-primary)]"}`}
              >
                Generating AI Test Suite...
              </h3>
              <p
                className={`text-xs max-w-sm ${isDark ? "text-neutral-400" : "text-[var(--text-muted)]"}`}
              >
                Analyzing requirements, acceptance criteria, and storing test
                scenarios in SQLite database.
              </p>
            </div>
          ) : !suiteData ? (
            /* Empty State Container */
            <div
              className={`backdrop-blur-xl border rounded-2xl p-12 sm:p-16 text-center flex flex-col items-center justify-center flex-1 space-y-6 shadow-xl ${
                isDark
                  ? "bg-neutral-900/80 border-neutral-800"
                  : "bg-[var(--surface)] border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
              }`}
            >
              <div
                className={`p-4 rounded-2xl text-emerald-500 shadow-xl ${
                  isDark
                    ? "bg-emerald-950/60 border border-emerald-500/30 shadow-emerald-500/10"
                    : "bg-[var(--brand-soft)] border border-[var(--brand-border)] shadow-[var(--shadow-xs)]"
                }`}
              >
                <FlaskConical className="w-12 h-12" />
              </div>
              <div className="space-y-2 max-w-md">
                <h2
                  className={`text-2xl font-bold font-outfit ${isDark ? "text-white" : "text-[var(--text-primary)]"}`}
                >
                  Ready to Generate QA Test Suite
                </h2>
                <p
                  className={`text-xs leading-relaxed ${isDark ? "text-neutral-400" : "text-[var(--text-muted)]"}`}
                >
                  Select a Project & User Story from the Azure Explorer
                  dropdowns or enter a Work Item ID to create structured QA test
                  suites.
                </p>
              </div>
            </div>
          ) : (
            /* Active Suite Workspace */
            <div className="space-y-5">
              <FeatureBanner
                suiteData={suiteData}
                activeView={activeView}
                setActiveView={setActiveView}
              />

              <Toolbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                allExpanded={allExpanded}
                onToggleExpandAll={() => setAllExpanded(!allExpanded)}
                onCopyAllCases={handleCopyAllCases}
                onCopyJson={handleCopyJson}
                onDownloadJson={handleDownloadJson}
                onDownloadCsv={handleDownloadCsv}
              />

              {activeView === "visual" ? (
                <div className="space-y-4">
                  {sections.map((section, idx) => (
                    <SectionCard
                      key={idx}
                      section={section}
                      searchQuery={searchQuery}
                      forceExpanded={allExpanded}
                      onShowToast={showToast}
                    />
                  ))}
                </div>
              ) : (
                <JsonViewer suiteData={suiteData} onShowToast={showToast} />
              )}
            </div>
          )}
        </main>
      </div>

      {/* History Slide-over Drawer */}
      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoadFile={handleLoadHistoryFile}
      />

      {/* Profile & Azure PAT Settings Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onShowToast={showToast}
      />

      {/* AI One-Line Bug Logger Modal */}
      <BugReporterModal
        isOpen={bugLoggerOpen}
        onClose={() => setBugLoggerOpen(false)}
        selectedProject={selectedProject}
        selectedStory={selectedStory}
        onShowToast={showToast}
      />

      {/* Toast Notification */}
      <Toast toast={toastMessage} />
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isDark } = useTheme();

  if (authLoading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center space-y-3 font-sans ${
          isDark ? "bg-black text-neutral-300" : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"
        }`}
      >
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-emerald-500">
          Connecting to SQLite Database...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <AuthView />;
  }

  // Keyed strictly by user ID so whenever the user logs out or switches accounts,
  // the entire Dashboard component tree is completely destroyed and re-mounted from scratch.
  return <Dashboard key={user.id || user.username || "auth-user"} user={user} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
