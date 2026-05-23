const supabase = require("../config/supabaseClient");

/**
 * VisitLog Model
 * Handles CRUD operations on visit_logs table
 */
class VisitLog {
  /**
   * Create a new visit log
   * @param {object} visitData - { user_id, itinerary_id, place_id, place_name, ... }
   * @returns {object} Created visit log record
   */
  static async create(visitData) {
    const {
      user_id,
      itinerary_id,
      place_id,
      place_name,
      entered_at,
      status = "pending",
      expected_duration,
      entry_location,
    } = visitData;

    const { data, error } = await supabase
      .from("visit_logs")
      .insert({
        user_id,
        itinerary_id,
        place_id,
        place_name,
        entered_at: entered_at || new Date().toISOString(),
        status,
        expected_duration,
        entry_location,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get visit log by ID
   * @param {string} visitLogId - Visit log ID
   * @returns {object} Visit log record
   */
  static async getById(visitLogId) {
    const { data, error } = await supabase
      .from("visit_logs")
      .select("*")
      .eq("id", visitLogId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all visit logs for an itinerary
   * @param {string} itineraryId - Itinerary ID
   * @param {object} options - { orderBy, ascending, limit }
   * @returns {array} Visit logs
   */
  static async getByItinerary(itineraryId, options = {}) {
    const { orderBy = "entered_at", ascending = true, limit = 100 } = options;

    let query = supabase
      .from("visit_logs")
      .select("*")
      .eq("itinerary_id", itineraryId)
      .order(orderBy, { ascending })
      .limit(limit);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  /**
   * Get all visit logs for a user (across all itineraries)
   * @param {string} userId - User ID
   * @param {object} options - { orderBy, ascending, limit }
   * @returns {array} Visit logs
   */
  static async getByUser(userId, options = {}) {
    const { orderBy = "entered_at", ascending = false, limit = 500 } = options;

    const { data, error } = await supabase
      .from("visit_logs")
      .select("*")
      .eq("user_id", userId)
      .order(orderBy, { ascending })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Get visit logs by status (pending, in_progress, completed, skipped)
   * @param {string} userId - User ID
   * @param {string} status - Visit status
   * @returns {array} Visit logs
   */
  static async getByStatus(userId, status) {
    const { data, error } = await supabase
      .from("visit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("status", status);

    if (error) throw error;
    return data;
  }

  /**
   * Get currently in-progress visits for a user
   * @param {string} userId - User ID
   * @returns {array} Visit logs with status 'in_progress'
   */
  static async getInProgress(userId) {
    return this.getByStatus(userId, "in_progress");
  }

  /**
   * Update visit log (e.g., check-out, add rating)
   * @param {string} visitLogId - Visit log ID
   * @param {object} updateData - Partial update data
   * @returns {object} Updated visit log
   */
  static async update(visitLogId, updateData) {
    const { data, error } = await supabase
      .from("visit_logs")
      .update(updateData)
      .eq("id", visitLogId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Bulk update visit logs
   * @param {object} filter - Filter criteria { user_id, itinerary_id, status, ... }
   * @param {object} updateData - Data to update
   * @returns {array} Updated visit logs
   */
  static async bulkUpdate(filter, updateData) {
    let query = supabase.from("visit_logs").update(updateData);

    // Apply filters
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query.select();

    if (error) throw error;
    return data;
  }

  /**
   * Delete visit log
   * @param {string} visitLogId - Visit log ID
   * @returns {object} { success: true }
   */
  static async delete(visitLogId) {
    const { error } = await supabase
      .from("visit_logs")
      .delete()
      .eq("id", visitLogId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Get visit statistics for an itinerary
   * @param {string} itineraryId - Itinerary ID
   * @returns {object} Statistics
   */
  static async getStats(itineraryId) {
    const visits = await this.getByItinerary(itineraryId, { limit: 1000 });

    const stats = {
      total: visits.length,
      completed: visits.filter((v) => v.status === "completed").length,
      in_progress: visits.filter((v) => v.status === "in_progress").length,
      pending: visits.filter((v) => v.status === "pending").length,
      skipped: visits.filter((v) => v.status === "skipped").length,
      totalTimeSpent: visits.reduce((sum, v) => sum + (v.time_spent || 0), 0),
      averageTimePerVisit:
        visits.filter((v) => v.time_spent).length > 0
          ? Math.round(
              visits.reduce((sum, v) => sum + (v.time_spent || 0), 0) /
                visits.filter((v) => v.time_spent).length
            )
          : 0,
      averageRating:
        visits.filter((v) => v.user_rating).length > 0
          ? (
              visits.reduce((sum, v) => sum + (v.user_rating || 0), 0) /
              visits.filter((v) => v.user_rating).length
            ).toFixed(1)
          : null,
    };

    return stats;
  }

  /**
   * Get current visit (most recent in_progress or recent completed)
   * @param {string} userId - User ID
   * @param {string} itineraryId - Itinerary ID
   * @returns {object|null} Current visit log or null
   */
  static async getCurrentVisit(userId, itineraryId) {
    // First check for in_progress
    const { data: inProgress } = await supabase
      .from("visit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("itinerary_id", itineraryId)
      .eq("status", "in_progress")
      .order("entered_at", { ascending: false })
      .limit(1)
      .single();

    if (inProgress) return inProgress;

    // Otherwise get most recent completed
    const { data: completed } = await supabase
      .from("visit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("itinerary_id", itineraryId)
      .eq("status", "completed")
      .order("exited_at", { ascending: false })
      .limit(1)
      .single();

    return completed || null;
  }
}

module.exports = VisitLog;
