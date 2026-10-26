const Anthropic = require('@anthropic-ai/sdk');
const { formatAiError } = require('./errorFormatter');

class ClaudeProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

    if (!this.apiKey) {
      throw new Error(
        'Anthropic Claude API Key is missing. Please set ANTHROPIC_API_KEY in your .env file.'
      );
    }

    this.client = new Anthropic({
      apiKey: this.apiKey,
    });
  }

  /**
   * Generates completion using Anthropic Claude Messages API.
   */
  async generateCompletion({ systemPrompt, userPrompt, model, temperature = 0.3, max_tokens = 8192 }) {
    const selectedModel =
      model ||
      process.env.ANTHROPIC_MODEL ||
      process.env.CLAUDE_MODEL ||
      process.env.AI_MODEL ||
      'claude-3-7-sonnet-20250219';

    const tokenLimit = Number(process.env.ANTHROPIC_MAX_TOKENS) || max_tokens || 8192;

    try {
      const requestPayload = {
        model: selectedModel,
        max_tokens: tokenLimit,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      };

      const response = await this.client.messages.create(requestPayload);

      let content = '';
      if (Array.isArray(response.content)) {
        const textBlock = response.content.find((b) => b.type === 'text');
        content = textBlock ? textBlock.text : (response.content[0]?.text || '');
      }

      if (!content) {
        throw new Error('Anthropic Claude returned an empty response.');
      }

      return content;
    } catch (error) {
      throw new Error(formatAiError(error, 'Anthropic Claude'));
    }
  }
}

module.exports = ClaudeProvider;
