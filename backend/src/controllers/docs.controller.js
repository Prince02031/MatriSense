const DocsConfig = require('../models/DocsConfig');
const TriageSession = require('../models/TriageSession');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const ReferralNote = require('../models/ReferralNote');
const fs = require('fs');
const path = require('path');

// Content root detection helper
const getDocsDir = () => {
  if (process.env.DOCS_CONTENT_DIR) {
    return process.env.DOCS_CONTENT_DIR;
  }
  const primaryPath = path.resolve(process.cwd(), 'docs');
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }
  const fallbackPath = path.resolve(process.cwd(), '..', 'docs');
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }
  return primaryPath;
};

/**
 * GET /api/docs/status
 * Get documentation availability status (public endpoint)
 */
const getDocsStatus = async (req, res) => {
  try {
    const config = await DocsConfig.findOne().populate('updatedBy', 'fullName email');

    if (!config) {
      // Default config if none exists - widened window for judging safety
      return res.json({
        isPublic: true,
        availableFrom: new Date('2026-01-01T00:00:00Z'),
        availableUntil: new Date('2026-12-31T23:59:59Z'),
        isAvailableNow: true,
        updatedAt: new Date()
      });
    }

    const now = new Date();
    const isAvailableNow = config.isPublic && now >= config.availableFrom && now <= config.availableUntil;

    res.json({
      isPublic: config.isPublic,
      availableFrom: config.availableFrom,
      availableUntil: config.availableUntil,
      isAvailableNow,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy
    });
  } catch (error) {
    console.error('Error fetching docs status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch docs status', error: error.message });
  }
};


/**
 * GET /api/docs/stats
 * Get live system statistics (public endpoint)
 */
