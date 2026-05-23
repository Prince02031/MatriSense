"use client";

import React, { useState } from "react";
import CountryInputForm from "./CountryInputForm";
import DistrictInputForm from "./DistrictInputForm";
import PlaceForm from "./PlaceForm";
import AIImportForm from "./AIImportForm";
import ImageManagerTab from "./ImageManagerTab";

type EntityType = "COUNTRY" | "DISTRICT" | "PLACE" | "AI_IMPORT" | "IMAGES";

export default function DbControlPage() {
  const [selectedType, setSelectedType] = useState<EntityType>("COUNTRY");

  return (
    <div className={`mx-auto ${selectedType === "AI_IMPORT" ? "max-w-6xl" : selectedType === "IMAGES" ? "max-w-6xl" : "max-w-4xl"}`}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Database Control</h1>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-600">Entry Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as EntityType)}
            className="p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#F19E39] focus:outline-none bg-white font-medium"
          >
            <option value="COUNTRY">Country</option>
            <option value="DISTRICT">District (City)</option>
            <option value="PLACE">Place (POI)</option>
            <option value="AI_IMPORT">⚡ AI Bulk Import</option>
            <option value="IMAGES">🖼️ Image Manager</option>
          </select>
        </div>
      </div>

      <div className={`bg-white rounded-2xl shadow-lg border border-gray-200 ${
        selectedType === "AI_IMPORT" || selectedType === "IMAGES" ? "p-6" : "p-8"
      }`}>
        {selectedType === "COUNTRY" && <CountryInputForm />}
        {selectedType === "DISTRICT" && <DistrictInputForm />}
        {selectedType === "PLACE" && <PlaceForm />}
        {selectedType === "AI_IMPORT" && <AIImportForm />}
        {selectedType === "IMAGES" && <ImageManagerTab />}
      </div>
    </div>
  );
}
