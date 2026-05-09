const { retrieveEvidence } = require('./evidenceRetriever');

const dedupeText = (items = []) => Array.from(
  new Set(items.map((item) => (typeof item === 'string' ? item.trim() : '')))
).filter(Boolean);

const assembleCareGuidanceContext = ({ decision, caseState, knowledgeCards } = {}) => {
  const { retrievedCards, blockedAdvice } = retrieveEvidence({
    decision,
    caseState,
    knowledgeCards,
  });

  const stepsNowBn = dedupeText(
    retrievedCards
      .filter((card) => ['URGENT_ESCALATION', 'CONTACT_HEALTH_WORKER', 'SELF_CARE_AND_MONITOR']
        .includes(card.guidanceType))
      .flatMap((card) => card.stepsBn || [])
  );

  const monitorBn = dedupeText(
    retrievedCards
      .filter((card) => card.guidanceType !== 'SAFETY_DISCLAIMER')
      .flatMap((card) => card.monitorBn || [])
  );

  const warningStepsBn = retrievedCards
    .filter((card) => card.guidanceType === 'WARNING_SIGNS')
    .flatMap((card) => card.stepsBn || []);

  const escalationTriggersBn = retrievedCards
    .flatMap((card) => card.escalationTriggersBn || []);

  const urgentWarningBn = dedupeText([
    ...warningStepsBn,
    ...escalationTriggersBn,
  ]);

  const sources = dedupeText(
    retrievedCards.map((card) => card.citation || card.sourceName)
  );

  return {
    retrievedCards,
    stepsNowBn,
    monitorBn,
    urgentWarningBn,
    sources,
    blockedAdvice,
  };
};

module.exports = { assembleCareGuidanceContext };
