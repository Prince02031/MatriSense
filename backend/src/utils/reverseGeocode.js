/**
 * Reverse-geocode coordinates using OpenStreetMap Nominatim.
 * Returns { division, district, upazilaOrThana, addressOrVillage } or nulls.
 *
 * Nominatim usage policy: max 1 req/sec, User-Agent required.
 * For production scale, use a self-hosted Nominatim or paid service.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{division: string|null, district: string|null, upazilaOrThana: string|null, addressOrVillage: string|null}>}
 */
async function reverseGeocode(lat, lng) {
    const result = { division: null, district: null, upazilaOrThana: null, addressOrVillage: null };

    if (lat == null || lng == null) return result;

    try {
        const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'MatriSense/1.0 (matrisense-health-app)'
            }
        });

        if (!response.ok) {
            console.warn('[reverseGeocode] Nominatim returned', response.status);
            return result;
        }

        const data = await response.json();
        const addr = data.address || {};

        // Bangladesh admin hierarchy mapping:
        //   state         → Division  (e.g. "Dhaka Division")
        //   county/state_district → District (e.g. "Dhaka District")
        //   suburb/town/city_district → Upazila/Thana
        //   village/hamlet/neighbourhood → Address/Village

        // Division — strip " Division" suffix if present
        result.division = (addr.state || '').replace(/\s*Division$/i, '').trim() || null;

        // District — prefer state_district, fallback to county
        const rawDistrict = addr.state_district || addr.county || '';
        result.district = rawDistrict.replace(/\s*District$/i, '').trim() || null;

        // Upazila / Thana
        result.upazilaOrThana = addr.suburb || addr.town || addr.city_district || addr.city || null;

        // Address / Village — build from fine-grained fields
        const parts = [addr.village, addr.hamlet, addr.neighbourhood, addr.road].filter(Boolean);
        result.addressOrVillage = parts.length > 0 ? parts.join(', ') : (data.display_name || null);

        return result;
    } catch (err) {
        console.warn('[reverseGeocode] Failed:', err.message);
        return result;
    }
}

module.exports = { reverseGeocode };
