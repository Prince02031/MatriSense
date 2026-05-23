// server/src/services/imageService.js
// Image population service — Google Maps Photos + Unsplash → Cloudinary → Supabase

const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const supabase = require('../config/supabaseClient');

// ── Configure Cloudinary from CLOUDINARY_URL env var ──
cloudinary.config(); // auto-reads CLOUDINARY_URL

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/**
 * Format a mixed ID (UUID or integer) into a valid UUID string.
 * This handles the case where `places` table uses integer IDs (e.g. 23)
 * but `place_images` table `place_id` column requires a valid UUID.
 */
function formatPlaceIdAsUuid(placeId) {
    const str = String(placeId).toLowerCase();
    // If it's already a valid UUID, return it directly
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(str)) {
        return str;
    }
    // Otherwise, assume it's an integer and pad to 12 hex chars for the final block
    // Using a fake 00000000-0000-0000-0000 block prefix
    const padded = str.padStart(12, '0');
    return `00000000-0000-0000-0000-${padded}`;
}

/**
 * Upload an image buffer or URL to Cloudinary.
 * @param {string} imageUrl - URL of the image to upload
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<{secure_url: string, public_id: string}>}
 */
async function uploadToCloudinary(imageUrl, folder) {
    try {
        const result = await cloudinary.uploader.upload(imageUrl, {
            folder,
            transformation: [
                { width: 1200, height: 800, crop: 'limit' }, // max dimensions
                { quality: 'auto', fetch_format: 'auto' }     // optimise
            ],
            resource_type: 'image',
        });
        return { secure_url: result.secure_url, public_id: result.public_id };
    } catch (err) {
        console.error('[ImageService] Cloudinary upload failed:', err.message);
        return null;
    }
}

/**
 * Fetch photo URLs from Google Maps Place Photos API.
 * @param {string} googlePlaceId - Google Place ID
 * @param {number} maxPhotos - Maximum photos to fetch (default 10)
 * @returns {Promise<string[]>} Array of Google photo URLs
 */
async function fetchGoogleMapsPhotos(googlePlaceId, maxPhotos = 10) {
    if (!googlePlaceId || !GOOGLE_MAPS_API_KEY) return [];

    try {
        // 1. Get place details with photo references
        const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
        const { data } = await axios.get(detailsUrl, {
            params: {
                place_id: googlePlaceId,
                key: GOOGLE_MAPS_API_KEY,
                fields: 'photos'
            }
        });

        if (data.status !== 'OK' || !data.result?.photos) {
            console.log('[ImageService] No Google photos for', googlePlaceId);
            return [];
        }

        // 2. Build photo URLs (up to maxPhotos)
        const photos = data.result.photos.slice(0, maxPhotos);
        return photos.map(photo =>
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
        );
    } catch (err) {
        console.error('[ImageService] Google Maps fetch error:', err.message);
        return [];
    }
}

/**
 * Fetch photos from Unsplash API.
 * @param {string} query - Search query (place name)
 * @param {number} count - Number of photos (default 5)
 * @returns {Promise<string[]>} Array of Unsplash image URLs
 */
async function fetchUnsplashPhotos(query, count = 5) {
    if (!query || !UNSPLASH_ACCESS_KEY) return [];

    try {
        const { data } = await axios.get('https://api.unsplash.com/search/photos', {
            params: {
                query: `${query} travel landmark`,
                per_page: count,
                orientation: 'landscape',
            },
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
        });

        return (data.results || []).map(photo => photo.urls?.regular || photo.urls?.full);
    } catch (err) {
        console.error('[ImageService] Unsplash fetch error:', err.message);
        return [];
    }
}

/**
 * Populate images for a place: fetch from Google Maps + Unsplash,
 * upload to Cloudinary, and store in place_images table.
 *
 * @param {object} params
 * @param {string} params.place_id - UUID of the place
 * @param {string} params.place_type - 'POI' | 'CITY' | 'COUNTRY'
 * @param {string} params.place_name - Human name for search queries
 * @param {string} [params.google_place_id] - Optional Google Place ID
 * @returns {Promise<{success: boolean, images: object[], message: string}>}
 */
