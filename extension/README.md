# QA Session Recorder (Chrome extension)

Records a website testing session for the QA platform, adds a floating **Report Bug** button to the website under test, and sends events and screenshot evidence to the Express backend.

## How it fits together

1. In the web app, the tester opens **Testing Sessions → New Session** and picks a website URL, an Azure DevOps project and a sprint (loaded live from Azure).
2. The backend validates the URL, resolves the project and sprint against Azure, creates the session, and returns a one-time **connect token**. The token is scoped to that one session.
3. The React app passes the session ID and token to the extension through `bridge.js`. `bridge.js` runs only on the platform origin.
4. The extension opens the website in a new tab and connects to the backend (`POST /api/testing-sessions/:id/connect`). The dashboard shows "Recording" only after the backend has received this heartbeat.
5. `recorder.js` is injected **only into that tab** and only while it is on the session's host (or a subdomain of it). It records page loads, SPA navigations, clicks, field changes and form submits.
6. **Report Bug** hides the overlay and captures the visible tab as a JPEG. It then posts the URL, page title and timestamp. The server attaches the last 20 recorded actions to the bug.
7. In the dashboard, the tester reviews each bug, edits the title, clicks **Generate Bug Report** (existing AI generator), edits the report, and clicks **Create Bug in Azure DevOps**. The existing Azure client creates the Bug in the session's sprint, with the screenshot attached.
8. **Stop session**, in the dashboard or the extension popup, ends recording. After that, the backend rejects new events and bugs for the session.

## Install (unpacked)

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this `extension/` folder.
3. Start a session from the web app. The first time, click the extension icon and choose **Grant website access & start recording**. Chrome then asks once for the optional site access permission.
4. Reload any web-app tab that was open before you installed the extension.

### Platform origin

`manifest.json → content_scripts[0].matches` lists the origins where the web app runs. The defaults are `http://localhost:3000/*` (Express) and `http://localhost:5173/*` (Vite dev server). To deploy elsewhere, add your production origin there and reload the extension. The service worker accepts connect requests only from these origins. It uses the sender's origin as the API base URL.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Keeps the active session in `chrome.storage.session`. That storage is in memory only, and content scripts cannot read it. |
| `scripting` | Injects the recorder into the session tab only. Nothing is declared for all sites. |
| `alarms` | Sends a heartbeat every 30 seconds. The heartbeat also detects a stopped session and retries queued events. |
| `<all_urls>` (optional, requested at runtime) | Required by `chrome.tabs.captureVisibleTab` for the floating Report Bug button, and to inject the recorder into the tester's chosen site. Granted once from the popup. |

## Privacy and security

- Typed values are never read. Field changes record only the field's label, name or id.
- Fields are masked as `[sensitive field]` when they are password or hidden fields, have `cc-*` or `one-time-code` autocomplete, or have a name or label that looks like a password, token, card, CVV, OTP or PIN. Elements inside `[data-qa-mask]` or `[data-private]` are masked too.
- URLs lose any `user:pass@` part. Query values with sensitive names (token, code, session, key, …) or secret-looking values (JWTs, long tokens, card numbers) become `[REDACTED]`, as do `#key=value` fragments.
- Element labels have emails, long digit runs and token-like strings masked.
- The same rules (`redact.js`) run in the extension and again on the server.
- The extension holds only the session-scoped connect token. It never holds the user's login token or an Azure PAT. Azure calls happen on the server.
- Screenshots are stored under `data/evidence/<sessionId>/` (or `EVIDENCE_DIR`). They are served only to the session owner, through `GET /api/captured-bugs/:bugId/screenshot`.

Known limits:

- Visible link and button text is recorded after redaction. A name shown in a button label, for example, is not detectable.
- A screenshot captures whatever is visible on screen.

## Reliability

- Events get a per-session sequence number. They are sent in batches of up to 50, one batch at a time, and leave the queue only after the server has persisted them. On reconnect, numbering resumes from the server's `last_seq`.
- Retries reuse the same sequence numbers and bug `clientBugId`. Unique indexes make retries idempotent.
- The extension queues up to 1,000 events while offline. The server caps a session at 5,000 events, 100 per batch, and 5 MB per screenshot.
- To reconnect after a tab is closed or the browser restarts, click **Reconnect extension** in the dashboard. This issues a fresh token and invalidates the old one.

## Environment variables

There are no new required variables. The feature reuses `MONGO_URL` and `MONGO_DB_NAME`, the Azure DevOps credentials (user profile, or the `AZURE_DEVOPS_*` fallback) and the AI provider settings. `EVIDENCE_DIR` optionally overrides the screenshot directory.

## Manual verification

1. Run `npm run web` (backend), and either use the built client on `http://localhost:3000` or run `npm run dev` inside `client/`.
2. Load the extension, log in, and open **Testing Sessions → New Session**. The project and sprint dropdowns fill from Azure. "SMS Plus" and the current sprint are preselected when they exist.
3. Click **Start Session**. A new tab opens on the website, and the dashboard changes from "Not recording yet" to "Recording - extension connected".
4. Click around the site, type into a password field, and navigate. The timeline shows the actions, and the password field appears as `[sensitive field]`.
5. Click **🐞 Report Bug**, enter a title and capture the bug. A toast confirms it, and the bug appears in the dashboard with a screenshot.
6. Open the bug, click **Generate Bug Report**, edit the report, and click **Create Bug in Azure DevOps**. The Azure work item link appears. Clicking create again is refused.
7. Click **Stop session**. The website's Report Bug button disappears, and the extension popup shows "Session stopped".
