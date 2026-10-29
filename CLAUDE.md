# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

AI-powered QA platform: pulls Azure DevOps work items, generates test suites and bug reports via a pluggable LLM provider (OpenAI / Gemini / OpenRouter), and publishes bugs back to Azure DevOps. Includes a Chrome MV3 extension that records tester sessions and captures bugs with screenshots. See `AGENTS.md` and `.agents/rules/` for the binding architecture rules; `APPLICATION_FUNCTIONALITY.md` for the full feature description.

## Commands

Backend (repo root, CommonJS, Express 5):

```bash
npm run dev            # nodemon src/server.js — web server on PORT (default 3000)
npm run web            # node src/server.js
npm start <WORK_ITEM_ID>   # CLI: src/index.js — fetch work item, generate test cases to OUTPUT_DIR
npm test               # node:test, all tests/**/*.test.js, serial; requires MongoDB at MONGO_URL
node --test tests/redact.test.js                      # single file
node --test --test-name-pattern="<regex>" tests/testingSessions.test.js   # single test
```

`npm run demo` is mentioned in README but does not exist in `package.json`.

Frontend (`client/`, React 19 + Vite + Tailwind v4):

```bash
cd client && npm run dev     # Vite on 5173, proxies /api -> http://localhost:3000
cd client && npm run build   # outputs client/dist, which Express serves
cd client && npm run lint    # oxlint
```

Extension: load `extension/` unpacked in `chrome://extensions`. No build step.

## Architecture

**Backend MVC** (`src/`): `routes/` (thin, all mounted under `/api` via `routes/index.js`) → `controllers/` (validation, response shaping) → `models/` (static class methods wrapping a MongoDB collection via `getCollection()` from `config/db.js`). Keep new features in this structure.

- `src/server.js` calls `initDatabase()` then listens. `src/app.js` wires middleware: per-path JSON body limits (`/api/testing-sessions` 8mb, `/api/captured-bugs` 1mb, else 50mb), public unauthenticated pages `/bugs/public/:id` and `/test-suites/public/:id` (server-rendered by controllers), `/api` 404 JSON handler, generic error handler, then static `client/dist` (falls back to `public/`) with SPA fallback.
- `src/db.js`, `src/mongo.js`, `src/auth.js` at the `src/` root are backwards-compat re-export shims. Put real code in `config/`, `models/`, `controllers/`, `middlewares/`.
- Storage is MongoDB only (SQLite was removed). Env: `MONGO_URL` (default `mongodb://localhost:27017`), `MONGO_DB_NAME`.

**Auth**: `middlewares/authMiddleware.js` issues signed JWT access (15 min) and refresh (7 days, rotated; used/logged-out `jti`s kept in an in-memory Map) tokens, secrets from `JWT_SECRET` / `JWT_REFRESH_SECRET` (random per boot if unset, so restarts log everyone out). Tokens never contain the Azure PAT: `requireAuth`/`resolveUser` re-load the user (incl. Azure org/PAT) from MongoDB per request. The client schedules a refresh ~1 min before the JWT `exp` (`AuthContext.jsx`, `tokenManager.js`). `sessionAuthMiddleware.requireSessionAccess` accepts either the owner's Bearer token or the extension's session-scoped connect token (`X-Session-Token`, stored as SHA-256 hash), setting `req.sessionActor` to `'owner'` or `'extension'`.

**AI layer** (`src/ai/`): `providers/factory.js` `getProvider({provider, model})` resolves a provider from options → `AI_PROVIDER`/`AI_MODEL` → model-name prefix (`gemini*`, contains `/` = openrouter, `gpt*`/`o1`/`o3`) → whichever API key is set. `testCaseGenerator.js` and `bugGenerator.js` build prompts and call the provider; output is JSON (`{feature, platforms, sections[{name, testCases[]}]}` for test suites).

**Azure** (`src/azure/azureClient.js`): Azure DevOps REST via axios. Credentials come from the user profile (`customConfig`), falling back to `AZURE_DEVOPS_ORG` / `AZURE_DEVOPS_PROJECT` / `AZURE_DEVOPS_PAT`.

**Testing sessions + extension** (flow detailed in `extension/README.md`): web app creates a session (URL + Azure project + sprint) and gets a one-time connect token → `extension/bridge.js` (runs only on platform origins listed in `manifest.json`) hands it to the service worker → `recorder.js` injected only into the session tab records events, Report Bug captures a screenshot → backend stores events (per-session `seq`, unique indexes make retries idempotent) and `CapturedBug`s; screenshots go to `data/evidence/<sessionId>/` (`EVIDENCE_DIR` overrides) via `utils/evidenceStore.js`. `extension/redact.js` is shared: the controller `require`s it from `../../extension/redact` to re-redact on the server, so keep it dependency-free CommonJS-compatible.

**Frontend** (`client/src/`): all HTTP goes through `services/api.js` (`authFetch` handles token refresh). Auth state in `context/AuthContext.jsx`. `hooks/useRecorderExtension.js` talks to the extension bridge. Components use Tailwind only (dark theme, glassmorphism, Lucide icons, Framer Motion). Do not add vanilla DOM scripts or plain CSS to `public/`.

## Tests

`tests/testingSessions.test.js` is an HTTP integration test: sets `MONGO_DB_NAME` to a throwaway `qa_test_sessions_<pid>` DB and a temp `EVIDENCE_DIR` before requiring the app, mints tokens with `createSession`, and stubs `azureClient` / `bugGenerator` functions by reassigning module exports. Follow the same stubbing approach for new tests (call through the module object, not destructured imports, in code that must be stubbable).
