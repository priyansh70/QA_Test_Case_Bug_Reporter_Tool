# Repository Guidelines & Architecture

## Backend Architecture Standard: MVC Pattern

The backend of this application strictly follows **MVC (Model-View-Controller)** architecture:

- **`src/config/`**: Database connections (`mongo.js`, `db.js`) and environment settings.
- **`src/models/`**: Data Access Objects / Models (`User.js`, `TestSuite.js`, `Bug.js`).
- **`src/middlewares/`**: Express Middlewares (`authMiddleware.js`).
- **`src/controllers/`**: Request Handlers & Business Logic (`authController.js`, `testSuiteController.js`, `bugController.js`, `azureController.js`).
- **`src/routes/`**: Express Router endpoints (`authRoutes.js`, `testSuiteRoutes.js`, `bugRoutes.js`, `azureRoutes.js`, `index.js`).
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

