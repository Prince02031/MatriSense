// src/routes/tripRoutes.js

const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const ItineraryModel = require("../models/Itinerary");
const TripMemoryModel = require("../models/TripMemory");
const VisitLogModel = require("../models/VisitLog");

/**
 * POST /api/trips/save
 * Save a new itinerary (moves from Stage 2 → Stage 3)
 * 
 * Body:
 * {
 *   tripName: "My Bangladesh Trip",
 *   selectedPlaces: [{ name, category, ... }],
 *   selectedItinerary: { title, schedule, estimatedCost },
 *   status: "draft" | "confirmed"
 * }
 */
router.post("/save", authMiddleware, async (req, res) => {
  try {
    const { tripName, selectedPlaces, selectedItinerary, status } = req.body;
    const userId = req.user.id; // From authMiddleware

    console.log("POST /api/trips/save called with:", { tripName, selectedPlaces, userId });

    if (!tripName) {
      return res.status(400).json({ error: "tripName is required" });
    }

    if (!selectedPlaces || !Array.isArray(selectedPlaces)) {
      return res.status(400).json({ error: "selectedPlaces must be an array" });
    }

    const itinerary = await ItineraryModel.createItinerary(userId, {
      tripName,
      selectedPlaces,
      selectedItinerary: selectedItinerary || null,
      status: status || "draft",
    });

    console.log("Itinerary saved successfully:", itinerary);

    return res.status(201).json({
      success: true,
      message: "Itinerary saved successfully",
      data: itinerary,
    });

  } catch (err) {
    console.error("POST /save error:", err);
    return res.status(500).json({ error: err.message || "Failed to save itinerary" });
  }
});

/**
 * POST /api/trips/collection/add
 * Add a place to "My Collection" (or create if not exists)
 */
router.post("/collection/add", authMiddleware, async (req, res) => {
  try {
    const { place } = req.body;
    const userId = req.user.id;

    if (!place || !place.name) {
      return res.status(400).json({ error: "Place data is required" });
    }

    // 1. Find existing "My Collection" itinerary — use unfiltered fetch so the collection row is visible
    const allItineraries = await ItineraryModel.getUserItinerariesUnfiltered(userId);
    let collectionTrip = allItineraries.find(t => t.status === 'collection');

    if (collectionTrip) {
      // 2. Append to existing
      const currentPlaces = Array.isArray(collectionTrip.selected_places) ? collectionTrip.selected_places : [];

      // Check for duplicates (by name or id)
      const exists = currentPlaces.some(p => p.name === place.name || (p.id && p.id === place.id));

      if (!exists) {
        const updatedPlaces = [...currentPlaces, place];
        await ItineraryModel.updateItinerary(collectionTrip.id, {
          selectedPlaces: updatedPlaces
        });
        return res.json({ success: true, message: "Added to collection", isNew: false });
      } else {
        return res.json({ success: true, message: "Already in collection", isNew: false });
      }

    } else {
      // 3. Create new "My Collection"
      await ItineraryModel.createItinerary(userId, {
        tripName: "My Collection",
        selectedPlaces: [place],
        status: "collection",
        selectedItinerary: { title: "My Personal Collection", schedule: [] }
      });
      return res.status(201).json({ success: true, message: "Collection created and place added", isNew: true });
    }

  } catch (err) {
    console.error("POST /collection/add error:", err);
    return res.status(500).json({ error: err.message || "Failed to add to collection" });
  }
});

/**
 * GET /api/trips
 * Get all itineraries for logged-in user
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itineraries = await ItineraryModel.getUserItineraries(userId);

    return res.json({
      success: true,
      data: itineraries,
    });

  } catch (err) {
    console.error("GET / error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch itineraries" });
  }
});

/**
 * GET /api/trips/stats/summary
 * Get user trip statistics for profile/stats page
 * MUST be before /:id to avoid Express matching 'stats' as an itinerary ID
 */
