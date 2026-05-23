/**
 * Script to fix posts with negative likesCount or commentsCount
 * Run with: node scripts/fix-negative-counts.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Post = require("../src/models/Post");

const mongoUrl = process.env.MONGODB_URI || "mongodb://localhost:27017/odyssey";

async function fixNegativeCounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB");

    // Find all posts with negative counts
    const negativePosts = await Post.find({
      $or: [
        { likesCount: { $lt: 0 } },
        { commentsCount: { $lt: 0 } }
      ]
    });

    if (negativePosts.length === 0) {
      console.log("✅ No posts with negative counts found!");
      process.exit(0);
    }

    console.log(`Found ${negativePosts.length} post(s) with negative counts:`);
    negativePosts.forEach(post => {
      console.log(`  - Post ${post._id}: likesCount=${post.likesCount}, commentsCount=${post.commentsCount}`);
    });

    // Fix them
    const result = await Post.updateMany(
      {
        $or: [
          { likesCount: { $lt: 0 } },
          { commentsCount: { $lt: 0 } }
        ]
      },
      [
        {
          $set: {
            likesCount: { $max: [0, "$likesCount"] },
            commentsCount: { $max: [0, "$commentsCount"] }
          }
        }
      ]
    );

    console.log(`\n✅ Fixed ${result.modifiedCount} post(s)`);
    
    // Verify
    const stillNegative = await Post.find({
      $or: [
        { likesCount: { $lt: 0 } },
        { commentsCount: { $lt: 0 } }
      ]
    });

    if (stillNegative.length === 0) {
      console.log("✅ All counts are now positive!");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

fixNegativeCounts();
