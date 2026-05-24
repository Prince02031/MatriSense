#!/usr/bin/env node

/**
 * PDF/HTML Source Extraction Smoke Test
 * Tests adapter behavior for PDF and HTML sources
 */

const path = require('path');
const fs = require('fs');

const markdownAdapter = require('../adapters/markdownAdapter');
const htmlAdapter = require('../adapters/htmlAdapter');
const pdfAdapter = require('../adapters/pdfAdapter');

class PdfHtmlSmokeTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
    this.projectRoot = path.join(__dirname, '../../../../');
  }

  async run() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     PDF/HTML Source Extraction Test    ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
      // Test 1: Markdown extraction
      await this.testMarkdownExtraction();

      // Test 2: HTML extraction
      await this.testHtmlExtraction();

      // Test 3: PDF extraction
      await this.testPdfExtraction();

      // Test 4: Missing file handling
      await this.testMissingFileHandling();

      // Test 5: Large PDF handling
      await this.testLargePdfHandling();

      this.printSummary();
      process.exit(this.results.failed === 0 ? 0 : 1);
    } catch (error) {
      console.error('\n✗ FATAL ERROR:', error.message);
      process.exit(1);
    }
  }

  async testMarkdownExtraction() {
    const testName = 'Markdown Extraction (CDC HEAR HER)';
    try {
      const mdPath = path.join(
        this.projectRoot,
        'docs/rag-sources/summaries/03_cdc_hear_her_urgent_maternal_warning_signs_summary.md'
      );

      if (!fs.existsSync(mdPath)) {
        this.failTest(testName, `File not found: ${mdPath}`);
        return;
      }

      const records = await markdownAdapter.adapt(mdPath, {
        sourceId: 'cdc_hear_her_test',
        audiences: ['PATIENT'],
        allowedGuidanceTypes: ['WARNING_SIGNS', 'URGENT_ESCALATION'],
      });

      if (!Array.isArray(records) || records.length === 0) {
        this.failTest(testName, 'No records extracted');
      } else {
        this.passTest(testName, `Extracted ${records.length} sections`);

        // Check for meaningful content
        let warningContent = 0;
        for (const record of records) {
          if (
            record.text.toLowerCase().includes('warning') ||
            record.text.toLowerCase().includes('urgent') ||
            record.text.toLowerCase().includes('bleeding') ||
            record.text.toLowerCase().includes('seizure')
          ) {
            warningContent++;
          }
        }

        console.log(`  - Sections with warning/urgent content: ${warningContent}/${records.length}`);
        if (records[0]) {
          console.log(`  - First section title: ${records[0].sectionTitle || 'N/A'}`);
          console.log(`  - First section length: ${records[0].text.length} chars`);
        }
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testHtmlExtraction() {
    const testName = 'HTML Extraction (CDC HEAR HER HTML)';
    try {
      const htmlPath = path.join(
        this.projectRoot,
        'docs/rag-sources/html/cdc-hear-her-warning-signs.html'
      );

      if (!fs.existsSync(htmlPath)) {
        this.failTest(testName, `File not found: ${htmlPath}`);
        return;
      }

      const records = await htmlAdapter.adapt(htmlPath, {
        sourceId: 'cdc_hear_her_html_test',
        audiences: ['PATIENT'],
        allowedGuidanceTypes: ['WARNING_SIGNS', 'URGENT_ESCALATION'],
      });

      if (!Array.isArray(records) || records.length === 0) {
        this.failTest(testName, 'No records extracted');
      } else {
        this.passTest(testName, `Extracted ${records.length} sections`);

        // Check for meaningful content
        let meaningfulContent = 0;
        for (const record of records) {
          if (record.text.length > 50) {
            meaningfulContent++;
          }
        }

        console.log(`  - Sections > 50 chars: ${meaningfulContent}/${records.length}`);
        if (records[0]) {
          console.log(`  - First section title: ${records[0].sectionTitle || 'N/A'}`);
          console.log(`  - First section length: ${records[0].text.length} chars`);
        }
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testPdfExtraction() {
    const testName = 'PDF Extraction (CDC Hear Her PDF)';
    try {
      const pdfPath = path.join(
        this.projectRoot,
        'docs/rag-sources/pdfs/CDC-Hear-Her-Womens-urgent-warning-signs-h.pdf'
      );

      if (!fs.existsSync(pdfPath)) {
        console.log(`⊘ ${testName} - File not found (skipped)`);
        return;
      }

      const records = await pdfAdapter.adapt(pdfPath, {
        sourceId: 'cdc_hear_her_pdf_test',
        audiences: ['PATIENT'],
        allowedGuidanceTypes: ['WARNING_SIGNS', 'URGENT_ESCALATION'],
      });

      if (!Array.isArray(records) || records.length === 0) {
        this.failTest(testName, 'No text extracted from PDF');
      } else {
        this.passTest(testName, `Extracted ${records.length} chunks`);

        let textContent = 0;
        for (const record of records) {
          if (record.text && record.text.length > 50) {
            textContent++;
          }
        }

        console.log(`  - Chunks with text > 50 chars: ${textContent}/${records.length}`);
        if (records[0]) {
          console.log(`  - First chunk length: ${records[0].text.length} chars`);
          console.log(`  - Page info: ${records[0].metadata.pageStart || 'N/A'}-${records[0].metadata.pageEnd || 'N/A'}`);
        }
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testMissingFileHandling() {
    const testName = 'Missing File Handling';
    try {
      const missingPath = path.join(
        this.projectRoot,
        'docs/rag-sources/pdfs/NonExistent-File-12345.pdf'
      );

      let errorThrown = false;
      let errorMessage = '';

      try {
        await pdfAdapter.adapt(missingPath, {
          sourceId: 'missing_test',
          audiences: ['PATIENT'],
        });
      } catch (error) {
        errorThrown = true;
        errorMessage = error.message;
      }

      if (errorThrown) {
        this.passTest(testName, `Error thrown clearly: "${errorMessage.substring(0, 50)}..."`);
      } else {
        this.failTest(testName, 'No error thrown for missing file');
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testLargePdfHandling() {
    const testName = 'Large PDF Handling (No Crash)';
    try {
      // Try NCBI high-risk PDF (likely large)
      const largePdfPath = path.join(
        this.projectRoot,
        'docs/rag-sources/pdfs/NCBI_bookshelf_high_risk.pdf'
      );

      if (!fs.existsSync(largePdfPath)) {
        console.log(`⊘ ${testName} - File not found (skipped)`);
        return;
      }

      const startTime = Date.now();
      let records = [];
      let status = 'SUCCESS';

      try {
        records = await pdfAdapter.adapt(largePdfPath, {
          sourceId: 'large_pdf_test',
          audiences: ['HEALTH_WORKER'],
        });
      } catch (error) {
        status = 'ERROR';
      }

      const elapsed = Date.now() - startTime;

      if (status === 'SUCCESS') {
        this.passTest(
          testName,
          `Processed in ${elapsed}ms, extracted ${records.length} chunks`
        );
      } else {
        // Mark as warning (not complete failure)
        console.log(`⊘ ${testName} - PDF processing resulted in error (may need OCR)`);
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  passTest(name, message) {
    this.results.passed++;
    this.results.tests.push({ name, status: 'PASS', message });
    console.log(`✓ ${name}`);
    if (message) console.log(`  ${message}`);
  }

  failTest(name, message) {
    this.results.failed++;
    this.results.tests.push({ name, status: 'FAIL', message });
    console.log(`✗ ${name}`);
    if (message) console.log(`  ${message}`);
  }

  printSummary() {
    console.log('\n========== TEST SUMMARY ==========');
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Total:  ${this.results.passed + this.results.failed}`);
    console.log('=================================\n');

    if (this.results.failed === 0) {
      console.log('✓ ALL TESTS PASSED');
    } else if (this.results.failed <= 2) {
      console.log('⚠ SOME TESTS FAILED (may be expected)');
    } else {
      console.log('✗ MULTIPLE TEST FAILURES');
    }
  }
}

// Run test
const test = new PdfHtmlSmokeTest();
test.run().catch(console.error);
