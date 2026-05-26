// frontend/app/api/patientApi.js

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Helper to get the auth token safely
 */
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('matrisense_token');
  }
  return null;
};

/**
 * Helper for authenticated fetch requests
 */
const authFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  return response;
};

// ============================================================================
// PROFILE ENDPOINTS
// ============================================================================

export const createPatient = async (patientData) => {
  const res = await authFetch(`${API_BASE}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  return res.json();
};

export const getMyPatient = async () => {
  const res = await authFetch(`${API_BASE}/api/patients/me`);
  return res.json();
};

export const updatePatient = async (patientId, patientData) => {
  const res = await authFetch(`${API_BASE}/api/patients/${patientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  return res.json();
};

export const getPatient = async (patientId) => {
  const res = await authFetch(`${API_BASE}/api/patients/${patientId}`);
  return res.json();
};

// ============================================================================
// DOCUMENT ENDPOINTS
// ============================================================================

/**
 * Upload a document (multipart/form-data)
 * Note: We DO NOT set 'Content-Type' manually when sending FormData,
 * the browser will automatically generate the multipart boundary.
 */
export const uploadPatientDocument = async (formData) => {
  const token = getToken();

  const response = await fetch(`${API_BASE}/api/patients/me/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // 'Content-Type': 'multipart/form-data' // let browser handle it
    },
    body: formData,
  });

  return response.json();
};

export const getMyPatientDocuments = async () => {
  const res = await authFetch(`${API_BASE}/api/patients/me/documents`);
  return res.json();
};

export const deletePatientDocument = async (documentId) => {
  const res = await authFetch(`${API_BASE}/api/patients/me/documents/${documentId}`, {
    method: 'DELETE',
  });
  return res.json();
};
