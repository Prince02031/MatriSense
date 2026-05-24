/**
 * PDF Adapter for Vector RAG
 * Extracts text from PDFs into normalized records
 * No OCR support - if text cannot be extracted, marks SKIPPED_NEEDS_OCR
 */

const fs = require('fs');
const path = require('path');

// Try to load pdfParse if available, otherwise gracefully degrade
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  pdfParse = null;
}

/**
 * Extract text from PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<object>} { text, pages, pageCount, success }
 */
async function extractPDFText(filePath) {
  if (!pdfParse) {
    return {
      text: null,
      pages: [],
      pageCount: 0,
      success: false,
      error: 'pdf-parse not installed',
      needsOCR: false,
    };
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);

    // Extract text from each page
    const pages = [];
    if (pdfData.pages) {
      for (let i = 0; i < pdfData.pages.length; i++) {
        const page = pdfData.pages[i];
        const pageText = page.getTextContent
          ? page.getTextContent().items.map((item) => item.str).join(' ')
          : '';

        pages.push({
          pageNum: i + 1,
          text: pageText,
        });
      }
    } else {
      // Fallback: use text property if pages not available
      const text = pdfData.text || '';
      const pageNum = pdfData.numpages || 1;
      pages.push({
        pageNum: 1,
        text,
      });
    }

    // Combine all text
    const combinedText = pages.map((p) => p.text).join(' ');

    // Check if we actually extracted text
    if (!combinedText || combinedText.trim().length < 50) {
      return {
        text: null,
        pages,
        pageCount: pages.length,
        success: false,
        error: 'No extractable text found (may need OCR)',
        needsOCR: true,
      };
    }

    return {
      text: combinedText,
      pages,
      pageCount: pages.length,
      success: true,
      error: null,
      needsOCR: false,
    };
  } catch (error) {
    return {
      text: null,
      pages: [],
      pageCount: 0,
      success: false,
      error: error.message,
      needsOCR: false,
    };
  }
}

/**
 * Split PDF text into page-aware chunks
 * @param {object} extraction - Result from extractPDFText
 * @param {string} filePath - Path to PDF file
 * @param {object} sourceRegistry - Source entry from registry
 * @returns {array} Array of normalized records
 */
function convertPDFExtraction(extraction, filePath, sourceRegistry = {}) {
  if (!extraction.success || !extraction.text) {
    return [];
  }

  // Split text into chunks, tracking page numbers
  const chunkSize = 1000;
  const overlap = 250;
  const records = [];

  let textPos = 0;
  let chunkIndex = 0;
  let currentPageStart = 1;
  let currentPageEnd = 1;

  // Map character position to page number
  const charToPageMap = {};
  let charCount = 0;
  for (const page of extraction.pages) {
    for (let i = 0; i < page.text.length; i++) {
      charToPageMap[charCount++] = page.pageNum;
    }
  }

  const text = extraction.text;

  while (textPos < text.length) {
    let endPos = Math.min(textPos + chunkSize, text.length);

    // Try to find sentence boundary
    if (endPos < text.length) {
      for (let i = endPos - 1; i >= Math.max(textPos + 100, endPos - 100); i--) {
        if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
          endPos = i + 1;
          break;
        }
      }
    }

    const chunkText = text.substring(textPos, endPos).trim();

    if (chunkText.length >= 100) {
      // Determine page range for this chunk
      const startPageNum = charToPageMap[textPos] || currentPageStart;
      const endPageNum = charToPageMap[endPos - 1] || currentPageEnd;
      currentPageStart = startPageNum;
      currentPageEnd = endPageNum;

      records.push({
        sourceId: sourceRegistry.sourceId || path.basename(filePath, '.pdf'),
        sourceKind: 'PDF',
        sourceTitle: sourceRegistry.title || path.basename(filePath, '.pdf'),
        sourcePath: filePath,
        pageStart: startPageNum,
        pageEnd: endPageNum,
        sectionTitle: null,
        text: chunkText,
        metadata: {
          fileName: path.basename(filePath),
          chunkIndex,
          totalPages: extraction.pageCount,
          language: sourceRegistry.language || ['en'],
          trusted: sourceRegistry.trusted !== false,
          audiences: sourceRegistry.audiences || ['HEALTH_WORKER'],
          allowedGuidanceTypes: sourceRegistry.allowedGuidanceTypes || [],
          priority: sourceRegistry.priority || 4, // PDFs default lower priority
        },
      });

      chunkIndex++;
    }

    // Move to next chunk with overlap
    textPos = endPos - overlap;
    if (textPos <= charCount - 100) break;
  }

  return records;
}

/**
 * Adapt PDF file into normalized records
 * @param {string} filePath - Path to PDF file
 * @param {object} sourceRegistry - Source entry from registry
 * @returns {Promise<object>} { records, status, error, needsOCR }
 */
async function adapt(filePath, sourceRegistry = {}) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        records: [],
        status: 'ERROR',
        error: `File not found: ${filePath}`,
        needsOCR: false,
      };
    }

    // Extract text from PDF
    const extraction = await extractPDFText(filePath);

    if (extraction.needsOCR) {
      return {
        records: [],
        status: 'SKIPPED_NEEDS_OCR',
        error: extraction.error,
        needsOCR: true,
      };
    }

    if (!extraction.success) {
      return {
        records: [],
        status: 'ERROR',
        error: extraction.error,
        needsOCR: false,
      };
    }

    // Convert extraction into records
    const records = convertPDFExtraction(extraction, filePath, sourceRegistry);

    return {
      records,
      status: 'SUCCESS',
      error: null,
      needsOCR: false,
    };
  } catch (error) {
    return {
      records: [],
      status: 'ERROR',
      error: `PDF adaptation failed: ${error.message}`,
      needsOCR: false,
    };
  }
}

module.exports = {
  extractPDFText,
  convertPDFExtraction,
  adapt,
};
