/**
 * TRIP MEMORIES & TIMELINE ROUTES
 * Endpoints for managing trip memories, ratings, photos, and timeline data
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const TripMemoryModel = require("../models/TripMemory");
const ItineraryModel = require("../models/Itinerary");

// Protect all routes with auth
router.use(authMiddleware);

/**
 * GET /api/trips/timeline
 * Get all trips for timeline view (past and upcoming)
 */
router.get("/timeline", async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Get all user itineraries with memory data
    const itineraries = await ItineraryModel.getUserItineraries(userId);
    const timelineTrips = await TripMemoryModel.getUserTimelineTrips(userId);

    // Map itineraries with memory data
    const enrichedTrips = itineraries.map((itin) => {
      const memory = timelineTrips.find(t => t.itinerary_id === itin.id);
      const tripStartDate = itin.trip_start_date ? new Date(itin.trip_start_date) : new Date(itin.created_at);
      const tripEndDate = itin.trip_end_date ? new Date(itin.trip_end_date) : tripStartDate;
      
      const isCompleted = tripEndDate <= now;

      return {
        id: itin.id,
        name: itin.trip_name,
        startDate: tripStartDate,
        endDate: tripEndDate,
        status: itin.trip_status || itin.status,
        isCompleted,
        image: extractTripImage(itin),
        memory: memory || null,
        selectedPlaces: itin.selected_places || [],
        itineraryData: itin.selected_itinerary || null,
      };
    });

    // Split into past and upcoming
    const pastTrips = enrichedTrips
      .filter(t => t.isCompleted)
      .sort((a, b) => b.startDate - a.startDate);
    
    const upcomingTrips = enrichedTrips
      .filter(t => !t.isCompleted)
      .sort((a, b) => a.startDate - b.startDate);

    res.json({
      success: true,
      data: {
        pastTrips,
        upcomingTrips,
        stats: {
          totalTrips: enrichedTrips.length,
          completedTrips: pastTrips.length,
          upcomingTrips: upcomingTrips.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/trips/:itineraryId/memories
 * Get trip memory/diary entry
 */
router.get("/:itineraryId/memories", async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const userId = req.user.id;

    const memory = await TripMemoryModel.getByItineraryId(itineraryId, userId);

    if (!memory) {
      // Create new memory record
      const newMemory = await TripMemoryModel.getOrCreate(userId, itineraryId);
      return res.json({ success: true, data: newMemory });
    }

    res.json({ success: true, data: memory });
  } catch (error) {
    console.error("Error fetching memory:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/trips/:itineraryId/memories
 * Create or update trip memory
 */
router.post("/:itineraryId/memories", async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const userId = req.user.id;
    const {
      mood,
      favoriteMoment,
      tripRating,
      wouldRevisit,
      visitedPlaces,
      tripDescription,
      badgesEarned,
    } = req.body;

    // Ensure record exists
    await TripMemoryModel.getOrCreate(userId, itineraryId);

    // Update memory
    const updated = await TripMemoryModel.updateMemory(
      itineraryId,
      userId,
      {
        mood,
        favoriteMoment,
        tripRating,
        wouldRevisit,
        visitedPlaces,
        tripDescription,
        badgesEarned,
      }
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating memory:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/trips/:itineraryId/memories/photos
 * Add memory photos (up to 3)
 */
router.post("/:itineraryId/memories/photos", async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const userId = req.user.id;
    const { photos } = req.body; // Array of photo URLs

    if (!Array.isArray(photos)) {
      return res.status(400).json({
        success: false,
        message: "Photos must be an array",
      });
    }

    // Ensure record exists
    await TripMemoryModel.getOrCreate(userId, itineraryId);

    // Add photos
    const updated = await TripMemoryModel.addMemoryPhotos(
      itineraryId,
      userId,
      photos
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error adding photos:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/trips/:itineraryId/memories/photos/:photoUrl
 * Remove a specific memory photo
 */
router.delete("/:itineraryId/memories/photos/:photoUrl", async (req, res) => {
  try {
    const { itineraryId, photoUrl } = req.params;
    const userId = req.user.id;
    const decodedUrl = decodeURIComponent(photoUrl);

    const updated = await TripMemoryModel.removeMemoryPhoto(
      itineraryId,
      userId,
      decodedUrl
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error removing photo:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/trips/stats
 * Get user trip statistics for profile/stats page
 */
router.get("/stats/summary", async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await TripMemoryModel.getUserTripStats(userId);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Helper function to extract image from itinerary
function extractTripImage(itinerary) {
  if (Array.isArray(itinerary.selected_places)) {
    for (const place of itinerary.selected_places) {
      if (place?.images?.[0]) return place.images[0];
      if (place?.image) return place.image;
    }
  }

  const schedule = itinerary.selected_itinerary?.schedule;
  if (Array.isArray(schedule)) {
    for (const dayObj of schedule) {
      const items = dayObj?.items || [];
      for (const item of items) {
        if (item?.images?.[0]) return item.images[0];
        if (item?.image) return item.image;
      }
    }
  }

  return null;
}

module.exports = router;
