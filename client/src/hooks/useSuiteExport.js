import {
  suiteToText,
  downloadSuiteJson,
  downloadSuiteCsv,
} from "../utils/exportSuite";

/** Copy/download handlers for a generated test suite; reports results through `showToast`. */
export function useSuiteExport(suiteData, showToast) {
  const copyToClipboard = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      showToast("Could not access the clipboard.");
    }
  };

  return {
    copyAllCases: () =>
      suiteData && copyToClipboard(suiteToText(suiteData), "Copied all test cases to clipboard!"),
    copyJson: () =>
      suiteData &&
      copyToClipboard(JSON.stringify(suiteData, null, 2), "Copied JSON string to clipboard!"),
    downloadJson: () => {
      if (!suiteData) return;
      downloadSuiteJson(suiteData);
      showToast("Downloaded JSON file!");
    },
    downloadCsv: () => {
      if (!suiteData) return;
      downloadSuiteCsv(suiteData);
      showToast("Downloaded CSV file!");
    },
  };
}
