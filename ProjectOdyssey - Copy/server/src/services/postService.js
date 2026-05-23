const Post = require("../models/Post");
const User = require("../models/User");

/**
 * Auto-generate a post when a trip is completed
 * @param {string} userId - The ID of the user who completed the trip
 * @param {object} tripData - Trip information from Supabase
 * @returns {Promise<object>} The created post
 */
async function createAutoPostForTrip(userId, tripData) {
  try {
    // Get user information
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Extract trip details
    const { id: tripId, trip_name, selected_places, selected_itinerary } = tripData;

    // Format places list
    const placesVisited = selected_places || [];
    const placeNames = placesVisited.map(p => p.name || p.place_name).filter(Boolean);

    // Calculate trip duration if available
    let tripDuration = "";
    if (selected_itinerary && selected_itinerary.schedule) {
      const days = selected_itinerary.schedule.length;
      tripDuration = days > 1 ? `${days}-day` : "1-day";
    }

    // Create auto-generated content in BlockNote format
    const content = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            {
              type: "text",
              text: `${user.username} just completed a trip to ${trip_name}! 🎉`
            }
          ]
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `${tripDuration ? `This ${tripDuration} adventure ` : "This trip "}included visits to ${placeNames.length} amazing ${placeNames.length === 1 ? "place" : "places"}${placeNames.length > 0 ? ":" : "."}`
            }
          ]
        }
      ]
    };

    // Add places as bullet list if available
    if (placeNames.length > 0) {
      content.content.push({
        type: "bulletList",
        content: placeNames.slice(0, 5).map(placeName => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: placeName }]
            }
          ]
        }))
      });

      // Add "and more..." if there are more than 5 places
      if (placeNames.length > 5) {
        content.content.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `...and ${placeNames.length - 5} more!`
            }
          ]
        });
      }
    }

    // Add estimated cost if available
    if (selected_itinerary && selected_itinerary.estimatedCost) {
      content.content.push({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `💰 Total cost: ${selected_itinerary.estimatedCost}`
          }
        ]
      });
    }

    // Create the post
    const post = await Post.create({
      authorId: userId,
      type: "auto",
      content: content,
      tripId: tripId,
      tripName: trip_name
    });

    await post.populate("author", "username email");

    console.log(`✅ Auto-generated post created for trip: ${trip_name}`);
    return post;

  } catch (error) {
    console.error("Error creating auto post:", error);
    throw error;
  }
}

/**
 * Create a simple auto-generated post (minimal version)
 * @param {string} userId - User ID
 * @param {string} tripId - Trip ID
 * @param {string} tripName - Trip name
 * @param {string} message - Custom message
 * @returns {Promise<object>} The created post
 */
async function createSimpleAutoPost(userId, tripId, tripName, message) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: message || `${user.username} completed a trip to ${tripName}!`
            }
          ]
        }
      ]
    };

    const post = await Post.create({
      authorId: userId,
      type: "auto",
      content: content,
      tripId: tripId,
      tripName: tripName
    });

    await post.populate("author", "username email");
    return post;

  } catch (error) {
    console.error("Error creating simple auto post:", error);
    throw error;
  }
}

/**
 * Create a manual blog post (helper for frontend)
 * @param {string} userId - User ID
 * @param {object} content - BlockNote content
 * @param {string} tripId - Optional trip ID
 * @param {string} tripName - Optional trip name
 * @returns {Promise<object>} The created post
 */
async function createBlogPost(userId, content, tripId = null, tripName = null) {
  try {
    const post = await Post.create({
      authorId: userId,
      type: "blog",
      content: content,
      tripId: tripId,
      tripName: tripName
    });

    await post.populate("author", "username email");
    return post;

  } catch (error) {
    console.error("Error creating blog post:", error);
    throw error;
  }
}

module.exports = {
  createAutoPostForTrip,
  createSimpleAutoPost,
  createBlogPost
};
