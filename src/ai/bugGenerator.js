const { getProvider } = require('./providers/factory');

/**
 * Offline / Testing QA Template Bug Generator (0 AI tokens / 0 API calls).
 */
function generateTemplateBugReport(bugTitle, storyContext = {}) {
  const cleanTitle = (bugTitle || '').trim();
  const storyTitle = (storyContext && storyContext.title) ? storyContext.title : '';
  const contextNote = storyTitle ? ` in "${storyTitle}"` : '';

  // Infer severity from keyword clues
  let severity = '3 - Medium';
  const lower = cleanTitle.toLowerCase();
  if (lower.includes('crash') || lower.includes('fatal') || lower.includes('down') || lower.includes('freeze') || lower.includes('blocked') || lower.includes('security')) {
    severity = '1 - Critical';
  } else if (lower.includes('fail') || lower.includes('error') || lower.includes('cannot') || lower.includes('broken') || lower.includes('invalid') || lower.includes('not working')) {
    severity = '2 - High';
  } else if (lower.includes('typo') || lower.includes('align') || lower.includes('ui') || lower.includes('color') || lower.includes('spacing') || lower.includes('text')) {
    severity = '4 - Low';
  }

  const scriptContext = (storyContext && storyContext.script) ? `\nRelated Test Case: ${storyContext.script}` : '';

  // Testing-session bugs: use the recorded steps and do not invent an expected result.
  if (Array.isArray(storyContext.recordedSteps) && storyContext.recordedSteps.length > 0) {
    return {
      title: cleanTitle,
      severity,
      description: `Defect observed: ${cleanTitle}.\n${storyContext.description || ''}`.trim(),
      stepsToReproduce: storyContext.recordedSteps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      expectedResult: 'Not determinable from captured evidence - tester to confirm the expected behavior.',
      actualResult: cleanTitle,
      isTemplate: true,
    };
  }

  return {
    title: cleanTitle,
    severity,
    description: `Defect observed${contextNote}: ${cleanTitle}.${scriptContext}\nThis issue was identified during testing and prevents the feature from functioning as intended.`,
    stepsToReproduce: `1. Open the application and navigate to the relevant page/module${storyTitle ? ` (${storyTitle})` : ''}.\n2. Trigger the action or flow: "${cleanTitle}".\n3. Observe the system response and behavior.`,
    expectedResult: `The operation should succeed seamlessly without errors, unresponsiveness, or unexpected failures.`,
    actualResult: `Defect observed: ${cleanTitle}. Expected standard behavior was not achieved.`,
    isTemplate: true,
  };
}

/**
 * AI Bug Generator - Converts single-line bug summaries into detailed Bug Reports.
 */
async function generateBugReport(bugTitle, storyContext = {}, options = {}) {
  // If template mode or skip AI is requested (for rate-limit saving and testing)
  if (options.skipAi || options.isTemplate || options.mode === 'template') {
    return generateTemplateBugReport(bugTitle, storyContext);
  }

  const systemPrompt = `You are a Lead Senior QA Automation Engineer.
Your objective is to take a single-line bug summary and generate a comprehensive, structured Bug Report strictly as a valid JSON object.
Do NOT include markdown backticks (\`\`\`json) outside the JSON object.

The output JSON structure MUST match this exact format:
{
  "title": "<Bug Title>",
  "severity": "1 - Critical | 2 - High | 3 - Medium | 4 - Low",
  "description": "<Detailed clear summary of the defect and impact on end users.>",
  "stepsToReproduce": "1. Open app...\\n2. Perform action...\\n3. Observe behavior...",
  "expectedResult": "<Clear description of expected behavior.>",
  "actualResult": "<Clear description of actual failure.>"
}`;

  const scriptText = storyContext.script ? `QA Test Script / Scenario: "${storyContext.script}"\n` : '';
  // Evidence recorded by the browser extension during a testing session (URL, page title, actions).
  const evidenceText = storyContext.recordedEvidence
    ? `\nRecorded Session Evidence:\n${storyContext.recordedEvidence}\n
Rules for recorded evidence: build stepsToReproduce ONLY from the recorded actions above. Do not invent behavior.
Write stepsToReproduce in plain, human language a tester would say (e.g. "Log in with valid credentials", "Open the Settings page and click Save").
Merge related low-level actions (clicking a field, typing, submitting) into one meaningful step, drop noise such as repeated or irrelevant clicks, and never mention tags, selectors, element ids or raw event names.
Keep the order and number each step on its own line.
If the expected or actual result cannot be determined from the bug summary and evidence, write
"Not determinable from captured evidence - tester to confirm: <what information is missing>" for that field.\n`
    : '';
  const userPrompt = `Bug Summary: "${bugTitle}"
${scriptText}Parent Story Context (if available):
Title: "${storyContext.title || 'General App Story'}"
Description: "${storyContext.description || 'N/A'}"
${evidenceText}
Generate the complete JSON bug report.`;

  try {
    const provider = getProvider(options);
    const rawResult = await provider.generateCompletion({
      systemPrompt,
      userPrompt,
      model: options.model,
      temperature: 0.2,
    });

    return parseBugJson(rawResult, bugTitle);
  } catch (error) {
    const errMsg = (error?.message || '').toLowerCase();
    const isRateLimit =
      errMsg.includes('rate limit') ||
      errMsg.includes('429') ||
      errMsg.includes('quota') ||
      errMsg.includes('too many requests') ||
      errMsg.includes('resource_exhausted');

    if (isRateLimit) {
      console.warn('⚠️ [AI Bug Generator] AI rate limit encountered. Gracefully switching to offline QA template.');
      const template = generateTemplateBugReport(bugTitle, storyContext);
      template._rateLimitFallback = true;
      return template;
    }

    throw error;
  }
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
