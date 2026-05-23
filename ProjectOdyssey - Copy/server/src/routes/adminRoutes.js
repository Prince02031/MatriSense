const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const User = require('../models/User'); // Import Mongoose User Model

// --- DASHBOARD STATS ---
router.get('/stats', async (req, res) => {
    try {
        // 1. Mongo Users Count
        const userCount = await User.countDocuments();

        // 2. Supabase Counts (Countries, Cities, POIs)
        // Note: count: 'exact' is needed to get the count value
        const { count: countryCount, error: countryError } = await supabase.from('countries').select('*', { count: 'exact', head: true });
        const { count: cityCount, error: cityError } = await supabase.from('cities').select('*', { count: 'exact', head: true });
        const { count: poiCount, error: poiError } = await supabase.from('pois').select('*', { count: 'exact', head: true });

        if (countryError) throw countryError;
        if (cityError) throw cityError;
        if (poiError) throw poiError;

        res.json({
            success: true,
            data: {
                users: userCount,
                countries: countryCount,
                cities: cityCount,
                pois: poiCount
            }
        });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- COUNTRIES ---
router.post('/countries', async (req, res) => {
    try {
        const { name, slug, description, google_place_id, latitude, longitude, country_code, continent, population, currency } = req.body;

        // Basic validation
        if (!name || !slug || !country_code) {
            return res.status(400).json({ error: "Name, Slug, and Country Code are required." });
        }

        const { data, error } = await supabase
            .from('countries')
            .insert({
                name, slug, description, google_place_id, latitude, longitude, country_code, continent, population, currency
            })
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });

    } catch (error) {
        console.error("Create Country Error:", error);
        res.status(500).json({ error: error.message, code: error.code });
    }
});

router.get('/countries', async (req, res) => {
    const { search } = req.query;
    let query = supabase.from('countries').select('*').order('name');
    if (search) {
        query = query.ilike('name', `%${search}%`);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
});


// --- CITIES (DISTRICTS) ---
router.post('/cities', async (req, res) => {
    try {
        const { name, slug, description, google_place_id, latitude, longitude, country_id, population, state_province } = req.body;

        if (!name || !slug || !country_id) {
            return res.status(400).json({ error: "Name, Slug, and Country ID are required." });
        }

        const { data, error } = await supabase
            .from('cities')
            .insert({
                name, slug, description, google_place_id, latitude, longitude, country_id, population, state_province
            })
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });

    } catch (error) {
        console.error("Create City Error:", error);
        res.status(500).json({ error: error.message, code: error.code });
    }
});

router.get('/cities', async (req, res) => {
    try {
        const { country_id, search, page = 1, limit = 50 } = req.query;

        // Pagination logic
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase.from('cities')
            .select('*, countries(name)', { count: 'exact' }); // Get total count

        // Filters
        if (country_id) {
            query = query.eq('country_id', country_id);
        }
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        // Apply Pagination & Sort
        query = query.order('name')
            .range(from, parseInt(to));

        const { data, count, error } = await query;

        if (error) return res.status(500).json({ error: error.message });

        res.json({
            success: true,
            data,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error("Fetch Cities Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/cities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('cities').delete().eq('id', id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error("Delete City Error:", error);
        res.status(500).json({ error: error.message });
    }
});


// --- PLACES (Replacing POIs) ---
router.post('/places', async (req, res) => {
    try {
        const {
            name, short_desc, google_place_id,
            latitude, longitude, city_id, country_id,
            macro_category, primary_category, secondary_category,
            address, neighborhood,
            opening_hours, entry_fee, accessibility,
            website, phone_number, email, amenities, tags,
            visit_duration_min, est_cost_per_day,
            source, verified
        } = req.body;

        if (!name || !city_id || !country_id) {
            return res.status(400).json({ error: "Name, City ID, and Country ID are required." });
        }

        // Prepare location point if lat/long are provided
        // Note: If using PostGIS 'location', we need to pass it as string 'POINT(lng lat)'
        // OR rely on Supabase/Postgres to cast if we pass a string.
        let location = null;
        if (latitude && longitude) {
            location = `POINT(${longitude} ${latitude})`;
        }

        const payload = {
            name, short_desc, google_place_id,
            city_id, country_id,
            macro_category, primary_category, secondary_category,
            address, neighborhood,
            opening_hours, entry_fee, accessibility,
            website, phone_number, email,
            amenities, tags,
            visit_duration_min, est_cost_per_day,
            source, verified,
            // If the table HAS lat/long columns, use them. If not, use location.
            // Based on user schema, it has 'location'. 
            // We'll try to pass location.
            location: location
        };

        // If table DOES have lat/long columns (backward compat?), we can pass them.
        // But schema says USER-DEFINED location.

        const { data, error } = await supabase
            .from('places')
            .insert(payload)
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });

    } catch (error) {
        console.error("Create Place Error:", error);
        res.status(500).json({ error: error.message, code: error.code });
    }
});

router.get('/places', async (req, res) => {
    try {
        const { search, limit = 50 } = req.query;
        let query = supabase.from('places')
            .select('*, cities(name), countries(name)')
            .limit(parseInt(limit));

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        // Manually parse 'location' if it exists and lat/long are missing
        const processedData = data.map(place => {
            if (!place.latitude && !place.longitude && place.location) {
                // Assuming place.location is returned as WKB (hex string) or similar by Supabase
                // Supabase (PostgREST) usually yields GeoJSON if the header is set, otherwise WKB.
                // If standard client, it might be a string.
                // Simple WKT regex parsing just in case it returns text: POINT(x y)
                // If it returns a geometric object, access x/y.

                // Let's look for simple string format first
                if (typeof place.location === 'string' && place.location.startsWith('POINT')) {
                    const matches = place.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
                    if (matches) {
                        return { ...place, longitude: parseFloat(matches[1]), latitude: parseFloat(matches[2]) };
                    }
                }

                // If it's a hex string (WKB), parsing is harder without a lib.
                // BUT, if the user says "I see lat/long in database", maybe they are columns?
                // Let's assume if they are NOT in the object, we try to grab them from location if possible.
                // For now, if we can't parse, we leave empty.
            }
            return place;
        });

        res.json({ success: true, data: processedData });
    } catch (error) {
        console.error("Fetch Places Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/places/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove immutable fields if any
        delete updates.place_id;
        delete updates.created_at;

        // Handle Location Update
        if (updates.latitude && updates.longitude) {
            updates.location = `POINT(${updates.longitude} ${updates.latitude})`;
            // Ideally remove raw lat/long if columns don't exist
            delete updates.latitude;
            delete updates.longitude;
        }

        const { data, error } = await supabase
            .from('places')
            .update(updates)
            .eq('place_id', id) // Assuming place_id (int) is the PK, or is it UUID?
            // Wait, schema_now.sql says: place_id integer NOT NULL DEFAULT nextval...
            // So we act on 'place_id'.
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error("Update Place Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
