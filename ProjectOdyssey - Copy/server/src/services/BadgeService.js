"use strict";

const supabase = require("../config/supabaseClient");
const User = require("../models/User");

// Badge Definitions
const BADGES = {
  TRUSTED_REVIEWER: {
    id: "trusted_reviewer",
    name: "Trusted Reviewer",
    emoji: "⭐",
    description: "Wrote 20 helpful reviews",
    condition: (stats) => stats.reviews >= 20
  },
  EXPLORER: {
    id: "explorer",
    name: "Explorer",
    emoji: "🗺️",
    description: "Visited 5 unique destinations",
    condition: (stats) => stats.uniqueDestinations >= 5
  },
  WAYFINDER: {
    id: "wayfinder",
    name: "Wayfinder",
    emoji: "📍",
    description: "Saved 20 places to wishlist",
    condition: (stats) => stats.savedPlaces >= 20
  },
  STORYTELLER: {
    id: "storyteller",
    name: "Storyteller",
    emoji: "✍️",
    description: "Posted 10 travel experiences",
    condition: (stats) => stats.posts >= 10
  },
  COMMUNITY_STAR: {
    id: "community_star",
    name: "Community Star",
    emoji: "🌟",
    description: "Received 50 likes on posts",
    condition: (stats) => stats.postLikes >= 50
  },
  CITY_HOPPER: {
    id: "city_hopper",
    name: "City Hopper",
    emoji: "🏙️",
    description: "Explored 5 cities",
    condition: (stats) => stats.citiesExplored >= 5
  },
  BORDER_BREAKER: {
    id: "border_breaker",
    name: "Border Breaker",
    emoji: "🏆",
    description: "Crossed 5 international borders",
    condition: (stats) => stats.countriesVisited >= 5
  }
};

class BadgeService {
  /**
   * Calculate user stats needed for badge evaluation
   * @param {string} userId - User ID
   * @returns {object} stats object with all necessary counts
   */
  static async getUserStats(userId) {
    try {
      // Fetch reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", userId);

      // Fetch posts
      const { data: posts } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId);

      // Fetch saved places
      const { data: savedPlaces } = await supabase
        .from("saved_places")
        .select("*")
        .eq("user_id", userId);

      // Fetch visit logs for unique destinations
      const { data: visitLogs } = await supabase
        .from("visit_logs")
        .select("place_id, location")
        .eq("user_id", userId)
        .eq("status", "completed");

      // Get unique destinations
      const uniqueDestinations = new Set();
      const countriesVisited = new Set();
      let citiesExplored = new Set();

      if (visitLogs && visitLogs.length > 0) {
        visitLogs.forEach(log => {
          if (log.location) {
            // location format: "City, Country"
            uniqueDestinations.add(log.location);
            const parts = log.location.split(",").map(p => p.trim());
            if (parts.length >= 2) {
              countriesVisited.add(parts[parts.length - 1]); // Last part is country
              citiesExplored.add(parts[0]); // First part is city
            }
          }
        });
      }

      // Count likes on posts
      const { data: likes } = await supabase
        .from("likes")
        .select("*", { count: "exact" })
        .in("post_id", (posts || []).map(p => p.id));

      const stats = {
        reviews: (reviews || []).length,
        posts: (posts || []).length,
        savedPlaces: (savedPlaces || []).length,
        uniqueDestinations: uniqueDestinations.size,
        countriesVisited: countriesVisited.size,
        citiesExplored: citiesExplored.size,
        postLikes: likes ? likes.length : 0
      };

      return stats;
    } catch (err) {
      console.error("BadgeService.getUserStats error:", err);
      return {
        reviews: 0,
        posts: 0,
        savedPlaces: 0,
        uniqueDestinations: 0,
        countriesVisited: 0,
        citiesExplored: 0,
        postLikes: 0
      };
    }
  }

  /**
   * Calculate and sync badges for a user
   * @param {string} userId - User ID
   * @returns {object} { earnedBadges, newBadges }
   */
  static async calculateAndSyncBadges(userId) {
    try {
      // Get user stats
      const stats = await this.getUserStats(userId);

      // Get user from DB
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      // Get existing badge IDs
      const existingBadgeIds = new Set((user.badges || []).map(b => b.id));

      // Evaluate which badges should be earned
      const newlyEarnedBadges = [];
      for (const badgeKey in BADGES) {
        const badge = BADGES[badgeKey];
        const shouldEarn = badge.condition(stats);

        if (shouldEarn && !existingBadgeIds.has(badge.id)) {
          newlyEarnedBadges.push({
            id: badge.id,
            earningDate: new Date(),
            isNew: true
          });
        }
      }

      // If there are new badges, add them to user and mark old ones as not new
      if (newlyEarnedBadges.length > 0) {
        // Mark all existing badges as not new
        user.badges = (user.badges || []).map(b => ({
          ...b,
          isNew: false
        }));

        // Add new badges
        user.badges = user.badges.concat(newlyEarnedBadges);
        await user.save();
      }

      // Return all earned badges (existing + newly earned) and which are new
      const allEarnedBadgeIds = new Set(
        (user.badges || []).map(b => b.id)
      );

      const earnedBadges = [];
      for (const badgeKey in BADGES) {
        const badge = BADGES[badgeKey];
        if (allEarnedBadgeIds.has(badge.id)) {
          const badgeData = user.badges.find(b => b.id === badge.id);
          earnedBadges.push({
            ...badge,
            earningDate: badgeData.earningDate,
            isNew: badgeData.isNew
          });
        }
      }

      // Sort by earning date (most recent first)
      earnedBadges.sort((a, b) => new Date(b.earningDate) - new Date(a.earningDate));

      return {
        earnedBadges,
        newBadges: newlyEarnedBadges,
        stats
      };
    } catch (err) {
      console.error("BadgeService.calculateAndSyncBadges error:", err);
      throw err;
    }
  }

  /**
   * Get all badge definitions
   */
  static getAllBadges() {
    const badgesArray = [];
    for (const badgeKey in BADGES) {
      badgesArray.push(BADGES[badgeKey]);
    }
    return badgesArray;
  }

  /**
   * Get a user's earned badges
   * @param {string} userId - User ID
   * @returns {array} array of earned badges with metadata
   */
  static async getUserBadges(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return [];

      const earnedBadges = [];
      const badgeIds = new Set((user.badges || []).map(b => b.id));

      for (const badgeKey in BADGES) {
        const badge = BADGES[badgeKey];
        if (badgeIds.has(badge.id)) {
          const badgeData = user.badges.find(b => b.id === badge.id);
          earnedBadges.push({
            ...badge,
            earningDate: badgeData.earningDate,
            isNew: badgeData.isNew
          });
        }
      }

      earnedBadges.sort((a, b) => new Date(b.earningDate) - new Date(a.earningDate));
      return earnedBadges;
    } catch (err) {
      console.error("BadgeService.getUserBadges error:", err);
      return [];
    }
  }
}

module.exports = BadgeService;
