/**
 * Formats raw AI provider errors (e.g. Gemini 429 JSON dumps, OpenAI quota dumps)
 * into clean, user-friendly natural language messages.
 */
function formatAiError(error, defaultProvider = 'AI Provider') {
  if (!error) return `${defaultProvider} service is currently unavailable.`;
  const rawMsg = typeof error === 'string' ? error : error.message || String(error);

  // Extract inner JSON message if rawMsg contains stringified JSON
  let innerMsg = rawMsg;
  try {
    const jsonMatch = rawMsg.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error?.message) {
        innerMsg = parsed.error.message;
      }
    }
  } catch (e) {}

  const isRateLimit =
    rawMsg.includes('429') ||
    rawMsg.includes('RESOURCE_EXHAUSTED') ||
    rawMsg.includes('Quota exceeded') ||
    rawMsg.includes('rate_limit') ||
    innerMsg.includes('Quota exceeded');

  if (isRateLimit) {
    let retryDelay = '';
    const delayMatch = innerMsg.match(/retry in ([0-9.]+\s*s)/i);
    if (delayMatch && delayMatch[1]) {
      retryDelay = ` Please retry after ${delayMatch[1]}.`;
    }
    return `${defaultProvider} rate limit / quota reached (Free Tier limit exceeded).${retryDelay} You can wait a few moments or select a different model in settings.`;
  }

  const isHighDemand =
    rawMsg.includes('503') ||
    rawMsg.includes('UNAVAILABLE') ||
    rawMsg.includes('high demand') ||
    innerMsg.includes('503');

  if (isHighDemand) {
    return `${defaultProvider} service is currently experiencing high demand. Please try again in a few moments.`;
  }

  const isAuthError =
    rawMsg.includes('401') ||
    rawMsg.includes('403') ||
    rawMsg.includes('API key') ||
    rawMsg.includes('UNAUTHENTICATED');

  if (isAuthError) {
    return `Invalid or missing ${defaultProvider} API key. Please check your configuration in .env settings.`;
  }

  // Strip any raw JSON or technical URL residue
  const cleanMsg = innerMsg
    .replace(/^.*?Error:\s*/i, '')
    .replace(/^.*?Provider Error:\s*/i, '')
    .replace(/\{[\s\S]*\}/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanMsg ? `${defaultProvider}: ${cleanMsg}` : `${defaultProvider} is temporarily unavailable. Please try again.`;
}

module.exports = {
  formatAiError,
};
