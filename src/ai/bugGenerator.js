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
  "description": "<1-2 short sentences, max 30 words: what is wrong and its user impact.>",
  "stepsToReproduce": "1. Open app...\\n2. Perform action...\\n3. Observe behavior...",
  "expectedResult": "<One short sentence of expected behavior.>",
  "actualResult": "<One short sentence of actual failure.>"
}

Keep the report brief. The description must stay under 30 words. stepsToReproduce must have at most 5 short steps (max 12 words each), and fewer when the bug title can be reproduced in fewer.`;

  const scriptText = storyContext.script ? `QA Test Script / Scenario: "${storyContext.script}"\n` : '';
  // Evidence recorded by the browser extension during a testing session (URL, page title, actions).
  const evidenceText = storyContext.recordedEvidence
    ? `\nRecorded Session Evidence:\n${storyContext.recordedEvidence}\n
Rules for stepsToReproduce:
1. Use BOTH the bug summary and the recorded actions above.
2. Read the bug summary first, then keep only the recorded actions that lead to that defect, in their original order. Remove everything unrelated to it (other pages, unrelated clicks, repeated actions, noise).
3. Write the kept steps in plain language a tester would say (e.g. "Log in with valid credentials"), one per line, numbered. Never mention tags, selectors, element ids or raw event names.
4. If no recorded action clearly relates to the bug summary, or the steps are still unclear, ignore the recorded actions and write the steps from the bug summary alone.
Never write "Not determinable" or ask the tester to confirm anything. Write every field from the bug summary when the evidence does not help.\n`
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
