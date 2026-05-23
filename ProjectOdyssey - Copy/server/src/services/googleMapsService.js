// server/src/services/googleMapsService.js
const axios = require('axios');
const { supabase } = require('../config/supabaseClient');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

class GoogleMapsService {
  constructor() {
    // Daily limits to stay within free tier
    this.DAILY_LIMITS = {
      autocomplete: 500,   // ~15k/month (safe within $200 credit)
      placeDetails: 200,   // ~6k/month (Place Details is expensive $17/1k)
      directions: 300      // ~9k/month 
    };
  }

  /**
   * Check if we're within daily API quota
   */
  async checkQuota(apiType) {
    const today = new Date().toISOString().split('T')[0];

    try {
      if (!supabase) {
        console.warn('Supabase not configured, skipping quota check');
        return 0;
      }

      const { data, error } = await supabase
        .from('api_usage_logs')
        .select('count')
        .eq('api_type', apiType)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore "not found" error
        console.error('Quota check error:', error);
        return 0;
      }

      const currentCount = data?.count || 0;

      if (currentCount >= this.DAILY_LIMITS[apiType]) {
        throw new Error(`Daily quota exceeded for ${apiType}. Current: ${currentCount}/${this.DAILY_LIMITS[apiType]}. Try again tomorrow.`);
      }

      return currentCount;
    } catch (error) {
      if (error.message.includes('quota exceeded')) {
        throw error;
      }
      console.error('Quota check error:', error);
      return 0; // Allow on error to prevent blocking
    }
  }

  /**
   * Increment API usage counter
   */
  async incrementQuota(apiType) {
    const today = new Date().toISOString().split('T')[0];

    try {
      if (!supabase) {
        return; // Skip if Supabase not configured
      }

      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from('api_usage_logs')
        .upsert({
          api_type: apiType,
          date: today,
          count: 1
        }, {
          onConflict: 'api_type,date',
          ignoreDuplicates: false
        });

      if (error) {
        // If upsert fails, try incrementing manually
        const { data: existing } = await supabase
          .from('api_usage_logs')
          .select('count')
          .eq('api_type', apiType)
          .eq('date', today)
          .single();

        if (existing) {
          await supabase
            .from('api_usage_logs')
            .update({ count: existing.count + 1 })
            .eq('api_type', apiType)
            .eq('date', today);
        } else {
          await supabase
            .from('api_usage_logs')
            .insert({ api_type: apiType, date: today, count: 1 });
        }
      }
    } catch (error) {
      console.error('Error incrementing quota:', error);
      // Don't throw - we still want the API call to succeed
    }
  }

  /**
   * AUTOCOMPLETE: Search for places (with caching and quota protection)
   */
  async searchPlaces(query, location = null) {
    if (!query || query.length < 3) {
      return [];
    }

    // Check cache first (CRITICAL for quota management)
    const cacheKey = `search_${query.toLowerCase().trim()}`;
    try {
      const { data: cached } = await supabase
        .from('place_search_cache')
        .select('place_data')
        .eq('search_query', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        console.log('✅ Cache hit - no API call for:', query);
        return cached.place_data;
      }
    } catch (error) {
      // Cache miss, continue to API
    }

    // Check quota
    await this.checkQuota('autocomplete');

    // Call Google Places Autocomplete API
    console.log('⚠️ API call - Places Autocomplete for:', query);

    try {
      const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
      const params = {
        input: query,
        key: GOOGLE_MAPS_API_KEY,
        types: '(regions)',
      };

      if (location) {
        params.location = `${location.lat},${location.lng}`;
        params.radius = 50000; // 50km
      }

      const response = await axios.get(url, { params });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.error('Google API error:', response.data);
        throw new Error(`Google API error: ${response.data.status}`);
      }

      const results = (response.data.predictions || []).map(p => ({
        placeId: p.place_id,
        name: p.structured_formatting?.main_text || p.description,
        description: p.description,
        types: p.types || [],
        secondaryText: p.structured_formatting?.secondary_text || ''
      }));

      // Increment quota counter
      await this.incrementQuota('autocomplete');

      // Cache for 7 days
      if (supabase) {
        try {
          await supabase.from('place_search_cache').insert({
            search_query: cacheKey,
            place_data: results,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        } catch (cacheError) {
          console.error('Cache save error:', cacheError);
        }
      }

      return results;
    } catch (error) {
      console.error('Search places error:', error.message);
      throw error;
    }
  }

  /**
   * PLACE DETAILS: Get full information about a place (EXPENSIVE - $17/1k)
   */
  async getPlaceDetails(placeId) {
    if (!placeId) {
      throw new Error('Place ID is required');
    }

    // Check permanent cache first
    try {
      const { data: existing } = await supabase
        .from('places_cache')
        .select('*')
        .eq('place_id', placeId)
        .single();

      // Cache valid for 30 days
      if (existing && new Date(existing.fetched_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
        console.log('✅ Database hit - no API call for place:', placeId);
        return existing.place_data;
      }
    } catch (error) {
      // Cache miss, continue to API
    }

    // Check quota (Place Details is EXPENSIVE)
    await this.checkQuota('placeDetails');

    console.log('⚠️ API call - Place Details (EXPENSIVE $17/1k) for:', placeId);

    try {
      const url = 'https://maps.googleapis.com/maps/api/place/details/json';
      const params = {
        place_id: placeId,
        key: GOOGLE_MAPS_API_KEY,
        fields: 'name,formatted_address,geometry,photos,rating,reviews,opening_hours,website,formatted_phone_number,types,price_level,editorial_summary'
      };

      const response = await axios.get(url, { params });

      if (response.data.status !== 'OK') {
        console.error('Place details error:', response.data);
        throw new Error(`Google API error: ${response.data.status}`);
      }

      const place = response.data.result;

      const details = {
        placeId: placeId,
        name: place.name,
        address: place.formatted_address,
        coordinates: {
          lat: place.geometry?.location?.lat,
          lng: place.geometry?.location?.lng
        },
        photos: (place.photos || []).slice(0, 5).map(photo =>
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
        ),
        rating: place.rating || 0,
        totalRatings: place.user_ratings_total || 0,
        reviews: (place.reviews || []).slice(0, 3).map(r => ({
          author: r.author_name,
          rating: r.rating,
          text: r.text,
          time: r.time,
          profilePhoto: r.profile_photo_url
        })),
        openingHours: place.opening_hours?.weekday_text || [],
        website: place.website,
        phone: place.formatted_phone_number,
        types: place.types || [],
        priceLevel: place.price_level,
        description: place.editorial_summary?.overview || null
      };

      // Increment quota
      await this.incrementQuota('placeDetails');

      // Store permanently in cache
      if (supabase) {
        try {
          await supabase.from('places_cache').upsert({
            place_id: placeId,
            place_data: details,
            fetched_at: new Date().toISOString()
          });
        } catch (cacheError) {
          console.error('Cache save error:', cacheError);
        }
      }

      return details;
    } catch (error) {
      console.error('Place details error:', error.message);
      throw error;
    }
  }

  /**
   * DIRECTIONS: Generate route between waypoints
   */
  async generateRoute(waypoints, transportMode = 'walking') {
    if (!waypoints || waypoints.length < 2) {
      throw new Error('At least 2 waypoints required');
    }

    await this.checkQuota('directions');

    console.log('⚠️ API call - Directions for route');

    try {
      const url = 'https://maps.googleapis.com/maps/api/directions/json';
      const origin = waypoints[0];
      const destination = waypoints[waypoints.length - 1];
      const waypointsParam = waypoints.slice(1, -1).map(w =>
        typeof w === 'string' ? `place_id:${w}` : `${w.lat},${w.lng}`
      ).join('|');

      const params = {
        origin: typeof origin === 'string' ? `place_id:${origin}` : `${origin.lat},${origin.lng}`,
        destination: typeof destination === 'string' ? `place_id:${destination}` : `${destination.lat},${destination.lng}`,
        key: GOOGLE_MAPS_API_KEY,
        mode: transportMode,
        optimize: true
      };

      if (waypointsParam) {
        params.waypoints = `optimize:true|${waypointsParam}`;
      }

      const response = await axios.get(url, { params });

      if (response.data.status !== 'OK') {
        console.error('Directions error:', response.data);
        throw new Error(`Google API error: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      const legs = route.legs;

      const routeData = {
        polyline: route.overview_polyline.points,
        legs: legs.map(leg => ({
          distance: leg.distance.value, // meters
          duration: leg.duration.value, // seconds
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          steps: leg.steps.map(step => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            distance: step.distance.value,
            duration: step.duration.value
          }))
        })),
        totalDistance: legs.reduce((sum, leg) => sum + leg.distance.value, 0),
        totalDuration: legs.reduce((sum, leg) => sum + leg.duration.value, 0),
        bounds: route.bounds
      };

      await this.incrementQuota('directions');

      return routeData;
    } catch (error) {
      console.error('Route generation error:', error.message);
      throw error;
    }
  }

  /**
   * GEOCODING: Convert address to coordinates (fallback only)
   */
  async geocode(address) {
    console.log('⚠️ API call - Geocoding for:', address);
    try {
      const url = 'https://maps.googleapis.com/maps/api/geocode/json';
      const params = {
        address: address,
        key: GOOGLE_MAPS_API_KEY
      };

      const response = await axios.get(url, { params });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        return null;
      }

      const result = response.data.results[0];
      return {
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        },
        formattedAddress: result.formatted_address,
        placeId: result.place_id
      };
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return null;
    }
  }
}

module.exports = new GoogleMapsService();
