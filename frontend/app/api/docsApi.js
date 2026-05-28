const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const handleResponse = async (res) => {
    if (!res.ok) {
        let msg = 'Failed to fetch docs API';
        try {
            const data = await res.json();
            msg = data.error || msg;
        } catch (e) { }
        throw new Error(msg);
    }
    return res.json();
};

/**
 * Fetch guidelines or policy docs for Person 3 workflow reference.
 * Note: If backend endpoint is missing, this handles graceful failure or returns mock data.
 */
export async function getWorkerGuidelines() {
    try {
        const res = await fetch(`${apiBase}/api/docs/guidelines`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
        });
        return await handleResponse(res);
    } catch (error) {
        console.warn('Docs endpoint not yet fully implemented. Returning fallback stubs.', error);
        return {
            success: true,
            docs: [
                { id: '1', title: 'WHO Clinical Triage Protocol', type: 'PDF' },
                { id: '2', title: 'Maternal Assessment Guide', type: 'ARTICLE' }
            ]
        };
    }
}
/**
 * Get current docs configuration and availability status
 */
async function getDocsStatus() {
    const res = await fetch(`${apiBase}/api/docs/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    });
    return handleResponse(res);
}

/**
 * Get docs statistics (patient count, workers, etc.)
 */
async function getDocsStats() {
    const res = await fetch(`${apiBase}/api/docs/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    });
    return handleResponse(res);
}

/**
 * Update docs configuration (admin only)
 */
async function updateDocsConfig(token, config) {
    const res = await fetch(`${apiBase}/api/docs/admin/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
    });
    return handleResponse(res);
}

/**
 * Get dynamic Markdown sections content from backend
 */
async function getDocsContent() {
    const res = await fetch(`${apiBase}/api/docs/content`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    });
    return handleResponse(res);
}

/**
 * Get evidence library sources catalog
 */
async function getDocsEvidence() {
    const res = await fetch(`${apiBase}/api/docs/evidence`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    });
    return handleResponse(res);
}

export default {
    getDocsStatus,
    getDocsStats,
    updateDocsConfig,
    getDocsContent,
    getDocsEvidence
};