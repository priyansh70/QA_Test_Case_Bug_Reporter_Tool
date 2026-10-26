/**
 * Integration tests for the testing-session API. Uses a throwaway MongoDB database on the
 * configured MONGO_URL; Azure DevOps and the AI generator are stubbed.
 */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.MONGO_DB_NAME = `qa_test_sessions_${process.pid}`;
process.env.EVIDENCE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-evidence-'));

const { initDatabase, getDb } = require('../src/config/db');
const app = require('../src/app');
const { createSession } = require('../src/middlewares/authMiddleware');
const azureClient = require('../src/azure/azureClient');
const bugGenerator = require('../src/ai/bugGenerator');

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let server;
let base;
const alice = createSession({ id: 'user_alice', username: 'alice', azureOrg: 'org', azurePat: 'pat' });
const bob = createSession({ id: 'user_bob', username: 'bob', azureOrg: 'org', azurePat: 'pat' });

const original = {
  getProjects: azureClient.getProjects,
  getProjectIterations: azureClient.getProjectIterations,
  createBugWorkItem: azureClient.createBugWorkItem,
  generateBugReport: bugGenerator.generateBugReport,
};
let azureCalls;

async function api(method, url, { token, sessionToken, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (sessionToken) headers['X-Session-Token'] = sessionToken;
  const res = await fetch(`${base}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
}

const validSessionBody = { websiteUrl: 'https://example.com', projectId: 'p-sms', iterationId: 'it-current' };

async function newSession(user = alice) {
  const res = await api('POST', '/api/testing-sessions', { token: user.accessToken, body: validSessionBody });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { id: res.body.session.id, connectToken: res.body.connectToken };
}

function ev(seq, extra = {}) {
  return { seq, type: 'click', url: 'https://example.com/page', title: 'Page', ts: new Date(Date.now() - 10000 + seq).toISOString(), target: { tag: 'button', label: `Button ${seq}` }, ...extra };
}

before(async () => {
  await initDatabase();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  Object.assign(azureClient, { getProjects: original.getProjects, getProjectIterations: original.getProjectIterations, createBugWorkItem: original.createBugWorkItem });
  bugGenerator.generateBugReport = original.generateBugReport;
  await new Promise((resolve) => server.close(resolve));
  const db = getDb();
  await db.dropDatabase();
  await db.client.close();
  fs.rmSync(process.env.EVIDENCE_DIR, { recursive: true, force: true });
});

beforeEach(() => {
  azureCalls = [];
  azureClient.getProjects = async () => [{ id: 'p-sms', name: 'SMS Plus' }, { id: 'p-other', name: 'Other' }];
  azureClient.getProjectIterations = async (project) =>
    project === 'SMS Plus'
      ? [{ id: 'it-current', name: 'Current Sprint', path: 'SMS Plus\\Current Sprint', isCurrent: true }]
      : [];
  azureClient.createBugWorkItem = async (bugData, config) => {
    azureCalls.push({ bugData, config });
    return { id: 4242, url: 'https://dev.azure.com/org/SMS%20Plus/_workitems/edit/4242' };
  };
  bugGenerator.generateBugReport = async (title) => ({
    title,
    severity: '2 - High',
    description: 'Generated description',
    stepsToReproduce: '1. Step',
    expectedResult: 'Not determinable from captured evidence - tester to confirm',
    actualResult: 'Observed failure',
  });
});

test('session creation validates website URL', async () => {
  for (const websiteUrl of ['', 'not a url', 'ftp://example.com', 'javascript:alert(1)', 'https://user:pw@example.com']) {
    const res = await api('POST', '/api/testing-sessions', { token: alice.accessToken, body: { ...validSessionBody, websiteUrl } });
    assert.equal(res.status, 400, websiteUrl);
    assert.ok(res.body.fields.websiteUrl, websiteUrl);
  }
  const ok = await api('POST', '/api/testing-sessions', { token: alice.accessToken, body: { ...validSessionBody, websiteUrl: 'http://localhost:8080/app' } });
  assert.equal(ok.status, 201);
});

test('session creation requires project and sprint and resolves them against Azure', async () => {
  const noProject = await api('POST', '/api/testing-sessions', { token: alice.accessToken, body: { websiteUrl: 'https://example.com', iterationId: 'it-current' } });
  assert.equal(noProject.status, 400);
  assert.ok(noProject.body.fields.project);

  const noSprint = await api('POST', '/api/testing-sessions', { token: alice.accessToken, body: { websiteUrl: 'https://example.com', projectId: 'p-sms' } });
  assert.equal(noSprint.status, 400);
  assert.ok(noSprint.body.fields.iteration);

  const unknownProject = await api('POST', '/api/testing-sessions', { token: alice.accessToken, body: { ...validSessionBody, projectId: 'nope' } });
  assert.equal(unknownProject.status, 400);

  const sprintFromOtherProject = await api('POST', '/api/testing-sessions', { token: alice.accessToken, body: { ...validSessionBody, projectId: 'p-other' } });
  assert.equal(sprintFromOtherProject.status, 400);

  azureClient.getProjects = async () => {
    throw new Error('Invalid Azure DevOps Personal Access Token (PAT) or Organization.');
  };
  const azureDown = await api('POST', '/api/testing-sessions', { token: alice.accessToken, body: validSessionBody });
  assert.equal(azureDown.status, 502);
});

test('created session stores resolved Azure identifiers and never returns the token hash', async () => {
  const res = await api('POST', '/api/testing-sessions', { token: alice.accessToken, body: validSessionBody });
  assert.equal(res.status, 201);
  const s = res.body.session;
  assert.equal(s.status, 'created');
  assert.equal(s.azure_project_name, 'SMS Plus');
  assert.equal(s.azure_iteration_path, 'SMS Plus\\Current Sprint');
  assert.equal(s.connect_token_hash, undefined);
  assert.match(res.body.connectToken, /^[a-f0-9]{64}$/);
});

test('sessions require authentication and are scoped to their owner', async () => {
  const unauth = await api('POST', '/api/testing-sessions', { body: validSessionBody });
  assert.equal(unauth.status, 401);

  const { id } = await newSession(alice);
  assert.equal((await api('GET', `/api/testing-sessions/${id}`, { token: alice.accessToken })).status, 200);
  assert.equal((await api('GET', `/api/testing-sessions/${id}`, { token: bob.accessToken })).status, 404);
  assert.equal((await api('POST', `/api/testing-sessions/${id}/stop`, { token: bob.accessToken })).status, 404);
  const bobList = await api('GET', '/api/testing-sessions', { token: bob.accessToken });
  assert.ok(!bobList.body.sessions.some((s) => s.id === id));
});

test('extension connect moves session to recording; tokens are session-scoped', async () => {
  const a = await newSession(alice);
  const b = await newSession(alice);

  const wrong = await api('POST', `/api/testing-sessions/${a.id}/connect`, { sessionToken: b.connectToken });
  assert.equal(wrong.status, 401);
  const bogus = await api('POST', `/api/testing-sessions/${a.id}/connect`, { sessionToken: 'x'.repeat(64) });
  assert.equal(bogus.status, 401);
  // A connect token cannot read owner-only endpoints.
  assert.equal((await api('GET', `/api/testing-sessions/${a.id}`, { sessionToken: a.connectToken })).status, 401);

  const ok = await api('POST', `/api/testing-sessions/${a.id}/connect`, { sessionToken: a.connectToken });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.session.status, 'recording');
  const detail = await api('GET', `/api/testing-sessions/${a.id}`, { token: alice.accessToken });
  assert.equal(detail.body.session.extension_connected, true);
  assert.ok(detail.body.session.started_at);
});

test('event batches are persisted in order and retries are idempotent', async () => {
  const { id, connectToken } = await newSession();
  const batch = { events: [ev(3), ev(1), ev(2)] };

  const first = await api('POST', `/api/testing-sessions/${id}/events/batch`, { sessionToken: connectToken, body: batch });
  assert.equal(first.status, 200);
  assert.equal(first.body.accepted, 3);
  assert.equal(first.body.lastSeq, 3);

  const retry = await api('POST', `/api/testing-sessions/${id}/events/batch`, { sessionToken: connectToken, body: batch });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.accepted, 0);
  assert.equal(retry.body.duplicates, 3);

  const partial = await api('POST', `/api/testing-sessions/${id}/events/batch`, { sessionToken: connectToken, body: { events: [ev(3), ev(4)] } });
  assert.equal(partial.body.accepted, 1);

  const timeline = await api('GET', `/api/testing-sessions/${id}/events`, { token: alice.accessToken });
  assert.deepEqual(timeline.body.events.map((e) => e.seq), [1, 2, 3, 4]);
  const detail = await api('GET', `/api/testing-sessions/${id}`, { token: alice.accessToken });
  assert.equal(detail.body.session.event_count, 4);
  assert.equal(detail.body.session.last_seq, 4);
  assert.equal(detail.body.session.status, 'recording');
});

test('event batch validation rejects empty, oversized and malformed batches', async () => {
  const { id, connectToken } = await newSession();
  assert.equal((await api('POST', `/api/testing-sessions/${id}/events/batch`, { sessionToken: connectToken, body: { events: [] } })).status, 400);
  const tooMany = Array.from({ length: 101 }, (_, i) => ev(i + 1));
  assert.equal((await api('POST', `/api/testing-sessions/${id}/events/batch`, { sessionToken: connectToken, body: { events: tooMany } })).status, 413);
  const malformed = await api('POST', `/api/testing-sessions/${id}/events/batch`, {
    sessionToken: connectToken,
    body: { events: [{ seq: 0, type: 'click', ts: 'x' }, { seq: 1, type: 'keylog', ts: new Date().toISOString() }] },
  });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.rejected, 2);
});

test('sensitive data is redacted from stored events', async () => {
  const { id, connectToken } = await newSession();
  await api('POST', `/api/testing-sessions/${id}/events/batch`, {
    sessionToken: connectToken,
    body: {
      events: [
        ev(1, { type: 'input', target: { tag: 'input', type: 'password', name: 'pwd', label: 'hunter2', value: 'hunter2' } }),
        ev(2, { url: 'https://user:pw@example.com/cb?access_token=abc123&page=2#id_token=xyz', target: { tag: 'a', label: 'Email me at jane@corp.com' } }),
        ev(3, { type: 'input', target: { tag: 'input', type: 'text', name: 'card_number', label: 'Card' } }),
      ],
    },
  });
  const { body } = await api('GET', `/api/testing-sessions/${id}/events`, { token: alice.accessToken });
  const [pwd, link, card] = body.events;
  assert.equal(pwd.target.sensitive, true);
  assert.equal(pwd.target.label, '[sensitive field]');
  assert.ok(!JSON.stringify(pwd).includes('hunter2'));
  assert.ok(!link.url.includes('abc123') && !link.url.includes('xyz') && !link.url.includes('pw@'));
  assert.ok(link.url.includes('page=2'));
  assert.ok(!link.target.label.includes('jane@corp.com'));
  assert.equal(card.target.sensitive, true);
});

test('bug capture validates screenshots, stores evidence and is idempotent', async () => {
  const { id, connectToken } = await newSession();
  await api('POST', `/api/testing-sessions/${id}/events/batch`, { sessionToken: connectToken, body: { events: [ev(1), ev(2)] } });
  const bugBody = { clientBugId: 'bug-client-0001', title: 'Login button does nothing', url: 'https://example.com/login?token=secret', pageTitle: 'Login', capturedAt: new Date().toISOString(), screenshot: PNG_1PX };

  const badType = await api('POST', `/api/testing-sessions/${id}/bugs`, { sessionToken: connectToken, body: { ...bugBody, screenshot: 'data:image/gif;base64,R0lGOD' } });
  assert.equal(badType.status, 400);
  const mismatched = await api('POST', `/api/testing-sessions/${id}/bugs`, { sessionToken: connectToken, body: { ...bugBody, screenshot: PNG_1PX.replace('image/png', 'image/jpeg') } });
  assert.equal(mismatched.status, 400);
  const huge = `data:image/png;base64,${Buffer.alloc(5.5 * 1024 * 1024, 1).toString('base64')}`;
  const tooBig = await api('POST', `/api/testing-sessions/${id}/bugs`, { sessionToken: connectToken, body: { ...bugBody, screenshot: huge } });
  assert.equal(tooBig.status, 413);
  const noId = await api('POST', `/api/testing-sessions/${id}/bugs`, { sessionToken: connectToken, body: { ...bugBody, clientBugId: '' } });
  assert.equal(noId.status, 400);

  const created = await api('POST', `/api/testing-sessions/${id}/bugs`, { sessionToken: connectToken, body: bugBody });
  assert.equal(created.status, 201);
  const bug = created.body.bug;
  assert.equal(bug.session_id, id);
  assert.equal(bug.report_status, 'not_generated');
  assert.equal(bug.azure_status, 'not_created');
  assert.equal(bug.azure_iteration_path, 'SMS Plus\\Current Sprint');
  assert.ok(!bug.page_url.includes('secret'));
  assert.deepEqual(bug.recent_events.map((e) => e.seq), [1, 2]);

  const retry = await api('POST', `/api/testing-sessions/${id}/bugs`, { sessionToken: connectToken, body: bugBody });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.duplicate, true);
  assert.equal(retry.body.bug.id, bug.id);

  const second = await api('POST', `/api/testing-sessions/${id}/bugs`, { sessionToken: connectToken, body: { ...bugBody, clientBugId: 'bug-client-0002' } });
  assert.notEqual(second.body.bug.id, bug.id);
  assert.notEqual(second.body.bug.screenshot_file, bug.screenshot_file);

  const list = await api('GET', `/api/testing-sessions/${id}/bugs`, { token: alice.accessToken });
  assert.equal(list.body.bugs.length, 2);
  const detail = await api('GET', `/api/testing-sessions/${id}`, { token: alice.accessToken });
  assert.equal(detail.body.session.bug_count, 2);

  const shot = await api('GET', `/api/captured-bugs/${bug.id}/screenshot`, { token: alice.accessToken });
  assert.equal(shot.status, 200);
  assert.equal(shot.body.subarray(1, 4).toString(), 'PNG');
  assert.equal((await api('GET', `/api/captured-bugs/${bug.id}/screenshot`, { token: bob.accessToken })).status, 404);
  assert.equal((await api('GET', `/api/captured-bugs/${bug.id}/screenshot`)).status, 401);
});

async function capturedBug() {
  const { id, connectToken } = await newSession();
  await api('POST', `/api/testing-sessions/${id}/events/batch`, { sessionToken: connectToken, body: { events: [ev(1)] } });
  const res = await api('POST', `/api/testing-sessions/${id}/bugs`, {
    sessionToken: connectToken,
    body: { clientBugId: `bug-${Date.now()}-${Math.random().toString(36).slice(2)}`, title: 'Broken', url: 'https://example.com/x', pageTitle: 'X', screenshot: PNG_1PX },
  });
  return { sessionId: id, connectToken, bug: res.body.bug };
}

test('captured bug editing validates input and enforces ownership', async () => {
  const { bug } = await capturedBug();
  const ok = await api('PATCH', `/api/captured-bugs/${bug.id}`, { token: alice.accessToken, body: { title: 'Checkout total is wrong', report: { severity: '1 - Critical', description: 'Manual description' } } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.bug.title, 'Checkout total is wrong');
  assert.equal(ok.body.bug.report.severity, '1 - Critical');
  assert.equal(ok.body.bug.report.description, 'Manual description');

  assert.equal((await api('PATCH', `/api/captured-bugs/${bug.id}`, { token: alice.accessToken, body: { title: '   ' } })).status, 400);
  assert.equal((await api('PATCH', `/api/captured-bugs/${bug.id}`, { token: alice.accessToken, body: { report: { severity: 'urgent' } } })).status, 400);
  assert.equal((await api('PATCH', `/api/captured-bugs/${bug.id}`, { token: bob.accessToken, body: { title: 'hijack' } })).status, 404);
});

test('AI report generation records failure and can be retried', async () => {
  const { bug } = await capturedBug();
  let receivedContext;
  bugGenerator.generateBugReport = async () => {
    throw new Error('AI provider unavailable');
  };
  const failed = await api('POST', `/api/captured-bugs/${bug.id}/generate`, { token: alice.accessToken });
  assert.equal(failed.status, 502);
  assert.equal(failed.body.bug.report_status, 'failed');
  assert.ok(failed.body.bug.report_error);

  bugGenerator.generateBugReport = async (title, ctx) => {
    receivedContext = ctx;
    return { title, severity: 'weird', description: 'D', stepsToReproduce: '1. S', expectedResult: 'E', actualResult: 'A' };
  };
  const ok = await api('POST', `/api/captured-bugs/${bug.id}/generate`, { token: alice.accessToken });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.bug.report_status, 'generated');
  assert.equal(ok.body.bug.report.severity, '3 - Medium');
  assert.match(receivedContext.recordedEvidence, /Page URL: https:\/\/example.com\/x/);
  assert.equal(receivedContext.recordedSteps.length, 1);
});

test('Azure bug creation: failure, retry, attachment, iteration and duplicate prevention', async () => {
  const { bug } = await capturedBug();
  const noReport = await api('POST', `/api/captured-bugs/${bug.id}/create-azure-bug`, { token: alice.accessToken });
  assert.equal(noReport.status, 400);
  await api('POST', `/api/captured-bugs/${bug.id}/generate`, { token: alice.accessToken });

  azureClient.createBugWorkItem = async () => {
    throw new Error('Failed to create Bug in Azure DevOps: TF401019');
  };
  const failed = await api('POST', `/api/captured-bugs/${bug.id}/create-azure-bug`, { token: alice.accessToken });
  assert.equal(failed.status, 502);
  assert.equal(failed.body.bug.azure_status, 'failed');

  // Concurrent double submit must create exactly one work item.
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  azureClient.createBugWorkItem = async (bugData, config) => {
    azureCalls.push({ bugData, config });
    await gate;
    return { id: 4242, url: 'https://dev.azure.com/org/_workitems/edit/4242' };
  };
  const p1 = api('POST', `/api/captured-bugs/${bug.id}/create-azure-bug`, { token: alice.accessToken });
  await new Promise((r) => setTimeout(r, 100));
  const p2 = await api('POST', `/api/captured-bugs/${bug.id}/create-azure-bug`, { token: alice.accessToken });
  release();
  const r1 = await p1;
  assert.equal(r1.status, 200);
  assert.equal(p2.status, 409);
  assert.equal(azureCalls.length, 1);
  assert.equal(r1.body.bug.azure_status, 'created');
  assert.equal(r1.body.bug.azure_work_item_id, '4242');

  const { bugData, config } = azureCalls[0];
  assert.equal(config.project, 'SMS Plus');
  assert.equal(config.pat, 'pat');
  assert.equal(bugData.iterationPath, 'SMS Plus\\Current Sprint');
  assert.ok(Buffer.isBuffer(bugData.attachment.buffer));
  assert.match(bugData.description, /Captured on: https:\/\/example.com\/x/);

  const again = await api('POST', `/api/captured-bugs/${bug.id}/create-azure-bug`, { token: alice.accessToken });
  assert.equal(again.status, 409);
  assert.equal(azureCalls.length, 1);
  assert.equal((await api('PATCH', `/api/captured-bugs/${bug.id}`, { token: alice.accessToken, body: { title: 'late edit' } })).status, 409);
  assert.equal((await api('POST', `/api/captured-bugs/${bug.id}/create-azure-bug`, { token: bob.accessToken })).status, 404);
});

test('stopping a session rejects further events and captures; stop is idempotent', async () => {
  const { id, connectToken } = await newSession();
  await api('POST', `/api/testing-sessions/${id}/connect`, { sessionToken: connectToken });
  const stopped = await api('POST', `/api/testing-sessions/${id}/stop`, { token: alice.accessToken });
  assert.equal(stopped.status, 200);
  assert.equal(stopped.body.session.status, 'stopped');
  assert.ok(stopped.body.session.ended_at);

  assert.equal((await api('POST', `/api/testing-sessions/${id}/events/batch`, { sessionToken: connectToken, body: { events: [ev(1)] } })).status, 409);
  assert.equal((await api('POST', `/api/testing-sessions/${id}/bugs`, { sessionToken: connectToken, body: { clientBugId: 'late-bug-0001', url: 'https://example.com' } })).status, 409);
  const heartbeat = await api('POST', `/api/testing-sessions/${id}/connect`, { sessionToken: connectToken });
  assert.equal(heartbeat.status, 409);
  assert.equal(heartbeat.body.status, 'stopped');
  assert.equal((await api('POST', `/api/testing-sessions/${id}/connect-token`, { token: alice.accessToken })).status, 409);

  const again = await api('POST', `/api/testing-sessions/${id}/stop`, { sessionToken: connectToken });
  assert.equal(again.status, 200);
  assert.equal(again.body.session.status, 'stopped');
});

test('extension reconnection: rotated token invalidates the old one and ordering resumes from last_seq', async () => {
  const { id, connectToken } = await newSession();
  await api('POST', `/api/testing-sessions/${id}/events/batch`, { sessionToken: connectToken, body: { events: [ev(1), ev(2)] } });

  const rotated = await api('POST', `/api/testing-sessions/${id}/connect-token`, { token: alice.accessToken });
  assert.equal(rotated.status, 200);
  assert.notEqual(rotated.body.connectToken, connectToken);
  assert.equal((await api('POST', `/api/testing-sessions/${id}/connect`, { sessionToken: connectToken })).status, 401);

  const reconnect = await api('POST', `/api/testing-sessions/${id}/connect`, { sessionToken: rotated.body.connectToken });
  assert.equal(reconnect.status, 200);
  assert.equal(reconnect.body.session.last_seq, 2);
  await api('POST', `/api/testing-sessions/${id}/events/batch`, { sessionToken: rotated.body.connectToken, body: { events: [ev(3)] } });
  const timeline = await api('GET', `/api/testing-sessions/${id}/events`, { token: alice.accessToken });
  assert.deepEqual(timeline.body.events.map((e) => e.seq), [1, 2, 3]);
});

test('existing endpoints keep working', async () => {
  const bugs = await api('GET', '/api/bugs', { token: alice.accessToken });
  assert.equal(bugs.status, 200);
  assert.equal(bugs.body.success, true);
  const config = await api('GET', '/api/config', { token: alice.accessToken });
  assert.equal(config.status, 200);
  assert.equal((await api('GET', '/api/history')).status, 401);
  assert.equal((await api('GET', '/api/does-not-exist', { token: alice.accessToken })).status, 404);
});

test('history items with identical fileName for the same work item load independently by unique suite id', async () => {
  const TestSuiteModel = require('../src/models/TestSuite');
  const suite1 = await TestSuiteModel.save({
    id: 'suite_first_123',
    userId: alice.user.id,
    workItemId: '42514',
    featureName: 'Auto Reply Version 1',
    dataJson: JSON.stringify({ feature: 'Auto Reply Version 1', sections: [] }),
    fileName: 'test-cases-42514.json',
  });

  const suite2 = await TestSuiteModel.save({
    id: 'suite_second_456',
    userId: alice.user.id,
    workItemId: '42514',
    featureName: 'Auto Reply Version 2',
    dataJson: JSON.stringify({ feature: 'Auto Reply Version 2', sections: [] }),
    fileName: 'test-cases-42514.json',
  });

  const res1 = await api('GET', `/api/history/${suite1.id}`, { token: alice.accessToken });
  assert.equal(res1.status, 200);
  assert.equal(res1.body.data.feature, 'Auto Reply Version 1');

  const res2 = await api('GET', `/api/history/${suite2.id}`, { token: alice.accessToken });
  assert.equal(res2.status, 200);
  assert.equal(res2.body.data.feature, 'Auto Reply Version 2');
});
