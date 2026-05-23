const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["blog", "auto", "review"],
    required: true,
    default: "blog"
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // BlockNote JSON structure
    required: true
  },
  images: [String],  // Array of image URLs for blog posts
  tripId: {
    type: String, // UUID from Supabase itineraries table
    default: null
  },
  tripName: {
    type: String,
    default: null
  },
  // Review data (for review-share posts)
  reviewData: {
    reviewId: {
      type: String,   // UUID from Supabase reviews table
      default: null
    },
    placeName: {
      type: String,
      default: null
    },
    placeType: {
      type: String,   // POI, CITY, COUNTRY
      default: null
    },
    rating: {
      type: Number,   // 1-5
      default: null
    },
    title: {
      type: String,
      default: null
    },
    comment: {
      type: String,
      default: null
    },
    images: [String],  // Array of photo URLs
    visitDate: {
      type: Date,
      default: null
    }
  },

  // Trip progress data (for auto-generated trip update posts)
  tripProgress: {
    locations: [{
      name: String,
      placeId: String,
      visitedAt: Date,
      photos: [String], // Array of photo URLs
      isCurrentLocation: Boolean
    }],
    currentLocationName: String,
    totalLocations: Number,
    completionPercentage: Number
  },
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Virtual field to populate author details
postSchema.virtual("author", {
  ref: "User",
  localField: "authorId",
  foreignField: "_id",
  justOne: true
});

// Include virtuals in JSON
postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Post", postSchema);
