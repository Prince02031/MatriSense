"use client";

import React, { useState, useEffect, useRef } from "react";
import WikiFetcher from "./WikiFetcher";

// Declare global google type
declare global {
  interface Window {
    google: any;
  }
}

function SearchableSelect({ options, value, onChange, placeholder, disabled }: { options: any[], value: string, onChange: (val: string) => void, placeholder: string, disabled?: boolean }) {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    
    const selectedObj = options.find(o => String(o.id) === String(value));
    const selectedName = selectedObj ? selectedObj.name : placeholder;
    
    // Filter and limit to 100 items to prevent DOM bloat
    const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase())).slice(0, 100);
    
    return (
        <div className="relative">
            {open && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpen(false)}></div>
            )}
            <div 
                className={`w-full p-3 border rounded-lg bg-white flex justify-between items-center cursor-pointer relative z-50 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${open ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-300'}`}
                onClick={() => setOpen(!open)}
            >
                <span className={!selectedObj ? "text-gray-500" : "text-gray-900"}>{selectedName}</span>
                <span className="text-gray-400 text-xs text-center w-4">{open ? "▲" : "▼"}</span>
            </div>
            
            {open && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col">
                    <div className="p-2 bg-gray-50 border-b">
                        <input 
                            type="text" 
                            autoFocus
                            className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="Type to search..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        {filtered.map(o => (
                            <div 
                                key={o.id} 
                                className={`p-2 px-3 text-sm rounded cursor-pointer ${String(value) === String(o.id) ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-100 text-gray-700'}`}
                                onClick={() => {
                                    onChange(o.id);
                                    setSearch("");
                                    setOpen(false);
                                }}
                            >
                                {o.name}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="p-3 text-sm text-gray-500 text-center">No matches found</div>
                        )}
                        {options.filter(o => o.name.toLowerCase().includes(search.toLowerCase())).length > 100 && (
                            <div className="p-2 text-xs text-gray-400 text-center italic border-t mt-1 pt-2">Type to see more...</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DistrictInputForm({ initialData = null, onSuccess }: { initialData?: any, onSuccess?: () => void }) {
  const [countries, setCountries] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    country_id: "",
    state_province: "",
    population: "",
    google_place_id: "",
    latitude: "",
    longitude: ""
  });
  const [status, setStatus] = useState<"IDLE" | "SAVING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");
  const autocompleteRef = useRef<any>(null);

  // Initialize with data if provided (Edit Mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        slug: initialData.slug || "",
        description: initialData.description || "",
        country_id: initialData.country_id || "",
        state_province: initialData.state_province || "",
        population: initialData.population || "",
        google_place_id: initialData.google_place_id || "",
        latitude: initialData.latitude || "",
        longitude: initialData.longitude || ""
      });
    }
  }, [initialData]);

  // Fetch countries for dropdown
  useEffect(() => {
    fetch("http://localhost:4000/api/admin/countries")
      .then(res => res.json())
      .then(data => {
        if (data.success) setCountries(data.data);
      })
      .catch(err => console.error("Failed to load countries", err));
  }, []);

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    const initAutocomplete = async () => {
      if (!window.google || !window.google.maps) {
        setTimeout(initAutocomplete, 500);
        return;
      }

      try {
        await window.google.maps.importLibrary("places");

        if (autocompleteRef.current) {
          // Relaxing type constraint to ensure cities are found easily
          // autocompleteRef.current.types = ['(cities)'];

          autocompleteRef.current.addEventListener('gmp-select', async ({ placePrediction }: any) => {
            const place = placePrediction.toPlace();

            // Fetch Basic Fields + Address for State
            await place.fetchFields({
              fields: ['displayName', 'formattedAddress', 'location', 'id', 'addressComponents'],
            });

            // Parse State/Province (administrative_area_level_1)
            let state = "";
            if (place.addressComponents) {
              const stateComp = place.addressComponents.find((c: any) => c.types.includes('administrative_area_level_1'));
              if (stateComp) state = stateComp.shortText; // e.g. "CA" or "NY"
            }

            setFormData(prev => ({
              ...prev,
              name: place.displayName,
              slug: place.displayName.toLowerCase().replace(/ /g, "-"),
              google_place_id: place.id,
              latitude: place.location?.lat()?.toString() || prev.latitude,
              longitude: place.location?.lng()?.toString() || prev.longitude,
              state_province: state || prev.state_province
            }));
          });
        }
      } catch (e) {
        console.error("Failed to load Google Maps Places library", e);
      }
    };
    initAutocomplete();
  }, []);

  const handleWikiFetch = (data: any) => {
    setFormData(prev => ({
      ...prev,
      name: data.title,
      slug: data.title.toLowerCase().replace(/ /g, "-"),
      description: data.extract,
      latitude: data.coordinates?.lat || "",
      longitude: data.coordinates?.lon || ""
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("SAVING");

    // Sanitize payload: convert empty strings to null for numbers/optionals
    const payload = {
      ...formData,
      population: formData.population === "" ? null : formData.population,
      latitude: formData.latitude === "" ? null : formData.latitude,
      longitude: formData.longitude === "" ? null : formData.longitude,
    };

    try {
      const url = initialData
        ? `http://localhost:4000/api/admin/cities/${initialData.id}`
        : "http://localhost:4000/api/admin/cities";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setStatus("SUCCESS");
      setErrorMessage("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
      setErrorMessage(err.message || "Error saving district");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <WikiFetcher onFetch={handleWikiFetch} />

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">

        {/* Google Autocomplete for District/City */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm relative z-50">
          <label className="block text-sm font-bold text-blue-900 mb-2">Search Google (Auto-fill District/City)</label>
          {/* @ts-ignore */}
          <gmp-place-autocomplete ref={autocompleteRef} placeholder="Search for a city..." class="w-full"></gmp-place-autocomplete>
          <p className="text-xs text-blue-600 mt-2">Selecting a city accepts Name, Location, ID, and State/Province.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">District Name</label>
            <input name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Parent Country</label>
            <SearchableSelect 
                options={countries} 
                value={formData.country_id} 
                onChange={(val) => setFormData({ ...formData, country_id: val })} 
                placeholder="Select a Country..." 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">State / Province</label>
            <input name="state_province" value={formData.state_province} onChange={handleChange} className="w-full p-3 border rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Slug</label>
            <input name="slug" value={formData.slug} onChange={handleChange} className="w-full p-3 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Population</label>
            <input name="population" type="number" value={formData.population} onChange={handleChange} className="w-full p-3 border rounded-lg" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-3 border rounded-lg h-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Google Place ID</label>
            <input name="google_place_id" value={formData.google_place_id} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white" placeholder="Paste ID or search..." />
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

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={status === "SAVING"}
            className="flex-1 bg-gray-900 text-white p-4 rounded-xl font-bold text-lg hover:bg-black transition shadow-lg"
          >
            {status === "SAVING" ? "Saving..." : (initialData ? "Update District" : "Create District")}
          </button>
          {onSuccess && (
            <button
              type="button"
              onClick={onSuccess}
              className="px-6 py-4 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          )}
        </div>

        {status === "SUCCESS" && <p className="text-green-600 font-bold text-center mt-4">✅ District Saved Successfully!</p>}
        {status === "ERROR" && <p className="text-red-600 font-bold text-center mt-4">{errorMessage}</p>}
      </form>
    </div>
  );
}
