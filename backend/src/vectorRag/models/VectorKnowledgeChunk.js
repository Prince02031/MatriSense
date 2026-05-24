/**
 * VectorKnowledgeChunk Model
 * Stores individual chunks of embedded knowledge
 */

const mongoose = require('mongoose');

const VectorKnowledgeChunkSchema = new mongoose.Schema(
  {
    // Unique ID for this chunk (sourceId_chunkIndex)
    chunkId: {
      type: String,
      required: true,
      unique: true,
    },

    // Reference to source document
    sourceId: {
      type: String,
      required: true,
    },

    // Type of source document
    sourceKind: {
      type: String,
      required: true,
      enum: ['KNOWLEDGE_CARD', 'MARKDOWN', 'PDF', 'HTML'],
    },

    // Human-readable source title
    sourceTitle: {
      type: String,
      required: true,
    },

    // Path to source file
    sourcePath: {
      type: String,
      required: true,
    },

    // Optional URL for web sources (HTML)
    sourceUrl: {
      type: String,
      default: null,
    },

    // Page range for PDFs
    pageStart: {
      type: Number,
      default: null,
    },

    pageEnd: {
      type: Number,
      default: null,
    },

    // Section title (for markdown with headers)
    sectionTitle: {
      type: String,
      default: null,
    },

    // Actual chunk text
    text: {
      type: String,
      required: true,
    },

    // SHA256 hash of text (for duplicate detection)
    textHash: {
      type: String,
      required: true,
    },

    // Language of chunk
    language: {
      type: String,
      default: 'en',
    },

    // Vector embedding (dense vector)
    // Stored as array of floats
    // Dimensionality depends on model (typically 768 or 1536)
    embedding: {
      type: [Number],
      default: null,
    },
    embeddingProvider: {
      type: String,
      default: null,
    },
    embeddingModel: {
      type: String,
      default: null,
    },
    embeddingDimensions: {
      type: Number,
      default: null,
    },

    // Extracted symptoms (if applicable)
    // Automatically extracted from text or from source metadata
    symptoms: {
      type: [String],
      default: [],
    },

    // Evidence tags from source
    evidenceTags: {
      type: [String],
      default: [],
    },

    // Risk levels this chunk applies to
    // HIGH | MEDIUM | LOW
    riskLevelAllowed: {
      type: [String],
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: ['HIGH', 'MEDIUM', 'LOW'],
    },

    // Guidance types this chunk can provide
    guidanceTypes: {
      type: [String],
      enum: [
        'URGENT_ESCALATION',
        'CONTACT_HEALTH_WORKER',
        'SELF_CARE_AND_MONITOR',
        'WARNING_SIGNS',
        'SAFETY_DISCLAIMER',
        'FOLLOW_UP_QUESTION',
        'HEALTH_WORKER_REVIEW',
        'REFERRAL_WORKFLOW',
        'FACILITY_READINESS',
        'SYSTEM_CONTEXT',
        'DIGITAL_HEALTH_ARCHITECTURE',
      ],
      default: ['HEALTH_WORKER_REVIEW'],
    },

    // Who is allowed to see this chunk
    // PATIENT | HEALTH_WORKER | ADMIN | DOCS
    audience: {
      type: [String],
      enum: ['PATIENT', 'HEALTH_WORKER', 'ADMIN', 'DOCS'],
      default: ['HEALTH_WORKER'],
    },

    // How this chunk should be used
    // e.g. "patient_guidance", "clinical_reference", "facility_assessment"
    sourceUse: {
      type: String,
      default: null,
    },

    // Whether this chunk comes from a trusted source
    trusted: {
      type: Boolean,
      default: true,
    },

    // Priority of this source (inherited from parent source)
    priority: {
      type: Number,
      default: 3,
    },

    // Retrieval score (for ranking search results)
    // Set at query time, not stored
    retrievalScore: {
      type: Number,
      default: null,
    },

    // Whether this chunk is from a knowledge card (for special handling)
    fromKnowledgeCard: {
      type: Boolean,
      default: false,
    },

    // Metadata tracking
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'vectorKnowledgeChunks',
  }
);

// Indexes for efficient querying
VectorKnowledgeChunkSchema.index({ sourceId: 1 });
VectorKnowledgeChunkSchema.index({ sourceKind: 1 });
VectorKnowledgeChunkSchema.index({ textHash: 1 }, { unique: false });
VectorKnowledgeChunkSchema.index({ sourceId: 1, textHash: 1, embeddingProvider: 1, embeddingModel: 1, embeddingDimensions: 1 });
VectorKnowledgeChunkSchema.index({ audience: 1 });
VectorKnowledgeChunkSchema.index({ guidanceTypes: 1 });
VectorKnowledgeChunkSchema.index({ riskLevelAllowed: 1 });
VectorKnowledgeChunkSchema.index({ trusted: 1 });
VectorKnowledgeChunkSchema.index({ priority: 1 });

// Vector search index (for MongoDB Atlas Vector Search)
// This index should be created separately through MongoDB Atlas UI or CLI
// Index name: "embedding_vector_index"
// Dimension: 768 (for embedding-001) or 1536 (for newer models)

// Method to verify embedding is present
VectorKnowledgeChunkSchema.methods.hasEmbedding = function () {
  return (
    this.embedding &&
    Array.isArray(this.embedding) &&
    this.embedding.length > 0
  );
};

// Method to get safe chunk for patient output
VectorKnowledgeChunkSchema.methods.isPatientSafe = function () {
  return (
    this.audience.includes('PATIENT') &&
    !this.text.toLowerCase().includes('contraindicated') &&
    !this.text.toLowerCase().includes('do not recommend') &&
    !this.text.toLowerCase().includes('only for clinical')
  );
};

// Method to get display text (truncated if needed)
VectorKnowledgeChunkSchema.methods.getDisplayText = function (maxLength = null) {
  if (!maxLength || this.text.length <= maxLength) {
    return this.text;
  }
  return this.text.substring(0, maxLength - 3) + '...';
};

// Static method to find by text hash
VectorKnowledgeChunkSchema.statics.findByTextHash = function (textHash) {
  return this.findOne({ textHash });
};

// Static method to find by source
VectorKnowledgeChunkSchema.statics.findBySourceId = function (sourceId) {
  return this.find({ sourceId });
};

// Static method to find patient-safe chunks
VectorKnowledgeChunkSchema.statics.findPatientSafe = function () {
  return this.find({
    audience: 'PATIENT',
    trusted: true,
  });
};

// Static method to find by guidance type
VectorKnowledgeChunkSchema.statics.findByGuidanceType = function (guidanceType) {
  return this.find({
    guidanceTypes: guidanceType,
  });
};

module.exports = mongoose.model('VectorKnowledgeChunk', VectorKnowledgeChunkSchema);
