/**
 * Bangla Synonym Mapping for Symptoms
 * Used for both LLM context and Keyword Fallback Extraction.
 */

const BANGLA_SYMPTOM_SYNONYMS = {
  headache: ['মাথা ব্যথা', 'মাথাব্যথা', 'মাথা ধরেছে'],
  severe_headache: ['তীব্র মাথা ব্যথা', 'খুব মাথা ব্যথা', 'অসহ্য মাথা ব্যথা', 'মাথা খুব ব্যথা'],
  blurred_vision: ['চোখে ঝাপসা', 'ঝাপসা দেখা', 'চোখ ঝাপসা', 'দৃষ্টি ঝাপসা', 'ঝাপসা দেখছি'],
  swelling: ['হাত ফুলে গেছে', 'মুখ ফুলেছে', 'পা ফুলেছে', 'শরীর ফুলে গেছে', 'হাত পা ফোলা'],
  vaginal_bleeding: ['রক্তপাত', 'রক্ত যাচ্ছে', 'ব্লিডিং', 'যোনি থেকে রক্ত', 'blood যাচ্ছে'],
  abdominal_pain: ['পেট ব্যথা', 'পেটে ব্যথা', 'তলপেট ব্যথা', 'তলপেটে ব্যথা'],
  severe_abdominal_pain: ['তীব্র পেট ব্যথা', 'অসহ্য পেট ব্যথা'],
  fever: ['জ্বর', 'গা গরম', 'শরীরে তাপ'],
  severe_weakness: ['খুব দুর্বল', 'দাঁড়াতে পারছেন না', 'অবসন্ন'],
  vomiting: ['বমি', 'বমি হচ্ছে', 'বমি বমি লাগছে'],
  vomiting_repeated: ['বারবার বমি', 'অনেক বমি'],
  cannot_keep_water_down: ['পানি খেলেও বমি', 'কিছুই রাখতে পারছেন না', 'পানি থাকছে না'],
  dizziness: ['মাথা ঘোরা', 'চোখে অন্ধকার'],
  fainting: ['অজ্ঞান', 'অচেতন', 'জ্ঞান হারানো'],
  difficulty_breathing: ['শ্বাসকষ্ট', 'শ্বাস নিতে কষ্ট', 'হাঁপানো'],
  convulsion: ['খিঁচুনি', 'ফিট'],
  reduced_fetal_movement: ['বাচ্চার নড়াচড়া কম', 'বাচ্চা নড়ছে না', 'নড়াচড়া কম'],
  nausea: ['বমি বমি', 'উবকানি'],
  fatigue: ['অতিরিক্ত ক্লান্তি', 'খুব ক্লান্ত', 'দুর্বল লাগছে'],
};

module.exports = {
  BANGLA_SYMPTOM_SYNONYMS
};
