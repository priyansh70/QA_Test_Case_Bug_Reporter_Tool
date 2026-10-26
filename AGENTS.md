# Repository Guidelines & Architecture

## Backend Architecture Standard: MVC Pattern

The backend of this application strictly follows **MVC (Model-View-Controller)** architecture:

- **`src/config/`**: Database connections (`mongo.js`, `db.js`), OpenAPI/Swagger configuration (`swagger.js`), and environment settings.
- **`src/models/`**: Data Access Objects / Models (`User.js`, `TestSuite.js`, `Bug.js`, `TestingSession.js`, `CapturedBug.js`).
- **`src/middlewares/`**: Express Middlewares (`authMiddleware.js`, `sessionAuthMiddleware.js`).
- **`src/controllers/`**: Request Handlers & Business Logic (`authController.js`, `testSuiteController.js`, `bugController.js`, `azureController.js`, `testingSessionController.js`).
- **`src/routes/`**: Express Router endpoints (`authRoutes.js`, `testSuiteRoutes.js`, `bugRoutes.js`, `azureRoutes.js`, `testingSessionRoutes.js`, `swaggerRoutes.js`, `index.js`).
- **`extension/`**: Chrome MV3 session recorder (see `extension/README.md`); `redact.js` is shared with the backend.
- **`tests/`**: `node:test` suites (`npm test`, requires MongoDB).
- **`src/app.js`**: Express App initialization and middleware pipeline.
- **`src/server.js`**: Web server HTTP listener entry point.

Always maintain this structure for any new endpoints, database entities, or backend features.

## Frontend Architecture Standard: React & Tailwind CSS

The frontend strictly uses **React 19**, **Tailwind CSS**, and modern component architecture in `client/src/`:

- **`client/src/components/`**: Modular, reusable UI components styled exclusively with Tailwind CSS (using rich dark themes, glassmorphism, Lucide React icons, and Framer Motion).
- **`client/src/services/`**: API service layer (`api.js`) encapsulating all HTTP requests to backend endpoints.
- **`client/src/context/`**: React context providers (`AuthContext.jsx`).
- **`client/src/hooks/`**: Custom reusable React hooks (`useToast.js`).

Never write raw vanilla JavaScript DOM manipulation or plain CSS in `public/`. Always maintain and build the React + Tailwind application in `client/`.

