const FOLLOW_UP_MAP = {
  headache: [
    {
      id: 'blurred_vision',
      questionBn: 'চোখে ঝাপসা দেখছেন কি?',
      type: 'single_choice',
      options: [
        { labelBn: 'হ্যাঁ', value: true },
        { labelBn: 'না', value: false },
      ],
      normalizedField: 'blurred_vision',
      priority: 1,
      relatedDangerRule: 'WHO_DANGER_SIGN_HEADACHE_VISION_HIGH',
    },
    {
      id: 'swelling',
      questionBn: 'হাত, পা বা মুখ ফুলে গেছে কি?',
      type: 'single_choice',
      options: [
        { labelBn: 'হ্যাঁ', value: true },
        { labelBn: 'না', value: false },
      ],
      normalizedField: 'swelling',
      priority: 2,
      relatedDangerRule: 'CDC_WARNING_SWELLING_MEDIUM',
    },
    {
      id: 'headache_severity',
      questionBn: 'মাথা ব্যথা কি খুব তীব্র?',
      type: 'single_choice',
      options: [
        { labelBn: 'হালকা', value: 'mild' },
        { labelBn: 'মাঝারি', value: 'moderate' },
        { labelBn: 'তীব্র', value: 'severe' },
      ],
      normalizedField: 'headache_severity',
      priority: 3,
      relatedDangerRule: 'WHO_DANGER_SIGN_HEADACHE_VISION_HIGH',
    },
  ],
  abdominal_pain: [
    {
      id: 'abdominal_pain_severity',
      questionBn: 'পেটব্যথা কি তীব্র?',
      type: 'single_choice',
      options: [
        { labelBn: 'হ্যাঁ', value: 'severe' },
        { labelBn: 'না', value: 'not_severe' },
      ],
      normalizedField: 'abdominal_pain_severity',
      priority: 1,
      relatedDangerRule: 'WHO_PCPNC_SEVERE_ABDOMINAL_PAIN_HIGH',
    },
    {
      id: 'vaginal_bleeding',
      questionBn: 'রক্তপাত হচ্ছে কি?',
      type: 'single_choice',
      options: [
        { labelBn: 'হ্যাঁ', value: true },
        { labelBn: 'না', value: false },
      ],
      normalizedField: 'vaginal_bleeding',
      priority: 2,
      relatedDangerRule: 'WHO_DANGER_SIGN_VAGINAL_BLEEDING_HIGH',
    },
  ],
  vomiting: [
    {
      id: 'vomiting_repeated',
      questionBn: 'বারবার বমি হচ্ছে কি?',
      type: 'single_choice',
      options: [
        { labelBn: 'হ্যাঁ', value: true },
        { labelBn: 'না', value: false },
      ],
      normalizedField: 'vomiting_repeated',
      priority: 1,
      relatedDangerRule: 'CDC_WARNING_REPEATED_VOMITING_MEDIUM',
    },
    {
      id: 'cannot_keep_water_down',
      questionBn: 'পানি রাখতে পারছেন কি?',
      type: 'single_choice',
      options: [
        { labelBn: 'হ্যাঁ', value: false },
        { labelBn: 'না', value: true },
      ],
      normalizedField: 'cannot_keep_water_down',
      priority: 2,
      relatedDangerRule: 'WHO_PCPNC_QUICK_CHECK',
    },
  ],
};

module.exports = {
  FOLLOW_UP_MAP,
};
