const supabase = require("../config/supabaseClient");
const GoogleMapsService = require("./googleMapsService");

/**
 * Geofence Service
 * Handles distance calculations, geofence checks, and auto check-in/out logic
 */
class GeofenceService {
  /**
   * Haversine formula: calculate distance between two points in meters
   */
  static haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get user's geofence settings
   */
  static async getUserGeofenceSettings(userId) {
    const { data, error } = await supabase
      .from("geofence_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      const { data: newSettings } = await supabase
        .from("geofence_settings")
        .insert({
          user_id: userId,
          geofence_radius: 100,
          auto_checkin: true,
          auto_checkout: true,
        })
        .select()
        .single();

      if (!newSettings) {
        return {
          user_id: userId,
          geofence_radius: 100,
          auto_checkin: true,
          auto_checkout: true,
        };
      }
      return newSettings;
    }
    return data;
  }

  /**
   * Check geofence status
   */
  static async checkGeofenceStatus(userId, userLat, userLon, itineraryId) {
    try {
      const settings = await this.getUserGeofenceSettings(userId);
      const radius = settings.geofence_radius || 100;

      const { data: itinerary, error: itineraryError } = await supabase
        .from("itineraries")
        .select("selected_places")
        .eq("id", itineraryId)
        .single();

      if (itineraryError || !itinerary) {
        throw new Error("Itinerary not found");
      }

      const places = itinerary.selected_places || [];
      if (places.length === 0) {
        return {
          isInGeofence: false,
          place: null,
          distance: null,
          radius,
          message: "No places in itinerary",
        };
      }

      let nearest = null;
      let minDistance = Infinity;

      for (const place of places) {
        let placeLat, placeLng;

        if (place.coordinates && place.coordinates.latitude && place.coordinates.longitude) {
          placeLat = place.coordinates.latitude;
          placeLng = place.coordinates.longitude;
        } else if (place.placeId) {
          // Fallback: Fetch from Google Maps if missing
          try {
            // We can use a simpler cache check or just call details.
            // GoogleMapsService.getPlaceDetails handles caching internally.
            const details = await GoogleMapsService.getPlaceDetails(place.placeId);
            if (details && details.coordinates) {
              placeLat = details.coordinates.lat;
              placeLng = details.coordinates.lng;
            }
          } catch (err) {
            console.error(`Failed to fetch coords for place ${place.placeId}:`, err.message);
            continue;
          }
        }

        if (!placeLat || !placeLng) continue;

        const distance = this.haversineMeters(
          userLat,
          userLon,
          placeLat,
          placeLng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = { place, distance };
        }

        if (distance <= radius) {
          return {
            isInGeofence: true,
            place,
            distance,
            radius,
            nearest: { place: place.name, distance },
          };
        }
      }

      return {
        isInGeofence: false,
        place: null,
        distance: minDistance === Infinity ? null : minDistance,
        radius,
        nearest: nearest ? { place: nearest.place.name, distance: nearest.distance } : null,
      };
    } catch (error) {
      console.error("Geofence status check error:", error);
      throw error;
    }
  }

