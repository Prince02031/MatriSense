/**
 * Hospital API - Handle hospital lookup and assignment
 */

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Get all hospitals with optional filters
 */
export async function getHospitals(filters = {}) {
  try {
    const url = new URL(`${apiBase}/api/hospitals`);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Failed to get hospitals: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    throw error;
  }
}

/**
 * Get nearby hospitals sorted by Haversine distance
 * @param {Object} params - { latitude, longitude, district, maxDistanceKm }
 */
export async function getNearbyHospitals({ latitude, longitude, district, maxDistanceKm = 50 }) {
  try {
    const url = new URL(`${apiBase}/api/hospitals/nearby`);
    
    if (latitude) url.searchParams.append('latitude', latitude);
    if (longitude) url.searchParams.append('longitude', longitude);
    if (district) url.searchParams.append('district', district);
    if (maxDistanceKm) url.searchParams.append('maxDistanceKm', maxDistanceKm);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Failed to get nearby hospitals: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching nearby hospitals:', error);
    throw error;
  }
}

/**
 * Seed demo hospital data
 */
export async function seedDemoHospitals() {
  try {
    const response = await fetch(`${apiBase}/api/hospitals/seed-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`Failed to seed hospitals: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Error seeding demo hospitals:', error);
    throw error;
  }
}
