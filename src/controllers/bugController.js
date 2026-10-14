const BugModel = require('../models/Bug');
const { generateBugReport } = require('../ai/bugGenerator');
const { createBugWorkItem } = require('../azure/azureClient');
const { formatAiError } = require('../ai/providers/errorFormatter');

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

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
      const {
        bugReport,
        projectName,
        workItemId,
        parentWorkItemId,
        iterationPath,
        assignedTo,
        mediaUrl,
        attachment,
      } = req.body;

      if (!bugReport || !bugReport.title) {
        return res.status(400).json({ success: false, error: 'Invalid bug report data.' });
      }

      const parentId = parentWorkItemId || workItemId || null;
      const targetAssignedTo = assignedTo || bugReport.assignedTo || null;
      const targetMediaUrl = mediaUrl || bugReport.mediaUrl || null;
      const targetAttachment = attachment || bugReport.attachment || null;
      const targetIteration = iterationPath || bugReport.iterationPath || null;

      // Generate the bug ID and its public shareable link up front so the link
      // can be embedded into the Azure DevOps description before the work item is created.
      const bugId = `bug_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const publicLink = `${req.protocol}://${req.get('host')}/bugs/public/${bugId}`;
      const descriptionWithLink = `${bugReport.description || ''}\n\nPublic Bug Report Link: ${publicLink}`;

      let azureResult = null;
      const azureOrg = req.user?.azureOrg || process.env.AZURE_DEVOPS_ORG;
      const azurePat = req.user?.azurePat || process.env.AZURE_DEVOPS_PAT;

      if (projectName && azureOrg && azurePat) {
        azureResult = await createBugWorkItem(
          {
            ...bugReport,
            description: descriptionWithLink,
            parentWorkItemId: parentId,
            iterationPath: targetIteration,
            assignedTo: targetAssignedTo,
            mediaUrl: targetMediaUrl,
            attachment: targetAttachment,
          },
          {
            org: azureOrg,
            project: projectName,
            pat: azurePat,
          }
        );
      }

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
        assignedTo: targetAssignedTo,
        mediaUrl: targetMediaUrl,
        azureUrl: azureResult ? azureResult.url : null,
        publicLink,
      });

      return res.json({
        success: true,
        bugId,
        azureBug: azureResult,
        publicLink,
        message: azureResult ? `Bug #${azureResult.id} published to Azure DevOps!` : 'Bug saved successfully.',
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Public, unauthenticated read-only bug report page shared via the generated public link.
  static async renderPublicBug(req, res) {
    try {
      const { id } = req.params;
      const bug = await BugModel.findById(id);

      if (!bug) {
        return res.status(404).send('<h1>Bug report not found</h1>');
      }

      const azureUrl = bug.azure_url || bug.azureUrl || '';
      const azureBugId = bug.azure_bug_id || bug.azureBugId || '';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(bug.title)} - Bug Report</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; background:#0a0a0a; color:#e5e5e5; margin:0; padding:2rem; }
  .card { max-width:760px; margin:0 auto; background:#141414; border:1px solid #2a2a2a; border-radius:16px; padding:2rem; }
  h1 { font-size:1.4rem; margin-top:0; }
  .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:600; background:#262626; border:1px solid #3a3a3a; margin-right:6px; }
  h3 { color:#34d399; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px; }
  pre, p { white-space:pre-wrap; word-break:break-word; color:#d4d4d4; font-size:0.9rem; }
  a { color:#34d399; }
  section { margin-bottom:1.25rem; }
</style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(bug.title)}</h1>
    <div>
      <span class="badge">${escapeHtml(bug.severity)}</span>
      ${azureBugId ? `<span class="badge">Azure Bug #${escapeHtml(azureBugId)}</span>` : ''}
    </div>
    <section><h3>Description</h3><p>${escapeHtml(bug.description)}</p></section>
    <section><h3>Steps to Reproduce</h3><pre>${escapeHtml(bug.steps_to_reproduce)}</pre></section>
    <section><h3>Expected Result</h3><p>${escapeHtml(bug.expected_result)}</p></section>
    <section><h3>Actual Result</h3><p>${escapeHtml(bug.actual_result)}</p></section>
    ${bug.media_url ? `<section><h3>Media Evidence</h3><p><a href="${escapeHtml(bug.media_url)}" target="_blank">${escapeHtml(bug.media_url)}</a></p></section>` : ''}
    ${azureUrl ? `<section><h3>Azure DevOps Work Item</h3><p><a href="${escapeHtml(azureUrl)}" target="_blank">${escapeHtml(azureUrl)}</a></p></section>` : ''}
  </div>
</body>
</html>`;

      return res.status(200).send(html);
    } catch (error) {
      return res.status(500).send('<h1>Failed to load bug report</h1>');
    }
  }
}

module.exports = BugController;
