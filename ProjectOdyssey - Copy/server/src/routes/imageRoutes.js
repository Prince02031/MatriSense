// server/src/routes/imageRoutes.js
// Admin routes for image management

const express = require('express');
const router = express.Router();
const imageService = require('../services/imageService');

/**
 * POST /api/admin/images/populate
 * Fetch images from Google Maps + Unsplash, upload to Cloudinary, save to DB
 * Body: { place_id, place_type, place_name, google_place_id? }
 */
router.post('/populate', async (req, res) => {
    try {
        const { place_id, place_type, place_name, google_place_id } = req.body;

        if (!place_id || !place_type || !place_name) {
            return res.status(400).json({ error: 'place_id, place_type, and place_name are required' });
        }

        const result = await imageService.populateImages({
            place_id,
            place_type,
            place_name,
            google_place_id,
        });

        res.json(result);
    } catch (err) {
        console.error('POST /api/admin/images/populate error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/admin/images/entities/list
 * Get list of places/cities/countries with image counts
 */
router.get('/entities/list', async (req, res) => {
    try {
        const { type = 'POI', page = 1, limit = 50, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const tableMap = { 'POI': 'places', 'CITY': 'cities', 'COUNTRY': 'countries' };
        const table = tableMap[type] || 'places';

        // 1. Fetch base entities
        const supabase = require('../config/supabaseClient');
        let query = supabase.from(table).select('*', { count: 'exact' });

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data: entities, count: total, error } = await query
            .order(type === 'POI' ? 'created_at' : 'name', { ascending: type !== 'POI' })
            .range(offset, parseInt(offset) + parseInt(limit) - 1);

        if (error) throw error;
        if (!entities || entities.length === 0) {
            return res.json({ success: true, data: [], total: 0 });
        }

        // 2. Fetch image counts for these entities
        const ids = entities.map(e => String(e.id || e.place_id));
        const fetchIds = ids.map(id => imageService.formatPlaceIdAsUuid(id));

        // Fetch all image records for these IDs
        const { data: imagesForIds, error: imgError } = await supabase
            .from('place_images')
            .select('place_id')
            .in('place_id', fetchIds);

        if (imgError) throw imgError;

        const countMap = {};
        if (imagesForIds) {
            imagesForIds.forEach(img => {
                countMap[img.place_id] = (countMap[img.place_id] || 0) + 1;
            });
        }

        // 3. Attach image counts
        const enrichedEntities = entities.map(e => {
            const id = String(e.id || e.place_id);
            const uuidKey = imageService.formatPlaceIdAsUuid(id);
            return {
                id,
                name: e.name,
                type,
                google_place_id: e.google_place_id,
                image_count: countMap[uuidKey] || 0,
                has_images: (countMap[uuidKey] || 0) > 0
            };
        });

        res.json({
            success: true,
            data: enrichedEntities,
            total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error('GET /api/admin/images/entities/list error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/admin/images/:placeId
 * Get all images for a place
 */
router.get('/:placeId', async (req, res) => {
    try {
        const { placeType } = req.query;
        const images = await imageService.getImagesForPlace(req.params.placeId, placeType);
        res.json({ success: true, images });
    } catch (err) {
        console.error('GET /api/admin/images/:placeId error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/admin/images/:imageId
 * Delete a single image from Cloudinary + DB
 */
router.delete('/:imageId', async (req, res) => {
    try {
        await imageService.deleteImage(req.params.imageId);
        res.json({ success: true, message: 'Image deleted' });
    } catch (err) {
        console.error('DELETE /api/admin/images/:imageId error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
