const uniqueArray = (items = []) => Array.from(new Set(items.filter(Boolean)));

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const hasIntersection = (left = [], right = []) => {
  if (left.length === 0 || right.length === 0) return false;
  const rightSet = new Set(right);
  return left.some((item) => rightSet.has(item));
};

const uniqueById = (cards = []) => {
  const seen = new Set();
  return cards.filter((card) => {
    if (!card?.id) return false;
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
};

const retrieveEvidence = ({ decision = {}, caseState = {}, knowledgeCards = [] } = {}) => {
  const riskLevel = decision.riskLevel || 'UNKNOWN';
  const allowedGuidanceType = decision.allowedGuidanceType;

  const allowedTypes = uniqueArray([
    allowedGuidanceType,
    riskLevel === 'LOW' ? 'WARNING_SIGNS' : null,
    'SAFETY_DISCLAIMER',
  ]);

  const evidenceTags = uniqueArray([
    ...(decision.evidenceTags || []),
    ...(caseState?.meta?.sourceRefs || []),
  ]);

  const symptomCodes = uniqueArray([
    ...(caseState?.symptoms || []),
    ...(caseState?.dangerSignsChecked || []),
  ]);

  const evidenceMatches = evidenceTags.length
    ? knowledgeCards.filter((card) => evidenceTags.includes(card?.evidenceTag))
    : [];

  const symptomMatches = symptomCodes.length
    ? knowledgeCards.filter((card) =>
      hasIntersection(normalizeArray(card?.symptoms), symptomCodes))
    : [];

  const orderedMatches = uniqueById([...evidenceMatches, ...symptomMatches]);

  const blockedAdvice = [];

  const filteredMatches = orderedMatches.filter((card) => {
    if (!card) return false;

    const allowedRisk = normalizeArray(card.riskLevelAllowed);
    if (!allowedRisk.includes(riskLevel)) return false;

    if (
      riskLevel === 'HIGH'
      && card.guidanceType === 'SELF_CARE_AND_MONITOR'
      && !allowedRisk.includes('HIGH')
    ) {
      blockedAdvice.push({
        id: card.id,
        reason: 'Blocked for HIGH risk: self-care only guidance.',
      });
      return false;
    }

    if (!allowedTypes.includes(card.guidanceType)) return false;

    return true;
  });

  const forcedCards = [];

  const safetyCard = knowledgeCards.find(
    (card) => card?.guidanceType === 'SAFETY_DISCLAIMER' || card?.id === 'safety_disclaimer'
  );

  if (safetyCard && normalizeArray(safetyCard.riskLevelAllowed).includes(riskLevel)) {
    forcedCards.push(safetyCard);
  }

  if (riskLevel === 'LOW') {
    const warningCards = knowledgeCards.filter(
      (card) => card?.guidanceType === 'WARNING_SIGNS'
        && normalizeArray(card.riskLevelAllowed).includes(riskLevel)
    );
    forcedCards.push(...warningCards);
  }

  const retrievedCards = uniqueById([...filteredMatches, ...forcedCards]);

  return { retrievedCards, blockedAdvice };
};

module.exports = { retrieveEvidence };
