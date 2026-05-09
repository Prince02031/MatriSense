'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function TriageLabPage() {
  const [cases, setCases] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [customCase, setCustomCase] = useState('');
  const [customResult, setCustomResult] = useState(null);

  const loadTestCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/admin/triage-lab/cases`);
      const data = await res.json();
      setCases(data);
    } catch (e) {
      setError('Failed to load test cases: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const runAllCases = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`${API}/api/admin/triage-lab/run-all`, { method: 'POST' });
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      setError('Failed to run test cases: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const runSingleCase = async (tc) => {
    try {
      const res = await fetch(`${API}/api/admin/triage-lab/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tc),
      });
      const data = await res.json();
      setResults((prev) => {
        const filtered = prev.filter((r) => r.id !== tc.id);
        return [...filtered, data];
      });
    } catch (e) {
      setError('Run failed: ' + e.message);
    }
  };

  const runCustomCase = async () => {
    setCustomResult(null);
    setError(null);
    try {
      const parsed = JSON.parse(customCase);
      const res = await fetch(`${API}/api/admin/triage-lab/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      setCustomResult(data);
    } catch (e) {
      setError('Custom run failed: ' + e.message);
    }
  };

  const filtered = filter === 'ALL' ? results : results.filter((r) => r.status === filter);
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>🧪 Triage Lab</h1>
      <p style={styles.subtitle}>Run synthetic test cases against the triage pipeline.</p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.toolbar}>
        <button style={styles.btn} onClick={loadTestCases} disabled={loading}>Load Cases</button>
        <button style={{ ...styles.btn, background: '#2a6' }} onClick={runAllCases} disabled={loading || cases.length === 0}>
          ▶ Run All ({cases.length})
        </button>
        {results.length > 0 && (
          <span style={styles.summary}>
            ✅ {passed} PASS &nbsp;|&nbsp; ❌ {failed} FAIL &nbsp;/&nbsp; {results.length} total
          </span>
        )}
        <select style={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="ALL">All Results</option>
          <option value="PASS">PASS only</option>
          <option value="FAIL">FAIL only</option>
        </select>
      </div>

      {loading && <div style={styles.loading}>⏳ Running...</div>}

      {/* Case List */}
      {cases.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Test Cases ({cases.length})</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                {['ID', 'Description', 'Risk', 'Action', 'Result', 'Run'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((tc) => {
                const result = results.find((r) => r.id === tc.id);
                return (
                  <tr key={tc.id} style={styles.tr}>
                    <td style={styles.td}><code>{tc.id}</code></td>
                    <td style={styles.td}>{tc.description}</td>
                    <td style={styles.td}><RiskBadge level={tc.expectedRiskLevel} /></td>
                    <td style={styles.td}><small>{tc.expectedAction}</small></td>
                    <td style={styles.td}>
                      {result ? (
                        <span style={{ color: result.status === 'PASS' ? '#4a4' : '#c44' }}>
                          {result.status === 'PASS' ? '✅ PASS' : `❌ FAIL (got ${result.actualRiskLevel})`}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={styles.td}>
                      <button style={styles.smallBtn} onClick={() => runSingleCase(tc)}>▶</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Failed Details */}
      {filtered.filter((r) => r.status === 'FAIL').length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>❌ Failures</h2>
          {filtered.filter((r) => r.status === 'FAIL').map((r) => (
            <div key={r.id} style={styles.failBlock}>
              <strong>{r.id}</strong>: expected <RiskBadge level={r.expectedRiskLevel} /> got <RiskBadge level={r.actualRiskLevel} />
              {r.matchedRules && <div><small>Matched: {r.matchedRules.join(', ') || 'none'}</small></div>}
              {r.error && <div style={{ color: '#c55' }}><small>Error: {r.error}</small></div>}
            </div>
          ))}
        </div>
      )}

      {/* Custom Case Runner */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🛠 Custom Case Runner</h2>
        <textarea
          style={styles.textarea}
          rows={10}
          placeholder='Paste a test case JSON object here...'
          value={customCase}
          onChange={(e) => setCustomCase(e.target.value)}
        />
        <button style={styles.btn} onClick={runCustomCase}>Run Custom Case</button>
        {customResult && (
          <pre style={styles.pre}>{JSON.stringify(customResult, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

function RiskBadge({ level }) {
  const colors = { HIGH: '#c44', MEDIUM: '#c84', LOW: '#4a4', UNKNOWN: '#888' };
  return (
    <span style={{ ...styles.badge, background: colors[level] || '#888' }}>{level}</span>
  );
}

const styles = {
  page: { fontFamily: 'monospace', padding: '20px', maxWidth: '1200px', margin: '0 auto', background: '#111', color: '#eee', minHeight: '100vh' },
  title: { color: '#7cf', marginBottom: '4px' },
  subtitle: { color: '#888', marginBottom: '16px' },
  toolbar: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' },
  btn: { padding: '8px 16px', background: '#335', color: '#eee', border: '1px solid #558', borderRadius: '4px', cursor: 'pointer' },
  smallBtn: { padding: '4px 10px', background: '#334', color: '#ccc', border: '1px solid #446', borderRadius: '3px', cursor: 'pointer' },
  select: { padding: '6px', background: '#222', color: '#eee', border: '1px solid #445', borderRadius: '4px' },
  summary: { color: '#aaa', fontSize: '14px' },
  error: { background: '#400', border: '1px solid #c55', color: '#f88', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  loading: { color: '#aaa', marginBottom: '12px' },
  section: { marginTop: '24px' },
  sectionTitle: { color: '#7cf', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px', background: '#1a1a2e', color: '#aac', borderBottom: '1px solid #333' },
  td: { padding: '8px', borderBottom: '1px solid #222', verticalAlign: 'middle' },
  tr: { ':hover': { background: '#1a1a1a' } },
  badge: { padding: '2px 8px', borderRadius: '10px', color: '#fff', fontSize: '12px', fontWeight: 'bold' },
  failBlock: { background: '#200', border: '1px solid #533', borderRadius: '4px', padding: '10px', marginBottom: '8px' },
  textarea: { width: '100%', background: '#1a1a1a', color: '#eee', border: '1px solid #445', borderRadius: '4px', padding: '10px', fontFamily: 'monospace', marginBottom: '8px', boxSizing: 'border-box' },
  pre: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', padding: '12px', overflowX: 'auto', marginTop: '12px' },
};
