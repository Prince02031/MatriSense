'use client';

const SEVERITY_BADGE = {
    NORMAL: 'badge-success',
    WARNING: 'badge-warning',
    CRITICAL: 'badge-danger',
};

const SEVERITY_ICON = {
    NORMAL: '✅',
    WARNING: '⚠️',
    CRITICAL: '🚨',
};

/**
 * Shared presentational list of AI-extracted document values with
 * color-coded severity badges. Used by both the upload flow
 * (MedicalDocumentUpload.jsx) and the Uploaded Documents page.
 */
export default function ExtractedValuesList({ values }) {
    if (!values || values.length === 0) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {values.map((v) => (
                <div
                    key={v.parameter}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                    }}
                >
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                            {v.displayName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {v.displayNameBn}{v.confidence != null ? ` · confidence ${Math.round(v.confidence * 100)}%` : ''}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>
                            {v.value} <span style={{ fontWeight: 400, fontSize: '0.8rem' }}>{v.unit}</span>
                        </div>
                        <span className={`badge ${SEVERITY_BADGE[v.severity]}`}>
                            {SEVERITY_ICON[v.severity]} {v.severity}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
