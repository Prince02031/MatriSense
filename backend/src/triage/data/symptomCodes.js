/**
 * Approved Symptom Codes for MatriSense Triage
 * Based on WHO PCPNC and CDC HEAR HER guidelines.
 */

const SYMPTOM_DATA = [
  {
    symptomCode: 'headache',
    displayNameEn: 'Headache',
    displayNameBn: 'মাথাব্যথা',
    category: 'neurologic',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['headache_severity', 'vision_change', 'swelling'],
  },
  {
    symptomCode: 'severe_headache',
    displayNameEn: 'Severe headache',
    displayNameBn: 'তীব্র মাথাব্যথা',
    category: 'neurologic',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['vision_change', 'swelling'],
  },
  {
    symptomCode: 'blurred_vision',
    displayNameEn: 'Blurred vision',
    displayNameBn: 'চোখে ঝাপসা দেখা',
    category: 'neurologic',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['headache', 'swelling'],
  },
  {
    symptomCode: 'swelling',
    displayNameEn: 'Swelling of hands/face/feet',
    displayNameBn: 'হাত/মুখ/পা ফুলে যাওয়া',
    category: 'cardiovascular',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['headache', 'vision_change'],
  },
  {
    symptomCode: 'vaginal_bleeding',
    displayNameEn: 'Vaginal bleeding',
    displayNameBn: 'গর্ভাবস্থায় রক্তপাত',
    category: 'bleeding',
    isDangerSign: true,
    defaultSeverity: 'HIGH',
    relatedFollowUpFields: [],
  },
  {
    symptomCode: 'abdominal_pain',
    displayNameEn: 'Abdominal pain',
    displayNameBn: 'পেটব্যথা',
    category: 'abdominal',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['bleeding_present', 'pain_severity'],
  },
  {
    symptomCode: 'severe_abdominal_pain',
    displayNameEn: 'Severe abdominal pain',
    displayNameBn: 'তীব্র পেটব্যথা',
    category: 'abdominal',
    isDangerSign: true,
    defaultSeverity: 'HIGH',
    relatedFollowUpFields: ['bleeding_present'],
  },
  {
    symptomCode: 'fever',
    displayNameEn: 'Fever',
    displayNameBn: 'জ্বর',
    category: 'infection',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['severe_weakness', 'breathing_difficulty'],
  },
  {
    symptomCode: 'severe_weakness',
    displayNameEn: 'Severe weakness',
    displayNameBn: 'খুব দুর্বলতা',
    category: 'general',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['fever', 'breathing_difficulty'],
  },
  {
    symptomCode: 'vomiting',
    displayNameEn: 'Vomiting',
    displayNameBn: 'বমি',
    category: 'gastrointestinal',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['cannot_keep_water_down', 'vomiting_duration'],
  },
  {
    symptomCode: 'vomiting_repeated',
    displayNameEn: 'Repeated vomiting',
    displayNameBn: 'বারবার বমি',
    category: 'gastrointestinal',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['cannot_keep_water_down', 'vomiting_duration'],
  },
  {
    symptomCode: 'cannot_keep_water_down',
    displayNameEn: 'Cannot keep water down',
    displayNameBn: 'পানি পান করলে বমি হয়ে যাচ্ছে',
    category: 'gastrointestinal',
    isDangerSign: true,
    defaultSeverity: 'HIGH',
    relatedFollowUpFields: ['vomiting_duration'],
  },
  {
    symptomCode: 'dizziness',
    displayNameEn: 'Dizziness',
    displayNameBn: 'মাথা ঘোরা',
    category: 'neurologic',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['fainting'],
  },
  {
    symptomCode: 'fainting',
    displayNameEn: 'Fainting',
    displayNameBn: 'অজ্ঞান হওয়া',
    category: 'neurologic',
    isDangerSign: true,
    defaultSeverity: 'HIGH',
    relatedFollowUpFields: [],
  },
  {
    symptomCode: 'convulsion',
    displayNameEn: 'Convulsions or fits',
    displayNameBn: 'খিঁচুনি',
    category: 'neurologic',
    isDangerSign: true,
    defaultSeverity: 'HIGH',
    relatedFollowUpFields: [],
  },
  {
    symptomCode: 'difficulty_breathing',
    displayNameEn: 'Difficulty breathing',
    displayNameBn: 'শ্বাস নিতে কষ্ট',
    category: 'respiratory',
    isDangerSign: true,
    defaultSeverity: 'HIGH',
    relatedFollowUpFields: [],
  },
  {
    symptomCode: 'reduced_fetal_movement',
    displayNameEn: 'Reduced baby movement',
    displayNameBn: 'বাচ্চার নড়াচড়া কম',
    category: 'fetal',
    isDangerSign: true,
    defaultSeverity: 'HIGH',
    relatedFollowUpFields: ['movement_duration', 'pregnancy_stage'],
  },
  {
    symptomCode: 'nausea',
    displayNameEn: 'Nausea',
    displayNameBn: 'বমি বমি ভাব',
    category: 'gastrointestinal',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['vomiting', 'cannot_keep_water_down'],
  },
  {
    symptomCode: 'fatigue',
    displayNameEn: 'Overwhelming tiredness',
    displayNameBn: 'অতিরিক্ত ক্লান্তি',
    category: 'general',
    isDangerSign: false,
    defaultSeverity: 'MEDIUM',
    relatedFollowUpFields: ['severe_weakness'],
  },
];

const SYMPTOM_CODES = SYMPTOM_DATA.map(s => s.symptomCode);

const SEVERITY_LEVELS = ['mild', 'moderate', 'severe', 'unknown'];

const DURATION_VALUES = ['under_1h', '1_6h', 'over_6h', 'days', 'unknown'];

const isValidSymptomCode = (code) => SYMPTOM_CODES.includes(code);

const normalizeSymptomList = (symptoms) => {
  if (!Array.isArray(symptoms)) return [];
  return [...new Set(symptoms.filter(isValidSymptomCode))];
};

module.exports = {
  SYMPTOM_DATA,
  SYMPTOM_CODES,
  SEVERITY_LEVELS,
  DURATION_VALUES,
  isValidSymptomCode,
  normalizeSymptomList
};
