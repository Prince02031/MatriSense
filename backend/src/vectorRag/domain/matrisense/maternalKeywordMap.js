/**
 * Maternal Health Keyword Map
 * Maps maternal health symptoms and conditions to concept categories
 * Supports English and Bengali terminology
 */

const MATERNAL_KEYWORDS = {
  // Vaginal bleeding
  vaginal_bleeding: {
    condition: 'vaginal_bleeding',
    riskLevel: 'HIGH',
    evidenceTags: ['WHO_PREGNANCY_DANGER_SIGNS', 'CDC_HEAR_HER_CAMPAIGN'],
    keywords: {
      en: [
        'vaginal bleeding',
        'vaginal bleed',
        'bleeding from vagina',
        'blood in vagina',
        'vaginal hemorrhage',
        'antepartum hemorrhage',
        'postpartum hemorrhage',
        'bleeding during pregnancy',
      ],
      bn: [
        'যোনি রক্তপাত',
        'যোনি থেকে রক্ত',
        'রক্তক্ষরণ',
        'গর্ভাবস্থায় রক্তপাত',
      ],
    },
  },

  // Convulsion/seizure
  convulsion: {
    condition: 'convulsion',
    riskLevel: 'HIGH',
    evidenceTags: ['WHO_PREGNANCY_DANGER_SIGNS', 'ECLAMPSIA_PREECLAMPSIA'],
    keywords: {
      en: [
        'convulsion',
        'seizure',
        'eclampsia',
        'fits',
        'convulsive',
        'loss of consciousness',
        'muscle spasm',
        'uncontrolled muscle movement',
      ],
      bn: [
        'খিঁচুনি',
        'আঁক্ষেপ',
        'অজ্ঞান হয়ে যাওয়া',
        'মৃগী রোগ',
      ],
    },
  },

  // Headache / Severe headache
  severe_headache: {
    condition: 'severe_headache',
    riskLevel: 'HIGH',
    evidenceTags: ['PREECLAMPSIA_WARNING', 'HYPERTENSION_EMERGENCY'],
    keywords: {
      en: [
        'severe headache',
        'worst headache',
        'unbearable headache',
        'persistent headache',
        'headache with vision changes',
        'thunderclap headache',
      ],
      bn: [
        'গুরুতর মাথাব্যথা',
        'তীব্র মাথাব্যথা',
        'অসহনীয় মাথাব্যথা',
        'চরম মাথাব্যথা',
      ],
    },
  },

  // Blurred vision / Visual disturbance
  blurred_vision: {
    condition: 'blurred_vision',
    riskLevel: 'HIGH',
    evidenceTags: ['PREECLAMPSIA_WARNING', 'HYPERTENSION_EMERGENCY'],
    keywords: {
      en: [
        'blurred vision',
        'vision changes',
        'visual disturbance',
        'difficulty seeing',
        'double vision',
        'spots before eyes',
        'flashing lights',
        'temporary vision loss',
      ],
      bn: [
        'দৃষ্টি ঝাপসা',
        'দৃষ্টি পরিবর্তন',
        'দেখতে অসুবিধা',
        'চোখের সামনে দাগ',
      ],
    },
  },

  // Severe abdominal pain
  severe_abdominal_pain: {
    condition: 'severe_abdominal_pain',
    riskLevel: 'HIGH',
    evidenceTags: ['ACUTE_ABDOMEN', 'PREECLAMPSIA_WARNING'],
    keywords: {
      en: [
        'severe abdominal pain',
        'severe belly pain',
        'severe stomach pain',
        'acute abdominal pain',
        'unbearable abdominal pain',
        'upper abdominal pain',
        'epigastric pain',
        'lower abdominal pain',
      ],
      bn: [
        'গুরুতর পেটের ব্যথা',
        'তীব্র পেটের ব্যথা',
        'অসহনীয় পেটের ব্যথা',
        'তীব্র তলপেটের ব্যথা',
      ],
    },
  },

  // Fever
  fever: {
    condition: 'fever',
    riskLevel: 'MEDIUM',
    evidenceTags: ['INFECTION_RISK', 'POSTPARTUM_INFECTION'],
    keywords: {
      en: [
        'fever',
        'high fever',
        'temperature',
        'elevated temperature',
        'feverish',
        'high temperature',
        'feeling hot',
      ],
      bn: [
        'জ্বর',
        'তাপমাত্রা',
        'উচ্চ তাপমাত্রা',
        'জ্বরজনক',
      ],
    },
  },

  // Severe weakness / Fatigue
  severe_weakness: {
    condition: 'severe_weakness',
    riskLevel: 'MEDIUM',
    evidenceTags: ['ANEMIA_RISK', 'GENERAL_WEAKNESS'],
    keywords: {
      en: [
        'severe weakness',
        'extreme weakness',
        'unable to move',
        'unable to get up',
        'severe fatigue',
        'extreme tiredness',
        'collapse',
      ],
      bn: [
        'গুরুতর দুর্বলতা',
        'চরম দুর্বলতা',
        'চলাফেরা করতে অক্ষম',
        'ওঠার ক্ষমতা নেই',
      ],
    },
  },

  // Difficulty breathing / Severe difficulty breathing
  difficulty_breathing: {
    condition: 'difficulty_breathing',
    riskLevel: 'HIGH',
    evidenceTags: ['RESPIRATORY_DISTRESS', 'PULMONARY_EDEMA'],
    keywords: {
      en: [
        'difficulty breathing',
        'severe difficulty breathing',
        'shortness of breath',
        'severe shortness of breath',
        'breathlessness',
        'cannot breathe',
        'gasping for breath',
        'respiratory distress',
      ],
      bn: [
        'শ্বাসকষ্ট',
        'গুরুতর শ্বাসকষ্ট',
        'শ্বাস নিতে অসুবিধা',
        'দ্রুত শ্বাসপ্রশ্বাস',
      ],
    },
  },

  // Vomiting / Repeated vomiting / Severe vomiting
  severe_vomiting: {
    condition: 'severe_vomiting',
    riskLevel: 'MEDIUM',
    evidenceTags: ['HYPEREMESIS', 'DEHYDRATION_RISK'],
    keywords: {
      en: [
        'repeated vomiting',
        'severe vomiting',
        'persistent vomiting',
        'vomiting everything',
        'unable to keep food down',
        'projectile vomiting',
        'continuous vomiting',
      ],
      bn: [
        'বারবার বমি',
        'গুরুতর বমি',
        'ক্রমাগত বমি',
        'খাবার বমি করা',
      ],
    },
  },

  // Reduced fetal movement
  reduced_fetal_movement: {
    condition: 'reduced_fetal_movement',
    riskLevel: 'HIGH',
    evidenceTags: ['FETAL_DISTRESS', 'FETAL_WELL_BEING'],
    keywords: {
      en: [
        'reduced fetal movement',
        'baby not moving',
        'decreased fetal movement',
        'no fetal movement',
        'baby is not kicking',
        'no kicks from baby',
        'less fetal movement than usual',
      ],
      bn: [
        'ভ্রূণের চলন কমে গেছে',
        'শিশু নাড়ি দিচ্ছে না',
        'ভ্রূণ নড়া-চড়া কমেছে',
        'বাচ্চার লাথ নেই',
      ],
    },
  },

  // Dizziness / Fainting
  dizziness: {
    condition: 'dizziness',
    riskLevel: 'MEDIUM',
    evidenceTags: ['HYPOTENSION_RISK', 'ANEMIA_RISK'],
    keywords: {
      en: [
        'dizziness',
        'dizzy',
        'fainting',
        'faint',
        'giddiness',
        'lightheaded',
        'loss of consciousness',
        'syncope',
      ],
      bn: [
        'মাথা ঘোরা',
        'চক্কর',
        'অজ্ঞান হওয়া',
        'মাথা হালকা অনুভব',
      ],
    },
  },

  // Swelling / Face/hand swelling
  swelling: {
    condition: 'swelling',
    riskLevel: 'MEDIUM',
    evidenceTags: ['PREECLAMPSIA_WARNING', 'EDEMA_ASSESSMENT'],
    keywords: {
      en: [
        'swelling',
        'face swelling',
        'hand swelling',
        'feet swelling',
        'leg swelling',
        'edema',
        'puffiness',
        'facial puffiness',
      ],
      bn: [
        'ফোলাপনা',
        'মুখ ফোলা',
        'হাত ফোলা',
        'পা ফোলা',
        'শোথ',
      ],
    },
  },

  // Chest pain / Fast heartbeat
  chest_pain: {
    condition: 'chest_pain',
    riskLevel: 'HIGH',
    evidenceTags: ['CARDIAC_DISTRESS', 'PULMONARY_EMBOLISM'],
    keywords: {
      en: [
        'chest pain',
        'chest discomfort',
        'chest tightness',
        'fast heartbeat',
        'rapid heartbeat',
        'heart racing',
        'palpitations',
        'irregular heartbeat',
      ],
      bn: [
        'বুকের ব্যথা',
        'বুকে অস্বস্তি',
        'দ্রুত হৃদস্পন্দন',
        'হৃদস্পন্দন অনিয়মিত',
      ],
    },
  },

  // Self-harm thoughts / Suicidal ideation
  self_harm_thoughts: {
    condition: 'self_harm_thoughts',
    riskLevel: 'HIGH',
    evidenceTags: ['MENTAL_HEALTH_CRISIS', 'SUICIDE_RISK'],
    keywords: {
      en: [
        'self-harm',
        'self harm',
        'suicide',
        'suicidal',
        'want to die',
        'no point living',
        'end it all',
        'hurt myself',
        'harm myself',
        'killing myself',
        'depression',
        'hopeless',
      ],
      bn: [
        'আত্মহত্যা',
        'আত্মক্ষতি',
        'নিজেকে ক্ষতি করা',
        'মৃত্যু চাই',
        'জীবনের উদ্দেশ্য নেই',
      ],
    },
  },
};

