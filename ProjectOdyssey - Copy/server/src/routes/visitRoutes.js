const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const VisitLogModel = require("../models/VisitLog");
const VisitTrackerService = require("../services/visitTracker");
const GeofenceService = require("../services/geofenceService");
const VisitLog = require("../models/autoVisitLog");
const supabase = require("../config/supabaseClient");
const GamificationService = require("../services/GamificationService");

/**
 * VISIT TRACKING API ROUTES
 * 
 * Endpoints:
 * POST   /api/visits/check-in           - Start tracking a visit
 * POST   /api/visits/check-out          - End tracking a visit
 * GET    /api/visits/logs/:itineraryId  - Fetch all visits for trip
 * GET    /api/visits/current/:itineraryId - Get active visit
 * PUT    /api/visits/:visitId           - Update visit (rating, notes)
 * DELETE /api/visits/:visitId           - Skip place
 * GET    /api/visits/progress/:itineraryId - Get progress stats
 * GET    /api/visits/summary/:itineraryId  - Get trip summary
 * GET    /api/visits/user              - Get user's all visits
 */

// Middleware to protect all routes
router.use(authMiddleware);

/**
 * POST /api/visits/check-in
 * Start tracking a visit at a place
 * 
 * Request body:
 * {
 *   itineraryId: string (UUID),
 *   placeId: string,
 *   placeName: string,
 *   category: string (optional),
 *   location: { lat: number, lng: number, accuracy?: number },
 *   expectedDuration: number (optional, in seconds)
 * }
 */

