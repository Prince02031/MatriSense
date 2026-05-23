const supabase = require("../config/supabaseClient");
const crypto = require("crypto");

/**
 * REVIEWS TABLE SCHEMA (PostgreSQL via Supabase)
 *
 * Columns:
 * - id (uuid, primary key)
 * - place_id (uuid, NOT NULL)
 * - place_type (enum: COUNTRY, CITY, POI — NOT NULL)
 * - place_name (varchar)
 * - user_id (uuid, NOT NULL)
 * - user_name (varchar)
 * - rating (integer, 1-5)
 * - title (varchar)
 * - comment (text)
 * - visit_date (date)
 * - helpful_count (integer)
 * - is_verified (boolean)
 * - was_edited (boolean)
 * - created_at (timestamptz)
 * - updated_at (timestamptz)
 *
 * NOTE: user_id in JWT is a MongoDB ObjectId (24-char hex).
 * We pad it into a valid UUID format for storage:
 *   00000000-0000-0000-XXXX-XXXXXXXXXXXX
 */

/**
 * Convert a MongoDB ObjectId (24-char hex) to a valid UUID string.
 * Pads the hex into UUID format: 00000000-0000-0000-XXXX-XXXXXXXXXXXX
 */
function mongoIdToUUID(mongoId) {
    const hex = mongoId.toString().padStart(32, "0");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

class ReviewModel {
    /**
     * Get all reviews written by a user, including images
     * @param {string} userId - User ID from JWT (MongoDB ObjectId)
     * @returns {Array} reviews sorted by created_at desc
     */
    static async getUserReviews(userId) {
        const uuid = mongoIdToUUID(userId);

        const { data, error } = await supabase
            .from("reviews")
            .select("*, review_images(url, caption)")
            .eq("user_id", uuid)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase fetch reviews error:", error);
            throw new Error(`Failed to fetch user reviews: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Get a single review by ID
     */
    static async getReviewById(reviewId) {
        const { data, error } = await supabase
            .from("reviews")
            .select("*, review_images(url, caption)")
            .eq("id", reviewId)
            .single();

        if (error) {
            console.error("Supabase fetch review error:", error);
            throw new Error(`Failed to fetch review: ${error.message}`);
        }

        return data;
    }

    /**
     * Create a new review with optional images
     * @param {string} userId - User ID from JWT (MongoDB ObjectId)
     * @param {string} username - Username from JWT
     * @param {object} reviewData - { placeName, location, rating, comment, title, images }
     * @returns {object} created review
     */
    static async createReview(userId, username, reviewData) {
        const { placeName, location, rating, comment, title, images } = reviewData;

        const userUUID = mongoIdToUUID(userId);
        // Generate a random UUID for place_id since user is reviewing by name (not linked to a DB POI)
        const placeUUID = crypto.randomUUID();

        // 1. Insert Review
        const { data: review, error: reviewError } = await supabase
            .from("reviews")
            .insert({
                user_id: userUUID,
                user_name: username,
                place_name: placeName,
                place_type: "POI",
                place_id: placeUUID,
                rating: rating,
                title: title || null,
                comment: comment || null,
            })
            .select()
            .single();

        if (reviewError) {
            console.error("Supabase insert review error:", reviewError);
            throw new Error(`Failed to create review: ${reviewError.message}`);
        }

        // 2. Insert Images (if any)
        if (images && Array.isArray(images) && images.length > 0) {
            const imageInserts = images.map((url, index) => ({
                review_id: review.id,
                url: url,
                display_order: index
            }));

            const { error: imageError } = await supabase
                .from("review_images")
                .insert(imageInserts);

            if (imageError) {
                console.error("Supabase insert images error:", imageError);
                // Note: We don't rollback the review here, but we log the error.
                // In a real transactional system we might want to rollback.
            } else {
                // optimistically attach images for response
                review.review_images = imageInserts;
            }
        } else {
            review.review_images = [];
        }

        return review;
    }

    /**
     * Delete a review by ID, verifying ownership first
     * @param {string} reviewId - Review ID
     * @param {string} userId - User ID from JWT (MongoDB ObjectId)
     */
    static async deleteOwnedReview(reviewId, userId) {
        const userUUID = mongoIdToUUID(userId);

        // 1. Verify ownership
        const { data: existing, error: fetchError } = await supabase
            .from("reviews")
            .select("user_id")
            .eq("id", reviewId)
            .single();

        if (fetchError || !existing) {
            // If not found, returning success is often safe (idempotent), but let's throw if verification is key
            if (fetchError && fetchError.code === 'PGRST116') { // No rows found
                throw new Error("Review not found");
            }
            throw new Error(`Review verification failed: ${fetchError?.message}`);
        }

        if (existing.user_id !== userUUID) {
            throw new Error("Unauthorized: You do not own this review");
        }

        // 2. Delete images (safe to explicit delete)
        await supabase.from("review_images").delete().eq("review_id", reviewId);

        // 3. Delete review
        const { error } = await supabase
            .from("reviews")
            .delete()
            .eq("id", reviewId);

        if (error) {
            console.error("Supabase delete review error:", error);
            throw new Error(`Failed to delete review: ${error.message}`);
        }

        return { success: true };
    }
}

module.exports = ReviewModel;
