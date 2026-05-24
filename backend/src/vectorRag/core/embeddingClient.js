/**
 * Embedding Client for Vector RAG
 * Central interface for embedding operations, backend-only
 * Does not expose API keys
 */

const GeminiEmbeddingProvider = require('./providers/geminiEmbeddingProvider');

class EmbeddingClient {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || process.env.EMBEDDING_PROVIDER || 'gemini',
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
      if (this.config.provider === 'gemini') {
        this.provider = new GeminiEmbeddingProvider({
          apiKey: this.config.apiKey,
          model: this.config.model,
          timeout: this.config.timeout,
          maxRetries: this.config.maxRetries,
        });
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
  async embed(text) {
    const readyCheck = this.checkReady();
    if (!readyCheck.ready) {
      return {
        embedding: null,
        error: readyCheck.error,
        message: readyCheck.message,
        usage: null,
      };
    }

    try {
      return await this.provider.embedText(text);
    } catch (error) {
      // Catch unhandled errors
      return {
        embedding: null,
        error: 'UNEXPECTED_ERROR',
        message: `Unexpected error during embedding: ${error.message}`,
        usage: null,
      };
    }
  }

  /**
   * Embed multiple texts (batch)
   * @param {array} texts - Array of texts to embed
   * @returns {Promise<array>} Array of { text, embedding, error, message }
   */
  async embedBatch(texts) {
    const readyCheck = this.checkReady();
    if (!readyCheck.ready) {
      return texts.map((text) => ({
        text: text.substring(0, 100),
        embedding: null,
        error: readyCheck.error,
        message: readyCheck.message,
      }));
    }

    try {
      return await this.provider.embedBatch(texts);
    } catch (error) {
      // Catch unhandled errors
      return texts.map((text) => ({
        text: text.substring(0, 100),
        embedding: null,
        error: 'UNEXPECTED_ERROR',
        message: `Unexpected error during batch embedding: ${error.message}`,
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
      providerReady: this.provider?.checkReady().ready || false,
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
