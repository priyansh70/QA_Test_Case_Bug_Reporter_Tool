const { getProvider } = require("./providers/factory");

/**
 * Cleans markdown code block wrapping from JSON output if present and validates standard JSON format.
 * @param {string} rawContent 
 * @returns {string} Formatted JSON string
 */
function parseAndFormatJson(rawContent) {
  if (!rawContent) return rawContent;
  let cleaned = rawContent.trim();

  // Strip markdown ```json ... ``` or ``` ... ``` wrapper if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  try {
    const parsedObj = JSON.parse(cleaned);
    return JSON.stringify(parsedObj, null, 2);
  } catch (error) {
    return cleaned;
  }
}

/**
 * Generates comprehensive QA test cases in JSON format using configured AI provider.
 *
 * @param {Object} workItem - The work item details fetched from Azure DevOps.
 * @param {Object} [options] - Optional settings (provider, model, temperature, etc.).
 * @returns {Promise<string>} Valid JSON formatted test cases documentation.
 */
async function generateTestCases(workItem, options = {}) {
  const provider = getProvider(options);

  const systemPrompt = `You are a Senior QA Engineer.
Your objective is to generate test cases strictly as a valid JSON object.
Do NOT include any surrounding markdown blocks (e.g. \`\`\`json), conversational preamble, or extra text outside the JSON object.

The output JSON structure MUST match this exact format:
{
  "feature": "<Feature Name>",
  "sections": [
    {
      "name": "<Individual Component Name>",
      "testCases": [
        "<Single line test scenario string>",
        "<Single line test scenario string>"
      ]
    }
  ]
}

Strict requirements:
1. "feature": Name of the feature being tested (e.g. "${workItem.title}").
2. "sections": Array of section objects representing individual components of the feature (e.g. UI components, validation rules, functional features, edit/delete actions, edge cases, security, boundary, negative cases).
3. "testCases": Array containing ONLY single-line test scenario strings and NOTHING else (no step-by-step lists, no bullet points, no extra keys/objects).
4. Generate a COMPREHENSIVE test suite with as many sections and as many test cases per section as possible — cover the feature exhaustively without any fixed minimums or limits.
5. Vary scenarios across every category that applies: Functional (positive), Negative & Validation, Edge & Boundary, Security & Permissions, UI/UX, Performance, and Data Persistence.
6. Ensure thorough, exhaustive QA coverage without duplicate test cases.`;

  const userPrompt = `Please generate QA Test Cases in the requested JSON format for the following Azure DevOps Work Item:

Work Item ID: #${workItem.id}
Work Item Type: ${workItem.type}
Title: ${workItem.title}
State: ${workItem.state}

Description:
${workItem.description || "No description provided."}

Acceptance Criteria:
${workItem.acceptanceCriteria || "No acceptance criteria provided."}

Generate the JSON object now.`;

  const rawResult = await provider.generateCompletion({
    systemPrompt,
    userPrompt,
    model: options.model,
    temperature: options.temperature || 0.3,
  });

  return parseAndFormatJson(rawResult);
}

module.exports = {
  generateTestCases,
  parseAndFormatJson,
};
