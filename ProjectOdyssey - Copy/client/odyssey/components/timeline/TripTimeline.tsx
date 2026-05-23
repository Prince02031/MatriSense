'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Award, Star, Calendar } from 'lucide-react';
import TripMemoryModal from './TripMemoryModal';

interface Trip {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  isCompleted: boolean;
  image: string | null;
  memory: any;
  selectedPlaces: any[];
  visitedPlaces: { name: string; id: string; status: string }[];
  itineraryData: any;
}

interface TimelineData {
  pastTrips: Trip[];
  upcomingTrips: Trip[];
  stats: {
    totalTrips: number;
    completedTrips: number;
    upcomingTrips: number;
  };
}

// ─── Individual trip pill / expanded card ─────────────────────────────────
const TripPill: React.FC<{
  trip: Trip;
  isAbove: boolean;
  isCompleted: boolean;
  onClick: () => void;
  index: number;
}> = ({ trip, isAbove, isCompleted, onClick, index }) => {
  const [hovered, setHovered] = useState(false);

  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getPlaces = () => {
    if (Array.isArray(trip.visitedPlaces) && trip.visitedPlaces.length > 0)
      return trip.visitedPlaces.slice(0, 3).map(p => p.name).filter(Boolean).join(', ');
    if (Array.isArray(trip.selectedPlaces) && trip.selectedPlaces.length > 0)
      return trip.selectedPlaces.slice(0, 3).map((p: any) => p.name || p.title).filter(Boolean).join(', ');
    return 'No places recorded';
  };

  const visitedCount = trip.visitedPlaces?.length ?? 0;
  const plannedCount = trip.selectedPlaces?.length ?? 0;
  const pct = plannedCount > 0 ? Math.round((visitedCount / plannedCount) * 100) : 0;

  const accentAmber = isCompleted;

  return (
    /* Wrapper: flex column, card on top (isAbove) or bottom, dot+stem in middle */
    <div
      className="flex flex-col items-center"
      style={{
        width: hovered ? 240 : 140,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        animationDelay: `${index * 0.1}s`,
      }}
    >
      {/* ── TOP HALF: card if isAbove, stem+dot if below ── */}
      {isAbove ? (
        /* Card sits in top half */
        <div
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="cursor-pointer rounded-2xl overflow-hidden mb-0 timeline-card"
          style={{
            width: '100%',
            border: `1px solid ${accentAmber ? 'rgba(251,191,36,0.4)' : 'rgba(59,130,246,0.4)'}`,
            background: accentAmber
              ? 'linear-gradient(135deg,rgba(251,191,36,0.18) 0%,rgba(249,115,22,0.12) 60%,rgba(244,63,94,0.08) 100%)'
              : 'linear-gradient(135deg,rgba(59,130,246,0.18) 0%,rgba(34,211,238,0.12) 60%,rgba(168,85,247,0.08) 100%)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: hovered
              ? `0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px ${accentAmber ? 'rgba(251,191,36,0.5)' : 'rgba(59,130,246,0.5)'}`
              : '0 8px 20px rgba(0,0,0,0.3)',
            transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0,
          }}
        >
          <CardContent
            trip={trip}
            hovered={hovered}
            isCompleted={isCompleted}
            fmt={fmt}
            getPlaces={getPlaces}
            visitedCount={visitedCount}
            plannedCount={plannedCount}
            pct={pct}
          />
        </div>
      ) : (
        /* Dot + connector in bottom, pushed to top */
        <div className="flex flex-col items-center" style={{ height: 140, justifyContent: 'flex-end' }}>
          <DotAndStem isAbove={false} accentAmber={accentAmber} />
        </div>
      )}

      {/* ── SEPARATOR: the timeline line cuts through here ── */}
      {/* This is just spacing so the line appears between top & bottom */}

      {/* ── BOTTOM HALF: stem+dot if above, card if below ── */}
      {isAbove ? (
        <div className="flex flex-col items-center" style={{ height: 140, justifyContent: 'flex-start' }}>
          <DotAndStem isAbove={true} accentAmber={accentAmber} />
        </div>
      ) : (
        <div
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="cursor-pointer rounded-2xl overflow-hidden mt-0 timeline-card"
          style={{
            width: '100%',
            border: `1px solid ${accentAmber ? 'rgba(251,191,36,0.4)' : 'rgba(59,130,246,0.4)'}`,
            background: accentAmber
              ? 'linear-gradient(135deg,rgba(251,191,36,0.18) 0%,rgba(249,115,22,0.12) 60%,rgba(244,63,94,0.08) 100%)'
              : 'linear-gradient(135deg,rgba(59,130,246,0.18) 0%,rgba(34,211,238,0.12) 60%,rgba(168,85,247,0.08) 100%)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: hovered
              ? `0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px ${accentAmber ? 'rgba(251,191,36,0.5)' : 'rgba(59,130,246,0.5)'}`
              : '0 8px 20px rgba(0,0,0,0.3)',
            transform: hovered ? 'translateY(4px)' : 'translateY(0)',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <CardContent
            trip={trip}
            hovered={hovered}
            isCompleted={isCompleted}
            fmt={fmt}
            getPlaces={getPlaces}
            visitedCount={visitedCount}
            plannedCount={plannedCount}
            pct={pct}
          />
        </div>
      )}
    </div>
  );
};

// ─── Dot + vertical connector stem ───────────────────────────────────────
const DotAndStem: React.FC<{ isAbove: boolean; accentAmber: boolean }> = ({ isAbove, accentAmber }) => (
  <div className="flex flex-col items-center" style={{ height: '100%' }}>
    {isAbove ? (
      <>
        {/* stem going down from card to line */}
        <div
          style={{
            width: 2,
            flex: 1,
            background: accentAmber
              ? 'linear-gradient(180deg,rgba(251,191,36,0.6),rgba(251,191,36,0.15))'
              : 'linear-gradient(180deg,rgba(59,130,246,0.6),rgba(59,130,246,0.15))',
            borderRadius: 99,
          }}
        />
        {/* dot sitting on the line */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: accentAmber ? '#fbbf24' : '#38bdf8',
            border: '2.5px solid rgba(255,255,255,0.85)',
            boxShadow: `0 0 12px 4px ${accentAmber ? 'rgba(251,191,36,0.55)' : 'rgba(56,189,248,0.55)'}`,
            flexShrink: 0,
            marginBottom: -8, // overlap the timeline bar
          }}
        />
      </>
    ) : (
      <>
        {/* dot sitting on the line */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: accentAmber ? '#fbbf24' : '#38bdf8',
            border: '2.5px solid rgba(255,255,255,0.85)',
            boxShadow: `0 0 12px 4px ${accentAmber ? 'rgba(251,191,36,0.55)' : 'rgba(56,189,248,0.55)'}`,
            flexShrink: 0,
            marginTop: -8, // overlap the timeline bar
          }}
        />
        {/* stem going up from line to card */}
        <div
          style={{
            width: 2,
            flex: 1,
            background: accentAmber
              ? 'linear-gradient(180deg,rgba(251,191,36,0.15),rgba(251,191,36,0.6))'
              : 'linear-gradient(180deg,rgba(59,130,246,0.15),rgba(59,130,246,0.6))',
            borderRadius: 99,
          }}
        />
      </>
    )}
  </div>
);

