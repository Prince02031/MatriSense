/**
 * Retrieval Guards
 * Safety-first filtering for vector retrieval results.
 */

const {
  normalizeChunkMetadata,
  normalizeQueryContext,
} = require('../../retrieval/normalizeRetrievalMetadata');

const DANGER_SIGN_TAGS = new Set([
  'danger_sign',
  'danger_signs',
  'maternal_warning_signs',
  'urgent_warning_signs',
  'warning_signs',
  'high_risk',
]);

const HIGH_RISK_ALLOWED_GUIDANCE = new Set([
  'URGENT_ESCALATION',
  'WARNING_SIGNS',
  'CONTACT_HEALTH_WORKER',
  'SAFETY_DISCLAIMER',
  'HEALTH_WORKER_REVIEW',
]);

const HIGH_RISK_PATIENT_BLOCKED_GUIDANCE = new Set([
  'SYSTEM_CONTEXT',
  'DIGITAL_HEALTH_ARCHITECTURE',
  'FACILITY_READINESS',
]);

const UNSAFE_FOR_PATIENT_PATTERNS = [
  /\bdosage\b/i,
  /\bdose\b/i,
  /\bmedication\b/i,
  /\bdrug\b/i,
  /\btreatment\b/i,
  /\bprocedure\b/i,
  /\bsurgical\b/i,
  /\bintravenous\b/i,
  /\binjection\b/i,
];

function hasUnsafePatientContent(chunkText) {
  if (!chunkText) return false;
  return UNSAFE_FOR_PATIENT_PATTERNS.some((pattern) => pattern.test(chunkText));
}

function audienceAllowed(meta, audience) {
  const aud = meta.audience || [];
  if (audience === 'PATIENT') {
    if (meta.patientRestricted || meta.restrictedPatientContext) {
      return { ok: false, reason: 'patient_restricted_metadata' };
    }
    if (aud.includes('PATIENT')) return { ok: true };
    return { ok: false, reason: 'audience_not_patient' };
  }
  if (audience === 'HEALTH_WORKER') {
    if (aud.includes('HEALTH_WORKER') || aud.includes('PATIENT')) return { ok: true };
    return { ok: false, reason: 'audience_not_health_worker' };
  }
  if (audience === 'ADMIN') {
    if (aud.includes('ADMIN') || aud.includes('HEALTH_WORKER')) return { ok: true };
    return { ok: false, reason: 'audience_not_admin' };
  }
  if (audience === 'DOCS') {
    if (aud.includes('DOCS')) return { ok: true };
    return { ok: false, reason: 'audience_not_docs' };
  }
  return { ok: false, reason: 'unknown_audience' };
}

function riskAllowed(meta, query) {
  const risks = meta.riskLevelAllowed || [];
  const guidance = meta.guidanceTypes || [];
  const isKnowledgeCard = meta.sourceKind === 'KNOWLEDGE_CARD';
  const selfCareOnly =
    guidance.length === 1 && guidance[0] === 'SELF_CARE_AND_MONITOR';

  if (query.riskLevel === 'HIGH') {
    const hasHighRisk = risks.includes('HIGH') || risks.includes('ALL') || risks.length === 0;
    if (!hasHighRisk && !(isKnowledgeCard && guidance.length > 0)) {
      return { ok: false, reason: 'risk_not_high_compatible' };
    }
    if (selfCareOnly) {
      return { ok: false, reason: 'high_risk_self_care_only' };
    }
  }

  return { ok: true };
}

