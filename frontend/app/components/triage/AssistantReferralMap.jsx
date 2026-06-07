'use client';

/**
 * AssistantReferralMap
 *
 * Renders an interactive Leaflet map and hospital option cards inside the
 * Guided Care Assistant chat bubble area when the backend returns:
 *   ui.type === "REFERRAL_OPTIONS_MAP"
 *
 * Map is loaded via dynamic CDN script injection (same pattern as LeafletMap.jsx)
 * to avoid Next.js SSR crashes.
 *
 * Safety guarantee: preference button NEVER claims final assignment.
 */

import { useEffect, useRef, useState } from 'react';

// ------------------------------------------------------------------
// Risk badge config
// ------------------------------------------------------------------
const RISK_BADGE = {
  HIGH: { label: 'জরুরি — প্রথমে হাসপাতালে যান', color: '#ef4444', bg: '#fef2f2', icon: '🚨' },
  MEDIUM: { label: 'স্বাস্থ্যকর্মী যোগাযোগ প্রয়োজন', color: '#f59e0b', bg: '#fffbeb', icon: '⚠️' },
  LOW: { label: 'রুটিন চেক-আপ বিকল্প', color: '#10b981', bg: '#f0fdf4', icon: '✅' }
};

const FACILITY_LABEL = {
  medical_college_hospital: 'মেডিকেল কলেজ হাসপাতাল',
  district_hospital: 'জেলা হাসপাতাল',
  maternal_clinic: 'মাতৃসেবা ক্লিনিক',
  private_clinic: 'প্রাইভেট ক্লিনিক',
  upazila_health_complex: 'উপজেলা স্বাস্থ্য কমপ্লেক্স'
};

