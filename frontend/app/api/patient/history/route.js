export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const limit = searchParams.get('limit') || '10';
    const skip = searchParams.get('skip') || '0';
    const token = searchParams.get('token');

    if (!patientId) {
      return Response.json({ error: 'patientId is required' }, { status: 400 });
    }

    // Call backend to get patient history
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(
      `${backendUrl}/api/triage/patient/${patientId}/history?limit=${limit}&skip=${skip}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch' }));
      return Response.json(error, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('[PatientHistoryAPI] Error:', error);
    return Response.json(
      { error: 'Failed to fetch history', message: error.message },
      { status: 500 }
    );
  }
}
