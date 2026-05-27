export default function HealthWorkerSummaryCard({ safeOutput, profileSnapshot }) {
    if (!safeOutput) {
        return (
            <div className="dash-card" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 168, 0.05), transparent)' }}>
                <h3>📋 Health Worker Summary</h3>
                <p style={{ color: 'var(--text-muted)' }}>No summary generated yet.</p>
            </div>
        );
    }

    // Extract location from profileSnapshot (if GPS was captured) or show N/A
    const division = profileSnapshot?.division || 'N/A';
    const district = profileSnapshot?.district || 'N/A';
    const upazila = profileSnapshot?.upazilaOrThana || 'N/A';
    const address = profileSnapshot?.addressOrVillage || 'N/A';
    const latitude = profileSnapshot?.latitude;
    const longitude = profileSnapshot?.longitude;

    return (
        <div className="dash-card" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 168, 0.05), transparent)' }}>
            <h3>📋 Health Worker Summary</h3>

            {/* Location Information from Profile Snapshot */}
            {profileSnapshot && (
                <div style={{ marginTop: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>📍 Patient Location (at triage)</h4>
                    <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                        <div><strong>Division:</strong> {division}</div>
                        <div><strong>District:</strong> {district}</div>
                        <div><strong>Upazila/Thana:</strong> {upazila}</div>
                        <div><strong>Address/Village:</strong> <span style={{ wordBreak: 'break-word' }}>{address}</span></div>
                        {(latitude && longitude) && (
                            <div style={{ marginTop: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                📌 GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                            </div>
                        )}
                    </div>
                </div>
            )}

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