/**
 * Extract keywords from text (case-insensitive)
 * @param {string} text - Text to search
 * @returns {array} Array of matched condition keys
 */
function extractKeywordsFromText(text) {
  if (!text) return [];

  const lowerText = text.toLowerCase();
  const matched = [];

  for (const [conditionKey, condition] of Object.entries(MATERNAL_KEYWORDS)) {
    const allKeywords = [
      ...(condition.keywords.en || []),
      ...(condition.keywords.bn || []),
    ];

    for (const keyword of allKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        if (!matched.includes(conditionKey)) {
          matched.push(conditionKey);
        }
        break;
      }
    }
  }

  return matched;
}

/**
 * Get condition metadata by condition key
 * @param {string} conditionKey - Condition identifier
 * @returns {object|null} Condition metadata or null
 */
function getConditionMetadata(conditionKey) {
  return MATERNAL_KEYWORDS[conditionKey] || null;
}

/**
 * Get all conditions matching symptom keywords
 * @param {array} symptoms - Array of symptom identifiers
 * @returns {array} Array of matched conditions
 */
function getConditionsFromSymptoms(symptoms) {
  if (!Array.isArray(symptoms)) return [];

  const matched = [];
  for (const symptom of symptoms) {
    if (MATERNAL_KEYWORDS[symptom]) {
      matched.push(MATERNAL_KEYWORDS[symptom]);
    }
  }
  return matched;
}

module.exports = {
  MATERNAL_KEYWORDS,
  extractKeywordsFromText,
  getConditionMetadata,
  getConditionsFromSymptoms,
};
