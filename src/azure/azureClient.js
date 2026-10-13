const axios = require("axios");

/**
 * Strips HTML tags and decodes basic HTML entities for clean text.
 */
function cleanHtml(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

/**
 * Resolves Azure DevOps configuration using the logged in user's profile credentials,
 * falling back to environment variables (AZURE_DEVOPS_ORG / AZURE_DEVOPS_PROJECT / AZURE_DEVOPS_PAT).
 */
function resolveConfig(customConfig = {}) {
  const org = customConfig.org || process.env.AZURE_DEVOPS_ORG;
  const project = customConfig.project || process.env.AZURE_DEVOPS_PROJECT;
  const pat = customConfig.pat || process.env.AZURE_DEVOPS_PAT;

  if (!org || !pat) {
    throw new Error(
      "Missing Azure DevOps PAT credentials. Please add your Azure Organization Name and Personal Access Token (PAT) in your Profile Settings.",
    );
  }

  return { org, project, pat };
}

/**
 * Fetches a Work Item from Azure DevOps REST API.
 */
async function getWorkItem(workItemId, customConfig = {}) {
  const { org, project, pat } = resolveConfig(customConfig);
  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;

  const url = project
    ? `https://dev.azure.com/${org}/${project}/_apis/wit/workitems/${workItemId}?api-version=7.0&$expand=all`
    : `https://dev.azure.com/${org}/_apis/wit/workitems/${workItemId}?api-version=7.0&$expand=all`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const fields = response.data.fields || {};
    const title = fields["System.Title"] || "Untitled Work Item";
    const workItemType = fields["System.WorkItemType"] || "Work Item";
    const rawDescription =
      fields["System.Description"] ||
      fields["Microsoft.VSTS.TCM.ReproSteps"] ||
      "";
    const rawAcceptanceCriteria =
      fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || "";

    return {
      id: workItemId,
      title,
      type: workItemType,
      state: fields["System.State"] || "Unknown",
      assignedTo: fields["System.AssignedTo"]?.displayName || "Unassigned",
      rawDescription,
      description: cleanHtml(rawDescription),
      rawAcceptanceCriteria,
      acceptanceCriteria: cleanHtml(rawAcceptanceCriteria),
      url:
        response.data._links?.html?.href ||
        `https://dev.azure.com/${org}/_workitems/edit/${workItemId}`,
    };
  } catch (error) {
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error(`Azure DevOps Work Item #${workItemId} was not found.`);
      }
      if (error.response.status === 401 || error.response.status === 403) {
        throw new Error(
          `Authentication failed for Azure DevOps. Please check your Personal Access Token (PAT).`,
        );
      }
      throw new Error(
        `Azure DevOps API Error (${error.response.status}): ${error.response.data?.message || error.message}`,
      );
    }
    throw new Error(`Failed to connect to Azure DevOps: ${error.message}`);
  }
}

/**
 * Fetches list of Azure DevOps Projects for the organization.
 */
async function getProjects(customConfig = {}) {
  const { org, pat } = resolveConfig(customConfig);
  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
  const url = `https://dev.azure.com/${org}/_apis/projects?api-version=7.0`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: authHeader },
    });

    const projects = Array.isArray(response.data.value)
      ? response.data.value.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          state: p.state,
        }))
      : [];

    return projects;
  } catch (error) {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      throw new Error(
        "Invalid Azure DevOps Personal Access Token (PAT) or Organization.",
      );
    }
    throw new Error(`Failed to fetch Azure projects: ${error.message}`);
  }
}

/**
 * Executes a WIQL query to fetch active User Stories / Work Items for a given project.
 */
async function getProjectWorkItems(projectName, customConfig = {}) {
  const { org, pat } = resolveConfig({ ...customConfig, project: projectName });
  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
  const wiqlUrl = `https://dev.azure.com/${org}/${projectName}/_apis/wit/wiql?api-version=7.0`;

  const query = `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State] 
                 FROM WorkItems 
                 WHERE [System.TeamProject] = '${projectName}' 
                 AND [System.WorkItemType] IN ('User Story', 'Product Backlog Item')
                 ORDER BY [System.ChangedDate] DESC`;

  try {
    const wiqlRes = await axios.post(
      wiqlUrl,
      { query },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      },
    );

    const workItemRefs = Array.isArray(wiqlRes.data.workItems)
      ? wiqlRes.data.workItems.slice(0, 30) // Limit top 30
      : [];

    if (workItemRefs.length === 0) {
      return [];
    }

    const ids = workItemRefs.map((w) => w.id).join(",");
    const detailsUrl = `https://dev.azure.com/${org}/${projectName}/_apis/wit/workitems?ids=${ids}&fields=System.Id,System.Title,System.WorkItemType,System.State&api-version=7.0`;

    const detailsRes = await axios.get(detailsUrl, {
      headers: { Authorization: authHeader },
    });

    return Array.isArray(detailsRes.data.value)
      ? detailsRes.data.value.map((item) => ({
          id: item.id,
          title: item.fields["System.Title"] || "Untitled",
          type: item.fields["System.WorkItemType"] || "User Story",
          state: item.fields["System.State"] || "Active",
        }))
      : [];
  } catch (error) {
    throw new Error(
      `Failed to fetch work items for project "${projectName}": ${error.message}`,
    );
  }
}

