"use client";

import React from "react";
import { useRouter } from "next/navigation";

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

interface ModalProps {
    recommendation: Recommendation | null;
    isOpen: boolean;
    onClose: () => void;
}

const RecommendationModal: React.FC<ModalProps> = ({ recommendation, isOpen, onClose }) => {
    const router = useRouter();

    const handleReviewPlace = (placeName: string, place: SubPlace) => {
        // Navigate to profile page with review parameters
        const params = new URLSearchParams({
            openReview: "true",
            placeName: placeName,
            location: recommendation?.destination_name || "",
        });
        router.push(`/profile?${params.toString()}`);
        onClose();
    };
    if (!isOpen || !recommendation) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col animate-scaleUp">
                {/* Header Image */}
                <div className="relative h-48 sm:h-64 flex-shrink-0">
                    <img
                        src={recommendation.card_image_url}
                        alt={recommendation.destination_name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="absolute bottom-6 left-8 right-8">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">{recommendation.destination_name}</h2>
                        <p className="text-gray-200 text-sm sm:text-base line-clamp-2 max-w-2xl">{recommendation.short_caption}</p>
                    </div>
                </div>

                {/* Scrollable Sub-places Grid */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#FFF5E9]">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Must-Visit Spots:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {recommendation.sub_places.map((place) => (
                            <div
                                key={place.id}
                                className="bg-white rounded-2xl overflow-hidden shadow-md flex flex-col hover:shadow-lg transition group"
                            >
                                <div className="h-40 overflow-hidden">
                                    <img
                                        src={place.image_url}
                                        alt={place.place_name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                                    />
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h4 className="font-bold text-gray-900 mb-2">{place.place_name}</h4>
                                    <p className="text-gray-600 text-sm leading-relaxed flex-grow">{place.description}</p>
                                    <button
                                        onClick={() => handleReviewPlace(place.place_name, place)}
                                        className="mt-4 w-full bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white py-2 rounded-lg font-semibold transition text-sm"
                                    >
                                        Review This Place
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleUp {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
        </div>
    );
};

export default RecommendationModal;
