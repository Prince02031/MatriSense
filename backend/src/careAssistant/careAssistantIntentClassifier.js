/**
 * Care Assistant Intent Classifier
 * Detects the user's intent/question type to enable context-aware responses
 * Uses simple keyword-based classification (no additional LLM call)
 */

// Intent type constants
const INTENT_TYPES = {
  // Medical/Health-specific intents
  EMOTIONAL_SUPPORT: 'EMOTIONAL_SUPPORT',
  EMOTIONAL_COMPANION: 'EMOTIONAL_COMPANION',
  NEXT_STEPS: 'NEXT_STEPS',
  TELL_HEALTH_WORKER: 'TELL_HEALTH_WORKER',
  FAMILY_COMMUNICATION: 'FAMILY_COMMUNICATION',
  HOSPITAL_PREPARATION: 'HOSPITAL_PREPARATION',
  EXPLAIN_RESULT: 'EXPLAIN_RESULT',
  WAIT_OR_DELAY: 'WAIT_OR_DELAY',
  MEDICINE_REQUEST: 'MEDICINE_REQUEST',
  NEW_OR_WORSENING_SYMPTOM: 'NEW_OR_WORSENING_SYMPTOM',
  
  // Conversational/General intents
  CASUAL_CHAT: 'CASUAL_CHAT',
  SIMPLE_NON_MEDICAL_HELP: 'SIMPLE_NON_MEDICAL_HELP',
  OUT_OF_SCOPE_BUT_SAFE: 'OUT_OF_SCOPE_BUT_SAFE',
  
  // Safety/Policy intents
  POLICY_UNSAFE_OR_MEDICAL_RISK: 'POLICY_UNSAFE_OR_MEDICAL_RISK',
  
  // Default
  GENERAL_OTHER: 'GENERAL_OTHER'
};

/**
 * Bangla keyword patterns for intent detection
 */
