"use client";

import React, { useState, useEffect, useCallback } from "react";

interface EntityRecord {
  id: string;
  name: string;
  type: string;
  google_place_id?: string;
  image_count: number;
  has_images: boolean;
}

interface ImageRecord {
  id: string;
  url: string;
  caption: string;
  alt_text: string;
  display_order: number;
  place_id: string;
  place_type: string;
}

export default function ImageManagerTab() {
  // Entity List State
  const [placeType, setPlaceType] = useState<"POI" | "CITY" | "COUNTRY">("POI");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [missingImagesOnly, setMissingImagesOnly] = useState(false);

  // Selected Entity State
  const [selectedEntity, setSelectedEntity] = useState<EntityRecord | null>(null);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Populate State
  const [populating, setPopulating] = useState(false);
  const [populateLog, setPopulateLog] = useState<string[]>([]);

  // Batch Populate State
  const [batchPopulating, setBatchPopulating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCurrentName, setBatchCurrentName] = useState("");

  const limit = 20;

  const fetchEntities = useCallback(async () => {
    setLoadingEntities(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/admin/images/entities/list?type=${placeType}&page=${page}&limit=${limit}&search=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data = await res.json();
      if (data.success) {
        let fetched = data.data as EntityRecord[];
        if (missingImagesOnly) {
          fetched = fetched.filter(e => !e.has_images);
        }
        setEntities(fetched);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Fetch entities error:", err);
    } finally {
      setLoadingEntities(false);
    }
  }, [placeType, page, searchQuery, missingImagesOnly]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Load images for a selected place
  const selectEntity = async (entity: EntityRecord) => {
    setSelectedEntity(entity);
    setImages([]);
    setPopulateLog([]);
    setLoadingImages(true);
    try {
      const res = await fetch(`http://localhost:4000/api/admin/images/${entity.id}?placeType=${entity.type}`);
      const data = await res.json();
      if (data.success) {
        setImages(data.images || []);
      }
    } catch (err) {
      console.error("Load images error:", err);
    } finally {
      setLoadingImages(false);
    }
  };

  // Populate images
  const handlePopulate = async () => {
    if (!selectedEntity) return;
    setPopulating(true);
    setPopulateLog(["Starting image population..."]);

    try {
      const res = await fetch("http://localhost:4000/api/admin/images/populate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: selectedEntity.id,
          place_type: selectedEntity.type,
          place_name: selectedEntity.name,
          google_place_id: selectedEntity.google_place_id,
        }),
      });

      const data = await res.json();
      setPopulateLog((prev) => [
        ...prev,
        data.message || `Done: ${data.total || 0} images uploaded`,
        ...(data.errors || []).map((e: string) => `⚠️ ${e}`),
      ]);

      // Reload images and update the entity's image count in the list
      await selectEntity(selectedEntity);
      fetchEntities(); // Refresh list to reflect new image count
    } catch (err: any) {
      setPopulateLog((prev) => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setPopulating(false);
    }
  };

  // Delete image
  const handleDelete = async (imageId: string) => {
    if (!confirm("Delete this image?")) return;
    try {
      await fetch(`http://localhost:4000/api/admin/images/${imageId}`, { method: "DELETE" });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      fetchEntities(); // Refresh list to update count if necessary
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Batch populate images for all missing entities on current page
  const handleBatchPopulate = async () => {
    const missingEntities = entities.filter((e) => !e.has_images);
    if (missingEntities.length === 0) return;
    
    if (!confirm(`Are you sure you want to fetch images for ${missingEntities.length} places? This may take some time.`)) return;

    setBatchPopulating(true);
    setBatchProgress(0);
    setBatchTotal(missingEntities.length);
    setPopulateLog(["Starting batch population..."]);

    for (let i = 0; i < missingEntities.length; i++) {
      const ent = missingEntities[i];
      setBatchCurrentName(ent.name);
      try {
        const res = await fetch("http://localhost:4000/api/admin/images/populate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            place_id: ent.id,
            place_type: ent.type,
            place_name: ent.name,
            google_place_id: ent.google_place_id,
          }),
        });
        const data = await res.json();
        setPopulateLog((prev) => [...prev, `[${i + 1}/${missingEntities.length}] ${ent.name}: ${data.total || 0} images`]);
      } catch (err: any) {
        setPopulateLog((prev) => [...prev, `[${i + 1}/${missingEntities.length}] ${ent.name}: ❌ Error`]);
      }
      setBatchProgress(i + 1);
    }

    setBatchPopulating(false);
    fetchEntities(); // Refresh list
    
    // If the currently selected entity was updated, refresh its images
    if (selectedEntity && !selectedEntity.has_images) {
        selectEntity(selectedEntity);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Column: List of Entities */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4 border-r border-gray-200 pr-0 lg:pr-6 h-[800px]">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">🖼️ Image Library</h2>
            <p className="text-sm text-gray-500">
              Browse places to see exactly which ones are missing images.
            </p>
          </div>
          
          {entities.filter(e => !e.has_images).length > 0 && (
            <button
              onClick={handleBatchPopulate}
              disabled={batchPopulating || populating}
              className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2 ${
                batchPopulating || populating 
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {batchPopulating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {batchProgress} / {batchTotal} ({batchCurrentName})
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Batch Fetch ({entities.filter(e => !e.has_images).length})
                </>
              )}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
            <select
              value={placeType}
              onChange={(e) => {
                setPlaceType(e.target.value as any);
                setPage(1);
                setSelectedEntity(null);
              }}
              className="p-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-[#F19E39] focus:outline-none"
            >
              <option value="POI">Places (POI)</option>
              <option value="CITY">Cities</option>
              <option value="COUNTRY">Countries</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Filter names..."
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F19E39] focus:outline-none"
            />
          </div>
          
          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="missingOnly"
              checked={missingImagesOnly}
              onChange={(e) => setMissingImagesOnly(e.target.checked)}
              className="w-4 h-4 text-[#F19E39] rounded border-gray-300 focus:ring-[#F19E39]"
            />
            <label htmlFor="missingOnly" className="text-sm font-medium text-gray-700 cursor-pointer">
              Missing Images Only
            </label>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col">
          {loadingEntities ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>
          ) : entities.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No results found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {entities.map((ent) => (
                <div
                  key={ent.id}
                  onClick={() => selectEntity(ent)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:px-4 sm:py-3 cursor-pointer transition-colors ${
                    selectedEntity?.id === ent.id ? "bg-amber-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex-1 mb-2 sm:mb-0">
                    <h4 className="font-semibold text-gray-900 text-sm">{ent.name}</h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{ent.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ent.google_place_id && (
                      <span title="Has Google Maps ID" className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-bold">
                        GMap
                      </span>
                    )}
                    {ent.has_images ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full border border-green-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        {ent.image_count} Photos
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        Missing
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition"
          >
            Previous
          </button>
          <span className="text-xs font-semibold text-gray-500">
            Page {page}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={entities.length < limit}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* Right Column: Selected Entity Images */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4 h-[800px]">
        {!selectedEntity ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-medium">Select a place from the list to manage its images</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-100 px-2 py-0.5 rounded-full">
                    {selectedEntity.type}
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">{selectedEntity.name}</h3>
                </div>

                <button
                  onClick={handlePopulate}
                  disabled={populating}
                  className={`px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    populating
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-[#F19E39] hover:bg-[#e08c2a] text-white hover:-translate-y-0.5"
                  }`}
                >
                  {populating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Populating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      Fetch from APIs
                    </>
                  )}
                </button>
              </div>

              {/* Populate Log */}
              {populateLog.length > 0 && (
                <div className="mt-4 bg-white/60 rounded-lg p-3 max-h-32 overflow-y-auto border border-amber-100/50 backdrop-blur-sm">
                  {populateLog.map((log, i) => (
                    <p key={i} className="text-xs text-gray-700 font-mono border-b border-gray-100/50 last:border-0 py-0.5">
                      {log}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Image Grid */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 p-4 shadow-inner">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
                Gallery ({images.length})
              </h3>

              {loadingImages ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse shadow-sm"></div>
                  ))}
                </div>
              ) : images.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-5xl opacity-50 mb-4 block">📸</span>
                  <p className="text-gray-500 font-medium">This place has no images.</p>
                  <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">
                    Click "Fetch from APIs" above to automatically pull photos from Google Maps and Unsplash.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className="relative group rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow bg-white pb-6"
                    >
                      <img
                        src={img.url}
                        alt={img.alt_text || img.caption || "Place image"}
                        className="w-full h-32 object-cover"
                      />

                      {/* Info Bar */}
                      <div className="absolute inset-x-0 bottom-0 h-6 bg-white border-t border-gray-100 flex items-center justify-between px-2">
                        <span className="text-[9px] font-bold text-gray-400 capitalize">
                          Source: {img.caption?.replace('_', ' ') || 'Unknown'}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400">#{idx + 1}</span>
                      </div>

                      {/* Source badge on image top-left */}
                      <div className="absolute top-2 left-2">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm ${
                            img.caption === "google_maps"
                              ? "bg-blue-500 text-white"
                              : "bg-purple-600 text-white"
                          }`}
                        >
                          {img.caption === "google_maps" ? "G-Map" : "Unsplash"}
                        </span>
                      </div>

                      {/* Delete overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
                        <button
                          onClick={() => handleDelete(img.id)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                        <a 
                          href={img.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-gray-200/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold hover:scale-105 transition-all text-center"
                        >
                          View Full
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
