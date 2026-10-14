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
 * Fetches list of users / team members for a given Azure DevOps project.
 */
async function getProjectUsers(projectName, customConfig = {}) {
  let org, pat;
  try {
    const config = resolveConfig({ ...customConfig, project: projectName });
    org = config.org;
    pat = config.pat;
  } catch (err) {
    return [
      { id: "demo-1", displayName: "QA Automation Lead", uniqueName: "qa.lead@example.com", imageUrl: "" },
      { id: "demo-2", displayName: "Frontend Developer", uniqueName: "frontend.dev@example.com", imageUrl: "" },
      { id: "demo-3", displayName: "Backend Developer", uniqueName: "backend.dev@example.com", imageUrl: "" },
    ];
  }

  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;

  try {
    // 1. Fetch teams for the project
    const teamsUrl = `https://dev.azure.com/${org}/_apis/projects/${encodeURIComponent(projectName)}/teams?api-version=7.0`;
    const teamsRes = await axios.get(teamsUrl, {
      headers: { Authorization: authHeader },
    });

    const teams = Array.isArray(teamsRes.data?.value) ? teamsRes.data.value : [];
    const userMap = new Map();

    // 2. Fetch members of each team in the project
    await Promise.all(
      teams.slice(0, 15).map(async (team) => {
        try {
          const membersUrl = `https://dev.azure.com/${org}/_apis/projects/${encodeURIComponent(projectName)}/teams/${team.id}/members?api-version=7.0`;
          const memRes = await axios.get(membersUrl, {
            headers: { Authorization: authHeader },
          });
          const members = Array.isArray(memRes.data?.value) ? memRes.data.value : [];
          for (const m of members) {
            const identity = m.identity || m;
            if (identity && (identity.displayName || identity.uniqueName)) {
              const key = identity.uniqueName || identity.id || identity.displayName;
              if (!userMap.has(key)) {
                userMap.set(key, {
                  id: identity.id || key,
                  displayName: identity.displayName || identity.uniqueName,
                  uniqueName: identity.uniqueName || identity.displayName,
                  imageUrl: identity.imageUrl || identity._links?.avatar?.href || "",
                });
              }
            }
          }
        } catch (memErr) {
          console.warn(`Failed to fetch members for team ${team.name}:`, memErr.message);
        }
      })
    );

    if (userMap.size > 0) {
      return Array.from(userMap.values());
    }
  } catch (err) {
    console.warn("Teams/members fetch error, trying Graph API fallback:", err.message);
  }

  // Fallback: Graph API
  try {
    const graphUrl = `https://vssps.dev.azure.com/${org}/_apis/graph/users?api-version=7.0-preview.1`;
    const graphRes = await axios.get(graphUrl, {
      headers: { Authorization: authHeader },
    });
    if (Array.isArray(graphRes.data?.value) && graphRes.data.value.length > 0) {
      return graphRes.data.value.map((u) => ({
        id: u.originId || u.descriptor,
        displayName: u.displayName,
        uniqueName: u.mailAddress || u.principalName || u.displayName,
        imageUrl: u._links?.avatar?.href || "",
      }));
    }
  } catch (graphErr) {
    console.warn("Graph users API fallback failed:", graphErr.message);
  }

  return [];
}

/**
 * Uploads a binary attachment (screenshot or evidence) to Azure DevOps.
 */
