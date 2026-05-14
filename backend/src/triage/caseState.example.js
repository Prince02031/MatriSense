const caseStateExample = {
  caseId: "triage_8f1c",
  patientId: "patient_21a7",
  createdAt: "2026-05-09T10:22:41.000Z",
  originalInputBn: "মাথা ব্যথা করছে আর চোখে ঝাপসা দেখছি",

  profile: {
    age: 26,
    trimester: "third",
    gestationalWeek: 30,
    expectedDeliveryDate: "2026-07-20",
    lastCheckupDate: "2026-04-10",
    lastCheckupGapDays: 29,
    riskFactors: {
      hypertension: true,
      diabetes: false,
      anemia: false,
      previousHighRiskPregnancy: false,
      previousCSection: false,
      previousMiscarriage: false
    }
  },

  symptoms: ["headache", "blurred_vision"],
  severity: {
    headache: "severe",
    blurred_vision: "unknown"
  },
  duration: {
    headache: "over_6h"
  },

  dangerSignsChecked: ["headache_with_blurred_vision"],
  followUpAnswers: {
    swelling: true,
    headache_severity: "severe",
    vision_change: true
  },

  history: {
    previousTriageIds: ["triage_7a10"],
    previousRiskLevels: ["MEDIUM"],
    previousHighRiskCount: 0
  },

  meta: {
    locale: "bn",
    sourceRefs: []
  }
};

module.exports = { caseStateExample };
