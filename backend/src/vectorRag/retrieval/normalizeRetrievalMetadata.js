function toArray(value) {
  if (Array.isArray(value)) return value.filter((v) => v !== null && v !== undefined);
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function toUpperArray(value) {
  return toArray(value).map((v) => String(v).trim().toUpperCase()).filter(Boolean);
}

function toSnakeLower(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, '_');
}

function toSnakeLowerArray(value) {
  return toArray(value).map((v) => toSnakeLower(v)).filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeChunkMetadata(chunk = {}) {
  const sourceKind = String(chunk.sourceKind || '').toUpperCase();

  const audienceRaw = unique(
    toUpperArray(chunk.audience).concat(toUpperArray(chunk.allowedAudiences))
  );
  const guidanceTypes = unique(
    toUpperArray(chunk.guidanceTypes).concat(toUpperArray(chunk.guidanceType))
  );
  const riskLevelAllowed = unique(
    toUpperArray(chunk.riskLevelAllowed).concat(toUpperArray(chunk.riskLevelsAllowed))
  );
  const evidenceTags = unique(
    toSnakeLowerArray(chunk.evidenceTags).concat(toSnakeLowerArray(chunk.evidenceTag))
  );
  const symptoms = unique(
    toSnakeLowerArray(chunk.symptoms).concat(toSnakeLowerArray(chunk.symptom))
  );

  let audience = audienceRaw;
  if (audience.length === 0 && sourceKind === 'KNOWLEDGE_CARD') {
    audience = ['PATIENT', 'HEALTH_WORKER'];
  }

  return {
    chunkId: chunk.chunkId || null,
    sourceId: chunk.sourceId || null,
    sourceTitle: chunk.sourceTitle || null,
    sourceKind,
    score: chunk.similarityScore || chunk.score || 0,
    audience,
    riskLevelAllowed,
    guidanceTypes,
    evidenceTags,
    symptoms,
    trusted: chunk.trusted !== false,
    patientRestricted: chunk.patientRestricted === true,
    restrictedPatientContext: chunk.restrictedPatientContext === true,
    text: chunk.text || '',
  };
}

function normalizeQueryContext(queryConfig = {}) {
  const riskLevel = String(queryConfig.riskLevel || 'MEDIUM').toUpperCase();
  const targetAudience = String(queryConfig.targetAudience || 'PATIENT').toUpperCase();
  const evidenceTags = toSnakeLowerArray(queryConfig.evidenceTags);
  const confirmedSymptoms = toSnakeLowerArray(queryConfig.components?.confirmedSymptoms || []);
  const allowedGuidanceType = toUpperArray(queryConfig.allowedGuidanceType);

  return {
    riskLevel,
    targetAudience,
    evidenceTags,
    confirmedSymptoms,
    allowedGuidanceType,
  };
}

module.exports = {
  normalizeChunkMetadata,
  normalizeQueryContext,
};
