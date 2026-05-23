const supabase = require("../config/supabaseClient");

/**
 * TRIP MEMORIES MODEL
 * Handles user memories, photos, ratings, and personal details about completed trips
 */

class TripMemoryModel {
  /**
   * Create or get trip memory record
   * @param {string} userId - User ID
   * @param {string} itineraryId - Trip/Itinerary ID
   * @returns {object} trip memory record
   */
  static async getOrCreate(userId, itineraryId) {
    // First, try to get existing
    let { data, error } = await supabase
      .from("trip_memories")
      .select("*")
      .eq("user_id", userId)
      .eq("itinerary_id", itineraryId)
      .single();

    // If not found, create new
    if (error && error.code === "PGRST116") {
      ({ data, error } = await supabase
        .from("trip_memories")
        .insert({
          user_id: userId,
          itinerary_id: itineraryId,
        })
        .select()
        .single());
    }

    if (error) {
      console.error("Error in getOrCreate:", error);
      throw new Error(`Failed to get or create trip memory: ${error.message}`);
    }

    return data;
  }

  /**
   * Get trip memory by itinerary ID
   */
  static async getByItineraryId(itineraryId, userId) {
    const { data, error } = await supabase
      .from("trip_memories")
      .select("*")
      .eq("itinerary_id", itineraryId)
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      return null; // Not found
    }

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Failed to fetch trip memory: ${error.message}`);
    }

    return data;
  }

  /**
   * Update trip memory with mood, rating, favorite moment, etc.
   */
  static async updateMemory(itineraryId, userId, updateData) {
    const {
      mood,
      favoriteMoment,
      tripRating,
      wouldRevisit,
      visitedPlaces,
      tripDescription,
      badgesEarned
    } = updateData;

    // Build upsert payload — always includes the primary keys so upsert can
    // match existing rows or create a new one atomically.
    const payload = {
      itinerary_id: itineraryId,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (mood !== undefined) payload.mood = mood;
    if (favoriteMoment !== undefined) payload.favorite_moment = favoriteMoment;
    if (tripRating !== undefined) payload.trip_rating = tripRating;
    if (wouldRevisit !== undefined) payload.would_revisit = wouldRevisit;
    if (visitedPlaces !== undefined) payload.visited_places = visitedPlaces;
    if (tripDescription !== undefined) payload.trip_description = tripDescription;
    if (badgesEarned !== undefined) payload.badges_earned = badgesEarned;

    const { data, error } = await supabase
      .from("trip_memories")
      .upsert(payload, {
        onConflict: "itinerary_id,user_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase upsert error:", error);
      throw new Error(`Failed to update trip memory: ${error.message}`);
    }

    return data;
  }

  /**
   * Add memory photos to trip
   * @param {string} itineraryId 
   * @param {string} userId 
   * @param {array} photoUrls - Array of photo URLs
   */
  static async addMemoryPhotos(itineraryId, userId, photoUrls) {
    // Get current memory
    const memory = await this.getByItineraryId(itineraryId, userId);
    const currentPhotos = memory?.memory_photos || [];

    // Merge with new photos (max 3)
    const updatedPhotos = [...currentPhotos, ...photoUrls].slice(0, 3);

    const { data, error } = await supabase
      .from("trip_memories")
      .update({
        memory_photos: updatedPhotos,
        updated_at: new Date().toISOString(),
      })
      .eq("itinerary_id", itineraryId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      throw new Error(`Failed to add photos: ${error.message}`);
    }

    return data;
  }

  /**
   * Remove specific photo from memory
   */
  static async removeMemoryPhoto(itineraryId, userId, photoUrl) {
    const memory = await this.getByItineraryId(itineraryId, userId);
    const updatedPhotos = (memory?.memory_photos || []).filter(p => p !== photoUrl);

    const { data, error } = await supabase
      .from("trip_memories")
      .update({
        memory_photos: updatedPhotos,
        updated_at: new Date().toISOString(),
      })
      .eq("itinerary_id", itineraryId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to remove photo: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all trip memories for a user, grouped by past/future
   */
  static async getUserTimelineTrips(userId) {
    const { data, error } = await supabase
      .from("trip_memories")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase error:", error);
      if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
        return [];
      }
      throw new Error(`Failed to fetch timeline trips: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get trip statistics for a user
   */
  static async getUserTripStats(userId) {
    const { data, error } = await supabase
      .from("trip_memories")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to fetch trip stats: ${error.message}`);
    }

    const completedTrips = data.length;
    const averageRating = data.length > 0
      ? (data.reduce((sum, m) => sum + (m.trip_rating || 0), 0) / data.length).toFixed(1)
      : 0;
    const wouldRevisit = data.filter(m => m.would_revisit).length;
    const totalPhotos = data.reduce((sum, m) => sum + (m.memory_photos?.length || 0), 0);

    return {
      completedTrips,
      averageRating,
      wouldRevisit,
      totalPhotos,
    };
  }
}

module.exports = TripMemoryModel;
