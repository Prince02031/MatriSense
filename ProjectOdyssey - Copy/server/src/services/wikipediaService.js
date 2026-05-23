const axios = require('axios');

/**
 * Fetch summary data from Wikipedia given a URL or Title.
 * URL Example: https://en.wikipedia.org/wiki/Paris
 * API: https://en.wikipedia.org/api/rest_v1/page/summary/Paris
 */
async function fetchWikipediaData(urlOrTitle) {
    try {
        let title = urlOrTitle;

        // Extract title from URL if provided
        if (urlOrTitle.startsWith('http')) {
            const urlParts = urlOrTitle.split('/');
            title = urlParts[urlParts.length - 1];
        }

        // Decode URI component (e.g., Paris%20France -> Paris France)
        title = decodeURIComponent(title);

        const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

        const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'ProjectOdyssey/1.0 (contact@projectodyssey.com)' }
        });
        const data = response.data;

        return {
            success: true,
            data: {
                title: data.title,
                description: data.description, // Short description (e.g., "Capital of France")
                extract: data.extract,         // Longer summary text
                thumbnail: data.thumbnail ? data.thumbnail.source : null,
                originalimage: data.originalimage ? data.originalimage.source : null,
                coordinates: data.coordinates ? {
                    lat: data.coordinates.lat,
                    lon: data.coordinates.lon
                } : null,
                page_url: data.content_urls?.desktop?.page || urlOrTitle
            }
        };

    } catch (error) {
        console.error("Wikipedia Fetch Error:", error.message);
        return {
            success: false,
            error: error.response?.status === 404 ? "Page not found" : "Failed to fetch data"
        };
    }
}

module.exports = { fetchWikipediaData };