function guidanceAllowed(meta, query) {
  const guidance = meta.guidanceTypes || [];
  if (guidance.length === 0) return { ok: true };

  if (query.targetAudience === 'PATIENT') {
    if (guidance.some((g) => HIGH_RISK_PATIENT_BLOCKED_GUIDANCE.has(g))) {
      return { ok: false, reason: 'patient_non_patient_guidance' };
    }
    if (guidance.includes('REFERRAL_WORKFLOW')) {
      return { ok: false, reason: 'patient_referral_workflow' };
    }
  }

  if (query.riskLevel === 'HIGH') {
    if (query.targetAudience === 'PATIENT') {
      if (guidance.length === 1 && guidance[0] === 'SELF_CARE_AND_MONITOR') {
        return { ok: false, reason: 'patient_high_risk_self_care_only' };
      }
    }

    const hasAllowed = guidance.some((g) => HIGH_RISK_ALLOWED_GUIDANCE.has(g));
    if (!hasAllowed && meta.sourceKind !== 'KNOWLEDGE_CARD') {
      return { ok: false, reason: 'high_risk_guidance_mismatch' };
    }
  }

  return { ok: true };
}

function relevanceAllowed(meta, query) {
  const evidenceOverlap = meta.evidenceTags.some((tag) => query.evidenceTags.includes(tag));
  const symptomOverlap = meta.symptoms.some((sym) => query.confirmedSymptoms.includes(sym));
  const highRiskDangerTag =
    query.riskLevel === 'HIGH' &&
    meta.evidenceTags.some((tag) => DANGER_SIGN_TAGS.has(tag));
  const knowledgeCardCompatible =
    meta.sourceKind === 'KNOWLEDGE_CARD' &&
    meta.guidanceTypes.length > 0 &&
    (query.riskLevel !== 'HIGH' ||
      meta.guidanceTypes.some((g) => HIGH_RISK_ALLOWED_GUIDANCE.has(g)));

  if (evidenceOverlap || symptomOverlap || highRiskDangerTag || knowledgeCardCompatible) {
    return { ok: true };
  }

  return { ok: false, reason: 'no_evidence_or_symptom_overlap' };
}

function evaluateChunk(chunk, queryConfig) {
  const meta = normalizeChunkMetadata(chunk);
  const query = normalizeQueryContext(queryConfig);
  const rejectionReasons = [];

  const audienceCheck = audienceAllowed(meta, query.targetAudience);
  if (!audienceCheck.ok) rejectionReasons.push(audienceCheck.reason);

  if (query.targetAudience === 'PATIENT' && hasUnsafePatientContent(meta.text)) {
    rejectionReasons.push('unsafe_clinical_content_for_patient');
  }

  const riskCheck = riskAllowed(meta, query);
  if (!riskCheck.ok) rejectionReasons.push(riskCheck.reason);

  const guidanceCheck = guidanceAllowed(meta, query);
  if (!guidanceCheck.ok) rejectionReasons.push(guidanceCheck.reason);

  const relevanceCheck = relevanceAllowed(meta, query);
  if (!relevanceCheck.ok) rejectionReasons.push(relevanceCheck.reason);

  return {
    allowed: rejectionReasons.length === 0,
    score: meta.score || 0,
    normalized: meta,
    rejectionReasons,
  };
}

function toReturnShape(meta, rejectionReasons = []) {
  return {
    chunkId: meta.chunkId,
    sourceId: meta.sourceId,
    sourceTitle: meta.sourceTitle,
    sourceKind: meta.sourceKind,
    score: meta.score,
    audience: meta.audience,
    riskLevelAllowed: meta.riskLevelAllowed,
    guidanceTypes: meta.guidanceTypes,
    evidenceTags: meta.evidenceTags,
    symptoms: meta.symptoms,
    trusted: meta.trusted,
    rejectionReasons,
  };
}

function filterChunksThroughGuards(chunks, queryConfig) {
  const accepted = [];
  const rejected = [];
  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    const evaluation = evaluateChunk(chunk, queryConfig);
    const shaped = toReturnShape(evaluation.normalized, evaluation.rejectionReasons);
    if (evaluation.allowed) {
      accepted.push({
        ...shaped,
        text: evaluation.normalized.text,
      });
    } else {
      rejected.push(shaped);
    }
  }

  accepted.sort((a, b) => (b.score || 0) - (a.score || 0));
  return { accepted, rejected };
}

module.exports = {
  hasUnsafePatientContent,
  evaluateChunk,
  filterChunksThroughGuards,
};
