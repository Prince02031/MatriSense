const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('matrisense_token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const handleResponse = async (res) => {
    if (!res.ok) {
        let msg = `Error ${res.status}: ${res.statusText}`;
        try {
            const data = await res.json();
            msg = data.message || data.error || msg;
        } catch (e) {}
        throw new Error(msg);
    }
    return res.json();
};

export async function getHospitals(filters = {}) {
    const url = new URL(`${apiBase}/api/hospitals`);
    Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
            url.searchParams.append(key, filters[key]);
        }
    });

    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

export async function getNearbyHospitals({ latitude, longitude, district, maxDistanceKm = 50 }) {
    const url = new URL(`${apiBase}/api/hospitals/nearby`);
    if (latitude !== undefined && latitude !== null) url.searchParams.append('latitude', latitude);
    if (longitude !== undefined && longitude !== null) url.searchParams.append('longitude', longitude);
    if (district) url.searchParams.append('district', district);
    if (maxDistanceKm) url.searchParams.append('maxDistanceKm', maxDistanceKm);

    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

export async function seedDemoHospitals() {
    const res = await fetch(`${apiBase}/api/hospitals/seed-demo`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(res);
}
