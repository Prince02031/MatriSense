const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const handleResponse = async (res) => {
    if (!res.ok) {
        let msg = 'Failed to fetch';
        try {
            const data = await res.json();
            msg = data.error || msg;
        } catch (e) { }
        throw new Error(msg);
    }
    return res.json();
};

export async function getWorkerCases() {
    const res = await fetch(`${apiBase}/api/worker/cases`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    });
    return handleResponse(res);
}

export async function getWorkerCase(sessionId) {
    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    });
    return handleResponse(res);
}

export async function updateWorkerCaseStatus(sessionId, status) {
    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    return handleResponse(res);
}

export async function getAuditLog(sessionId) {
    const res = await fetch(`${apiBase}/api/worker/cases/${sessionId}/audit`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    });
    return handleResponse(res);
}
