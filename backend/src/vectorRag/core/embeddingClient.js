/**
 * Embedding Client for Vector RAG
 * Central interface for embedding operations, backend-only
 * Does not expose API keys
 */

const GeminiEmbeddingProvider = require('./providers/geminiEmbeddingProvider');
const LocalEmbeddingProvider = require('./providers/localEmbeddingProvider');
const MockEmbeddingProvider = require('./providers/mockEmbeddingProvider');

class EmbeddingClient {
  constructor(config = {}) {
    this.config = {
      provider: (config.provider || process.env.EMBEDDING_PROVIDER || 'local').toLowerCase(),
      ...config,
    };

    this.provider = null;
    this.lastError = null;
    this.isInitialized = false;

    this._initProvider();
  }

  /**
   * Initialize the embedding provider
   * @private
   */
  _initProvider() {
    try {
      if (this.config.provider === 'local') {
        this.provider = new LocalEmbeddingProvider({
          model: this.config.model,
          dimensions: this.config.dimensions,
        });
        this.isInitialized = true;
      } else if (this.config.provider === 'gemini') {
        this.provider = new GeminiEmbeddingProvider({
          apiKey: this.config.apiKey,
          model: this.config.model,
          timeout: this.config.timeout,
          maxRetries: this.config.maxRetries,
        });
        this.isInitialized = true;
      } else if (this.config.provider === 'mock') {
        this.provider = new MockEmbeddingProvider({
          model: this.config.model,
          dimensions: this.config.dimensions,
        });
        this.isInitialized = true;
      } else if (this.config.provider === 'none') {
        this.provider = null;
        this.isInitialized = true;
      } else {
        this.lastError = `Unknown embedding provider: ${this.config.provider}`;
        this.isInitialized = false;
      }
    } catch (error) {
      this.lastError = `Failed to initialize embedding provider: ${error.message}`;
      this.isInitialized = false;
    }
  }

  /**
   * Check if client is ready
   * @returns {object} { ready, message, error }
   */
  checkReady() {
    if (!this.isInitialized) {
      return {
        ready: false,
        message: this.lastError || 'Client not initialized',
        error: 'NOT_INITIALIZED',
      };
    }

    if (this.config.provider === 'none') {
      return {
        ready: true,
        message: 'Embedding provider disabled (none)',
        error: null,
      };
    }

    if (!this.provider) {
      return {
        ready: false,
        message: 'Provider not initialized',
        error: 'NO_PROVIDER',
      };
    }

    return this.provider.checkReady();
  }

  /**
   * Embed a single text
   * @param {string} text - Text to embed
   * @returns {Promise<object>} { embedding, error, message, usage }
   */
  async embed(text, options = {}) {
    const readyCheck = this.checkReady();
    if (!readyCheck.ready) {
      return {
        ok: false,
        provider: this.config.provider,
        embedding: null,
        error: readyCheck.error,
        message: readyCheck.message,
        fallbackRecommended: true,
        usage: null,
      };
    }

    if (this.config.provider === 'none') {
      return {
        ok: false,
        provider: 'none',
        embedding: null,
        error: 'PROVIDER_DISABLED',
        message: 'Embedding provider is disabled (none)',
        fallbackRecommended: true,
        usage: null,
      };
    }

    try {
      const result = await this.provider.embedText(text, options);
      if (result && typeof result.ok === 'boolean') {
        return result;
      }

      if (result?.error) {
        return {
          ok: false,
          provider: this.config.provider,
          embedding: null,
          error: result.error,
          message: result.message || 'Embedding failed',
          fallbackRecommended: true,
          usage: result.usage || null,
        };
      }

      return {
        ok: true,
        provider: this.config.provider,
        model: this.provider?.model || this.config.model || null,
        dimensions: Array.isArray(result?.embedding) ? result.embedding.length : null,
        embedding: result?.embedding || null,
        usage: result?.usage || null,
      };
    } catch (error) {
      return {
        ok: false,
        provider: this.config.provider,
        embedding: null,
        error: 'UNEXPECTED_ERROR',
        message: `Unexpected error during embedding: ${error.message}`,
        fallbackRecommended: true,
        usage: null,
      };
    }
  }

  /**
   * Embed multiple texts (batch)
   * @param {array} texts - Array of texts to embed
   * @returns {Promise<array>} Array of { text, embedding, error, message }
   */
  async embedBatch(texts, options = {}) {
    const readyCheck = this.checkReady();
    if (!readyCheck.ready) {
      return texts.map((text) => ({
        ok: false,
        provider: this.config.provider,
        model: this.provider?.model || this.config.model || null,
        dimensions: null,
        text: text.substring(0, 100),
        embedding: null,
        error: readyCheck.error,
        message: readyCheck.message,
        fallbackRecommended: true,
      }));
    }

    try {
      if (this.config.provider === 'none') {
        return texts.map((text) => ({
          ok: false,
          provider: 'none',
          model: null,
          dimensions: null,
          text: text.substring(0, 100),
          embedding: null,
          error: 'PROVIDER_DISABLED',
          message: 'Embedding provider is disabled (none)',
          fallbackRecommended: true,
        }));
      }
      return await this.provider.embedBatch(texts, options);
    } catch (error) {
      return texts.map((text) => ({
        ok: false,
        provider: this.config.provider,
        model: this.provider?.model || this.config.model || null,
        dimensions: null,
        text: text.substring(0, 100),
        embedding: null,
        error: 'UNEXPECTED_ERROR',
        message: `Unexpected error during batch embedding: ${error.message}`,
        fallbackRecommended: true,
      }));
    }
  }

  /**
   * Get client status (sanitized - no API keys)
   * @returns {object} Client status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      provider: this.config.provider,
      providerReady:
        this.config.provider === 'none' ? true : this.provider?.checkReady().ready || false,
      providerStatus: this.provider?.getStatus() || null,
      lastError: this.lastError,
    };
  }

  /**
   * Verify that API key is available (does not expose it)
   * @returns {boolean} true if API key appears to be configured
   */
  hasApiKey() {
    if (this.provider?.apiKey) {
      return true;
    }
    return !!process.env.GEMINI_API_KEY;
  }
}

module.exports = EmbeddingClient;
