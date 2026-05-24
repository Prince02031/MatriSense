/**
 * Mock Embedding Provider for tests only.
 * Produces deterministic 384-d vectors from input text.
 */

class MockEmbeddingProvider {
  constructor(config = {}) {
    this.provider = 'mock';
    this.model = config.model || 'mock-deterministic-embedding-v1';
    this.dimensions = parseInt(
      config.dimensions || process.env.EMBEDDING_DIMENSIONS || 384,
      10
    );
  }

  checkReady() {
    return { ready: true, message: 'Mock provider ready', error: null };
  }

  hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  embedDeterministic(text) {
    const v = new Array(this.dimensions);
    let seed = this.hash(text);
    for (let i = 0; i < this.dimensions; i++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      v[i] = (seed / 0xffffffff) * 2 - 1;
    }
    return v;
  }

  async embedText(text) {
    const safeText = typeof text === 'string' ? text.trim() : '';
    if (!safeText) {
      return {
        ok: false,
        provider: this.provider,
        model: this.model,
        error: 'Text must be a non-empty string',
        fallbackRecommended: true,
      };
    }

    const embedding = this.embedDeterministic(safeText);
    return {
      ok: true,
      provider: this.provider,
      model: this.model,
      dimensions: embedding.length,
      embedding,
    };
  }

  async embedBatch(texts) {
    if (!Array.isArray(texts)) {
      return [
        {
          ok: false,
          provider: this.provider,
          model: this.model,
          error: 'texts must be an array',
          fallbackRecommended: true,
        },
      ];
    }
    return Promise.all(texts.map((text) => this.embedText(text)));
  }

  getStatus() {
    return {
      provider: this.provider,
      model: this.model,
      dimensions: this.dimensions,
      ready: true,
      warning: 'Mock embeddings are for tests only.',
    };
  }
}

module.exports = MockEmbeddingProvider;
