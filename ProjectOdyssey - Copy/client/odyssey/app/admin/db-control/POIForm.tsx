"use client";

import React, { useState, useEffect } from "react";
import WikiFetcher from "./WikiFetcher";

export default function POIForm() {
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    country_id: "",
    city_id: "",
    google_place_id: "",
    latitude: "",
    longitude: "",
    category: "general", // Default category
    address: ""
  });
  
  const [status, setStatus] = useState<"IDLE" | "SAVING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  // Load Countries
  useEffect(() => {
    fetch("http://localhost:4000/api/admin/countries")
        .then(res => res.json())
        .then(data => { if (data.success) setCountries(data.data); })
        .catch(err => console.error(err));
  }, []);

  // Load Cities when Country changes
  useEffect(() => {
    if (formData.country_id) {
        fetch(`http://localhost:4000/api/admin/cities?country_id=${formData.country_id}`)
            .then(res => res.json())
            .then(data => { if (data.success) setCities(data.data); })
            .catch(err => console.error(err));
    } else {
        setCities([]);
    }
  }, [formData.country_id]);

  const handleWikiFetch = (data: any) => {
    // If wiki fetch has coords, update them
    setFormData(prev => ({
      ...prev,
      name: prev.name || data.title, // keep existing name if user typed it, or overwrite? usually overwrite or fill empty
      // Let's overwrite to be helpful
      name: data.title,
      slug: data.title.toLowerCase().replace(/ /g, "-"),
      description: data.extract,
      latitude: data.coordinates?.lat || prev.latitude,
      longitude: data.coordinates?.lon || prev.longitude
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("SAVING");
    // Sanitize payload
    const payload = {
        ...formData,
        latitude: formData.latitude === "" ? null : formData.latitude,
        longitude: formData.longitude === "" ? null : formData.longitude,
    };

    try {
      const res = await fetch("http://localhost:4000/api/admin/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();

      if (!res.ok) {
         if (data.code === '23505') {
             throw new Error("Duplicate POI! This POI already exists.");
         }
         throw new Error(data.error || "Failed to save");
      }
      setStatus("SUCCESS");
      setErrorMessage("");
    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
       setErrorMessage(err.message.includes("Duplicate") ? "❌ " + err.message : "❌ Error Saving POI");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <WikiFetcher onFetch={handleWikiFetch} />

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Hierarchy Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border">
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Country</label>
                <select 
                   name="country_id" 
                   value={formData.country_id} 
                   onChange={handleChange} 
                   className="w-full p-3 border rounded-lg bg-white"
                   required
                >
                   <option value="">Select Country...</option>
                   {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">District (City)</label>
                <select 
                   name="city_id" 
                   value={formData.city_id} 
                   onChange={handleChange} 
                   className="w-full p-3 border rounded-lg bg-white"
                   required
                   disabled={!formData.country_id}
                >
                   <option value="">Select District...</option>
                   {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">POI Name</label>
            <input name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
            <input name="category" value={formData.category} onChange={handleChange} className="w-full p-3 border rounded-lg" placeholder="nature, history, urban..." />
          </div>
        </div>
        
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Slug</label>
            <input name="slug" value={formData.slug} onChange={handleChange} className="w-full p-3 border rounded-lg" required />
        </div>

        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-3 border rounded-lg h-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">Google Place ID</label>
                 <input name="google_place_id" value={formData.google_place_id} onChange={handleChange} className="w-full p-3 border rounded-lg" />
            </div>
             <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">Latitude</label>
                 <input name="latitude" value={formData.latitude} onChange={handleChange} className="w-full p-3 border rounded-lg" />
            </div>
             <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">Longitude</label>
                 <input name="longitude" value={formData.longitude} onChange={handleChange} className="w-full p-3 border rounded-lg" />
            </div>
        </div>

        <button 
          type="submit" 
          disabled={status === "SAVING"}
          className="w-full bg-gray-900 text-white p-4 rounded-xl font-bold text-lg hover:bg-black transition shadow-lg"
        >
          {status === "SAVING" ? "Saving POI..." : "Save POI"}
        </button>

        {status === "SUCCESS" && <p className="text-green-600 font-bold text-center mt-4">✅ POI Saved Successfully!</p>}
        {status === "ERROR" && <p className="text-red-600 font-bold text-center mt-4">{errorMessage}</p>}
      </form>
    </div>
  );
}
