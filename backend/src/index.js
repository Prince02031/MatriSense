require('dotenv').config();

// Validate Environment Variables
const validateEnv = () => {
  const provider = process.env.LLM_PROVIDER;
  if (!provider) {
    console.error('❌ STARTUP ERROR: LLM_PROVIDER is missing in environment variables.');
    process.exit(1);
  }

  const supportedProviders = ['gemini', 'local'];
  if (!supportedProviders.includes(provider.toLowerCase())) {
    console.error(`❌ STARTUP ERROR: Unsupported LLM_PROVIDER "${provider}". Must be one of: ${supportedProviders.join(', ')}`);
    process.exit(1);
  }

  if (provider.toLowerCase() === 'gemini' && !process.env.GEMINI_API_KEY) {
    console.error('❌ STARTUP ERROR: LLM_PROVIDER is set to gemini, but GEMINI_API_KEY is missing.');
    process.exit(1);
  }
};

validateEnv();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/admin.routes');

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
app.use('/api/admin', adminRoutes);

app.get('/api/message', (_req, res) => {
  res.json({ message: 'Backend is running successfully.' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

app.listen(port, () => {
  console.log(`Express server running on http://localhost:${port}`);
});
