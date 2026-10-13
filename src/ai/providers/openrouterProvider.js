const { OpenAI } = require('openai');
const { formatAiError } = require('./errorFormatter');

class OpenRouterProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
    this.baseUrl = config.baseUrl || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    if (!this.apiKey) {
      throw new Error(
        'OpenRouter API Key is missing. Please set OPENROUTER_API_KEY in your .env file.'
      );
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
    });
  }

  async generateCompletion({ systemPrompt, userPrompt, model, temperature = 0.3, max_tokens = 4000 }) {
    const selectedModel = model || process.env.OPENROUTER_MODEL || process.env.AI_MODEL || 'meta-llama/llama-4-maverick';

    try {
      const response = await this.client.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: temperature,
        max_tokens: max_tokens,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenRouter returned an empty response.');
      }
      return content;
    } catch (error) {
      throw new Error(formatAiError(error, 'OpenRouter'));
    }
  }
}

module.exports = OpenRouterProvider;
