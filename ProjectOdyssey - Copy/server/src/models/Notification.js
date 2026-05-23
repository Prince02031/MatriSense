const mongoose = require("mongoose");

/**
 * NOTIFICATION MODEL
 *
 * One document per notification event.
 *
 * Types:
 *   "like"    — actorId liked recipientId's post
 *   "comment" — actorId commented on recipientId's post
 *
 * Fields:
 *   recipientId — the post owner who receives the notification
 *   actorId     — the user who performed the action
 *   type        — "like" | "comment"
 *   postId      — the post that was liked / commented on
 *   commentId   — (comment only) the comment that was created
 *   message     — human-readable description, pre-built by the server
 *   read        — false until the user opens the notification
 */
const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["like", "comment", "follow"],
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    default: null  // Not required for follow notifications
  },
  // Only present for comment notifications
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null
  },
  // Optional pre-built message e.g. "alfi liked your post"
  // If empty, the frontend builds the string from the populated actorId.
  message: {
    type: String,
    default: ""
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true   // createdAt used for sorting newest-first
});

// Fast lookup: "fetch all notifications for this user, newest first"
notificationSchema.index({ recipientId: 1, createdAt: -1 });

// Fast unread count
notificationSchema.index({ recipientId: 1, read: 1 });

// Prevent duplicate like-notifications: one per (actor, post, type)
// Comment notifications are allowed to stack (multiple comments on same post)
notificationSchema.index(
  { actorId: 1, postId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "like" }  // only enforce uniqueness for likes
  }
);

// Prevent duplicate follow-notifications: one per (actor, recipient, type)
notificationSchema.index(
  { actorId: 1, recipientId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "follow" }  // only enforce uniqueness for follows
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
