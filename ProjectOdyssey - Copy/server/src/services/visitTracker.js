const VisitLogModel = require("../models/VisitLog");

/**
 * VISIT TRACKER SERVICE
 * Business logic for visit tracking, geofencing, and location validation
 * 
 * Handles:
 * - Check-in/check-out logic
 * - Time calculation and visit completion
 * - Location validation and geofencing
 * - Dynamic radius determination
 */

// Constants
const GEOFENCE_RADIUS_BY_CATEGORY = {
  restaurant: 50,
  museum: 100,
  park: 150,
  landmark: 100,
  hotel: 75,
  shop: 50,
  beach: 200,
  airport: 100,
  default: 100,
};

const VISIT_COMPLETION_THRESHOLD = 0.7; // 70% of expected duration
const DEFAULT_EXPECTED_DURATION = 3600; // 1 hour in seconds

class VisitTrackerService {
  /**
   * Handle check-in (start visit)
   * @param {object} checkInData - {userId, itineraryId, placeId, placeName, category, location, expectedDuration}
   * @returns {object} Created visit log
   */
  static async handleCheckIn(checkInData) {
    try {
      const { userId, itineraryId, placeId, placeName, category, location, expectedDuration } = checkInData;

      // Validate required fields
      if (!userId || !itineraryId || !placeId || !placeName) {
        throw new Error("Missing required check-in fields: userId, itineraryId, placeId, placeName");
      }

      // Validate location
      this.validateLocation(location);

      // Check if user already has an active visit for this place
      const hasActive = await VisitLogModel.hasActiveVisit(userId, placeId);
      if (hasActive) {
        throw new Error(`User already has an active visit for place: ${placeId}`);
      }

      // Determine expected duration
      const finalExpectedDuration = expectedDuration || DEFAULT_EXPECTED_DURATION;

      // Create visit log
      const visitLog = await VisitLogModel.createVisitLog(
        userId,
        itineraryId,
        placeId,
        placeName,
        location,
        finalExpectedDuration
      );

      return {
        success: true,
        message: `Check-in successful for ${placeName}`,
        visit: visitLog,
        expectedDuration: finalExpectedDuration,
      };
    } catch (err) {
      console.error("VisitTrackerService.handleCheckIn error:", err);
      throw err;
    }
  }

  /**
   * Handle check-out (end visit)
   * @param {string} visitId - Visit log UUID
   * @param {object} exitData - {location, userRating, notes, photos}
   * @returns {object} Updated visit log with completion status
   */
  static async handleCheckOut(visitId, exitData) {
    try {
      const { location, userRating, notes, photos } = exitData || {};

      // Validate exit location
      if (location) {
        this.validateLocation(location);
      }

      // Fetch current visit
      const currentVisit = await VisitLogModel.getVisitLog(visitId);
      if (!currentVisit) {
        throw new Error(`Visit not found: ${visitId}`);
      }

      if (currentVisit.status !== "in_progress") {
        throw new Error(`Cannot check out: visit status is ${currentVisit.status}`);
      }

      // Calculate time spent
      const timeSpent = this.calculateTimeSpent(currentVisit.entered_at, new Date().toISOString());

      // Determine completion status
      const isComplete = this.isVisitComplete(timeSpent, currentVisit.expected_duration);

      // Prepare update data
      const updateData = {
        exited_at: new Date().toISOString(),
        time_spent: timeSpent,
        exit_location: location || null,
        status: isComplete ? "completed" : "pending",
      };

      // Add optional fields
      if (userRating !== undefined && userRating !== null) {
        updateData.user_rating = userRating;
      }
      if (notes) {
        updateData.notes = notes;
      }
      if (photos && Array.isArray(photos)) {
        updateData.photos = photos;
      }

      // Update visit log
      const updatedVisit = await VisitLogModel.updateVisitLog(visitId, updateData);

      return {
        success: true,
        message: `Check-out successful. Visit marked as ${updateData.status}`,
        visit: updatedVisit,
        timeSpent,
        isComplete,
        thresholdMet: isComplete,
      };
    } catch (err) {
      console.error("VisitTrackerService.handleCheckOut error:", err);
      throw err;
    }
  }

  /**
   * Calculate time spent in seconds between two timestamps
   * @param {string} enteredAt - ISO 8601 timestamp
   * @param {string} exitedAt - ISO 8601 timestamp
   * @returns {number} Time spent in seconds
   */
  static calculateTimeSpent(enteredAt, exitedAt) {
    try {
      const entered = new Date(enteredAt);
      const exited = new Date(exitedAt);
      const diffMs = exited - entered;
      return Math.max(0, Math.round(diffMs / 1000)); // Convert to seconds
    } catch (err) {
      console.error("VisitTrackerService.calculateTimeSpent error:", err);
      throw new Error("Invalid timestamp format");
    }
  }

