const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure a user can only like a post once
likeSchema.index({ postId: 1, userId: 1 }, { unique: true });

// Index for faster queries
likeSchema.index({ postId: 1 });
likeSchema.index({ userId: 1 });

module.exports = mongoose.model("Like", likeSchema);
