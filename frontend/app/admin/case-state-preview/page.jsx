'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const SAMPLE = {
  sessionId: 'preview-001',
  patientId: 'patient-001',
  trimester: 'third',
  gestationalWeek: 33,
  riskFactors: {
    hypertension: false,
    diabetes: false,
    anemia: false,
    previousHighRiskPregnancy: false,
    previousCSection: false,
    previousMiscarriage: false,
  },
  symptoms: ['reduced_fetal_movement'],
  dangerSignsChecked: ['reduced_fetal_movement'],
  followUpAnswers: {},
  extractedAt: new Date().toISOString(),
  meta: {
    sourceRefs: ['CDC_MATERNAL_2020'],
    extractionModel: 'gemini-1.5-flash',
    extractionConfidence: 0.91,
  },
};

export default function CaseStatePreviewPage() {
  const [input, setInput] = useState(JSON.stringify(SAMPLE, null, 2));
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tcCases, setTcCases] = useState([]);
  const [selectedTc, setSelectedTc] = useState('');

  const validateState = async () => {
    setLoading(true);
    setError(null);
    setValidation(null);
    try {
      const parsed = JSON.parse(input);
      const res = await fetch(`${API}/api/admin/case-state/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseState: parsed }),
      });
      const data = await res.json();
      setValidation(data);
    } catch (e) {
      setError('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFromTestCase = async () => {
    try {
      const res = await fetch(`${API}/api/admin/triage-lab/cases`);
      const data = await res.json();
      setTcCases(data);
    } catch (e) {
      setError('Failed to load test cases: ' + e.message);
    }
  };

  const applyTestCase = (id) => {
    setSelectedTc(id);
    const tc = tcCases.find((c) => c.id === id);
    if (!tc) return;
    const cs = {
      sessionId: `preview-${id}`,
      patientId: 'patient-preview',
      trimester: tc.profile?.trimester || 'second',
      gestationalWeek: tc.profile?.gestationalWeek || 20,
      riskFactors: tc.profile?.riskFactors || {},
      symptoms: tc.confirmedSymptoms || [],
      dangerSignsChecked: tc.confirmedSymptoms || [],
      followUpAnswers: tc.followUpAnswers || {},
      extractedAt: new Date().toISOString(),
      meta: { sourceRefs: [], extractionModel: 'test', extractionConfidence: 1.0 },
    };
    setInput(JSON.stringify(cs, null, 2));
    setValidation(null);
  };

  let parsed = null;
  let parseError = null;
  try { parsed = JSON.parse(input); } catch (e) { parseError = e.message; }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>📋 Case State Preview</h1>
      <p style={styles.subtitle}>Inspect, build, and validate caseState objects before sending to the triage pipeline.</p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.toolbar}>
        <button style={styles.btn} onClick={loadFromTestCase}>Load from Test Cases</button>
        {tcCases.length > 0 && (
          <select style={styles.select} value={selectedTc} onChange={(e) => applyTestCase(e.target.value)}>
            <option value="">— Pick Test Case —</option>
            {tcCases.map((tc) => (
              <option key={tc.id} value={tc.id}>{tc.id}: {tc.description}</option>
            ))}
          </select>
        )}
        <button style={{ ...styles.btn, background: '#2a6' }} onClick={validateState} disabled={loading || !!parseError}>
          ✅ Validate
        </button>
        <button style={{ ...styles.btn, background: '#333' }} onClick={() => {
          setInput(JSON.stringify(SAMPLE, null, 2));
          setValidation(null);
        }}>Reset</button>
      </div>

      <div style={styles.grid}>
        {/* Editor */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h2 style={styles.sectionTitle}>caseState JSON</h2>
            {parseError && <span style={{ color: '#f66', fontSize: '12px' }}>⚠ Invalid JSON: {parseError}</span>}
          </div>
          <textarea
            style={{ ...styles.textarea, borderColor: parseError ? '#c44' : '#445' }}
            rows={28}
            value={input}
            onChange={(e) => { setInput(e.target.value); setValidation(null); }}
          />
        </div>

        {/* Live Preview + Validation */}
        <div>
          <h2 style={styles.sectionTitle}>Parsed Structure</h2>
          {parsed && !parseError ? (
            <div>
              <FieldGroup label="Session" fields={{ sessionId: parsed.sessionId, patientId: parsed.patientId }} />
              <FieldGroup label="Pregnancy" fields={{ trimester: parsed.trimester, gestationalWeek: parsed.gestationalWeek }} />
              <div style={styles.fieldGroup}>
                <div style={styles.fieldLabel}>Risk Factors</div>
                <div style={styles.fieldGrid}>
                  {parsed.riskFactors && Object.entries(parsed.riskFactors).map(([k, v]) => (
                    <span key={k} style={{ ...styles.tag, background: v ? '#3a0' : '#222', color: v ? '#fff' : '#888' }}>
                      {k}: {v ? 'Yes' : 'No'}
                    </span>
                  ))}
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <div style={styles.fieldLabel}>Symptoms ({parsed.symptoms?.length || 0})</div>
                <div style={styles.fieldGrid}>
                  {parsed.symptoms?.map((s) => <span key={s} style={{ ...styles.tag, background: '#335' }}>{s}</span>)}
                  {!parsed.symptoms?.length && <span style={{ color: '#888' }}>none</span>}
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <div style={styles.fieldLabel}>Danger Signs Checked ({parsed.dangerSignsChecked?.length || 0})</div>
                <div style={styles.fieldGrid}>
                  {parsed.dangerSignsChecked?.map((s) => <span key={s} style={{ ...styles.tag, background: '#533' }}>{s}</span>)}
                  {!parsed.dangerSignsChecked?.length && <span style={{ color: '#888' }}>none</span>}
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <div style={styles.fieldLabel}>Follow-up Answers</div>
                <pre style={styles.mini}>{JSON.stringify(parsed.followUpAnswers || {}, null, 2)}</pre>
              </div>
              <div style={styles.fieldGroup}>
                <div style={styles.fieldLabel}>Meta</div>
                <pre style={styles.mini}>{JSON.stringify(parsed.meta || {}, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div style={{ color: '#888' }}>Enter valid JSON to preview fields.</div>
          )}

          {/* Validation Result */}
          {loading && <div style={styles.loading}>⏳ Validating...</div>}
          {validation && (
            <div style={{ marginTop: '16px' }}>
              <h2 style={styles.sectionTitle}>Validation Result</h2>
              <div style={{
                ...styles.validBanner,
                background: validation.valid ? '#001a00' : '#1a0000',
                borderColor: validation.valid ? '#4a4' : '#c44',
                color: validation.valid ? '#4f4' : '#f66',
              }}>
                {validation.valid ? '✅ Valid caseState' : '❌ Invalid caseState'}
              </div>
              {validation.errors?.length > 0 && (
                <ul style={styles.errorList}>
                  {validation.errors.map((e, i) => (
                    <li key={i} style={styles.errorItem}>{e}</li>
                  ))}
                </ul>
              )}
              {validation.warnings?.length > 0 && (
                <div>
                  <strong style={{ color: '#fa0' }}>Warnings:</strong>
                  <ul style={styles.errorList}>
                    {validation.warnings.map((w, i) => (
                      <li key={i} style={{ ...styles.errorItem, borderColor: '#750', background: '#1a1000' }}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ label, fields }) {
  return (
    <div style={styles.fieldGroup}>
      <div style={styles.fieldLabel}>{label}</div>
      {Object.entries(fields).map(([k, v]) => (
        <div key={k} style={styles.fieldRow}>
          <span style={styles.fieldKey}>{k}</span>
          <span style={styles.fieldVal}>{String(v ?? '—')}</span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: { fontFamily: 'monospace', padding: '20px', maxWidth: '1300px', margin: '0 auto', background: '#111', color: '#eee', minHeight: '100vh' },
  title: { color: '#7cf', marginBottom: '4px' },
  subtitle: { color: '#888', marginBottom: '16px' },
  toolbar: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' },
  btn: { padding: '8px 16px', background: '#335', color: '#eee', border: '1px solid #558', borderRadius: '4px', cursor: 'pointer' },
  select: { padding: '6px', background: '#222', color: '#eee', border: '1px solid #445', borderRadius: '4px', maxWidth: '300px' },
  error: { background: '#400', border: '1px solid #c55', color: '#f88', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  loading: { color: '#aaa', marginTop: '12px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  sectionTitle: { color: '#7cf', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px' },
  textarea: { width: '100%', background: '#1a1a1a', color: '#eee', border: '1px solid #445', borderRadius: '4px', padding: '10px', fontFamily: 'monospace', fontSize: '13px', boxSizing: 'border-box' },
  fieldGroup: { background: '#1a1a2e', border: '1px solid #334', borderRadius: '4px', padding: '10px', marginBottom: '10px' },
  fieldLabel: { color: '#7cf', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' },
  fieldRow: { display: 'flex', gap: '12px', marginBottom: '3px' },
  fieldKey: { color: '#888', minWidth: '160px' },
  fieldVal: { color: '#eee' },
  fieldGrid: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  tag: { padding: '2px 8px', borderRadius: '10px', fontSize: '12px' },
  mini: { margin: 0, background: '#111', padding: '8px', borderRadius: '3px', fontSize: '12px', overflowX: 'auto' },
  validBanner: { padding: '12px', borderRadius: '6px', marginBottom: '12px', fontWeight: 'bold', border: '1px solid' },
  errorList: { listStyle: 'none', padding: 0, margin: 0 },
  errorItem: { background: '#1a0000', border: '1px solid #533', borderRadius: '3px', padding: '6px 10px', marginBottom: '4px', fontSize: '13px' },
};