  /**
   * Determine if visit meets completion threshold
   * @param {number} timeSpent - Time spent in seconds
   * @param {number} expectedDuration - Expected duration in seconds
   * @returns {boolean} True if >= threshold (default 70%)
   */
  static isVisitComplete(timeSpent, expectedDuration) {
    if (!expectedDuration) {
      return timeSpent > 0; // Any time at location = complete
    }
    return (timeSpent / expectedDuration) >= VISIT_COMPLETION_THRESHOLD;
  }

  /**
   * Validate GPS coordinates
   * @param {object} location - {lat, lng, accuracy}
   * @throws {Error} If validation fails
   */
  static validateLocation(location) {
    if (!location) {
      throw new Error("Location is required");
    }

    const { lat, lng, accuracy } = location;

    if (typeof lat !== "number" || lat < -90 || lat > 90) {
      throw new Error("Invalid latitude: must be between -90 and 90");
    }

    if (typeof lng !== "number" || lng < -180 || lng > 180) {
      throw new Error("Invalid longitude: must be between -180 and 180");
    }

    if (accuracy !== undefined && accuracy !== null && (typeof accuracy !== "number" || accuracy < 0)) {
      throw new Error("Invalid accuracy: must be a positive number");
    }
  }

  /**
   * Determine geofence radius based on place category
   * @param {string} category - Place category
   * @returns {number} Radius in meters
   */
  static determineGeofenceRadius(category) {
    return GEOFENCE_RADIUS_BY_CATEGORY[category?.toLowerCase()] || GEOFENCE_RADIUS_BY_CATEGORY.default;
  }

  /**
   * Check if user is within geofence
   * @param {object} userLocation - {lat, lng}
   * @param {object} geofenceCenter - {lat, lng}
   * @param {number} radius - Radius in meters
   * @returns {boolean} True if within geofence
   */
  static isWithinGeofence(userLocation, geofenceCenter, radius) {
    try {
      const distance = this.calculateDistance(
        userLocation.lat,
        userLocation.lng,
        geofenceCenter.lat,
        geofenceCenter.lng
      );
      return distance <= radius;
    } catch (err) {
      console.error("VisitTrackerService.isWithinGeofence error:", err);
      return false;
    }
  }

  /**
   * Calculate distance between two GPS coordinates (Haversine formula)
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in meters
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get geofence recommendations based on place location
   * @param {object} placeLocation - {lat, lng}
   * @param {string} category - Place category
   * @returns {object} Geofence config
   */
  static getGeofenceConfig(placeLocation, category) {
    return {
      latitude: placeLocation.lat,
      longitude: placeLocation.lng,
      radius: this.determineGeofenceRadius(category),
      status: "active",
      place_category: category || "default",
    };
  }

  /**
   * Add rating and notes to completed visit
   * @param {string} visitId - Visit log UUID
   * @param {object} feedbackData - {userRating, notes, photos}
   * @returns {object} Updated visit log
   */
  static async addFeedback(visitId, feedbackData) {
    try {
      const { userRating, notes, photos } = feedbackData;

      const visit = await VisitLogModel.getVisitLog(visitId);
      if (!visit) {
        throw new Error(`Visit not found: ${visitId}`);
      }

      const updateData = {};

      if (userRating !== undefined && userRating !== null) {
        if (userRating < 1 || userRating > 5) {
          throw new Error("Rating must be between 1 and 5");
        }
        updateData.user_rating = userRating;
      }

      if (notes) {
        updateData.notes = notes;
      }

      if (photos && Array.isArray(photos)) {
        updateData.photos = photos;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error("No feedback data provided");
      }

      const updatedVisit = await VisitLogModel.updateVisitLog(visitId, updateData);

      return {
        success: true,
        message: "Feedback added successfully",
        visit: updatedVisit,
      };
    } catch (err) {
      console.error("VisitTrackerService.addFeedback error:", err);
      throw err;
    }
  }

  /**
   * Skip a place (mark visit as skipped)
   * @param {string} visitId - Visit log UUID
   * @param {string} reason - Reason for skipping
   * @returns {object} Updated visit log
   */
  static async skipPlace(visitId, reason) {
    try {
      const visit = await VisitLogModel.getVisitLog(visitId);
      if (!visit) {
        throw new Error(`Visit not found: ${visitId}`);
      }

      const updateData = {
        status: "skipped",
        notes: reason || "Skipped by user",
      };

      // If already checked in, calculate partial time
      if (visit.entered_at && !visit.exited_at) {
        updateData.exited_at = new Date().toISOString();
        updateData.time_spent = this.calculateTimeSpent(visit.entered_at, updateData.exited_at);
      }

      const updatedVisit = await VisitLogModel.updateVisitLog(visitId, updateData);

      return {
        success: true,
        message: "Place skipped successfully",
        visit: updatedVisit,
      };
    } catch (err) {
      console.error("VisitTrackerService.skipPlace error:", err);
      throw err;
    }
  }
}

module.exports = VisitTrackerService;
