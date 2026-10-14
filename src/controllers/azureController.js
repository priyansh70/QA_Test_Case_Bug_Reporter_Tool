const { getWorkItem, getProjects, getProjectWorkItems, getProjectIterations, getProjectUsers, updateWorkItem } = require('../azure/azureClient');

class AzureController {
  static async getConfig(req, res) {
    const isUserConfigured = Boolean(req.user && req.user.azureOrg && req.user.azurePat);
    const configuredOrg = isUserConfigured ? req.user.azureOrg : process.env.AZURE_DEVOPS_ORG || 'Demo Workspace';

    let aiProvider = (process.env.AI_PROVIDER || '').toLowerCase().trim();
    if (!aiProvider) {
      if (process.env.OPENROUTER_API_KEY) {
        aiProvider = 'openrouter';
      } else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
        aiProvider = 'gemini';
      } else {
        aiProvider = 'openai';
      }
    }

    let aiModel = process.env.AI_MODEL;
    if (!aiModel) {
      if (aiProvider === 'openrouter') {
        aiModel = process.env.OPENROUTER_MODEL;
      } else if (aiProvider === 'openai') {
        aiModel = process.env.OPENAI_MODEL;
      } else {
        aiModel = process.env.GEMINI_MODEL || process.env.GOOGLE_MODEL;
      }
    }

    return res.json({
      success: true,
      configured: isUserConfigured || Boolean(process.env.AZURE_DEVOPS_PAT),
      org: configuredOrg,
      project: process.env.AZURE_DEVOPS_PROJECT || 'Demo Project',
      provider: aiProvider || 'auto-detect',
      model: aiModel || '',
      aiProvider: aiProvider || 'auto-detect',
      aiModel: aiModel || '',
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        hasCustomPat: Boolean(req.user.azurePat),
      },
    });
  }

  static async getProjects(req, res) {
    try {
      const projects = await getProjects({
        org: req.user?.azureOrg,
        pat: req.user?.azurePat,
      });

      return res.json({ success: true, projects });
    } catch (error) {
      console.error('Azure Projects Fetch Error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getWorkItems(req, res) {
    try {
      const { project } = req.query;
      if (!project) {
        return res.status(400).json({ success: false, error: 'Project parameter is required.' });
      }

      const workItems = await getProjectWorkItems(project, {
        org: req.user?.azureOrg,
        pat: req.user?.azurePat,
      });

      return res.json({ success: true, workItems });
    } catch (error) {
      console.error('Azure Work Items Fetch Error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getIterations(req, res) {
    try {
      const { project } = req.query;
      if (!project) {
        return res.status(400).json({ success: false, error: 'Project parameter is required.' });
      }

      const iterations = await getProjectIterations(project, {
        org: req.user?.azureOrg,
        pat: req.user?.azurePat,
      });

      return res.json({ success: true, iterations });
    } catch (error) {
      console.error('Azure Iterations Fetch Error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getWorkItemById(req, res) {
    try {
      const { id } = req.params;
      const workItem = await getWorkItem(id, {
        org: req.user?.azureOrg,
        pat: req.user?.azurePat,
      });

      return res.json({ success: true, workItem });
    } catch (error) {
      return res.status(404).json({ success: false, error: error.message });
    }
  }

  static async updateWorkItem(req, res) {
    try {
      const { id } = req.params;
      const { project, title, description, acceptanceCriteria } = req.body;

      const workItem = await updateWorkItem(
        id,
        { title, description, acceptanceCriteria },
        {
          org: req.user?.azureOrg,
          pat: req.user?.azurePat,
          project: project || undefined,
        }
      );

      return res.json({ success: true, workItem });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getUsers(req, res) {
    try {
      const { project } = req.query;
      if (!project) {
        return res.status(400).json({ success: false, error: 'Project parameter is required.' });
      }

      const users = await getProjectUsers(project, {
        org: req.user?.azureOrg,
        pat: req.user?.azurePat,
      });

      return res.json({ success: true, users });
    } catch (error) {
      console.error('Azure Project Users Fetch Error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = AzureController;
