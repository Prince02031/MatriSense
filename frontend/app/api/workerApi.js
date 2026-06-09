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
    if (district) url.searchParams.append('district', district);

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

// 6. Get patient documents related to a case
export async function getCaseDocuments(sessionId) {
    if (!sessionId) throw new Error("Local Error: Cannot fetch documents without Session ID.");

    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}/documents`, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

// ============================================================================
// PROFILE & CERTIFICATION ENDPOINTS
// ============================================================================

export async function getMyWorkerProfile() {
    const res = await fetch(`${apiBase}/api/worker/profile/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

export async function updateMyWorkerProfile(payload) {
    const res = await fetch(`${apiBase}/api/worker/profile/me`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
}

export async function uploadWorkerCertification(formData) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('matrisense_token') : null;

    // We explicitly DO NOT set Content-Type so the browser can set the multipart boundary
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const res = await fetch(`${apiBase}/api/worker/profile/certification`, {
        method: 'POST',
        headers,
        body: formData
    });
    return handleResponse(res);
}

export async function getMyWorkerCertification() {
    const res = await fetch(`${apiBase}/api/worker/profile/certification`, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

/**
 * Assign or reassign a hospital to a triage case
 * @param {string} sessionId - Triage session ID
 * @param {string} hospitalId - Hospital ID to assign
 * @param {string} reason - Reason for the assignment
 */
export async function assignHospitalToCase(sessionId, hospitalId, reason) {
    const res = await fetch(`${apiBase}/api/referrals/session/${sessionId}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hospitalId, reason }),
        cache: 'no-store'
    });
    return handleResponse(res);
}

// ============================================================================
// REFERRAL MCP & PATIENT PREFERENCE ENDPOINTS
// ============================================================================

export async function getReferralPreferences(sessionId) {
    const res = await fetch(`${apiBase}/api/referrals/preferences/${sessionId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

export async function acceptReferralPreference(preferenceId) {
    const res = await fetch(`${apiBase}/api/referrals/preferences/${preferenceId}/accept`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(res);
}

export async function rejectReferralPreference(preferenceId, note = '') {
    const res = await fetch(`${apiBase}/api/referrals/preferences/${preferenceId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ note })
    });
    return handleResponse(res);
}

export async function getAssignmentHistory(sessionId) {
    const res = await fetch(`${apiBase}/api/referrals/session/${sessionId}/history`, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

export async function addReferralNote(sessionId, note, actionTaken, statusAfterNote) {
    const res = await fetch(`${apiBase}/api/referrals`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ triageSessionId: sessionId, note, actionTaken, statusAfterNote })
    });
    return handleResponse(res);
}

export async function updateReferralStatusFromWorker(sessionId, status, note = '') {
    const res = await fetch(`${apiBase}/api/referrals/session/${sessionId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, note })
    });
    return handleResponse(res);
}

export async function getReferralNotesForSession(sessionId) {
    if (!sessionId) throw new Error("Local Error: Cannot fetch referral notes without Session ID.");
    const res = await fetch(`${apiBase}/api/referrals/${sessionId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}

// 9. Request GPS coordinates from the patient
export async function requestPatientGPS(sessionId) {
    if (!sessionId) throw new Error("Local Error: Cannot request GPS without Session ID.");
    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}/request-gps`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(res);
}

// 10. Deliver hospital referral to the patient
export async function deliverReferralToPatient(sessionId, hospitalId, reason) {
    if (!sessionId) throw new Error("Local Error: Cannot deliver referral without Session ID.");
    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}/deliver-referral`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hospitalId, reason })
    });
    return handleResponse(res);
}

