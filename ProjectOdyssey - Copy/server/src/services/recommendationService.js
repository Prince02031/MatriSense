const User = require("../models/User");
const VisitLog = require("../models/VisitLog");
const { getTrendingPlaces } = require("./placeService");
const { callGemini } = require("./ai/geminiClient");

class RecommendationService {
    /**
     * Main entry point for generating recommendations
     */
    static async generateForUser(userId) {
        // 1. Determine current week start (Sunday)
        const weekStart = this.getRecentSunday();
        const weekStartStr = weekStart.toISOString().split("T")[0];

        // 2. Fetch required data
        let user, trending;
        try {
            [user, trending] = await Promise.all([
                User.findById(userId),
                getTrendingPlaces()
            ]);
        } catch (err) {
            console.error("Error fetching data for recommendations:", err);
            throw new Error("Failed to gather travel data for recommendations.");
        }

        if (!user) throw new Error("User not found");

        // 3. Prepare Prompt Data
        const trendingNames = (trending || []).map(p => p.name);
        const preferences = {
            travelStyle: user.travelStyle,
            budget: user.preferences?.budgetRange,
            accommodation: user.preferences?.accommodation
        };

        const visits = await VisitLog.getUserVisits(userId, { limit: 50 });
        const completedDestinations = [...new Set(visits.map(v => v.place_name))];

        // 4. Build Prompt
        const systemPrompt = `You are a travel recommendation AI for a platform called Odyssey.
Generate 4 recommended main destinations based on the provided user data.

Requirements:
- Avoid destinations already completed unless suggesting a new region within it.
- Prioritize trending places but personalize heavily using preferences.
- Each destination must match budget and travel style.
- Include image description prompts suitable for generating travel images.

Return output strictly in JSON format:
{
  "recommended_places": [
    {
      "destination_name": "Name",
      "short_caption": "2-3 sentences",
      "card_image_prompt": "Realistic photography style description",
      "sub_places": [
        {
          "place_name": "Name",
          "description": "2-3 sentences",
          "image_prompt": "Realistic photography style description"
        }
      ]
    }
  ]
}

Rules:
- Exactly 4 main destinations.
- Each must contain 3-5 sub_places.
- Descriptions must be 2-3 sentences.
- Image prompts must be descriptive for high-quality photography.`;

        const userContext = {
            trending_searches: trendingNames,
            user_preferences: preferences,
            completed_trips: completedDestinations
        };

        // 5. Call Gemini
        const result = await callGemini({
            system: systemPrompt,
            user: userContext
        });

        if (!result || !result.recommended_places) {
            throw new Error("Invalid response from Gemini");
        }

        // 6. Post-process (Add Image URLs)
        const processedPlaces = result.recommended_places.map((rec, idx) => ({
            ...rec,
            // Using a more reliable way to get Unsplash images by keyword
            card_image_url: `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop&sig=${idx}`, // Base high-quality travel image
            card_image_url: `https://images.unsplash.com/featured/?${encodeURIComponent(rec.destination_name)},travel&sig=${idx}`,
            sub_places: rec.sub_places.map((sp, sIdx) => ({
                ...sp,
                image_url: `https://images.unsplash.com/featured/?${encodeURIComponent(sp.place_name)},${encodeURIComponent(rec.destination_name)}&sig=${idx}${sIdx}`
            }))
        }));

        // 7. Save to User document (MongoDB)
        user.weeklyRecommendations = processedPlaces;
        user.lastRecommendationWeek = weekStartStr;
        await user.save();

        return processedPlaces;
    }

    /**
     * Get the most recent Sunday at midnight
     */
    static getRecentSunday() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const day = d.getDay(); // 0 is Sunday
        const diff = d.getDate() - day;
        d.setDate(diff);
        return d;
    }

    /**
     * Get current week's recommendations for a user
     */
    static async getForUser(userId) {
        const weekStart = this.getRecentSunday();
        const weekStartStr = weekStart.toISOString().split("T")[0];

        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        // If no data for current week, generate it
        if (!user.weeklyRecommendations ||
            user.weeklyRecommendations.length === 0 ||
            user.lastRecommendationWeek !== weekStartStr) {
            return await this.generateForUser(userId);
        }

        return user.weeklyRecommendations;
    }
}

module.exports = RecommendationService;
