const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
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
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500 // Limit comment length
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
commentSchema.index({ postId: 1, createdAt: -1 });

// Virtual field to populate user details
commentSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true
});

// Include virtuals in JSON
commentSchema.set("toJSON", { virtuals: true });
commentSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Comment", commentSchema);