  /**
   * Auto check-in
   */
  static async autoCheckIn(userId, itineraryId, place, distance, location) {
    try {
      const { data: existingVisit } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("place_id", place.id)
        .eq("itinerary_id", itineraryId)
        .eq("status", "in_progress")
        .single();

      if (existingVisit) {
        return {
          action: "already_in_progress",
          visitLog: existingVisit,
          isNewCheckIn: false,
        };
      }

      const { data: newVisit, error: insertError } = await supabase
        .from("visit_logs")
        .insert({
          user_id: userId,
          itinerary_id: itineraryId,
          place_id: place.id,
          place_name: place.name,
          status: "in_progress",
          entered_at: new Date().toISOString(),
          entry_location: location,
          expected_duration: place.visitDurationMin || 60,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return {
        action: "auto_checked_in",
        visitLog: newVisit,
        isNewCheckIn: true,
      };
    } catch (error) {
      console.error("Auto check-in error:", error);
      throw error;
    }
  }

  /**
   * Auto check-out
   */
  static async autoCheckOut(visitLogId, userLat, userLon) {
    try {
      const exitTime = new Date().toISOString();

      const { data: visitLog, error: fetchError } = await supabase
        .from("visit_logs")
        .select("entered_at, status")
        .eq("id", visitLogId)
        .single();

      if (fetchError) throw fetchError;

      if (visitLog.status !== "in_progress") {
        return {
          action: "already_completed",
          visitLog,
          isCheckOut: false,
        };
      }

      const timeSpent = Math.floor(
        (new Date(exitTime) - new Date(visitLog.entered_at)) / 1000
      );

      const { data: updatedVisit, error: updateError } = await supabase
        .from("visit_logs")
        .update({
          exited_at: exitTime,
          status: "completed",
          time_spent: timeSpent,
          exit_location: { latitude: userLat, longitude: userLon },
        })
        .eq("id", visitLogId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        action: "auto_checked_out",
        visitLog: updatedVisit,
        isCheckOut: true,
        timeSpent,
      };
    } catch (error) {
      console.error("Auto check-out error:", error);
      throw error;
    }
  }

  /**
   * Manual check-in
   */
  static async manualCheckIn(userId, itineraryId, placeId, placeName, expectedDuration = 60) {
    try {
      const { data: existing } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("place_id", placeId)
        .eq("itinerary_id", itineraryId)
        .eq("status", "in_progress")
        .single();

      if (existing) {
        return {
          action: "already_in_progress",
          visitLog: existing,
          isNewCheckIn: false,
        };
      }

      const { data: newVisit, error } = await supabase
        .from("visit_logs")
        .insert({
          user_id: userId,
          itinerary_id: itineraryId,
          place_id: placeId,
          place_name: placeName,
          status: "in_progress",
          entered_at: new Date().toISOString(),
          expected_duration: expectedDuration,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        action: "manual_checked_in",
        visitLog: newVisit,
        isNewCheckIn: true,
      };
    } catch (error) {
      console.error("Manual check-in error:", error);
      throw error;
    }
  }

  /**
   * Manual check-out
   */
  static async manualCheckOut(visitLogId, userRating = null, notes = null) {
    try {
      const exitTime = new Date().toISOString();

      const { data: visitLog, error: fetchError } = await supabase
        .from("visit_logs")
        .select("entered_at, status")
        .eq("id", visitLogId)
        .single();

      if (fetchError) throw fetchError;

      if (visitLog.status !== "in_progress") {
        return {
          action: "already_completed",
          visitLog,
          isCheckOut: false,
        };
      }

      const timeSpent = Math.floor(
        (new Date(exitTime) - new Date(visitLog.entered_at)) / 1000
      );

      const updatePayload = {
        exited_at: exitTime,
        status: "completed",
        time_spent: timeSpent,
      };

      if (userRating) updatePayload.user_rating = userRating;
      if (notes) updatePayload.notes = notes;

      const { data: updatedVisit, error: updateError } = await supabase
        .from("visit_logs")
        .update(updatePayload)
        .eq("id", visitLogId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        action: "manual_checked_out",
        visitLog: updatedVisit,
        isCheckOut: true,
        timeSpent,
      };
    } catch (error) {
      console.error("Manual check-out error:", error);
      throw error;
    }
  }

  /**
   * Skip a place
   */
  static async skipPlace(userId, itineraryId, placeId, placeName) {
    try {
      const { data: existing } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("place_id", placeId)
        .eq("itinerary_id", itineraryId)
        .in("status", ["pending", "in_progress"])
        .single();

      if (existing) {
        const { data: updated, error } = await supabase
          .from("visit_logs")
          .update({ status: "skipped" })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return { action: "skipped_existing", visitLog: updated };
      }

      const { data: newSkipped, error } = await supabase
        .from("visit_logs")
        .insert({
          user_id: userId,
          itinerary_id: itineraryId,
          place_id: placeId,
          place_name: placeName,
          status: "skipped",
          entered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { action: "skipped_new", visitLog: newSkipped };
    } catch (error) {
      console.error("Skip place error:", error);
      throw error;
    }
  }
}

module.exports = GeofenceService;
