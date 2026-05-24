/**
 * Gemini Embedding Provider for Vector RAG
 * Handles embedding requests to Google's Gemini API
 */

const axios = require('axios');

/**
 * Gemini Embedding Provider
 * Wrapper around Gemini embedding API
 */
class GeminiEmbeddingProvider {
  constructor(config = {}) {
    // Use GOOGLE_API_KEY for embeddings (from Google Cloud with embeddings enabled)
    // Falls back to GEMINI_API_KEY for backwards compatibility
    this.apiKey = config.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    this.model = config.model || process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelayMs = config.retryDelayMs || 1000;
    
    // Track quota and rate limit state
    this.quotaExhausted = false;
    this.rateLimited = false;
    this.lastRateLimitReset = null;
  }

  /**
   * Check if provider is ready to use
   * @returns {object} { ready, message, error }
   */
  checkReady() {
    if (!this.apiKey) {
      return {
        ready: false,
        message: 'GEMINI_API_KEY not configured',
        error: 'MISSING_API_KEY',
      };
    }

    if (this.quotaExhausted) {
      return {
        ready: false,
        message: 'Gemini API quota exhausted',
        error: 'QUOTA_EXHAUSTED',
      };
    }

    if (this.rateLimited) {
      return {
        ready: false,
        message: 'Gemini API rate limited',
        error: 'RATE_LIMITED',
      };
    }

    return {
      ready: true,
      message: 'Ready',
      error: null,
    };
  }

  /**
   * Embed a single text using Gemini API
   * @param {string} text - Text to embed
   * @returns {Promise<object>} { embedding, error, usage }
   */
  async embedText(text) {
    const readyCheck = this.checkReady();
    if (!readyCheck.ready) {
      return {
        embedding: null,
        error: readyCheck.error,
        message: readyCheck.message,
        usage: null,
      };
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        embedding: null,
        error: 'INVALID_INPUT',
        message: 'Text must be a non-empty string',
        usage: null,
      };
    }

    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/${this.model}:embedContent?key=${this.apiKey}`,
          {
            model: `models/${this.model}`,
            content: {
              parts: [
                {
                  text: text.substring(0, 100000), // Safety limit
                },
              ],
            },
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        // Reset rate limit/quota flags on success
        this.rateLimited = false;
        this.quotaExhausted = false;

        return {
          embedding: response.data.embedding?.values || null,
          error: null,
          message: 'Success',
          usage: {
            inputTokens: response.data.usageMetadata?.promptTokenCount || 0,
          },
        };
      } catch (error) {
        lastError = error;

        // Handle specific error types
        if (error.response?.status === 429) {
          // Rate limited
          this.rateLimited = true;
          const retryAfter = error.response.headers['retry-after'] || this.retryDelayMs;
          return {
            embedding: null,
            error: 'RATE_LIMITED',
            message: `Rate limited. Retry after ${retryAfter}ms`,
            retryAfter: parseInt(retryAfter, 10) || this.retryDelayMs,
            usage: null,
          };
        }

        if (error.response?.status === 403) {
          // Quota exceeded or API key invalid
          if (error.response?.data?.error?.message?.includes('quota')) {
            this.quotaExhausted = true;
            return {
              embedding: null,
              error: 'QUOTA_EXHAUSTED',
              message: 'Gemini API quota exhausted. Check billing.',
              usage: null,
            };
          }
          return {
            embedding: null,
            error: 'FORBIDDEN',
            message: 'API key invalid or insufficient permissions',
            usage: null,
          };
        }

        if (error.response?.status === 400) {
          // Invalid request
          return {
            embedding: null,
            error: 'INVALID_REQUEST',
            message: error.response?.data?.error?.message || 'Invalid request to API',
            usage: null,
          };
        }

        // Retry on network errors or 5xx
        if (attempt < this.maxRetries && (!error.response || error.response.status >= 500)) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // Out of retries
        return {
          embedding: null,
          error: 'PROVIDER_ERROR',
          message: `Gemini API error: ${error.message}`,
          usage: null,
        };
      }
    }

    return {
      embedding: null,
      error: 'PROVIDER_ERROR',
      message: `Gemini API error after ${this.maxRetries} retries: ${lastError?.message}`,
      usage: null,
    };
  }

  /**
   * Embed multiple texts (batch support - optional)
   * For now, calls embedText sequentially
   * @param {array} texts - Array of texts to embed
   * @returns {Promise<array>} Array of { text, embedding, error }
   */
  async embedBatch(texts) {
    if (!Array.isArray(texts)) {
      return [
        {
          error: 'INVALID_INPUT',
          message: 'texts must be an array',
        },
      ];
    }

    const results = [];
    for (const text of texts) {
      const result = await this.embedText(text);
      results.push({
        text: text.substring(0, 100),
        ...result,
      });

      // Check for rate limit or quota - stop if hit
      if (result.error === 'RATE_LIMITED' || result.error === 'QUOTA_EXHAUSTED') {
        break;
      }
    }

    return results;
  }

  /**
   * Get provider status and configuration (sanitized)
   * @returns {object} Provider status
   */
  getStatus() {
    return {
      provider: 'gemini',
      model: this.model,
      ready: this.checkReady().ready,
      quotaExhausted: this.quotaExhausted,
      rateLimited: this.rateLimited,
      apiKeyConfigured: !!this.apiKey,
      timeout: this.timeout,
    };
  }
}

module.exports = GeminiEmbeddingProvider;
