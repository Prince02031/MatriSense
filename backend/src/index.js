require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const triageRoutes = require('./routes/triage.routes');
const workerRoutes = require('./routes/worker.routes');
const referralRoutes = require('./routes/referral.routes');

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'matrisense-backend', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/referrals', referralRoutes);

app.get('/api/message', (_req, res) => {
  res.json({ message: 'Backend is running successfully.' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

app.listen(port, () => {
  console.log(`Express server running on http://localhost:${port}`);
});
