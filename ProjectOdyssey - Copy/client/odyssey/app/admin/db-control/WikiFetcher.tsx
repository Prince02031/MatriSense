"use client";

import React, { useState } from "react";

interface WikiData {
  title: string;
  description: string;
  extract: string;
  thumbnail: string | null;
  coordinates: { lat: number; lon: number } | null;
}

interface WikiFetcherProps {
  onFetch: (data: WikiData) => void;
}

export default function WikiFetcher({ onFetch }: WikiFetcherProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!url) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:4000/api/test/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      
      onFetch(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fff6eb] p-6 rounded-xl border border-[#FCD34D] mb-8">
      <h3 className="text-lg font-bold text-[#92400e] mb-4 flex items-center gap-2">
        <span>🪄</span> Auto-Fill from Wikipedia
      </h3>
      <div className="flex gap-3">
        <input 
          type="text" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste Wikipedia URL (e.g., https://en.wikipedia.org/wiki/Tokyo)"
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F19E39] focus:outline-none"
        />
        <button 
          type="button"
          onClick={handleFetch}
          disabled={loading || !url}
          className="bg-[#F19E39] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#d68b31] disabled:bg-gray-300 transition shadow-sm"
        >
          {loading ? "Fetching..." : "Fetch Data"}
        </button>
      </div>
      {error && <p className="text-red-500 mt-2 text-sm font-medium">{error}</p>}
    </div>
  );
}
