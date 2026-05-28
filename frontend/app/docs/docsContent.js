/**
 * Static documentation content for MatriSense
 * Organized by sections for easy navigation and updates
 */

export const TEAM_DATA = [
  {
    id: 1,
    name: 'Team Lead',
    role: 'Project Lead',
    email: 'lead@matrisense.org',
    contribution: 'Vision, Strategy, Integration',
    image: '[avatar-1]' // Placeholder for avatar image
  },
  {
    id: 2,
    name: 'Backend Developer',
    role: 'Full-Stack Engineer',
    email: 'backend@matrisense.org',
    contribution: 'API, Database, AI Integration',
    image: '[avatar-2]'
  },
  {
    id: 3,
    name: 'Frontend Developer',
    role: 'UI/UX Engineer',
    email: 'frontend@matrisense.org',
    contribution: 'Patient UI, Health Worker Dashboard, Maps',
    image: '[avatar-3]'
  }
];

export const DOCS_SECTIONS = {
  hero: {
    id: 'hero',
    title: 'MatriSense',
    subtitle: 'AI-Assisted Maternal Triage for Rural Bangladesh',
    stage: 'Working MVP',
    pitch: 'A Bangla-first mobile platform that brings AI-powered maternal health screening to rural clinics, enabling early risk detection and smart referrals to appropriate facilities.',
    ctas: [
      { text: 'Demo Flow', href: '#judge-demo' },
      { text: 'Architecture', href: '#architecture' },
      { text: 'Safety Model', href: '#safety' }
    ]
  },

  pitch: {
    id: 'pitch',
    title: 'YC-style Pitch',
    sections: [
      {
        heading: 'Problem',
        content:
          'In rural Bangladesh, pregnant mothers lack access to trained health professionals who can reliably screen for maternal danger signs. Many critical conditions go undetected until emergencies occur, leading to preventable maternal deaths (MMR: ~173/100k live births). Health workers at clinics exist but have limited training and inconsistent decision-making frameworks.'
      },
      {
        heading: 'Solution',
        content:
          'MatriSense is a Bangla-first mobile platform that uses AI to extract and confirm maternal symptoms in natural language, applies evidence-based rule engines to triage risk, integrates rule-aware RAG guidance, validates output through safety guardrails, and empowers trained health workers to make final medical/referral decisions. All data is stored locally and encrypted.'
      },
      {
        heading: 'Why Now',
        content:
          'Rural Bangladesh has rising mobile penetration (60%+ in some regions), growing NGO/clinic networks, recent maternal health policy focus, and proven demand for mobile-first health tools. LLMs now enable fast symptom extraction in Bangla. Open standards (FHIR-like schemas) reduce vendor lock-in.'
      },
      {
        heading: 'Target Users',
        content:
          'Primary: Pregnant mothers and family in rural areas. Secondary: Community health workers, clinic nurses, midwives, and maternal health coordinators at NGOs and district hospitals. Tertiary: Policy makers and maternal health program coordinators.'
      },
      {
        heading: 'Market Opportunity',
        content:
          'Bangladesh: ~3.5M annual births, 50%+ in rural areas. Addressable: ~1.8M mothers/year in underserved rural clinics. Adjacent: India, Nepal, West Africa (280M+ births/year). B2B model: NGOs, clinics, district hospitals, government health programs. Estimated TAM: $15-50M/year in South Asia.'
      },
      {
        heading: 'Business Model',
        content:
          'B2B SaaS: Clinics and NGOs pay per active worker or per triage (tiered pricing). Clinic features unlocked: health worker dashboards, case history, referral audit logs. Device licensing: One-time fee for offline Android tablets. Government contracts: Maternal health program integration. Data partnerships: Anonymized, aggregated data for research (not PII).'
      },
      {
        heading: 'Go-To-Market',
        content:
          'Phase 1 (Months 1-3): Partner with 1-2 pilot NGOs in Sylhet/Chittagong, gather feedback, stabilize MVP. Phase 2 (Months 4-6): Scale to 5+ NGOs, train health workers, build track record. Phase 3 (Months 7+): Approach district hospitals and government programs, explore international expansion to India/Nepal.'
      },
      {
        heading: 'Competition',
        content:
          'Mhealth.app (symptom checker, not workflow-integrated), IntraHealth (mhealth apps but not AI-driven), WHO digital toolkits (static, not personalized), local clinic software (doesn\'t address triage). MatriSense differentiator: Bangla-first, rule-aware RAG, safety-validated, offline-capable, health-worker-integrated.'
      },
      {
        heading: 'Unique Advantage',
        content:
          'Combination: Bangla-first LLM extraction + rule-based clinical triage + RAG guidance + safety validation + health worker empowerment (no AI-alone decisions). Evidence-based workflows reduce decision fatigue and support human judgment. Open data model supports interoperability and future enhancements.'
      },
      {
        heading: 'Vision',
        content:
          '2-3 years: MatriSense is deployed in 500+ rural clinics across Bangladesh, Ghana, and India, improving maternal outcomes for 2M+ mothers annually. 5+ years: Integrated into government maternal health surveillance systems, with offline Android support and GraphRAG for cross-case learning.'
      }
    ]
  },

  productOverview: {
    id: 'product-overview',
    title: 'Product Overview',
    sections: [
      {
        heading: 'Mother Side',
        content:
          'Mothers (or family members) access MatriSense via browser or Android app. They log in or create a quick account, fill in basic profile (name, age, weeks pregnant, contact), then report symptoms in natural Bangla. The app asks confirmation questions, then shows triage result (Low/Medium/High risk) with clear guidance on next steps (home care, clinic visit, or urgent referral).'
      },
      {
        heading: 'Health Worker Side',
        content:
          'Health workers at clinics log into a dashboard showing all active cases (patients who started triage). They can filter by risk level, district, or status. Clicking a case opens full details: symptoms, AI extraction explanation, confirmation answers, triage result, patient location/GPS, and a notes/status update panel. Workers can assign hospitals, update case status, or close resolved cases.'
      },
      {
        heading: 'Referral / Clinic Side',
        content:
          'When a case is HIGH risk or requires specialist care, the health worker assigns a hospital from a seeded regional database and clicks "Deliver Referral to Patient." The patient receives a notification showing hospital name, type, address, phone, and services. Patients can acknowledge the referral or call the hospital directly. Health workers see status updates in real time.'
      },
      {
        heading: 'Regional Referral System',
        content:
          'MatriSense includes a seeded hospital database (currently Bangladesh divisions/districts). Health workers filter hospitals by district or search nearby (GPS-based). They manually assign the best hospital for each case. All assignments are logged for audit and learning. Future: Machine-learning-based allocation hints based on capacity and outcomes.'
      }
    ]
  },

  features: {
    id: 'features',
    title: 'Feature Matrix',
    features: [
      {
        category: 'Patient Input',
        items: [
          { name: 'Patient Profile', status: 'implemented' },
          { name: 'Bangla Symptom Input', status: 'implemented' },
          { name: 'GPS Location Capture', status: 'implemented' }
        ]
      },
      {
        category: 'AI Processing',
        items: [
          { name: 'AI Symptom Extraction', status: 'implemented' },
          { name: 'Follow-up Questions', status: 'implemented' },
          { name: 'LLM Explanation', status: 'implemented' }
        ]
      },
      {
        category: 'Clinical Triage',
        items: [
          { name: 'Rule-Based Triage', status: 'implemented' },
          { name: 'Rule-Aware RAG Guidance', status: 'implemented' },
          { name: 'Safety Validator', status: 'implemented' }
        ]
      },
      {
        category: 'Patient Output',
        items: [
          { name: 'Triage Result Display', status: 'implemented' },
          { name: 'Patient History', status: 'implemented' },
          { name: 'Referral Notifications', status: 'implemented' }
        ]
      },
      {
        category: 'Health Worker Tools',
        items: [
          { name: 'Case Dashboard', status: 'implemented' },
          { name: 'Case Detail View', status: 'implemented' },
          { name: 'Status Updates', status: 'implemented' },
          { name: 'Hospital Assignment', status: 'implemented' },
          { name: 'Health Worker Verification', status: 'implemented' }
        ]
      },
      {
        category: 'Data Management',
        items: [
          { name: 'Patient Document Upload', status: 'implemented' },
          { name: 'Profile Verification', status: 'implemented' },
          { name: 'Regional Referral Tracking', status: 'implemented' },
          { name: 'Hospital Database', status: 'implemented' }
        ]
      },
      {
        category: 'Data Science Roadmap',
        items: [
          { name: 'Vector RAG', status: 'in_progress' },
          { name: 'GraphRAG', status: 'planned' },
          { name: 'Analytics Dashboard', status: 'planned' }
        ]
      }
    ]
  },

  architecture: {
    id: 'architecture',
    title: 'Architecture',
    description:
      'MatriSense follows a layered architecture: Frontend (Next.js React) → API Layer (Express.js) → Service Layer (AI, RAG, Safety) → Data Layer (MongoDB).',
    layers: [
      {
        name: 'Frontend (Next.js)',
        components: [
          'Patient Triage UI (Bangla input, confirmation)',
          'Health Worker Dashboard (case list, detail)',
          'Patient Dashboard (history, referrals)',
          'Admin Panel (docs, user management)'
        ]
      },
      {
        name: 'API Layer (Express.js)',
        components: [
          'Auth Routes (JWT, role-based)',
          'Triage Routes (symptom submission, result)',
          'Patient Routes (profile, history)',
          'Worker Routes (case management)',
          'Hospital Routes (search, assignment)',
          'Docs Routes (public status, admin config)'
        ]
      },
      {
        name: 'Service Layer',
        components: [
          'LLM Client (Gemini API or local fallback)',
          'Rule Engine (clinical decision logic)',
          'RAG Service (rule-aware guidance retrieval)',
          'Safety Validator (guardrails, output validation)',
          'Speech Service (optional Bangla audio input)'
        ]
      },
      {
        name: 'Data Layer (MongoDB)',
        components: ['User', 'Patient', 'TriageSession', 'Hospital', 'DocsConfig', 'AuditLog']
      }
    ]
  },

  dataFlow: {
    id: 'data-flow',
    title: 'Data Flow',
    description: 'From patient symptom input to health worker action:',
    steps: [
      '1. Patient reports symptoms in Bangla',
      '2. LLM extracts structured symptoms and explains reasoning',
      '3. UI asks confirmation questions',
      '4. Patient confirms/corrects',
      '5. Rule engine processes caseState → risk level',
      '6. RAG retrieves allowed guidance (filtered by risk level, rules)',
      '7. LLM generates explanations for guidance',
      '8. Safety validator checks output (no diagnosis, no prescription, etc.)',
      '9. Result shown to patient (risk + guidance + warning signs)',
      '10. Case appears on health worker dashboard',
      '11. Health worker reviews evidence, updates status, assigns hospital',
      '12. Referral notification delivered to patient',
      '13. Full audit trail captured (who, what, when, why)'
    ]
  },

  aiLayer: {
    id: 'ai-layer',
    title: 'AI Layer',
    sections: [
      {
        heading: 'Symptom Extraction',
        content:
          'Patients report symptoms in natural Bangla. An LLM (Gemini or local) parses the text, extracts structured symptoms (symptom name, severity, duration), and provides an explanation (which words triggered which symptom codes). The frontend confirms extracted symptoms with the patient before proceeding.'
      },
      {
        heading: 'Clinical Triage',
        content:
          'The rule engine applies evidence-based clinical rules (WHO guidelines, HEAR HER campaign, Bangladesh maternal health protocols) to classify risk level: LOW, MEDIUM, HIGH. Rules are human-readable and can be audited. No ML-based risk scoring (ensuring interpretability and clinical accountability).'
      },
      {
        heading: 'Rule-Aware RAG',
        content:
          'Given the risk level and confirmed symptoms, a RAG service retrieves guidance from a knowledge base. Retrieval is filtered by rule: HIGH-risk cases cannot suggest home care; LOW-risk cases must include warning signs. Guidance is returned as structured cards (title, content, sources, evidence tags).'
      },
      {
        heading: 'LLM Explanation',
        content:
          'The LLM generates human-friendly explanations: why these symptoms were extracted, why this risk level was assigned, why this guidance is recommended. Explanations are shown to both patients and health workers for transparency.'
      },
      {
        heading: 'Safety Validator',
        content:
          'Before returning results to patients or health workers, a safety layer checks: (a) No diagnoses (e.g., "sepsis") are suggested—only symptom-based risk; (b) No prescriptions or dosages; (c) No downgrading of HIGH-risk cases; (d) Presence of warning signs for LOW-risk cases; (e) Fallback templates if safety checks fail. If output is unsafe, a fallback template is used instead.'
      }
    ]
  },

  ragStrategy: {
    id: 'rag-strategy',
    title: 'RAG Strategy',
    sections: [
      {
        heading: 'Current: Rule-Aware JSON/Card RAG',
        content:
          'Guidance is stored as structured JSON cards with metadata: symptom codes, risk level (LOW/MEDIUM/HIGH), evidence tags, guidance type (home-care, clinic-visit, urgent-referral). Retrieval is deterministic: given a case (symptom set + risk level), return matching guidance cards. No semantic search yet; rules ensure safety.'
      },
      {
        heading: 'Upgrade: Vector RAG',
        content:
          'Embed guidance cards into a vector database (e.g., Weaviate, Chroma) using multilingual embeddings (e.g., multilingual-e5). At retrieval time, embed the case description and perform semantic search to find related guidance. Still apply rule filters (no HIGH-risk home-care, etc.). Improves coverage for edge cases and new symptom combinations.'
      },
      {
        heading: 'Roadmap: GraphRAG',
        content:
          'Build a knowledge graph linking symptoms, rules, guidance, and outcomes. GraphRAG can perform richer reasoning: "This symptom cluster is similar to case X, which had outcome Y." Supports multi-hop reasoning and cross-case learning. Planned for Q3 2026.'
      },
      {
        heading: 'Metadata Filters',
        content:
          'All guidance is tagged with: (a) Applicable symptom codes; (b) Risk level range (LOW/MEDIUM/HIGH); (c) Evidence source (WHO, HEAR HER, Bangladesh guidelines); (d) Guidance type (self-care, clinic-visit, specialist, urgent); (e) Conditions (e.g., only for 3rd trimester). Filters ensure consistent, safe retrieval.'
      }
    ]
  },

  safety: {
    id: 'safety',
    title: 'Safety Guardrails',
    rules: [
      {
        rule: 'No Diagnosis',
        description: 'Output must never suggest a diagnosis (e.g., "preeclampsia"). Only symptom-based risk levels are allowed.'
      },
      {
        rule: 'No Prescription',
        description: 'Output must never recommend specific drugs or dosages. Guidance is limited to "seek clinic care" or "seek urgent care."'
      },
      {
        rule: 'No Risk Downgrade',
        description: 'If rule engine assigns HIGH risk, guidance cannot suggest home care or downgrade to a lower level.'
      },
      {
        rule: 'LOW-Risk Must Warn',
        description: 'LOW-risk cases must include a list of warning signs that trigger urgent care (e.g., "If bleeding worsens, seek immediate care").'
      },
      {
        rule: 'Fallback Templates',
        description:
          'If any safety check fails, a safe fallback template is used instead of LLM-generated content. This ensures consistency and prevents prompt injection attacks.'
      },
      {
        rule: 'Human-in-the-Loop',
        description:
          'Health workers have final authority over medical decisions and referrals. AI provides evidence and guidance; humans decide next steps. All decisions are logged.'
      }
    ]
  },

  privacy: {
    id: 'privacy',
    title: 'Privacy & Data Protection',
    sections: [
      {
        heading: 'Patient Data Collected',
        content:
          'Profile: Name, age, phone, address, weeks pregnant. Pregnancy info: LMP, expected delivery, previous pregnancies. Symptoms: Text input (in Bangla), AI-extracted symptoms (coded). Follow-up answers: Confirmation responses. Triage session: Final result, guidance, explanation. Optional: National ID, birth certificate photos (uploaded for verification). Optional: Previous medical reports/prescriptions (patient uploads). Optional: GPS location (patient enables).'
      },
      {
        heading: 'Health Worker Data',
        content:
          'Profile: Full name, email, phone, role, assigned district(s). Verification: Uploaded credentials (license, certificate photos). Account status (pending, verified, rejected). All worker actions (case assignments, referrals, status updates) are logged with timestamp and user ID.'
      },
      {
        heading: 'Role-Based Access',
        content:
          'Patients see only their own data. Health workers see cases in their assigned district(s). Admin can toggle docs visibility and scheduling. Future: Regional coordinators see multiple districts; clinic managers see clinic-specific cases.'
      },
      {
        heading: 'Regional Access Control',
        content:
          'Health workers are mapped to coverage districts and upazilas. Case queries are filtered by worker coverage. A health worker in Sylhet cannot see cases from Dhaka. This ensures privacy and supports decentralized workflows.'
      },
      {
        heading: 'Audit Logging',
        content:
          'All case state changes, referrals, and hospital assignments are logged to AuditLog. Logs include: action, user ID, case ID, old value, new value, timestamp. Logs are immutable and retained for 2+ years for compliance and learning.'
      },
      {
        heading: 'Demo Data',
        content:
          'A set of synthetic patient profiles and cases are seeded for demo/testing. Demo data is clearly labeled and never mixed with production data. All production data is encrypted at rest (MongoDB encryption) and in transit (HTTPS).'
      }
    ]
  },

  regionalReferral: {
    id: 'regional-referral',
    title: 'Regional Referral & Hospital Assignment',
    sections: [
      {
        heading: 'Health Worker Coverage',
        content:
          'Each health worker has an assigned coverage zone: primary district and secondary upazilas. This ensures they only see and manage cases in their area. Coverage is set by admin/regional coordinator during onboarding.'
      },
      {
        heading: 'Patient Location',
        content:
          'Patients provide location via GPS (automatic) or manual entry (division, district, upazila, address). Location is captured at triage start and stored as part of the triage session snapshot. This ensures referrals are based on patient location, not worker location.'
      },
      {
        heading: 'Hospital Database',
        content:
          'A seeded hospital database includes: name, type (clinic, health center, hospital), division, district, upazila, GPS coordinates, services (maternity, ICU, etc.), contact phone. Hospitals are filterable by type, district, or distance from patient. Demo data includes ~15 hospitals across Bangladesh.'
      },
      {
        heading: 'Hospital Search & Assignment',
        content:
          'Health worker clicks "Assign Hospital" on a HIGH-risk case. A modal shows nearby hospitals (sorted by distance using Haversine formula). Worker selects the best hospital and clicks "Assign." This creates an assignment record with snapshot (hospital name, type, phone, district, distance), reasoning (worker can add notes), timestamp, and worker ID.'
      },
      {
        heading: 'Referral Notification',
        content:
          'After assignment, worker clicks "Deliver Referral to Patient." Patient receives a notification on their dashboard with hospital details and a "Acknowledge" button. Once patient acknowledges, health worker sees the status change. A direct "Call Hospital" button is provided for urgent coordination.'
      },
      {
        heading: 'Audit Trail',
        content:
          'All assignment/reassignment events are logged: original assignment, reason, reassignment (if any), acknowledgment status, delivery timestamp, patient GPS accuracy. This enables learning (which hospitals provide best outcomes?) and accountability (which workers make appropriate referrals?).'
      }
    ]
  },

  apiSummary: {
    id: 'api-summary',
    title: 'API Summary',
    groups: [
      {
        name: 'Auth',
        endpoints: [
          { method: 'POST', path: '/api/auth/register', description: 'Patient/worker registration' },
          { method: 'POST', path: '/api/auth/login', description: 'Login, returns JWT' },
          { method: 'POST', path: '/api/auth/logout', description: 'Logout, invalidate token' }
        ]
      },
      {
        name: 'Patient',
        endpoints: [
          { method: 'GET', path: '/api/patients/:id', description: 'Fetch patient profile' },
          { method: 'PUT', path: '/api/patients/:id', description: 'Update profile' },
          { method: 'GET', path: '/api/patients/:id/history', description: 'Fetch triage history' },
          {
            method: 'POST',
            path: '/api/documents/upload',
            description: 'Upload document (ID, prescription, report)'
          }
        ]
      },
      {
        name: 'Triage',
        endpoints: [
          { method: 'POST', path: '/api/triage/start', description: 'Begin new triage session' },
          { method: 'POST', path: '/api/triage/submit-symptoms', description: 'Submit symptoms' },
          { method: 'POST', path: '/api/triage/confirm', description: 'Confirm extracted symptoms' },
          { method: 'POST', path: '/api/triage/follow-up', description: 'Submit follow-up answers' },
          { method: 'GET', path: '/api/triage/:sessionId', description: 'Fetch session + result' }
        ]
      },
      {
        name: 'Worker',
        endpoints: [
          {
            method: 'GET',
            path: '/api/worker/cases',
            description: 'List cases assigned to worker (filtered by district)'
          },
          { method: 'GET', path: '/api/worker/cases/:sessionId', description: 'Case detail' },
          {
            method: 'PUT',
            path: '/api/worker/cases/:sessionId',
            description: 'Update case status (in-progress, closed, etc.)'
          },
          {
            method: 'POST',
            path: '/api/worker/cases/:sessionId/assign-hospital',
            description: 'Assign hospital to case'
          }
        ]
      },
      {
        name: 'Referral Notes',
        endpoints: [
          {
            method: 'POST',
            path: '/api/referral-notes',
            description: 'Create referral note for a case'
          },
          {
            method: 'GET',
            path: '/api/referral-notes/:caseId',
            description: 'Fetch referral notes for case'
          }
        ]
      },
      {
        name: 'Hospitals',
        endpoints: [
          { method: 'GET', path: '/api/hospitals/list', description: 'List hospitals (with filters)' },
          {
            method: 'GET',
            path: '/api/hospitals/nearby',
            description: 'Get nearby hospitals (GPS-based, Haversine sort)'
          },
          { method: 'POST', path: '/api/hospitals/seed-demo', description: 'Seed demo hospital data' }
        ]
      },
      {
        name: 'Docs',
        endpoints: [
          {
            method: 'GET',
            path: '/api/docs/status',
            description: 'Check docs availability (public, no auth)'
          },
          {
            method: 'GET',
            path: '/api/docs/stats',
            description: 'Get live system stats (public, no auth)'
          },
          {
            method: 'PUT',
            path: '/api/docs/admin/status',
            description: 'Update docs config (admin only)'
          }
        ]
      }
    ]
  },

  dataModel: {
    id: 'data-model',
    title: 'Data Model Summary',
    models: [
      {
        name: 'User',
        fields: [
          'userId (ObjectId)',
          'role (patient/worker/admin)',
          'email, phone',
          'fullName',
          'coverageDistricts[] (for workers)',
          'isVerified, verificationPending',
          'isActive, createdAt, updatedAt'
        ]
      },
      {
        name: 'Patient',
        fields: [
          'patientId (ObjectId)',
          'userId (ref User)',
          'age, phoneNumber',
          'pregnancyInfo { lmp, edd, previousPregnancies }',
          'location { division, district, upazila, address }',
          'gpsCoordinates (optional)',
          'createdAt, updatedAt'
        ]
      },
      {
        name: 'TriageSession',
        fields: [
          'sessionId (ObjectId)',
          'patientId (ref Patient)',
          'status (started, in_progress, completed, referred)',
          'symptoms (text input)',
          'extractedSymptoms (AI-parsed)',
          'riskLevel (LOW, MEDIUM, HIGH)',
          'guidanceCards[]',
          'profileSnapshot (immutable patient data at session start)',
          'assignedHospitalId, assignedHospitalSnapshot',
          'createdAt, updatedAt'
        ]
      },
      {
        name: 'ReferralNote',
        fields: [
          'referralId (ObjectId)',
          'triageSessionId (ref TriageSession)',
          'fromWorkerId (ref User)',
          'toHospitalId (ref Hospital)',
          'reason, status (pending, acknowledged, delivered)',
          'createdAt, updatedAt'
        ]
      },
      {
        name: 'Hospital',
        fields: [
          'hospitalId (ObjectId)',
          'name, type (clinic, health-center, hospital)',
          'division, district, upazila',
          'latitude, longitude (GPS)',
          'phone, address',
          'services[] (maternity, ICU, emergency, etc.)',
          'isActive, createdAt'
        ]
      },
      {
        name: 'DocsConfig',
        fields: [
          'configId (ObjectId)',
          'isPublic (boolean)',
          'availableFrom, availableUntil (dates)',
          'updatedBy (ref User)',
          'version (audit)',
          'updatedAt'
        ]
      },
      {
        name: 'AuditLog',
        fields: [
          'logId (ObjectId)',
          'action (case-opened, case-closed, referral-sent, etc.)',
          'userId (ref User)',
          'resourceId, resourceType',
          'changes { oldValue, newValue }',
          'timestamp'
        ]
      }
    ]
  },

  stats: {
    id: 'stats',
    title: 'Live System Snapshot',
    description: 'Real-time metrics from /api/docs/stats:',
    metrics: [
      { label: 'Total Patients', key: 'totalPatients' },
      { label: 'Total Triage Sessions', key: 'totalTriageSessions' },
      { label: 'High-Risk Cases', key: 'highRiskCases' },
      { label: 'Medium-Risk Cases', key: 'mediumRiskCases' },
      { label: 'Low-Risk Cases', key: 'lowRiskCases' },
      { label: 'Pending Cases', key: 'pendingCases' },
      { label: 'Resolved Cases', key: 'resolvedCases' },
      { label: 'Referral Notes', key: 'referralNotes' },
      { label: 'Active Hospitals', key: 'hospitals' },
      { label: 'Health Workers', key: 'healthWorkers' },
      { label: 'Active Workers', key: 'activeWorkers' }
    ]
  },

  team: {
    id: 'team',
    title: 'Team',
    description: 'MatriSense is built by a dedicated team of healthcare innovators and engineers.',
    members: TEAM_DATA
  },

  roadmap: {
    id: 'roadmap',
    title: 'Roadmap',
    phases: [
      {
        phase: 'Short Term (Months 1-3)',
        items: [
          'Stabilize MVP (backend/frontend testing)',
          'Regional referral workflow (finalize hospital assignment)',
          'Health worker verification (admin UI)',
          'Demo data refresh (realistic case scenarios)',
          'Documentation & judge guide'
        ]
      },
      {
        phase: 'Mid Term (Months 4-6)',
        items: [
          'Vector RAG integration (semantic search for guidance)',
          'Analytics dashboard (outcomes by district, hospital)',
          'Offline support (Android sync)',
          'Push notifications (referral delivery alerts)',
          'Expanded languages (Urdu, Hindi support)'
        ]
      },
      {
        phase: 'Long Term (Months 7+)',
        items: [
          'GraphRAG (cross-case reasoning)',
          'Local LLM support (offline AI inference)',
          'Clinic & NGO deployment (multi-tenant SaaS)',
          'Government integration (health surveillance system)',
          'International expansion (India, Nepal, West Africa)'
        ]
      }
    ]
  },

  changelog: {
    id: 'changelog',
    title: 'Changelog',
    versions: [
      {
        version: '1.0.0',
        date: 'June 2026',
        changes: [
          'Initial MVP launch',
          'Patient triage workflow (Bangla symptoms → AI extraction → risk triage)',
          'Health worker dashboard (case management, status updates)',
          'Regional referral system (hospital assignment, notifications)',
          'Profile management (patient info, document upload)',
          'Safety guardrails (no diagnosis, no prescription)'
        ]
      },
      {
        version: '0.9.0',
        date: 'May 2026',
        changes: [
          'Rule-aware RAG integration',
          'LLM explanation display',
          'Health worker verification workflow',
          'Patient GPS capture (optional)'
        ]
      },
      {
        version: '0.8.0',
        date: 'April 2026',
        changes: [
          'Basic triage engine',
          'Patient history',
          'Health worker case list',
          'Bangla symptom input (manual)'
        ]
      }
    ]
  },

  judgeDemoGuide: {
    id: 'judge-demo',
    title: 'Judge Demo Guide',
    steps: [
      {
        step: '1. Mother Side: Register & Profile',
        description: 'Visit the app, click "Register as Mother," fill in name, age, phone, weeks pregnant. Confirm email/phone. Go to Profile, enable GPS (optional) or manually enter location.'
      },
      {
        step: '2. Mother Side: Report Symptoms',
        description: 'Click "Start New Triage." In natural Bangla, describe symptoms (e.g., "মাথা ব্যথা এবং চোখে ঝাপসা দেখছি" — "headache and blurry vision"). Click "Submit."'
      },
      {
        step: '3. AI Extraction & Confirmation',
        description:
          'See AI-extracted symptoms (headache, blurred vision) with codes. Confirm or correct. Click "Confirm Symptoms." AI shows reasoning: which words → which codes.'
      },
      {
        step: '4. Follow-Up Questions',
        description: 'UI asks targeted follow-ups (e.g., "Did bleeding occur?", "Any swelling in hands/face?"). Answer in Bangla. AI extracts answers.'
      },
      {
        step: '5. View Triage Result',
        description: 'See result: Risk level (LOW/MEDIUM/HIGH), guidance (go home + watch for warning signs, OR visit clinic, OR urgent referral), explanation (why this guidance), warning signs list.'
      },
      {
        step: '6. Health Worker Side: Register & Verify',
        description: 'In new browser tab, visit app, click "Register as Health Worker," fill email, phone, choose clinic district, upload mock license photo. Submit for verification (status = "pending"). (Admin can mark verified.)'
      },
      {
        step: '7. Health Worker: Dashboard & Case List',
        description: 'Log in as health worker. Dashboard shows: "Active Cases," "Pending Referrals," recent updates. Click "View Cases." Filter by district (if multiple). See mother\'s case in list.'
      },
      {
        step: '8. Health Worker: Case Detail',
        description:
          'Click on mother\'s case. View: patient name, age, symptoms, AI extraction + reasoning, follow-up answers, risk level, guidance, patient GPS/location. See a map with mother\'s location and nearby hospitals.'
      },
      {
        step: '9. Health Worker: Hospital Assignment (if HIGH risk)',
        description:
          'If result is HIGH risk, click "Assign Hospital." Modal shows nearby hospitals (sorted by distance). Select one and click "Select Hospital." Modal closes; assignment is saved.'
      },
      {
        step: '10. Health Worker: Deliver Referral',
        description:
          'After assignment, click "Deliver Referral to Patient" button. Confirmation popup appears. Click confirm. In real time, mother\'s dashboard updates with hospital notification.'
      },
      {
        step: '11. Mother Side: Receive & Acknowledge Referral',
        description:
          'Go back to mother\'s browser tab. Refresh or wait for auto-update. See "Referral Notification" on dashboard. Click it; see hospital name, type, address, phone, services. Click "Acknowledge" or "Call Hospital."'
      },
      {
        step: '12. Health Worker: Follow-Up',
        description:
          'Health worker can see on case detail that referral was acknowledged. Can add status update note (e.g., "Patient will visit hospital on June 12"). Case history and audit trail show all actions.'
      }
    ]
  }
};

export const docsContent = {
  ...DOCS_SECTIONS,
  'product-overview': DOCS_SECTIONS.productOverview,
  'data-flow': DOCS_SECTIONS.dataFlow,
  'ai-layer': DOCS_SECTIONS.aiLayer,
  'rag-strategy': DOCS_SECTIONS.ragStrategy,
  'regional-referral': DOCS_SECTIONS.regionalReferral,
  'api-summary': DOCS_SECTIONS.apiSummary,
  'data-model': DOCS_SECTIONS.dataModel,
  'judge-demo': DOCS_SECTIONS.judgeDemoGuide
};
export default docsContent;
