"use client";

import React, { useState, useEffect } from "react";

interface PlaceImage {
    id: string;
    url: string;
    caption: string;
}

interface Place {
    id: string;
    name: string;
    country: string;
    primary_category?: string;
    short_desc?: string;
    img_url?: string; // Optional if we fetch it
    type: string; // 'COUNTRY' | 'CITY' | 'POI'
}

interface PlaceDetailsModalProps {
    place: Place;
    isOpen: boolean;
    onClose: () => void;
    onAddToCollection?: (place: Place) => void;
}

const PlaceDetailsModal: React.FC<PlaceDetailsModalProps> = ({ place, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<"overview" | "photos" | "related">("overview");
    const [relatedPlaces, setRelatedPlaces] = useState<Place[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(false);
    const [itemsInCollection, setItemsInCollection] = useState<string[]>([]);
    const [galleryImages, setGalleryImages] = useState<PlaceImage[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);

    // Check collection status on mount/open
    useEffect(() => {
        if (isOpen) {
            const collections = JSON.parse(localStorage.getItem('odyssey_collections') || '[]');
            setItemsInCollection(collections.map((c: any) => c.name));
        }
    }, [isOpen]);

    // Fetch gallery images
    useEffect(() => {
        if (isOpen && place?.id) {
            setLoadingGallery(true);
            fetch(`http://localhost:4000/api/admin/images/${place.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.images) {
                        setGalleryImages(data.images);
                    }
                })
                .catch(err => console.error('Failed to fetch gallery', err))
                .finally(() => setLoadingGallery(false));
        }
    }, [isOpen, place]);

    // Fetch related cities if this is a country
    useEffect(() => {
        if (isOpen && place.type === "COUNTRY") {
            setLoadingRelated(true);
            fetch(`http://localhost:4000/api/countries/${place.id}/top-cities`)
                .then((res) => res.json())
                .then((data) => setRelatedPlaces(data))
                .catch((err) => console.error("Failed to fetch cities", err))
                .finally(() => setLoadingRelated(false));
        }
    }, [isOpen, place]);

    if (!isOpen) return null;

    const bgImage = place.img_url || (galleryImages[0]?.url) || `https://source.unsplash.com/800x600/?${place.name},travel`;
    const isInCollection = itemsInCollection.includes(place.name);

    const handleAddToCollection = () => {
        if (isInCollection) return;
        const collections = JSON.parse(localStorage.getItem('odyssey_collections') || '[]');

        const newItem = {
            id: `col-${Date.now()}`,
            placeId: place.id,
            name: place.name,
            text: place.name,
            description: place.short_desc,
            category: place.type,
            coordinates: { lat: 0, lng: 0 }, // Would need actual coords if available
            source: 'modal'
        };

        const newCollections = [...collections, newItem];
        localStorage.setItem('odyssey_collections', JSON.stringify(newCollections));
        setItemsInCollection([...itemsInCollection, place.name]);
    };

    const handlePopOut = () => {
        const type = place.type === 'POI' ? 'poi' : place.type === 'CITY' ? 'city' : 'country';
        window.open(`/destinations/view/${type}/${place.id}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-body">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            <div className="relative bg-[#FFF5E9] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slideUp">

                {/* Top Actions */}
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                    <button
                        onClick={handlePopOut}
                        className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-colors"
                        title="Open in new tab"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Hero Image */}
                <div className="h-64 sm:h-80 relative flex-shrink-0">
                    <img
                        src={bgImage}
                        alt={place.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-6 left-6 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-[#4A9B7F] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {place.type || "DESTINATION"}
                            </span>
                            {place.country && <span className="text-gray-300 text-sm">• {place.country}</span>}
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-bold font-odyssey">{place.name}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 px-6 sticky top-0 bg-[#FFF5E9] z-10 shadow-sm">
                        <button
                            className={`py-4 px-4 font-semibold text-sm ${activeTab === 'overview' ? 'text-[#4A9B7F] border-b-2 border-[#4A9B7F]' : 'text-gray-500 hover:text-gray-800'}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`py-4 px-4 font-semibold text-sm ${activeTab === 'photos' ? 'text-[#4A9B7F] border-b-2 border-[#4A9B7F]' : 'text-gray-500 hover:text-gray-800'}`}
                            onClick={() => setActiveTab('photos')}
                        >
                            Photos
                        </button>
                        {place.type === 'COUNTRY' && (
                            <button
                                className={`py-4 px-4 font-semibold text-sm ${activeTab === 'related' ? 'text-[#4A9B7F] border-b-2 border-[#4A9B7F]' : 'text-gray-500 hover:text-gray-800'}`}
                                onClick={() => setActiveTab('related')}
                            >
                                Top Cities
                            </button>
                        )}
                    </div>

                    <div className="p-6 sm:p-8">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">About {place.name}</h3>
                                    <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                                        {place.short_desc || "A mesmerizing destination waiting to be explored. Discover the local culture, scenic beauty, and historical landmarks that make this place unique."}
                                    </p>
                                </div>

                                {/* Action */}
                                <div className="pt-4 flex gap-4">
                                    {place.type !== 'COUNTRY' && (
                                        <button
                                            onClick={handleAddToCollection}
                                            disabled={isInCollection}
                                            className={`flex-1 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2
                                                ${isInCollection ? 'bg-green-100 text-green-700 cursor-default' : 'bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white'}`}
                                        >
                                            {isInCollection ? (
                                                <><span>✓</span> Saved to Trip</>
                                            ) : (
                                                <><span>+</span> Add to Collection</>
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={handlePopOut}
                                        className="px-8 py-4 bg-white text-gray-800 hover:bg-gray-100 rounded-xl font-bold text-lg shadow-lg transition-all"
                                    >
                                        View Full Details
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'related' && (
                            <div>
                                {loadingRelated ? (
                                    <div className="text-center py-10 text-gray-500">Finding cities...</div>
                                ) : relatedPlaces.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">No prominent cities found in our database.</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {relatedPlaces.map((city) => (
                                            <div
                                                key={city.id}
                                                className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                                                onClick={() => window.open(`/destinations/view/city/${city.id}`, '_blank')}
                                            >
                                                <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                                                    <img src={(city as any).img_url || `https://source.unsplash.com/100x100/?${city.name}`} alt={city.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{city.name}</h4>
                                                    <p className="text-xs text-gray-500">{city.primary_category || "City"}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'photos' && (
                            <div className="grid grid-cols-2 gap-4">
                                {loadingGallery ? (
                                    [1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-full h-40 bg-gray-200 rounded-xl animate-pulse"></div>
                                    ))
                                ) : galleryImages.length > 0 ? (
                                    galleryImages.map((img, i) => (
                                        <img
                                            key={img.id || i}
                                            src={img.url}
                                            className="w-full h-40 object-cover rounded-xl"
                                            alt={img.caption || `${place.name} photo ${i + 1}`}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-2 text-center py-10 text-gray-500">
                                        No photos available yet.
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
};

export default PlaceDetailsModal;
