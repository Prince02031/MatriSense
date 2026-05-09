const FORBIDDEN_BANGLA_PATTERNS = [
  'আপনার রোগ হলো',
  'আপনার রোগ',
  'নিশ্চিতভাবে',
  '১০০%',
  'গ্যারান্টি',
  'এই ওষুধ খান',
  'ওষুধ খান',
  'ওষুধ খাব',
  'কোন ওষুধ খাব',
  'ডোজ',
  'ট্যাবলেট',
  'ক্যাপসুল',
  'সিরাপ',
  'প্যারাসিটামল',
  'আইবুপ্রোফেন',
  'চিন্তার কিছু নেই',
  'ভয়ের কিছু নেই',
  'কোনো সমস্যা নেই',
  'ঠিক হয়ে যাবে',
  'শুধু বাসায় থাকুন',
  'ডাক্তার দেখানোর দরকার নেই',
  'ডাক্তার দরকার নেই',
  'ক্লিনিকে যাওয়ার দরকার নেই',
  'হাসপাতালে যাওয়ার দরকার নেই',
  'প্রি-এক্লাম্পসিয়া',
  'এক্লাম্পসিয়া',
  'ক্যান্সার'
];

const FORBIDDEN_ENGLISH_PATTERNS = [
  'diagnos',
  'prescrib',
  'dose',
  'mg',
  'tablet',
  'capsule',
  'syrup',
  '100%',
  'guarantee',
  'nothing to worry about',
  'no need to see a doctor',
  'preeclampsia',
  'eclampsia',
  'cancer'
];

const REQUIRED_DISCLAIMER_BN = 'এটি একটি স্বয়ংক্রিয় পরামর্শ মাত্র। কোনো ঔষধ খাওয়ার আগে বা জরুরি প্রয়োজনে অবশ্যই একজন রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।';

const ALWAYS_BLOCKED_ADVICE = [
  'diagnose_disease',
  'prescribe_medicine',
  'give_dosage',
  'give_false_reassurance',
  'downgrade_risk'
];

const HIGH_RISK_UNSAFE_HOMECARE_PATTERNS = [
  'শুধু বাসায় থাকুন',
  'বাসায় বিশ্রাম নিন',
  'বিশ্রাম করলেই ঠিক হয়ে যাবে',
  'চিন্তার কিছু নেই'
];

module.exports = {
  FORBIDDEN_BANGLA_PATTERNS,
  FORBIDDEN_ENGLISH_PATTERNS,
  REQUIRED_DISCLAIMER_BN,
  ALWAYS_BLOCKED_ADVICE,
  HIGH_RISK_UNSAFE_HOMECARE_PATTERNS
};
