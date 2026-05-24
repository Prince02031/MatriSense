const GENERAL_DANGER_SIGN_TAGS = [
  'danger_signs',
  'maternal_warning_signs',
  'urgent_warning_signs',
  'warning_signs',
  'high_risk',
];

const DANGER_SOURCE_HINTS = [
  'who_danger_signs',
  'cdc_hear_her',
  'warning_signs',
  'urgent_maternal_warning',
  'counselling_danger_signs',
];

const KEYWORD_RULES = [
  {
    keywords: ['headache', 'severe headache', 'bad headache', 'মাথাব্যথা', 'মাথা ব্যথা'],
    symptoms: ['headache', 'severe_headache'],
    evidenceTags: ['severe_headache'],
  },
  {
    keywords: ['blurred vision', 'vision changes', 'চোখে ঝাপসা', 'ঝাপসা দেখা', 'দৃষ্টি'],
    symptoms: ['blurred_vision'],
    evidenceTags: ['vision_changes'],
  },
  {
    keywords: ['bleeding', 'vaginal bleeding', 'রক্তপাত'],
    symptoms: ['vaginal_bleeding'],
    evidenceTags: ['vaginal_bleeding'],
  },
  {
    keywords: ['swelling', 'swollen hands', 'swollen face', 'ফোলা', 'হাত ফুলে', 'মুখ ফুলে'],
    symptoms: ['swelling'],
    evidenceTags: ['swelling'],
  },
  {
    keywords: ['fever', 'জ্বর'],
    symptoms: ['fever'],
    evidenceTags: ['fever'],
  },
  {
    keywords: ['severe abdominal pain', 'belly pain', 'পেটে ব্যথা', 'তীব্র পেট ব্যথা'],
    symptoms: ['abdominal_pain', 'severe_abdominal_pain'],
    evidenceTags: ['severe_abdominal_pain'],
  },
  {
    keywords: ['vomiting', 'repeated vomiting', 'বমি', 'বারবার বমি'],
    symptoms: ['vomiting_repeated'],
    evidenceTags: ['repeated_vomiting'],
  },
  {
    keywords: ['reduced fetal movement', 'baby moving less', 'বাচ্চা কম নড়ছে', 'নড়াচড়া কম'],
    symptoms: ['reduced_fetal_movement'],
    evidenceTags: ['reduced_fetal_movement'],
  },
  {
    keywords: ['difficulty breathing', 'shortness of breath', 'শ্বাসকষ্ট'],
    symptoms: ['difficulty_breathing'],
    evidenceTags: ['difficulty_breathing'],
  },
  {
    keywords: ['convulsions', 'seizure', 'fits', 'খিঁচুনি'],
    symptoms: ['convulsions'],
    evidenceTags: ['convulsions'],
  },
  {
    keywords: ['dizziness', 'fainting', 'অজ্ঞান', 'মাথা ঘোরা'],
    symptoms: ['dizziness', 'fainting'],
    evidenceTags: ['dizziness_fainting'],
  },
];

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined || v === '') return [];
  return [v];
}

function uniq(arr) {
  return [...new Set(arr)];
}

function toUpperArr(v) {
  return uniq(
    toArray(v)
      .map((x) => String(x).trim().toUpperCase())
      .filter(Boolean)
  );
}

function toSnakeLower(v) {
  return String(v).toLowerCase().trim().replace(/[\s\-]+/g, '_');
}

function toSnakeLowerArr(v) {
  return uniq(
    toArray(v)
      .map((x) => toSnakeLower(x))
      .filter(Boolean)
  );
}

function isDangerSource(record) {
  const hay = `${record.sourceId || ''} ${record.sourceTitle || ''}`.toLowerCase();
  return DANGER_SOURCE_HINTS.some((h) => hay.includes(h));
}

function detectKeywordEnrichment(text) {
  const t = String(text || '').toLowerCase();
  const symptoms = [];
  const evidenceTags = [];

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => t.includes(String(k).toLowerCase()))) {
      symptoms.push(...rule.symptoms);
      evidenceTags.push(...rule.evidenceTags);
    }
  }

  return {
    symptoms: uniq(symptoms),
    evidenceTags: uniq(evidenceTags),
  };
}

function normalizeChunkMetadata(record) {
  const base = record.metadata || {};
  const keyword = detectKeywordEnrichment(record.text);

  const riskLevelAllowed = toUpperArr(base.riskLevelAllowed).length
    ? toUpperArr(base.riskLevelAllowed)
    : ['HIGH', 'MEDIUM', 'LOW'];

  const guidanceTypes = uniq(
    toUpperArr(base.guidanceTypes)
      .concat(toUpperArr(base.guidanceType))
      .concat(toUpperArr(base.allowedGuidanceTypes))
  );

  let audience = toUpperArr(base.audiences);
  if (!audience.length && record.sourceKind === 'KNOWLEDGE_CARD') {
    if (guidanceTypes.length === 1 && guidanceTypes[0] === 'HEALTH_WORKER_REVIEW') {
      audience = ['HEALTH_WORKER'];
    } else {
      audience = ['PATIENT', 'HEALTH_WORKER'];
    }
  } else if (!audience.length) {
    audience = ['HEALTH_WORKER'];
  }

  const sourceEvidence = toSnakeLowerArr(base.evidenceTags).concat(
    toSnakeLowerArr(base.evidenceTag)
  );
  let evidenceTags = uniq(sourceEvidence.concat(keyword.evidenceTags));
  if (
    ['MARKDOWN', 'PDF', 'HTML'].includes(record.sourceKind) &&
    record.metadata?.trusted !== false &&
    isDangerSource(record)
  ) {
    evidenceTags = uniq(evidenceTags.concat(GENERAL_DANGER_SIGN_TAGS));
  }

  const symptoms = uniq(toSnakeLowerArr(base.symptoms).concat(keyword.symptoms));

  return {
    symptoms,
    evidenceTags,
    audience,
    riskLevelAllowed,
    guidanceTypes,
    trusted: base.trusted !== false,
    priority: base.priority || 3,
    sourceUse: base.sourceUse || null,
    language: (base.language || ['en'])[0] || 'en',
  };
}

module.exports = {
  normalizeChunkMetadata,
  GENERAL_DANGER_SIGN_TAGS,
};