router.get("/stats/summary", authMiddleware, async (req, res) => {
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

/**
 * GET /api/trips/timeline
 * Get all trips for timeline view (past and upcoming)
 * MUST be before /:id to avoid Express matching 'timeline' as an itinerary ID
 */
router.get("/timeline", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Get all user itineraries
    const itineraries = await ItineraryModel.getUserItineraries(userId);

    // Try to get saved trip memories (now returns flat rows, no join)
    let memoriesMap = {};
    try {
      const timelineTrips = await TripMemoryModel.getUserTimelineTrips(userId);
      timelineTrips.forEach((row) => {
        memoriesMap[row.itinerary_id] = row;
      });
    } catch (err) {
      console.warn("Warning: Could not fetch trip memories:", err.message);
    }

    // Fetch all visit_logs for this user grouped by itinerary_id
    let visitsByItinerary = {};
    try {
      const allVisits = await VisitLogModel.getUserVisits(userId, { pageSize: 500 });
      allVisits.forEach((v) => {
        if (!visitsByItinerary[v.itinerary_id]) visitsByItinerary[v.itinerary_id] = [];
        visitsByItinerary[v.itinerary_id].push(v);
      });
    } catch (err) {
      console.warn("Warning: Could not fetch visit logs:", err.message);
    }

    // Build enriched trip objects
    const enrichedTrips = itineraries.map((itin) => {
      const memory = memoriesMap[itin.id] || null;
      const tripStartDate = itin.trip_start_date ? new Date(itin.trip_start_date) : new Date(itin.created_at);
      const tripEndDate = itin.trip_end_date ? new Date(itin.trip_end_date) : tripStartDate;
      const isCompleted = tripEndDate <= now;

      // Actual visited places from visit_logs (completed status preferred, else any)
      const itinVisits = visitsByItinerary[itin.id] || [];
      const visitedPlaces = itinVisits
        .filter((v) => v.status === "completed" || v.status === "in_progress")
        .map((v) => ({ name: v.place_name, id: v.place_id, status: v.status }));

      return {
        id: itin.id,
        name: itin.trip_name,
        startDate: tripStartDate,
        endDate: tripEndDate,
        status: itin.trip_status || itin.status,
        isCompleted,
        image: extractTripImage(itin),
        memory,
        // visitedPlaces: actual places from visit_logs
        visitedPlaces,
        // selectedPlaces: the originally planned places (kept for fallback)
        selectedPlaces: itin.selected_places || [],
        itineraryData: itin.selected_itinerary || null,
      };
    });

    const pastTrips = enrichedTrips
      .filter(t => t.isCompleted)
      .sort((a, b) => b.startDate - a.startDate);

    const upcomingTrips = enrichedTrips
      .filter(t => !t.isCompleted)
      .sort((a, b) => a.startDate - b.startDate);

    console.log(`📊 Timeline for user ${userId}: ${pastTrips.length} past, ${upcomingTrips.length} upcoming`);

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
 * GET /api/trips/:id
 * Get single itinerary by ID
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const itinerary = await ItineraryModel.getItineraryById(id);

    // Verify ownership
    if (itinerary.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    return res.json({
      success: true,
      data: itinerary,
    });

  } catch (err) {
    console.error("GET /:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch itinerary" });
  }
});

/**
 * PUT /api/trips/:id
 * Update itinerary (edit places, change status, regenerate)
 * 
 * Body: Partial update
 * {
 *   tripName?: "Updated Name",
 *   selectedPlaces?: [...],
 *   selectedItinerary?: {...},
 *   status?: "confirmed"
 * }
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { tripName, selectedPlaces, selectedItinerary, status, trip_status } = req.body;

    // Verify ownership first
    const existing = await ItineraryModel.getItineraryById(id);
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await ItineraryModel.updateItinerary(id, {
      tripName,
      selectedPlaces,
      selectedItinerary,
      status,
      trip_status,
    });

    return res.json({
      success: true,
      message: "Itinerary updated successfully",
      data: updated,
    });

  } catch (err) {
    console.error("PUT /:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to update itinerary" });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete itinerary
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership first
    const existing = await ItineraryModel.getItineraryById(id);
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await ItineraryModel.deleteItinerary(id);

    return res.json({
      success: true,
      message: "Itinerary deleted successfully",
    });

  } catch (err) {
    console.error("DELETE /:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete itinerary" });
  }
});

/**
 * GET /api/trips/:itineraryId/memories
 * Get trip memory/diary entry
 */
router.get("/:itineraryId/memories", authMiddleware, async (req, res) => {
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
router.post("/:itineraryId/memories", authMiddleware, async (req, res) => {
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

    // updateMemory now uses upsert — no need for a separate getOrCreate
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
router.post("/:itineraryId/memories/photos", authMiddleware, async (req, res) => {
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
router.delete("/:itineraryId/memories/photos/:photoUrl", authMiddleware, async (req, res) => {
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

// Note: /stats/summary route moved above /:id — see line ~127

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