const getDocsStats = async (req, res) => {
  try {
    // Fetch counts from MongoDB
    const totalPatients = await Patient.countDocuments({});
    const totalTriageSessions = await TriageSession.countDocuments({});
    const highRiskCases = await TriageSession.countDocuments({ riskLevel: 'HIGH' });
    const mediumRiskCases = await TriageSession.countDocuments({ riskLevel: 'MEDIUM' });
    const lowRiskCases = await TriageSession.countDocuments({ riskLevel: 'LOW' });
    const pendingCases = await TriageSession.countDocuments({ status: { $in: ['started', 'in_progress'] } });
    const resolvedCases = await TriageSession.countDocuments({ status: { $in: ['completed', 'referred'] } });
    const referralNotes = await ReferralNote.countDocuments({});
    const hospitals = await Hospital.countDocuments({ isActive: true });
    const healthWorkers = await User.countDocuments({ role: 'worker' });
    const activeWorkers = await User.countDocuments({ role: 'worker', isActive: true });

    res.json({
      totalPatients: totalPatients || 0,
      totalTriageSessions: totalTriageSessions || 0,
      highRiskCases: highRiskCases || 0,
      mediumRiskCases: mediumRiskCases || 0,
      lowRiskCases: lowRiskCases || 0,
      pendingCases: pendingCases || 0,
      resolvedCases: resolvedCases || 0,
      referralNotes: referralNotes || 0,
      hospitals: hospitals || 0,
      healthWorkers: healthWorkers || 0,
      activeWorkers: activeWorkers || 0,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching docs stats:', error);
    // Return zeros safely if collection doesn't exist
    res.json({
      totalPatients: 0,
      totalTriageSessions: 0,
      highRiskCases: 0,
      mediumRiskCases: 0,
      lowRiskCases: 0,
      pendingCases: 0,
      resolvedCases: 0,
      referralNotes: 0,
      hospitals: 0,
      healthWorkers: 0,
      activeWorkers: 0,
      lastUpdated: new Date().toISOString(),
      _note: 'Some data sources unavailable'
    });
  }
};

/**
 * PUT /api/admin/docs/status
 * Update documentation availability (admin only)
 */
const updateDocsStatus = async (req, res) => {
  try {
    const { isPublic, availableFrom, availableUntil } = req.body;

    // Validate dates
    if (availableFrom && availableUntil) {
      const from = new Date(availableFrom);
      const to = new Date(availableUntil);
      if (from >= to) {
        return res.status(400).json({
          success: false,
          message: 'availableFrom must be before availableUntil'
        });
      }
    }

    let config = await DocsConfig.findOne();

    if (!config) {
      // Create new config if none exists - widened window
      config = new DocsConfig({
        isPublic: isPublic !== undefined ? isPublic : true,
        availableFrom: availableFrom ? new Date(availableFrom) : new Date('2026-01-01T00:00:00Z'),
        availableUntil: availableUntil ? new Date(availableUntil) : new Date('2026-12-31T23:59:59Z'),
        updatedBy: req.user._id,
        version: 1
      });
    } else {
      // Update existing config
      if (isPublic !== undefined) config.isPublic = isPublic;
      if (availableFrom) config.availableFrom = new Date(availableFrom);
      if (availableUntil) config.availableUntil = new Date(availableUntil);
      config.updatedBy = req.user._id;
      config.version = (config.version || 0) + 1;
      config.updatedAt = new Date();
    }

    await config.save();

    res.json({
      success: true,
      message: 'Documentation config updated',
      config: {
        isPublic: config.isPublic,
        availableFrom: config.availableFrom,
        availableUntil: config.availableUntil,
        updatedAt: config.updatedAt,
        version: config.version
      }
    });
  } catch (error) {
    console.error('Error updating docs status:', error);
    res.status(500).json({ success: false, message: 'Failed to update docs status', error: error.message });
  }
};

/**
 * GET /api/docs/content
 * Returns parsed Markdown content for all sections from repo-root /docs/content
 */
const getDocsContent = async (req, res) => {
  try {
    const docsDir = getDocsDir();
    const contentDir = path.join(docsDir, 'content');
    
    const sections = {};
    
    if (fs.existsSync(contentDir)) {
      const files = fs.readdirSync(contentDir);
      
      // Mapping filenames to frontend section keys
      const filenameMap = {
        '01-hero-summary.md': 'hero',
        '02-yc-pitch.md': 'pitch',
        '03-product-overview.md': 'product-overview',
        '04-feature-matrix.md': 'features',
        '05-architecture.md': 'architecture',
        '06-data-flow.md': 'data-flow',
        '07-ai-layer.md': 'ai-layer',
        '08-rag-strategy.md': 'rag-strategy',
        '09-evidence-library.md': 'evidence-library',
        '10-safety-guardrails.md': 'safety',
        '11-privacy-data-protection.md': 'privacy',
        '12-regional-referral.md': 'regional-referral',
        '13-api-summary.md': 'api-summary',
        '14-data-model-summary.md': 'data-model',
        '15-team.md': 'team',
        '16-roadmap.md': 'roadmap',
        '17-changelog.md': 'changelog',
        '18-judge-demo-guide.md': 'judge-demo'
      };
      
      files.forEach(file => {
        const mappedId = filenameMap[file];
        if (mappedId) {
          const filePath = path.join(contentDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          sections[mappedId] = content;
        }
      });
    }
    
    res.json({
      success: true,
      sections
    });
  } catch (error) {
    console.error('Error fetching docs content:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch docs content', error: error.message });
  }
};

/**
 * GET /api/docs/evidence
 * Returns evidence source metadata from repo-root /docs/evidence-sources.json
 * Checks if files exist under repo-root /docs/evidence/
 */
const getDocsEvidence = async (req, res) => {
  try {
    const docsDir = getDocsDir();
    const evidenceJsonPath = path.join(docsDir, 'evidence-sources.json');
    const evidenceDir = path.join(docsDir, 'evidence');
    
    let evidence = [];
    
    if (fs.existsSync(evidenceJsonPath)) {
      const fileContent = fs.readFileSync(evidenceJsonPath, 'utf8');
      evidence = JSON.parse(fileContent);
    }
    
    // Check if each file exists
    evidence = evidence.map(item => {
      let fileExists = false;
      if (item.fileName) {
        const filePath = path.join(evidenceDir, item.fileName);
        fileExists = fs.existsSync(filePath);
      }
      return { ...item, fileExists };
    });
    
    res.json({
      success: true,
      evidence
    });
  } catch (error) {
    console.error('Error fetching docs evidence:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch docs evidence', error: error.message });
  }
};

/**
 * GET /api/docs/evidence-file/:fileName
 * Serves PDF/MD evidence files from repo-root /docs/evidence
 * Protects against path traversal
 */
const getEvidenceFile = async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Path traversal protection
    if (!fileName || typeof fileName !== 'string' || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Invalid file name. Path traversal blocked.' });
    }
    
    const docsDir = getDocsDir();
    const filePath = path.join(docsDir, 'evidence', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Evidence file not found.' });
    }
    
    // Set appropriate headers based on file extension
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (ext === '.md') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    } else if (ext === '.txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving evidence file:', error);
    res.status(500).json({ success: false, message: 'Failed to serve evidence file', error: error.message });
  }
};

module.exports = {
  getDocsStatus,
  getDocsStats,
  updateDocsStatus,
  getDocsContent,
  getDocsEvidence,
  getEvidenceFile
};
