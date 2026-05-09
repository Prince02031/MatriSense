const FORBIDDEN_BANGLA_PATTERNS = [
  'আপনার রোগ হলো',
  'নিশ্চিতভাবে',
  'এই ওষুধ খান',
  'ডোজ',
  'চিন্তার কিছু নেই',
  'শুধু বাসায় থাকুন',
  'ডাক্তার দেখানোর দরকার নেই',
  'ক্লিনিকে যাওয়ার দরকার নেই',
];

const FORBIDDEN_ENGLISH_PATTERNS = [
  'diagnosis',
  'diagnose',
  'this is',
  'you have',
  'medicine',
  'drug',
  'tablet',
  'dose',
  'dosage',
  'no need to see a doctor',
  'no need to go to clinic',
  'stay at home only',
];

const REQUIRED_DISCLAIMER_BN =
  'এই তথ্য চিকিৎসকের পরামর্শের বিকল্প নয়। প্রয়োজনে দ্রুত স্বাস্থ্যকর্মীর সঙ্গে যোগাযোগ করুন।';

const ALWAYS_BLOCKED_ADVICE = [
  'diagnosis',
  'medicine advice',
  'dosage',
  'treatment plan',
  'false reassurance',
  'risk downgrade',
];

const HIGH_RISK_UNSAFE_HOMECARE_PATTERNS = [
  'বাসায় থাকুন',
  'শুধু বিশ্রাম নিন',
  'ঘরেই থাকুন',
  'ক্লিনিকে যাওয়ার দরকার নেই',
  'ডাক্তার দেখানোর দরকার নেই',
];

module.exports = {
  FORBIDDEN_BANGLA_PATTERNS,
  FORBIDDEN_ENGLISH_PATTERNS,
  REQUIRED_DISCLAIMER_BN,
  ALWAYS_BLOCKED_ADVICE,
  HIGH_RISK_UNSAFE_HOMECARE_PATTERNS,
};