const INTENT_KEYWORDS = {
  [INTENT_TYPES.EMOTIONAL_SUPPORT]: {
    patterns: [
      'ভয় পাচ্ছি',
      'চিন্তিত',
      'চিন্তা',
      'ভীত',
      'অসহায়',
      'একা',
      'নার্ভাস',
      'পরিপ্রেক্ষিত',
      'মানসিক',
      'আবেগ',
      'আশঙ্কা',
      'উদ্বেগ'
    ],
    weight: 1.0
  },
  [INTENT_TYPES.NEXT_STEPS]: {
    patterns: [
      'এখন কী করবো',
      'কি করবো',
      'করা উচিত',
      'এখন কি করুন',
      'পরবর্তী',
      'এরপর কি',
      'পদক্ষেপ',
      'ধাপ',
      'সময় নষ্ট না করে',
      'দ্রুত',
      'সাথে সাথে',
      // Romanized Bangla patterns
      'ki korbo',
      'ki kora',
      'korte parbo',
      'korte pari',
      'bashay',
      'uchit',
      'kora uchit',
      'prakshepe',
      'porsho'
    ],
    weight: 1.0
  },
  [INTENT_TYPES.TELL_HEALTH_WORKER]: {
    patterns: [
      'স্বাস্থ্যকর্মীকে',
      'ডাক্তারকে',
      'স্বাস্থ্যকর্মী',
      'ডাক্তার',
      'কী বলবো',
      'কি বলুন',
      'বলার',
      'জানাবো',
      'সাহায্য',
      'স্ক্রিপ্ট',
      'বলে দিন',
      // Romanized Bangla patterns
      'swasthyakormi',
      'swasthya',
      'doctor',
      'daktar',
      'ki bolbo',
      'bolbo',
      'kormi ko',
      'kormi',
      // Hindi/Nepali patterns for health worker inquiry
      'स्वास्थ्य',
      'कर्मी',
      'बल्नु',
      'कि बल्नु'
    ],
    weight: 1.0
  },
  [INTENT_TYPES.FAMILY_COMMUNICATION]: {
    patterns: [
      'পরিবারকে',
      'স্বামীকে',
      'বাবাকে',
      'মাকে',
      'আত্মীয়',
      'পরিবার',
      'পত্নী',
      'স্ত্রী',
      'জানাবো',
      'বলবো',
      'জানায়',
      'কিভাবে বুঝাব'
    ],
    weight: 1.0
  },
  [INTENT_TYPES.HOSPITAL_PREPARATION]: {
    patterns: [
      'হাসপাতালে',
      'কী নিতে',
      'নিয়ে যাব',
      'নিয়ে যাই',
      'প্রস্তুতি',
      'প্রস্তুত',
      'প্যাক',
      'সাথে নিয়ে',
      'গেলে',
      'নিয়ে যেতে',
      'পাঠাতে',
      'নিতে হবে'
    ],
    weight: 1.0
  },
  [INTENT_TYPES.EXPLAIN_RESULT]: {
    patterns: [
      'কেন',
      'কেন এমন',
      'কেন হয়',
      'কেন বেশি',
      'গুরুতর',
      'ঝুঁকি',
      'ফলাফল',
      'কারণ',
      'বুঝতে',
      'মানে',
      'কী করে'
    ],
    weight: 0.8
  },
  [INTENT_TYPES.WAIT_OR_DELAY]: {
    patterns: [
      'অপেক্ষা করতে',
      'অপেক্ষা করব',
      'অপেক্ষা',
      'কাল',
      'পরে',
      'পরে যাব',
      'দেরি',
      'দিন দুয়েক',
      'সপ্তাহ',
      'অপেক্ষা করা যায়',
      'বাঁচানো যায়',
      'থাকা যায়',
      'সময় আছে'
    ],
    weight: 1.0
  },
  [INTENT_TYPES.MEDICINE_REQUEST]: {
    patterns: [
      'ওষুধ',
      'ওয়েষধ',
      'ঔষধ',
      'ওষুধ খাবো',
      'ওষুধ খাব',
      'ওষুধ কি',
      'ঔষধ দিন',
      'ঔষধ দিবেন',
      'ডোজ',
      'মাত্রা',
      'বড়ি',
      'ট্যাবলেট',
      'ইনজেকশন'
    ],
    weight: 1.0
  },
  [INTENT_TYPES.NEW_OR_WORSENING_SYMPTOM]: {
    patterns: [
      'এখন',
      'নতুন',
      'বেড়েছে',
      'বেড়ে',
      'খারাপ',
      'সমস্যা',
      'রক্তপাত',
      'রক্ত',
      'শ্বাসকষ্ট',
      'শ্বাস',
      'জ্বর',
      'মাথাব্যথা',
      'পেটব্যথা',
      'মারা',
      'হারিয়ে',
      'হারিয়ে যায়',
      // Romanized Bangla patterns
      'onek',
      'betha',
      'korche',
      'ekhn',
      'shisthyo',
      'shisryo',
      'kharap',
      'problem'
    ],
    weight: 0.7
  },
  
  // New conversational intents
  [INTENT_TYPES.EMOTIONAL_COMPANION]: {
    patterns: [
      'সান্ত্বনা',
      'সাহস',
      'সাহস দাও',
      'সাহসী',
      'কাঁদছি',
      'কাঁদছে',
      'মন খারাপ',
      'মন খারাপ',
      'নিঃসঙ্গ',
      'একা অনুভব',
      'একা লাগছে',
      'ভালো নেই',
      'ভালো নেই',
      'খারাপ আছি',
      'খারাপ লাগছে'
    ],
    weight: 1.0
  },
  
  [INTENT_TYPES.CASUAL_CHAT]: {
    patterns: [
      'তুমি কে',
      'তোমার নাম',
      'তুমি কি',
      'আমার সাথে কথা',
      'কথা বলবে',
      'কথা বলতে পারো',
      'আমার সাথে থাকবে',
      'থাকবে আমার সাথে',
      'আছো তুমি',
      'আছো কি',
      'সাথে কথা বলার',
      'গল্প করবে',
      'গল্প বলবে',
      // Romanized Bangla patterns
      'hello',
      'hi',
      'tumi',
      'tumi ke',
      'tomar',
      'kotha',
      'kothta',
      'uttor',
      'dao na',
      'keno'
    ],
    weight: 0.9
  },
  
  [INTENT_TYPES.SIMPLE_NON_MEDICAL_HELP]: {
    patterns: [
      'মেসেজ লিখে',
      'বার্তা লিখে',
      'লেখ একটি',
      'গল্প বলো',
      'গল্প শোনাতে',
      'সহজ ভাষায়',
      'বুঝিয়ে বলো',
      'ব্যাখ্যা করো',
      'কীভাবে বলবো',
      'কিভাবে বলব',
      'পরামর্শ দাও',
      'রুটিন দাও',
      'সহায়তা করো',
      // Romanized Bangla patterns
      'help',
      'koro',
      'korte',
      'help koro',
      'madot',
      'sahajjyo'
    ],
    weight: 0.8
  },
  
  [INTENT_TYPES.OUT_OF_SCOPE_BUT_SAFE]: {
    patterns: [
      'আবহাওয়া',
      'আজকের',
      'ফোনে',
      'ইন্টারনেট',
      'কাজ করছে না',
      'কাজ হচ্ছে না',
      'কীভাবে',
      'কিভাবে',
      'পড়াশোনা',
      'শিক্ষা',
      'পড়ুন',
      'সময়',
      'ঘুম',
      'খাওয়া',
      'পানি',
      'বিশ্রাম'
    ],
    weight: 0.6
  },
  
  [INTENT_TYPES.POLICY_UNSAFE_OR_MEDICAL_RISK]: {
    patterns: [
      'নিজেকে',
      'আত্মহত্যা',
      'আঘাত',
      'মার',
      'জোর',
      'ক্ষতি',
      'সহিংস',
      'যৌন',
      'অবৈধ',
      'অপরাধ',
      'ঝুঁকি কমিয়ে',
      'ঝুঁকি কম',
      'নিরাপদ অপেক্ষা',
      'ঘরে থাকা যায়'
    ],
    weight: 1.0
  }
};

