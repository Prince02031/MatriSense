/**
 * Markdown Adapter for Vector RAG
 * Converts markdown summary files into normalized records
 */

const fs = require('fs');
const path = require('path');

/**
 * Load markdown file
 * @param {string} filePath - Path to markdown file
 * @returns {Promise<string>} Markdown content
 */
async function loadMarkdown(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    throw new Error(`Failed to load markdown file: ${error.message}`);
  }
}

/**
 * Parse markdown into sections by heading
 * @param {string} content - Markdown content
 * @returns {array} Array of { heading, text }
 */
function parseMarkdownSections(content) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  let currentText = [];

  for (const line of lines) {
    // Detect heading (# ## ### etc)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection && currentText.length > 0) {
        sections.push({
          heading: currentSection,
          text: currentText.join('\n').trim(),
        });
      }

      // Start new section
      currentSection = headingMatch[2].trim();
      currentText = [];
    } else if (line.trim().length > 0) {
      // Add line to current section
      currentText.push(line);
    }
  }

  // Save last section
  if (currentSection && currentText.length > 0) {
    sections.push({
      heading: currentSection,
      text: currentText.join('\n').trim(),
    });
  }

  return sections;
}

/**
 * Convert markdown section into normalized record
 * @param {string} filePath - Path to markdown file
 * @param {object} section - Section object { heading, text }
 * @param {number} index - Section index
 * @param {object} sourceRegistry - Source entry from registry
 * @returns {object} Normalized record
 */
function convertSection(filePath, section, index, sourceRegistry = {}) {
  if (!section || !section.text || section.text.trim().length < 50) {
    return null; // Skip tiny sections
  }

  return {
    sourceId: sourceRegistry.sourceId || path.basename(filePath, '.md'),
    sourceKind: 'MARKDOWN',
    sourceTitle: sourceRegistry.title || path.basename(filePath, '.md'),
    sourcePath: filePath,
    pageStart: null,
    pageEnd: null,
    sectionTitle: section.heading,
    text: section.text,
    metadata: {
      fileName: path.basename(filePath),
      sectionIndex: index,
      language: sourceRegistry.language || ['en'],
      trusted: sourceRegistry.trusted !== false,
      audiences: sourceRegistry.audiences || ['HEALTH_WORKER'],
      allowedGuidanceTypes: sourceRegistry.allowedGuidanceTypes || [],
      evidenceTag: sourceRegistry.defaultMetadata?.evidenceTag || null,
      defaultMetadata: sourceRegistry.defaultMetadata || {},
      priority: sourceRegistry.priority || 3,
    },
  };
}

/**
 * Convert markdown file into normalized records
 * @param {string} filePath - Path to markdown file
 * @param {object} sourceRegistry - Source entry from registry
 * @returns {Promise<array>} Array of normalized records
 */
async function adapt(filePath, sourceRegistry = {}) {
  try {
    const content = await loadMarkdown(filePath);
    const sections = parseMarkdownSections(content);
    const records = [];

    for (let i = 0; i < sections.length; i++) {
      const record = convertSection(filePath, sections[i], i, sourceRegistry);
      if (record) {
        records.push(record);
      }
    }

    // If no sections found, treat entire file as one record
    if (records.length === 0 && content.trim().length > 0) {
      records.push({
        sourceId: sourceRegistry.sourceId || path.basename(filePath, '.md'),
        sourceKind: 'MARKDOWN',
        sourceTitle: sourceRegistry.title || path.basename(filePath, '.md'),
        sourcePath: filePath,
        pageStart: null,
        pageEnd: null,
        sectionTitle: null,
        text: content,
        metadata: {
          fileName: path.basename(filePath),
          language: sourceRegistry.language || ['en'],
          trusted: sourceRegistry.trusted !== false,
          audiences: sourceRegistry.audiences || ['HEALTH_WORKER'],
          allowedGuidanceTypes: sourceRegistry.allowedGuidanceTypes || [],
          evidenceTag: sourceRegistry.defaultMetadata?.evidenceTag || null,
          defaultMetadata: sourceRegistry.defaultMetadata || {},
          priority: sourceRegistry.priority || 3,
        },
      });
    }

    return records;
  } catch (error) {
    throw new Error(`Markdown adaptation failed: ${error.message}`);
  }
}

module.exports = {
  loadMarkdown,
  parseMarkdownSections,
  convertSection,
  adapt,
};
