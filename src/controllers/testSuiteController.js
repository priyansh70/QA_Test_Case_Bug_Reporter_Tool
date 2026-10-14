const TestSuiteModel = require('../models/TestSuite');
const { getWorkItem } = require('../azure/azureClient');
const { generateTestCases } = require('../ai/testCaseGenerator');
const { formatAiError } = require('../ai/providers/errorFormatter');

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

class TestSuiteController {
  static async generate(req, res) {
    try {
      const { workItemId, provider, model, project, editedFields } = req.body;

      if (!workItemId) {
        return res.status(400).json({ success: false, error: 'Please provide a valid Work Item ID.' });
      }

      const targetWorkItem = await getWorkItem(workItemId, {
        org: req.user.azureOrg,
        pat: req.user.azurePat,
        project: project || undefined,
      });

      // Apply in-memory overrides from the Review & Edit flow without persisting them to Azure DevOps.
      if (editedFields && typeof editedFields === 'object') {
        if (editedFields.title && editedFields.title.trim()) {
          targetWorkItem.title = editedFields.title.trim();
        }
        if (editedFields.description !== undefined) {
          targetWorkItem.description = editedFields.description;
        }
        if (editedFields.acceptanceCriteria !== undefined) {
          targetWorkItem.acceptanceCriteria = editedFields.acceptanceCriteria;
        }
      }

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
      const publicLink = `${req.protocol}://${req.get('host')}/test-suites/public/${suiteId}`;

      await TestSuiteModel.save({
        id: suiteId,
        userId: req.user.id,
        workItemId: targetWorkItem.id,
        featureName: parsedData.feature || targetWorkItem.title,
        dataJson: jsonString,
        fileName,
        publicLink,
      });

      return res.json({
        success: true,
        suiteId,
        workItem: targetWorkItem,
        data: parsedData,
        jsonString,
        savedFile: fileName,
        publicLink,
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
          publicLink: row.public_link || null,
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

  // Public, unauthenticated read-only test suite page shared via the generated public link.
  static async renderPublicSuite(req, res) {
    try {
      const { id } = req.params;
      const row = await TestSuiteModel.findByIdPublic(id);

      if (!row) {
        return res.status(404).send('<h1>Test suite not found</h1>');
      }

      let data = {};
      try {
        data = JSON.parse(row.data_json);
      } catch (e) {
        data = {};
      }
      const sections = Array.isArray(data.sections) ? data.sections : [];

      const sectionsHtml = sections.map((sec) => {
        const cases = Array.isArray(sec.testCases) ? sec.testCases : [];
        const casesHtml = cases.map((tc, idx) => {
          const title = typeof tc === 'string' ? tc : (tc.title || tc.name || `Test Case ${idx + 1}`);
          return `<li>${escapeHtml(title)}</li>`;
        }).join('');
        return `<section><h3>${escapeHtml(sec.name || 'Section')}</h3><ol>${casesHtml}</ol></section>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(row.feature_name)} - Test Suite</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; background:#0a0a0a; color:#e5e5e5; margin:0; padding:2rem; }
  .card { max-width:760px; margin:0 auto; background:#141414; border:1px solid #2a2a2a; border-radius:16px; padding:2rem; }
  h1 { font-size:1.4rem; margin-top:0; }
  .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:600; background:#262626; border:1px solid #3a3a3a; margin-right:6px; }
  h3 { color:#34d399; font-size:0.9rem; margin-bottom:6px; }
  ol { margin:0 0 1rem 0; padding-left:1.2rem; }
  li { font-size:0.85rem; color:#d4d4d4; margin-bottom:4px; }
  section { margin-bottom:1.25rem; }
</style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(row.feature_name)}</h1>
    <div><span class="badge">Work Item #${escapeHtml(row.work_item_id)}</span><span class="badge">${sections.length} Sections</span></div>
    ${sectionsHtml || '<p>No test cases found.</p>'}
  </div>
</body>
</html>`;

      return res.status(200).send(html);
    } catch (error) {
      return res.status(500).send('<h1>Failed to load test suite</h1>');
    }
  }
}

module.exports = TestSuiteController;
