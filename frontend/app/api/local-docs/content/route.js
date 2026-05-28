import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In Next.js App Router on Vercel/local, process.cwd() is the root of the next.js app (frontend/)
    const docsDir = path.join(process.cwd(), 'content', 'docs');
    const sections = {};

    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir);

      const filenameMap = {
        '01-hero-summary.md': 'hero',
        '02-yc-pitch.md': 'pitch',
        '03-product-overview.md': 'product-overview',
        '04-feature-matrix.md': 'features',
        '05-architecture.md': 'architecture',
        '06-data-flow.md': 'data-flow',
        '07-ai-layer.md': 'ai-layer',
        '08-rag-strategy.md': 'rag-strategy',
        '09-evidence-library.md': 'evidence-library',
        '10-safety-guardrails.md': 'safety',
        '11-privacy-data-protection.md': 'privacy',
        '12-regional-referral.md': 'regional-referral',
        '13-api-summary.md': 'api-summary',
        '14-data-model-summary.md': 'data-model',
        '15-team.md': 'team',
        '16-roadmap.md': 'roadmap',
        '17-changelog.md': 'changelog',
        '18-judge-demo-guide.md': 'judge-demo'
      };

      files.forEach(file => {
        const mappedId = filenameMap[file];
        if (mappedId) {
          const filePath = path.join(docsDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          sections[mappedId] = content;
        }
      });
    } else {
      console.warn(`Local docs directory not found at: ${docsDir}`);
    }

    return NextResponse.json({
      success: true,
      sections
    });
  } catch (error) {
    console.error('Error reading local docs content:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to read local docs', error: error.message },
      { status: 500 }
    );
  }
}
