/**
 * API Service for interacting with the QA Test Suite Backend
 */
import { parseApiResponse, friendlyNetworkError } from './apiError';
import { refreshAccessToken } from './tokenManager';

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw friendlyNetworkError();
  }

  // If token expired, attempt silent refresh and retry once
  if (res.status === 401 && !options._retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${refreshed.token}`;
      try {
        res = await fetch(url, { ...options, headers, _retry: true });
      } catch {
        throw friendlyNetworkError();
      }
    } else {
      // Refresh failed — clear session and notify user
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_user');
      // Dispatch global event so AuthContext can redirect to login
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
      throw new Error('Your session has expired. Please log in again.');
    }
  }

  return res;
}

export async function fetchConfig() {
  const res = await authFetch('/api/config');
  return parseApiResponse(res);
}

export async function generateTestCases({ workItemId, isDemo, provider, model, project, editedFields }) {
  const res = await authFetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workItemId, isDemo, provider, model, project, editedFields }),
  });
  return parseApiResponse(res);
}

export async function updateAzureWorkItem(id, { project, title, description, acceptanceCriteria }) {
  const res = await authFetch(`/api/azure/work-item/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, title, description, acceptanceCriteria }),
  });
  return parseApiResponse(res);
}

export async function fetchHistory() {
  const res = await authFetch('/api/history');
  return parseApiResponse(res);
}

export async function fetchHistoryItem(id) {
  const res = await authFetch(`/api/history/${id}`);
  return parseApiResponse(res);
}

export async function fetchBugs() {
  const res = await authFetch('/api/bugs');
  return parseApiResponse(res);
}

export async function generateBugReport({ bugTitle, storyContext, provider, model }) {
  const res = await authFetch('/api/bugs/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bugTitle, storyContext, provider, model }),
  });
  return parseApiResponse(res);
}

export async function publishBug({ bugReport, projectName, workItemId, parentWorkItemId, iterationPath, assignedTo, mediaUrl, attachment }) {
  const res = await authFetch('/api/bugs/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bugReport, projectName, workItemId, parentWorkItemId, iterationPath, assignedTo, mediaUrl, attachment }),
  });
  return parseApiResponse(res);
}

export async function fetchAzureProjects() {
  const res = await authFetch('/api/azure/projects');
  return parseApiResponse(res);
}

export async function fetchAzureUsers(projectName) {
  const res = await authFetch(`/api/azure/users?project=${encodeURIComponent(projectName)}`);
  return parseApiResponse(res);
}

export async function fetchAzureWorkItems(projectName) {
  const res = await authFetch(`/api/azure/work-items?project=${encodeURIComponent(projectName)}`);
  return parseApiResponse(res);
}

export async function fetchAzureWorkItemById(id) {
  const res = await authFetch(`/api/azure/work-item/${id}`);
  return parseApiResponse(res);
}

export async function fetchAzureIterations(projectName) {
  const res = await authFetch(`/api/azure/iterations?project=${encodeURIComponent(projectName)}`);
  return parseApiResponse(res);
}

export async function fetchScripts() {
  const res = await authFetch('/api/scripts');
  return parseApiResponse(res);
}

// ---------- Website testing sessions ----------

async function postJson(url, body, method = 'POST') {
  const res = await authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return parseApiResponse(res);
}

export async function createTestingSession({ websiteUrl, projectId, iterationId }) {
  return postJson('/api/testing-sessions', { websiteUrl, projectId, iterationId });
}

export async function fetchTestingSessions() {
  return parseApiResponse(await authFetch('/api/testing-sessions'));
}

export async function fetchTestingSession(id) {
  return parseApiResponse(await authFetch(`/api/testing-sessions/${encodeURIComponent(id)}`));
}

export async function fetchSessionEvents(id, afterSeq = 0) {
  return parseApiResponse(await authFetch(`/api/testing-sessions/${encodeURIComponent(id)}/events?afterSeq=${afterSeq}`));
}

export async function fetchSessionBugs(id) {
  return parseApiResponse(await authFetch(`/api/testing-sessions/${encodeURIComponent(id)}/bugs`));
}

export async function rotateSessionConnectToken(id) {
  return postJson(`/api/testing-sessions/${encodeURIComponent(id)}/connect-token`);
}

export async function stopTestingSession(id) {
  return postJson(`/api/testing-sessions/${encodeURIComponent(id)}/stop`);
}

export async function deleteTestingSession(id) {
  return parseApiResponse(await authFetch(`/api/testing-sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function deleteCapturedBug(bugId) {
  return parseApiResponse(await authFetch(`/api/captured-bugs/${encodeURIComponent(bugId)}`, { method: 'DELETE' }));
}

export async function fetchCapturedBug(bugId) {
  return parseApiResponse(await authFetch(`/api/captured-bugs/${encodeURIComponent(bugId)}`));
}

export async function updateCapturedBug(bugId, { title, report, assignedTo, parentWorkItemId }) {
  return postJson(`/api/captured-bugs/${encodeURIComponent(bugId)}`, { title, report, assignedTo, parentWorkItemId }, 'PATCH');
}

export async function generateCapturedBugReport(bugId, { provider, model } = {}) {
  return postJson(`/api/captured-bugs/${encodeURIComponent(bugId)}/generate`, { provider, model });
}

export async function createCapturedBugInAzure(bugId) {
  return postJson(`/api/captured-bugs/${encodeURIComponent(bugId)}/create-azure-bug`);
}

/** Screenshots are auth-protected, so they are fetched as a blob and shown via an object URL. */
export async function fetchCapturedBugScreenshotUrl(bugId) {
  const res = await authFetch(`/api/captured-bugs/${encodeURIComponent(bugId)}/screenshot`);
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}
