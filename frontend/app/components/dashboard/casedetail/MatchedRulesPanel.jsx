export default function MatchedRulesPanel({ decision }) {
    if (!decision || !decision.matchedRules || decision.matchedRules.length === 0) {
        return (
            <div className="dash-card">
                <h3>⚖️ Matched Rules</h3>
                <p style={{ color: 'var(--text-muted)' }}>No high/medium risk rules matched.</p>
            </div>
        );
    }

    return (
        <div className="dash-card">
            <h3>⚖️ Matched Rules</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {decision.matchedRules.map((rule, idx) => (
                    <li key={idx}>
                        <strong>{rule}</strong>
                        {decision.reasons && decision.reasons[idx] && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Reason: {decision.reasons[idx]}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
