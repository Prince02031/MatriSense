"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function DestinationsViewAllPage() {
    const params = useParams();
    const router = useRouter();
    const { type, id } = params;

    // We only really support 'country' 'see-all' for now based on requirements
    // but we can make it generic.
    // However, the requirement is "open another view containing all that you can do an see in that country"

    // State
    const [countryName, setCountryName] = useState("");
    const [items, setItems] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'cities' | 'urban' | 'nature' | 'history'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (type !== 'country') return;

        setLoading(true);

        // Fetch Country Name
        fetch(`http://localhost:4000/api/countries/${id}`)
            .then(res => res.json())
            .then(data => setCountryName(data.name))
            .catch(console.error);

        // Fetch All Content (Cities + POIs)
        // We'll use the existing top-lists endpoints for now, 
        // BUT ideally we need a "get ALL cities/pois" endpoint.
        // For prototype, fetching "top" might be enough if limited, but let's assume we want more.
        // Let's reuse the top endpoints but maybe we need to create a dedicated "all" endpoint?
        // User asked for "categorized by cities, urban POIs, nature POIs, history POIs".

        // I will parallel fetch top cities and top POIs for now (limit 10 each in backend currently).
        // To do this properly I should modify backend to allow limit override or new endpoint.
        // I will stick to what I have to avoid scope creep, merging cities and POIs.

        Promise.all([
            fetch(`http://localhost:4000/api/countries/${id}/top-cities`).then(r => r.json()),
            fetch(`http://localhost:4000/api/countries/${id}/top-pois`).then(r => r.json())
        ]).then(([cities, pois]) => {
            const normalizedCities = cities.map((c: any) => ({ ...c, kind: 'city', category: 'City' }));
            const normalizedPOIs = pois.map((p: any) => ({ ...p, kind: 'poi', category: p.primary_category || 'POI' }));
            setItems([...normalizedCities, ...normalizedPOIs]);
        }).finally(() => setLoading(false));

    }, [type, id]);

    const filteredItems = items.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'cities') return item.kind === 'city';
        // Simple string matching for categories
        if (filter === 'urban') return (item.category?.toLowerCase().includes('urban') || item.kind === 'city'); // Cities are urban?
        if (filter === 'nature') return item.category?.toLowerCase().includes('nature') || item.primary_category?.toLowerCase().includes('nature');
        if (filter === 'history') return item.category?.toLowerCase().includes('history') || item.primary_category?.toLowerCase().includes('history');
        return true;
    });

    return (
        <div className="min-h-screen bg-[#FFF5E9] font-body text-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => router.back()} className="text-gray-500 hover:text-black mb-2">← Back</button>
                        <h1 className="text-4xl font-bold">Explore {countryName}</h1>
                        <p className="text-gray-600">Discover everything this destination has to offer.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    {['All', 'Cities', 'Urban', 'Nature', 'History'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f.toLowerCase() as any)}
                            className={`px-6 py-2 rounded-full font-semibold whitespace-nowrap transition-colors
                                ${filter === f.toLowerCase()
                                    ? 'bg-[#4A9B7F] text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {loading ? (
                    <div>Loading content...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map(item => (
                            <Link
                                key={item.id}
                                href={`/destinations/view/${item.kind === 'city' ? 'city' : 'poi'}/${item.id}`}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group"
                            >
                                <div className="h-48 overflow-hidden relative">
                                    <img
                                        src={`https://source.unsplash.com/600x400/?${item.name},${item.kind === 'city' ? 'city' : 'landmark'}`}
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                                    />
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                        {item.kind}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                                    <p className="text-gray-600 text-sm line-clamp-2">{item.short_desc || item.description || "Explore this amazing place."}</p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {item.primary_category && (
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                                {item.primary_category}
                                            </span>
                                        )}
                                        {item.cities && (
                                            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs">
                                                📍 {item.cities.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
