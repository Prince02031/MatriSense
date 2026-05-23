"use client";

import React, { useEffect, useState } from "react";
import RecommendationModal from "./RecommendationModal";

interface SubPlace {
    id: string;
    place_name: string;
    description: string;
    image_url: string;
}

interface Recommendation {
    id: string;
    destination_name: string;
    short_caption: string;
    card_image_url: string;
    sub_places: SubPlace[];
}

const RecommendedPlaces: React.FC = () => {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch("http://localhost:4000/api/recommendations", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    setRecommendations(data.data.slice(0, 4)); // Ensure max 4
                }
            } catch (err) {
                console.error("Failed to fetch recommendations:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, []);

    const handleCardClick = (rec: Recommendation) => {
        setSelectedRec(rec);
        setIsModalOpen(true);
    };

    if (loading) {
        return (
            <div className="mb-12">
                <h2 className="text-xl font-bold mb-6 text-center text-gray-900">Recommended For You:</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-36 rounded-2xl bg-gray-200 animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    // Fallback if no recommendations found
    if (recommendations.length === 0) {
        return (
            <div className="mb-12">
                <h2 className="text-xl font-bold mb-6 text-center text-gray-900">Recommended For You:</h2>
                <div className="text-center py-10 bg-white/40 rounded-3xl border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 italic">No recommendations yet. Refresh to generate!</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition"
                    >
                        Generate Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-12">
            <h2 className="text-xl font-bold mb-6 text-center text-gray-900">Recommended For You:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {recommendations.map((item, index) => (
                    <div
                        key={item.id ?? index}
                        onClick={() => handleCardClick(item)}
                        className="relative h-36 rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition shadow-lg group"
                    >
                        <img
                            src={item.card_image_url}
                            alt={item.destination_name}
                            className="w-full h-full object-cover brightness-75 group-hover:brightness-50 transition"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div className="absolute bottom-3 left-3 right-3">
                            <span className="text-white text-sm font-semibold block truncate">{item.destination_name}</span>
                            <span className="text-gray-300 text-[10px] line-clamp-1 opacity-0 group-hover:opacity-100 transition">{item.short_caption}</span>
                        </div>
                    </div>
                ))}
            </div>

            <RecommendationModal
                recommendation={selectedRec}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default RecommendedPlaces;