// ------------------------------------------------------------------
// Leaflet CDN loader (idempotent — safe to call multiple times)
// ------------------------------------------------------------------
function useLeaflet(onReady) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.L) { setLoaded(true); return; }

    // CSS
    if (!document.getElementById('leaflet-css-ref')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-ref';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // JS
    if (!document.getElementById('leaflet-js-ref')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js-ref';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => setLoaded(true);
      document.body.appendChild(script);
    } else {
      // Script tag exists but L may not be ready — poll briefly
      const poll = setInterval(() => {
        if (window.L) { clearInterval(poll); setLoaded(true); }
      }, 100);
      return () => clearInterval(poll);
    }
  }, []);

  useEffect(() => {
    if (loaded) onReady?.();
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return loaded;
}

// ------------------------------------------------------------------
// Inner map renderer (pure DOM Leaflet)
// ------------------------------------------------------------------
function LeafletMapInner({ patientLocation, hospitals, highlightedId, onRequestPreference, preferenceState, height = '220px' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!window.L || !containerRef.current) return;
    const L = window.L;

    // Determine center
    const hasPatientCoords = patientLocation?.lat != null && patientLocation?.lng != null;
    const firstHosp = hospitals?.[0];
    const center = hasPatientCoords
      ? [patientLocation.lat, patientLocation.lng]
      : firstHosp?.lat != null
        ? [firstHosp.lat, firstHosp.lng]
        : [23.8103, 90.4125]; // Dhaka fallback

    // Init map only once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView(center, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView(center, 12);
    }

    const map = mapRef.current;

    // Listen to popup open to bind button actions dynamically
    map.off('popupopen'); // clear duplicate bindings
    map.on('popupopen', (e) => {
      const container = e.popup.getElement();
      if (!container) return;
      const btn = container.querySelector('.map-select-btn');
      if (btn) {
        btn.onclick = (event) => {
          event.preventDefault();
          const hospitalId = btn.getAttribute('data-id');
          const selectedHospital = hospitals.find(hosp => hosp.hospitalId === hospitalId);
          if (selectedHospital && onRequestPreference) {
            onRequestPreference(selectedHospital);
            map.closePopup();
          }
        };
      }
    });

    // Clear old markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    // Patient marker
    if (hasPatientCoords) {
      const patientIcon = L.divIcon({
        className: '',
        html: `<div style="background:#0d9488;color:white;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 10px rgba(0,0,0,0.35);">🤰</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
      });
      L.marker([patientLocation.lat, patientLocation.lng], { icon: patientIcon })
        .addTo(map)
        .bindPopup('<b>📍 আপনার অবস্থান</b>');
    }

    // Hospital markers
    (hospitals || []).forEach((h, idx) => {
      if (h.lat == null || h.lng == null) return;
      const isHighlighted = highlightedId === h.hospitalId;
      const emergencyColor = h.emergencyCapability ? '#dc2626' : '#0d9488';
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:${isHighlighted ? '#f59e0b' : emergencyColor};
          color:white;width:${isHighlighted ? 44 : 38}px;height:${isHighlighted ? 44 : 38}px;
          border-radius:50%;border:3px solid white;
          display:flex;align-items:center;justify-content:center;
          font-size:${isHighlighted ? 22 : 18}px;
          box-shadow:0 4px 10px rgba(0,0,0,${isHighlighted ? '0.5' : '0.35'});
          transition:all 0.2s;
          cursor:pointer;
        ">🏥</div>`,
        iconSize: [isHighlighted ? 44 : 38, isHighlighted ? 44 : 38],
        iconAnchor: [isHighlighted ? 22 : 19, isHighlighted ? 22 : 19],
        popupAnchor: [0, -22]
      });

      const serviceList = (h.maternalServices || h.services || []).slice(0, 3).join(', ') || 'সেবার তথ্য নেই';
      const dist = h.distanceKm != null ? `${h.distanceKm} কিমি` : '';

      const status = preferenceState?.[h.hospitalId];
      const isDone = status === 'done';
      const isPending = status === 'pending';
      const buttonHtml = isDone
        ? `<div style="width:100%; margin-top:8px; padding:6px; border:1px solid #bbf7d0; border-radius:4px; background:#f0fdf4; color:#059669; font-size:11px; font-weight:bold; text-align:center;">✓ পছন্দ নথিভুক্ত</div>`
        : isPending
          ? `<div style="width:100%; margin-top:8px; padding:6px; border:none; border-radius:4px; background:#e2e8f0; color:#94a3b8; font-size:11px; font-weight:bold; text-align:center;">পাঠানো হচ্ছে...</div>`
          : `<button class="map-select-btn" data-id="${h.hospitalId}" style="width:100%; margin-top:8px; padding:6px; border:none; border-radius:4px; background:#0d9488; color:white; font-size:11px; font-weight:bold; cursor:pointer; text-align:center;">🏥 পছন্দ করুন</button>`;

      const marker = L.marker([h.lat, h.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:160px;font-family:sans-serif;line-height:1.4;">
            <b style="font-size:13px;color:#1e293b;">${h.name}</b><br/>
            <span style="font-size:11px;color:#64748b;">${h.upazila || h.district || ''}</span>${dist ? `<br/><span style="font-size:11px;color:#0d9488;font-weight:600;">📍 ${dist}</span>` : ''}
            <hr style="margin:6px 0;border-color:#e2e8f0;"/>
            <span style="font-size:11px;color:#475569;">${serviceList}</span>
            ${h.emergencyCapability ? '<br/><span style="font-size:11px;color:#dc2626;font-weight:bold;">⚡ জরুরি সেবা উপলব্ধ</span>' : ''}
            ${buttonHtml}
          </div>
        `);

      markersRef.current[h.hospitalId] = marker;

      if (isHighlighted) {
        setTimeout(() => marker.openPopup(), 100);
        map.panTo([h.lat, h.lng], { animate: true });
      }
    });

    // Fit all markers if patient has no coords
    if (!hasPatientCoords && hospitals?.length > 0) {
      const validHospitals = hospitals.filter(h => h.lat != null);
      if (validHospitals.length > 1) {
        const bounds = L.latLngBounds(validHospitals.map(h => [h.lat, h.lng]));
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [patientLocation, hospitals, highlightedId, preferenceState, onRequestPreference]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: height, width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 0 }}
      aria-label="হাসপাতালের মানচিত্র"
    />
  );
}

// ------------------------------------------------------------------
// Hospital Option Card
// ------------------------------------------------------------------
function HospitalCard({ hospital, onRequestPreference, preferenceState, isHighlighted, onCardClick }) {
  const { hospitalId, name, district, upazila, facilityType, distanceKm, services,
    maternalServices, emergencyCapability, publicPhone, matchReason, suitabilityLevel } = hospital;

  const status = preferenceState[hospitalId];
  const isPending = status === 'pending';
  const isDone = status === 'done';
  const isError = status === 'error';

  const displayedServices = (maternalServices?.length > 0 ? maternalServices : services || []).slice(0, 4);

  const suitabilityColors = {
    EMERGENCY_CAPABLE: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'জরুরি সেবা উপলব্ধ' },
    MATERNAL_CARE: { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', label: 'মাতৃসেবা বিশেষায়িত' },
    ROUTINE: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', label: 'সাধারণ সেবা' }
  };
  const suit = suitabilityColors[suitabilityLevel] || suitabilityColors.ROUTINE;

  return (
    <div
      onClick={onCardClick}
      style={{
        border: isHighlighted ? '2px solid #f59e0b' : `1px solid ${suit.border}`,
        borderRadius: '12px',
        padding: '14px',
        background: isHighlighted ? '#fffbeb' : suit.bg,
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: isHighlighted ? '0 4px 16px rgba(245,158,11,0.25)' : '0 1px 4px rgba(0,0,0,0.06)'
      }}
      role="button"
      tabIndex={0}
      aria-label={`${name} হাসপাতাল কার্ড`}
      onKeyDown={(e) => e.key === 'Enter' && onCardClick?.()}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#1e293b', lineHeight: 1.3 }}>
            🏥 {name}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#64748b' }}>
            {upazila ? `${upazila}, ` : ''}{district}
          </p>
          {facilityType && (
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: suit.text, fontWeight: 600 }}>
              {FACILITY_LABEL[facilityType] || facilityType}
            </p>
          )}
        </div>
        {/* Distance badge */}
        {distanceKm != null && (
          <span style={{
            background: '#e0f2fe', color: '#0369a1', borderRadius: '20px',
            padding: '3px 10px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap'
          }}>
            📍 {distanceKm} কিমি
          </span>
        )}
      </div>

      {/* Suitability + Emergency tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
        <span style={{
          background: suit.bg, color: suit.text, border: `1px solid ${suit.border}`,
          borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: 600
        }}>
          {suit.label}
        </span>
        {emergencyCapability && (
          <span style={{
            background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
            borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: 700
          }}>
            ⚡ জরুরি সেবা
          </span>
        )}
      </div>

      {/* Services */}
      {displayedServices.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '7px' }}>
          {displayedServices.map((svc, i) => (
            <span key={i} style={{
              background: '#f1f5f9', color: '#475569',
              borderRadius: '12px', padding: '2px 7px', fontSize: '10px'
            }}>
              {svc}
            </span>
          ))}
        </div>
      )}

      {/* Match reason */}
      {matchReason && (
        <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>
          💡 {matchReason}
        </p>
      )}

      {/* Phone */}
      {publicPhone && (
        <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#0d9488', fontWeight: 600 }}>
          📞 {publicPhone}
        </p>
      )}

      {/* Action button */}
      <div style={{ marginTop: '10px' }}>
        {isDone ? (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
            padding: '8px 12px', textAlign: 'center', fontSize: '12px', color: '#059669', fontWeight: 700
          }}>
            ✓ পছন্দ নথিভুক্ত — স্বাস্থ্যকর্মী পর্যালোচনা করবেন
          </div>
        ) : isError ? (
          <button
            onClick={(e) => { e.stopPropagation(); onRequestPreference(hospital); }}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #fca5a5',
              background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ⚠️ আবার চেষ্টা করুন
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onRequestPreference(hospital); }}
            disabled={isPending}
            style={{
              width: '100%', padding: '9px', borderRadius: '8px',
              border: 'none',
              background: isPending ? '#e2e8f0' : '#0d9488',
              color: isPending ? '#94a3b8' : 'white',
              fontSize: '12px', fontWeight: 700,
              cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
            aria-label={`${name} হাসপাতাল পছন্দ করুন`}
          >
            {isPending ? (
              <>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                পাঠানো হচ্ছে...
              </>
            ) : (
              '🏥 এই হাসপাতাল পছন্দ করুন'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Main exported component
// ------------------------------------------------------------------
export default function AssistantReferralMap({ uiPayload, sessionId, onPreferenceCreated }) {
  const { riskLevel = 'MEDIUM', patientLocation, options = [], locationSource, disclaimer } = uiPayload || {};

  const [preferenceState, setPreferenceState] = useState({}); // { [hospitalId]: 'pending'|'done'|'error' }
  const [highlightedId, setHighlightedId] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const leafletLoaded = useLeaflet(() => setMapReady(true));

  const riskBadge = RISK_BADGE[riskLevel] || RISK_BADGE.MEDIUM;

  const handleRequestPreference = async (hospital) => {
    const { hospitalId, name } = hospital;

    setPreferenceState(prev => ({ ...prev, [hospitalId]: 'pending' }));

    try {
      const result = await onPreferenceCreated(hospitalId, name);
      setPreferenceState(prev => ({ ...prev, [hospitalId]: 'done' }));
    } catch (err) {
      console.error('[AssistantReferralMap] Preference error:', err);
      setPreferenceState(prev => ({ ...prev, [hospitalId]: 'error' }));
    }
  };

  const handleCardClick = (hospitalId) => {
    setHighlightedId(prev => prev === hospitalId ? null : hospitalId);
  };

  // No hospitals edge case
  if (!options || options.length === 0) {
    return (
      <div style={{
        marginTop: '12px', padding: '16px', borderRadius: '12px',
        background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', color: '#475569', fontWeight: 600, margin: '0 0 6px' }}>
          🏥 কাছাকাছি কোনো হাসপাতালের তথ্য পাওয়া যায়নি।
        </p>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
          অনুগ্রহ করে আপনার স্বাস্থ্যকর্মীকে সরাসরি যোগাযোগ করুন।
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '12px' }} role="region" aria-label="হাসপাতাল বিকল্প মানচিত্র">
      {/* CSS Keyframes injected inline */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Risk badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: riskBadge.bg, border: `1px solid ${riskBadge.color}33`,
        borderRadius: '8px', padding: '8px 12px', marginBottom: '12px'
      }} role="status" aria-live="polite">
        <span style={{ fontSize: '16px' }}>{riskBadge.icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: riskBadge.color }}>
          {riskBadge.label}
        </span>
      </div>

      {/* Leaflet Map */}
      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
        {/* Enlarge button */}
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 10,
            background: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '5px 9px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
        >
          ⛶ বড় করে দেখুন
        </button>

        {leafletLoaded && mapReady ? (
          <LeafletMapInner
            patientLocation={patientLocation}
            hospitals={options}
            highlightedId={highlightedId}
            onRequestPreference={handleRequestPreference}
            preferenceState={preferenceState}
          />
        ) : (
          <div style={{
            height: '220px', background: '#f1f5f9', display: 'flex',
            alignItems: 'center', justifyContent: 'center', borderRadius: '12px'
          }}>
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>🗺️</div>
              <p style={{ fontSize: '12px', margin: 0 }}>মানচিত্র লোড হচ্ছে...</p>
            </div>
          </div>
        )}
      </div>

      {/* Location source info */}
      {locationSource && locationSource !== 'UNKNOWN' && (
        <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0 0 10px', textAlign: 'right' }}>
          📡 অবস্থান উৎস: {locationSource === 'LIVE_GPS' ? 'লাইভ GPS' : locationSource === 'PROFILE_GPS' ? 'প্রোফাইল GPS' : 'জেলা/উপজেলা'}
        </p>
      )}

      {/* Hospital count */}
      <p style={{ fontSize: '12px', color: '#475569', fontWeight: 600, margin: '0 0 10px' }}>
        {options.length}টি হাসপাতাল বিকল্প পাওয়া গেছে
        {patientLocation?.district ? ` — ${patientLocation.district}` : ''}
      </p>

      {/* Hospital cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {options.map((hospital) => (
          <HospitalCard
            key={hospital.hospitalId}
            hospital={hospital}
            preferenceState={preferenceState}
            isHighlighted={highlightedId === hospital.hospitalId}
            onCardClick={() => handleCardClick(hospital.hospitalId)}
            onRequestPreference={handleRequestPreference}
          />
        ))}
      </div>

      {/* Safety disclaimer */}
      {disclaimer && (
        <div style={{
          marginTop: '14px', padding: '10px 12px', borderRadius: '8px',
          background: '#fffbeb', border: '1px solid #fde68a',
          fontSize: '11px', color: '#92400e', lineHeight: 1.5
        }} role="note">
          ⚠️ {disclaimer}
        </div>
      )}

      {/* Fullscreen Map Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
        onClick={() => setIsModalOpen(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '90vw',
            maxWidth: '800px',
            height: '80vh',
            maxHeight: '600px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                  🏥 কাছাকাছি হাসপাতালের বিস্তারিত মানচিত্র
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                  মানচিত্রের মার্কারগুলোতে ক্লিক করে সরাসরি হাসপাতাল পছন্দ করতে পারেন
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Map Container) */}
            <div style={{ flex: 1, padding: '16px', position: 'relative' }}>
              {leafletLoaded && mapReady ? (
                <LeafletMapInner
                  patientLocation={patientLocation}
                  hospitals={options}
                  highlightedId={highlightedId}
                  onRequestPreference={handleRequestPreference}
                  preferenceState={preferenceState}
                  height="100%"
                />
              ) : (
                <div style={{
                  height: '100%', background: '#f1f5f9', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', borderRadius: '12px'
                }}>
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>🗺️</div>
                    <p style={{ fontSize: '12px', margin: 0 }}>মানচিত্র লোড হচ্ছে...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              background: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  background: '#64748b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
