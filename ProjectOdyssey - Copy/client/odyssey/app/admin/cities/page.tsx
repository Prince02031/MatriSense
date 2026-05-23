"use client";

import React, { useEffect, useState } from "react";

import DistrictInputForm from "../db-control/DistrictInputForm";

export default function CitiesListPage() {
    const [cities, setCities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);
    const [editingCity, setEditingCity] = useState<any>(null); // New editing state

    const fetchCities = () => {
        setLoading(true);
        const query = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search: search
        });

        fetch(`http://localhost:4000/api/admin/cities?${query.toString()}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setCities(data.data);
                    setTotal(data.total);
                }
            })
            .catch(err => console.error("Failed to load cities", err))
            .finally(() => setLoading(false));
    };

    // Re-fetch when page/limit changes
    useEffect(() => {
        if (!editingCity) {
            fetchCities();
        }
    }, [page, limit, editingCity]); // Re-fetch when exiting edit mode

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // Reset to page 1 on search
        fetchCities();
    };

    const totalPages = Math.ceil(total / limit);

    // Render Edit Form
    if (editingCity) {
        return (
            <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Edit City: {editingCity.name}</h1>
                <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                    <DistrictInputForm
                        initialData={editingCity}
                        onSuccess={() => setEditingCity(null)} // Go back to list on success/cancel
                    />
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Cities</h1>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-end">
                <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Cities..."
                        className="p-2 border rounded-lg w-64"
                    />
                    <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-black">Search</button>
                </form>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Rows per page:</span>
                    <select
                        value={limit}
                        onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                        className="p-2 border rounded-lg bg-white"
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden text-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-700">Name</th>
                                <th className="p-4 font-semibold text-gray-700 w-32">Place ID</th>
                                <th className="p-4 font-semibold text-gray-700">Country</th>
                                <th className="p-4 font-semibold text-gray-700">Slug</th>
                                <th className="p-4 font-semibold text-gray-700">Population</th>
                                <th className="p-4 font-semibold text-gray-700">Coords</th>
                                <th className="p-4 font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cities.map((city) => (
                                <tr key={city.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-bold text-gray-900">{city.name}</td>
                                    <td className="p-4 text-gray-500 font-mono text-xs truncate max-w-[100px]" title={city.google_place_id}>
                                        {city.google_place_id || "-"}
                                    </td>
                                    <td className="p-4 text-gray-700">{city.countries?.name || "-"}</td>
                                    <td className="p-4 text-gray-600 font-mono text-xs">{city.slug}</td>
                                    <td className="p-4 text-gray-600">{city.population?.toLocaleString() || "-"}</td>
                                    <td className="p-4 text-gray-500 text-xs">
                                        {city.latitude?.toFixed(2)}, {city.longitude?.toFixed(2)}
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        <button
                                            onClick={() => setEditingCity(city)}
                                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 text-xs font-bold"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!confirm("Are you sure you want to delete this city?")) return;
                                                try {
                                                    const res = await fetch(`http://localhost:4000/api/admin/cities/${city.id}`, { method: 'DELETE' });
                                                    if (res.ok) {
                                                        fetchCities(); // Refresh list
                                                    } else {
                                                        alert("Failed to delete");
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("Error deleting city");
                                                }
                                            }}
                                            className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 text-xs font-bold"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                    <span className="text-gray-600">
                        Page <b>{page}</b> of <b>{totalPages || 1}</b> ({total} items)
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
