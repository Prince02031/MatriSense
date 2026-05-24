/**
 * VectorKnowledgeSource Model
 * Stores metadata about each RAG source document
 */

const mongoose = require('mongoose');

const VectorKnowledgeSourceSchema = new mongoose.Schema(
  {
    // Unique identifier from sourceRegistry.json
    sourceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Type of source document
    // KNOWLEDGE_CARD | MARKDOWN | PDF | HTML
    sourceKind: {
      type: String,
      required: true,
      enum: ['KNOWLEDGE_CARD', 'MARKDOWN', 'PDF', 'HTML'],
      index: true,
    },

    // Human-readable title
    title: {
      type: String,
      required: true,
    },

    // Path to the source file (relative to project root)
    // e.g. "backend/src/rag/knowledgeCards.json"
    // or "backend/data/rag/source-documents/md-files/01_summary.md"
    path: {
      type: String,
      required: true,
    },

    // Language(s) of the source
    // e.g. ["en", "bn"]
    language: {
      type: [String],
      default: ['en'],
    },

    // Whether this source is from a trusted/verified source
    trusted: {
      type: Boolean,
      default: true,
    },

    // Priority ordering (lower = higher priority)
    // 1 = highest (Knowledge Cards)
    // 2 = high (curated summaries, CDC/WHO)
    // 3 = medium (implementation guides)
    // 4 = lower (policy, facility assessment)
    priority: {
      type: Number,
      default: 3,
      index: true,
    },

    // Allowed audiences for this source
    // PATIENT | HEALTH_WORKER | ADMIN | DOCS
    audiences: {
      type: [String],
      enum: ['PATIENT', 'HEALTH_WORKER', 'ADMIN', 'DOCS'],
      default: ['HEALTH_WORKER'],
    },

    // Allowed guidance types from this source
    allowedGuidanceTypes: {
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

    // Whether this source should be restricted from patient output
    restrictedPatientContext: {
      type: Boolean,
      default: false,
    },

    // Additional default metadata from sourceRegistry
    defaultMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Ingestion status
    // PENDING = not yet processed
    // INGESTED = fully embedded and chunked
    // PARTIAL = some chunks processed, some failed
    // ERROR = ingestion failed
    // SKIPPED_NEEDS_OCR = PDF requires OCR, not yet supported
    ingestionStatus: {
      type: String,
      enum: ['PENDING', 'INGESTED', 'PARTIAL', 'ERROR', 'SKIPPED_NEEDS_OCR'],
      default: 'PENDING',
      index: true,
    },

    // Timestamp of last successful ingestion
    lastIngestedAt: {
      type: Date,
      default: null,
    },

    // Number of chunks successfully created and embedded
    chunkCount: {
      type: Number,
      default: 0,
    },

    // Error message if ingestion failed
    errorMessage: {
      type: String,
      default: null,
    },

    // Source evidence tag (for traceability)
    // e.g. "WHO_PREGNANCY_DANGER_SIGNS", "CDC_HEAR_HER_CAMPAIGN"
    evidenceTag: {
      type: String,
      default: null,
    },

    // File hash (for change detection)
    // Re-ingestion only happens if file hash changes
    fileHash: {
      type: String,
      default: null,
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
    collection: 'vectorKnowledgeSources',
  }
);

// Indexes for efficient querying
VectorKnowledgeSourceSchema.index({ sourceId: 1 });
VectorKnowledgeSourceSchema.index({ sourceKind: 1 });
VectorKnowledgeSourceSchema.index({ priority: 1 });
VectorKnowledgeSourceSchema.index({ ingestionStatus: 1 });
VectorKnowledgeSourceSchema.index({ audiences: 1 });
VectorKnowledgeSourceSchema.index({ trusted: 1 });

// Virtual for determining if source needs ingestion
VectorKnowledgeSourceSchema.virtual('needsIngestion').get(function () {
  return this.ingestionStatus === 'PENDING' || this.ingestionStatus === 'ERROR';
});

// Method to mark as successfully ingested
VectorKnowledgeSourceSchema.methods.markIngested = function (chunkCount) {
  this.ingestionStatus = 'INGESTED';
  this.chunkCount = chunkCount || 0;
  this.lastIngestedAt = new Date();
  this.errorMessage = null;
  return this.save();
};

// Method to mark as partially ingested
VectorKnowledgeSourceSchema.methods.markPartialIngestion = function (chunkCount, error) {
  this.ingestionStatus = 'PARTIAL';
  this.chunkCount = chunkCount || 0;
  this.lastIngestedAt = new Date();
  this.errorMessage = error || null;
  return this.save();
};

// Method to mark ingestion error
VectorKnowledgeSourceSchema.methods.markIngestionError = function (error) {
  this.ingestionStatus = 'ERROR';
  this.errorMessage = error?.message || String(error);
  return this.save();
};

// Method to get readable status
VectorKnowledgeSourceSchema.methods.getStatus = function () {
  return {
    sourceId: this.sourceId,
    status: this.ingestionStatus,
    chunkCount: this.chunkCount,
    lastIngested: this.lastIngestedAt,
    error: this.errorMessage,
  };
};

module.exports = mongoose.model('VectorKnowledgeSource', VectorKnowledgeSourceSchema);
