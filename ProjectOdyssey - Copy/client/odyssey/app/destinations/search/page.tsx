"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PlaceDetailsModal from "../../../components/PlaceDetailsModal";

interface DestinationCardProps {
    id: string;
    name: string;
    type: string;
    country: string;
    img_url?: string;
    short_desc?: string;
}

function SearchResultsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<DestinationCardProps[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [selectedPlace, setSelectedPlace] = useState<DestinationCardProps | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (initialQuery) {
            performSearch(initialQuery);
        }
    }, [initialQuery]);

    const performSearch = async (searchTerm: string) => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:4000/api/places?search_query=${encodeURIComponent(searchTerm)}`);
            const data = await res.json();
            if (data.places) {
                setResults(data.places);
            }
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/destinations/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div className="bg-[#FFF5E9] min-h-screen font-body pb-20">

            {/* Modal */}
            {selectedPlace && (
                <PlaceDetailsModal
                    place={selectedPlace as any}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onAddToCollection={() => { alert("Added to collection!") }}
                />
            )}



            <div className="max-w-7xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {loading ? "Searching..." : `Results for "${initialQuery}"`}
                </h1>
                <p className="text-gray-500 mb-8">{!loading && `${results.length} places found`}</p>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {results.map(place => (
                            <div
                                key={place.id}
                                className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer"
                                onClick={() => {
                                    const type = place.type === 'POI' ? 'poi' : place.type === 'CITY' ? 'city' : 'country';
                                    window.open(`/destinations/view/${type}/${place.id}`, '_blank');
                                }}
                            >
                                <div className="h-48 overflow-hidden relative">
                                    {place.img_url ? (
                                        <img
                                            src={place.img_url}
                                            alt={place.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-teal-400 via-blue-400 to-indigo-500" />
                                    )}
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                        {place.type}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{place.name}</h3>
                                    <p className="text-gray-500 text-sm mb-3 flex items-center gap-1">
                                        <span className="text-[#4A9B7F]">📍</span> {place.country}
                                    </p>
                                    <p className="text-gray-600 text-sm line-clamp-2">{place.short_desc || "Explore this amazing destination with detailed guides and itineraries."}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-2xl font-bold text-gray-900">No results found</h3>
                        <p className="text-gray-500 mt-2">Try checking your spelling or searching for a country instead.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <SearchResultsContent />
        </Suspense>
    );
}
