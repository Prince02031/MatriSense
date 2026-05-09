'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const SAMPLE_CASE_STATE = {
  symptoms: ['headache', 'blurred_vision'],
  dangerSignsChecked: ['blurred_vision'],
  trimester: 'second',
  gestationalWeek: 21,
  riskFactors: { hypertension: false, diabetes: false, anemia: false },
  meta: { sourceRefs: ['WHO_PCPNC_2016'] },
};

export default function RuleDebuggerPage() {
  const [caseState, setCaseState] = useState(JSON.stringify(SAMPLE_CASE_STATE, null, 2));
  const [result, setResult] = useState(null);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runRules = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const parsed = JSON.parse(caseState);
      const res = await fetch(`${API}/api/admin/rule-debugger/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseState: parsed }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError('Failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/admin/rule-debugger/rules`);
      const data = await res.json();
      setRules(data);
    } catch (e) {
      setError('Failed to load rules: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>🔧 Rule Debugger</h1>
      <p style={styles.subtitle}>Inspect which rules fire for a given caseState.</p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.grid}>
        {/* Left: Input */}
        <div>
          <h2 style={styles.sectionTitle}>caseState Input</h2>
          <textarea
            style={styles.textarea}
            rows={22}
            value={caseState}
            onChange={(e) => setCaseState(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button style={styles.btn} onClick={runRules} disabled={loading}>▶ Run Rules</button>
            <button style={styles.btn} onClick={loadRules} disabled={loading}>📋 View All Rules</button>
            <button style={{ ...styles.btn, background: '#333' }} onClick={() => {
              setCaseState(JSON.stringify(SAMPLE_CASE_STATE, null, 2));
              setResult(null);
            }}>Reset</button>
          </div>
        </div>

        {/* Right: Output */}
        <div>
          <h2 style={styles.sectionTitle}>Result</h2>
          {loading && <div style={styles.loading}>⏳ Running...</div>}
          {result && (
            <div>
              <div style={styles.riskBanner(result.riskLevel)}>
                Risk Level: <strong>{result.riskLevel}</strong>
              </div>
              <div style={styles.infoBox}>
                <div><strong>Action:</strong> {result.action}</div>
                <div><strong>Guidance Type:</strong> {result.allowedGuidanceType}</div>
                <div><strong>Block Home Care:</strong> {result.blockHomeCareFirst ? '✅ Yes' : '❌ No'}</div>
              </div>

              <h3 style={styles.subTitle}>Matched Rules ({result.matchedRules?.length || 0})</h3>
              {result.matchedRules?.length > 0 ? (
                <ul style={styles.ruleList}>
                  {result.matchedRules.map((r) => (
                    <li key={r.name} style={styles.ruleItem}>
                      <code style={{ color: '#7cf' }}>{r.name}</code>
                      <span style={styles.rulePriority}> [{r.priority || 'no priority'}]</span>
                      {r.conditions && (
                        <pre style={styles.rulePre}>{JSON.stringify(r.conditions, null, 2)}</pre>
                      )}
                    </li>
                  ))}
                </ul>
              ) : <div style={{ color: '#888' }}>No rules matched.</div>}

              <h3 style={styles.subTitle}>Modifier Events ({result.modifierEvents?.length || 0})</h3>
              {result.modifierEvents?.length > 0 ? (
                <ul style={styles.ruleList}>
                  {result.modifierEvents.map((e, i) => (
                    <li key={i} style={styles.ruleItem}>
                      <code>{e.type}</code> — score: <strong>{e.score}</strong>
                    </li>
                  ))}
                </ul>
              ) : <div style={{ color: '#888' }}>No modifier events.</div>}

              <h3 style={styles.subTitle}>Follow-up Questions Triggered</h3>
              <pre style={styles.pre}>{JSON.stringify(result.followUpQuestions || [], null, 2)}</pre>

              <h3 style={styles.subTitle}>Raw Decision</h3>
              <pre style={styles.pre}>{JSON.stringify(result.decision || {}, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* All Rules Viewer */}
      {rules && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={styles.sectionTitle}>📋 All Loaded Rules</h2>
          {Object.entries(rules).map(([ruleSet, ruleList]) => (
            <div key={ruleSet} style={{ marginBottom: '16px' }}>
              <h3 style={{ color: '#aac', marginBottom: '6px' }}>{ruleSet} ({ruleList.length} rules)</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Name', 'Risk Level', 'Priority', 'Evidence Tag', 'Source'].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ruleList.map((rule) => (
                    <tr key={rule.name} style={styles.tr}>
                      <td style={styles.td}><code style={{ color: '#7cf' }}>{rule.name}</code></td>
                      <td style={styles.td}><RiskBadge level={rule.event?.params?.riskLevel} /></td>
                      <td style={styles.td}>{rule.priority || '—'}</td>
                      <td style={styles.td}><small>{rule.event?.params?.evidenceTag || '—'}</small></td>
                      <td style={styles.td}><small>{rule.event?.params?.sourceRef || '—'}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RiskBadge({ level }) {
  const colors = { HIGH: '#c44', MEDIUM: '#c84', LOW: '#4a4', UNKNOWN: '#888' };
  return <span style={{ ...styles.badge, background: colors[level] || '#888' }}>{level || '?'}</span>;
}

const styles = {
  page: { fontFamily: 'monospace', padding: '20px', maxWidth: '1400px', margin: '0 auto', background: '#111', color: '#eee', minHeight: '100vh' },
  title: { color: '#7cf', marginBottom: '4px' },
  subtitle: { color: '#888', marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  sectionTitle: { color: '#7cf', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px' },
  subTitle: { color: '#aac', marginTop: '16px', marginBottom: '6px', fontSize: '14px' },
  textarea: { width: '100%', background: '#1a1a1a', color: '#eee', border: '1px solid #445', borderRadius: '4px', padding: '10px', fontFamily: 'monospace', fontSize: '13px', boxSizing: 'border-box' },
  btn: { padding: '8px 16px', background: '#335', color: '#eee', border: '1px solid #558', borderRadius: '4px', cursor: 'pointer' },
  error: { background: '#400', border: '1px solid #c55', color: '#f88', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  loading: { color: '#aaa', marginBottom: '12px' },
  riskBanner: (level) => ({
    padding: '12px', borderRadius: '6px', marginBottom: '12px', fontWeight: 'bold', fontSize: '18px',
    background: level === 'HIGH' ? '#3a0000' : level === 'MEDIUM' ? '#2a1800' : level === 'LOW' ? '#001a00' : '#1a1a1a',
    color: level === 'HIGH' ? '#f66' : level === 'MEDIUM' ? '#fa0' : level === 'LOW' ? '#4f4' : '#aaa',
    border: `1px solid ${level === 'HIGH' ? '#c44' : level === 'MEDIUM' ? '#c84' : level === 'LOW' ? '#4a4' : '#444'}`,
  }),
  infoBox: { background: '#1a1a2e', border: '1px solid #333', borderRadius: '4px', padding: '10px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' },
  ruleList: { listStyle: 'none', padding: 0, margin: 0 },
  ruleItem: { background: '#1a1a2e', border: '1px solid #334', borderRadius: '4px', padding: '8px', marginBottom: '6px' },
  rulePriority: { color: '#888', fontSize: '12px' },
  rulePre: { margin: '6px 0 0 0', background: '#111', padding: '6px', borderRadius: '3px', fontSize: '12px', overflowX: 'auto' },
  pre: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', padding: '12px', overflowX: 'auto', fontSize: '12px' },
  badge: { padding: '2px 8px', borderRadius: '10px', color: '#fff', fontSize: '12px', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px', background: '#1a1a2e', color: '#aac', borderBottom: '1px solid #333', fontSize: '13px' },
  td: { padding: '8px', borderBottom: '1px solid #222', fontSize: '13px' },
  tr: {},
};
