const { OpenAI } = require('openai');
const { formatAiError } = require('./errorFormatter');

class OpenAIProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.baseUrl = config.baseUrl || process.env.OPENAI_BASE_URL;

    if (!this.apiKey && !this.baseUrl) {
      throw new Error(
        'OpenAI API Key is missing. Please set OPENAI_API_KEY in your .env file.'
      );
    }

    this.client = new OpenAI({
      apiKey: this.apiKey || 'dummy-key',
      baseURL: this.baseUrl || undefined,
    });
  }

  /**
   * Generates completion using OpenAI API.
   */
  async generateCompletion({ systemPrompt, userPrompt, model, temperature = 0.3 }) {
    const selectedModel = model || process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4o';

    try {
      const response = await this.client.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: temperature,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned an empty response.');
      }
      return content;
    } catch (error) {
      throw new Error(formatAiError(error, 'OpenAI'));
    }
  }
}

module.exports = OpenAIProvider;
