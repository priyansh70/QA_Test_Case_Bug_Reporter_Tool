/**
 * QA Test Suite Generator - Frontend Application (Vanilla Fallback)
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const connectionBadge = document.getElementById('connectionBadge');
  const connectionText = document.getElementById('connectionText');
  const generateForm = document.getElementById('generateForm');
  const workItemIdInput = document.getElementById('workItemIdInput');
  const fetchWorkItemBtn = document.getElementById('fetchWorkItemBtn');
  const workItemPreview = document.getElementById('workItemPreview');
  const previewTitle = document.getElementById('previewTitle');
  const previewTypeBadge = document.getElementById('previewTypeBadge');
  const previewIdBadge = document.getElementById('previewIdBadge');
  const previewState = document.getElementById('previewState');

  const providerSelect = document.getElementById('providerSelect');
  const modelSelect = document.getElementById('modelSelect');
  const generateBtn = document.getElementById('generateBtn');
  const demoBtn = document.getElementById('demoBtn');
  const quickDemoBtn = document.getElementById('quickDemoBtn');
  const quick42516Btn = document.getElementById('quick42516Btn');

  const statsCard = document.getElementById('statsCard');
  const statTotalCases = document.getElementById('statTotalCases');
  const statSections = document.getElementById('statSections');

  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const suiteWorkspace = document.getElementById('suiteWorkspace');

  const suiteFeatureTitle = document.getElementById('suiteFeatureTitle');
  const platformBadges = document.getElementById('platformBadges');
  const visualView = document.getElementById('visualView');
  const jsonView = document.getElementById('jsonView');
  const jsonCodeBlock = document.getElementById('jsonCodeBlock');

  const viewVisualBtn = document.getElementById('viewVisualBtn');
  const viewJsonBtn = document.getElementById('viewJsonBtn');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  const expandAllBtn = document.getElementById('expandAllBtn');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');

  const historyModalBtn = document.getElementById('historyModalBtn');
  const historyModal = document.getElementById('historyModal');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const historyList = document.getElementById('historyList');

  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  // User Header Badge Elements
  const userBadge = document.getElementById('userBadge');
  const userInitials = document.getElementById('userInitials');
  const userName = document.getElementById('userName');
  const logoutBtn = document.getElementById('logoutBtn');

  // Auth Modal Elements
  const authModal = document.getElementById('authModal');
  const authForm = document.getElementById('authForm');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const registerFields = document.getElementById('registerFields');
  const loginUsernameGroup = document.getElementById('loginUsernameGroup');
  const authNameInput = document.getElementById('authNameInput');
  const authEmailInput = document.getElementById('authEmailInput');
  const authUsernameInput = document.getElementById('authUsernameInput');
  const authPasswordInput = document.getElementById('authPasswordInput');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authErrorAlert = document.getElementById('authErrorAlert');
  const quickAdminBtn = document.getElementById('quickAdminBtn');
  const quickDemoAuthBtn = document.getElementById('quickDemoAuthBtn');

  // Auth & Application State
  let authToken = localStorage.getItem('auth_token') || null;
  let currentUser = JSON.parse(localStorage.getItem('auth_user') || 'null');
  let isLoginMode = true;

  let currentData = null;
  let allExpanded = true;

  function sanitizeErrorMessage(errorOrMsg) {
    if (!errorOrMsg) return 'Something went wrong. Please try again.';
    const raw = typeof errorOrMsg === 'string' ? errorOrMsg : (errorOrMsg.message || String(errorOrMsg));
    const trimmed = raw.trim();

    if (
      /unexpected end of (json|data|input)/i.test(trimmed) ||
      /failed to execute ['"]?json['"]?/i.test(trimmed) ||
      /is not valid json/i.test(trimmed) ||
      /unexpected token.*json/i.test(trimmed) ||
      /syntaxerror:.*json/i.test(trimmed) ||
      /json\.parse/i.test(trimmed)
    ) {
      return 'The server returned an empty or invalid response. Please try again in a moment.';
    }

    if (
      /failed to fetch/i.test(trimmed) ||
      /networkerror/i.test(trimmed) ||
      /load failed/i.test(trimmed) ||
      /connection refused/i.test(trimmed)
    ) {
      return 'Unable to reach the server. Please check your connection and try again.';
    }

    if (/typeerror:/i.test(trimmed) || /referenceerror:/i.test(trimmed)) {
      return 'An unexpected application error occurred. Please refresh the page and try again.';
    }

    return trimmed;
  }

  async function safeParseJson(res) {
    let text = '';
    try {
      text = await res.text();
    } catch (e) {
      text = '';
    }
    let data = null;
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }
    }
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'The server returned an empty or invalid response. Please try again in a moment.' };
    }
    if (data.error) {
      data.error = sanitizeErrorMessage(data.error);
    }
    return data;
  }

  // Initial Auth Check
  initAuth();

  async function initAuth() {
    if (authToken) {
      try {
        const res = await authFetch('/api/auth/me');
        const data = await safeParseJson(res);
        if (data.success && data.user) {
          currentUser = data.user;
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          onAuthenticated();
          return;
        }
      } catch (err) {
        console.error('Session validation error:', err);
      }
    }
    // If no valid token
    showAuthModal(true);
  }

  function onAuthenticated() {
    showAuthModal(false);
    updateUserBadge();
    checkConfig();
  }

  function updateUserBadge() {
    if (currentUser) {
      const nameStr = currentUser.name || currentUser.username || 'User';
      userName.textContent = nameStr;
      userInitials.textContent = nameStr.slice(0, 2).toUpperCase();
      userBadge.classList.remove('hidden');
    } else {
      userBadge.classList.add('hidden');
    }
  }

  function showAuthModal(show) {
    if (show) {
      authModal.classList.remove('hidden');
    } else {
      authModal.classList.add('hidden');
    }
  }

  // Auth Fetch Helper
  async function authFetch(url, options = {}) {
    const headers = {
      ...options.headers,
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      // Auth expired or invalid
      logout();
      throw new Error('Unauthorized');
    }
    return res;
  }

  // Auth Tabs & Form Handlers
  tabLoginBtn.addEventListener('click', () => {
    isLoginMode = true;
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    registerFields.classList.add('hidden');
    if (loginUsernameGroup) loginUsernameGroup.classList.remove('hidden');
    if (authUsernameInput) authUsernameInput.required = true;
    if (authEmailInput) authEmailInput.required = false;
    authSubmitBtn.textContent = 'Sign In to Platform →';
    authErrorAlert.classList.add('hidden');
  });

  tabRegisterBtn.addEventListener('click', () => {
    isLoginMode = false;
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerFields.classList.remove('hidden');
    if (loginUsernameGroup) loginUsernameGroup.classList.add('hidden');
    if (authUsernameInput) authUsernameInput.required = false;
    if (authEmailInput) authEmailInput.required = true;
    authSubmitBtn.textContent = 'Create Account & Sign In →';
    authErrorAlert.classList.add('hidden');
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authErrorAlert.classList.add('hidden');

    const password = authPasswordInput.value.trim();

    if (isLoginMode) {
      const username = authUsernameInput.value.trim();
      if (!username || !password) return;
    } else {
      const email = authEmailInput ? authEmailInput.value.trim() : '';
      if (!email || !password) return;
    }

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = 'Authenticating...';

    try {
      const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
      const payload = isLoginMode
        ? { username: authUsernameInput.value.trim(), password }
        : {
            email: authEmailInput ? authEmailInput.value.trim() : '',
            password,
            name: authNameInput ? authNameInput.value.trim() : '',
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await safeParseJson(res);
      if (data.success && data.token) {
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        onAuthenticated();
      } else {
        authErrorAlert.textContent = sanitizeErrorMessage(data.error || 'Authentication failed.');
        authErrorAlert.classList.remove('hidden');
      }
    } catch (err) {
      authErrorAlert.textContent = sanitizeErrorMessage(err);
      authErrorAlert.classList.remove('hidden');
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = isLoginMode
        ? 'Sign In to Platform →'
        : 'Create Account & Sign In →';
    }
  });

  quickAdminBtn.addEventListener('click', () => {
    authUsernameInput.value = 'admin';
    authPasswordInput.value = 'admin123';
    authForm.dispatchEvent(new Event('submit'));
  });

  quickDemoAuthBtn.addEventListener('click', () => {
    authUsernameInput.value = 'demo';
    authPasswordInput.value = 'demo123';
    authForm.dispatchEvent(new Event('submit'));
  });

  logoutBtn.addEventListener('click', logout);

  async function logout() {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch (e) {}
    }
    authToken = null;
    currentUser = null;
    currentData = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    try { sessionStorage.clear(); } catch {}

    // Reset workspace and forms to prevent previous user data leakage
    if (suiteWorkspace) suiteWorkspace.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    if (workItemPreview) workItemPreview.classList.add('hidden');
    if (workItemIdInput) workItemIdInput.value = '';
    if (previewTitle) previewTitle.textContent = '';
    if (previewTypeBadge) previewTypeBadge.textContent = '';
    if (previewIdBadge) previewIdBadge.textContent = '';
    if (previewState) previewState.textContent = '';
    if (jsonCodeViewer) jsonCodeViewer.textContent = '';
    if (sectionsContainer) sectionsContainer.innerHTML = '';
    if (historyList) historyList.innerHTML = '';

    updateUserBadge();
    showAuthModal(true);
  }

  // Initialize Connection & Config
  async function checkConfig() {
    try {
      const res = await authFetch('/api/config');
      const config = await safeParseJson(res);
      if (config.hasAzureConfig) {
        connectionText.textContent = `Azure DevOps (${config.azureOrg}/${config.azureProject})`;
      } else {
        connectionText.textContent = `Demo Mode (Set .env for Azure)`;
      }
      if (config.provider) providerSelect.value = config.provider;
      if (config.model) modelSelect.value = config.model;
    } catch (err) {
      connectionText.textContent = 'Offline / Standalone';
    }
  }

  // Event Listeners
  fetchWorkItemBtn.addEventListener('click', fetchWorkItemPreview);
  generateBtn.addEventListener('click', () => handleGenerate(false));
  demoBtn.addEventListener('click', () => handleGenerate(true));
  quickDemoBtn.addEventListener('click', () => handleGenerate(true));
  quick42516Btn.addEventListener('click', () => {
    workItemIdInput.value = '42516';
    handleGenerate(false);
  });

  viewVisualBtn.addEventListener('click', () => switchView('visual'));
  viewJsonBtn.addEventListener('click', () => switchView('json'));

  searchInput.addEventListener('input', handleSearch);
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    handleSearch();
  });

  expandAllBtn.addEventListener('click', toggleExpandAll);
  copyAllBtn.addEventListener('click', copyAllTestCases);
  copyJsonBtn.addEventListener('click', copyJsonText);
  downloadJsonBtn.addEventListener('click', downloadJsonFile);

  historyModalBtn.addEventListener('click', openHistoryModal);
  closeHistoryBtn.addEventListener('click', () => historyModal.classList.add('hidden'));

  // Fetch Work Item Preview
  async function fetchWorkItemPreview() {
    const id = workItemIdInput.value.trim();
    if (!id) return;

    fetchWorkItemBtn.disabled = true;
    fetchWorkItemBtn.textContent = '...';

    try {
      const res = await authFetch(`/api/workitem/${id}`);
      const data = await safeParseJson(res);

      if (data.success && data.workItem) {
        const item = data.workItem;
        previewTitle.textContent = item.title;
        previewTypeBadge.textContent = item.type;
        previewIdBadge.textContent = `#${item.id}`;
        previewState.textContent = `State: ${item.state}`;
        workItemPreview.classList.remove('hidden');
      } else {
        alert(sanitizeErrorMessage(data.error || 'Could not fetch Azure DevOps Work Item.'));
      }
    } catch (err) {
      alert(sanitizeErrorMessage(err));
    } finally {
      fetchWorkItemBtn.disabled = false;
      fetchWorkItemBtn.textContent = 'Fetch';
    }
  }

  // Generate Test Cases
  async function handleGenerate(isDemo = false) {
    const id = workItemIdInput.value.trim();
    if (!isDemo && !id) {
      alert('Please enter a Work Item ID or click "Run Sample Demo Story".');
      return;
    }

    showLoading(true);

    try {
      const payload = {
        workItemId: isDemo ? '9999' : id,
        isDemo,
        provider: providerSelect.value,
        model: modelSelect.value,
      };

      const res = await authFetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await safeParseJson(res);

      if (result.success && result.data) {
        currentData = result.data;
        renderTestSuite(result.data);
      } else {
        alert(sanitizeErrorMessage(result.error || 'Failed to generate test cases.'));
        showLoading(false);
      }
    } catch (err) {
      alert(sanitizeErrorMessage(err));
      showLoading(false);
    }
  }

  // Render Generated Test Suite
  function renderTestSuite(data) {
    showLoading(false);
    emptyState.classList.add('hidden');
    suiteWorkspace.classList.remove('hidden');
    statsCard.classList.remove('hidden');

    // Title & Platforms
    suiteFeatureTitle.textContent = data.feature || 'Generated Feature Test Suite';

    platformBadges.innerHTML = '';
    const platforms = Array.isArray(data.platforms) ? data.platforms : ['Web', 'Mobile'];
    platforms.forEach((p) => {
      const span = document.createElement('span');
      span.className = 'platform-tag';
      span.textContent = p;
      platformBadges.appendChild(span);
    });

    // Update Stats
    const sections = Array.isArray(data.sections) ? data.sections : [];
    let totalCount = 0;
    sections.forEach((sec) => {
      if (Array.isArray(sec.testCases)) totalCount += sec.testCases.length;
    });

    statTotalCases.textContent = totalCount;
    statSections.textContent = sections.length;

    // Render Section Cards
    renderSections(sections);

    // Update JSON code block
    jsonCodeBlock.textContent = JSON.stringify(data, null, 2);
  }

  // Render Visual Section Cards
  function renderSections(sections, query = '') {
    visualView.innerHTML = '';

    if (sections.length === 0) {
      visualView.innerHTML = '<p class="text-muted">No components or test cases found.</p>';
      return;
    }

    sections.forEach((sec, idx) => {
      const card = document.createElement('div');
      card.className = 'section-card';
      card.dataset.sectionIdx = idx;

      const cases = Array.isArray(sec.testCases) ? sec.testCases : [];

      const filteredCases = query
        ? cases.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
        : cases;

      if (query && filteredCases.length === 0) return;

      const header = document.createElement('div');
      header.className = 'section-header';
      header.innerHTML = `
        <div class="section-title-group">
          <span class="section-name">${sec.name || 'Component'}</span>
          <span class="section-count-badge">${filteredCases.length} Cases</span>
        </div>
        <div class="section-actions">
          <button class="btn btn-ghost btn-sm copy-section-btn" title="Copy Section Cases">📋</button>
          <span class="toggle-arrow">▼</span>
        </div>
      `;

      header.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-section-btn')) {
          e.stopPropagation();
          copySectionCases(sec.name, cases);
          return;
        }
        card.classList.toggle('collapsed');
      });

      const listContainer = document.createElement('div');
      listContainer.className = 'test-cases-list';

      filteredCases.forEach((tcText) => {
        const item = document.createElement('div');
        item.className = 'test-case-item';

        let displayText = tcText;
        if (query) {
          const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
          displayText = tcText.replace(regex, '<mark>$1</mark>');
        }

        item.innerHTML = `
          <span class="test-case-bullet">✓</span>
          <span class="test-case-text">${displayText}</span>
        `;
        listContainer.appendChild(item);
      });

      card.appendChild(header);
      card.appendChild(listContainer);
      visualView.appendChild(card);
    });

    if (visualView.children.length === 0 && query) {
      visualView.innerHTML = `<div class="empty-state" style="padding:2rem;"><h3>No matching test cases found for "${query}"</h3></div>`;
    }
  }

  // Switch View (Visual vs JSON)
  function switchView(view) {
    if (view === 'visual') {
      viewVisualBtn.classList.add('active');
      viewJsonBtn.classList.remove('active');
      visualView.classList.remove('hidden');
      jsonView.classList.add('hidden');
    } else {
      viewJsonBtn.classList.add('active');
      viewVisualBtn.classList.remove('active');
      jsonView.classList.remove('hidden');
      visualView.classList.add('hidden');
    }
  }

  // Handle Search Filtering
  function handleSearch() {
    const q = searchInput.value.trim();
    if (q) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    if (currentData && Array.isArray(currentData.sections)) {
      renderSections(currentData.sections, q);
    }
  }

  // Expand / Collapse All
  function toggleExpandAll() {
    allExpanded = !allExpanded;
    const cards = document.querySelectorAll('.section-card');
    cards.forEach((card) => {
      if (allExpanded) {
        card.classList.remove('collapsed');
      } else {
        card.classList.add('collapsed');
      }
    });
    expandAllBtn.textContent = allExpanded ? '↔️ Collapse All' : '↔️ Expand All';
  }

  // Copy Section Cases
  function copySectionCases(sectionName, cases) {
    const text = `### ${sectionName}\n` + cases.map((c, i) => `${i + 1}. ${c}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast(`Copied ${cases.length} cases from "${sectionName}"`);
  }

  // Copy All Test Cases as List
  function copyAllTestCases() {
    if (!currentData || !Array.isArray(currentData.sections)) return;
    let fullText = `# Feature: ${currentData.feature || 'Test Suite'}\n\n`;

    currentData.sections.forEach((sec) => {
      fullText += `## ${sec.name}\n`;
      if (Array.isArray(sec.testCases)) {
        sec.testCases.forEach((tc, i) => {
          fullText += `${i + 1}. ${tc}\n`;
        });
      }
      fullText += '\n';
    });

    navigator.clipboard.writeText(fullText);
    showToast('Copied all test scenarios to clipboard!');
  }

  // Copy JSON Text
  function copyJsonText() {
    if (!currentData) return;
    const jsonStr = JSON.stringify(currentData, null, 2);
    navigator.clipboard.writeText(jsonStr);
    showToast('Copied JSON object to clipboard!');
  }

  // Download JSON File
  function downloadJsonFile() {
    if (!currentData) return;
    const jsonStr = JSON.stringify(currentData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (currentData.feature || 'test-cases').toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `${safeTitle}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded JSON file!');
  }

  // Open History Modal
  async function openHistoryModal() {
    historyModal.classList.remove('hidden');
    historyList.innerHTML = '<p class="text-muted">Loading history...</p>';

    try {
      const res = await authFetch('/api/history');
      const data = await safeParseJson(res);

      if (data.success && Array.isArray(data.history) && data.history.length > 0) {
        historyList.innerHTML = '';
        data.history.forEach((item) => {
          const div = document.createElement('div');
          div.className = 'history-item';
          const dateStr = new Date(item.createdAt).toLocaleString();
          div.innerHTML = `
            <div>
              <div class="history-title">${item.featureName}</div>
              <div class="history-meta">${item.fileName} • ${item.sectionsCount} Sections • ${item.totalTestCases} Test Cases</div>
            </div>
            <div class="history-meta">${dateStr}</div>
          `;
          div.addEventListener('click', () => loadHistoryItem(item.id || item.fileName));
          historyList.appendChild(div);
        });
      } else {
        historyList.innerHTML = '<p class="text-muted">No saved history files yet.</p>';
      }
    } catch (err) {
      historyList.innerHTML = `<p class="text-muted">${sanitizeErrorMessage(err)}</p>`;
    }
  }

  // Load Specific History Item
  async function loadHistoryItem(fileName) {
    historyModal.classList.add('hidden');
    showLoading(true);

    try {
      const res = await authFetch(`/api/history/${fileName}`);
      const result = await safeParseJson(res);

      if (result.success && result.data) {
        currentData = result.data;
        renderTestSuite(result.data);
      } else {
        alert(sanitizeErrorMessage(result.error || 'Failed to load file content.'));
        showLoading(false);
      }
    } catch (err) {
      alert(sanitizeErrorMessage(err));
      showLoading(false);
    }
  }

  // Show Toast
  function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }

  // Helpers
  function showLoading(isLoading) {
    if (isLoading) {
      emptyState.classList.add('hidden');
      suiteWorkspace.classList.add('hidden');
      loadingState.classList.remove('hidden');
    } else {
      loadingState.classList.add('hidden');
    }
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
});
