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
const docsRoutes = require('./routes/docs.routes');
const DocsConfig = require('./models/DocsConfig');

const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();
logRagConfig();

// Initialize default DocsConfig on startup
const initializeDocsConfig = async () => {
  try {
    const existingConfig = await DocsConfig.findOne();
    if (!existingConfig) {
      const defaultConfig = new DocsConfig({
        isPublic: true,
        availableFrom: new Date('2026-06-10T00:00:00Z'),
        availableUntil: new Date('2026-06-14T23:59:59Z'),
        version: 1
      });
      await defaultConfig.save();
      console.log('✓ Initialized default DocsConfig');
    }
  } catch (error) {
    console.error('Error initializing DocsConfig:', error);
  }
};

// Run initialization once mongoose is connected
if (mongoose.connection.readyState === 1) {
  initializeDocsConfig();
} else {
  mongoose.connection.once('connected', () => {
    initializeDocsConfig();
  });
}

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000'
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.replace(/\/$/, '')); // remove trailing slash if present
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, postman, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if the origin matches allowed origins, or is a Vercel deployment domain
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app') || 
                      origin === 'https://matri-sense.vercel.app';
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
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
app.use('/api/patient/referrals', require('./routes/patientReferrals.routes'));
app.use('/api/worker', require('./routes/worker.routes'));
app.use('/api/referral-notes', require('./routes/referral.routes'));
app.use('/api/referrals', require('./routes/referral.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/hospitals', require('./routes/hospital.routes'));
app.use('/api/docs', docsRoutes);
app.use('/api/dev', require('./routes/dev.routes'));

// Mount MCP HTTP Endpoint conditionally based on environment variables
if (process.env.ENABLE_CASE_CONTEXT_MCP === 'true' && process.env.CASE_MCP_ENABLE_HTTP === 'true') {
  const { mcpServer } = require('./mcp/caseContext/server.js');
  const { createMcpRouter } = require('./mcp/caseContext/transports/http');
  app.use('/mcp/case', createMcpRouter(mcpServer));
}

app.get('/api/message', (_req, res) => {
  res.json({ message: 'Backend is running successfully.' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

app.listen(port, () => {
  console.log(`Express server running on http://localhost:${port}`);
});
