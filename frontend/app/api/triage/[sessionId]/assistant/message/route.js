// Next.js API route: POST /api/triage/[sessionId]/assistant/message
// This proxies requests to the backend /api/triage/:sessionId/assistant/message endpoint

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(request, { params: paramsPromise }) {
  try {
    const { sessionId } = await paramsPromise;
    const body = await request.json();

    // Proxy the request to the backend
    const response = await fetch(`${API_BASE}/api/triage/${sessionId}/assistant/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          authorization: request.headers.get('authorization'),
        }),
      },
      body: JSON.stringify(body)
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
    console.error('POST /api/triage/[sessionId]/assistant/message error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
