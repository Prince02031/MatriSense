require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Validate Environment Variables
const validateEnv = () => {
  let provider = process.env.LLM_PROVIDER || 'gemini';

  const supportedProviders = ['gemini', 'local'];
  if (!supportedProviders.includes(provider.toLowerCase())) {
    console.warn(`⚠️  Unsupported LLM_PROVIDER "${provider}". Defaulting to "gemini" with fallback templates.`);
    provider = 'gemini';
  }

  if (provider.toLowerCase() === 'gemini' && !process.env.GEMINI_API_KEY) {
    console.warn('⚠️  LLM_PROVIDER is set to gemini, but GEMINI_API_KEY is missing. AI explanations will use fallback templates.');
  }
};

validateEnv();

const logRagConfig = () => {
  console.log('[RAG Config]');
  console.log(`  RAG_MODE=${process.env.RAG_MODE || 'hybrid(default)'}`);
  console.log(`  EMBEDDING_PROVIDER=${process.env.EMBEDDING_PROVIDER || 'local(default)'}`);
  console.log(`  EMBEDDING_MODEL=${process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-small(default)'}`);
  console.log(`  EMBEDDING_DIMENSIONS=${process.env.EMBEDDING_DIMENSIONS || '384(default)'}`);
  console.log(`  VECTOR_INDEX_NAME=${process.env.VECTOR_INDEX_NAME || 'vector_index(default)'}`);
};

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const triageRoutes = require('./routes/triage.routes');
const speechRoutes = require('./routes/speech.routes');
const patientRoutes = require('./routes/patient.routes');

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();
logRagConfig();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'matrisense-backend', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/speech', speechRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/worker', require('./routes/worker.routes'));
app.use('/api/referral-notes', require('./routes/referral.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/dev', require('./routes/dev.routes'));

app.get('/api/message', (_req, res) => {
  res.json({ message: 'Backend is running successfully.' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

app.listen(port, () => {
  console.log(`Express server running on http://localhost:${port}`);
});
