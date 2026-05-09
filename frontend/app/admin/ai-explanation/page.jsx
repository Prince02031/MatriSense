'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const SCENARIOS = [
  { id: 'HIGH_RISK', label: 'High Risk (Severe Abdominal Pain)', color: '#c44' },
  { id: 'MEDIUM_RISK', label: 'Medium Risk (Fever + Headache)', color: '#c84' },
  { id: 'LOW_RISK', label: 'Low Risk (Feeling Tired)', color: '#4a4' },
];

export default function AIExplanationTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runTest = async (scenarioId) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/admin/ai-explanation/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>MatriSense</h1>
          <span style={styles.headerTagline}>Clinical Assistant Triage Lab</span>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.sidebar}>
          <h2 style={styles.sidebarTitle}>Test Scenarios</h2>
          <p style={styles.sidebarDesc}>Select a fixed scenario to test the LLM explanation pipeline.</p>
          <div style={styles.scenarioList}>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                style={{ ...styles.scenarioBtn, borderLeftColor: s.color }}
                onClick={() => runTest(s.id)}
                disabled={loading}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.chatArea}>
          {!result && !loading && !error && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>💬</div>
              <h3>Ready to Triage</h3>
              <p>Select a scenario on the left to see the AI assistant in action.</p>
            </div>
          )}

          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Assistant is thinking...</p>
            </div>
          )}

          {error && <div style={styles.errorBanner}>Error: {error}</div>}

          {result && (
            <div style={styles.chatWindow}>
              {/* Internal Pipeline Debug (Collapsed) */}
              <details style={styles.debugDetails}>
                <summary style={styles.debugSummary}>🔍 Pipeline Debug Info</summary>
                <div style={styles.debugContent}>
                  <p><strong>Risk Level:</strong> <span style={{ color: result.decision.riskLevel === 'HIGH' ? '#c44' : '#4a4' }}>{result.decision.riskLevel}</span></p>
                  <p><strong>Provider:</strong> {result.aiResult.provider} ({result.aiResult.model})</p>
                  <p><strong>Matched Rules:</strong> {result.decision.reasons.join(', ')}</p>
                  <p><strong>Safety Validation:</strong> {result.aiResult.safetyValidation.valid ? '✅ Valid' : '❌ Failed'}</p>
                  {result.aiResult.safetyValidation.issues.length > 0 && (
                    <ul style={styles.issueList}>
                      {result.aiResult.safetyValidation.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>

              {/* Chat Interaction */}
              <div style={styles.messageRow}>
                <div style={styles.avatar}>AI</div>
                <div style={styles.messageBubble}>
                  <p style={styles.bubbleText}>{result.aiResult.safeOutput.motherExplanationBn}</p>
                </div>
              </div>

              <div style={styles.actionCard}>
                <h3 style={styles.cardTitle}>আপনার জন্য পরামর্শ (Recommendations)</h3>
                <div style={styles.cardSection}>
                  <h4 style={styles.cardSubTitle}>অবিলম্বে করণীয় (Immediate Steps)</h4>
                  <ul style={styles.cardList}>
                    {result.aiResult.safeOutput.stepsNowBn.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                {result.aiResult.safeOutput.monitorBn.length > 0 && (
                  <div style={styles.cardSection}>
                    <h4 style={styles.cardSubTitle}>নজরে রাখুন (Monitoring)</h4>
                    <ul style={styles.cardList}>
                      {result.aiResult.safeOutput.monitorBn.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ ...styles.cardSection, borderBottom: 'none' }}>
                  <h4 style={{ ...styles.cardSubTitle, color: '#c44' }}>সতর্ক সংকেত (Urgent Warnings)</h4>
                  <ul style={styles.cardList}>
                    {result.aiResult.safeOutput.urgentWarningBn.map((s, i) => (
                      <li key={i} style={{ color: '#c44', fontWeight: 'bold' }}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div style={styles.disclaimer}>
                  {result.aiResult.safeOutput.safetyDisclaimerBn}
                </div>
              </div>
              
              {/* Health Worker Summary */}
              <div style={styles.workerSummary}>
                <span style={styles.workerTag}>Health Worker Summary</span>
                <p>{result.aiResult.safeOutput.healthWorkerSummaryBn}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    background: '#f0f4f7',
    minHeight: '100vh',
    color: '#212b32',
  },
  header: {
    background: '#005eb8',
    color: '#fff',
    padding: '16px 24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  headerTagline: {
    fontSize: '14px',
    opacity: 0.8,
  },
  main: {
    maxWidth: '1200px',
    margin: '32px auto',
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '32px',
    padding: '0 24px',
  },
  sidebar: {
    background: '#fff',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    height: 'fit-content',
  },
  sidebarTitle: {
    fontSize: '18px',
    marginBottom: '8px',
  },
  sidebarDesc: {
    fontSize: '14px',
    color: '#425563',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  scenarioList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  scenarioBtn: {
    padding: '12px 16px',
    background: '#fff',
    border: '1px solid #d8dde0',
    borderLeftWidth: '6px',
    borderRadius: '4px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    ':hover': {
      background: '#f8f9fa',
    },
  },
  chatArea: {
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#768692',
    textAlign: 'center',
    padding: '40px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e8f1f8',
    borderTopColor: '#005eb8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  chatWindow: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  messageRow: {
    display: 'flex',
    gap: '16px',
    maxWidth: '80%',
  },
  avatar: {
    width: '40px',
    height: '40px',
    background: '#005eb8',
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  messageBubble: {
    background: '#e8f1f8',
    padding: '16px',
    borderRadius: '0 12px 12px 12px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  bubbleText: {
    margin: 0,
    lineHeight: '1.6',
    fontSize: '16px',
  },
  actionCard: {
    border: '2px solid #005eb8',
    borderRadius: '8px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  cardTitle: {
    background: '#005eb8',
    color: '#fff',
    margin: 0,
    padding: '12px 16px',
    fontSize: '18px',
  },
  cardSection: {
    padding: '16px',
    borderBottom: '1px solid #d8dde0',
  },
  cardSubTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#425563',
  },
  cardList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '16px',
    lineHeight: '1.6',
  },
  disclaimer: {
    background: '#f0f4f7',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#425563',
    fontStyle: 'italic',
  },
  workerSummary: {
    background: '#fff9e6',
    border: '1px solid #ffeeba',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '16px',
  },
  workerTag: {
    display: 'inline-block',
    background: '#856404',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '4px',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  debugDetails: {
    background: '#f8f9fa',
    border: '1px solid #d8dde0',
    borderRadius: '4px',
    padding: '8px 12px',
    marginBottom: '16px',
  },
  debugSummary: {
    fontSize: '13px',
    color: '#768692',
    cursor: 'pointer',
    fontWeight: '500',
  },
  debugContent: {
    marginTop: '12px',
    fontSize: '13px',
    borderTop: '1px solid #e8edee',
    paddingTop: '12px',
  },
  issueList: {
    color: '#c44',
    marginTop: '8px',
  },
  errorBanner: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '12px 16px',
    borderRadius: '4px',
    margin: '16px',
    border: '1px solid #f5c6cb',
  }
};
