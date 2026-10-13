const TestSuiteModel = require('../models/TestSuite');
const { getWorkItem } = require('../azure/azureClient');
const { generateTestCases } = require('../ai/testCaseGenerator');
const { formatAiError } = require('../ai/providers/errorFormatter');

class TestSuiteController {
  static async generate(req, res) {
    try {
      const { workItemId, provider, model, project } = req.body;

      if (!workItemId) {
        return res.status(400).json({ success: false, error: 'Please provide a valid Work Item ID.' });
      }

      const targetWorkItem = await getWorkItem(workItemId, {
        org: req.user.azureOrg,
        pat: req.user.azurePat,
        project: project || undefined,
      });

      // Validate that the user story has meaningful content before generating
      const hasDescription = targetWorkItem.description && targetWorkItem.description.trim().length > 0;
      const hasAcceptanceCriteria = targetWorkItem.acceptanceCriteria && targetWorkItem.acceptanceCriteria.trim().length > 0;
      const hasTitle = targetWorkItem.title && targetWorkItem.title.trim().length > 0;

      if (!hasTitle || (!hasDescription && !hasAcceptanceCriteria)) {
        return res.status(400).json({
          success: false,
          error: `User Story #${workItemId} "${targetWorkItem.title || 'Untitled'}" does not contain any description or acceptance criteria. Please add content to the work item before generating test cases.`,
        });
      }

      const jsonString = await generateTestCases(targetWorkItem, { provider, model });
      let parsedData = {};
      try {
        parsedData = JSON.parse(jsonString);
      } catch (e) {
        parsedData = { raw: jsonString };
      }

      const suiteId = `suite_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const fileName = `test-cases-${targetWorkItem.id}.json`;

      await TestSuiteModel.save({
        id: suiteId,
        userId: req.user.id,
        workItemId: targetWorkItem.id,
        featureName: parsedData.feature || targetWorkItem.title,
        dataJson: jsonString,
        fileName,
      });

      return res.json({
        success: true,
        suiteId,
        workItem: targetWorkItem,
        data: parsedData,
        jsonString,
        savedFile: fileName,
      });
    } catch (error) {
      console.error('Generation Error:', error.message);
      const cleanError = formatAiError(error, 'AI Provider');
      return res.status(500).json({ success: false, error: cleanError });
    }
  }

  static async getHistory(req, res) {
    try {
      const rows = await TestSuiteModel.findByUser(req.user.id);

      const history = rows.map((row) => {
        let sectionsCount = 0;
        let totalTestCases = 0;
        try {
          const json = JSON.parse(row.data_json);
          if (Array.isArray(json.sections)) {
            sectionsCount = json.sections.length;
            totalTestCases = json.sections.reduce((acc, sec) => acc + (Array.isArray(sec.testCases) ? sec.testCases.length : 0), 0);
          }
        } catch (e) {}

        return {
          id: row.id,
          fileName: row.file_name || row.id,
          featureName: row.feature_name,
          sectionsCount,
          totalTestCases,
          createdAt: row.created_at,
        };
      });

      return res.json({ success: true, history });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getHistoryById(req, res) {
    try {
      const { id } = req.params;
      const row = await TestSuiteModel.findById(id, req.user.id);

      if (!row) {
        return res.status(404).json({ success: false, error: 'Test suite record not found in database.' });
      }

      let parsedData = {};
      try {
        parsedData = JSON.parse(row.data_json);
      } catch (e) {
        parsedData = { raw: row.data_json };
      }

      return res.json({ success: true, data: parsedData, jsonString: row.data_json });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getScripts(req, res) {
    try {
      const rows = await TestSuiteModel.findByUser(req.user.id);
      const scripts = [];
      for (const row of rows) {
        try {
          const json = JSON.parse(row.data_json);
          if (Array.isArray(json.sections)) {
            json.sections.forEach((sec) => {
              if (Array.isArray(sec.testCases)) {
                sec.testCases.forEach((tc, idx) => {
                  const titleStr = typeof tc === 'string' ? tc : (tc.title || tc.name || `Test Case ${idx + 1}`);
                  scripts.push({
                    id: `${row.id}_${idx}`,
                    suiteId: row.id,
                    workItemId: String(row.work_item_id || ''),
                    featureName: row.feature_name || json.feature || 'Test Suite',
                    sectionName: sec.name || 'General',
                    title: titleStr,
                    fullScriptText: `[${sec.name || 'Test Section'}] ${titleStr}`,
                  });
                });
              }
            });
          }
        } catch (e) {}
      }
      return res.json({ success: true, scripts });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = TestSuiteController;
