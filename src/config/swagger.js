/**
 * OpenAPI 3.0.0 Specification & Swagger UI Configuration
 * QA Test Suite Generator & AI Bug Reporter Backend
 */

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'QA Test Suite Generator & Bug Reporter API',
    version: '1.0.0',
    description: `
### Overview
Comprehensive RESTful API for **QA Test Suite Generator & AI Bug Reporter Tool**.
This backend powers:
1. **Azure DevOps Work Item Integration** (User Stories, Bugs, Iterations, Sprints, Projects, Users).
2. **AI Test Suite Generation** (OpenAI, Gemini, Claude, OpenRouter) generating structured test cases with preconditions, test steps, and assertions.
3. **AI Bug Report Drafter & Publisher** (Structured bug reports published directly to Azure DevOps with rich markdown and public link embedding).
4. **Chrome Extension Exploratory Testing Sessions** (Event recording, screenshot capture, DOM action sanitation, token rotation, and Azure sync).
5. **Authentication & Session Tokens** (In-memory bearer access tokens, rotating refresh tokens, and session-scoped extension tokens).
6. **Public Read-Only Views** (Shareable links for test suites and bugs).

### Authentication
- **User Authentication**: Use the \`BearerAuth\` scheme with an access token (\`qatk_...\`) obtained from \`/api/auth/login\` or \`/api/auth/register\`.
- **Session Connect Authentication**: Chrome extension recording endpoints accept \`SessionTokenAuth\` via header \`X-Session-Token: <token>\` or standard \`BearerAuth\`.
    `,
    contact: {
      name: 'QA Test Suite Generator Team',
    },
    license: {
      name: 'ISC',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current Host (Root)',
    },
    {
      url: '/api',
      description: 'API v1 Base Endpoint',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User registration, login, token refresh, logout, and profile management',
    },
    {
      name: 'Azure DevOps',
      description: 'Azure DevOps projects, iterations, work items, team members, and runtime config',
    },
    {
      name: 'Test Suites',
      description: 'AI-driven test case generation from user stories, test suite history, and exportable scripts',
    },
    {
      name: 'AI Bug Reporter',
      description: 'AI-generated bug reports, publishing to Azure DevOps, and bug history',
    },
    {
      name: 'Testing Sessions',
      description: 'Live exploratory testing sessions, Chrome extension connect token, and event ingestion',
    },
    {
      name: 'Captured Bugs',
      description: 'Bugs captured during web testing sessions, AI enrichment, screenshot evidence, and Azure bug creation',
    },
    {
      name: 'Public Shared Views',
      description: 'Unauthenticated public read-only views for bugs and test suites',
    },
  ],
  paths: {
    // ------------------------------------------------------------------------
    // AUTHENTICATION
    // ------------------------------------------------------------------------
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user account',
        description: 'Creates a new user profile with hashed credentials and returns an active access token and refresh token.',
        operationId: 'registerUser',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RegisterRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthSuccessResponse',
                },
              },
            },
          },
          400: {
            description: 'Validation error (e.g. invalid email, user already exists)',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in with credentials',
        description: 'Authenticates a user via username/email and password, returning access and refresh tokens.',
        operationId: 'loginUser',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthSuccessResponse',
                },
              },
            },
          },
          400: {
            description: 'Missing username or password',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Rotates the refresh token and issues a new access token for seamless session continuation.',
        operationId: 'refreshToken',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: {
                    type: 'string',
                    example: 'qatk_rft_9f3b28ca1e74...',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Token rotated and renewed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthSuccessResponse',
                },
              },
            },
          },
          400: {
            description: 'Refresh token is missing',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          401: {
            description: 'Invalid or expired refresh token',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Log out current session',
        description: 'Revokes the active bearer access token and optionally revokes the refresh token.',
        operationId: 'logoutUser',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: {
                    type: 'string',
                    example: 'qatk_rft_9f3b28ca1e74...',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Logged out successfully.' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized: missing or invalid access token',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user profile',
        description: 'Returns the authenticated user details associated with the Bearer access token.',
        operationId: 'getCurrentUser',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/UserProfile' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/user/profile': {
      put: {
        tags: ['Authentication'],
        summary: 'Update user profile & Azure credentials',
        description: 'Updates user display name, email, and encrypted Azure DevOps Organization and Personal Access Token (PAT).',
        operationId: 'updateUserProfile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateProfileRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Profile updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/UserProfile' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },

    // ------------------------------------------------------------------------
    // AZURE DEVOPS
    // ------------------------------------------------------------------------
    '/api/config': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get workspace and AI configuration',
        description: 'Returns Azure DevOps connection status and active AI provider and model settings.',
        operationId: 'getWorkspaceConfig',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Configuration details',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/WorkspaceConfigResponse',
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/azure/projects': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'List Azure DevOps projects',
        description: 'Fetches all accessible Azure DevOps projects using the authenticated user’s credentials or environment PAT.',
        operationId: 'getAzureProjects',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of projects',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    projects: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AzureProject' },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          500: {
            description: 'Failed to communicate with Azure DevOps API',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/azure/work-items': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'List project work items',
        description: 'Retrieves active user stories, tasks, and bugs for the specified project.',
        operationId: 'getAzureWorkItems',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'project',
            in: 'query',
            required: true,
            description: 'Project name or ID',
            schema: { type: 'string', example: 'Fintech-Core' },
          },
        ],
        responses: {
          200: {
            description: 'List of work items',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    workItems: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AzureWorkItemSummary' },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Missing project parameter',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/azure/iterations': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'List project sprints / iterations',
        description: 'Fetches all sprint iterations configured for the specified Azure DevOps project.',
        operationId: 'getAzureIterations',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'project',
            in: 'query',
            required: true,
            description: 'Project name or ID',
            schema: { type: 'string', example: 'Fintech-Core' },
          },
        ],
        responses: {
          200: {
            description: 'List of iterations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    iterations: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AzureIteration' },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Project parameter required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/azure/users': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'List project team members',
        description: 'Retrieves assignable users and contributors for the specified Azure DevOps project.',
        operationId: 'getAzureUsers',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'project',
            in: 'query',
            required: true,
            description: 'Project name or ID',
            schema: { type: 'string', example: 'Fintech-Core' },
          },
        ],
        responses: {
          200: {
            description: 'List of project users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    users: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AzureUser' },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Project parameter required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/azure/work-item/{id}': {
      get: {
        tags: ['Azure DevOps'],
        summary: 'Get work item details by ID',
        description: 'Fetches detailed information for an Azure DevOps Work Item including Title, Description, Acceptance Criteria, State, and Iteration Path.',
        operationId: 'getAzureWorkItemById',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Azure DevOps Work Item ID',
            schema: { type: 'string', example: '1042' },
          },
        ],
        responses: {
          200: {
            description: 'Work item details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    workItem: { $ref: '#/components/schemas/AzureWorkItemDetail' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Work item not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Azure DevOps'],
        summary: 'Update work item details',
        description: 'Updates the title, description, or acceptance criteria of a work item in Azure DevOps.',
        operationId: 'updateAzureWorkItem',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Azure DevOps Work Item ID',
            schema: { type: 'string', example: '1042' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  project: { type: 'string', example: 'Fintech-Core' },
                  title: { type: 'string', example: 'User login with 2FA' },
                  description: { type: 'string', example: 'Updated description of user authentication story.' },
                  acceptanceCriteria: { type: 'string', example: '1. User receives 6-digit OTP.\n2. Expiry is 5 minutes.' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Work item updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    workItem: { $ref: '#/components/schemas/AzureWorkItemDetail' },
                  },
                },
              },
            },
          },
          500: {
            description: 'Update failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },

    // ------------------------------------------------------------------------
    // TEST SUITES
    // ------------------------------------------------------------------------
    '/api/generate': {
      post: {
        tags: ['Test Suites'],
        summary: 'Generate AI test cases for a User Story',
        description: 'Fetches the target Work Item from Azure DevOps (or applies in-memory overrides) and invokes the configured AI Provider to generate structured test cases organized by feature sections.',
        operationId: 'generateTestSuite',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/GenerateTestSuiteRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Test suite generated and saved',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GenerateTestSuiteResponse',
                },
              },
            },
          },
          400: {
            description: 'Work Item ID missing or contains empty description and acceptance criteria',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          500: {
            description: 'AI generation error or parsing error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/history': {
      get: {
        tags: ['Test Suites'],
        summary: 'List generated test suite history',
        description: 'Returns all saved test suites generated by the authenticated user with metadata including section count and total test cases.',
        operationId: 'getTestSuiteHistory',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of test suite history records',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    history: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TestSuiteHistoryItem' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/history/{id}': {
      get: {
        tags: ['Test Suites'],
        summary: 'Get test suite by unique suite ID or filename',
        description: 'Loads the full parsed test suite payload including all sections, test cases, and raw JSON string.',
        operationId: 'getTestSuiteById',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Unique test suite ID or saved file name',
            schema: { type: 'string', example: 'suite_1740000000000_abc12' },
          },
        ],
        responses: {
          200: {
            description: 'Parsed test suite data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/TestSuiteData' },
                    jsonString: { type: 'string' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Test suite record not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/scripts': {
      get: {
        tags: ['Test Suites'],
        summary: 'Get flattened test scripts for automation',
        description: 'Aggregates all individual test cases across user test suites into flattened, indexed automation scripts.',
        operationId: 'getTestScripts',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Flattened test scripts list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    scripts: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TestScriptItem' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ------------------------------------------------------------------------
    // AI BUG REPORTER
    // ------------------------------------------------------------------------
    '/api/bugs/generate': {
      post: {
        tags: ['AI Bug Reporter'],
        summary: 'Generate an AI bug report draft',
        description: 'Analyzes a brief bug title and optional user story context to draft steps to reproduce, expected vs actual results, and severity.',
        operationId: 'generateBugReport',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/GenerateBugDraftRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'AI Bug report draft generated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    bugReport: { $ref: '#/components/schemas/BugReportContent' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Missing bug title',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/bugs': {
      get: {
        tags: ['AI Bug Reporter'],
        summary: 'Get published bug history',
        description: 'Returns all bugs saved or published to Azure DevOps by the authenticated user.',
        operationId: 'getBugHistory',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of published bugs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    bugs: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SavedBugRecord' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/bugs/publish': {
      post: {
        tags: ['AI Bug Reporter'],
        summary: 'Publish bug to Azure DevOps & save to history',
        description: 'Creates a new Bug work item in Azure DevOps (with public view link embedded in description), links parent story if provided, and saves to MongoDB bug history.',
        operationId: 'publishBug',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PublishBugRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Bug published and saved',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PublishBugResponse',
                },
              },
            },
          },
          400: {
            description: 'Invalid bug report data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },

    // ------------------------------------------------------------------------
    // EXPLORATORY TESTING SESSIONS
    // ------------------------------------------------------------------------
    '/api/testing-sessions': {
      post: {
        tags: ['Testing Sessions'],
        summary: 'Create a new exploratory testing session',
        description: 'Initializes a live exploratory session for a given target website URL, project, and sprint. Returns a single-use session connect token for the Chrome extension.',
        operationId: 'createTestingSession',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateSessionRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Testing session created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateSessionResponse',
                },
              },
            },
          },
          400: {
            description: 'Validation error in target URL, project or sprint',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          502: {
            description: 'Failed to resolve project or iteration against Azure DevOps',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      get: {
        tags: ['Testing Sessions'],
        summary: 'List user testing sessions',
        description: 'Returns all exploratory testing sessions created by the authenticated user along with bug counts and live connection status.',
        operationId: 'listTestingSessions',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of testing sessions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    sessions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TestingSessionSummary' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/testing-sessions/{id}': {
      get: {
        tags: ['Testing Sessions'],
        summary: 'Get testing session by ID',
        description: 'Retrieves testing session details, duration, bug count, and extension connection status.',
        operationId: 'getTestingSessionById',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Testing session ID (e.g. ts_...)',
            schema: { type: 'string', example: 'ts_1740000000000_a1b2c3d4' },
          },
        ],
        responses: {
          200: {
            description: 'Session details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    session: { $ref: '#/components/schemas/TestingSessionSummary' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Session not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Testing Sessions'],
        summary: 'Delete testing session',
        description: 'Deletes the session, its recorded DOM events, captured bugs, and screenshot evidence files. Already published Azure DevOps bugs remain intact.',
        operationId: 'deleteTestingSession',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Testing session ID',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Session deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true } },
                },
              },
            },
          },
          404: {
            description: 'Session not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/testing-sessions/{id}/events': {
      get: {
        tags: ['Testing Sessions'],
        summary: 'Get recorded session events',
        description: 'Fetches chronological sanitized user interaction events (clicks, navigations, form submissions). Supports incremental polling via `afterSeq`.',
        operationId: 'getSessionEvents',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'afterSeq',
            in: 'query',
            description: 'Sequence number to fetch events strictly after (for incremental sync)',
            schema: { type: 'integer', default: 0 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Max events to return (max 500)',
            schema: { type: 'integer', default: 500 },
          },
        ],
        responses: {
          200: {
            description: 'List of recorded events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    events: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SessionEvent' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/testing-sessions/{id}/bugs': {
      get: {
        tags: ['Testing Sessions'],
        summary: 'List bugs captured in session',
        description: 'Returns all captured bugs registered in this testing session.',
        operationId: 'getSessionCapturedBugs',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'List of captured bugs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    bugs: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/CapturedBugDetail' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Testing Sessions'],
        summary: 'Capture a bug during testing session',
        description: 'Invoked by the Chrome extension or dashboard to register a new bug with page URL, title, recent actions, and optional base64 screenshot evidence.',
        operationId: 'captureSessionBug',
        security: [{ bearerAuth: [] }, { sessionTokenAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CaptureBugRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Bug already captured (idempotent duplicate)',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CaptureBugResponse',
                },
              },
            },
          },
          201: {
            description: 'Bug captured and stored',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CaptureBugResponse',
                },
              },
            },
          },
          400: {
            description: 'Invalid clientBugId or URL',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          409: {
            description: 'Testing session stopped',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/testing-sessions/{id}/connect-token': {
      post: {
        tags: ['Testing Sessions'],
        summary: 'Rotate session connect token',
        description: 'Issues a fresh connect token for the session so an extension can reconnect; invalidates previous tokens.',
        operationId: 'rotateSessionConnectToken',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Fresh token issued',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    connectToken: { type: 'string', example: 'd3f8a0...' },
                    session: { $ref: '#/components/schemas/TestingSessionSummary' },
                  },
                },
              },
            },
          },
          409: {
            description: 'Session already stopped',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/testing-sessions/{id}/connect': {
      post: {
        tags: ['Testing Sessions'],
        summary: 'Handshake / Heartbeat from Chrome Extension',
        description: 'Verifies the extension connection, marks the session as `recording`, and returns the last received event sequence number.',
        operationId: 'connectSession',
        security: [{ bearerAuth: [] }, { sessionTokenAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Connected successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    session: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        status: { type: 'string', example: 'recording' },
                        website_url: { type: 'string' },
                        last_seq: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid or missing connect token',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          409: {
            description: 'Session stopped',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/testing-sessions/{id}/events/batch': {
      post: {
        tags: ['Testing Sessions'],
        summary: 'Ingest user interaction events in batch',
        description: 'Receives and sanitizes up to 100 interaction events per batch. Automatically strips passwords, authentication tokens, and credit card numbers.',
        operationId: 'ingestSessionEvents',
        security: [{ bearerAuth: [] }, { sessionTokenAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['events'],
                properties: {
                  events: {
                    type: 'array',
                    maxItems: 100,
                    items: { $ref: '#/components/schemas/SessionEventInput' },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Batch processed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    accepted: { type: 'integer', example: 12 },
                    duplicates: { type: 'integer', example: 0 },
                    rejected: { type: 'integer', example: 0 },
                    lastSeq: { type: 'integer', example: 45 },
                  },
                },
              },
            },
          },
          400: {
            description: 'Batch validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          413: {
            description: 'Batch exceeds 100 events or session limit of 5000 reached',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/testing-sessions/{id}/stop': {
      post: {
        tags: ['Testing Sessions'],
        summary: 'Stop testing session',
        description: 'Transitions session state to `stopped`. Stops accepting new events and bug captures.',
        operationId: 'stopTestingSession',
        security: [{ bearerAuth: [] }, { sessionTokenAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Session stopped',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    session: { $ref: '#/components/schemas/TestingSessionSummary' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ------------------------------------------------------------------------
    // CAPTURED BUGS REVIEW & AZURE SYNC
    // ------------------------------------------------------------------------
    '/api/captured-bugs/{bugId}': {
      get: {
        tags: ['Captured Bugs'],
        summary: 'Get captured bug by ID',
        description: 'Retrieves captured bug metadata, AI report status, and Azure DevOps sync details.',
        operationId: 'getCapturedBugById',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'bugId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'cbug_1740000000000_abcd' },
          },
        ],
        responses: {
          200: {
            description: 'Captured bug details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    bug: { $ref: '#/components/schemas/CapturedBugDetail' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Bug not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Captured Bugs'],
        summary: 'Edit captured bug details / report',
        description: 'Updates bug title or structured report fields before sending to Azure DevOps. Blocked once already synced to Azure.',
        operationId: 'updateCapturedBug',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'bugId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Payment gateway timeout error' },
                  report: { $ref: '#/components/schemas/BugReportContent' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Bug updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    bug: { $ref: '#/components/schemas/CapturedBugDetail' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          409: {
            description: 'Bug is already synced or currently syncing to Azure DevOps',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Captured Bugs'],
        summary: 'Delete captured bug and screenshot',
        description: 'Removes the captured bug record and deletes the screenshot evidence file.',
        operationId: 'deleteCapturedBug',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'bugId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Bug deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true } },
                },
              },
            },
          },
          409: {
            description: 'Azure sync in progress',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/captured-bugs/{bugId}/screenshot': {
      get: {
        tags: ['Captured Bugs'],
        summary: 'Retrieve bug screenshot image',
        description: 'Streams the captured screenshot image binary (PNG/JPEG) directly from local evidence storage.',
        operationId: 'getCapturedBugScreenshot',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'bugId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Image binary stream',
            content: {
              'image/png': { schema: { type: 'string', format: 'binary' } },
              'image/jpeg': { schema: { type: 'string', format: 'binary' } },
            },
          },
          404: {
            description: 'Screenshot not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/captured-bugs/{bugId}/generate': {
      post: {
        tags: ['Captured Bugs'],
        summary: 'Enrich captured bug with AI Report generation',
        description: 'Uses the captured DOM actions, page context, and title to automatically generate reproduction steps, expected behavior, and severity.',
        operationId: 'generateReportForCapturedBug',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'bugId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  provider: { type: 'string', example: 'openai' },
                  model: { type: 'string', example: 'gpt-4o' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Report generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    bug: { $ref: '#/components/schemas/CapturedBugDetail' },
                    rateLimitFallback: { type: 'boolean', example: false },
                  },
                },
              },
            },
          },
          409: {
            description: 'Report generation already in progress or already created in Azure',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          502: {
            description: 'AI Provider error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/captured-bugs/{bugId}/create-azure-bug': {
      post: {
        tags: ['Captured Bugs'],
        summary: 'Publish captured bug to Azure DevOps',
        description: 'Uploads screenshot attachment, creates the Azure DevOps Bug work item with public view link, and records the new work item URL.',
        operationId: 'createAzureBugFromCapturedBug',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'bugId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Bug created in Azure DevOps',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    bug: { $ref: '#/components/schemas/CapturedBugDetail' },
                    message: { type: 'string', example: 'Bug #4512 created in Azure DevOps.' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Missing bug report or required title/description',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          409: {
            description: 'Already created or creation currently in progress',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          502: {
            description: 'Azure DevOps API error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },

    // ------------------------------------------------------------------------
    // PUBLIC READ-ONLY VIEWS
    // ------------------------------------------------------------------------
    '/bugs/public/{id}': {
      get: {
        tags: ['Public Shared Views'],
        summary: 'View public shared bug report (HTML)',
        description: 'Unauthenticated standalone read-only HTML page displaying the bug report, severity, steps to reproduce, and screenshots.',
        operationId: 'renderPublicBug',
        security: [],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Public bug report ID',
            schema: { type: 'string', example: 'bug_1740000000000_abc12' },
          },
        ],
        responses: {
          200: {
            description: 'HTML page content',
            content: {
              'text/html': {
                schema: { type: 'string' },
              },
            },
          },
          404: {
            description: 'Bug report not found',
            content: {
              'text/html': { schema: { type: 'string' } },
            },
          },
        },
      },
    },
    '/test-suites/public/{id}': {
      get: {
        tags: ['Public Shared Views'],
        summary: 'View public shared test suite (HTML)',
        description: 'Unauthenticated standalone read-only HTML page displaying the complete test case suite with categorized test steps.',
        operationId: 'renderPublicTestSuite',
        security: [],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Public test suite ID',
            schema: { type: 'string', example: 'suite_1740000000000_abc12' },
          },
        ],
        responses: {
          200: {
            description: 'HTML page content',
            content: {
              'text/html': {
                schema: { type: 'string' },
              },
            },
          },
          404: {
            description: 'Test suite not found',
            content: {
              'text/html': { schema: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
        description: 'Enter your session access token prefixed with `qatk_...`. Obtain from `/api/auth/login` or `/api/auth/register`.',
      },
      sessionTokenAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-session-token',
        description: 'Session connect token issued for the Chrome extension when creating or rotating a testing session token.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Validation error or resource not found.' },
          fields: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Field-specific error messages if applicable',
          },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'usr_1740000000000_a1b2c' },
          username: { type: 'string', example: 'priyansh' },
          email: { type: 'string', format: 'email', example: 'priyansh@example.com' },
          name: { type: 'string', example: 'Priyansh Patel' },
          role: { type: 'string', example: 'user' },
          azureOrg: { type: 'string', nullable: true, example: 'https://dev.azure.com/my-org' },
          azurePat: { type: 'string', nullable: true, example: '••••••••••••' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'priyansh@example.com' },
          password: { type: 'string', format: 'password', example: 'P@ssw0rd123!' },
          username: { type: 'string', example: 'priyansh' },
          name: { type: 'string', example: 'Priyansh Patel' },
          azureOrg: { type: 'string', example: 'https://dev.azure.com/my-org' },
          azurePat: { type: 'string', example: 'abcdefghijklmnopqrstuvwxyz0123456789' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'priyansh@example.com' },
          password: { type: 'string', format: 'password', example: 'P@ssw0rd123!' },
        },
      },
      AuthSuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          token: { type: 'string', example: 'qatk_4d89a2b7c6e1...' },
          refreshToken: { type: 'string', example: 'qatk_rft_9f3b28ca1e74...' },
          user: { $ref: '#/components/schemas/UserProfile' },
          expiresAt: { type: 'integer', example: 1740000900000 },
          refreshExpiresAt: { type: 'integer', example: 1740604800000 },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Priyansh Patel' },
          email: { type: 'string', format: 'email', example: 'priyansh@example.com' },
          azureOrg: { type: 'string', example: 'https://dev.azure.com/my-org' },
          azurePat: { type: 'string', example: 'abcdefghijklmnopqrstuvwxyz0123456789' },
        },
      },
      WorkspaceConfigResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          configured: { type: 'boolean', example: true },
          org: { type: 'string', example: 'Demo Workspace' },
          project: { type: 'string', example: 'Demo Project' },
          provider: { type: 'string', example: 'openai' },
          model: { type: 'string', example: 'gpt-4o' },
          aiProvider: { type: 'string', example: 'openai' },
          aiModel: { type: 'string', example: 'gpt-4o' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              hasCustomPat: { type: 'boolean' },
            },
          },
        },
      },
      AzureProject: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'b0a724b0-...' },
          name: { type: 'string', example: 'Fintech-Core' },
          description: { type: 'string', example: 'Main backend engineering project' },
          url: { type: 'string', example: 'https://dev.azure.com/org/_apis/projects/...' },
          state: { type: 'string', example: 'wellFormed' },
        },
      },
      AzureWorkItemSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1042 },
          title: { type: 'string', example: 'Implement biometric authorization' },
          type: { type: 'string', example: 'User Story' },
          state: { type: 'string', example: 'Active' },
          assignedTo: { type: 'string', example: 'Priyansh Patel' },
          iterationPath: { type: 'string', example: 'Fintech-Core\\Sprint 14' },
        },
      },
      AzureWorkItemDetail: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1042' },
          title: { type: 'string', example: 'Implement biometric authorization' },
          description: { type: 'string', example: 'Allow users to authenticate using FaceID and Fingerprint.' },
          acceptanceCriteria: { type: 'string', example: '1. Falls back to PIN after 3 failures.' },
          type: { type: 'string', example: 'User Story' },
          state: { type: 'string', example: 'Active' },
          iterationPath: { type: 'string', example: 'Fintech-Core\\Sprint 14' },
          assignedTo: { type: 'string', example: 'Priyansh Patel' },
        },
      },
      AzureIteration: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '4a6b...' },
          name: { type: 'string', example: 'Sprint 14' },
          path: { type: 'string', example: 'Fintech-Core\\Sprint 14' },
          startDate: { type: 'string', format: 'date-time' },
          finishDate: { type: 'string', format: 'date-time' },
        },
      },
      AzureUser: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'usr-928' },
          displayName: { type: 'string', example: 'Priyansh Patel' },
          uniqueName: { type: 'string', example: 'priyansh@org.com' },
          mailAddress: { type: 'string', example: 'priyansh@org.com' },
        },
      },
      GenerateTestSuiteRequest: {
        type: 'object',
        required: ['workItemId'],
        properties: {
          workItemId: { type: 'string', example: '1042' },
          provider: {
            type: 'string',
            enum: ['auto-detect', 'openai', 'gemini', 'claude', 'openrouter'],
            example: 'auto-detect',
          },
          model: { type: 'string', example: 'gpt-4o' },
          project: { type: 'string', example: 'Fintech-Core' },
          editedFields: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              acceptanceCriteria: { type: 'string' },
            },
          },
        },
      },
      TestCase: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'TC-01' },
          title: { type: 'string', example: 'Verify successful FaceID authentication' },
          type: { type: 'string', example: 'Positive' },
          priority: { type: 'string', example: 'P1 - High' },
          preconditions: { type: 'string', example: 'User has enrolled biometric credentials' },
          steps: {
            type: 'array',
            items: { type: 'string' },
            example: ['1. Open application', '2. Prompt FaceID dialog', '3. Authenticate with valid face'],
          },
          expectedResult: { type: 'string', example: 'User is authenticated and redirected to dashboard' },
        },
      },
      TestSuiteSection: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Functional Happy Path' },
          testCases: {
            type: 'array',
            items: { $ref: '#/components/schemas/TestCase' },
          },
        },
      },
      TestSuiteData: {
        type: 'object',
        properties: {
          feature: { type: 'string', example: 'Biometric Authentication' },
          sections: {
            type: 'array',
            items: { $ref: '#/components/schemas/TestSuiteSection' },
          },
        },
      },
      GenerateTestSuiteResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          suiteId: { type: 'string', example: 'suite_1740000000000_abc12' },
          workItem: { $ref: '#/components/schemas/AzureWorkItemDetail' },
          data: { $ref: '#/components/schemas/TestSuiteData' },
          jsonString: { type: 'string' },
          savedFile: { type: 'string', example: 'test-cases-1042.json' },
          publicLink: { type: 'string', example: 'http://localhost:3000/test-suites/public/suite_1740000000000_abc12' },
        },
      },
      TestSuiteHistoryItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'suite_1740000000000_abc12' },
          fileName: { type: 'string', example: 'test-cases-1042.json' },
          featureName: { type: 'string', example: 'Biometric Authentication' },
          sectionsCount: { type: 'integer', example: 3 },
          totalTestCases: { type: 'integer', example: 14 },
          publicLink: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TestScriptItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'suite_1740000000000_abc12_0' },
          suiteId: { type: 'string', example: 'suite_1740000000000_abc12' },
          workItemId: { type: 'string', example: '1042' },
          featureName: { type: 'string', example: 'Biometric Authentication' },
          sectionName: { type: 'string', example: 'Functional Happy Path' },
          title: { type: 'string', example: 'Verify successful FaceID authentication' },
          fullScriptText: { type: 'string', example: '[Functional Happy Path] Verify successful FaceID authentication' },
        },
      },
      GenerateBugDraftRequest: {
        type: 'object',
        required: ['bugTitle'],
        properties: {
          bugTitle: { type: 'string', example: 'Checkout button unresponsive when basket has discounts' },
          storyContext: {
            oneOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  acceptanceCriteria: { type: 'string' },
                },
              },
            ],
          },
          provider: { type: 'string', example: 'openai' },
          model: { type: 'string', example: 'gpt-4o' },
        },
      },
      BugReportContent: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'Checkout button unresponsive when discount coupon applied' },
          severity: {
            type: 'string',
            enum: ['1 - Critical', '2 - High', '3 - Medium', '4 - Low'],
            example: '2 - High',
          },
          description: { type: 'string', example: 'Clicking Proceed to Checkout does not trigger navigation when promo code is applied.' },
          stepsToReproduce: { type: 'string', example: '1. Add items to cart\n2. Apply promo SAVE20\n3. Click Checkout' },
          expectedResult: { type: 'string', example: 'User transitions to payment gateway' },
          actualResult: { type: 'string', example: 'Button spinner animates but no network request is sent' },
        },
      },
      SavedBugRecord: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'bug_1740000000000_xyz98' },
          user_id: { type: 'string' },
          work_item_id: { type: 'string', nullable: true },
          title: { type: 'string' },
          severity: { type: 'string' },
          description: { type: 'string' },
          steps_to_reproduce: { type: 'string' },
          expected_result: { type: 'string' },
          actual_result: { type: 'string' },
          azure_bug_id: { type: 'string', nullable: true, example: '4512' },
          azure_url: { type: 'string', nullable: true },
          public_link: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      PublishBugRequest: {
        type: 'object',
        required: ['bugReport'],
        properties: {
          bugReport: { $ref: '#/components/schemas/BugReportContent' },
          projectName: { type: 'string', example: 'Fintech-Core' },
          workItemId: { type: 'string', example: '1042' },
          parentWorkItemId: { type: 'string', example: '1042' },
          iterationPath: { type: 'string', example: 'Fintech-Core\\Sprint 14' },
          assignedTo: { type: 'string', example: 'priyansh@org.com' },
          mediaUrl: { type: 'string', example: 'https://storage.googleapis.com/evidence/video1.mp4' },
          attachment: {
            type: 'object',
            properties: {
              fileName: { type: 'string' },
              buffer: { type: 'string' },
            },
          },
        },
      },
      PublishBugResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          bugId: { type: 'string', example: 'bug_1740000000000_xyz98' },
          azureBug: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer', example: 4512 },
              url: { type: 'string', example: 'https://dev.azure.com/org/project/_workitems/edit/4512' },
            },
          },
          publicLink: { type: 'string', example: 'http://localhost:3000/bugs/public/bug_1740000000000_xyz98' },
          message: { type: 'string', example: 'Bug #4512 published to Azure DevOps!' },
        },
      },
      CreateSessionRequest: {
        type: 'object',
        required: ['websiteUrl'],
        properties: {
          websiteUrl: { type: 'string', example: 'https://staging.myapp.com' },
          projectId: { type: 'string', example: 'b0a724b0-...' },
          projectName: { type: 'string', example: 'Fintech-Core' },
          iterationId: { type: 'string', example: '4a6b...' },
          iterationPath: { type: 'string', example: 'Fintech-Core\\Sprint 14' },
        },
      },
      TestingSessionSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ts_1740000000000_a1b2c3d4' },
          user_id: { type: 'string' },
          website_url: { type: 'string', example: 'https://staging.myapp.com' },
          azure_project_id: { type: 'string' },
          azure_project_name: { type: 'string', example: 'Fintech-Core' },
          azure_iteration_id: { type: 'string' },
          azure_iteration_name: { type: 'string', example: 'Sprint 14' },
          azure_iteration_path: { type: 'string', example: 'Fintech-Core\\Sprint 14' },
          status: { type: 'string', enum: ['created', 'recording', 'stopped', 'failed'], example: 'recording' },
          token_expires_at: { type: 'string', format: 'date-time' },
          event_count: { type: 'integer', example: 42 },
          last_seq: { type: 'integer', example: 42 },
          extension_connected: { type: 'boolean', example: true },
          duration_ms: { type: 'integer', example: 125000 },
          bug_count: { type: 'integer', example: 2 },
          created_at: { type: 'string', format: 'date-time' },
          started_at: { type: 'string', format: 'date-time', nullable: true },
          ended_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      CreateSessionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          session: { $ref: '#/components/schemas/TestingSessionSummary' },
          connectToken: { type: 'string', example: 'a8f09c21e64b...' },
        },
      },
      SessionEventInput: {
        type: 'object',
        required: ['seq', 'type', 'timestamp', 'url'],
        properties: {
          seq: { type: 'integer', example: 1 },
          type: { type: 'string', enum: ['page_load', 'navigation', 'click', 'input', 'submit'], example: 'click' },
          timestamp: { type: 'string', format: 'date-time', example: '2026-10-26T17:00:00.000Z' },
          url: { type: 'string', example: 'https://staging.myapp.com/checkout' },
          title: { type: 'string', example: 'Checkout' },
          target: {
            type: 'object',
            properties: {
              tag: { type: 'string', example: 'button' },
              id: { type: 'string', example: 'pay-btn' },
              name: { type: 'string' },
              label: { type: 'string', example: 'Proceed to Payment' },
              type: { type: 'string', example: 'submit' },
              testId: { type: 'string', example: 'checkout-submit' },
            },
          },
        },
      },
      SessionEvent: {
        type: 'object',
        properties: {
          seq: { type: 'integer', example: 1 },
          type: { type: 'string', example: 'click' },
          timestamp: { type: 'string', format: 'date-time' },
          url: { type: 'string' },
          title: { type: 'string' },
          target: { type: 'object' },
        },
      },
      CaptureBugRequest: {
        type: 'object',
        required: ['clientBugId', 'url'],
        properties: {
          clientBugId: { type: 'string', example: 'bug-local-092' },
          title: { type: 'string', example: 'Checkout total calculation glitch' },
          url: { type: 'string', example: 'https://staging.myapp.com/checkout' },
          pageTitle: { type: 'string', example: 'Checkout Page' },
          capturedAt: { type: 'string', format: 'date-time' },
          screenshot: {
            type: 'string',
            description: 'Base64 encoded data URL or raw base64 PNG/JPEG image',
            example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          },
        },
      },
      CapturedBugDetail: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cbug_1740000000000_ef01' },
          session_id: { type: 'string', example: 'ts_1740000000000_a1b2c3d4' },
          client_bug_id: { type: 'string', example: 'bug-local-092' },
          title: { type: 'string', example: 'Checkout total calculation glitch' },
          page_url: { type: 'string', example: 'https://staging.myapp.com/checkout' },
          page_title: { type: 'string', example: 'Checkout Page' },
          captured_at: { type: 'string', format: 'date-time' },
          screenshot_file: { type: 'string', nullable: true, example: 'screenshot.png' },
          report: { $ref: '#/components/schemas/BugReportContent', nullable: true },
          report_status: {
            type: 'string',
            enum: ['not_generated', 'generating', 'generated', 'failed'],
            example: 'generated',
          },
          report_source: { type: 'string', enum: ['ai', 'template'], nullable: true },
          report_error: { type: 'string', nullable: true },
          azure_status: {
            type: 'string',
            enum: ['not_created', 'creating', 'created', 'failed'],
            example: 'created',
          },
          azure_work_item_id: { type: 'string', nullable: true, example: '4512' },
          azure_url: { type: 'string', nullable: true },
          public_link: { type: 'string', nullable: true },
        },
      },
      CaptureBugResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          bug: { $ref: '#/components/schemas/CapturedBugDetail' },
          duplicate: { type: 'boolean', example: false },
        },
      },
    },
  },
};

const swaggerUiOptions = {
  customSiteTitle: 'QA Test Suite Generator - Swagger API Docs',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    docExpansion: 'list',
    tagsSorter: 'alpha',
  },
};

module.exports = {
  swaggerSpec,
  swaggerUiOptions,
};
