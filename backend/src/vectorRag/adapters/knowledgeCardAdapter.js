/**
 * KnowledgeCard Adapter for Vector RAG
 * Converts existing KnowledgeCards.json into normalized records for ingestion
 */

const fs = require('fs');
const path = require('path');

/**
 * Load and parse KnowledgeCards.json
 * @param {string} filePath - Path to knowledgeCards.json
 * @returns {Promise<array>} Array of knowledge cards
 */
async function loadKnowledgeCards(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const cards = JSON.parse(content);
    return Array.isArray(cards) ? cards : [];
  } catch (error) {
    throw new Error(`Failed to load KnowledgeCards: ${error.message}`);
  }
}

/**
 * Convert a knowledge card into a normalized record
 * @param {object} card - Knowledge card object
 * @param {string} sourceId - Source identifier
 * @returns {object} Normalized record
 */
function convertCard(card, sourceId) {
  if (!card || !card.id) {
    return null;
  }

  // Combine all text content from the card
  const textParts = [];

  // Condition and guidance type
  if (card.condition) {
    textParts.push(`Condition: ${card.condition}`);
  }
  if (card.guidanceType) {
    textParts.push(`Guidance Type: ${card.guidanceType}`);
  }

  // Steps (both Bengali and English)
  if (card.stepsBn && Array.isArray(card.stepsBn) && card.stepsBn.length > 0) {
    textParts.push(`Steps (Bengali): ${card.stepsBn.join(' ')}`);
  }
  if (card.stepsEn && Array.isArray(card.stepsEn) && card.stepsEn.length > 0) {
    textParts.push(`Steps (English): ${card.stepsEn.join(' ')}`);
  }

  // Monitoring guidance
  if (card.monitorBn && Array.isArray(card.monitorBn) && card.monitorBn.length > 0) {
    textParts.push(`Monitor (Bengali): ${card.monitorBn.join(' ')}`);
  }
  if (card.monitorEn && Array.isArray(card.monitorEn) && card.monitorEn.length > 0) {
    textParts.push(`Monitor (English): ${card.monitorEn.join(' ')}`);
  }

  // Escalation triggers
  if (card.escalationTriggersBn && Array.isArray(card.escalationTriggersBn)) {
    textParts.push(`Escalation Triggers (Bengali): ${card.escalationTriggersBn.join(' ')}`);
  }
  if (card.escalationTriggersEn && Array.isArray(card.escalationTriggersEn)) {
    textParts.push(`Escalation Triggers (English): ${card.escalationTriggersEn.join(' ')}`);
  }

  // Safety disclaimers
  if (card.doNotSay && Array.isArray(card.doNotSay)) {
    textParts.push(`Do Not Say: ${card.doNotSay.join(', ')}`);
  }

  // Citation
  if (card.citation) {
    textParts.push(`Citation: ${card.citation}`);
  }

  // Source name
  if (card.sourceName) {
    textParts.push(`Source: ${card.sourceName}`);
  }

  const text = textParts.join(' | ');

  // Build metadata
  const metadata = {
    cardId: card.id,
    condition: card.condition,
    sourceName: card.sourceName,
    sourceType: card.sourceType,
    evidenceTag: card.evidenceTag,
    stepsBn: card.stepsBn,
    stepsEn: card.stepsEn,
    monitorBn: card.monitorBn,
    monitorEn: card.monitorEn,
    escalationTriggersBn: card.escalationTriggersBn,
    escalationTriggersEn: card.escalationTriggersEn,
    doNotSay: card.doNotSay,
    symptoms: card.symptoms || [],
  };

  return {
    sourceId,
    sourceKind: 'KNOWLEDGE_CARD',
    sourceTitle: `KnowledgeCard: ${card.condition || card.id}`,
    sourcePath: 'backend/src/rag/knowledgeCards.json',
    pageStart: null,
    pageEnd: null,
    sectionTitle: card.condition || null,
    text,
    metadata: {
      ...metadata,
      // Preserve original arrays for filtering
      riskLevelAllowed: card.riskLevelAllowed || ['HIGH', 'MEDIUM', 'LOW'],
      guidanceType: card.guidanceType,
      symptoms: card.symptoms || [],
      evidenceTags: card.evidenceTag ? [card.evidenceTag] : [],
    },
  };
}

/**
 * Convert all knowledge cards into normalized records
 * @param {string} filePath - Path to knowledgeCards.json
 * @param {string} sourceId - Source identifier
 * @returns {Promise<array>} Array of normalized records
 */
async function adapt(filePath, sourceId = 'knowledge_cards_json') {
  try {
    const cards = await loadKnowledgeCards(filePath);
    const records = [];

    for (const card of cards) {
      const record = convertCard(card, sourceId);
      if (record) {
        records.push(record);
      }
    }

    return records;
  } catch (error) {
    throw new Error(`KnowledgeCard adaptation failed: ${error.message}`);
  }
}

module.exports = {
  loadKnowledgeCards,
  convertCard,
  adapt,
};
