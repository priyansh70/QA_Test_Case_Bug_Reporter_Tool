const OpenAIProvider = require('./openaiProvider');
const GeminiProvider = require('./geminiProvider');
const OpenRouterProvider = require('./openrouterProvider');
const ClaudeProvider = require('./claudeProvider');

/**
 * Dynamically resolves and instantiates an AI provider based on configuration or environment settings.
 * 
 * @param {Object} [options]
 * @param {string} [options.provider] - Explicit provider name e.g. 'openai', 'gemini', 'claude'
 * @param {string} [options.model] - Model name e.g. 'gpt-4o', 'gemini-2.5-flash', 'claude-3-7-sonnet-20250219'
 * @returns {Object} Instantiated AI provider
 */
function getProvider(options = {}) {
  let providerName = (options.provider || process.env.AI_PROVIDER || '').toLowerCase().trim();
  const modelName = (options.model || process.env.AI_MODEL || process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || process.env.OPENROUTER_MODEL || process.env.ANTHROPIC_MODEL || '').toLowerCase().trim();

  // Auto-detect provider based on model name if provider is not explicitly set
  if (!providerName && modelName) {
    if (modelName.startsWith('gemini')) {
      providerName = 'gemini';
    } else if (modelName.startsWith('claude')) {
      providerName = 'claude';
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
    const hasAnthropicKey = Boolean(
      (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your_claude')) ||
      (process.env.CLAUDE_API_KEY && !process.env.CLAUDE_API_KEY.includes('your_claude'))
    );
    if (process.env.OPENROUTER_API_KEY) {
      providerName = 'openrouter';
      console.log("Using Open Router")
    } else if (hasAnthropicKey) {
      providerName = 'claude';
    } else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      providerName = 'gemini';
    } else {
      providerName = 'openai';
    }
  }

  switch (providerName) {
    case 'claude':
    case 'anthropic':
      return new ClaudeProvider(options);
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
  ClaudeProvider,
  OpenAIProvider,
  GeminiProvider,
  OpenRouterProvider,
};

