'use client';

import { useEffect, useRef, useState } from 'react';

export default function LeafletMap({ patientLat, patientLng, patientName, hospitals }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [leafletLoaded, setLeafletLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (window.L) {
            setLeafletLoaded(true);
            return;
        }

        // Add Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);

        // Add Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = () => {
            setLeafletLoaded(true);
        };
        document.body.appendChild(script);
    }, []);

    useEffect(() => {
        if (!leafletLoaded || !window.L || !mapContainerRef.current) return;
        if (!patientLat || !patientLng) return;

        const L = window.L;

        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapContainerRef.current).setView([patientLat, patientLng], 12);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapInstanceRef.current);
        } else {
            mapInstanceRef.current.setView([patientLat, patientLng], 12);
        }

        const map = mapInstanceRef.current;

        // Clear existing markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        // Add Patient Marker
        const patientIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        });

        L.marker([patientLat, patientLng], { icon: patientIcon })
            .addTo(map)
            .bindPopup(`<b>👩 Patient: ${patientName || 'Mother'}</b><br/>Current Location`)
            .openPopup();

        // Add Hospital Markers
        const hospitalIcon = L.divIcon({
            className: 'custom-hospital-marker',
            html: `<div style="background-color: #0d9488; color: white; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.3)">🏥</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        hospitals.forEach(h => {
            if (h.latitude && h.longitude) {
                L.marker([h.latitude, h.longitude], { icon: hospitalIcon })
                    .addTo(map)
                    .bindPopup(`<b>🏥 ${h.name}</b><br/>${h.type?.replace(/_/g, ' ')}<br/>${h.distance !== null && h.distance !== undefined ? `${h.distance} km away` : ''}`);
            }
        });

        // Adjust bounds
        const coordinates = [[patientLat, patientLng]];
        hospitals.forEach(h => {
            if (h.latitude && h.longitude) {
                coordinates.push([h.latitude, h.longitude]);
            }
        });
        if (coordinates.length > 1) {
            map.fitBounds(coordinates, { padding: [50, 50] });
        }

    }, [leafletLoaded, patientLat, patientLng, hospitals, patientName]);

    if (!patientLat || !patientLng) {
        return (
            <div style={{ padding: '24px', background: 'var(--surface-disabled)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                GPS coordinates missing for patient. Map unavailable.
            </div>
        );
    }

    return (
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', marginTop: '16px' }}>
            <div ref={mapContainerRef} style={{ height: '350px', width: '100%', zIndex: 1 }} />
        </div>
    );
}
