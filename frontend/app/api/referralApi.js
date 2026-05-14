const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

export async function createReferralNote(payload) {
    const res = await fetch(`${apiBase}/api/referral-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
}

export async function getReferralNote(sessionId) {
    const res = await fetch(`${apiBase}/api/referral-notes/${sessionId}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    });
    return handleResponse(res);
}
