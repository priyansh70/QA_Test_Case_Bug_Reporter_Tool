const crypto = require('crypto');
const { newId, publicUrl } = require('../utils/publicLinks');
const TestingSessionModel = require('../models/TestingSession');
const CapturedBugModel = require('../models/CapturedBug');
const BugModel = require('../models/Bug');
// Module objects (not destructured) so the real integrations can be stubbed in unit tests.
const azureClient = require('../azure/azureClient');
const bugGenerator = require('../ai/bugGenerator');
const { formatAiError } = require('../ai/providers/errorFormatter');
const { hashToken } = require('../middlewares/sessionAuthMiddleware');
const { sanitizeEvent, redactUrl, redactText } = require('../../extension/redact');
const { decodeScreenshot, saveScreenshot, readScreenshot, deleteSessionEvidence, deleteScreenshot } = require('../utils/evidenceStore');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_EVENTS_PER_BATCH = 100;
const MAX_EVENTS_PER_SESSION = 5000;
const CONNECTED_WINDOW_MS = 75 * 1000; // extension heartbeats every 30s
const MAX_REPORT_FIELD_LENGTH = 20000;
const REPORT_FIELDS = ['title', 'severity', 'description', 'stepsToReproduce', 'expectedResult', 'actualResult'];
const SEVERITIES = ['1 - Critical', '2 - High', '3 - Medium', '4 - Low'];

function issueConnectToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token), tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString() };
}

// Same credential resolution as AzureController: user profile first, env fallback inside azureClient.
function azureConfig(user) {
  return { org: user?.azureOrg, pat: user?.azurePat };
}

function fail(res, status, error, extra = {}) {
  if (status === 500) {
    // Internal errors (DB, filesystem) are logged, not echoed to the client.
    console.error('Testing session error:', error);
    error = 'The server ran into a problem. Please try again in a moment.';
  }
  return res.status(status).json({ success: false, error, ...extra });
}

