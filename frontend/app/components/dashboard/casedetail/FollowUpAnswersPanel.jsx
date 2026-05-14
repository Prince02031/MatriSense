export default function FollowUpAnswersPanel({ inputTextBn, caseState }) {
    const symptoms = caseState?.symptoms || [];
    const confirmed = caseState?.dangerSignsChecked || [];
    const followUps = caseState?.followUpAnswers || {};

    return (
        <div className="dash-card">
            <h3>💬 Symptoms & Follow-Up</h3>

            <div style={{ marginTop: '16px' }}>
                <strong>Original Input (Bangla):</strong>
                <p style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px', marginTop: '4px' }}>
                    {inputTextBn || 'N/A'}
                </p>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '16px' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <strong>Extracted Symptoms:</strong>
                    {symptoms.length > 0 ? (
                        <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                            {symptoms.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    ) : <p style={{ color: 'var(--text-muted)' }}>None</p>}
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <strong>Confirmed Danger Signs:</strong>
                    {confirmed.length > 0 ? (
                        <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                            {confirmed.map((s, i) => <li key={i} style={{ color: 'var(--accent-rose)' }}>{s}</li>)}
                        </ul>
                    ) : <p style={{ color: 'var(--text-muted)' }}>None</p>}
                </div>
            </div>

            {Object.keys(followUps).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                    <strong>Follow-Up Q&A:</strong>
                    <div style={{ marginTop: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                        {Object.entries(followUps).map(([qId, answer]) => (
                            <div key={qId} style={{ marginBottom: '8px' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{qId}</div>
                                <div><strong>Answer:</strong> {String(answer)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
