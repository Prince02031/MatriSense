"use client";

import React, { useState, useEffect, useRef } from "react";
import WikiFetcher from "./WikiFetcher";

// Declare global google type to avoid TS errors
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

export default function PlaceForm({ initialData = null, onSuccess }: { initialData?: any, onSuccess?: () => void }) {
    const [countries, setCountries] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: "",
        short_desc: "",
        country_id: "",
        city_id: "",
        google_place_id: "",
        latitude: "",
        longitude: "",
        macro_category: "Urban", // Default
        primary_category: "",
        secondary_category: "",
        address: "",
        neighborhood: "",
        website: "",
        phone_number: "",
        email: "",
        amenities: "", // Comma separated
        tags: "", // Comma separated
        opening_hours: "", // JSON string or simple text
        entry_fee: "", // JSON string
        accessibility: "", // JSON string
        visit_duration_min: "60",
        est_cost_per_day: "",
        source: "Manual",
        verified: false
    });

    const [status, setStatus] = useState<"IDLE" | "SAVING" | "SUCCESS" | "ERROR">("IDLE");
    const [errorMessage, setErrorMessage] = useState("");
    const autocompleteRef = useRef<any>(null); // Ref for gmp-place-autocomplete

    // Initialize with data if provided (Edit Mode)
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || "",
                short_desc: initialData.short_desc || "",
                country_id: initialData.country_id || "",
                city_id: initialData.city_id || "",
                google_place_id: initialData.google_place_id || "",
                latitude: initialData.latitude || "",
                longitude: initialData.longitude || "",
                macro_category: initialData.macro_category || "Urban",
                primary_category: initialData.primary_category || "",
                secondary_category: initialData.secondary_category || "",
                address: initialData.address || "",
                neighborhood: initialData.neighborhood || "",
                website: initialData.website || "",
                phone_number: initialData.phone_number || "",
                email: initialData.email || "",
                amenities: initialData.amenities ? initialData.amenities.join(", ") : "",
                tags: initialData.tags ? initialData.tags.join(", ") : "",
                opening_hours: initialData.opening_hours ? JSON.stringify(initialData.opening_hours, null, 2) : "",
                entry_fee: initialData.entry_fee ? JSON.stringify(initialData.entry_fee, null, 2) : "",
                accessibility: initialData.accessibility ? JSON.stringify(initialData.accessibility, null, 2) : "",
                visit_duration_min: initialData.visit_duration_min || "60",
                est_cost_per_day: initialData.est_cost_per_day || "",
                source: initialData.source || "Manual",
                verified: initialData.verified || false
            });
        }
    }, [initialData]);

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
            fetch(`http://localhost:4000/api/admin/cities?country_id=${formData.country_id}&limit=10000`)
                .then(res => res.json())
                .then(data => { if (data.success) setCities(data.data); })
                .catch(err => console.error(err));
        } else {
            setCities([]);
        }
    }, [formData.country_id]);

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

                    autocompleteRef.current.addEventListener('gmp-select', async ({ placePrediction }: any) => {
                        const place = placePrediction.toPlace();

                        // Fetch ONLY Basic Fields (Cheap)
                        await place.fetchFields({
                            fields: ['displayName', 'formattedAddress', 'location', 'id'],
                        });

                        // Update form data with fetched details
                        setFormData(prev => ({
                            ...prev,
                            google_place_id: place.id,
                            name: place.displayName,
                            address: place.formattedAddress,
                            latitude: place.location?.lat()?.toString() || prev.latitude,
                            longitude: place.location?.lng()?.toString() || prev.longitude,
                            // DO NOT fetch website/phone automatically to save costs
                        }));
                    });
                }
            } catch (e) {
                console.error("Failed to load Google Maps Places library", e);
            }
        };
        initAutocomplete();
    }, []);

    const handleFetchContactInfo = async () => {
        if (!formData.google_place_id) {
            alert("Please select a place first or enter a Google Place ID.");
            return;
        }

        try {
            const { Place } = await window.google.maps.importLibrary("places");
            const place = new Place({ id: formData.google_place_id });

            await place.fetchFields({
                fields: ['websiteURI', 'internationalPhoneNumber']
            });

            setFormData(prev => ({
                ...prev,
                website: place.websiteURI || prev.website,
                phone_number: place.internationalPhoneNumber || prev.phone_number
            }));
            alert("Contact info fetched successfully!");

        } catch (e) {
            console.error("Failed to fetch contact info", e);
            alert("Failed to fetch contact info. Check console.");
        }
    };

    const handleWikiFetch = (data: any) => {
        setFormData(prev => ({
            ...prev,
            name: data.title,
            // description: data.extract, // Removed
            short_desc: data.extract ? data.extract.substring(0, 300) + "..." : "", // Truncate for short_desc
            latitude: data.coordinates?.lat || prev.latitude,
            longitude: data.coordinates?.lon || prev.longitude
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("SAVING");

        // Prepare Payload
        const payload: any = {
            ...formData,
            latitude: formData.latitude === "" ? null : formData.latitude,
            longitude: formData.longitude === "" ? null : formData.longitude,
            amenities: formData.amenities.split(",").map(s => s.trim()).filter(Boolean),
            tags: formData.tags.split(",").map(s => s.trim()).filter(Boolean),
            visit_duration_min: parseInt(formData.visit_duration_min) || 60,
            est_cost_per_day: parseFloat(formData.est_cost_per_day) || null
        };

        // Helper to parse JSON
        const parseJsonField = (field: string) => {
            try {
                return field ? JSON.parse(field) : null;
            } catch (e) {
                return { raw: field };
            }
        };

        payload.opening_hours = parseJsonField(formData.opening_hours);
        payload.entry_fee = parseJsonField(formData.entry_fee);
        payload.accessibility = parseJsonField(formData.accessibility);

        try {
            const url = initialData
                ? `http://localhost:4000/api/admin/places/${initialData.place_id}`
                : "http://localhost:4000/api/admin/places";

            const method = initialData ? "PUT" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to save");
            }
            setStatus("SUCCESS");
            setErrorMessage("");
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error(err);
            setStatus("ERROR");
            setErrorMessage(err.message);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    return (
        <div>
            {!initialData && <WikiFetcher onFetch={handleWikiFetch} />}

            <form onSubmit={handleSubmit} className="space-y-6 mt-6">

                {/* Google Place Autocomplete */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm relative z-50">
                    <label className="block text-sm font-bold text-blue-900 mb-2">Search Google Place (Auto-fill)</label>
                    {/* @ts-ignore - Web component */}
                    <gmp-place-autocomplete ref={autocompleteRef} placeholder="Search for a place on Google Maps..." class="w-full"></gmp-place-autocomplete>
                    <p className="text-xs text-blue-600 mt-2">Selecting a place will auto-fill name, address, ID, location.</p>
                </div>

                {/* Hierarchy Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Country</label>
                        <SearchableSelect 
                            options={countries} 
                            value={formData.country_id} 
                            onChange={(val) => setFormData({ ...formData, country_id: val, city_id: "" })} 
                            placeholder="Select Country..." 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">District (City)</label>
                        <SearchableSelect 
                            options={cities} 
                            value={formData.city_id} 
                            onChange={(val) => setFormData({ ...formData, city_id: val })} 
                            placeholder="Select District..." 
                            disabled={!formData.country_id}
                        />
                    </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Place Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border rounded-lg" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Macro Category</label>
                        <select name="macro_category" value={formData.macro_category} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white">
                            <option value="Urban">Urban</option>
                            <option value="Nature">Nature</option>
                            <option value="History">History</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Neighborhood</label>
                        <input name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full p-3 border rounded-lg" />
                    </div>
                </div>

                {/* Detailed Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Primary Category</label>
                        <input name="primary_category" value={formData.primary_category} onChange={handleChange} className="w-full p-3 border rounded-lg" placeholder="e.g. Museum" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Secondary Category</label>
                        <input name="secondary_category" value={formData.secondary_category} onChange={handleChange} className="w-full p-3 border rounded-lg" placeholder="e.g. Art Gallery" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Short Description (Summary)</label>
                    <textarea name="short_desc" value={formData.short_desc} onChange={handleChange} className="w-full p-3 border rounded-lg h-24" />
                </div>

                {/* Location Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-3">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
                        <input name="address" value={formData.address} onChange={handleChange} className="w-full p-3 border rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Google Place ID</label>
                        <input name="google_place_id" value={formData.google_place_id} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white" placeholder="Paste ID or search above..." />
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

                {/* Extended Details */}
                <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
                    <h3 className="font-bold text-gray-800 flex justify-between items-center">
                        <span>Extended Details</span>
                        <button
                            type="button"
                            onClick={handleFetchContactInfo}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm flex items-center gap-1"
                            title="Fetches Website, Phone & more details (Billable)"
                        >
                            <span>⚡ Fetch Contact Data</span>
                        </button>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Website</label>
                            <input name="website" value={formData.website} onChange={handleChange} className="w-full p-3 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                            <input name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full p-3 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                            <input name="email" value={formData.email} onChange={handleChange} className="w-full p-3 border rounded-lg" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Amenities (comma separated)</label>
                            <input name="amenities" value={formData.amenities} onChange={handleChange} className="w-full p-3 border rounded-lg" placeholder="Wifi, Parking, Pool..." />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tags (comma separated)</label>
                            <input name="tags" value={formData.tags} onChange={handleChange} className="w-full p-3 border rounded-lg" placeholder="Family, Romantic, Outdoor..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Visit Duration (min)</label>
                            <input type="number" name="visit_duration_min" value={formData.visit_duration_min} onChange={handleChange} className="w-full p-3 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Est. Cost / Day</label>
                            <input type="number" name="est_cost_per_day" value={formData.est_cost_per_day} onChange={handleChange} className="w-full p-3 border rounded-lg" placeholder="$$" />
                        </div>
                        <div className="flex items-center gap-2 mt-8">
                            <input type="checkbox" name="verified" checked={formData.verified} onChange={handleChange} className="w-6 h-6" />
                            <label className="text-sm font-bold text-gray-700">Verified Place</label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Opening Hours (JSON)</label>
                            <textarea name="opening_hours" value={formData.opening_hours} onChange={handleChange} className="w-full p-3 border rounded-lg h-24 font-mono text-sm" placeholder='{"Mon": "9-5"}' />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Entry Fee (JSON)</label>
                            <textarea name="entry_fee" value={formData.entry_fee} onChange={handleChange} className="w-full p-3 border rounded-lg h-24 font-mono text-sm" placeholder='{"adult": 10}' />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Accessibility (JSON)</label>
                            <textarea name="accessibility" value={formData.accessibility} onChange={handleChange} className="w-full p-3 border rounded-lg h-24 font-mono text-sm" placeholder='{"wheelchair": true}' />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Source / Attribution</label>
                        <input name="source" value={formData.source} onChange={handleChange} className="w-full p-3 border rounded-lg" />
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={status === "SAVING"}
                        className="flex-1 bg-gray-900 text-white p-4 rounded-xl font-bold text-lg hover:bg-black transition shadow-lg"
                    >
                        {status === "SAVING" ? "Saving..." : (initialData ? "Update Place" : "Create Place")}
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

                {status === "SUCCESS" && <p className="text-green-600 font-bold text-center mt-4">✅ Place Saved Successfully!</p>}
                {status === "ERROR" && <p className="text-red-600 font-bold text-center mt-4">❌ {errorMessage}</p>}
            </form>
        </div>
    );
}
