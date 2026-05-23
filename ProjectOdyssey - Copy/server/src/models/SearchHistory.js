const mongoose = require("mongoose");

/**
 * SEARCH HISTORY MODEL
 *
 * Records which user profiles a person has clicked on from search results.
 * One document per (searcher, searched-user) pair — repeated clicks just
 * update the timestamp so the entry floats to the top.
 *
 * Example:
 *   Ekanto clicks on Alfi's result:
 *     { searcherId: ekanto_id, searchedUserId: alfi_id, query: "alfi" }
 */
const searchHistorySchema = new mongoose.Schema({
  searcherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  searchedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // The search term the user had typed when they clicked the result.
  // Optional — may be omitted if history is recorded from a direct profile view.
  query: {
    type: String,
    default: ""
  }
}, {
  timestamps: true   // createdAt = first search, updatedAt = most recent click
});

// One record per (searcher, searched-user) pair — upsert on repeat clicks
searchHistorySchema.index({ searcherId: 1, searchedUserId: 1 }, { unique: true });

// Fast lookup: "what is this user's history?" sorted by recent
searchHistorySchema.index({ searcherId: 1, updatedAt: -1 });

module.exports = mongoose.model("SearchHistory", searchHistorySchema);