async function populateImages({ place_id, place_type, place_name, google_place_id }) {
    const results = { uploaded: [], errors: [] };
    const folder = `odyssey/places/${place_id}`;

    console.log(`[ImageService] Populating images for "${place_name}" (${place_type})`);

    // ── 1. Fetch from Google Maps ──
    let googleUrls = [];
    if (google_place_id) {
        googleUrls = await fetchGoogleMapsPhotos(google_place_id, 10);
        console.log(`[ImageService] Got ${googleUrls.length} Google photos`);
    }

    // ── 2. Fetch from Unsplash ──
    const unsplashUrls = await fetchUnsplashPhotos(place_name, 5);
    console.log(`[ImageService] Got ${unsplashUrls.length} Unsplash photos`);

    // ── 3. Upload all to Cloudinary + insert into DB ──
    const allPhotos = [
        ...googleUrls.map(url => ({ url, source: 'google_maps' })),
        ...unsplashUrls.map(url => ({ url, source: 'unsplash' })),
    ];

    for (let i = 0; i < allPhotos.length; i++) {
        const { url, source } = allPhotos[i];
        try {
            const cloudResult = await uploadToCloudinary(url, folder);
            if (!cloudResult) {
                results.errors.push(`Failed to upload image ${i + 1}`);
                continue;
            }

            // Insert into place_images
            const uuidPlaceId = formatPlaceIdAsUuid(place_id);
            const { data: inserted, error } = await supabase
                .from('place_images')
                .insert({
                    place_id: uuidPlaceId,
                    place_type: place_type.toUpperCase(),
                    url: cloudResult.secure_url,
                    caption: source, // store source in caption field
                    alt_text: `${place_name} - ${source}`,
                    display_order: i,
                })
                .select()
                .single();

            if (error) {
                console.error('[ImageService] DB insert error:', error.message);
                results.errors.push(`DB insert failed for image ${i + 1}: ${error.message}`);
            } else {
                results.uploaded.push(inserted);
            }
        } catch (err) {
            console.error(`[ImageService] Error processing image ${i + 1}:`, err.message);
            results.errors.push(err.message);
        }
    }

    console.log(`[ImageService] Done: ${results.uploaded.length} uploaded, ${results.errors.length} errors`);

    return {
        success: results.uploaded.length > 0,
        images: results.uploaded,
        total: results.uploaded.length,
        errors: results.errors,
        message: `Populated ${results.uploaded.length} images for "${place_name}"`,
    };
}

/**
 * Get all images for a place from the database.
 * @param {string} placeId - UUID
 * @param {string} [placeType] - optional filter by type
 * @returns {Promise<object[]>}
 */
async function getImagesForPlace(placeId, placeType = null) {
    const uuidPlaceId = formatPlaceIdAsUuid(placeId);
    let query = supabase
        .from('place_images')
        .select('*')
        .eq('place_id', uuidPlaceId)
        .order('display_order', { ascending: true });

    if (placeType) {
        query = query.eq('place_type', placeType.toUpperCase());
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

/**
 * Get a single thumbnail URL for a place (first image).
 * @param {string} placeId - UUID
 * @returns {Promise<string|null>}
 */
async function getThumbnail(placeId) {
    const uuidPlaceId = formatPlaceIdAsUuid(placeId);
    const { data } = await supabase
        .from('place_images')
        .select('url')
        .eq('place_id', uuidPlaceId)
        .order('display_order', { ascending: true })
        .limit(1)
        .single();

    return data?.url || null;
}

/**
 * Bulk-fetch thumbnail URLs for multiple place IDs.
 * Returns a map of placeId → thumbnailUrl.
 * @param {string[]} placeIds - Array of UUIDs
 * @returns {Promise<Record<string, string>>}
 */
async function getThumbnailsForPlaces(placeIds) {
    if (!placeIds || placeIds.length === 0) return {};

    const formattedIds = placeIds.map(formatPlaceIdAsUuid);

    // Get the first image for each place using a single query
    const { data, error } = await supabase
        .from('place_images')
        .select('place_id, url')
        .in('place_id', formattedIds)
        .order('display_order', { ascending: true });

    if (error || !data) return {};

    // Pick the first image per place_id
    // Note: since we use padded fake UUIDs for integer places internally,
    // we should return a map mapping the *original* IDs to the URL for easy lookup
    // BUT the data from Supabase will have the UUID format.
    // Instead of reconstructing, maybe the caller passes the original IDs.
    // Let's create a reverse map or just map the returned UUIDs back to integers.
    const urlMap = {};
    for (const row of data) {
        // row.place_id is the uuid string. 
        // e.g. 00000000-0000-0000-0000-000000000017
        // We will store it by the uuid string.
        if (!urlMap[row.place_id]) {
            urlMap[row.place_id] = row.url;
        }
    }

    // We want to return a map of [original ID] -> url
    const result = {};
    for (const id of placeIds) {
        const uuidKey = formatPlaceIdAsUuid(id);
        if (urlMap[uuidKey]) {
            result[String(id)] = urlMap[uuidKey];
        }
    }

    return result;
}

/**
 * Delete an image from Cloudinary and the database.
 * @param {string} imageId - UUID of the image record
 * @returns {Promise<boolean>}
 */
async function deleteImage(imageId) {
    // 1. Get image record
    const { data: image, error: fetchError } = await supabase
        .from('place_images')
        .select('*')
        .eq('id', imageId)
        .single();

    if (fetchError || !image) throw new Error('Image not found');

    // 2. Try to delete from Cloudinary (extract public_id from URL)
    try {
        // Cloudinary URLs look like: https://res.cloudinary.com/.../odyssey/places/xxx/yyy.jpg
        const urlParts = image.url.split('/upload/');
        if (urlParts.length > 1) {
            const publicIdWithExt = urlParts[1].replace(/^v\d+\//, ''); // remove version
            const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');  // remove extension
            await cloudinary.uploader.destroy(publicId);
        }
    } catch (err) {
        console.warn('[ImageService] Cloudinary delete failed (non-fatal):', err.message);
    }

    // 3. Delete from database
    const { error } = await supabase
        .from('place_images')
        .delete()
        .eq('id', imageId);

    if (error) throw error;
    return true;
}

module.exports = {
    populateImages,
    getImagesForPlace,
    getThumbnail,
    getThumbnailsForPlaces,
    deleteImage,
    uploadToCloudinary,
    formatPlaceIdAsUuid,
};
