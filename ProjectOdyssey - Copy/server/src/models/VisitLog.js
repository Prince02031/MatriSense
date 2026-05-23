const supabase = require("../config/supabaseClient");

/**
 * VISIT LOG MODEL
 * Handles all database operations for visit tracking
 * 
 * Database Table: visit_logs
 * Columns: id, user_id, itinerary_id, place_id, place_name, entered_at, exited_at,
 *          time_spent, expected_duration, status, entry_location, exit_location,
 *          user_rating, notes, photos, created_at, updated_at
 */

class VisitLogModel {
  /**
   * Create a new visit log entry
   * @param {string} userId - User ID
   * @param {string} itineraryId - Itinerary UUID
   * @param {string} placeId - Place ID
   * @param {string} placeName - Place name
   * @param {object} location - {lat, lng, accuracy}
   * @param {number} expectedDuration - Expected duration in seconds
   * @returns {object} Created visit log record
   */
  static async createVisitLog(userId, itineraryId, placeId, placeName, location, expectedDuration = null) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .insert({
          user_id: userId,
          itinerary_id: itineraryId,
          place_id: placeId,
          place_name: placeName,
          entered_at: new Date().toISOString(),
          status: "in_progress",
          entry_location: location || null,
          expected_duration: expectedDuration,
        })
        .select();

      if (error) {
        console.error("Error creating visit log:", error);
        throw new Error(`Failed to create visit log: ${error.message}`);
      }