/**
 * Classifies user message intent based on keyword matching
 * @param {string} userMessage - User's message in Bangla
 * @returns {string} Intent type from INTENT_TYPES
 */
const classifyIntent = (userMessage) => {
  if (!userMessage || typeof userMessage !== 'string') {
    return INTENT_TYPES.GENERAL_OTHER;
  }

  const messageLower = userMessage.toLowerCase();
  const scores = {};

  // Score each intent based on keyword matches
  Object.entries(INTENT_KEYWORDS).forEach(([intent, config]) => {
    let score = 0;
    config.patterns.forEach(pattern => {
      if (messageLower.includes(pattern.toLowerCase())) {
        score += config.weight;
      }
    });
    if (score > 0) {
      scores[intent] = score;
    }
  });

  // Return intent with highest score, or GENERAL_OTHER if no match
  if (Object.keys(scores).length === 0) {
    return INTENT_TYPES.GENERAL_OTHER;
  }

  const topIntent = Object.entries(scores).reduce((best, [intent, score]) =>
    score > (best.score || 0) ? { intent, score } : best
  , {}).intent;

  return topIntent || INTENT_TYPES.GENERAL_OTHER;
};

/**
 * Get intent category for logging and debugging
 * @param {string} intent - Intent type
 * @returns {string} Human-readable intent name
 */
const getIntentName = (intent) => {
  const nameMap = {
    // Medical/Health intents
    [INTENT_TYPES.EMOTIONAL_SUPPORT]: 'Emotional Support',
    [INTENT_TYPES.EMOTIONAL_COMPANION]: 'Emotional Companion',
    [INTENT_TYPES.NEXT_STEPS]: 'Next Steps',
    [INTENT_TYPES.TELL_HEALTH_WORKER]: 'Tell Health Worker',
    [INTENT_TYPES.FAMILY_COMMUNICATION]: 'Family Communication',
    [INTENT_TYPES.HOSPITAL_PREPARATION]: 'Hospital Preparation',
    [INTENT_TYPES.EXPLAIN_RESULT]: 'Explain Result',
    [INTENT_TYPES.WAIT_OR_DELAY]: 'Wait or Delay',
    [INTENT_TYPES.MEDICINE_REQUEST]: 'Medicine Request',
    [INTENT_TYPES.NEW_OR_WORSENING_SYMPTOM]: 'New or Worsening Symptom',
    
    // Conversational intents
    [INTENT_TYPES.CASUAL_CHAT]: 'Casual Chat',
    [INTENT_TYPES.SIMPLE_NON_MEDICAL_HELP]: 'Simple Non-Medical Help',
    [INTENT_TYPES.OUT_OF_SCOPE_BUT_SAFE]: 'Out of Scope But Safe',
    
    // Safety intents
    [INTENT_TYPES.POLICY_UNSAFE_OR_MEDICAL_RISK]: 'Policy Unsafe or Medical Risk',
    
    // Default
    [INTENT_TYPES.GENERAL_OTHER]: 'General Other'
  };
  return nameMap[intent] || 'Unknown';
};

module.exports = {
  INTENT_TYPES,
  classifyIntent,
  getIntentName
};
