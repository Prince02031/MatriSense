const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function getPatientReferrals() {
    try {
        const res = await fetch(`${API_BASE}/api/patient/referrals`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
            if (res.status === 401) throw new Error('Unauthorized');
            throw new Error(`Error: ${res.statusText}`);
        }

        return await res.json();
    } catch (err) {
        console.error('Failed to fetch patient referrals:', err);
        throw err;
    }
}

export async function markReferralAsRead(referralId) {
    try {
        const res = await fetch(`${API_BASE}/api/patient/referrals/${referralId}/read`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) throw new Error('Failed to mark as read');
        return await res.json();
    } catch (err) {
        console.error('Failed to mark referral as read:', err);
        throw err;
    }
}

export async function acknowledgeReferral(referralId) {
    try {
        const res = await fetch(`${API_BASE}/api/patient/referrals/${referralId}/acknowledge`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) throw new Error('Failed to acknowledge');
        return await res.json();
    } catch (err) {
        console.error('Failed to acknowledge referral:', err);
        throw err;
    }
}

export async function deliverReferralToPatient(sessionId, hospitalId, reason) {
    try {
        const res = await fetch(`${API_BASE}/api/worker/cases/${sessionId}/deliver-referral`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hospitalId,
                reason
            })
        });

        if (!res.ok) throw new Error('Failed to deliver referral');
        return await res.json();
    } catch (err) {
        console.error('Failed to deliver referral:', err);
        throw err;
    }
}
