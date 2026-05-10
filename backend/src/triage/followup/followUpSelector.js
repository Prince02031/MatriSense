const { FOLLOW_UP_MAP } = require('./followUpMap');
const { SYMPTOM_DATA } = require('../data/symptomCodes');

/**
 * Intelligently selects follow-up questions based on extracted symptoms and clinical context.
 * Prioritizes danger signs and trimester-specific risks.
 */

const selectFollowUpQuestions = ({ extraction, caseState, patientProfile, maxQuestions = 3 }) => {
  const detectedSymptoms = extraction?.detectedSymptoms || [];
  const followUpAnswers = caseState?.followUpAnswers || {};
  const trimester = patientProfile?.trimester || 'unknown';
  const gestationalWeek = patientProfile?.gestationalWeek || 0;

  // 1. Identify if an URGENT (HIGH) danger sign is already present
  // We want to know if we should "fast-track" the patient instead of asking too many questions
  const hasUrgentSymptom = detectedSymptoms.some(s => {
    const data = SYMPTOM_DATA.find(d => d.symptomCode === s);
    return data?.isDangerSign && data?.defaultSeverity === 'HIGH';
  });

  const questionPool = new Map();

  // 2. Add questions for all detected symptoms
  detectedSymptoms.forEach(symptom => {
    const symptomQuestions = FOLLOW_UP_MAP[symptom] || [];
    symptomQuestions.forEach(q => {
      // Don't ask if already answered
      if (!followUpAnswers.hasOwnProperty(q.id)) {
        questionPool.set(q.id, q);
      }
    });
  });

  // 3. Special Case: Late Pregnancy (Third Trimester / 28+ weeks)
  // Automatically check for fetal movement if not already mentioned
  const isLatePregnancy = trimester === 'third' || gestationalWeek >= 28;
  if (isLatePregnancy && !detectedSymptoms.includes('reduced_fetal_movement')) {
    const fetalQuestions = FOLLOW_UP_MAP['third_trimester_check'] || [];
    fetalQuestions.forEach(q => {
      if (!followUpAnswers.hasOwnProperty(q.id)) {
        questionPool.set(q.id, q);
      }
    });
  }

  // 4. Sort by priority (assuming lower number = higher clinical priority)
  let sortedQuestions = Array.from(questionPool.values())
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));

  // 5. Clinical Safety Throttling
  // If an urgent danger sign is already detected, we limit to 1 optional question 
  // to avoid delaying triage, or even 0 if it's life-threatening.
  let finalQuestions = [];
  if (hasUrgentSymptom) {
    // Return max 1 context question if urgent, or 0 if it's critical
    finalQuestions = sortedQuestions.slice(0, 1);
  } else {
    finalQuestions = sortedQuestions.slice(0, maxQuestions);
  }

  return {
    followUpNeeded: finalQuestions.length > 0,
    questions: finalQuestions
  };
};

module.exports = {
  selectFollowUpQuestions
};
