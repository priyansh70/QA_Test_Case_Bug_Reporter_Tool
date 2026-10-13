const { GoogleGenAI } = require('@google/genai');
const { formatAiError } = require('./errorFormatter');

class GeminiProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!this.apiKey) {
      throw new Error(
        'Gemini API Key is missing. Please set GEMINI_API_KEY or GOOGLE_API_KEY in your .env file.'
      );
    }
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Generates completion using Google Gemini API with exponential backoff retry.
   */
  async generateCompletion({ systemPrompt, userPrompt, model, temperature = 0.3 }) {
    const targetModel = model || process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-3.6-flash';

    let lastError = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: targetModel,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: temperature,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text;
        if (text) {
          return text;
        }
      } catch (error) {
        lastError = error;
        const errStr = error.message || '';
        const isTransient = errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('high demand');

        if (isTransient && attempt < maxAttempts) {
          const delayMs = attempt * 1500;
          console.warn(`⚠️ [Gemini Retry] Retrying attempt ${attempt + 1}/${maxAttempts} in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        throw new Error(formatAiError(error, 'Google Gemini'));
      }
    }

    throw new Error(formatAiError(lastError, 'Google Gemini'));
  }
}

module.exports = GeminiProvider;