/**
 * Creates a new Bug Work Item directly in Azure DevOps.
 */
async function createBugWorkItem(bugData, customConfig = {}) {
  const { org, project, pat } = resolveConfig(customConfig);
  if (!project) {
    throw new Error(
      "Project name is required to create a bug in Azure DevOps.",
    );
  }

  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
  const url = `https://dev.azure.com/${org}/${project}/_apis/wit/workitems/$Bug?api-version=7.0`;

  const patchDocument = [
    { op: "add", path: "/fields/System.Title", value: bugData.title },
    {
      op: "add",
      path: "/fields/Microsoft.VSTS.TCM.ReproSteps",
      value: `<div><h3>Description</h3><p>${bugData.description || ""}</p><h3>Steps to Reproduce</h3><pre>${bugData.stepsToReproduce || ""}</pre><h3>Expected Result</h3><p>${bugData.expectedResult || ""}</p><h3>Actual Result</h3><p>${bugData.actualResult || ""}</p></div>`,
    },
    {
      op: "add",
      path: "/fields/Microsoft.VSTS.Common.Severity",
      value: bugData.severity || "3 - Medium",
    },
  ];

  if (bugData.iterationPath) {
    patchDocument.push({
      op: "add",
      path: "/fields/System.IterationPath",
      value: bugData.iterationPath,
    });
  }

  const parentId = bugData.parentWorkItemId || bugData.workItemId;
  if (parentId) {
    patchDocument.push({
      op: "add",
      path: "/relations/-",
      value: {
        rel: "System.LinkTypes.Hierarchy-Reverse",
        url: `https://dev.azure.com/${org}/_apis/wit/workitems/${parentId}`,
      },
    });
  }

  try {
    const response = await axios.post(url, patchDocument, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json-patch+json",
      },
    });

    return {
      id: response.data.id,
      url:
        response.data._links?.html?.href ||
        `https://dev.azure.com/${org}/${project}/_workitems/edit/${response.data.id}`,
    };
  } catch (error) {
    throw new Error(`Failed to create Bug in Azure DevOps: ${error.message}`);
  }
}

/**
 * Fetches list of Sprints / Iteration Paths for a given project.
 */
async function getProjectIterations(projectName, customConfig = {}) {
  const { org, pat } = resolveConfig({ ...customConfig, project: projectName });
  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;

  try {
    const teamUrl = `https://dev.azure.com/${org}/${projectName}/_apis/work/teamsettings/iterations?api-version=7.0`;
    const response = await axios.get(teamUrl, {
      headers: { Authorization: authHeader },
    });
    if (Array.isArray(response.data?.value) && response.data.value.length > 0) {
      return response.data.value.map((it) => ({
        id: it.id,
        name: it.name,
        path: it.path || `${projectName}\\${it.name}`,
        isCurrent: it.attributes?.timeFrame === "current",
      }));
    }
  } catch (e) {
    // Fallthrough to classification nodes
  }

  try {
    const nodesUrl = `https://dev.azure.com/${org}/${projectName}/_apis/wit/classificationnodes/Iterations?$depth=2&api-version=7.0`;
    const response = await axios.get(nodesUrl, {
      headers: { Authorization: authHeader },
    });
    const result = [];
    function collect(node, prefix = "") {
      if (!node) return;
      const currentPath = prefix ? `${prefix}\\${node.name}` : `${projectName}\\${node.name}`;
      if (node.name !== "Iterations" && node.name !== projectName) {
        result.push({
          id: String(node.id),
          name: node.name,
          path: node.path ? node.path.replace(/^\\/, "").replace(/\//g, "\\") : currentPath,
        });
      }
      if (Array.isArray(node.children)) {
        node.children.forEach((c) => collect(c, currentPath));
      }
    }
    collect(response.data);
    if (result.length > 0) return result;
  } catch (e) {
    console.warn("Classification nodes fetch error:", e.message);
  }

  return [
    { id: "default", name: `${projectName}`, path: `${projectName}` }
  ];
}

module.exports = {
  getWorkItem,
  getProjects,
  getProjectWorkItems,
  getProjectIterations,
  createBugWorkItem,
  cleanHtml,
};
