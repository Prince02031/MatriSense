const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('matrisense_token') : null;

const getAuthHeaders = () => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const handleResponse = async (res) => {
    if (!res.ok) {
        let msg = 'Failed to fetch referral API';
        try {
            const data = await res.json();
            msg = data.error || msg;
        } catch (e) { }
        throw new Error(msg);
    }
    return res.json();
};

// Issue 6 fix: accepts a single payload object matching backend expectations:
// { triageSessionId, actionTaken, statusAfterNote, note, referredTo?, followUpDate? }
export async function createReferralNote(payload) {
    const res = await fetch(`${apiBase}/api/referral-notes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
}

// Issue 6b fix: now includes Authorization header so notes load correctly
export async function getReferralNote(sessionId) {
    const res = await fetch(`${apiBase}/api/referral-notes/${sessionId}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    return handleResponse(res);
}
