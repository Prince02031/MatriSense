// Next.js API route: POST /api/triage/[sessionId]/preference
// Proxies patient hospital preference requests to the backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(request, { params: paramsPromise }) {
  try {
    const { sessionId } = await paramsPromise;
    const body = await request.json();

    const response = await fetch(`${API_BASE}/api/triage/${sessionId}/preference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          authorization: request.headers.get('authorization')
        })
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('POST /api/triage/[sessionId]/preference error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