router.post("/geofence-check", authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, itineraryId } = req.body;
    const userId = req.user.id;

    if (!latitude || !longitude || !itineraryId) {
      return res.status(400).json({ error: "Missing coordinates or itinerary" });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const geofenceStatus = await GeofenceService.checkGeofenceStatus(
      userId,
      latitude,
      longitude,
      itineraryId
    );

    // If within geofence and auto-checkin enabled, perform auto check-in
    if (geofenceStatus.isInGeofence) {
      const settings = await GeofenceService.getUserGeofenceSettings(userId);
      if (settings.auto_checkin) {
        const checkInResult = await GeofenceService.autoCheckIn(
          userId,
          itineraryId,
          geofenceStatus.place,
          geofenceStatus.distance,
          { latitude, longitude }
        );
        return res.json({ ...geofenceStatus, ...checkInResult });
      }
    }

    res.json(geofenceStatus);
  } catch (error) {
    console.error("Geofence check error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/check-in", async (req, res) => {
  try {
    const { itineraryId, placeId, placeName, category, location, expectedDuration } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!itineraryId || !placeId || !placeName || !location) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: itineraryId, placeId, placeName, location",
      });
    }

    // Call service
    const result = await VisitTrackerService.handleCheckIn({
      userId,
      itineraryId,
      placeId,
      placeName,
      category,
      location,
      expectedDuration,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("POST /check-in error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/visits/check-out
 * End tracking a visit
 * 
 * Request body:
 * {
 *   visitId: string (UUID),
 *   location: { lat: number, lng: number, accuracy?: number } (optional),
 *   userRating: number (1-5, optional),
 *   notes: string (optional),
 *   photos: string[] (optional, array of URLs)
 * }
 */
router.post("/check-out", async (req, res) => {
  try {
    const { visitId, location, userRating, notes, photos } = req.body;

    if (!visitId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: visitId",
      });
    }

    // Call service
    const result = await VisitTrackerService.handleCheckOut(visitId, {
      location,
      userRating,
      notes,
      photos,
    });

    // Non-blocking streak + XP sync after checkout
    const userId = req.user?.id;
    if (userId) {
      GamificationService.calculateAndSyncStreak(userId).catch(console.error);
      GamificationService.calculateAndSyncXP(userId).catch(console.error);
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("POST /check-out error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/visits/skip
 * Skip a place in the itinerary
 */
router.post("/skip", authMiddleware, async (req, res) => {
  try {
    const { itineraryId, placeId, placeName } = req.body;
    const userId = req.user.id;

    if (!itineraryId || !placeId || !placeName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await GeofenceService.skipPlace(userId, itineraryId, placeId, placeName);

    res.json(result);
  } catch (error) {
    console.error("Skip place error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/visits/logs/:itineraryId
 * Get all visit logs for an itinerary
 * 
 * Query params: page=1, pageSize=50
 */
router.get("/logs/:itineraryId", async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const { page = 1, pageSize = 50 } = req.query;

    const visits = await VisitLogModel.getItineraryVisits(itineraryId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    return res.status(200).json({
      success: true,
      data: visits,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: visits.length,
      },
    });
  } catch (err) {
    console.error("GET /logs/:itineraryId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/visits/current/:itineraryId
 * Get currently active visit for an itinerary
 */
router.get("/current/:itineraryId", async (req, res) => {
  try {
    const { itineraryId } = req.params;

    const currentVisit = await VisitLogModel.getCurrentVisit(itineraryId);

    if (!currentVisit) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No active visit",
      });
    }

    return res.status(200).json({
      success: true,
      data: currentVisit,
    });
  } catch (err) {
    console.error("GET /current/:itineraryId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/visits/stats/:itineraryId
 * Get visit statistics for an itinerary
 */
router.get("/stats/:itineraryId", authMiddleware, async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const userId = req.user.id;

    // Validate itinerary ownership
    const { data: itinerary, error: itineraryError } = await supabase
      .from("itineraries")
      .select("user_id")
      .eq("id", itineraryId)
      .single();

    if (itineraryError || !itinerary || itinerary.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const stats = await VisitLog.getStats(itineraryId);

    res.json(stats);
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/visits/progress/:itineraryId
 * Get visit progress statistics for an itinerary
 */
router.get("/progress/:itineraryId", async (req, res) => {
  try {
    const { itineraryId } = req.params;

    const progress = await VisitLogModel.getProgress(itineraryId);

    return res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (err) {
    console.error("GET /progress/:itineraryId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/visits/summary/:itineraryId
 * Get comprehensive trip summary with all visits
 */
router.get("/summary/:itineraryId", async (req, res) => {
  try {
    const { itineraryId } = req.params;

    const summary = await VisitLogModel.getTripSummary(itineraryId);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.error("GET /summary/:itineraryId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});



/**
 * GET /api/visits/user
 * Get all visits for logged-in user
 * 
 * Query params: page=1, pageSize=50
 */
router.get("/user", async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 50 } = req.query;

    const visits = await VisitLogModel.getUserVisits(userId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    return res.status(200).json({
      success: true,
      data: visits,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: visits.length,
      },
    });
  } catch (err) {
    console.error("GET /user error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/visits/user/stats
 * Get visit statistics aggregated by country for logged-in user
 */
router.get("/user/stats", async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await VisitLogModel.getUserVisitStats(userId);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("GET /user/stats error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});


/**
 * PUT /api/visits/:visitId
 * Update visit with feedback (rating, notes, photos)
 * 
 * Request body:
 * {
 *   userRating: number (1-5, optional),
 *   notes: string (optional),
 *   photos: string[] (optional)
 * }
 */
router.put("/:visitId", async (req, res) => {
  try {
    const { visitId } = req.params;
    const { userRating, notes, photos } = req.body;

    const result = await VisitTrackerService.addFeedback(visitId, {
      userRating,
      notes,
      photos,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("PUT /:visitId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * DELETE /api/visits/:visitId
 * Skip a place (mark visit as skipped)
 * 
 * Request body (optional):
 * {
 *   reason: string (optional)
 * }
 */
router.delete("/:visitId", async (req, res) => {
  try {
    const { visitId } = req.params;
    const { reason } = req.body;

    const result = await VisitTrackerService.skipPlace(visitId, reason);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("DELETE /:visitId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * DELETE /api/visits/:visitLogId
 * Delete a visit log
 */
router.delete("/:visitLogId", authMiddleware, async (req, res) => {
  try {
    const { visitLogId } = req.params;
    const userId = req.user.id;

    // Validate ownership
    const visit = await VisitLog.getById(visitLogId);
    if (visit.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await VisitLog.delete(visitLogId);

    res.json({ success: true, message: "Visit log deleted" });
  } catch (error) {
    console.error("Delete visit error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/visits/configure-geofence
 * User can customize geofence radius (50m - 500m)
 */
router.post("/configure-geofence", authMiddleware, async (req, res) => {
  try {
    const { radius, autoCheckin, autoCheckout } = req.body;
    const userId = req.user.id;

    if (!radius || radius < 50 || radius > 500) {
      return res.status(400).json({ error: "Radius must be between 50-500 meters" });
    }

    // Try to update existing, or create if doesn't exist
    const { data: existing } = await supabase
      .from("geofence_settings")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from("geofence_settings")
        .update({
          geofence_radius: radius,
          auto_checkin: autoCheckin !== false,
          auto_checkout: autoCheckout !== false,
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    } else {
      const { data, error } = await supabase
        .from("geofence_settings")
        .insert({
          user_id: userId,
          geofence_radius: radius,
          auto_checkin: autoCheckin !== false,
          auto_checkout: autoCheckout !== false,
        })
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    }
  } catch (error) {
    console.error("Configure geofence error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/visits/settings
 * Get user's current geofence settings
 */
router.get("/settings", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await GeofenceService.getUserGeofenceSettings(userId);

    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/visits/activity/last-6-months
 * Get count of completed VisitLogs per month for the last 6 months
 */
router.get("/activity/last-6-months", async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Fetching activity for user:", userId);

    // Calculate date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    console.log("Fetching visits from:", sixMonthsAgo);

    // Query completed visit logs for the user from the last 6 months
    // Using exited_at (when user left location) instead of checked_out_at
    const { data: visits, error } = await supabase
      .from("visit_logs")
      .select("exited_at")
      .eq("user_id", userId)
      .eq("status", "completed") // Only completed visits
      .not("exited_at", "is", null) // Must have exited
      .gte("exited_at", sixMonthsAgo.toISOString())
      .order("exited_at", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    console.log("Found visits:", visits?.length || 0);

    // Group visits by month
    const monthlyData = {};

    // Initialize all months in the last 6 months with 0 visits
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleString("default", { month: "short", year: "numeric" });
      monthlyData[monthKey] = 0;
    }

    // Count visits per month
    if (visits && visits.length > 0) {
      visits.forEach((visit) => {
        const visitDate = new Date(visit.exited_at);
        const monthKey = visitDate.toLocaleString("default", { month: "short", year: "numeric" });
        if (monthlyData.hasOwnProperty(monthKey)) {
          monthlyData[monthKey]++;
        }
      });
    }

    // Convert to array format for the chart
    const chartData = Object.entries(monthlyData).map(([month, visits]) => ({
      month,
      visits,
    }));

    console.log("Returning chart data:", chartData);

    return res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("GET /activity/last-6-months error:", error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
