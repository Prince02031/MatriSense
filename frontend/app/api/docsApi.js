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
