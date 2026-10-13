# Backend MVC Architecture Guidelines

Always structure the backend using the established **MVC (Model-View-Controller)** architecture pattern:

## Directory Structure Standard

```
src/
├── config/                      # Configurations & Connection setup (db.js, mongo.js)
├── models/                      # Data Models & DB Schemas (User.js, TestSuite.js, Bug.js)
├── middlewares/                 # Express Middlewares (authMiddleware.js)
├── controllers/                 # Business Logic & Endpoint Handlers (authController.js, testSuiteController.js, bugController.js, azureController.js)
├── routes/                      # API Express Routers (authRoutes.js, testSuiteRoutes.js, bugRoutes.js, azureRoutes.js, index.js)
├── services/                    # Integrations & Core AI/Azure Services
├── app.js                       # Express App middleware configuration
└── server.js                    # Web server HTTP listener entry point
```

## Core Rules

1. **Routes**: Keep routes light. Delegate all request handling to Controllers.
2. **Controllers**: Request & response formatting, validation, calling Models/Services.
3. **Models**: All database interactions (MongoDB & SQLite) encapsulated in static class methods.
4. **Middlewares**: Session verification and security checks.
5. **Config**: All database connection initializations and environment setup.
