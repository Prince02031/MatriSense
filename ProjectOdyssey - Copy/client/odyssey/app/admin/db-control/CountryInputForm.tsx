"use client";

import React, { useState, useEffect, useRef } from "react";
import WikiFetcher from "./WikiFetcher";

// Declare global google type
declare global {
  interface Window {
    google: any;
  }
}

export default function CountryInputForm() {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    country_code: "", // ISO 2 Code (e.g. US, FR)
    continent: "",
    currency: "",
    population: "",
    google_place_id: "",
    latitude: "",
    longitude: ""
  });
  const [status, setStatus] = useState<"IDLE" | "SAVING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");
  const autocompleteRef = useRef<any>(null);

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
          // Configure autocomplete to prefer regions/countries
          // Relaxing types to ensure results appear.
          // User can just search for country name.
          // autocompleteRef.current.types = ['country', 'political'];

          autocompleteRef.current.addEventListener('gmp-select', async ({ placePrediction }: any) => {
            const place = placePrediction.toPlace();

            // Fetch Basic Fields + Address Components (for ISO code)
            await place.fetchFields({
              fields: ['displayName', 'formattedAddress', 'location', 'id', 'addressComponents'],
            });

            // Extract ISO Country Code (short_name from address_components)
            let isoCode = "";
            if (place.addressComponents) {
              const countryComponent = place.addressComponents.find((c: any) => c.types.includes('country'));
              if (countryComponent) {
                isoCode = countryComponent.shortText;
              }
            }

            setFormData(prev => ({
              ...prev,
              name: place.displayName,
              slug: place.displayName.toLowerCase().replace(/ /g, "-"),
              google_place_id: place.id,
              latitude: place.location?.lat()?.toString() || prev.latitude,
              longitude: place.location?.lng()?.toString() || prev.longitude,
              country_code: isoCode || prev.country_code
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
    // Sanitize payload
    const payload = {
      ...formData,
      population: formData.population === "" ? null : formData.population,
      latitude: formData.latitude === "" ? null : formData.latitude,
      longitude: formData.longitude === "" ? null : formData.longitude,
    };

    try {
      const res = await fetch("http://localhost:4000/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === '23505') {
          throw new Error("Duplicate Country! This country already exists.");
        }
        throw new Error(data.error || "Failed to save");
      }

      setStatus("SUCCESS");
      setErrorMessage("");
    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
      setErrorMessage(err.message.includes("Duplicate") ? "❌ " + err.message : "❌ Error Saving Country");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <WikiFetcher onFetch={handleWikiFetch} />

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">

        {/* Google Autocomplete for Country */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm relative z-50">
          <label className="block text-sm font-bold text-blue-900 mb-2">Search Google (Auto-fill Country)</label>
          {/* @ts-ignore */}
          <gmp-place-autocomplete ref={autocompleteRef} placeholder="Search for a country..." class="w-full"></gmp-place-autocomplete>
          <p className="text-xs text-blue-600 mt-2">Selecting a country accepts Name, ISO Code, Location, and ID.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
            <input name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Slug</label>
            <input name="slug" value={formData.slug} onChange={handleChange} className="w-full p-3 border rounded-lg" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-3 border rounded-lg h-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Country Code (ISO)</label>
            <input name="country_code" value={formData.country_code} onChange={handleChange} className="w-full p-3 border rounded-lg" required placeholder="e.g. US, JP" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Continent</label>
            <input name="continent" value={formData.continent} onChange={handleChange} className="w-full p-3 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Population</label>
            <input name="population" type="number" value={formData.population} onChange={handleChange} className="w-full p-3 border rounded-lg" />
          </div>
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

        <button
          type="submit"
          disabled={status === "SAVING"}
          className="w-full bg-gray-900 text-white p-4 rounded-xl font-bold text-lg hover:bg-black transition shadow-lg"
        >
          {status === "SAVING" ? "Saving..." : "Save Country"}
        </button>

        {status === "SUCCESS" && <p className="text-green-600 font-bold text-center mt-4">✅ Country Saved Successfully!</p>}
        {status === "ERROR" && <p className="text-red-600 font-bold text-center mt-4">{errorMessage}</p>}
      </form>
    </div>
  );
}
