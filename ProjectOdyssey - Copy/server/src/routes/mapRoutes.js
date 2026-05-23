// server/src/routes/mapRoutes.js
const express = require('express');
const router = express.Router();
const googleMapsService = require('../services/googleMapsService');
const { supabase } = require('../config/supabaseClient');

/**
 * POST /api/map/search-places
 * Search for places using Google Places Autocomplete
 * Body: { query: string, location?: { lat, lng } }
 */
router.post('/search-places', async (req, res) => {
  try {
    const { query, location } = req.body;
    
    if (!query || query.length < 3) {
      return res.status(400).json({ 
        error: 'Query must be at least 3 characters' 
      });
    }
    
    const results = await googleMapsService.searchPlaces(query, location);
    
    res.json({
      success: true,
      results: results,
      cached: false // You can track this if needed
    });
  } catch (error) {
    console.error('Search places error:', error);
    
    if (error.message.includes('quota exceeded')) {
      return res.status(429).json({ 
        error: error.message,
        retryAfter: 'tomorrow'
      });
    }
    
    res.status(500).json({ 
      error: 'Search failed. Please try again.' 
    });
  }
});

/**
 * GET /api/map/place-details/:placeId
 * Get detailed information about a specific place
 */
router.get('/place-details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    
    if (!placeId) {
      return res.status(400).json({ error: 'Place ID required' });
    }
    
    const details = await googleMapsService.getPlaceDetails(placeId);
    
    res.json({
      success: true,
      place: details
    });
  } catch (error) {
    console.error('Place details error:', error);
    
    if (error.message.includes('quota exceeded')) {
      return res.status(429).json({ 
        error: error.message,
        retryAfter: 'tomorrow'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch place details' 
    });
  }
});

/**
 * POST /api/map/generate-route
 * Generate route between waypoints
 * Body: { waypoints: [], transportMode: 'walking' | 'driving' | 'transit' }
 */
router.post('/generate-route', async (req, res) => {
  try {
    const { waypoints, transportMode = 'walking' } = req.body;
    
    if (!waypoints || waypoints.length < 2) {
      return res.status(400).json({ 
        error: 'At least 2 waypoints required' 
      });
    }
    
    const route = await googleMapsService.generateRoute(waypoints, transportMode);
    
    res.json({
      success: true,
      route: route
    });
  } catch (error) {
    console.error('Route generation error:', error);
    
    if (error.message.includes('quota exceeded')) {
      return res.status(429).json({ 
        error: error.message,
        retryAfter: 'tomorrow'
      });
    }
    
    res.status(500).json({ 
      error: 'Route generation failed' 
    });
  }
});

/**
 * POST /api/map/create-manual-itinerary
 * Create a manually planned itinerary
 * Body: { trip_name, days: [{ day: 1, places: [...] }], user_id }
 */
router.post('/create-manual-itinerary', async (req, res) => {
  try {
    const { trip_name, days, user_id } = req.body;
    
    if (!trip_name || !days || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: trip_name, days, user_id' 
      });
    }
    
    // Flatten all places from all days
    const allPlaces = days.flatMap(day => 
      day.places.map((place, index) => ({
        ...place,
        day: day.day,
        order: index + 1
      }))
    );
    
    // Generate routes for each day
    const routesByDay = {};
    
    for (const day of days) {
      if (day.places.length >= 2) {
        const waypoints = day.places.map(p => p.placeId || { lat: p.lat, lng: p.lng });
        const route = await googleMapsService.generateRoute(waypoints, 'walking');
        routesByDay[`day${day.day}`] = route;
      }
    }
    
    // Save to database
    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .insert({
        user_id: user_id,
        trip_name: trip_name,
        selected_places: allPlaces,
        map_routes: routesByDay,
        creation_method: 'manual',
        transport_mode: 'walking',
        status: 'draft'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to save itinerary');
    }
    
    res.json({
      success: true,
      itinerary: itinerary
    });
  } catch (error) {
    console.error('Create manual itinerary error:', error);
    res.status(500).json({ 
      error: 'Failed to create itinerary' 
    });
  }
});

/**
 * PUT /api/map/itinerary/:id/reorder
 * Update place order within a day
 * Body: { day: 1, places: [...] }
 */
router.put('/itinerary/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { day, places } = req.body;
    
    // Fetch current itinerary
    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }
    
    // Update places for this day
    let updatedPlaces = itinerary.selected_places || [];
    updatedPlaces = updatedPlaces.filter(p => p.day !== day);
    updatedPlaces.push(...places.map((p, index) => ({ ...p, day, order: index + 1 })));
    
    // Recalculate route for this day
    const waypoints = places.map(p => p.placeId || { lat: p.lat, lng: p.lng });
    const newRoute = await googleMapsService.generateRoute(waypoints, itinerary.transport_mode || 'walking');
    
    const updatedRoutes = itinerary.map_routes || {};
    updatedRoutes[`day${day}`] = newRoute;
    
    // Update database
    const { data: updated, error: updateError } = await supabase
      .from('itineraries')
      .update({
        selected_places: updatedPlaces,
        map_routes: updatedRoutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      throw new Error('Failed to update itinerary');
    }
    
    res.json({
      success: true,
      itinerary: updated
    });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({ 
      error: 'Failed to reorder places' 
    });
  }
});

/**
 * GET /api/map/usage-stats
 * Get current API usage statistics
 */
router.get('/usage-stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('date', today);
    
    if (error) throw error;
    
    const stats = {
      date: today,
      autocomplete: { used: 0, limit: 500 },
      placeDetails: { used: 0, limit: 200 },
      directions: { used: 0, limit: 300 }
    };
    
    data?.forEach(log => {
      if (stats[log.api_type]) {
        stats[log.api_type].used = log.count;
      }
    });
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

module.exports = router;
