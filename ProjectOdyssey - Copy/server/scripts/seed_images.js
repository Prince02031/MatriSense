const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

// Supabase Init
const supabase = createClient(process.env.SB_PROJECT_URL, process.env.SB_SERVICE_ROLE_KEY || process.env.SB_API_KEY);

// Cloudinary Init will automatically pick up CLOUDINARY_URL from env if set

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/**
 * Uploads an image URL to Cloudinary and returns the secure URL
 */
async function uploadToCloudinary(imageUrl, folderName = "odyssey_places") {
    try {
        const result = await cloudinary.uploader.upload(imageUrl, {
            folder: folderName,
        });
        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error.message || error);
        return null;
    }
}

/**
 * Fetches photo references from Google Places API using either place_id or text search
 */
async function fetchGooglePhotosForPlace(placeId, name, city, limit = 10) {
    if (!GOOGLE_API_KEY) {
        console.log("No GOOGLE_MAPS_API_KEY provided.");
        return { "urls": [], "newPlaceId": null };
    }

    let resolvedPlaceId = placeId;

    try {
        // If we don't have a place ID, search for one using place name + city
        if (!resolvedPlaceId) {
            const query = encodeURIComponent(`${name} ${city || ''}`.trim());
            const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_API_KEY}`;
            const searchRes = await axios.get(searchUrl);
            if (searchRes.data.results && searchRes.data.results.length > 0) {
                resolvedPlaceId = searchRes.data.results[0].place_id;
            } else {
                return { "urls": [], "newPlaceId": null };
            }
        }

        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${resolvedPlaceId}&fields=photos&key=${GOOGLE_API_KEY}`;
        const response = await axios.get(detailsUrl);
        const photos = response.data.result?.photos || [];

        const urls = photos.slice(0, limit).map(p => {
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${GOOGLE_API_KEY}`
        });

        return { "urls": urls, "newPlaceId": !placeId ? resolvedPlaceId : null };
    } catch (error) {
        console.error(`Error fetching Google photos:`, error.message);
        return { "urls": [], "newPlaceId": null };
    }
}

/**
 * Fetches photos from Unsplash based on a query
 */
async function fetchUnsplashPhotos(query, limit = 3) {
    if (!UNSPLASH_ACCESS_KEY) {
        console.log("No UNSPLASH_ACCESS_KEY provided. Skipping Unsplash.");
        return [];
    }

    try {
        const response = await axios.get('https://api.unsplash.com/search/photos', {
            params: { query, per_page: limit, orientation: 'landscape' },
            headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
        });

        return response.data.results.map(img => img.urls.regular);
    } catch (error) {
        console.error(`Error fetching Unsplash photos for ${query}:`, error.message);
        return [];
    }
}

/**
 * Main seeding function
 */
async function seedImagesForPlaces(limitPlaces = 5) {
    console.log("Starting Image Seeding Process...");

    // Check Config
    if (!process.env.CLOUDINARY_URL) {
        console.error("ERROR: CLOUDINARY_URL is missing in .env. Please add it first.");
        return;
    }

    // You can iterate over countries, cities, or pois. For testing let's grab some POIs without images.
    // Assuming place_id refers to `id` in pois table, and we map it to 'POI' place_type.

    // Find POIs that might need images
    // Limit to 5 for now to cover a few places since we want to run this tonight.
    const { data: places, error } = await supabase
        .from('pois')
        .select('*')
        .limit(limitPlaces);

    if (error) {
        console.error("Supabase error fetching places:", error);
        return;
    }

    console.log(`Found ${places.length} places to process...`);

    for (const place of places) {
        console.log(`\n=================================================`);
        console.log(`Processing Place: ${place.name} (UUID: ${place.id})`);

        let allImageUrls = [];

        // 1. Get Google Photos (max 10)
        console.log(`-> Fetching up to 10 photos from Google API...`);
        const { urls: googleUrls, newPlaceId } = await fetchGooglePhotosForPlace(place.google_place_id, place.name, place.city_name || place.country_name, 10);
        console.log(`-> Google returned ${googleUrls.length} photos.`);

        if (newPlaceId) {
            console.log(`-> Saving newly found google_place_id ${newPlaceId} to db`);
            await supabase.from('pois').update({ google_place_id: newPlaceId }).eq('id', place.id);
        }

        // 2. Get Unsplash Photos (max 3)
        console.log(`-> Fetching up to 3 photos from Unsplash...`);
        // We add the city name to the query to get more accurate images for Unsplash
        const unsplashQuery = `${place.name} ${place.city_name || place.country_name || ''}`;
        const unsplashUrls = await fetchUnsplashPhotos(unsplashQuery, 3);
        console.log(`-> Unsplash returned ${unsplashUrls.length} photos.`);

        allImageUrls = [...googleUrls, ...unsplashUrls];

        if (allImageUrls.length === 0) {
            console.log(`-> No images found for ${place.name}, skipping upload.`);
            continue;
        }

        // 3. Upload to Cloudinary and insert to DB
        console.log(`-> Uploading ${allImageUrls.length} images to Cloudinary & saving to DB...`);
        let displayOrder = 1;

        for (const rawUrl of allImageUrls) {
            const cloudinaryUrl = await uploadToCloudinary(rawUrl);

            if (cloudinaryUrl) {
                // Insert into Supabase place_images
                const { error: insertErr } = await supabase
                    .from('place_images')
                    .insert([{
                        place_id: place.id,
                        place_type: 'POI',
                        url: cloudinaryUrl,
                        display_order: displayOrder,
                        is_verified: true,
                        caption: place.name
                    }]);

                if (insertErr) {
                    console.error("-> Failed to insert URL to DB:", insertErr.message);
                } else {
                    console.log(`-> OK: Saved ${cloudinaryUrl} (Order: ${displayOrder})`);
                    displayOrder++;
                }
            }
        }
    }

    console.log("\n=================================================");
    console.log("Seeding Script Completed!");
}

// Run the script (change limitPlaces to control how many places to seed)
seedImagesForPlaces(5).catch(console.error);
