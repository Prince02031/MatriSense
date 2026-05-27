// Patient API client
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('matrisense_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res) => {
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const d = await res.json(); msg = d.error || d.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
};

// GET /api/patients/me  — profile of the logged-in patient
export const getMyProfile = async () => {
  const res = await fetch(`${apiBase}/api/patients/me`, {
    headers: getAuthHeaders(),
    cache: 'no-store'
  });
  return handleResponse(res);
};

// POST /api/patients — create patient profile
export const createPatient = async (patientData) => {
  const res = await fetch(`${apiBase}/api/patients`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(patientData)
  });
  return handleResponse(res);
};

// GET /api/patients/:id — get patient profile by id
export const getPatient = async (patientId) => {
  const res = await fetch(`${apiBase}/api/patients/${patientId}`, {
    headers: getAuthHeaders(),
    cache: 'no-store'
  });
  return handleResponse(res);
};

// PUT /api/patients/:id — update patient profile
export const updatePatient = async (patientId, patientData) => {
  const res = await fetch(`${apiBase}/api/patients/${patientId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(patientData)
  });
  return handleResponse(res);
};
