const BugModel = require('../models/Bug');
const { generateBugReport } = require('../ai/bugGenerator');
const { createBugWorkItem } = require('../azure/azureClient');
const { formatAiError } = require('../ai/providers/errorFormatter');

class BugController {
  static async generateBug(req, res) {
    try {
      const { bugTitle, storyContext, provider, model } = req.body;
      if (!bugTitle) {
        return res.status(400).json({ success: false, error: 'Please enter a bug title/summary.' });
      }

      const bugReport = await generateBugReport(bugTitle, storyContext, { provider, model });
      return res.json({ success: true, bugReport });
    } catch (error) {
      const cleanError = formatAiError(error, 'AI Bug Generator');
      return res.status(500).json({ success: false, error: cleanError });
    }
  }

  static async getBugs(req, res) {
    try {
      const rows = await BugModel.findByUser(req.user.id);
      return res.json({ success: true, bugs: rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async publishBug(req, res) {
    try {
      const { bugReport, projectName, workItemId, parentWorkItemId, iterationPath } = req.body;
      if (!bugReport || !bugReport.title) {
        return res.status(400).json({ success: false, error: 'Invalid bug report data.' });
      }

      const parentId = parentWorkItemId || workItemId || null;

      let azureResult = null;
      if (projectName && req.user.azureOrg && req.user.azurePat) {
        azureResult = await createBugWorkItem(
          { ...bugReport, parentWorkItemId: parentId, iterationPath },
          {
            org: req.user.azureOrg,
            project: projectName,
            pat: req.user.azurePat,
          }
        );
      }

      const bugId = `bug_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await BugModel.save({
        id: bugId,
        userId: req.user.id,
        workItemId: parentId ? String(parentId) : null,
        title: bugReport.title,
        severity: bugReport.severity || '3 - Medium',
        description: bugReport.description || '',
        stepsToReproduce: bugReport.stepsToReproduce || '',
        expectedResult: bugReport.expectedResult || '',
        actualResult: bugReport.actualResult || '',
        azureBugId: azureResult ? String(azureResult.id) : null,
      });

      return res.json({
        success: true,
        bugId,
        azureBug: azureResult,
        message: azureResult ? `Bug #${azureResult.id} published to Azure DevOps!` : 'Bug saved to database.',
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = BugController;
