const { getProvider } = require('./providers/factory');

/**
 * AI Bug Generator - Converts single-line bug summaries into detailed Bug Reports.
 */
async function generateBugReport(bugTitle, storyContext = {}, options = {}) {
  const provider = getProvider(options);

  const systemPrompt = `You are a Lead Senior QA Automation Engineer.
Your objective is to take a single-line bug summary and generate a comprehensive, structured Bug Report strictly as a valid JSON object.
Do NOT include markdown backticks (\`\`\`json) outside the JSON object.

The output JSON structure MUST match this exact format:
{
  "title": "<Bug Title>",
  "severity": "2 - High",
  "description": "<Detailed clear summary of the defect and impact on end users.>",
  "stepsToReproduce": "1. Open app...\\n2. Perform action...\\n3. Observe behavior...",
  "expectedResult": "<Clear description of expected behavior.>",
  "actualResult": "<Clear description of actual failure.>"
}`;

  const scriptText = storyContext.script ? `QA Test Script / Scenario: "${storyContext.script}"\n` : '';
  const userPrompt = `Bug Summary: "${bugTitle}"
${scriptText}Parent Story Context (if available):
Title: "${storyContext.title || 'General App Story'}"
Description: "${storyContext.description || 'N/A'}"

Generate the complete JSON bug report.`;

  const rawResult = await provider.generateCompletion({
    systemPrompt,
    userPrompt,
    model: options.model,
    temperature: 0.2,
  });

  return parseBugJson(rawResult, bugTitle);
}

function parseBugJson(text, defaultTitle) {
  let cleanStr = text || '';
  if (cleanStr.startsWith('```')) {
    cleanStr = cleanStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  try {
    const json = JSON.parse(cleanStr);
    return {
      title: json.title || defaultTitle,
      severity: json.severity || '3 - Medium',
      description: json.description || 'Defect reported.',
      stepsToReproduce: json.stepsToReproduce || '1. Observe behavior.',
      expectedResult: json.expectedResult || 'Expected behavior works.',
      actualResult: json.actualResult || 'Defect observed.',
    };
  } catch (e) {
    return {
      title: defaultTitle,
      severity: '3 - Medium',
      description: text,
      stepsToReproduce: '1. Observe behavior',
      expectedResult: 'Expected functionality works cleanly.',
      actualResult: 'Defect occurs.',
    };
  }
}

module.exports = {
  generateBugReport,
};
