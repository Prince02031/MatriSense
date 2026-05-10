/**
 * MVP Follow-up Question Bank
 * Maps detected symptoms to prioritized clinical follow-up questions.
 */

const YES_NO_OPTIONS = [
  { labelBn: 'হ্যাঁ', value: true },
  { labelBn: 'না', value: false },
  { labelBn: 'নিশ্চিত নই', value: 'unknown' },
];

const SEVERITY_OPTIONS = [
  { labelBn: 'হালকা', value: 'mild' },
  { labelBn: 'মাঝারি', value: 'moderate' },
  { labelBn: 'তীব্র', value: 'severe' },
];

const DURATION_OPTIONS = [
  { labelBn: '১ ঘণ্টার কম', value: 'under_1h' },
  { labelBn: '১–৬ ঘণ্টা', value: '1_6h' },
  { labelBn: '৬ ঘণ্টার বেশি', value: 'over_6h' },
  { labelBn: '১ দিনের বেশি', value: 'days' },
];

const FOLLOW_UP_MAP = {
  headache: [
    {
      id: 'blurred_vision',
      questionBn: 'চোখে ঝাপসা দেখছেন কি?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 1,
      relatedRule: 'WHO_DANGER_SIGN_HEADACHE_VISION',
      updatesField: 'symptoms' // Adds blurred_vision to symptoms list
    },
    {
      id: 'swelling',
      questionBn: 'হাত, পা বা মুখ কি অস্বাভাবিকভাবে ফুলে গেছে?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 2,
      relatedRule: 'CDC_WARNING_SWELLING',
      updatesField: 'symptoms'
    },
    {
      id: 'headache_severity',
      questionBn: 'মাথাব্যথা কি খুব তীব্র?',
      type: 'severity_choice',
      options: SEVERITY_OPTIONS,
      priority: 3,
      relatedRule: 'WHO_DANGER_SIGN_SEVERE_HEADACHE',
      updatesField: 'severity.headache'
    }
  ],

  abdominal_pain: [
    {
      id: 'abdominal_pain_severity',
      questionBn: 'পেটব্যথা কি তীব্র?',
      type: 'severity_choice',
      options: SEVERITY_OPTIONS,
      priority: 1,
      relatedRule: 'WHO_PCPNC_SEVERE_ABDOMINAL_PAIN',
      updatesField: 'severity.abdominal_pain'
    },
    {
      id: 'vaginal_bleeding',
      questionBn: 'রক্তপাত হচ্ছে কি?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 2,
      relatedRule: 'WHO_DANGER_SIGN_VAGINAL_BLEEDING',
      updatesField: 'symptoms'
    }
  ],

  vomiting: [
    {
      id: 'vomiting_repeated',
      questionBn: 'বারবার বমি হচ্ছে কি?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 1,
      relatedRule: 'CDC_WARNING_REPEATED_VOMITING',
      updatesField: 'symptoms'
    },
    {
      id: 'cannot_keep_water_down',
      questionBn: 'পানি বা তরল খাবার পান করলে কি বমি হয়ে যাচ্ছে?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 2,
      relatedRule: 'WHO_PCPNC_QUICK_CHECK',
      updatesField: 'symptoms'
    },
    {
      id: 'dizziness_or_weakness',
      questionBn: 'মাথা ঘোরা বা খুব দুর্বল বোধ করছেন কি?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 3,
      relatedRule: 'WHO_PCPNC_PRIORITY_SIGNS',
      updatesField: 'symptoms'
    }
  ],

  nausea: [
    {
      id: 'vomiting_repeated',
      questionBn: 'বারবার বমি হচ্ছে কি?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 1,
      relatedRule: 'CDC_WARNING_REPEATED_VOMITING',
      updatesField: 'symptoms'
    }
  ],

  fever: [
    {
      id: 'severe_weakness',
      questionBn: 'খুব দুর্বল লাগছে কি (দাঁড়াতে পারছেন না)?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 1,
      relatedRule: 'WHO_DANGER_SIGN_FEVER_WEAKNESS',
      updatesField: 'symptoms'
    },
    {
      id: 'difficulty_breathing',
      questionBn: 'শ্বাস নিতে কি কষ্ট হচ্ছে?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 2,
      relatedRule: 'WHO_DANGER_SIGN_BREATHING_DIFFICULTY',
      updatesField: 'symptoms'
    },
    {
      id: 'fever_duration',
      questionBn: 'জ্বর কতক্ষণ ধরে আছে?',
      type: 'duration_choice',
      options: DURATION_OPTIONS,
      priority: 3,
      relatedRule: 'WHO_PCPNC_DANGEROUS_FEVER',
      updatesField: 'duration.fever'
    }
  ],

  dizziness: [
    {
      id: 'fainting',
      questionBn: 'অজ্ঞান হয়েছিলেন কি?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 1,
      relatedRule: 'WHO_PCPNC_FAINTING',
      updatesField: 'symptoms'
    },
    {
      id: 'difficulty_breathing',
      questionBn: 'শ্বাস নিতে কি কষ্ট হচ্ছে?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 2,
      relatedRule: 'WHO_DANGER_SIGN_BREATHING_DIFFICULTY',
      updatesField: 'symptoms'
    },
    {
      id: 'vaginal_bleeding',
      questionBn: 'রক্তপাত হচ্ছে কি?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 3,
      relatedRule: 'WHO_DANGER_SIGN_VAGINAL_BLEEDING',
      updatesField: 'symptoms'
    }
  ],

  // Special logic for third trimester
  third_trimester_check: [
    {
      id: 'reduced_fetal_movement',
      questionBn: 'বাচ্চার নড়াচড়া কি স্বাভাবিকের চেয়ে কম মনে হচ্ছে?',
      type: 'yes_no',
      options: YES_NO_OPTIONS,
      priority: 1,
      relatedRule: 'CDC_WARNING_REDUCED_FETAL_MOVEMENT',
      updatesField: 'symptoms'
    }
  ]
};

module.exports = {
  FOLLOW_UP_MAP
};
