const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Helper to generate consistent headers with the Auth token
 */
const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('matrisense_token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

/**
 * Global response handler for worker API calls
 */
const handleResponse = async (res) => {
    if (!res.ok) {
        let msg = `Error ${res.status}: ${res.statusText}`;
        try {
            const data = await res.json();
            // Capture specific backend error messages (e.g., "Case not found")
            msg = data.message || data.error || msg;
        } catch (e) {
            // Fallback for non-JSON error responses
        }

        console.error("Worker API Failure Details:", {
            status: res.status,
            message: msg,
            url: res.url
        });

        throw new Error(msg);
    }
    return res.json();
};

// 1. Get all cases for the worker dashboard with pagination and filtering
export async function getWorkerCases(limit = 20, skip = 0, filterMode = 'all', sortBy = 'risk', district = '') {
    const url = new URL(`${apiBase}/api/worker/cases`);
    url.searchParams.append('limit', limit);
    url.searchParams.append('skip', skip);
    url.searchParams.append('filterMode', filterMode);
    url.searchParams.append('sortBy', sortBy);
    if (district) {
        url.searchParams.append('district', district);
    }

    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

// 2. Get a single case detail
export async function getWorkerCase(sessionId) {
    // PREVENT "Route Not Found" by checking for undefined IDs
    if (!sessionId || sessionId === 'undefined') {
        console.error("getWorkerCase was called without a valid sessionId.");
        throw new Error("Local Error: Session ID is missing before request.");
    }

    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

// 3. Update the status of a specific case
export async function updateWorkerCaseStatus(sessionId, status) {
    if (!sessionId) throw new Error("Local Error: Cannot update status without Session ID.");

    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
    });
    return handleResponse(res);
}

// 4. Set follow-up date for a case
export async function setFollowUpDate(sessionId, nextCheckupDate, workerId) {
    if (!sessionId) throw new Error("Local Error: Cannot set follow-up date without Session ID.");

    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}/follow-up-date`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nextCheckupDate, workerId })
    });
    return handleResponse(res);
}

// 5. Get the audit log/timeline for a specific case
export async function getAuditLog(sessionId) {
    if (!sessionId) throw new Error("Local Error: Cannot fetch audit log without Session ID.");

    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}/audit`, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

// 6. Assign or reassign a hospital to a case
export async function assignHospitalToCase(sessionId, hospitalId, reason) {
    if (!sessionId) throw new Error("Local Error: Cannot assign hospital without Session ID.");

    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}/hospital`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hospitalId, reason })
    });
    return handleResponse(res);
}