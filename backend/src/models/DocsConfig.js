const mongoose = require('mongoose');

const DocsConfigSchema = new mongoose.Schema(
  {
    isPublic: {
      type: Boolean,
      default: true,
      description: 'Whether /docs page is publicly accessible'
    },
    availableFrom: {
      type: Date,
      required: true,
      description: 'Start datetime when /docs becomes available'
    },
    availableUntil: {
      type: Date,
      required: true,
      description: 'End datetime when /docs stops being available'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      description: 'Admin user who last updated this config'
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      description: 'Timestamp of last update'
    },
    version: {
      type: Number,
      default: 1,
      description: 'Config version for audit trail'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DocsConfig', DocsConfigSchema);
