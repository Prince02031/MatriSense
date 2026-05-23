const { retrieveEvidence } = require('./evidenceRetriever');
const { ALWAYS_BLOCKED_ADVICE } = require('../safety/safetyRules');

const dedupeText = (items = []) => Array.from(
  new Set(items.map((item) => (typeof item === 'string' ? item.trim() : '')))
).filter(Boolean);

const uniqueArray = (items = []) => Array.from(new Set(items.filter(Boolean)));

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const hasIntersection = (left = [], right = []) => {
  if (left.length === 0 || right.length === 0) return false;
  const rightSet = new Set(right);
  return left.some((item) => rightSet.has(item));
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const getFirstText = (items = []) => {
  const first = normalizeArray(items).map(normalizeText).find(Boolean);
  return first || null;
};

const CONTACT_OR_REFERRAL_TERMS = [
  'স্বাস্থ্যকর্মী',
  'স্বাস্থ্যকেন্দ্র',
  'হাসপাতাল',
  'ক্লিনিক',
  'যোগাযোগ',
  'যান',
  'রেফার'
];

const containsAnyTerm = (text, terms = []) => {
  const value = normalizeText(text);
  return terms.some((term) => value.includes(term));
};

const isContactOrReferralText = (text) => containsAnyTerm(text, CONTACT_OR_REFERRAL_TERMS);

const isFeverText = (text) => normalizeText(text).includes('জ্বর');

const getReportedSymptomCodes = (caseState = {}) => uniqueArray([
  ...normalizeArray(caseState?.symptoms),
  ...normalizeArray(caseState?.dangerSignsChecked),
]);

const isCardMatchedToReportedSymptoms = (card = {}, reportedSymptomCodes = []) => {
  const cardSymptoms = normalizeArray(card.symptoms);
  if (cardSymptoms.length === 0) return true;
  return hasIntersection(cardSymptoms, reportedSymptomCodes);
};

const getRoleFallback = (card = {}) => {
  if (card.messageRole) return card.messageRole;

  switch (card.guidanceType) {
    case 'URGENT_ESCALATION':
      return MESSAGE_ROLES.WHY_URGENT;
    case 'CONTACT_HEALTH_WORKER':
      return MESSAGE_ROLES.PRIMARY_ACTION;
    case 'SELF_CARE_AND_MONITOR':
      return MESSAGE_ROLES.SELF_CARE;
    case 'WARNING_SIGNS':
      return MESSAGE_ROLES.WARNING_SIGN;
    case 'SAFETY_DISCLAIMER':
      return MESSAGE_ROLES.SAFETY_DISCLAIMER;
    default:
      return MESSAGE_ROLES.SUPPORTIVE_ACTION;
  }
};

const shouldAllowSelfCare = (riskLevel, card = {}) => {
  if (riskLevel === 'HIGH') return false;
  if (riskLevel === 'MEDIUM') {
    return card.guidanceType === 'SELF_CARE_AND_MONITOR'
      && normalizeArray(card.riskLevelAllowed).includes('MEDIUM');
  }
  return true;
};

const addByActionGroup = (items, card, usedGroups, text) => {
  const value = normalizeText(text);
  if (!value) return items;

  if (card?.actionGroup) {
    const existingCardId = usedGroups.get(card.actionGroup);
    if (existingCardId && existingCardId !== card.id) return items;
    if (!existingCardId) {
      usedGroups.set(card.actionGroup, card.id);
    }
  }

  items.push(value);
  return items;
};

const assembleCareGuidanceContext = ({ decision, caseState, knowledgeCards } = {}) => {
  const { retrievedCards: rawCards, blockedAdvice } = retrieveEvidence({
    decision,
    caseState,
    knowledgeCards,
  });

  const riskLevel = decision?.riskLevel || 'UNKNOWN';
  const allowedGuidanceType = decision?.allowedGuidanceType || 'UNKNOWN';
  const limits = RISK_OUTPUT_LIMITS[riskLevel] || RISK_OUTPUT_LIMITS.MEDIUM;

  // Sort by priority descending (critical advice first)
  const retrievedCards = [...rawCards].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const usedActionGroups = new Map();
  const reportedSymptomCodes = getReportedSymptomCodes(caseState);

  let primaryActionBn = null;
  let stepsNowBn = [];
  let whyUrgentBn = [];
  let monitorBn = [];
  let urgentWarningBn = [];

  retrievedCards.forEach((card) => {
    if (!card) return;
    const role = getRoleFallback(card);
    const steps = normalizeArray(card.stepsBn);
    const monitors = normalizeArray(card.monitorBn);
    const triggers = normalizeArray(card.escalationTriggersBn);

    if (role === MESSAGE_ROLES.SAFETY_DISCLAIMER) return;

    if ((role === MESSAGE_ROLES.SELF_CARE || card.guidanceType === 'SELF_CARE_AND_MONITOR')
      && !shouldAllowSelfCare(riskLevel, card)) {
      return;
    }

    if (role === MESSAGE_ROLES.PRIMARY_ACTION) {
      if (!primaryActionBn) {
        const primaryText = getFirstText(steps);
        if (primaryText) {
          if (!card.actionGroup || !usedActionGroups.has(card.actionGroup)) {
            if (card.actionGroup) usedActionGroups.set(card.actionGroup, card.id);
            primaryActionBn = primaryText;
          }
        }
      }
      return;
    }

    if (role === MESSAGE_ROLES.WHY_URGENT) {
      if (riskLevel === 'HIGH' && !primaryActionBn) {
        primaryActionBn = steps.find(isContactOrReferralText) || getFirstText(steps);
      }

      steps.forEach((step) => {
        if (riskLevel === 'HIGH' && isContactOrReferralText(step)) return;
        if (!isCardMatchedToReportedSymptoms(card, reportedSymptomCodes)) return;
        whyUrgentBn = addByActionGroup(whyUrgentBn, card, usedActionGroups, step);
      });
      triggers.forEach((trigger) => {
        urgentWarningBn = addByActionGroup(urgentWarningBn, card, usedActionGroups, trigger);
      });
      return;
    }

    if (role === MESSAGE_ROLES.WARNING_SIGN) {
      steps.forEach((step) => {
        urgentWarningBn = addByActionGroup(urgentWarningBn, card, usedActionGroups, step);
      });
      triggers.forEach((trigger) => {
        urgentWarningBn = addByActionGroup(urgentWarningBn, card, usedActionGroups, trigger);
      });
      return;
    }

    if (role === MESSAGE_ROLES.MONITORING) {
      monitors.forEach((item) => {
        monitorBn = addByActionGroup(monitorBn, card, usedActionGroups, item);
      });
      if (monitors.length === 0) {
        steps.forEach((step) => {
          monitorBn = addByActionGroup(monitorBn, card, usedActionGroups, step);
        });
      }
      return;
    }

    // SUPPORTIVE_ACTION / SELF_CARE / fallback
    steps.forEach((step) => {
      stepsNowBn = addByActionGroup(stepsNowBn, card, usedActionGroups, step);
    });
    monitors.forEach((item) => {
      monitorBn = addByActionGroup(monitorBn, card, usedActionGroups, item);
    });
    triggers.forEach((trigger) => {
      urgentWarningBn = addByActionGroup(urgentWarningBn, card, usedActionGroups, trigger);
    });
  });

  const contactCard = retrievedCards.find((card) => card?.guidanceType === 'CONTACT_HEALTH_WORKER');
  if (!primaryActionBn && contactCard) {
    primaryActionBn = getFirstText(contactCard.stepsBn);
  }

  const allWarnings = dedupeText(urgentWarningBn);
  const allSteps = dedupeText(stepsNowBn);
  let allWhyUrgent = dedupeText(whyUrgentBn);
  const allMonitor = dedupeText(monitorBn);

  const stepsFiltered = allSteps.filter((step) => !allWarnings.includes(step));

  // Determine if there is any fever signal in symptoms or evidence
  const symptoms = normalizeArray(caseState?.symptoms);
  const evidenceTags = normalizeArray(decision?.evidenceTags);
  const hasFeverSignal = symptoms.includes('fever') || 
    evidenceTags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes('fever'));

  // Fallback to rule engine reasons if cards didn't provide enough context
  if (allWhyUrgent.length === 0 && Array.isArray(decision?.reasonsBn)) {
    allWhyUrgent = dedupeText(decision.reasonsBn);
  }

  // Filter out fever-specific general advice if no fever was reported
  if (!hasFeverSignal) {
    allWhyUrgent = allWhyUrgent.filter(line => !isFeverText(line));
    urgentWarningBn = urgentWarningBn.filter(line => !isFeverText(line));
  }

  const limitedSteps = typeof limits.maxStepsNow === 'number'
    ? stepsFiltered.slice(0, limits.maxStepsNow)
    : stepsFiltered;
  const limitedWhyUrgent = typeof limits.maxWhyUrgent === 'number'
    ? allWhyUrgent.slice(0, limits.maxWhyUrgent)
    : allWhyUrgent;
  const limitedWarnings = typeof limits.maxWarnings === 'number'
    ? allWarnings.slice(0, limits.maxWarnings)
    : allWarnings;
  const limitedMonitor = typeof limits.maxMonitor === 'number'
    ? allMonitor.slice(0, limits.maxMonitor)
    : allMonitor;

  // Final HIGH risk adjustment: Focus on emergency readiness
  let finalSteps = limitedSteps;
  if (riskLevel === 'HIGH') {
    const supportiveSteps = [
      'পরিবারের কাউকে সঙ্গে রাখুন।',
      'স্বাস্থ্যকেন্দ্রে যাওয়ার প্রস্তুতি নিন।',
      'জরুরি যোগাযোগ নম্বর কাছে রাখুন।'
    ];
    
    // Ensure we don't repeat the primary action in the supportive steps
    finalSteps = supportiveSteps.filter(step => step !== primaryActionBn).slice(0, 3);
  }

  const sources = dedupeText(
    retrievedCards.map((card) => card.citation || card.sourceName)
  );

  const requiredBlockedAdvice = [
    'diagnosis',
    'medicine dosage',
    'false reassurance',
    'risk downgrade',
    'unsupported home remedies'
  ];

  const finalBlockedAdvice = dedupeText([
    ...ALWAYS_BLOCKED_ADVICE,
    ...requiredBlockedAdvice,
    ...blockedAdvice.map(b => typeof b === 'object' ? b.reason : b)
  ]);

  const guidanceMeta = {
    appliedLimits: limits,
    warningsMissing: limitedWarnings.length === 0,
    usedActionGroups: Array.from(usedActionGroups.keys()),
    counts: {
      stepsNow: limitedSteps.length,
      whyUrgent: limitedWhyUrgent.length,
      monitor: limitedMonitor.length,
      warnings: limitedWarnings.length
    }
  };

  return {
    riskLevel,
    allowedGuidanceType,
    retrievedCards,
    primaryActionBn,
    stepsNowBn: finalSteps,
    whyUrgentBn: limitedWhyUrgent,
    monitorBn: limitedMonitor,
    urgentWarningBn: limitedWarnings,
    sources,
    blockedAdvice: finalBlockedAdvice,
    guidanceMeta
  };
};

module.exports = { assembleCareGuidanceContext };
