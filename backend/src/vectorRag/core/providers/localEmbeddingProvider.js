/**
 * Local Embedding Provider for Vector RAG
 * Uses Transformers.js with multilingual-e5-small by default.
 */

let extractorPromise = null;
let extractorReadyLogged = false;

class LocalEmbeddingProvider {
  constructor(config = {}) {
    this.provider = 'local';
    this.model = config.model || process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-small';
    this.dimensions = parseInt(
      config.dimensions || process.env.EMBEDDING_DIMENSIONS || 384,
      10
    );
  }

  checkReady() {
    return {
      ready: true,
      message: 'Local embedding provider ready',
      error: null,
    };
  }

  async getExtractor() {
    if (!extractorPromise) {
      console.log(`[LocalEmbeddingProvider] Loading model: ${this.model}`);
      extractorPromise = import('@huggingface/transformers')
        .then(({ pipeline }) => pipeline('feature-extraction', this.model))
        .then(async (extractor) => {
          await extractor('passage: warmup', { pooling: 'mean', normalize: true });
          if (!extractorReadyLogged) {
            console.log(`[LocalEmbeddingProvider] Model ready: ${this.model}`);
            extractorReadyLogged = true;
          }
          return extractor;
        })
        .catch((error) => {
          extractorPromise = null;
          throw error;
        });
    }

    return extractorPromise;
  }

  buildInput(text, inputType = 'passage') {
    const prefix = inputType === 'query' ? 'query: ' : 'passage: ';
    return `${prefix}${text}`;
  }

  async embedText(text, options = {}) {
    const inputType = options.inputType || 'passage';
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

    try {
      const extractor = await this.getExtractor();
      const output = await extractor(this.buildInput(safeText, inputType), {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = Array.from(output.data || []);

      if (!embedding.length) {
        return {
          ok: false,
          provider: this.provider,
          model: this.model,
          error: 'Empty embedding returned',
          fallbackRecommended: true,
        };
      }

      return {
        ok: true,
        provider: this.provider,
        model: this.model,
        dimensions: embedding.length,
        embedding,
      };
    } catch (error) {
      return {
        ok: false,
        provider: this.provider,
        model: this.model,
        error: error?.message || String(error),
        fallbackRecommended: true,
      };
    }
  }

  async embedBatch(texts, options = {}) {
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

    const results = [];
    for (const text of texts) {
      results.push(await this.embedText(text, options));
    }
    return results;
  }

  getStatus() {
    return {
      provider: this.provider,
      model: this.model,
      dimensions: this.dimensions,
      ready: true,
    };
  }
}

module.exports = LocalEmbeddingProvider;
