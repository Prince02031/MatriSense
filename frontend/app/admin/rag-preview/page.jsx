'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const SAMPLE_DECISION = {
  riskLevel: 'HIGH',
  action: 'URGENT_CLINIC_VISIT',
  allowedGuidanceType: 'URGENT_ESCALATION',
  blockHomeCareFirst: true,
  evidenceTags: ['WHO_DANGER_SIGN_VAGINAL_BLEEDING'],
  matchedRules: ['WHO_DANGER_SIGN_VAGINAL_BLEEDING_HIGH'],
};

const SAMPLE_CASE_STATE = {
  symptoms: ['vaginal_bleeding'],
  dangerSignsChecked: ['vaginal_bleeding'],
  trimester: 'second',
  gestationalWeek: 19,
  riskFactors: {},
  meta: { sourceRefs: ['WHO_PCPNC_2016'] },
};

export default function RagPreviewPage() {
  const [decision, setDecision] = useState(JSON.stringify(SAMPLE_DECISION, null, 2));
  const [caseState, setCaseState] = useState(JSON.stringify(SAMPLE_CASE_STATE, null, 2));
  const [result, setResult] = useState(null);
  const [cards, setCards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('assemble');

  const runAssembler = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/admin/rag-preview/assemble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: JSON.parse(decision),
          caseState: JSON.parse(caseState),
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError('Failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/admin/rag-preview/cards`);
      const data = await res.json();
      setCards(data);
      setActiveTab('cards');
    } catch (e) {
      setError('Failed to load cards: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>📚 RAG Preview</h1>
      <p style={styles.subtitle}>Inspect knowledge card retrieval and care guidance assembly.</p>

      {error && <div style={styles.error}>{error}</div>}

      {/* Tabs */}
      <div style={styles.tabs}>
        {['assemble', 'cards'].map((t) => (
          <button key={t} style={{ ...styles.tab, ...(activeTab === t ? styles.tabActive : {}) }} onClick={() => setActiveTab(t)}>
            {t === 'assemble' ? '🔍 Assembler' : '🗂 All Cards'}
          </button>
        ))}
        <button style={styles.btn} onClick={loadAllCards} disabled={loading}>Load All Cards</button>
      </div>

      {activeTab === 'assemble' && (
        <div>
          <div style={styles.grid}>
            <div>
              <h2 style={styles.sectionTitle}>decision Input</h2>
              <textarea style={styles.textarea} rows={14} value={decision} onChange={(e) => { setDecision(e.target.value); setResult(null); }} />
              <h2 style={{ ...styles.sectionTitle, marginTop: '12px' }}>caseState Input</h2>
              <textarea style={styles.textarea} rows={12} value={caseState} onChange={(e) => { setCaseState(e.target.value); setResult(null); }} />
              <button style={{ ...styles.btn, marginTop: '10px', background: '#2a6' }} onClick={runAssembler} disabled={loading}>
                ▶ Assemble Care Guidance
              </button>
            </div>

            <div>
              <h2 style={styles.sectionTitle}>Assembly Output</h2>
              {loading && <div style={styles.loading}>⏳ Assembling...</div>}
              {result && (
                <div>
                  {/* Retrieved Cards Summary */}
                  <div style={styles.statsRow}>
                    <Stat label="Cards Retrieved" val={result.retrievedCards?.length || 0} />
                    <Stat label="Cards Blocked" val={result.blockedAdvice?.length || 0} color="#c84" />
                    <Stat label="Steps Now" val={result.stepsNowBn?.length || 0} color="#4af" />
                  </div>

                  <Section title={`stepsNowBn (${result.stepsNowBn?.length || 0})`} color="#4af">
                    {result.stepsNowBn?.length > 0 ? (
                      <ol style={styles.ol}>{result.stepsNowBn.map((s, i) => <li key={i} style={styles.li}>{s}</li>)}</ol>
                    ) : <Empty />}
                  </Section>

                  <Section title={`monitorBn (${result.monitorBn?.length || 0})`} color="#7cf">
                    {result.monitorBn?.length > 0 ? (
                      <ol style={styles.ol}>{result.monitorBn.map((s, i) => <li key={i} style={styles.li}>{s}</li>)}</ol>
                    ) : <Empty />}
                  </Section>

                  <Section title={`urgentWarningBn (${result.urgentWarningBn?.length || 0})`} color="#f66">
                    {result.urgentWarningBn?.length > 0 ? (
                      <ol style={styles.ol}>{result.urgentWarningBn.map((s, i) => <li key={i} style={styles.li}>{s}</li>)}</ol>
                    ) : <Empty />}
                  </Section>

                  <Section title={`sources (${result.sources?.length || 0})`} color="#8f8">
                    {result.sources?.length > 0 ? (
                      <ul style={styles.ol}>{result.sources.map((s, i) => <li key={i} style={styles.li}>{s}</li>)}</ul>
                    ) : <Empty />}
                  </Section>

                  {result.blockedAdvice?.length > 0 && (
                    <Section title={`Blocked Advice (${result.blockedAdvice.length})`} color="#c84">
                      {result.blockedAdvice.map((b, i) => (
                        <div key={i} style={{ background: '#1a0e00', border: '1px solid #750', borderRadius: '3px', padding: '6px', marginBottom: '4px', fontSize: '13px' }}>
                          <code>{b.id}</code> — {b.reason}
                        </div>
                      ))}
                    </Section>
                  )}

                  <Section title={`Retrieved Cards (${result.retrievedCards?.length || 0})`} color="#aaa">
                    {result.retrievedCards?.map((card) => <CardRow key={card.id} card={card} />)}
                  </Section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cards' && cards && (
        <div style={{ marginTop: '8px' }}>
          <h2 style={styles.sectionTitle}>All Knowledge Cards ({cards.length})</h2>
          <table style={styles.table}>
            <thead>
              <tr>{['ID', 'Guidance Type', 'Risk Levels', 'Evidence Tag', 'Symptoms', 'Source'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id}>
                  <td style={styles.td}><code style={{ color: '#7cf', fontSize: '12px' }}>{card.id}</code></td>
                  <td style={styles.td}><GuidanceBadge type={card.guidanceType} /></td>
                  <td style={styles.td}><small>{(card.riskLevelAllowed || []).join(', ')}</small></td>
                  <td style={styles.td}><small>{card.evidenceTag || '—'}</small></td>
                  <td style={styles.td}><small>{(card.symptoms || []).join(', ') || '—'}</small></td>
                  <td style={styles.td}><small>{card.citation || card.sourceName || '—'}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Section({ title, color, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: '10px' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer', color: color || '#7cf', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', userSelect: 'none' }}>
        {open ? '▾' : '▸'} {title}
      </div>
      {open && <div style={{ paddingLeft: '12px' }}>{children}</div>}
    </div>
  );
}

function Stat({ label, val, color }) {
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #334', borderRadius: '4px', padding: '8px 14px', textAlign: 'center' }}>
      <div style={{ color: color || '#7cf', fontSize: '22px', fontWeight: 'bold' }}>{val}</div>
      <div style={{ color: '#888', fontSize: '12px' }}>{label}</div>
    </div>
  );
}

function CardRow({ card }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #334', borderRadius: '4px', padding: '8px', marginBottom: '6px' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <code style={{ color: '#7cf', fontSize: '12px' }}>{card.id}</code>
        <GuidanceBadge type={card.guidanceType} />
        <span style={{ color: '#888', fontSize: '12px' }}>{card.evidenceTag}</span>
      </div>
      {open && <pre style={{ margin: '8px 0 0 0', fontSize: '12px', background: '#111', padding: '8px', borderRadius: '3px', overflowX: 'auto' }}>{JSON.stringify(card, null, 2)}</pre>}
    </div>
  );
}

function GuidanceBadge({ type }) {
  const colors = {
    URGENT_ESCALATION: '#c44', CONTACT_HEALTH_WORKER: '#c84', SELF_CARE_AND_MONITOR: '#4a4',
    SAFETY_DISCLAIMER: '#448', WARNING_SIGNS: '#a64',
  };
  return <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', background: colors[type] || '#333', color: '#fff' }}>{type || '?'}</span>;
}

function Empty() { return <div style={{ color: '#555', fontSize: '13px' }}>— none —</div>; }

const styles = {
  page: { fontFamily: 'monospace', padding: '20px', maxWidth: '1400px', margin: '0 auto', background: '#111', color: '#eee', minHeight: '100vh' },
  title: { color: '#7cf', marginBottom: '4px' },
  subtitle: { color: '#888', marginBottom: '12px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' },
  tab: { padding: '8px 16px', background: '#222', color: '#aaa', border: '1px solid #333', borderRadius: '4px', cursor: 'pointer' },
  tabActive: { background: '#1a1a3e', color: '#7cf', borderColor: '#558' },
  btn: { padding: '8px 16px', background: '#335', color: '#eee', border: '1px solid #558', borderRadius: '4px', cursor: 'pointer' },
  error: { background: '#400', border: '1px solid #c55', color: '#f88', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  loading: { color: '#aaa', marginBottom: '12px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  sectionTitle: { color: '#7cf', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '10px' },
  textarea: { width: '100%', background: '#1a1a1a', color: '#eee', border: '1px solid #445', borderRadius: '4px', padding: '10px', fontFamily: 'monospace', fontSize: '13px', boxSizing: 'border-box' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '14px' },
  ol: { margin: 0, paddingLeft: '18px' },
  li: { marginBottom: '4px', fontSize: '13px', lineHeight: '1.5' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px', background: '#1a1a2e', color: '#aac', borderBottom: '1px solid #333', fontSize: '13px' },
  td: { padding: '8px', borderBottom: '1px solid #222', fontSize: '13px', verticalAlign: 'top' },
};
