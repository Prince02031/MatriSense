const cron = require("node-cron");
const User = require("../models/User");
const RecommendationService = require("./recommendationService");

function startScheduler() {
    /**
     * Run every Sunday at 12:00 AM (00:00 server time)
     * Pattern: minute hour dayOfMonth month dayOfWeek
     */
    cron.schedule("0 0 * * 0", async () => {
        console.log("⏰ Starting Weekly Recommendation Refresh...");

        try {
            // 1. Fetch all users from MongoDB
            const users = await User.find({}, "_id username");
            console.log(`Processing ${users.length} users...`);

            // 2. Iterate and generate recommendations per user
            for (const user of users) {
                try {
                    console.log(`Generating recommendations for ${user.username}...`);
                    await RecommendationService.generateForUser(user._id);
                } catch (err) {
                    console.error(`Failed to generate recommendations for ${user.username}:`, err.message);
                    // Continue to next user
                }
            }

            console.log("✅ Weekly Recommendation Refresh Complete.");
        } catch (err) {
            console.error("CRITICAL: Recommendation Scheduler failed:", err);
        }
    });

    console.log("📅 AI Recommendation Scheduler started (Weekly on Sundays at 00:00)");
}

module.exports = { startScheduler };
