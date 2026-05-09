'use client';

const PAGES = [
  {
    path: '/admin/triage-lab',
    icon: '🧪',
    title: 'Triage Lab',
    desc: 'Run the 30 synthetic test cases against the full triage pipeline. View PASS/FAIL results per case.',
  },
  {
    path: '/admin/rule-debugger',
    icon: '🔧',
    title: 'Rule Debugger',
    desc: 'Paste any caseState and inspect exactly which json-rules-engine rules fire, with matched events and modifier scores.',
  },
  {
    path: '/admin/case-state-preview',
    icon: '📋',
    title: 'Case State Preview',
    desc: 'Build, inspect, and validate caseState objects. Load from test cases or enter manually.',
  },
  {
    path: '/admin/rag-preview',
    icon: '📚',
    title: 'RAG Preview',
    desc: 'Test the evidence retriever and care guidance assembler. View retrieved cards, blocked advice, and Bangla output fields.',
  },
  {
    path: '/admin/safety-test',
    icon: '🛡',
    title: 'Safety Test',
    desc: 'Run Bangla input through LLM extraction and the safety validator. Check for diagnosis/medicine violations.',
  },
];

export default function AdminIndexPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.title}>⚙️ MatriSense Dev Admin</h1>
      <p style={styles.subtitle}>Internal testing tools — not for production use.</p>

      <div style={styles.warning}>
        ⚠️ These pages call live backend endpoints. Make sure the backend is running on{' '}
        <code>{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}</code>
      </div>

      <div style={styles.grid}>
        {PAGES.map((p) => (
          <a key={p.path} href={p.path} style={styles.card}>
            <div style={styles.cardIcon}>{p.icon}</div>
            <div style={styles.cardTitle}>{p.title}</div>
            <div style={styles.cardDesc}>{p.desc}</div>
            <div style={styles.cardPath}>{p.path}</div>
          </a>
        ))}
      </div>

      <div style={styles.footer}>
        <p>Test cases: <code>backend/src/triage/tests/testCases.json</code> (30 cases: 8 LOW / 8 MEDIUM / 10 HIGH / 4 edge)</p>
        <p>Knowledge cards: <code>backend/src/rag/knowledgeCards.json</code> (25 cards)</p>
      </div>
    </div>
  );
}

const styles = {
  page: { fontFamily: 'monospace', padding: '32px', maxWidth: '1000px', margin: '0 auto', background: '#111', color: '#eee', minHeight: '100vh' },
  title: { color: '#7cf', marginBottom: '4px', fontSize: '24px' },
  subtitle: { color: '#888', marginBottom: '20px' },
  warning: { background: '#1a1600', border: '1px solid #665500', color: '#cc9', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '13px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' },
  card: {
    display: 'block', background: '#1a1a2e', border: '1px solid #334', borderRadius: '8px',
    padding: '20px', textDecoration: 'none', color: '#eee', transition: 'border-color 0.2s',
    cursor: 'pointer',
  },
  cardIcon: { fontSize: '28px', marginBottom: '8px' },
  cardTitle: { color: '#7cf', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' },
  cardDesc: { color: '#aaa', fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' },
  cardPath: { color: '#558', fontSize: '12px' },
  footer: { borderTop: '1px solid #333', paddingTop: '20px', color: '#666', fontSize: '12px', lineHeight: '2' },
};
