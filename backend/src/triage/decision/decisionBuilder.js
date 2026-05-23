const SAFE_LLM_CONSTRAINTS = [
  'Do not diagnose',
  'Do not prescribe medicine',
  'Do not downgrade risk level',
  'Use simple Bangla',
  'Do not add advice outside retrieved guidance',
];

const RISK_PRIORITY = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
};

const defaultDecision = () => ({
  riskLevel: 'UNKNOWN',
  priority: 'NORMAL',
  recommendedAction: 'CONTACT_HEALTH_WORKER_SOON',
  matchedRules: [],
  reasons: [],
  reasonsBn: [],
  evidenceTags: [],
  modifierScore: 0,
  allowedGuidanceType: 'CONTACT_HEALTH_WORKER',
  followUpNeeded: false,
  missingInfo: [],
  llmConstraints: [...SAFE_LLM_CONSTRAINTS],
});

const collectEvents = (events = [], type) =>
  events
    .filter((event) => event?.type === type)
    .map((event) => event?.params || {})
    .filter(Boolean);

const uniqueArray = (items) => Array.from(new Set(items.filter(Boolean)));

const buildDecision = (events = [], caseState = {}) => {
  const decision = defaultDecision();

  const highEvents = collectEvents(events, 'HIGH_RISK');
  const mediumEvents = collectEvents(events, 'MEDIUM_RISK');
  const modifierEvents = collectEvents(events, 'RISK_MODIFIER');
  const followUpEvents = collectEvents(events, 'NEEDS_FOLLOW_UP');

  decision.followUpNeeded = followUpEvents.length > 0;

  decision.matchedRules = uniqueArray(
    [...highEvents, ...mediumEvents, ...modifierEvents]
      .map((event) => event.ruleName)
  );

  decision.reasons = uniqueArray(
    [...highEvents, ...mediumEvents, ...modifierEvents]
      .map((event) => event.reason)
  );

  decision.reasonsBn = uniqueArray(
    [...highEvents, ...mediumEvents, ...modifierEvents]
      .map((event) => event.displayReasonBn)
  );

  decision.evidenceTags = uniqueArray(
    [...highEvents, ...mediumEvents, ...modifierEvents]
      .map((event) => event.evidenceTag)
  );

  decision.modifierScore = modifierEvents
    .map((event) => Number(event.modifierScore || 0))
    .reduce((acc, score) => acc + score, 0);

  if (highEvents.length > 0) {
    decision.riskLevel = 'HIGH';
    decision.priority = 'URGENT';
  } else if (mediumEvents.length > 0) {
    decision.riskLevel = 'MEDIUM';
    decision.priority = 'ATTENTION_NEEDED';
  } else {
    decision.riskLevel = 'LOW';
    decision.priority = 'NORMAL';
  }

  if (decision.riskLevel === 'LOW' && decision.modifierScore >= 3) {
    decision.riskLevel = 'MEDIUM';
    decision.priority = 'ATTENTION_NEEDED';
  }

  if (decision.riskLevel === 'HIGH') {
    decision.allowedGuidanceType = 'URGENT_ESCALATION';
  } else if (decision.riskLevel === 'MEDIUM') {
    decision.allowedGuidanceType = 'CONTACT_HEALTH_WORKER';
  } else {
    decision.allowedGuidanceType = 'SELF_CARE_AND_MONITOR';
  }

  const recommendedActionFromEvents = [...highEvents, ...mediumEvents]
    .map((event) => event.recommendedAction)
    .find(Boolean);

  if (recommendedActionFromEvents) {
    decision.recommendedAction = recommendedActionFromEvents;
  } else if (decision.riskLevel === 'HIGH') {
    decision.recommendedAction = 'CONTACT_HEALTH_WORKER_IMMEDIATELY';
  } else if (decision.riskLevel === 'MEDIUM') {
    decision.recommendedAction = 'CONTACT_HEALTH_WORKER_SOON';
  } else {
    decision.recommendedAction = 'HOME_CARE_AND_MONITOR';
  }

  const missingInfo = [];
  if (!caseState?.profile?.trimester) missingInfo.push('trimester');
  if (!caseState?.symptoms || caseState.symptoms.length === 0) missingInfo.push('symptoms');

  decision.missingInfo = missingInfo;

  decision.priority = decision.riskLevel === 'HIGH'
    ? 'URGENT'
    : decision.riskLevel === 'MEDIUM'
      ? 'ATTENTION_NEEDED'
      : 'NORMAL';

  return decision;
};

module.exports = { buildDecision };
