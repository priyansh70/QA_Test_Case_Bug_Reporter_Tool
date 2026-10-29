# 📖 QA Test Case Generator & Bug Platform — The Complete Guide

Welcome to the **QA Test Case Generator & Bug Reporter** repository!

This document explains **everything** about this project in plain, simple terms. Whether you are a developer, a QA engineer, or a project manager, this guide will help you understand:
1. **What this project is and what problem it solves.**
2. **How all the parts fit together.**
3. **Every single file in this codebase — why it exists, and what work it does.**

---

## 📑 Table of Contents

- [1. The Big Picture: What is this project?](#1-the-big-picture-what-is-this-project)
- [2. How It Works (The 3 Main Workflows)](#2-how-it-works-the-3-main-workflows)
- [3. Architecture: The 4 Big Pillars](#3-architecture-the-4-big-pillars)
- [4. File-by-File Guide (Why Every File Exists)](#4-file-by-file-guide-why-every-file-exists)
  - [4.1 Root Project Files](#41-root-project-files)
  - [4.2 Backend Core (`src/`)](#42-backend-core-src)
  - [4.3 Backend Configuration (`src/config/`)](#43-backend-configuration-srcconfig)
  - [4.4 Backend AI Engine (`src/ai/`)](#44-backend-ai-engine-srcai)
  - [4.5 Backend Azure DevOps Integration (`src/azure/`)](#45-backend-azure-devops-integration-srcazure)
  - [4.6 Backend Middlewares (`src/middlewares/`)](#46-backend-middlewares-srcmiddlewares)
  - [4.7 Backend Models / Database Access (`src/models/`)](#47-backend-models--database-access-srcmodels)
  - [4.8 Backend Controllers (`src/controllers/`)](#48-backend-controllers-srccontrollers)
  - [4.9 Backend API Routes (`src/routes/`)](#49-backend-api-routes-srcroutes)
  - [4.10 Backend Utilities (`src/utils/`)](#410-backend-utilities-srcutils)
  - [4.11 Chrome Extension (`extension/`)](#411-chrome-extension-extension)
  - [4.12 Legacy Frontend (`public/`)](#412-legacy-frontend-public)
  - [4.13 Modern React Frontend (`client/`)](#413-modern-react-frontend-client)
  - [4.14 Automated Tests (`tests/`)](#414-automated-tests-tests)
  - [4.15 Storage & Output Folders (`data/`, `output/`)](#415-storage--output-folders-data-output)
- [5. Summary Cheat Sheet](#5-summary-cheat-sheet)

---

## 1. The Big Picture: What is this project?

In software development:
1. Business analysts write **User Stories** or requirements in **Azure DevOps** (e.g., *"As a customer, I want to reset my password using OTP so that I can regain access if forgotten"*).
2. Quality Assurance (QA) testers have to manually read these stories, think up dozens of test scenarios (positive tests, negative tests, edge cases, boundary checks, and security tests), write them into spreadsheets, and manually test them.
3. When testers find a bug, they have to write down exact reproduction steps, take screenshots, capture console logs, and manually create a Bug Work Item in Azure DevOps.

**This project automates that entire process using Artificial Intelligence:**
- It pulls User Stories directly from **Azure DevOps**.
- It asks AI models (like **Google Gemini**, **OpenAI GPT-4o**, or **Anthropic Claude**) to automatically write comprehensive, structured test suites in seconds.
- It provides a built-in **Chrome Extension** that records tester clicks, network requests, console errors, and screenshots during live testing.
- If a bug is found, it uses AI to turn a one-sentence thought (e.g., *"Reset button stays disabled after entering correct OTP"*) into a full, professional bug report, complete with screenshots, and **automatically uploads it to Azure DevOps with 1 click**.

---

## 2. How It Works (The 3 Main Workflows)

```
[Azure DevOps User Story]
         │
         ▼
 1. AI Test Suite Generator ──► Generates 5 categories of tests (Functional, Negative, Edge, Boundary, Security)
         │
         ▼
 2. Live Exploratory Testing ──► Chrome Extension records clicks, errors & screenshots
         │
         ▼
 3. 1-Click AI Bug Reporter  ──► AI writes formal bug report & publishes directly to Azure DevOps
```

1. **Test Generation Workflow:** 
   Enter an Azure DevOps Work Item ID (e.g. `42516`) ➔ The system fetches the story title, description, and acceptance criteria ➔ AI creates structured test cases ➔ The tester can review, filter, and export them (JSON, Markdown, Excel, CSV, PDF).
2. **Exploratory Testing Session Workflow:**
   Tester starts a "Testing Session" ➔ The Chrome extension silently captures user actions, console errors, and network issues ➔ Sensitive info (passwords, tokens) is scrubbed automatically.
3. **Bug Reporting Workflow:**
   Tester clicks "Report Bug" from a failed test or live session ➔ AI generates reproduction steps, expected vs. actual results, and severity ➔ Direct 1-click publish to Azure DevOps.

---

## 3. Architecture: The 4 Big Pillars

The system is split into four clear sections:

| Pillar | Tech Stack | Role |
| :--- | :--- | :--- |
| **Backend** | Node.js, Express 5, MongoDB | Follows **MVC (Model-View-Controller)** pattern. Runs REST APIs, talks to Azure DevOps and AI models, manages authentication and data persistence. |
| **Frontend** | React 19, Tailwind CSS v4, Vite | Rich dark/light UI where users log in, manage test suites, trigger AI generation, and view testing sessions. |
| **Chrome Extension** | Chrome Manifest V3, JavaScript | Browser recorder tool that captures screenshots, DOM events, and logs during QA testing. |
| **Database** | MongoDB | Stores registered users, encrypted Azure credentials, saved test suites, bugs, and testing sessions. |

---

## 4. File-by-File Guide (Why Every File Exists)

Below is an exhaustive breakdown of every file in the project.

---

### 4.1 Root Project Files

These files sit at the top-level directory and configure the overall project.

- **`package.json`**
  - **Why it exists:** The master configuration file for the Node.js backend.
  - **What it does:** Lists backend dependencies (like `express`, `mongodb`, `openai`, `@google/genai`, `@anthropic-ai/sdk`), defines scripts (`npm start`, `npm run dev`, `npm test`), and project metadata.
- **`package-lock.json`**
  - **Why it exists:** Automatically created by npm.
  - **What it does:** Freezes the exact versions of all installed packages so everyone on the team runs identical code.
- **`.env`**
  - **Why it exists:** Secret configuration file for local environment settings.
  - **What it does:** Stores API keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`), database connection string (`MONGODB_URI`), JWT secrets, and default Azure DevOps credentials.
- **`.gitignore`**
  - **Why it exists:** Tells Git which files should **never** be saved to version control.
  - **What it does:** Ignores sensitive passwords (`.env`), heavy dependency folders (`node_modules/`), test artifacts, and build folders.
- **`README.md`**
  - **Why it exists:** The initial documentation file for developers visiting the repository on GitHub.
  - **What it does:** Gives a quick introduction, installation steps, and environment variable examples.
- **`AGENTS.md`**
  - **Why it exists:** Project rules and coding standards for AI coding assistants.
  - **What it does:** Mandates the **MVC pattern** for the backend, **React 19 + Tailwind CSS** for the frontend, and forbids writing vanilla JavaScript in `public/`.
- **`CLAUDE.md`**
  - **Why it exists:** A cheat-sheet for AI agents and developers.
  - **What it does:** Lists common command lines, folder structures, and key architectural guidelines for fast reference.
- **`APPLICATION_FUNCTIONALITY.md`**
  - **Why it exists:** A comprehensive architectural and functional specification document.
  - **What it does:** Details security practices, cryptographic hashing, session token rotation, and end-to-end workflows.
- **`.agents/rules/backend_mvc_structure.md`**
  - **Why it exists:** AI assistant rule file.
  - **What it does:** Enforces strict adherence to backend directory conventions (`src/controllers/`, `src/models/`, `src/routes/`, `src/middlewares/`).
- **`.agents/rules/frontend_react_tailwind.md`**
  - **Why it exists:** AI assistant rule file.
  - **What it does:** Enforces modern React 19 standards, Tailwind styling, and reusable component patterns in `client/`.
- **`.claude/settings.local.json`**
  - **Why it exists:** Local tooling configuration for editor settings and permissions.

---

### 4.2 Backend Core (`src/`)

These files initialize and boot the backend server.

- **`src/server.js`**
  - **Why it exists:** The main server launcher (HTTP listener entry point).
  - **What it does:** Connects to MongoDB via `initDatabase()` and starts the Express server listening on port 3000 (or `PORT` in `.env`).
- **`src/app.js`**
  - **Why it exists:** The central Express application setup.
  - **What it does:** Configures CORS, sets body size limits (e.g. for base64 screenshot uploads), registers Swagger docs (`/api-docs`), mounts all API routes under `/api`, handles errors, and serves the frontend React app.
- **`src/index.js`**
  - **Why it exists:** A standalone Command-Line Interface (CLI) runner.
  - **What it does:** Allows running the generator from a terminal without opening a browser (e.g. `node src/index.js 42516`). It fetches the work item, asks AI for tests, and writes files directly to the `output/` folder.
- **`src/auth.js`**
  - **Why it exists:** A backward-compatibility bridge.
  - **What it does:** Re-exports authentication functions from `src/controllers/authController.js` and `src/middlewares/authMiddleware.js` so older scripts don't break.
- **`src/db.js`**
  - **Why it exists:** A backward-compatibility bridge for database operations.
  - **What it does:** Re-exports database helper methods from `src/config/db.js` and models.
- **`src/mongo.js`**
  - **Why it exists:** A backward-compatibility bridge for MongoDB connections.
  - **What it does:** Points directly to `src/config/mongo.js`.

---

### 4.3 Backend Configuration (`src/config/`)

- **`src/config/mongo.js`**
  - **Why it exists:** The single source of truth for MongoDB database connectivity.
  - **What it does:** Uses the official MongoDB driver to connect to the database, creates automatic indexes (for unique usernames, emails, and session lookups), and exports collection accessors.
- **`src/config/db.js`**
  - **Why it exists:** A high-level database initialization wrapper.
  - **What it does:** Calls `connectMongo()` on startup and logs status.
- **`src/config/swagger.js`**
  - **Why it exists:** API documentation generator configuration.
  - **What it does:** Builds an OpenAPI 3.0 specification covering all endpoints, authentication headers, request bodies, and provides an interactive UI at `http://localhost:3000/api-docs`.

---

### 4.4 Backend AI Engine (`src/ai/`)

This directory is the "brain" that speaks with AI models to generate tests and bugs.

- **`src/ai/testCaseGenerator.js`**
  - **Why it exists:** Generates test cases from user stories.
  - **What it does:** Takes Azure Work Item data, crafts a specialized QA prompt instructing the AI to create 5 distinct categories:
    1. *Functional Tests (Happy paths)*
    2. *Negative Tests (Invalid inputs / error cases)*
    3. *Edge Cases (Extreme conditions)*
    4. *Security Tests (Authorization, SQLi, XSS)*
    5. *Boundary Tests (Min/Max values)*
    It also cleans and repairs AI JSON responses if the AI output contains formatting quirks.
- **`src/ai/bugGenerator.js`**
  - **Why it exists:** Generates structured bug reports.
  - **What it does:** Takes a raw user title (e.g., *"Cannot upload image"*) and the related user story, and prompts the AI to write a professional bug report containing:
    - Clear Summary
    - Step-by-Step Reproduction Steps
    - Expected Behavior vs. Actual Behavior
    - Severity and Priority rating
    - Suggested Workaround
- **`src/ai/providers/factory.js`**
  - **Why it exists:** The AI Provider Factory (Design Pattern: Strategy Factory).
  - **What it does:** Checks which provider you selected (`gemini`, `openai`, `claude`, or `openrouter`) and instantiates the matching provider class. This allows swapping models on the fly without changing business code.
- **`src/ai/providers/geminiProvider.js`**
  - **Why it exists:** Connector for Google Gemini models.
  - **What it does:** Communicates with Google's official `@google/genai` SDK to run models like `gemini-2.5-flash` or `gemini-1.5-pro`.
- **`src/ai/providers/openaiProvider.js`**
  - **Why it exists:** Connector for OpenAI models.
  - **What it does:** Uses OpenAI's SDK to generate responses using models like `gpt-4o` or `gpt-4o-mini`.
- **`src/ai/providers/claudeProvider.js`**
  - **Why it exists:** Connector for Anthropic Claude models.
  - **What it does:** Uses `@anthropic-ai/sdk` to run models like `claude-3-5-sonnet`.
- **`src/ai/providers/openrouterProvider.js`**
  - **Why it exists:** Connector for OpenRouter.
  - **What it does:** Allows using third-party or open-source models (such as Meta Llama or Mistral) through the OpenRouter gateway.
- **`src/ai/providers/errorFormatter.js`**
  - **Why it exists:** Clean error translator for AI calls.
  - **What it does:** Catches messy errors from AI APIs (e.g. rate limits, quota exceeded, invalid API keys) and turns them into friendly messages that tell the user what went wrong and how to fix it.

---

### 4.5 Backend Azure DevOps Integration (`src/azure/`)

- **`src/azure/azureClient.js`**
  - **Why it exists:** The bridge between your app and Azure DevOps.
  - **What it does:**
    - Connects to the Azure DevOps REST API using your Organization, Project, and Personal Access Token (PAT).
    - Fetches User Stories, Features, and Bugs by ID (stripping HTML formatting so AI can read it cleanly).
    - Fetches project teams, iterations, and team members (for assigning bugs).
    - Automatically creates **Bug Work Items** directly inside your Azure DevOps board and attaches screenshots/evidence.

---

### 4.6 Backend Middlewares (`src/middlewares/`)

Middlewares are checkpoint guards that run before request handlers.

- **`src/middlewares/authMiddleware.js`**
  - **Why it exists:** Protects private API endpoints.
  - **What it does:** Checks incoming HTTP requests for a valid `Authorization: Bearer <JWT>` header. If valid, attaches user information (`req.user`) to the request; if invalid or expired, blocks the request with a `401 Unauthorized` status.
- **`src/middlewares/sessionAuthMiddleware.js`**
  - **Why it exists:** Authentication specifically tailored for the Chrome Extension and live testing sessions.
  - **What it does:** Validates either a regular JWT token or a temporary testing session token so the Chrome extension can securely upload recorded events and screenshots.

---

### 4.7 Backend Models / Database Access (`src/models/`)

These files interact directly with MongoDB collections.

- **`src/models/User.js`**
  - **Why it exists:** Manages user data in the `users` collection.
  - **What it does:** Handles user registration, queries by username or email, profile updates, and saves encrypted Azure DevOps credentials.
- **`src/models/TestSuite.js`**
  - **Why it exists:** Manages test suites in the `test_suites` collection.
  - **What it does:** Saves newly generated AI test suites, retrieves past generation history for the logged-in user, and supports deleting or retrieving individual suites.
- **`src/models/Bug.js`**
  - **Why it exists:** Manages reported bugs in the `bugs` collection.
  - **What it does:** Saves bug drafts generated by AI, records their published Azure DevOps work item ID and URL, and supports public read-only link lookups.
- **`src/models/TestingSession.js`**
  - **Why it exists:** Manages exploratory testing sessions in the `testing_sessions` collection.
  - **What it does:** Tracks session status (`active`, `completed`), start/end times, tester notes, target URLs, and counters for captured bugs.
- **`src/models/CapturedBug.js`**
  - **Why it exists:** Manages bugs captured during live testing sessions in `captured_bugs`.
  - **What it does:** Stores bug titles, notes, filenames of captured screenshots, console errors, user click trails, and network failures.

---

### 4.8 Backend Controllers (`src/controllers/`)

Controllers hold the core business logic. They receive HTTP requests, process data, call services/models, and return JSON responses.

- **`src/controllers/authController.js`**
  - **Why it exists:** Manages user authentication and account settings.
  - **What it does:** Handles sign-up (`register`), sign-in (`login`), JWT token refresh (`refresh`), sign-out (`logout`), and updating personal Azure DevOps credentials (`updateProfile`).
- **`src/controllers/testSuiteController.js`**
  - **Why it exists:** Coordinates test suite creation and management.
  - **What it does:** Takes a work item ID, calls Azure + AI generator, saves the result to MongoDB, provides generation history, script extraction, and renders public shareable HTML test suite links.
- **`src/controllers/bugController.js`**
  - **Why it exists:** Coordinates bug creation and Azure publication.
  - **What it does:** Calls AI to structure bug reports, uploads bug work items with screenshots to Azure DevOps, tracks bug history, and renders public shareable HTML bug pages.
- **`src/controllers/azureController.js`**
  - **Why it exists:** Exposes Azure DevOps lookup features to the frontend.
  - **What it does:** Validates Azure connections, fetches work item previews, and returns lists of team members and iterations.
- **`src/controllers/testingSessionController.js`**
  - **Why it exists:** Manages live exploratory sessions and evidence.
  - **What it does:** Starts and finishes testing sessions, receives base64 screenshot uploads from the Chrome extension, saves images to disk, and records captured bugs.

---

### 4.9 Backend API Routes (`src/routes/`)

Routes map URL paths to specific controller methods.

- **`src/routes/index.js`**
  - **Why it exists:** The master route aggregator.
  - **What it does:** Glues all sub-routers together under the `/api` prefix:
    - `/api/auth` ➔ `authRoutes`
    - `/api/test-suites` ➔ `testSuiteRoutes`
    - `/api/bugs` ➔ `bugRoutes`
    - `/api/azure` ➔ `azureRoutes`
    - `/api/testing-sessions` ➔ `testingSessionRoutes`
    - `/api/swagger` ➔ `swaggerRoutes`
- **`src/routes/authRoutes.js`**
  - **Why it exists:** Defines endpoints for `/api/auth/*` (`/register`, `/login`, `/refresh`, `/logout`, `/profile`).
- **`src/routes/testSuiteRoutes.js`**
  - **Why it exists:** Defines endpoints for `/api/test-suites/*` (`/generate`, `/history`, `/:id`, `/scripts`).
- **`src/routes/bugRoutes.js`**
  - **Why it exists:** Defines endpoints for `/api/bugs/*` (`/generate`, `/publish`, `/history`).
- **`src/routes/azureRoutes.js`**
  - **Why it exists:** Defines endpoints for `/api/azure/*` (`/work-item/:id`, `/check-connection`, `/iterations`, `/assignees`).
- **`src/routes/testingSessionRoutes.js`**
  - **Why it exists:** Defines endpoints for `/api/testing-sessions/*` and captured bugs (`/start`, `/:id/finish`, `/:id/bugs`, `/evidence/:sessionId/:fileName`).
- **`src/routes/swaggerRoutes.js`**
  - **Why it exists:** Serves the raw OpenAPI/Swagger JSON specification.

---

### 4.10 Backend Utilities (`src/utils/`)

- **`src/utils/cryptoUtils.js`**
  - **Why it exists:** Security and encryption utility.
  - **What it does:** Uses **AES-256-GCM** encryption to protect sensitive Azure Personal Access Tokens (PATs) before saving them to MongoDB, ensuring plain-text tokens are never stored in the database.
- **`src/utils/evidenceStore.js`**
  - **Why it exists:** Storage manager for testing evidence files.
  - **What it does:** Validates that incoming screenshots are genuine PNG or JPEG images under 5 MB, prevents directory-traversal attacks, and safely saves them into `data/evidence/<sessionId>/`.

---

### 4.11 Chrome Extension (`extension/`)

A dedicated Chrome Extension (Manifest V3) that QA testers load into their browser during exploratory testing.

- **`extension/manifest.json`**
  - **Why it exists:** The configuration file that Chrome requires for all extensions.
  - **What it does:** Declares permissions (activeTab, storage, scripting), background service worker, and popup icons.
- **`extension/background.js`**
  - **Why it exists:** The extension's background service worker.
  - **What it does:** Runs quietly behind the scenes, captures screenshots of the active browser tab via `chrome.tabs.captureVisibleTab`, and relays messages between the web app and extension.
- **`extension/recorder.js`**
  - **Why it exists:** Injected browser activity recorder.
  - **What it does:** Injects into tested web pages to record tester clicks, keystrokes, console errors (`console.error`), and failed network requests.
- **`extension/redact.js`**
  - **Why it exists:** Privacy and security scrubber.
  - **What it does:** Automatically detects and masks sensitive data (passwords, credit card numbers, auth tokens, emails) so confidential user data is never recorded or sent to the server.
- **`extension/bridge.js`**
  - **Why it exists:** Communication bridge.
  - **What it does:** Allows the React web app dashboard to detect whether the Chrome extension is installed and communicate with it.
- **`extension/popup.html`**
  - **Why it exists:** The mini window that pops up when clicking the extension icon in Chrome's toolbar.
- **`extension/popup.js`**
  - **Why it exists:** Interactive logic for the extension popup (shows session status, allows starting/stopping a session, and triggers quick bug captures).
- **`extension/README.md`**
  - **Why it exists:** Step-by-step instructions for installing and running the extension in Chrome Developer Mode.

---

### 4.12 Legacy Frontend (`public/`)

These three files represent the **Phase 1 vanilla JavaScript frontend** before the application was rebuilt with React 19:

- **`public/index.html`**
  - **Why it exists:** Legacy single-page HTML interface. Kept in Express as an emergency fallback if the React app isn't built.
- **`public/app.js`**
  - **Why it exists:** Legacy client-side JavaScript that directly manipulated HTML DOM elements.
- **`public/style.css`**
  - **Why it exists:** Legacy stylesheet styling the Phase 1 UI.

---

### 4.13 Modern React Frontend (`client/`)

This is the **active, production frontend** built with **React 19**, **Tailwind CSS v4**, and **Vite**.

#### Configuration & Root Files:
- **`client/package.json` & `package-lock.json`**
  - **Why it exists:** Manifest for the frontend application.
  - **What it does:** Lists frontend dependencies (`react`, `react-dom`, `tailwindcss`, `lucide-react`, `framer-motion`) and build scripts (`npm run dev`, `npm run build`).
- **`client/vite.config.js`**
  - **Why it exists:** Vite build tool configuration.
  - **What it does:** Sets up lightning-fast local development, hot reloading, and proxies `/api` calls to the backend on port 3000.
- **`client/.oxlintrc.json`**
  - **Why it exists:** Linter configuration for Oxlint (high-performance JavaScript/React linter).
- **`client/index.html`**
  - **Why it exists:** The true HTML entry point for the modern React application where `<div id="root"></div>` lives.
- **`client/README.md`**
  - **Why it exists:** Frontend documentation and instructions for Vite commands.
- **`client/public/favicon.svg` & `client/public/icons.svg`**
  - **Why they exist:** Visual website branding icons shown in browser tabs.

#### Core React Entry (`client/src/`):
- **`client/src/main.jsx`**
  - **Why it exists:** JavaScript entry point.
  - **What it does:** Renders the root `<App />` component into the DOM inside `ThemeContext` and `AuthContext` providers.
- **`client/src/App.jsx`**
  - **Why it exists:** The main visual orchestrator of the entire frontend.
  - **What it does:** Manages which views are shown (Login screen vs. Dashboard vs. Testing Session view), controls slide-out drawers, and holds top-level state.
- **`client/src/App.css` & `client/src/index.css`**
  - **Why they exist:** Global styles and Tailwind CSS imports.
  - **What they do:** Sets up dark mode palettes, glassmorphism card styling, scrollbars, and animations.
- **`client/src/assets/hero.png`, `react.svg`, `vite.svg`**
  - **Why they exist:** Static graphic assets and logos used across dashboard banners.

#### Contexts (`client/src/context/`):
- **`client/src/context/AuthContext.jsx`**
  - **Why it exists:** Global authentication state provider.
  - **What it does:** Stores the logged-in user, handles login, logout, profile updates, and automatically manages token refresh in the background.
- **`client/src/context/ThemeContext.jsx`**
  - **Why it exists:** Visual theme provider.
  - **What it does:** Toggles between Dark Mode and Light Mode, and saves the user's preference in browser `localStorage`.

#### Services & Custom Hooks (`client/src/services/` & `client/src/hooks/`):
- **`client/src/services/api.js`**
  - **Why it exists:** Centralized HTTP request client (Axios).
  - **What it does:** Sends requests to the backend, automatically attaches JWT Bearer tokens, and intercepts `401 Unauthorized` responses to seamlessly refresh tokens without interrupting the user.
- **`client/src/services/apiError.js`**
  - **Why it exists:** Error extraction helper.
  - **What it does:** Parses backend error responses and returns clear, human-readable error messages for UI alerts.
- **`client/src/services/tokenManager.js`**
  - **Why it exists:** Client token storage.
  - **What it does:** Securely stores and retrieves JWT access and refresh tokens in memory and local storage.
- **`client/src/hooks/useToast.js`**
  - **Why it exists:** Custom React hook for alerts.
  - **What it does:** Provides easy methods (`showSuccess`, `showError`, `showWarning`, `showInfo`) to trigger animated toast popup messages.
- **`client/src/hooks/useSuiteExport.js`**
  - **Why it exists:** Custom React hook for exporting test suites.
  - **What it does:** Coordinates downloading test suites into various file formats or copying them to clipboard.
- **`client/src/hooks/useRecorderExtension.js`**
  - **Why it exists:** Custom React hook for the Chrome extension.
  - **What it does:** Detects if the Chrome recorder extension is installed, checks connection status, and sends start/stop commands.
- **`client/src/utils/exportSuite.js`**
  - **Why it exists:** Data conversion utility.
  - **What it does:** Formats a test suite object into Markdown, CSV, JSON, or pretty-printed plain text.

#### Modular UI Components (`client/src/components/`):
- **`Header.jsx`**: The top navigation bar showing the app title, active Azure connection indicator, theme toggle (sun/moon), testing session buttons, and user profile avatar.
- **`Sidebar.jsx`**: The left-hand panel where testers type the Azure Work Item ID, choose their AI provider (Gemini, OpenAI, Claude) and model, and click "Generate Test Suite".
- **`Dashboard.jsx`**: The primary workspace. Displays test suite statistics, section tabs, test cards, filters, and action buttons.
- **`DashboardStates.jsx`**: Placeholder screens for empty states (no test suite yet), loading spinners, and error screens.
- **`FeatureBanner.jsx`**: A card at the top of the dashboard displaying the current Azure story title, ID, state badge, and quick preview of acceptance criteria.
- **`SectionCard.jsx`**: An accordion card representing a category of test cases (e.g. "Functional", "Security"). Expands to reveal individual test case steps, preconditions, and expected results.
- **`Toolbar.jsx`**: Quick-action bar containing buttons to copy test cases, open export menus, launch the bug reporter, and toggle view modes.
- **`JsonViewer.jsx`**: A code-viewer popup allowing developers to view or copy the raw AI-generated JSON.
- **`AuthView.jsx`**: Clean login and registration screen with input validation and animations.
- **`HistoryDrawer.jsx`**: A slide-out right drawer listing previously generated test suites so testers can reopen past work.
- **`BugReporterModal.jsx`**: An AI bug creation modal. Testers enter a short summary; AI writes the full reproduction steps, and allows publishing directly to Azure DevOps.
- **`BugHistoryDrawer.jsx`**: A slide-out right drawer showing all bugs created by the user, their publication status, and direct Azure links.
- **`ProfileModal.jsx`**: A settings dialog where users enter and save their personal Azure DevOps Organization URL, Project Name, and Personal Access Token (PAT).
- **`ReviewUserStoryModal.jsx`**: A preview popup allowing testers to review or edit the fetched Azure story text before sending it to the AI.
- **`SearchableSelect.jsx`**: An intelligent dropdown selector with a built-in search filter (used for selecting Azure projects, iterations, and team members).
- **`SessionDashboard.jsx`**: Full-screen view for managing a live exploratory testing session. Shows recorded user actions, screenshot galleries, and captured bugs.
- **`TestingSessionsModal.jsx`**: A dialog to view past testing sessions or start a new exploratory session.
- **`CapturedBugPanel.jsx`**: Detail inspector for bugs captured during live sessions. Displays the screenshot, console error logs, network trace, and reproduction trail.
- **`ConfirmModal.jsx`**: A reusable confirmation dialog (e.g. *"Are you sure you want to delete this test suite?"*).
- **`Toast.jsx`**: Animated pop-up alert cards (green for success, red for error, yellow for warning).

---

### 4.14 Automated Tests (`tests/`)

These test files use Node's built-in test runner (`npm test`) to ensure code quality and prevent bugs.

- **`tests/jwtAuth.test.js`**
  - **Why it exists:** Verifies that token creation, validation, expiration, and refresh token rotation work securely.
- **`tests/redact.test.js`**
  - **Why it exists:** Verifies that the sensitive data scrubber in `extension/redact.js` accurately hides passwords, credit card numbers, and tokens.
- **`tests/swagger.test.js`**
  - **Why it exists:** Validates that the OpenAPI/Swagger documentation schema is properly formed and has no broken endpoints.
- **`tests/testCaseGenerator.test.js`**
  - **Why it exists:** Tests the AI prompt builder and validates that the JSON repair logic can fix broken or improperly closed JSON returned by LLMs.
- **`tests/testingSessions.test.js`**
  - **Why it exists:** Tests the entire exploratory testing workflow (starting a session, uploading screenshots, capturing bugs, and completing sessions).

---

### 4.15 Storage & Output Folders (`data/`, `output/`)

- **`data/evidence/`**
  - **Why it exists:** On-disk storage for screenshots and images uploaded during testing sessions. Images are saved inside subfolders named after their session ID.
- **`output/`**
  - **Why it exists:** Folder where the standalone CLI tool (`src/index.js`) saves generated JSON and Markdown test suite files.

---

## 5. Summary Cheat Sheet

| I want to... | Look at these files: |
| :--- | :--- |
| **Change how AI prompts are structured** | [`src/ai/testCaseGenerator.js`](src/ai/testCaseGenerator.js) & [`src/ai/bugGenerator.js`](src/ai/bugGenerator.js) |
| **Add a new AI provider (e.g., DeepSeek, Grok)** | [`src/ai/providers/factory.js`](src/ai/providers/factory.js) & create a new provider in `src/ai/providers/` |
| **Change how Azure DevOps work items are fetched or published** | [`src/azure/azureClient.js`](src/azure/azureClient.js) |
| **Modify API routes or add a new backend endpoint** | [`src/routes/`](src/routes/) & [`src/controllers/`](src/controllers/) |
| **Update database schemas or queries** | [`src/models/`](src/models/) |
| **Change the React UI or add new pages** | [`client/src/components/`](client/src/components/) & [`client/src/App.jsx`](client/src/App.jsx) |
| **Modify the Chrome Extension recording logic** | [`extension/recorder.js`](extension/recorder.js) & [`extension/background.js`](extension/background.js) |
| **Check or run automated tests** | Run `npm test` to execute test files in [`tests/`](tests/) |

