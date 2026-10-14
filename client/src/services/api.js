/**
 * API Service for interacting with the QA Test Suite Backend
 */
import { parseApiResponse, friendlyNetworkError } from './apiError';
import { refreshAccessToken } from './tokenManager';

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('qatk_token');
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
      localStorage.removeItem('qatk_token');
      localStorage.removeItem('qatk_refresh_token');
      localStorage.removeItem('qatk_user');
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