// ─── Card body content ────────────────────────────────────────────────────
const CardContent: React.FC<{
  trip: Trip;
  hovered: boolean;
  isCompleted: boolean;
  fmt: (d: Date) => string;
  getPlaces: () => string;
  visitedCount: number;
  plannedCount: number;
  pct: number;
}> = ({ trip, hovered, isCompleted, fmt, getPlaces, visitedCount, plannedCount, pct }) => {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const accent = isCompleted;

  return (
    <>
      {/* Image – shown when hovered */}
      {hovered && (() => {
        // Resolve best available photo: trip hero → first place image → unsplash by place name → gradient
        const placePhoto =
          trip.image ||
          (Array.isArray(trip.selectedPlaces) && trip.selectedPlaces.length > 0
            ? (trip.selectedPlaces[0]?.images?.[0] ||
              trip.selectedPlaces[0]?.image ||
              trip.selectedPlaces[0]?.photoUrl ||
              trip.selectedPlaces[0]?.photo_url)
            : null) ||
          null;

        const firstPlaceName =
          (Array.isArray(trip.visitedPlaces) && trip.visitedPlaces[0]?.name) ||
          (Array.isArray(trip.selectedPlaces) && (trip.selectedPlaces[0]?.name || trip.selectedPlaces[0]?.title)) ||
          trip.name;

        const imgSrc = placePhoto || `https://source.unsplash.com/400x200/?${encodeURIComponent(firstPlaceName)},travel`;

        return (
          <div style={{ position: 'relative', height: 90, overflow: 'hidden' }}>
            <img
              src={imgSrc}
              alt={firstPlaceName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '4px 8px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
              color: 'rgba(255,255,255,0.9)',
              fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              📍 {firstPlaceName}
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.4))' }} />
          </div>
        );
      })()}

      <div style={{ padding: '10px 12px 12px' }}>
        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '2px 7px', borderRadius: 99,
            background: accent ? 'rgba(251,191,36,0.2)' : 'rgba(59,130,246,0.2)',
            color: accent ? '#fde68a' : '#93c5fd',
          }}>
            {isCompleted ? '✓ Done' : '🔮 Upcoming'}
          </span>
          {trip.memory?.badges_earned?.length > 0 && <span style={{ fontSize: 12 }}>🏆</span>}
        </div>

        {/* Trip name */}
        <p style={{
          fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 4,
          fontSize: hovered ? 13 : 11,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {trip.name}
        </p>

        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.55)', fontSize: 10, marginBottom: 2 }}>
          <Calendar style={{ width: 10, height: 10 }} />
          <span>{fmt(startDate)}</span>
          {startDate.getTime() !== endDate.getTime() && <><span>→</span><span>{fmt(endDate)}</span></>}
        </div>

        {/* ── Expanded content ── */}
        {hovered && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.12)', animation: 'fadeInUp 0.2s ease-out' }}>
            {/* Places */}
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, fontWeight: 600 }}>Places</p>
            <p style={{
              color: 'rgba(255,255,255,0.75)', fontSize: 11, lineHeight: 1.4, marginBottom: 6,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
            }}>
              {getPlaces()}
            </p>

            {/* Progress bar */}
            {visitedCount > 0 && plannedCount > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>Visited</span>
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9 }}>{visitedCount}/{plannedCount}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`, borderRadius: 99,
                    background: accent ? 'linear-gradient(90deg,#fbbf24,#f97316)' : 'linear-gradient(90deg,#38bdf8,#818cf8)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )}

            {/* Rating */}
            {trip.memory?.trip_rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Star style={{ width: 11, height: 11, fill: '#fbbf24', color: '#fbbf24' }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600 }}>{trip.memory.trip_rating}/5</span>
                {trip.memory.mood && <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>· {trip.memory.mood}</span>}
              </div>
            )}

            {/* Highlight */}
            {trip.memory?.favorite_moment && (
              <p style={{
                color: 'rgba(255,255,255,0.6)', fontSize: 10, fontStyle: 'italic', lineHeight: 1.4, marginBottom: 6,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
              }}>
                "{trip.memory.favorite_moment}"
              </p>
            )}

            {!trip.memory && (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontStyle: 'italic' }}>No memories yet – click to add!</p>
            )}

            <div style={{
              marginTop: 6, textAlign: 'center', fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: accent ? '#fbbf24' : '#38bdf8',
            }}>
              Click to open →
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Main TripTimeline ─────────────────────────────────────────────────────
const TripTimeline: React.FC = () => {
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  useEffect(() => {
    fetchTimeline();
    const interval = setInterval(fetchTimeline, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTimeline = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) { setError('No authentication token found'); setLoading(false); return; }

      const res = await fetch('http://localhost:4000/api/trips/timeline', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setTimeline(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTripClick = (trip: Trip) => { setSelectedTrip(trip); setShowMemoryModal(true); };
  const handleMemoryUpdate = () => { fetchTimeline(); setShowMemoryModal(false); };

  // Merge & sort all trips chronologically
  const allTrips = [
    ...(timeline?.pastTrips ?? []).map(t => ({ ...t, completed: true })),
    ...(timeline?.upcomingTrips ?? []).map(t => ({ ...t, completed: false })),
  ].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#f59e0b', margin: '0 auto 16px' }} />
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading your timeline…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: 32, textAlign: 'center' }}>
        <p style={{ color: '#b91c1c', fontSize: 14, marginBottom: 16 }}>{error}</p>
        <button onClick={fetchTimeline} style={{ background: '#ef4444', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer' }}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>📅</span>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>Your Journey Timeline</h2>
        </div>
        <p style={{ color: '#6b7280', margin: 0 }}>Celebrate your completed trips and plan your next adventure</p>
      </div>

      {/* Stats */}
      {timeline && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'Trips Completed', value: timeline.stats.completedTrips, color: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fff7ed)', border: '#fde68a' },
            { label: 'Upcoming Adventures', value: timeline.stats.upcomingTrips, color: '#2563eb', bg: 'linear-gradient(135deg,#eff6ff,#ecfeff)', border: '#bfdbfe' },
            { label: 'Total Journeys', value: timeline.stats.totalTrips, color: '#7c3aed', bg: 'linear-gradient(135deg,#faf5ff,#fdf2f8)', border: '#e9d5ff' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline panel */}
      {allTrips.length > 0 ? (
        <div
          style={{
            position: 'relative',
            borderRadius: 24,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            marginBottom: 8,
          }}
        >
          {/* Star speckles */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none',
            backgroundImage: `radial-gradient(1px 1px at 8% 15%,#fff,transparent),
              radial-gradient(1px 1px at 25% 65%,#fff,transparent),
              radial-gradient(1.5px 1.5px at 50% 12%,#fff,transparent),
              radial-gradient(1px 1px at 72% 42%,#fff,transparent),
              radial-gradient(1.5px 1.5px at 88% 78%,#fff,transparent),
              radial-gradient(1px 1px at 18% 88%,#fff,transparent),
              radial-gradient(1px 1px at 62% 72%,#fff,transparent),
              radial-gradient(1px 1px at 40% 50%,#fff,transparent)`,
          }} />

          {/* Scrollable content */}
          <div style={{ overflowX: 'auto', padding: '0 40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 16,
              position: 'relative',
              minWidth: allTrips.length * 180,
              /* top-half = cards above, middle = timeline line, bottom-half = cards below */
            }}>

              {/* Timeline center line — sits exactly in the middle */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                height: 3,
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12) 4%,rgba(255,255,255,0.45) 15%,rgba(255,255,255,0.45) 85%,rgba(255,255,255,0.12) 96%,transparent)',
                borderRadius: 99,
                zIndex: 1,
                pointerEvents: 'none',
              }} />

              {allTrips.map((trip, index) => (
                <div
                  key={trip.id}
                  style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 2,
                    paddingTop: 24,
                    paddingBottom: 24,
                  }}
                >
                  <TripPill
                    trip={trip}
                    isAbove={index % 2 === 0}
                    isCompleted={trip.completed}
                    onClick={() => handleTripClick(trip)}
                    index={index}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32,
            padding: '12px 0 18px',
            color: 'rgba(255,255,255,0.45)', fontSize: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.7)' }} />
              Completed trip
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px rgba(56,189,248,0.7)' }} />
              Upcoming trip
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award style={{ width: 12, height: 12 }} />
              Hover to expand · Click to open
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '64px 0',
          background: 'linear-gradient(180deg,#fffbeb,#fff7ed)',
          borderRadius: 16, border: '2px dashed #fcd34d',
        }}>
          <MapPin style={{ width: 56, height: 56, color: '#fbbf24', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Your timeline awaits adventure!</p>
          <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, margin: '0 auto' }}>
            Start planning a trip to populate your timeline. Each completed journey becomes part of your story.
          </p>
        </div>
      )}

      {/* Memory Modal */}
      {selectedTrip && (
        <TripMemoryModal
          isOpen={showMemoryModal}
          onClose={() => setShowMemoryModal(false)}
          trip={selectedTrip}
          onUpdate={handleMemoryUpdate}
        />
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .timeline-card { animation: fadeInUp 0.4s ease-out both; }
      `}</style>
    </div>
  );
};

export default TripTimeline;
