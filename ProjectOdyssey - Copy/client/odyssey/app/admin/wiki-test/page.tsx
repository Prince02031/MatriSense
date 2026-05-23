"use client";

import React, { useState } from "react";

export default function WikiTestPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!url) return;
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("http://localhost:4000/api/test/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      
      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Wikipedia Fetcher Test</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Wikipedia URL</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://en.wikipedia.org/wiki/Paris"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleFetch}
              disabled={loading || !url}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? "Fetching..." : "Fetch"}
            </button>
          </div>
          {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </div>

        {/* Results Area */}
        {result && (
          <div className="bg-gray-100 p-6 rounded-xl border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{result.title}</h2>
            
            {result.thumbnail && (
              <img src={result.thumbnail} alt={result.title} className="w-32 h-32 object-cover rounded-lg mb-4 shadow-sm" />
            )}
            
            <p className="text-sm text-gray-600 mb-4 italic">{result.description}</p>
            <p className="text-gray-800 leading-relaxed mb-4">{result.extract}</p>
            
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-mono bg-white p-3 rounded border">
                <div>Lat: {result.coordinates?.lat || "N/A"}</div>
                <div>Lon: {result.coordinates?.lon || "N/A"}</div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-300">
               <span className="text-xs text-gray-400">Source: {result.page_url}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