/** Returns a normalized http(s) URL or null. Credentials embedded in the URL are rejected. */
function validateWebsiteUrl(raw) {
  try {
    const url = new URL(String(raw || '').trim());
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch (e) {
    return null;
  }
}

function serializeSession(s, extra = {}) {
  if (!s) return null;
  const { _id, connect_token_hash, ...rest } = s;
  const lastSeen = s.last_seen_at ? new Date(s.last_seen_at).getTime() : 0;
  const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
  return {
    ...rest,
    extension_connected: s.status === 'recording' && Date.now() - lastSeen < CONNECTED_WINDOW_MS,
    duration_ms: s.started_at ? end - new Date(s.started_at).getTime() : 0,
    ...extra,
  };
}

function isActive(session) {
  return session.status === 'created' || session.status === 'recording';
}

function describeEvent(e) {
  const t = e.target || {};
  const name = t.label || t.name || t.id || t.testId || '';
  const quoted = name ? ` "${name}"` : '';
  const tag = String(t.tag || '').toLowerCase();
  switch (e.type) {
    case 'page_load':
      return `Open the "${e.title || e.url}" page (${e.url})`;
    case 'navigation':
      return `Go to the "${e.title || e.url}" page (${e.url})`;
    case 'click':
      if (tag === 'a') return `Click the${quoted} link`;
      if (tag === 'button') return `Click the${quoted} button`;
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return `Click the${quoted} field`;
      return name ? `Click on "${name}"` : 'Click on an element on the page';
    case 'input':
      return `Enter a value in the${quoted} field`;
    case 'submit':
      return `Submit the${quoted} form`;
    default:
      return e.type;
  }
}

// Plain-language steps: drop consecutive repeats (e.g. one event per keystroke) so the list reads like a person wrote it.
function describeEvents(events) {
  const steps = [];
  for (const e of events) {
    const s = describeEvent(e);
    if (steps[steps.length - 1] !== s) steps.push(s);
  }
  return steps;
}

async function loadOwnedSession(req, res) {
  const session = await TestingSessionModel.findByIdForUser(req.params.id, req.user.id);
  if (!session) fail(res, 404, 'Testing session not found.');
  return session;
}

async function loadOwnedBug(req, res) {
  const bug = await CapturedBugModel.findByIdForUser(req.params.bugId, req.user.id);
  if (!bug) fail(res, 404, 'Captured bug not found.');
  return bug;
}

/** Bugs published to Azure before public links existed get their Bug history entry + link on first read. */
async function ensurePublicLink(req, bug) {
  if (bug.azure_status !== 'created' || bug.public_link || !bug.report) return bug;
  const historyBugId = newId('bug');
  const publicLink = publicUrl(req, `/bugs/public/${historyBugId}`);
  await BugModel.save({
    id: historyBugId,
    userId: bug.user_id,
    title: bug.report.title,
    severity: bug.report.severity,
    description: bug.report.description,
    stepsToReproduce: bug.report.stepsToReproduce,
    expectedResult: bug.report.expectedResult,
    actualResult: bug.report.actualResult,
    azureBugId: bug.azure_work_item_id,
    azureUrl: bug.azure_url,
    publicLink,
  });
  return (await CapturedBugModel.update(bug.id, { public_link: publicLink })) || bug;
}

class TestingSessionController {
  static async createSession(req, res) {
    try {
      const { websiteUrl, projectId, projectName, iterationId, iterationPath } = req.body || {};
      const fields = {};
      const url = validateWebsiteUrl(websiteUrl);
      if (!url) fields.websiteUrl = 'Enter a valid http:// or https:// website URL.';
      if (!projectId && !projectName) fields.project = 'Select an Azure DevOps project.';
      if (!iterationId && !iterationPath) fields.iteration = 'Select a sprint / iteration.';
      if (Object.keys(fields).length > 0) {
        return fail(res, 400, Object.values(fields)[0], { fields });
      }

      // Resolve the selection against live Azure data so stored ids, names and paths are canonical.
      const config = azureConfig(req.user);
      let project;
      let iteration;
      try {
        const projects = await azureClient.getProjects(config);
        project = projects.find((p) => (projectId ? p.id === projectId : p.name === projectName));
        if (project) {
          const iterations = await azureClient.getProjectIterations(project.name, config);
          iteration = iterations.find((it) => (iterationId ? String(it.id) === String(iterationId) : it.path === iterationPath));
        }
      } catch (azureErr) {
        return fail(res, 502, azureErr.message);
      }
      if (!project) {
        return fail(res, 400, 'The selected Azure DevOps project was not found.', { fields: { project: 'Project not found.' } });
      }
      if (!iteration) {
        return fail(res, 400, 'The selected sprint was not found in this project.', { fields: { iteration: 'Sprint not found.' } });
      }

      const { token, tokenHash, tokenExpiresAt } = issueConnectToken();
      const session = await TestingSessionModel.create({
        id: newId('ts'),
        userId: req.user.id,
        websiteUrl: url,
        project: { id: project.id, name: project.name },
        iteration: { id: String(iteration.id), name: iteration.name, path: iteration.path },
        tokenHash,
        tokenExpiresAt,
      });

      return res.status(201).json({ success: true, session: serializeSession(session, { bug_count: 0 }), connectToken: token });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async listSessions(req, res) {
    try {
      const sessions = await TestingSessionModel.findByUser(req.user.id);
      const counts = await CapturedBugModel.countBySessions(sessions.map((s) => s.id));
      return res.json({ success: true, sessions: sessions.map((s) => serializeSession(s, { bug_count: counts[s.id] || 0 })) });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async getSession(req, res) {
    try {
      const session = await loadOwnedSession(req, res);
      if (!session) return;
      const counts = await CapturedBugModel.countBySessions([session.id]);
      return res.json({ success: true, session: serializeSession(session, { bug_count: counts[session.id] || 0 }) });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  /** Deletes the session with its events, captured bugs and screenshots. Already-published Azure bugs are untouched. */
  static async deleteSession(req, res) {
    try {
      const session = await loadOwnedSession(req, res);
      if (!session) return;
      await CapturedBugModel.deleteBySession(session.id);
      await TestingSessionModel.deleteById(session.id);
      await deleteSessionEvidence(session.id);
      return res.json({ success: true });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async getEvents(req, res) {
    try {
      const session = await loadOwnedSession(req, res);
      if (!session) return;
      const afterSeq = Math.max(0, parseInt(req.query.afterSeq, 10) || 0);
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 500));
      const events = await TestingSessionModel.findEvents(session.id, { afterSeq, limit });
      return res.json({ success: true, events });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  /** Issues a fresh connect token so the extension can (re)connect; invalidates the previous one. */
  static async rotateConnectToken(req, res) {
    try {
      const session = await loadOwnedSession(req, res);
      if (!session) return;
      const { token, tokenHash, tokenExpiresAt } = issueConnectToken();
      const updated = await TestingSessionModel.rotateToken(session.id, tokenHash, tokenExpiresAt);
      if (!updated) return fail(res, 409, 'This testing session has already been stopped.', { status: session.status });
      return res.json({ success: true, connectToken: token, session: serializeSession(updated) });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  /** Extension handshake / heartbeat. Returns last_seq so a reconnecting extension keeps event order. */
  static async connect(req, res) {
    try {
      if (!isActive(req.testingSession)) {
        return fail(res, 409, 'This testing session has been stopped.', { status: req.testingSession.status });
      }
      const session = await TestingSessionModel.markConnected(req.testingSession.id);
      if (!session) return fail(res, 409, 'This testing session has been stopped.', { status: 'stopped' });
      return res.json({
        success: true,
        session: { id: session.id, status: session.status, website_url: session.website_url, last_seq: session.last_seq },
      });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async ingestEvents(req, res) {
    try {
      const session = req.testingSession;
      if (!isActive(session)) {
        return fail(res, 409, 'This testing session has been stopped. Events are no longer accepted.', { status: session.status });
      }
      const { events } = req.body || {};
      if (!Array.isArray(events) || events.length === 0) {
        return fail(res, 400, 'events must be a non-empty array.');
      }
      if (events.length > MAX_EVENTS_PER_BATCH) {
        return fail(res, 413, `A batch may contain at most ${MAX_EVENTS_PER_BATCH} events.`);
      }

      const bySeq = new Map();
      for (const raw of events) {
        const clean = sanitizeEvent(raw);
        if (clean) bySeq.set(clean.seq, clean);
      }
      const clean = Array.from(bySeq.values()).sort((a, b) => a.seq - b.seq);
      const rejected = events.length - clean.length;
      if (clean.length === 0) {
        return fail(res, 400, 'No valid events in batch.', { rejected });
      }
      if (session.event_count + clean.length > MAX_EVENTS_PER_SESSION) {
        return fail(res, 413, `Event limit of ${MAX_EVENTS_PER_SESSION} per session reached.`);
      }

      if (session.status === 'created') await TestingSessionModel.markConnected(session.id);
      // Persist before acknowledging; duplicates from retried batches are ignored.
      const { inserted } = await TestingSessionModel.insertEvents(session.id, clean);
      return res.json({
        success: true,
        accepted: inserted,
        duplicates: clean.length - inserted,
        rejected,
        lastSeq: clean[clean.length - 1].seq,
      });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async captureBug(req, res) {
    try {
      const session = req.testingSession;
      if (!isActive(session)) {
        return fail(res, 409, 'This testing session has been stopped.', { status: session.status });
      }
      const { clientBugId, title, url, pageTitle, capturedAt, screenshot } = req.body || {};
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(String(clientBugId || ''))) {
        return fail(res, 400, 'clientBugId is required (8-64 letters, digits, - or _).');
      }
      const pageUrl = redactUrl(url);
      if (!pageUrl) return fail(res, 400, 'A valid http(s) page URL is required.');

      // Retried capture of the same bug returns the stored record instead of a duplicate.
      const existing = await CapturedBugModel.findBySessionAndClientId(session.id, clientBugId);
      if (existing) return res.json({ success: true, bug: existing, duplicate: true });

      let image = null;
      if (screenshot) {
        try {
          image = decodeScreenshot(screenshot);
        } catch (imgErr) {
          return fail(res, imgErr.status || 400, imgErr.message);
        }
      }

      const captured = new Date(capturedAt);
      const capturedIso = Number.isNaN(captured.getTime()) || captured.getTime() > Date.now() + 60000
        ? new Date().toISOString()
        : captured.toISOString();
      const cleanPageTitle = redactText(pageTitle, 200);
      const cleanTitle = redactText(title, 200) || `Bug on ${cleanPageTitle || new URL(pageUrl).hostname}`;

      const id = newId('cbug');
      const screenshotFile = image ? await saveScreenshot(session.id, id, image) : null;
      const recentEvents = await TestingSessionModel.findRecentEvents(session.id, capturedIso, 20);
      const now = new Date().toISOString();

      const { bug, created } = await CapturedBugModel.createOnce({
        id,
        session_id: session.id,
        user_id: session.user_id,
        client_bug_id: clientBugId,
        title: cleanTitle,
        page_url: pageUrl,
        page_title: cleanPageTitle,
        captured_at: capturedIso,
        screenshot_file: screenshotFile,
        recent_events: recentEvents,
        azure_project_id: session.azure_project_id,
        azure_project_name: session.azure_project_name,
        azure_iteration_path: session.azure_iteration_path,
        report: null,
        report_status: 'not_generated', // not_generated | generating | generated | failed
        report_error: null,
        azure_status: 'not_created', // not_created | creating | created | failed
        azure_error: null,
        azure_work_item_id: null,
        azure_url: null,
        created_at: now,
        updated_at: now,
      });
      return res.status(created ? 201 : 200).json({ success: true, bug, duplicate: !created });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async listBugs(req, res) {
    try {
      const session = await loadOwnedSession(req, res);
      if (!session) return;
      const bugs = await CapturedBugModel.findBySession(session.id);
      return res.json({ success: true, bugs: await Promise.all(bugs.map((b) => ensurePublicLink(req, b))) });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async stopSession(req, res) {
    try {
      const stopped = await TestingSessionModel.stop(req.testingSession.id);
      // Stopping twice is a no-op that returns the already-stopped session.
      const session = stopped || (await TestingSessionModel.findById(req.testingSession.id));
      return res.json({ success: true, session: serializeSession(session) });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async getBug(req, res) {
    try {
      const bug = await loadOwnedBug(req, res);
      if (!bug) return;
      return res.json({ success: true, bug: await ensurePublicLink(req, bug) });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async updateBug(req, res) {
    try {
      const bug = await loadOwnedBug(req, res);
      if (!bug) return;
      if (bug.azure_status === 'created' || bug.azure_status === 'creating') {
        return fail(res, 409, 'This bug has already been sent to Azure DevOps and can no longer be edited here.');
      }

      const { title, report, assignedTo, parentWorkItemId } = req.body || {};
      const updates = {};
      // Azure "Assigned To" (uniqueName/email) and parent user story id; empty string clears the choice.
      if (assignedTo !== undefined) updates.assigned_to = String(assignedTo || '').trim().slice(0, 256) || null;
      if (parentWorkItemId !== undefined) {
        const parent = String(parentWorkItemId || '').trim();
        if (parent && !/^\d+$/.test(parent)) return fail(res, 400, 'parentWorkItemId must be a work item id.');
        updates.parent_work_item_id = parent || null;
      }
      if (title !== undefined) {
        const clean = String(title).trim();
        if (!clean || clean.length > 200) return fail(res, 400, 'Title must be 1-200 characters.');
        updates.title = clean;
      }
      if (report !== undefined) {
        if (!report || typeof report !== 'object') return fail(res, 400, 'report must be an object.');
        const base = bug.report || { severity: '3 - Medium' };
        const merged = { ...base };
        for (const key of REPORT_FIELDS) {
          if (report[key] === undefined) continue;
          const value = String(report[key]);
          if (value.length > MAX_REPORT_FIELD_LENGTH) return fail(res, 400, `${key} is too long.`);
          if (key === 'severity' && !SEVERITIES.includes(value)) return fail(res, 400, 'Invalid severity.');
          merged[key] = value;
        }
        updates.report = merged;
      }
      if (Object.keys(updates).length === 0) return fail(res, 400, 'Nothing to update.');

      const updated = await CapturedBugModel.update(bug.id, updates);
      return res.json({ success: true, bug: updated });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async generateReport(req, res) {
    try {
      const bug = await loadOwnedBug(req, res);
      if (!bug) return;
      if (bug.azure_status === 'created' || bug.azure_status === 'creating') {
        return fail(res, 409, 'This bug has already been sent to Azure DevOps.');
      }
      const claimed = await CapturedBugModel.claim(bug.id, 'report_status', 'generating');
      if (!claimed) return fail(res, 409, 'Report generation is already in progress for this bug.');

      const session = await TestingSessionModel.findById(bug.session_id);
      const events = bug.recent_events || [];
      const recordedEvidence = [
        `Page URL: ${bug.page_url}`,
        `Page title: ${bug.page_title || 'N/A'}`,
        `Bug captured at: ${bug.captured_at}`,
        `Screenshot captured: ${bug.screenshot_file ? 'yes (attached to the Azure bug)' : 'no'}`,
        'Recorded actions (oldest first):',
        ...(events.length ? describeEvents(events).map((s) => `- ${s}`) : ['- none recorded']),
      ].join('\n');

      try {
        const { provider, model } = req.body || {};
        const report = await bugGenerator.generateBugReport(
          bug.title,
          {
            title: `Exploratory testing session on ${session?.website_url || bug.page_url}`,
            description: `Bug captured on "${bug.page_title || bug.page_url}" (${bug.page_url}).`,
            recordedEvidence,
            recordedSteps: describeEvents(events),
          },
          { provider, model }
        );
        const clean = Object.fromEntries(REPORT_FIELDS.map((k) => [k, String(report[k] || '')]));
        if (!SEVERITIES.includes(clean.severity)) clean.severity = '3 - Medium';
        const updated = await CapturedBugModel.update(bug.id, {
          report: clean,
          report_status: 'generated',
          report_source: report.isTemplate ? 'template' : 'ai',
          report_error: null,
          report_generated_at: new Date().toISOString(),
        });
        return res.json({ success: true, bug: updated, rateLimitFallback: Boolean(report._rateLimitFallback) });
      } catch (aiErr) {
        const message = formatAiError(aiErr, 'AI Bug Generator');
        const updated = await CapturedBugModel.update(bug.id, { report_status: 'failed', report_error: message });
        return fail(res, 502, message, { bug: updated });
      }
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async createAzureBug(req, res) {
    try {
      const bug = await loadOwnedBug(req, res);
      if (!bug) return;
      if (!bug.report || !bug.report.title || !bug.report.description) {
        return fail(res, 400, 'Generate or write the bug report (title and description) before creating it in Azure DevOps.');
      }
      if (bug.azure_status === 'created') {
        return fail(res, 409, `Already created as Azure bug #${bug.azure_work_item_id}.`, { bug });
      }
      // Atomic claim prevents duplicate work items from double clicks or concurrent retries.
      const claimed = await CapturedBugModel.claim(bug.id, 'azure_status', 'creating', ['created']);
      if (!claimed) return fail(res, 409, 'Azure DevOps bug creation is already in progress.');

      const session = await TestingSessionModel.findById(bug.session_id);
      try {
        let attachment = null;
        if (bug.screenshot_file) {
          const buffer = await readScreenshot(bug.session_id, bug.screenshot_file);
          attachment = { buffer, fileName: `screenshot-${bug.id}.${bug.screenshot_file.split('.').pop()}` };
        }
        // Same public link scheme as BugController so the bug also shows up in Bug history.
        const historyBugId = newId('bug');
        const publicLink = publicUrl(req, `/bugs/public/${historyBugId}`);
        const evidence = `\n\nCaptured on: ${bug.page_url}\nPage title: ${bug.page_title || 'N/A'}\nCaptured at: ${bug.captured_at}\nTesting session: ${bug.session_id}\nPublic Bug Report Link: ${publicLink}`;
        // Everything below is sent to Azure DevOps (see createBugWorkItem in azureClient.js for the field mapping).
        const result = await azureClient.createBugWorkItem(
          {
            // report: title -> System.Title, severity -> Microsoft.VSTS.Common.Severity,
            // description/stepsToReproduce/expectedResult/actualResult -> Microsoft.VSTS.TCM.ReproSteps (HTML)
            ...bug.report,
            // Report description plus capture details (page URL/title, capture time, session id, public link)
            description: `${bug.report.description}${evidence}`,
            // Session sprint -> System.IterationPath
            iterationPath: session?.azure_iteration_path || bug.azure_iteration_path,
            // Chosen team member -> System.AssignedTo (omitted when unassigned)
            assignedTo: bug.assigned_to || null,
            // Chosen user story -> Hierarchy-Reverse relation (bug becomes a child of the story)
            parentWorkItemId: bug.parent_work_item_id || null,
            // Screenshot file -> uploaded and linked as AttachedFile relation
            attachment,
          },
          // Org/PAT from the user profile; project comes from the testing session
          { ...azureConfig(req.user), project: session?.azure_project_name || bug.azure_project_name }
        );
        await BugModel.save({
          id: historyBugId,
          userId: req.user.id,
          workItemId: bug.parent_work_item_id,
          assignedTo: bug.assigned_to,
          title: bug.report.title,
          severity: bug.report.severity,
          description: bug.report.description,
          stepsToReproduce: bug.report.stepsToReproduce,
          expectedResult: bug.report.expectedResult,
          actualResult: bug.report.actualResult,
          azureBugId: String(result.id),
          azureUrl: result.url,
          publicLink,
        });
        const updated = await CapturedBugModel.update(bug.id, {
          azure_status: 'created',
          azure_work_item_id: String(result.id),
          azure_url: result.url,
          public_link: publicLink,
          azure_error: null,
          azure_created_at: new Date().toISOString(),
        });
        return res.json({ success: true, bug: updated, message: `Bug #${result.id} created in Azure DevOps.` });
      } catch (azureErr) {
        const updated = await CapturedBugModel.update(bug.id, { azure_status: 'failed', azure_error: azureErr.message });
        return fail(res, 502, azureErr.message, { bug: updated });
      }
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  /** Deletes a captured bug and its screenshot. The Azure work item and Bug history entry are untouched. */
  static async deleteBug(req, res) {
    try {
      const bug = await loadOwnedBug(req, res);
      if (!bug) return;
      if (bug.azure_status === 'creating') return fail(res, 409, 'Azure DevOps bug creation is in progress.');
      await CapturedBugModel.deleteById(bug.id);
      if (bug.screenshot_file) await deleteScreenshot(bug.session_id, bug.screenshot_file);
      return res.json({ success: true });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  }

  static async getScreenshot(req, res) {
    try {
      const bug = await loadOwnedBug(req, res);
      if (!bug) return;
      if (!bug.screenshot_file) return fail(res, 404, 'No screenshot was captured for this bug.');
      const buffer = await readScreenshot(bug.session_id, bug.screenshot_file);
      res.set('Content-Type', bug.screenshot_file.endsWith('.png') ? 'image/png' : 'image/jpeg');
      res.set('Cache-Control', 'private, no-store');
      return res.send(buffer);
    } catch (error) {
      if (error.code === 'ENOENT') return fail(res, 404, 'Screenshot file is missing.');
      return fail(res, 500, error.message);
    }
  }
}

module.exports = TestingSessionController;
