"use client";

import React, { useEffect, useState } from "react";
import PlaceForm from "../db-control/PlaceForm";

export default function POIsListPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingPlace, setEditingPlace] = useState<any | null>(null);

  const fetchPlaces = (query = "") => {
    setLoading(true);
    fetch(`http://localhost:4000/api/admin/places?search=${encodeURIComponent(query)}&limit=50`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPlaces(data.data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPlaces(search);
  };

  return (
    <div>
      {editingPlace ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Edit Place: {editingPlace.name}</h1>
            <button
              onClick={() => setEditingPlace(null)}
              className="text-gray-600 hover:text-gray-900 font-semibold"
            >
              &larr; Back to List
            </button>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
            <PlaceForm
              initialData={editingPlace}
              onSuccess={() => {
                setEditingPlace(null);
                fetchPlaces(search);
              }}
            />
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Places</h1>

          <div className="mb-6 flex gap-2 max-w-lg">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Places by name..."
              className="flex-1 p-3 border rounded-lg"
            />
            <button
              onClick={() => fetchPlaces(search)}
              className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition"
            >
              Search
            </button>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 font-semibold text-gray-700">Name</th>
                  <th className="p-4 font-semibold text-gray-700">City / District</th>
                  <th className="p-4 font-semibold text-gray-700">Country</th>
                  <th className="p-4 font-semibold text-gray-700">Category</th>
                  <th className="p-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {places.map((place) => (
                  <tr key={place.place_id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">
                      {place.name}
                      {place.google_place_id && <span className="ml-2 text-green-500" title="Linked to Google">✓</span>}
                    </td>
                    <td className="p-4 text-gray-600">{place.cities?.name || place.city || "-"}</td>
                    <td className="p-4 text-gray-600">{place.countries?.name || place.country || "-"}</td>
                    <td className="p-4 text-gray-600">
                      <span className={`text-xs px-2 py-1 rounded-full ${place.macro_category === 'Nature' ? 'bg-green-100 text-green-800' :
                          place.macro_category === 'History' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                        }`}>
                        {place.macro_category || "Urban"}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setEditingPlace(place)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {places.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No Places found matching your search.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">Loading...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-gray-500 text-sm text-center">Showing top 50 results. Use search to find specific items.</p>
        </>
      )}
    </div>
  );
}
