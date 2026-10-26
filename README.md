# QA Test Case Generator 🚀

An AI-powered tool that integrates **Azure DevOps** with **any AI Model Provider** (OpenAI, Google Gemini, etc.) to automatically generate structured, comprehensive QA test suites (Functional, Negative, Edge Cases, Security, Boundary) from Azure DevOps Work Items (User Stories, Bugs, Features, Tasks).

---

## 📁 Directory Structure

```text
qa-testcase-generator/
│
├── src/
│   ├── index.js                  # Main CLI entry point
│   ├── azure/
│   │   └── azureClient.js        # Azure DevOps REST API integration
│   └── ai/
│       ├── testCaseGenerator.js  # Decoupled test case generator
│       └── providers/
│           ├── factory.js        # Dynamic AI Provider strategy resolver
│           ├── openaiProvider.js # OpenAI Provider strategy (GPT-4o, etc.)
│           ├── geminiProvider.js # Google Gemini Provider strategy (Gemini 2.5/1.5)
│           └── openrouterProvider.js # OpenRouter Provider strategy (Claude, Llama, etc.)
│
├── .env                          # Environment configuration
├── .gitignore                    # Git ignore file
├── package.json                  # Dependencies & scripts
└── README.md                     # Project documentation
```

---

## ⚙️ Setup & Prerequisites

### 1. Requirements
- Node.js (v16 or higher)
- Azure DevOps Personal Access Token (PAT) with **Work Items (Read)** scope
- API key for your chosen AI Provider (**OpenAI**, **Google Gemini**, or **OpenRouter**)

### 2. Multi-Model Configuration (`.env`)

You can switch AI models anytime by updating `AI_PROVIDER` and `AI_MODEL` in `.env`:

```env
# Azure DevOps Credentials
AZURE_DEVOPS_ORG=your_organization_name
AZURE_DEVOPS_PROJECT=your_project_name
AZURE_DEVOPS_PAT=your_personal_access_token

# Dynamic AI Provider selection ('openai', 'gemini', or 'openrouter')
AI_PROVIDER=openai
AI_MODEL=gpt-4o

# OpenAI Credentials
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o

# Google Gemini Credentials
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# OpenRouter Credentials
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_api_key
OPENROUTER_MODEL=meta-llama/llama-4-maverick
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Output Directory
OUTPUT_DIR=output
```

---

## 🔄 Switching Models Dynamically

### Switch to Gemini
Set in `.env`:
```env
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_gemini_key
```

### Switch to OpenAI
Set in `.env`:
```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=your_openai_key
```

### Switch to OpenRouter
Set in `.env`:
```env
AI_PROVIDER=openrouter
OPENROUTER_MODEL=meta-llama/llama-4-maverick
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key
```

### Programmatic Provider Override
You can also pass `provider` and `model` dynamically in code:
```javascript
const { generateTestCases } = require('./src/ai/testCaseGenerator');

const jsonResult = await generateTestCases(workItem, {
  provider: 'gemini',
  model: 'gemini-3.6-flash',
});
```

---

## 📋 JSON Output Schema

The tool generates test cases in pure JSON format adhering to the following structure:

```json
{
  "feature": "Schedule Feature",
  "platforms": ["Web", "Mobile"],
  "sections": [
    {
      "name": "Premium Access",
      "testCases": [
        "Verify user without premium subscription cannot access schedule feature"
      ]
    },
    {
      "name": "Schedule Popup",
      "testCases": [
        "Verify schedule popup opens when clicking schedule icon"
      ]
    }
  ]
}
```

---

## 🚀 Usage

### Generate Test Cases for an Azure DevOps Work Item

```bash
npm start <WORK_ITEM_ID>
```
*Example:*
```bash
npm start 4521
```

### Demo Mode

```bash
npm run demo
```

### Website Testing Sessions (Chrome extension)

Record a tester's session on a website, capture bugs with screenshots, generate reports with the AI bug generator, and create them as Azure DevOps Bugs in the chosen sprint. Setup, permissions and manual verification steps: [extension/README.md](extension/README.md).

### Swagger API Documentation

Interactive OpenAPI 3.0 API documentation is available via Swagger UI:
- **Interactive Swagger UI**: `http://localhost:3000/api-docs` (or `/docs`, `/api/docs`)
- **Raw OpenAPI JSON Spec**: `http://localhost:3000/api-docs.json` (or `/api/swagger.json`)

Supports test authentication with Bearer tokens (`qatk_...`) and session-scoped extension tokens (`X-Session-Token`).

### Tests

```bash
npm test   # node:test; runs all 33 unit and integration tests (Swagger, Redaction, Generator, Sessions)
```

---

## 🛠 Tech Stack

- **Node.js**
- **Axios** (Azure DevOps REST API)
- **OpenAI Node SDK** (`openai`)
- **OpenRouter** (OpenAI-compatible API gateway)
- **Google Gen AI SDK** (`@google/genai`)
- **dotenv**
