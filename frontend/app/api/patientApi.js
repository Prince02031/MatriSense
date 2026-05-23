// Patient API client

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const createPatient = async (patientData) => {
  // TODO: POST /api/patients
};

export const getPatient = async (patientId) => {
  // TODO: GET /api/patients/:id
};

export const updatePatient = async (patientId, patientData) => {
  // TODO: PUT /api/patients/:id
};
