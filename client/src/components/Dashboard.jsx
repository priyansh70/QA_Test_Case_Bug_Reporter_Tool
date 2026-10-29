import { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import FeatureBanner from "./FeatureBanner";
import Toolbar from "./Toolbar";
import SectionCard from "./SectionCard";
import JsonViewer from "./JsonViewer";
import HistoryDrawer from "./HistoryDrawer";
import BugHistoryDrawer from "./BugHistoryDrawer";
import ProfileModal from "./ProfileModal";
import BugReporterModal from "./BugReporterModal";
import ReviewUserStoryModal from "./ReviewUserStoryModal";
import TestingSessionsModal from "./TestingSessionsModal";
import Toast from "./Toast";
import { OnboardingBanner, GeneratingState, EmptyState } from "./DashboardStates";
import {
  fetchConfig,
  generateTestCases,
  fetchHistoryItem,
  updateAzureWorkItem,
} from "../services/api";
import { useToast } from "../hooks/useToast";
import { useSuiteExport } from "../hooks/useSuiteExport";

export default function Dashboard({ user }) {
  const { toastMessage, showToast } = useToast();
  const [config, setConfig] = useState(null);
  const [workItemId, setWorkItemId] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");

  const [selectedProject, setSelectedProject] = useState("");
  const [selectedStory, setSelectedStory] = useState(null);

  const [loading, setLoading] = useState(false);
  const [workItemPreview, setWorkItemPreview] = useState(null);
  const [suiteData, setSuiteData] = useState(null);

  const [activeView, setActiveView] = useState("visual"); // 'visual' | 'json'
  const [searchQuery, setSearchQuery] = useState("");
  const [allExpanded, setAllExpanded] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // At most one modal/drawer is open at a time:
  // 'history' | 'profile' | 'bugLogger' | 'bugHistory' | 'testingSessions' | 'review' | null
  const [activeModal, setActiveModal] = useState(null);
  const closeModal = () => setActiveModal(null);
  const isOpen = (name) => activeModal === name;

  // Generate flow: 'direct' (current, one-click) vs 'review' (edit user story before generating)
  const [generationMode, setGenerationMode] = useState("direct");

  // Check config on mount when authenticated
  useEffect(() => {
    let cancelled = false;
    fetchConfig()
      .then((data) => {
        if (cancelled) return;
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
    return () => {
      cancelled = true;
    };
    // showToast is intentionally omitted: it is only used on this one-off error path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = Array.isArray(suiteData?.sections) ? suiteData.sections : [];
  const totalCases = sections.reduce(
    (acc, sec) =>
      acc + (Array.isArray(sec.testCases) ? sec.testCases.length : 0),
    0,
  );

  const azureConfigured = Boolean(
    (user?.azureOrg && user?.azurePat) || config?.configured,
  );

  // Generate Test Cases. `editedFields` (optional) carries Review & Edit overrides
  // {title, description, acceptanceCriteria} that are used for generation only and
  // are NOT persisted to Azure DevOps.
  const handleGenerate = async (editedFields) => {
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
        editedFields: editedFields || undefined,
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

  // Opens the Review & Edit modal using the already-fetched work item preview.
  const handleOpenReview = () => {
    if (!workItemPreview || !workItemPreview.id) {
      showToast("Please select or fetch a work item first.");
      return;
    }
    setActiveModal("review");
  };

  // Persists edited user story content back to Azure DevOps.
  const handleSaveUserStory = async (id, fields) => {
    try {
      return await updateAzureWorkItem(id, { project: selectedProject, ...fields });
    } catch (err) {
      return { success: false, error: err.message || "Failed to update user story." };
    }
  };

  // Load Historical Suite
  const handleLoadHistoryFile = async (id) => {
    setLoading(true);
    try {
      const result = await fetchHistoryItem(id);
      if (result.success && result.data) {
        setSuiteData(result.data);
        showToast("Test Suite Loaded Successfully.");
      } else {
        showToast("Failed to load file.");
      }
    } catch (err) {
      showToast(err.message || "Failed to load file.");
    } finally {
      setLoading(false);
    }
  };

  const exportActions = useSuiteExport(suiteData, showToast);

  return (
    <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-6 min-h-screen flex flex-col font-sans">
      {/* Header Navigation */}
      <Header
        config={config}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenHistory={() => setActiveModal("history")}
        onOpenProfile={() => setActiveModal("profile")}
        onOpenBugLogger={() => setActiveModal("bugLogger")}
        onOpenBugHistory={() => setActiveModal("bugHistory")}
        onOpenTestingSessions={() => setActiveModal("testingSessions")}
      />

      {(!user?.azureOrg || !user?.azurePat) && (
        <OnboardingBanner onConfigure={() => setActiveModal("profile")} />
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
          generationMode={generationMode}
          setGenerationMode={setGenerationMode}
          onReviewUserStory={handleOpenReview}
          onShowToast={showToast}
        />

        {/* Workspace Viewer Container */}
        <main className="flex-1 flex flex-col min-w-0">
          {loading ? (
            <GeneratingState />
          ) : !suiteData ? (
            <EmptyState />
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
                onToggleExpandAll={() => setAllExpanded((prev) => !prev)}
                onCopyAllCases={exportActions.copyAllCases}
                onCopyJson={exportActions.copyJson}
                onDownloadJson={exportActions.downloadJson}
                onDownloadCsv={exportActions.downloadCsv}
              />

              {activeView === "visual" ? (
                <div className="space-y-4">
                  {sections.map((section, idx) => (
                    <SectionCard
                      key={`${section.name}-${idx}`}
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
        isOpen={isOpen("history")}
        onClose={closeModal}
        onLoadFile={handleLoadHistoryFile}
        onShowToast={showToast}
      />

      {/* Profile & Azure PAT Settings Modal */}
      <ProfileModal
        isOpen={isOpen("profile")}
        onClose={closeModal}
        onShowToast={showToast}
      />

      {/* AI One-Line Bug Logger Modal */}
      <BugReporterModal
        isOpen={isOpen("bugLogger")}
        onClose={closeModal}
        selectedProject={selectedProject}
        selectedStory={selectedStory}
        onShowToast={showToast}
      />

      {/* Bug History Slide-over Drawer */}
      <BugHistoryDrawer
        isOpen={isOpen("bugHistory")}
        onClose={closeModal}
        onShowToast={showToast}
      />

      {/* Website Testing Sessions (Chrome extension recording & captured bugs) */}
      <TestingSessionsModal
        isOpen={isOpen("testingSessions")}
        onClose={closeModal}
        onShowToast={showToast}
        provider={provider}
        model={model}
      />

      {/* Review & Edit User Story Modal (2nd generation flow) */}
      <ReviewUserStoryModal
        isOpen={isOpen("review")}
        onClose={closeModal}
        workItem={workItemPreview}
        projectName={selectedProject}
        onSaveUserStory={handleSaveUserStory}
        onGenerateTestCases={handleGenerate}
        onShowToast={showToast}
        isGenerating={loading}
      />

      {/* Toast Notification */}
      <Toast toast={toastMessage} />
    </div>
  );
}

