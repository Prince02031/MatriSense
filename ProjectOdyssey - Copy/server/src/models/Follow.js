const mongoose = require("mongoose");

/**
 * FOLLOW MODEL
 *
 * Represents a "user A follows user B" relationship.
 *
 * followerId  = the person who clicked "Follow"
 * followingId = the person being followed
 *
 * Example:
 *   Ekanto follows Alfi:
 *     { followerId: ekanto_id, followingId: alfi_id }
 */
const followSchema = new mongoose.Schema({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  followingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, {
  timestamps: true
});

// One person can only follow another person once
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// Fast lookup: "who does this person follow?"
followSchema.index({ followerId: 1 });

// Fast lookup: "who follows this person?"
followSchema.index({ followingId: 1 });

module.exports = mongoose.model("Follow", followSchema);
