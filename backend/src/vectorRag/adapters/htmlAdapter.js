/**
 * HTML Adapter for Vector RAG
 * Extracts text from HTML into normalized records
 * Strips scripts, styles, and navigation noise
 */

const fs = require('fs');
const path = require('path');

/**
 * Load HTML file
 * @param {string} filePath - Path to HTML file
 * @returns {Promise<string>} HTML content
 */
async function loadHTML(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    throw new Error(`Failed to load HTML file: ${error.message}`);
  }
}

/**
 * Strip HTML tags and unwanted elements
 * @param {string} html - Raw HTML content
 * @returns {string} Cleaned text content
 */
function stripHTML(html) {
  let text = html;

  // Remove script tags and content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and content
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove nav, header, footer tags (common for web boilerplate)
  text = text.replace(/<(nav|header|footer)[^>]*>.*?<\/\1>/gi, '');

  // Remove HTML comments
  text = text.replace(/<!--.*?-->/gs, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Clean up multiple spaces and newlines
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Extract headings from HTML
 * @param {string} html - HTML content
 * @returns {array} Array of { level, text }
 */
function extractHeadings(html) {
  const headings = [];
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;

  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = stripHTML(match[2]).trim();
    if (text.length > 0) {
      headings.push({ level, text });
    }
  }

  return headings;
}

/**
 * Split HTML text into sections by headings
 * @param {string} html - HTML content
 * @param {string} text - Cleaned text
 * @returns {array} Array of { heading, text }
 */
function splitBySections(html, text) {
  const headings = extractHeadings(html);

  if (headings.length === 0) {
    // No headings, return entire text as one section
    return [{ heading: null, text: text.trim() }];
  }

  const sections = [];
  const htmlParts = html.split(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);

  // First part (before first heading)
  if (htmlParts[0]) {
    const content = stripHTML(htmlParts[0]).trim();
    if (content.length > 50) {
      sections.push({ heading: null, text: content });
    }
  }

  // Remaining parts
  for (let i = 1; i < htmlParts.length; i += 2) {
    const heading = htmlParts[i] ? stripHTML(htmlParts[i]).trim() : null;
    const content = htmlParts[i + 1] ? stripHTML(htmlParts[i + 1]).trim() : '';

    if (content.length > 50) {
      sections.push({ heading, text: content });
    }
  }

  return sections;
}

/**
 * Convert HTML section into normalized record
 * @param {object} section - Section object { heading, text }
 * @param {number} index - Section index
 * @param {string} filePath - Path to HTML file
 * @param {object} sourceRegistry - Source entry from registry
 * @returns {object} Normalized record
 */
function convertSection(section, index, filePath, sourceRegistry = {}) {
  if (!section || !section.text || section.text.trim().length < 50) {
    return null; // Skip tiny sections
  }

  return {
    sourceId: sourceRegistry.sourceId || path.basename(filePath, '.html'),
    sourceKind: 'HTML',
    sourceTitle: sourceRegistry.title || path.basename(filePath, '.html'),
    sourcePath: filePath,
    sourceUrl: sourceRegistry.sourceUrl || null,
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
      priority: sourceRegistry.priority || 3,
    },
  };
}

/**
 * Adapt HTML file into normalized records
 * @param {string} filePath - Path to HTML file
 * @param {object} sourceRegistry - Source entry from registry
 * @returns {Promise<array>} Array of normalized records
 */
async function adapt(filePath, sourceRegistry = {}) {
  try {
    const html = await loadHTML(filePath);
    const text = stripHTML(html);

    if (text.trim().length < 50) {
      throw new Error('No meaningful text content extracted from HTML');
    }

    const sections = splitBySections(html, text);
    const records = [];

    for (let i = 0; i < sections.length; i++) {
      const record = convertSection(sections[i], i, filePath, sourceRegistry);
      if (record) {
        records.push(record);
      }
    }

    return records;
  } catch (error) {
    throw new Error(`HTML adaptation failed: ${error.message}`);
  }
}

module.exports = {
  loadHTML,
  stripHTML,
  extractHeadings,
  splitBySections,
  convertSection,
  adapt,
};
