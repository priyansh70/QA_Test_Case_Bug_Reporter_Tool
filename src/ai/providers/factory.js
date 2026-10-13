const OpenAIProvider = require('./openaiProvider');
const GeminiProvider = require('./geminiProvider');
const OpenRouterProvider = require('./openrouterProvider');

/**
 * Dynamically resolves and instantiates an AI provider based on configuration or environment settings.
 * 
 * @param {Object} [options]
 * @param {string} [options.provider] - Explicit provider name e.g. 'openai', 'gemini'
 * @param {string} [options.model] - Model name e.g. 'gpt-4o', 'gemini-2.5-flash'
 * @returns {Object} Instantiated AI provider
 */
function getProvider(options = {}) {
  let providerName = (options.provider || process.env.AI_PROVIDER || '').toLowerCase().trim();
  const modelName = (options.model || process.env.AI_MODEL || process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || process.env.OPENROUTER_MODEL || '').toLowerCase().trim();

  // Auto-detect provider based on model name if provider is not explicitly set
  if (!providerName && modelName) {
    if (modelName.startsWith('gemini')) {
      providerName = 'gemini';
    } else if (modelName.includes('/')) {
      providerName = 'openrouter';
    } else if (
      modelName.startsWith('gpt') ||
      modelName.startsWith('o1') ||
      modelName.startsWith('o3')
    ) {
      providerName = 'openai';
    }
  }

  // Fallback auto-detection based on configured API keys if provider is still unknown
  if (!providerName) {
    if (process.env.OPENROUTER_API_KEY) {
      providerName = 'openrouter';
    } else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      providerName = 'gemini';
    } else {
      providerName = 'openai';
    }
  }

  switch (providerName) {
    case 'gemini':
    case 'google':
      return new GeminiProvider(options);
    case 'openrouter':
      return new OpenRouterProvider(options);
    case 'openai':
    default:
      return new OpenAIProvider(options);
  }
}

module.exports = {
  getProvider,
  OpenAIProvider,
  GeminiProvider,
  OpenRouterProvider,
};
