export default function HealthWorkerSummaryCard({ safeOutput }) {
    if (!safeOutput) {
        return (
            <div className="dash-card" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 168, 0.05), transparent)' }}>
                <h3>📋 Health Worker Summary</h3>
                <p style={{ color: 'var(--text-muted)' }}>No summary generated yet.</p>
            </div>
        );
    }

    return (
        <div className="dash-card" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 168, 0.05), transparent)' }}>
            <h3>📋 Health Worker Summary</h3>

            {(safeOutput.workerSummaryEn || safeOutput.healthWorkerSummaryBn) && (
                <div style={{ marginTop: '16px' }}>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Clinical Summary</h4>
                    <p style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
                        {safeOutput.healthWorkerSummaryBn || safeOutput.workerSummaryEn}
                    </p>
                </div>
            )}

            {safeOutput.motherExplanationBn && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Guidance Provided to Mother</h4>
                    <p style={{ lineHeight: '1.6', fontSize: '0.95rem', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        {safeOutput.motherExplanationBn}
                    </p>
                </div>
            )}
        </div>
    );
}
