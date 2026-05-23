"use client";
import React, { useState } from "react";

export default function LocationModal({ isOpen, onClose, data }: any) {
  const [imgIndex, setImgIndex] = useState(0);

  if (!isOpen || !data) return null;

  // Fallbacks for data fields to prevent crashes
  const images = data.images && data.images.length > 0 ? data.images : ["/dashboard-bg.jpg"];
  const description = data.description || `Experience the beauty of ${data.name}. Perfect for a ${data.category || 'relaxed'} trip.`;
  const reviews = data.reviews || [
    { user: "Alex", rating: 5, comment: "Absolutely loved it!" },
    { user: "Sam", rating: 4, comment: "Great spot, but busy." }
  ];

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center"
    }} onClick={onClose}>
      <div style={{
        backgroundColor: "white", width: "90%", maxWidth: "900px", height: "80vh",
        borderRadius: "24px", overflow: "hidden", display: "flex", flexDirection: "column",
        position: "relative", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      }} onClick={e => e.stopPropagation()}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "16px", zIndex: 10,
          background: "rgba(255,255,255,0.8)", border: "none", borderRadius: "50%",
          width: "32px", height: "32px", cursor: "pointer", fontWeight: "bold"
        }}>✕</button>

        {/* Top: Image Carousel */}
        <div style={{ height: "45%", position: "relative", background: "#f3f4f6" }}>
          <img src={images[imgIndex]} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", bottom: "16px", right: "16px", background: "white", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
            {imgIndex + 1} / {images.length}
          </div>
        </div>

        {/* Bottom: Content Split */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left: Info */}
          <div style={{ width: "50%", padding: "32px", borderRight: "1px solid #e5e7eb", overflowY: "auto" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px", fontFamily: "Playfair Display, serif" }}>{data.name}</h2>
            <span style={{ background: "#ffedd5", color: "#9a3412", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>
              {data.category || "Destination"}
            </span>
            <p style={{ marginTop: "20px", lineHeight: "1.6", color: "#4b5563" }}>{description}</p>
            <div style={{ marginTop: "20px", fontSize: "14px", color: "#6b7280" }}>
              ⏱ Suggested time: {data.visitDurationMin || 60} mins
            </div>
          </div>

          {/* Right: Reviews */}
          <div style={{ width: "50%", padding: "32px", background: "#f9fafb", overflowY: "auto" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>Traveler Reviews</h3>
            {reviews.map((rev: any, i: number) => (
              <div key={i} style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "12px", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "600", fontSize: "14px" }}>{rev.user}</span>
                  <span style={{ color: "#eab308", fontSize: "12px" }}>{"★".repeat(rev.rating)}</span>
                </div>
                <p style={{ fontSize: "13px", color: "#4b5563" }}>{rev.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}