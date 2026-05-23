// Next.js API route: GET /api/triage/[sessionId]/follow-up
// This proxies requests to the backend /api/triage/:sessionId/follow-up endpoint

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request, { params: paramsPromise }) {
  try {
    const { sessionId } = await paramsPromise;

    // Proxy the request to the backend
    const response = await fetch(`${API_BASE}/api/triage/${sessionId}/follow-up`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          authorization: request.headers.get('authorization'),
        }),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GET /api/triage/[sessionId]/follow-up error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