async function uploadAttachment(fileName, buffer, customConfig = {}) {
  const { org, project, pat } = resolveConfig(customConfig);
  if (!project) {
    throw new Error("Project name is required to upload attachments in Azure DevOps.");
  }
  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
  const cleanFileName = encodeURIComponent(fileName || "screenshot.png");
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/attachments?fileName=${cleanFileName}&api-version=7.0`;

  try {
    const response = await axios.post(url, buffer, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/octet-stream",
      },
    });
    return response.data; // { id, url }
  } catch (error) {
    console.warn("Azure DevOps attachment upload error:", error.response?.data || error.message);
    throw new Error(`Failed to upload attachment to Azure DevOps: ${error.message}`);
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
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/workitems/$Bug?api-version=7.0`;

  // Build ReproSteps HTML with Description, Steps, Expected, Actual and Evidence
  let mediaHtml = "";
  if (bugData.mediaUrl && bugData.mediaUrl.trim()) {
    const trimmedMedia = bugData.mediaUrl.trim();
    const isImage = /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(trimmedMedia) || trimmedMedia.startsWith("data:image/");
    if (isImage) {
      mediaHtml += `<h3>Attached Screenshot</h3><p><img src="${trimmedMedia}" alt="Screenshot" style="max-width:100%; border:1px solid #ddd; border-radius:4px;" /></p><p><a href="${trimmedMedia}" target="_blank">${trimmedMedia}</a></p>`;
    } else {
      mediaHtml += `<h3>Attached Video / Media URL</h3><p><a href="${trimmedMedia}" target="_blank">${trimmedMedia}</a></p>`;
    }
  }

  const reproStepsHtml = `<div><h3>Description</h3><p>${bugData.description || ""}</p><h3>Steps to Reproduce</h3><pre>${bugData.stepsToReproduce || ""}</pre><h3>Expected Result</h3><p>${bugData.expectedResult || ""}</p><h3>Actual Result</h3><p>${bugData.actualResult || ""}</p>${mediaHtml}</div>`;

  const patchDocument = [
    { op: "add", path: "/fields/System.Title", value: bugData.title },
    {
      op: "add",
      path: "/fields/Microsoft.VSTS.TCM.ReproSteps",
      value: reproStepsHtml,
    },
    {
      op: "add",
      path: "/fields/Microsoft.VSTS.Common.Severity",
      value: bugData.severity || "3 - Medium",
    },
  ];

  // Assign To user
  if (bugData.assignedTo && bugData.assignedTo.trim() && bugData.assignedTo !== "unassigned") {
    patchDocument.push({
      op: "add",
      path: "/fields/System.AssignedTo",
      value: bugData.assignedTo.trim(),
    });
  }

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

  // Hyperlink relation for media URL if external link
  if (bugData.mediaUrl && (bugData.mediaUrl.startsWith("http://") || bugData.mediaUrl.startsWith("https://"))) {
    patchDocument.push({
      op: "add",
      path: "/relations/-",
      value: {
        rel: "Hyperlink",
        url: bugData.mediaUrl.trim(),
        attributes: {
          comment: "Attached Screenshot / Video Evidence",
        },
      },
    });
  }

  // Upload file attachment if provided
  if (bugData.attachment && (bugData.attachment.data || bugData.attachment.buffer)) {
    try {
      let buffer = bugData.attachment.buffer;
      if (!buffer && typeof bugData.attachment.data === "string") {
        const base64Clean = bugData.attachment.data.replace(/^data:[^;]+;base64,/, "");
        buffer = Buffer.from(base64Clean, "base64");
      }
      if (buffer) {
        const attachRes = await uploadAttachment(
          bugData.attachment.fileName || "screenshot.png",
          buffer,
          customConfig
        );
        if (attachRes?.url) {
          patchDocument.push({
            op: "add",
            path: "/relations/-",
            value: {
              rel: "AttachedFile",
              url: attachRes.url,
              attributes: {
                comment: "Screenshot / Media Evidence",
              },
            },
          });
        }
      }
    } catch (attErr) {
      console.warn("Failed to attach file to Azure Bug work item:", attErr.message);
    }
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
    const details = error.response?.data?.message || error.message;
    throw new Error(`Failed to create Bug in Azure DevOps: ${details}`);
  }
}

/**
 * Updates an existing Work Item's Title, Description and Acceptance Criteria in Azure DevOps.
 */
async function updateWorkItem(workItemId, fields = {}, customConfig = {}) {
  const { org, project, pat } = resolveConfig(customConfig);
  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;

  const url = project
    ? `https://dev.azure.com/${org}/${project}/_apis/wit/workitems/${workItemId}?api-version=7.0`
    : `https://dev.azure.com/${org}/_apis/wit/workitems/${workItemId}?api-version=7.0`;

  const toHtml = (text) =>
    typeof text === "string" && text.trim()
      ? text.split("\n").map((line) => `<div>${line}</div>`).join("")
      : "";

  const patchDocument = [];
  if (fields.title && fields.title.trim()) {
    patchDocument.push({ op: "add", path: "/fields/System.Title", value: fields.title.trim() });
  }
  if (fields.description !== undefined) {
    patchDocument.push({ op: "add", path: "/fields/System.Description", value: toHtml(fields.description) });
  }
  if (fields.acceptanceCriteria !== undefined) {
    patchDocument.push({
      op: "add",
      path: "/fields/Microsoft.VSTS.Common.AcceptanceCriteria",
      value: toHtml(fields.acceptanceCriteria),
    });
  }

  if (patchDocument.length === 0) {
    throw new Error("No fields provided to update.");
  }

  try {
    const response = await axios.patch(url, patchDocument, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json-patch+json",
      },
    });

    const f = response.data.fields || {};
    return {
      id: workItemId,
      title: f["System.Title"] || fields.title || "",
      description: cleanHtml(f["System.Description"] || ""),
      acceptanceCriteria: cleanHtml(f["Microsoft.VSTS.Common.AcceptanceCriteria"] || ""),
      url:
        response.data._links?.html?.href ||
        `https://dev.azure.com/${org}/_workitems/edit/${workItemId}`,
    };
  } catch (error) {
    const details = error.response?.data?.message || error.message;
    throw new Error(`Failed to update Work Item in Azure DevOps: ${details}`);
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
  getProjectUsers,
  uploadAttachment,
  createBugWorkItem,
  updateWorkItem,
  cleanHtml,
};
