'use client';

import { useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const SEVERITY_COLOR = {
    NORMAL: 'var(--accent-emerald)',
    WARNING: 'var(--accent-amber)',
    CRITICAL: 'var(--accent-rose)',
};

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

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 26, left: 44 };

// Rounds a [min, max] value range to a clean set of axis ticks.
function niceTicks(min, max, count = 4) {
    if (min === max) {
        min -= 1;
        max += 1;
    }
    const rawStep = (max - min) / count;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;
    let step;
    if (residual > 5) step = 10 * magnitude;
    else if (residual > 2) step = 5 * magnitude;
    else if (residual > 1) step = 2 * magnitude;
    else step = magnitude;

    const niceMin = Math.floor(min / step) * step;
    const niceMax = Math.ceil(max / step) * step;
    const ticks = [];
    for (let t = niceMin; t <= niceMax + 1e-9; t += step) {
        ticks.push(Math.round(t * 1000) / 1000);
    }
    return { ticks, min: niceMin, max: niceMax };
}

/**
 * Modal showing one clinical parameter's full history: an SVG trend line
 * (dots colored by severity status, per the app's existing badge palette)
 * plus the full record list underneath as an always-available table view.
 */
export default function ClinicalParameterDetail({ group, onClose }) {
    const { t, language } = useLanguage();
    const ct = t.clinicalDataPage || {};
    const SEVERITY_LABEL = { NORMAL: ct.normal, WARNING: ct.warning, CRITICAL: ct.critical };
    const SOURCE_LABEL = { DOCUMENT_UPLOAD: ct.sourceDocument, CHAT_SCAN: ct.sourceChatScan };

    const [hoverIdx, setHoverIdx] = useState(null);
    const svgRef = useRef(null);

    const chronological = useMemo(
        () => [...group.history].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)),
        [group.history]
    );
    const numericPoints = useMemo(
        () => chronological.filter((dp) => dp.value != null),
        [chronological]
    );
    const hasChart = numericPoints.length >= 2;

    const chart = useMemo(() => {
        if (!hasChart) return null;

        const times = numericPoints.map((dp) => new Date(dp.recordedAt).getTime());
        const values = numericPoints.map((dp) => dp.value);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const { ticks, min: yMin, max: yMax } = niceTicks(Math.min(...values), Math.max(...values));

        const plotW = CHART_WIDTH - PAD.left - PAD.right;
        const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

        const xScale = (t) => (maxTime === minTime ? PAD.left + plotW / 2 : PAD.left + ((t - minTime) / (maxTime - minTime)) * plotW);
        const yScale = (v) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

        const points = numericPoints.map((dp) => ({
            dp,
            x: xScale(new Date(dp.recordedAt).getTime()),
            y: yScale(dp.value),
        }));

        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        return { ticks, yScale, points, linePath };
    }, [numericPoints, hasChart]);

    const handleMove = (e) => {
        if (!chart || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (CHART_WIDTH / rect.width);
        let nearest = 0;
        let bestDist = Infinity;
        chart.points.forEach((p, i) => {
            const d = Math.abs(p.x - mouseX);
            if (d < bestDist) {
                bestDist = d;
                nearest = i;
            }
        });
        setHoverIdx(nearest);
    };

    const hovered = chart && hoverIdx != null ? chart.points[hoverIdx] : null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="dash-card"
                style={{ width: '100%', maxWidth: '680px', maxHeight: '86vh', overflowY: 'auto', padding: '24px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>
                            {language === 'bn' && group.displayNameBn ? group.displayNameBn : group.displayName}
                        </h3>
                        {language === 'bn' && group.displayNameBn && group.displayName && (
                            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{group.displayName}</p>
                        )}
                        {language !== 'bn' && group.displayNameBn && (
                            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{group.displayNameBn}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)' }}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span className="badge badge-success">✅ {ct.normal || 'Normal'}</span>
                    <span className="badge badge-warning">⚠️ {ct.warning || 'Warning'}</span>
                    <span className="badge badge-danger">🚨 {ct.critical || 'Critical'}</span>
                </div>

                {hasChart ? (
                    <div style={{ marginTop: '8px' }}>
                        <svg
                            ref={svgRef}
                            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                            onMouseMove={handleMove}
                            onMouseLeave={() => setHoverIdx(null)}
                        >
                            {chart.ticks.map((t) => {
                                const y = chart.yScale(t);
                                return (
                                    <g key={t}>
                                        <line x1={PAD.left} x2={CHART_WIDTH - PAD.right} y1={y} y2={y} stroke="var(--border-subtle)" strokeWidth="1" />
                                        <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
                                            {t}
                                        </text>
                                    </g>
                                );
                            })}

                            <path d={chart.linePath} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                            {hovered && (
                                <line
                                    x1={hovered.x}
                                    x2={hovered.x}
                                    y1={PAD.top}
                                    y2={CHART_HEIGHT - PAD.bottom}
                                    stroke="var(--text-muted)"
                                    strokeWidth="1"
                                    strokeDasharray="3,3"
                                />
                            )}

                            {chart.points.map((p, i) => (
                                <circle
                                    key={i}
                                    cx={p.x}
                                    cy={p.y}
                                    r={hoverIdx === i ? 6 : 5}
                                    fill={SEVERITY_COLOR[p.dp.severity] || 'var(--accent-teal)'}
                                    stroke="var(--bg-card)"
                                    strokeWidth="2"
                                    style={{ cursor: 'pointer' }}
                                />
                            ))}

                            <text x={PAD.left} y={CHART_HEIGHT - 6} fontSize="11" fill="var(--text-muted)" textAnchor="start">
                                {new Date(numericPoints[0].recordedAt).toLocaleDateString()}
                            </text>
                            <text x={CHART_WIDTH - PAD.right} y={CHART_HEIGHT - 6} fontSize="11" fill="var(--text-muted)" textAnchor="end">
                                {new Date(numericPoints[numericPoints.length - 1].recordedAt).toLocaleDateString()}
                            </text>
                        </svg>

                        <div
                            style={{
                                marginTop: '8px',
                                padding: '8px 12px',
                                background: 'var(--bg-glass)',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '8px',
                                visibility: hovered ? 'visible' : 'hidden',
                            }}
                        >
                            <span style={{ color: 'var(--text-muted)' }}>{hovered ? new Date(hovered.dp.recordedAt).toLocaleDateString() : '—'}</span>
                            <strong>{hovered ? `${hovered.dp.value} ${hovered.dp.unit || ''}` : '—'}</strong>
                            <span className={`badge ${hovered ? SEVERITY_BADGE[hovered.dp.severity] : ''}`}>
                                {hovered ? `${SEVERITY_ICON[hovered.dp.severity] || ''} ${SEVERITY_LABEL[hovered.dp.severity] || hovered.dp.severity || ''}` : ''}
                            </span>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                        {ct.notEnoughData || 'Not enough numeric readings yet to plot a trend.'}
                    </p>
                )}

                <h4 style={{ marginTop: '20px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {ct.fullHistory || 'Full history'} ({group.history.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.history.map((dp) => (
                        <div
                            key={dp._id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '8px',
                                padding: '10px 14px',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                    {new Date(dp.recordedAt).toLocaleDateString()}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    {SOURCE_LABEL[dp.source] || dp.source}
                                    {dp.sourceDocumentId?.originalName ? ` · ${dp.sourceDocumentId.originalName}` : ''}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {dp.value != null && (
                                    <strong>
                                        {dp.value} <span style={{ fontWeight: 400, fontSize: '0.8rem' }}>{dp.unit}</span>
                                    </strong>
                                )}
                                {dp.severity && (
                                    <span className={`badge ${SEVERITY_BADGE[dp.severity]}`}>
                                        {SEVERITY_ICON[dp.severity]} {SEVERITY_LABEL[dp.severity] || dp.severity}
                                    </span>
                                )}
                                <span className={`badge ${dp.confirmedByPatient ? 'badge-success' : 'badge-warning'}`}>
                                    {dp.confirmedByPatient ? '✓' : '⏳'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
