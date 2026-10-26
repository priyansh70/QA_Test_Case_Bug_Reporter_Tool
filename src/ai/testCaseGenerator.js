const { getProvider } = require("./providers/factory");

/**
 * Safely parses and repairs JSON from AI providers. If generation stopped prematurely
 * (e.g. reaching max token limits), it backtracks through incomplete lines and closes
 * opened arrays and objects so all completed test cases and sections are salvaged.
 *
 * @param {string} rawContent
 * @returns {Object|null} Parsed object with feature and sections, or null if unparseable
 */
function repairAndParseJson(rawContent) {
  if (!rawContent || typeof rawContent !== "string") return null;
  let cleaned = rawContent.trim();

  // Strip markdown ```json ... ``` wrapper if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // 1. Direct parse attempt
  try {
    const parsedObj = JSON.parse(cleaned);
    if (parsedObj && typeof parsedObj === "object") {
      return parsedObj;
    }
  } catch (_) {
    // Truncated or malformed - proceed to structural recovery
  }

  // 2. Structural recovery by backtracking line by line
  const lines = cleaned.split("\n");
  for (let i = lines.length; i >= 1; i--) {
    let candidate = lines.slice(0, i).join("\n").trim();
    candidate = candidate.replace(/,\s*$/, ""); // strip trailing comma

    let inString = false;
    let escape = false;
    const stack = [];

    for (let j = 0; j < candidate.length; j++) {
      const c = candidate[j];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (c === "{") stack.push("}");
        else if (c === "[") stack.push("]");
        else if (c === "}" || c === "]") {
          if (stack.length > 0 && stack[stack.length - 1] === c) {
            stack.pop();
          }
        }
      }
    }

    if (inString) {
      // Line ended inside an open string literal, keep backtracking
      continue;
    }

    if (stack.length > 0) {
      const closingSuffix = stack.reverse().join("");
      try {
        const parsed = JSON.parse(candidate + closingSuffix);
        if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          return parsed;
        }
      } catch (_) {
        // Continue backtracking
      }
    }
  }

  return null;
}

/**
 * Cleans markdown code block wrapping from JSON output if present and validates standard JSON format.
 * @param {string} rawContent 
 * @returns {string} Formatted JSON string
 */
function parseAndFormatJson(rawContent) {
  if (!rawContent) return rawContent;
  const repaired = repairAndParseJson(rawContent);
  if (repaired) {
    return JSON.stringify(repaired, null, 2);
  }

  let cleaned = rawContent.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return cleaned;
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

  const systemPrompt = `You are an elite Principal QA Automation & Test Lead.
Your objective is to generate test cases strictly as a valid, high-density JSON object.
Do NOT include markdown fences (e.g. \`\`\`json), conversational preamble, or text outside the JSON object.

The output JSON structure MUST match this exact format:
{
  "feature": "<Feature Name>",
  "sections": [
    {
      "name": "<Individual Component or Functional Area>",
      "testCases": [
        "<High-density single line scenario>",
        "<High-density single line scenario>"
      ]
    }
  ]
}

STRICT HIGH-DENSITY EFFICIENCY RULES (MAXIMUM COVERAGE, MINIMUM TOKEN WASTE):
1. Format: Single-line string per scenario. No nested lists, steps, or markdown bullets.
2. High-Density Phrasing: Keep each test scenario between 8 and 18 words. Directly state [Action / Condition] -> [Expected Result].
3. Eliminate Verbose Padding:
   - NEVER use wordy filler like "Verify that the user is able to successfully..." or "Verify that upon clicking the button...".
   - Instead write directly: "Verify <action> <outcome>" or "<Action> validates/blocks/triggers <outcome>".
   - Avoid repeating the section or feature name in every test scenario.
4. Comprehensive Coverage: Exhaustively cover Functional (positive), Negative & Validation, Edge & Boundary, Security & Gating, Performance, and Persistence.
5. Concrete Style Contrast:
   - VERBOSE (AVOID): "Verify that when a user creates an Auto Reply message with only whitespace in the Message field, the system prevents saving and displays an error message."
   - HIGH-DENSITY (PREFER): "Verify empty or whitespace Message field is blocked with a validation error on save."
   - VERBOSE (AVOID): "Verify that a user whose premium subscription has lapsed cannot access the Auto Reply settings page and is redirected to the upgrade page."
   - HIGH-DENSITY (PREFER): "Verify expired premium user is blocked from settings and redirected to upgrade."
6. Output Formatting: Output compact JSON without redundant whitespace or blank lines. Ensure all JSON arrays and braces close cleanly within limits.`;

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
    max_tokens: options.max_tokens || 8192,
  });

  return parseAndFormatJson(rawResult);
}

module.exports = {
  generateTestCases,
  parseAndFormatJson,
  repairAndParseJson,
};
