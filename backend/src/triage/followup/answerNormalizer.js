/**
 * Normalizes raw patient answers into structured updates for the caseState.
 * Maps boolean/choice answers to specific symptoms and severity fields.
 */

const normalizeFollowUpAnswers = (answers = []) => {
  const followUpAnswers = {};
  const symptomsToAddSet = new Set();
  const severityUpdates = {};
  const durationUpdates = {};

  if (!Array.isArray(answers)) {
    return {
      followUpAnswers: {},
      symptomsToAdd: [],
      severityUpdates: {},
      durationUpdates: {}
    };
  }

  answers.forEach(({ questionId, value }) => {
    // Persist the raw answer
    followUpAnswers[questionId] = value;

    // 1. Boolean symptom triggers (Yes/No)
    if (value === true) {
      const directSymptoms = [
        'blurred_vision',
        'swelling',
        'vaginal_bleeding',
        'fainting',
        'difficulty_breathing',
        'reduced_fetal_movement',
        'vomiting_repeated',
        'severe_weakness'
      ];
      if (directSymptoms.includes(questionId)) {
        symptomsToAddSet.add(questionId);
      }
    }

    // 2. Inverted Boolean triggers
    if (questionId === 'can_keep_water_down' && value === false) {
      symptomsToAddSet.add('cannot_keep_water_down');
    }

    // 3. Severity mappings
    if (questionId === 'headache_severity') {
      severityUpdates.headache = value;
      if (value === 'severe') {
        symptomsToAddSet.add('severe_headache');
        symptomsToAddSet.add('headache');
      }
    }

    if (questionId === 'abdominal_pain_severity') {
      severityUpdates.abdominal_pain = value;
      if (value === 'severe') {
        symptomsToAddSet.add('severe_abdominal_pain');
        symptomsToAddSet.add('abdominal_pain');
      }
    }

    // 4. Duration mappings
    if (questionId === 'fever_duration') {
      durationUpdates.fever = value;
    }
  });

  return {
    followUpAnswers,
    symptomsToAdd: Array.from(symptomsToAddSet),
    severityUpdates,
    durationUpdates
  };
};

module.exports = {
  normalizeFollowUpAnswers
};
