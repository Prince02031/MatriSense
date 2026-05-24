/**
 * Text chunking utility for Vector RAG
 * Splits source documents into chunks suitable for embedding
 */

/**
 * Chunk text with overlap for vector embedding
 * @param {string} text - Full text to chunk
 * @param {object} options - Chunking options
 * @param {number} options.chunkSize - Target chunk size in characters (default: 800)
 * @param {number} options.overlap - Overlap between chunks in characters (default: 200)
 * @param {number} options.minChunkSize - Minimum chunk size to keep (default: 100)
 * @returns {array} Array of chunk objects
 */
function chunkText(text, options = {}) {
  const {
    chunkSize = 800,
    overlap = 200,
    minChunkSize = 100,
  } = options;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return [];
  }

  const chunks = [];
  let startIdx = 0;

  while (startIdx < text.length) {
    // Calculate end index for this chunk
    let endIdx = Math.min(startIdx + chunkSize, text.length);

    // Try to break at a sentence boundary if not at end
    if (endIdx < text.length) {
      // Look for period, exclamation, question mark within last 100 chars
      const searchStart = Math.max(startIdx, endIdx - 100);
      let lastSentenceEnd = -1;

      for (let i = endIdx - 1; i >= searchStart; i--) {
        if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
          lastSentenceEnd = i + 1;
          break;
        }
      }

      // If we found a sentence boundary, use it
      if (lastSentenceEnd > startIdx + minChunkSize) {
        endIdx = lastSentenceEnd;
      }
    }

    const chunkText = text.substring(startIdx, endIdx).trim();

    // Only include chunks that meet minimum size
    // Exception: Include small chunks from KnowledgeCards (handled by caller)
    if (chunkText.length >= minChunkSize) {
      chunks.push({
        text: chunkText,
        startIdx,
        endIdx,
        length: chunkText.length,
      });
    }

    // Move to next chunk with overlap
    startIdx = endIdx - overlap;

    // Prevent infinite loop if overlap is too large
    if (startIdx <= chunks[chunks.length - 1]?.startIdx) {
      startIdx = endIdx;
    }

    // Avoid tiny final chunk
    if (text.length - startIdx < minChunkSize) {
      break;
    }
  }

  return chunks;
}

/**
 * Chunk structured data (like KnowledgeCards) into smaller pieces
 * @param {object} card - Knowledge card object
 * @param {string} sourceId - The source ID
 * @returns {array} Array of structured chunks
 */
function chunkKnowledgeCard(card, sourceId) {
  if (!card) {
    return [];
  }

  const chunks = [];
  const chunkSize = 1000;

  // Main description/guidance chunk
  const mainText = [
    `Condition: ${card.condition || 'Unknown'}`,
    `Guidance Type: ${card.guidanceType || 'Unknown'}`,
    card.stepsBn ? `Steps (Bengali): ${card.stepsBn.join(' ')}` : '',
    card.stepsEn ? `Steps (English): ${card.stepsEn.join(' ')}` : '',
    card.monitorBn ? `Monitor (Bengali): ${card.monitorBn.join(' ')}` : '',
    card.escalationTriggersBn ? `Escalation Triggers (Bengali): ${card.escalationTriggersBn.join(' ')}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  if (mainText.length > 0) {
    chunks.push({
      text: mainText,
      type: 'main',
      cardId: card.id,
      sourceId,
      minChunk: true, // Allow small chunks from knowledge cards
    });
  }

  // Citation chunk
  if (card.citation) {
    chunks.push({
      text: card.citation,
      type: 'citation',
      cardId: card.id,
      sourceId,
      minChunk: true,
    });
  }

  // Evidence tag chunk
  if (card.evidenceTag) {
    chunks.push({
      text: `Evidence Tag: ${card.evidenceTag}. Source: ${card.sourceName || 'Unknown'}`,
      type: 'evidence',
      cardId: card.id,
      sourceId,
      minChunk: true,
    });
  }

  return chunks;
}

/**
 * Chunk markdown content from summaries
 * @param {string} markdownText - Markdown file content
 * @param {string} sourceId - The source ID
 * @returns {array} Array of chunks
 */
function chunkMarkdown(markdownText, sourceId) {
  if (!markdownText) {
    return [];
  }

  // Split by markdown headers to create semantic chunks
  const sections = markdownText.split(/^#{1,6}\s+/m);
  const chunks = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (section.length === 0) continue;

    // Further chunk large sections
    const subChunks = chunkText(section, {
      chunkSize: 800,
      overlap: 200,
      minChunkSize: 100,
    });

    for (const subChunk of subChunks) {
      chunks.push({
        ...subChunk,
        sourceId,
        type: 'markdown',
      });
    }
  }

  return chunks;
}

/**
 * Chunk PDF text (simplified - no structural awareness)
 * @param {string} pdfText - Extracted text from PDF
 * @param {object} metadata - PDF metadata { pageStart, pageEnd }
 * @param {string} sourceId - The source ID
 * @returns {array} Array of chunks
 */
function chunkPDF(pdfText, metadata = {}, sourceId) {
  if (!pdfText) {
    return [];
  }

  const chunks = chunkText(pdfText, {
    chunkSize: 900,
    overlap: 250,
    minChunkSize: 100,
  });

  return chunks.map((chunk) => ({
    ...chunk,
    sourceId,
    type: 'pdf',
    ...metadata,
  }));
}

module.exports = {
  chunkText,
  chunkKnowledgeCard,
  chunkMarkdown,
  chunkPDF,
};