      return data[0];
    } catch (err) {
      console.error("VisitLogModel.createVisitLog error:", err);
      throw err;
    }
  }

  /**
   * Get visit log by ID
   * @param {string} visitId - Visit log UUID
   * @returns {object} Visit log record
   */
  static async getVisitLog(visitId) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("id", visitId)
        .single();

      if (error) {
        console.error("Error fetching visit log:", error);
        throw new Error(`Failed to fetch visit log: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error("VisitLogModel.getVisitLog error:", err);
      throw err;
    }
  }

  /**
   * Update visit log (check-out or add feedback)
   * @param {string} visitId - Visit log UUID
   * @param {object} updateData - Data to update
   * @returns {object} Updated visit log record
   */
  static async updateVisitLog(visitId, updateData) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", visitId)
        .select();

      if (error) {
        console.error("Error updating visit log:", error);
        throw new Error(`Failed to update visit log: ${error.message}`);
      }

      return data[0];
    } catch (err) {
      console.error("VisitLogModel.updateVisitLog error:", err);
      throw err;
    }
  }

  /**
   * Get all visit logs for an itinerary
   * @param {string} itineraryId - Itinerary UUID
   * @param {object} options - Pagination/sorting options
   * @returns {array} Array of visit logs
   */
  static async getItineraryVisits(itineraryId, options = {}) {
    try {
      const { page = 1, pageSize = 50 } = options;
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("visit_logs")
        .select("*")
        .eq("itinerary_id", itineraryId)
        .order("entered_at", { ascending: false });

      // Add pagination
      if (pageSize) {
        query = query.range(offset, offset + pageSize - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching itinerary visits:", error);
        throw new Error(`Failed to fetch itinerary visits: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error("VisitLogModel.getItineraryVisits error:", err);
      throw err;
    }
  }

  /**
   * Get all visit logs for a user
   * @param {string} userId - User ID
   * @param {object} options - Pagination/sorting options
   * @returns {array} Array of visit logs
   */
  static async getUserVisits(userId, options = {}) {
    try {
      const { page = 1, pageSize = 50 } = options;
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("visit_logs")
        .select("*")
        .eq("user_id", userId)
        .order("entered_at", { ascending: false });

      if (pageSize) {
        query = query.range(offset, offset + pageSize - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching user visits:", error);
        throw new Error(`Failed to fetch user visits: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error("VisitLogModel.getUserVisits error:", err);
      throw err;
    }
  }

  /**
   * Get currently active visit for an itinerary
   * @param {string} itineraryId - Itinerary UUID
   * @returns {object} Current visit log or null
   */
  static async getCurrentVisit(itineraryId) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("itinerary_id", itineraryId)
        .eq("status", "in_progress")
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned (expected for no active visit)
        console.error("Error fetching current visit:", error);
        throw new Error(`Failed to fetch current visit: ${error.message}`);
      }

      return data || null;
    } catch (err) {
      console.error("VisitLogModel.getCurrentVisit error:", err);
      throw err;
    }
  }

  /**
   * Get visit progress for an itinerary
   * @param {string} itineraryId - Itinerary UUID
   * @returns {object} Progress stats
   */
  static async getProgress(itineraryId) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("status, time_spent, expected_duration")
        .eq("itinerary_id", itineraryId);

      if (error) {
        console.error("Error fetching progress:", error);
        throw new Error(`Failed to fetch progress: ${error.message}`);
      }

      const completed = data.filter(v => v.status === "completed").length;
      const inProgress = data.filter(v => v.status === "in_progress").length;
      const pending = data.filter(v => v.status === "pending").length;
      const skipped = data.filter(v => v.status === "skipped").length;
      const total = data.length;

      // Verify calculation integrity
      const statusSum = completed + inProgress + pending + skipped;
      if (statusSum !== total) {
        console.warn(`Progress sum mismatch: total=${total}, sum=${statusSum}. Rows:`, data);
      }

      const totalTimeSpent = data
        .filter(v => v.time_spent)
        .reduce((sum, v) => sum + v.time_spent, 0);

      // Completion percent = completed visits / total places
      const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total,
        completed,
        inProgress,
        pending,
        skipped,
        completionPercent,
        totalTimeSpent,
      };
    } catch (err) {
      console.error("VisitLogModel.getProgress error:", err);
      throw err;
    }
  }

  /**
   * Delete (or skip) a visit log
   * @param {string} visitId - Visit log UUID
   * @param {boolean} markSkipped - If true, mark as skipped; if false, delete
   * @returns {object} Updated or deleted record
   */
  static async deleteVisitLog(visitId, markSkipped = true) {
    try {
      if (markSkipped) {
        // Mark as skipped instead of deleting
        return await this.updateVisitLog(visitId, { status: "skipped" });
      } else {
        // Actually delete the record
        const { data, error } = await supabase
          .from("visit_logs")
          .delete()
          .eq("id", visitId)
          .select();

        if (error) {
          console.error("Error deleting visit log:", error);
          throw new Error(`Failed to delete visit log: ${error.message}`);
        }

        return data[0];
      }
    } catch (err) {
      console.error("VisitLogModel.deleteVisitLog error:", err);
      throw err;
    }
  }

  /**
   * Get summary statistics for a trip
   * @param {string} itineraryId - Itinerary UUID
   * @returns {object} Trip summary stats
   */
  static async getTripSummary(itineraryId) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("itinerary_id", itineraryId)
        .order("entered_at", { ascending: true });

      if (error) {
        console.error("Error fetching trip summary:", error);
        throw new Error(`Failed to fetch trip summary: ${error.message}`);
      }

      const completed = data.filter(v => v.status === "completed");
      const total = data.length;
      const totalTimeSpent = data
        .filter(v => v.time_spent)
        .reduce((sum, v) => sum + v.time_spent, 0);

      const ratings = completed
        .filter(v => v.user_rating)
        .map(v => v.user_rating);

      const averageRating = ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : null;

      const firstVisit = data[0];
      const lastVisit = data[data.length - 1];

      return {
        totalPlaces: total,
        placesVisited: completed.length,
        completionPercent: total > 0 ? Math.round((completed.length / total) * 100) : 0,
        totalTimeSpent,
        averageTimePerPlace: completed.length > 0 ? Math.round(totalTimeSpent / completed.length) : 0,
        averageRating,
        startTime: firstVisit?.entered_at,
        endTime: lastVisit?.exited_at,
        visits: data,
      };
    } catch (err) {
      console.error("VisitLogModel.getTripSummary error:", err);
      throw err;
    }
  }

  /**
   * Check if user already has an active visit for this place
   * @param {string} userId - User ID
   * @param {string} placeId - Place ID
   * @returns {boolean} True if active visit exists
   */
  static async hasActiveVisit(userId, placeId) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("place_id", placeId)
        .eq("status", "in_progress")
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows
        console.error("Error checking active visit:", error);
        throw new Error(`Failed to check active visit: ${error.message}`);
      }

      return data !== null && data !== undefined;
    } catch (err) {
      console.error("VisitLogModel.hasActiveVisit error:", err);
      throw err;
    }
  }
  /**
   * Get visit statistics for a user
   * Returns the count of completed visits
   * @param {string} userId - User ID
   * @returns {object} { count: number, countryStats: object }
   */
  static async getUserVisitStats(userId) {
    try {
      // Fetch completed visits for the user
      const { data, error } = await supabase
        .from("visit_logs")
        .select("place_id, status")
        //DEATRAX: incoming changes from fs-merging-branch kept here commented as current changes were accepted
        // .select(`
        //   place_id,
        //   status,
        //   places (
        //     country
        //   )
        // `)
        .eq("user_id", userId)
        .eq("status", "completed");

      if (error) {
        console.error("Error fetching user visit stats:", error);
        throw new Error(`Failed to fetch user visit stats: ${error.message}`);
      }

      // Calculate unique places count
      const uniquePlaces = new Set(data.map(v => v.place_id));
      const count = uniquePlaces.size;

      // Aggregate counts by country
      //DEATRAX: incoming changes from fs-merging-branch manually added that was omitted by auto merge
      const countryStats = {};
      data.forEach(log => {
        // Handle case where places might be returned as an array or object
        const placesData = Array.isArray(log.places) ? log.places[0] : log.places;
        const countryName = placesData?.country;
        if (countryName) {
          countryStats[countryName] = (countryStats[countryName] || 0) + 1;
        }
      });
      return {
        count,
        countryStats: {}
      };
    } catch (err) {
      console.error("VisitLogModel.getUserVisitStats error:", err);
      throw err;
    }
  }
}

module.exports = VisitLogModel;
