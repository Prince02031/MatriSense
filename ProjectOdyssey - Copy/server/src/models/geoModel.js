// models.js - Supabase Database Models and Helper Functions

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================
// COUNTRY MODEL
// =============================================
export const Country = {
  tableName: 'countries',

  /**
   * Get all countries with optional filters
   */
  async getAll(filters = {}) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .order('popularity_score', { ascending: false });

    if (filters.continent) {
      query = query.eq('continent', filters.continent);
    }

    if (filters.minRating) {
      query = query.gte('average_rating', filters.minRating);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get country by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get country by slug
   */
  async getBySlug(slug) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get country with all cities
   */
  async getWithCities(countryId) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        cities (*)
      `)
      .eq('id', countryId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get country with top POIs
   */
  async getWithTopPOIs(countryId, limit = 10) {
    const country = await this.getById(countryId);
    
    const { data: topPOIs, error } = await supabase
      .from('top_places')
      .select(`
        poi_id,
        display_order,
        pois (*)
      `)
      .eq('parent_id', countryId)
      .eq('parent_type', 'COUNTRY')
      .order('display_order', { ascending: true })
      .limit(limit);

    if (error) throw error;
    
    return {
      ...country,
      topPOIs: topPOIs.map(tp => tp.pois)
    };
  },

  /**
   * Create new country
   */
  async create(countryData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([countryData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update country
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete country
   */
  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Search countries by name
   */
  async search(searchTerm) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('popularity_score', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// =============================================
// CITY MODEL
// =============================================
export const City = {
  tableName: 'cities',

  /**
   * Get all cities with optional filters
   */
  async getAll(filters = {}) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .order('popularity_score', { ascending: false });

    if (filters.countryId) {
      query = query.eq('country_id', filters.countryId);
    }

    if (filters.minRating) {
      query = query.gte('average_rating', filters.minRating);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get city by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get city by slug
   */
  async getBySlug(slug, countryId = null) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('slug', slug);

    if (countryId) {
      query = query.eq('country_id', countryId);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  },

  /**
   * Get city with POIs
   */
  async getWithPOIs(cityId, filters = {}) {
    const city = await this.getById(cityId);
    
    let poiQuery = supabase
      .from('pois')
      .select('*')
      .eq('city_id', cityId)
      .order('popularity_score', { ascending: false });

    if (filters.category) {
      poiQuery = poiQuery.eq('category', filters.category);
    }

    if (filters.subCategory) {
      poiQuery = poiQuery.eq('sub_category', filters.subCategory);
    }

    const { data: pois, error } = await poiQuery;
    if (error) throw error;

    return {
      ...city,
      pois
    };
  },

  /**
   * Get city with statistics
   */
  async getWithStats(cityId) {
    const { data, error } = await supabase
      .from('city_summary')
      .select('*')
      .eq('id', cityId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create new city
   */
  async create(cityData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([cityData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update city
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete city
   */
  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Search cities by name
   */
  async search(searchTerm, countryId = null) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('popularity_score', { ascending: false });

    if (countryId) {
      query = query.eq('country_id', countryId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};

// =============================================
// POI MODEL
// =============================================
export const POI = {
  tableName: 'pois',

  /**
   * Get all POIs with optional filters
   */
  async getAll(filters = {}) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .order('popularity_score', { ascending: false });

    if (filters.cityId) {
      query = query.eq('city_id', filters.cityId);
    }

    if (filters.countryId) {
      query = query.eq('country_id', filters.countryId);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.subCategory) {
      query = query.eq('sub_category', filters.subCategory);
    }

    if (filters.minRating) {
      query = query.gte('average_rating', filters.minRating);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get POI by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get POI by slug
   */
  async getBySlug(slug, cityId = null) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('slug', slug);

    if (cityId) {
      query = query.eq('city_id', cityId);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  },

  /**
   * Get POI with reviews
   */
  async getWithReviews(poiId, options = {}) {
    const poi = await this.getById(poiId);
    
    let reviewQuery = supabase
      .from('reviews')
      .select('*')
      .eq('place_id', poiId)
      .eq('place_type', 'POI')
      .order('created_at', { ascending: false });

    if (options.limit) {
      reviewQuery = reviewQuery.limit(options.limit);
    }

    const { data: reviews, error } = await reviewQuery;
    if (error) throw error;

    return {
      ...poi,
      reviews
    };
  },

  /**
   * Get POI with nearby POIs
   */
  async getWithNearby(poiId, limit = 5) {
    const poi = await this.getById(poiId);
    
    const { data: nearbyData, error } = await supabase
      .from('nearby_pois')
      .select(`
        nearby_poi_id,
        distance_km,
        pois!nearby_pois_nearby_poi_id_fkey (*)
      `)
      .eq('poi_id', poiId)
      .order('distance_km', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return {
      ...poi,
      nearbyPOIs: nearbyData.map(n => ({
        ...n.pois,
        distance_km: n.distance_km
      }))
    };
  },

  /**
   * Get POI with images
   */
  async getWithImages(poiId) {
    const poi = await this.getById(poiId);
    
    const { data: images, error } = await supabase
      .from('place_images')
      .select('*')
      .eq('place_id', poiId)
      .eq('place_type', 'POI')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return {
      ...poi,
      images
    };
  },

  /**
   * Create new POI
   */
  async create(poiData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([poiData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update POI
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete POI
   */
  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Search POIs by name
   */
  async search(searchTerm, filters = {}) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('popularity_score', { ascending: false });

    if (filters.cityId) {
      query = query.eq('city_id', filters.cityId);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get top rated POIs from view
   */
  async getTopRated(limit = 20) {
    const { data, error } = await supabase
      .from('top_pois')
      .select('*')
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * Add nearby POI relationship
   */
  async addNearbyPOI(poiId, nearbyPoiId, distanceKm) {
    const { data, error } = await supabase
      .from('nearby_pois')
      .insert([
        { poi_id: poiId, nearby_poi_id: nearbyPoiId, distance_km: distanceKm }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// =============================================
// REVIEW MODEL
// =============================================
export const Review = {
  tableName: 'reviews',

  /**
   * Get all reviews with optional filters
   */
  async getAll(filters = {}) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.placeId && filters.placeType) {
      query = query
        .eq('place_id', filters.placeId)
        .eq('place_type', filters.placeType);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.rating) {
      query = query.eq('rating', filters.rating);
    }

    if (filters.minRating) {
      query = query.gte('rating', filters.minRating);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get review by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get review with images
   */
  async getWithImages(reviewId) {
    const review = await this.getById(reviewId);
    
    const { data: images, error } = await supabase
      .from('review_images')
      .select('*')
      .eq('review_id', reviewId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return {
      ...review,
      reviewImages: images
    };
  },

  /**
   * Get reviews for a place
   */
  async getByPlace(placeId, placeType, options = {}) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('place_id', placeId)
      .eq('place_type', placeType)
      .order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get reviews by user
   */
  async getByUser(userId, options = {}) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Create new review
   */
  async create(reviewData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([reviewData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update review
   */
  async update(id, updates) {
    const updateData = {
      ...updates,
      was_edited: true
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete review
   */
  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Increment helpful count
   */
  async incrementHelpful(id) {
    const review = await this.getById(id);
    
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ helpful_count: review.helpful_count + 1 })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Add review image
   */
  async addImage(reviewId, imageData) {
    const { data, error } = await supabase
      .from('review_images')
      .insert([{ review_id: reviewId, ...imageData }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// =============================================
// PLACE IMAGE MODEL
// =============================================
export const PlaceImage = {
  tableName: 'place_images',

  /**
   * Get all images for a place
   */
  async getByPlace(placeId, placeType) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('place_id', placeId)
      .eq('place_type', placeType)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Get image by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create new image
   */
  async create(imageData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([imageData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update image
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete image
   */
  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Reorder images
   */
  async reorder(placeId, placeType, imageOrders) {
    // imageOrders is an array of { id, display_order }
    const promises = imageOrders.map(({ id, display_order }) =>
      this.update(id, { display_order })
    );

    return Promise.all(promises);
  }
};

// =============================================
// TOP PLACES MODEL
// =============================================
export const TopPlace = {
  tableName: 'top_places',

  /**
   * Get top places for a parent (country or city)
   */
  async getByParent(parentId, parentType) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        pois (*)
      `)
      .eq('parent_id', parentId)
      .eq('parent_type', parentType)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Add POI to top places
   */
  async add(parentId, parentType, poiId, displayOrder = 0) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([{
        parent_id: parentId,
        parent_type: parentType,
        poi_id: poiId,
        display_order: displayOrder
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Remove POI from top places
   */
  async remove(parentId, parentType, poiId) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('parent_id', parentId)
      .eq('parent_type', parentType)
      .eq('poi_id', poiId);

    if (error) throw error;
    return true;
  },

  /**
   * Reorder top places
   */
  async reorder(topPlaceOrders) {
    // topPlaceOrders is an array of { id, display_order }
    const promises = topPlaceOrders.map(({ id, display_order }) =>
      supabase
        .from(this.tableName)
        .update({ display_order })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) throw errors[0].error;
    return true;
  }
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Generate slug from name
 */
export function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Get nearby POIs by coordinates
 */
export async function findNearbyPOIs(latitude, longitude, radiusKm = 5, limit = 10) {
  // This is a simplified version. For production, use PostGIS or similar
  const { data: allPOIs, error } = await supabase
    .from('pois')
    .select('*');

  if (error) throw error;

  const poisWithDistance = allPOIs
    .map(poi => ({
      ...poi,
      distance_km: calculateDistance(
        latitude,
        longitude,
        parseFloat(poi.latitude),
        parseFloat(poi.longitude)
      )
    }))
    .filter(poi => poi.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);

  return poisWithDistance;
}

// =============================================
// EXPORTS
// =============================================
export default {
  Country,
  City,
  POI,
  Review,
  PlaceImage,
  TopPlace,
  supabase,
  generateSlug,
  calculateDistance,
  findNearbyPOIs
};