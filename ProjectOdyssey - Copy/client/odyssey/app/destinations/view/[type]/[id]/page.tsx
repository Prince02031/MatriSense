"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function DestinationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { type, id } = params; // type: 'poi'|'city'|'country'

    // Data States
    const [data, setData] = useState<any>(null);
    const [topCities, setTopCities] = useState<any[]>([]);
    const [topPOIs, setTopPOIs] = useState<any[]>([]);
    const [cityPOIs, setCityPOIs] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [isInCollection, setIsInCollection] = useState(false);

    // Fetch Main Data
    useEffect(() => {
        if (!type || !id) return;
        const endpointType = type === 'poi' || type === 'place' ? 'places' : type === 'city' ? 'cities' : 'countries';

        setLoading(true);
        fetch(`http://localhost:4000/api/${endpointType}/${id}`)
            .then(res => {
                if (!res.ok) throw new Error("Not Found");
                return res.json();
            })
            .then(mainData => {
                setData(mainData);
                checkCollectionStatus(mainData);

                // Fetch images for the hero section
                fetch(`http://localhost:4000/api/admin/images/${id}`)
                    .then(r => r.json())
                    .then(imgData => {
                        if (imgData.success && imgData.images?.length > 0) {
                            setData((prev: any) => ({ ...prev, _cover_url: imgData.images[0].url }));
                        }
                    })
                    .catch(() => {});

                // Fetch Related Data based on Type
                if (type === 'country') {
                    fetch(`http://localhost:4000/api/countries/${id}/top-cities`)
                        .then(r => r.json()).then(setTopCities).catch(console.warn);
                    fetch(`http://localhost:4000/api/countries/${id}/top-pois`)
                        .then(r => r.json()).then(setTopPOIs).catch(console.warn);
                } else if (type === 'city') {
                    fetch(`http://localhost:4000/api/cities/${id}/pois`)
                        .then(r => r.json()).then(setCityPOIs).catch(console.warn);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [type, id]);

    // Check if in Planner Collection
    const checkCollectionStatus = (item: any) => {
        const collections = JSON.parse(localStorage.getItem('odyssey_collections') || '[]');
        const exists = collections.find((c: any) => c.name === item.name); // Using Name for now, ideally ID
        setIsInCollection(!!exists);
    };

    const handleAddToCollection = () => {
        if (!data) return;
        const collections = JSON.parse(localStorage.getItem('odyssey_collections') || '[]');

        if (isInCollection) {
            alert("Already in your trip!");
            return;
        }

        const newItem = {
            id: `col-${Date.now()}`,
            placeId: data.google_place_id || data.id, // Prefer Google ID
            name: data.name,
            text: data.name,
            description: data.short_desc || data.description,
            category: type,
            coordinates: { lat: data.latitude, lng: data.longitude },
            source: 'details-page'
        };

        const newCollections = [...collections, newItem];
        localStorage.setItem('odyssey_collections', JSON.stringify(newCollections));
        setIsInCollection(true);
        alert("Added to your Trip Planner!");
    };

    const handleShowOnMap = () => {
        // Navigate to map explorer. 
        // We'll need to handle "focusing" on this place in the map explorer eventually.
        // For now, let's just go there.
        router.push('/destinations/map-explorer');
    };

    if (loading) return <div className="min-h-screen bg-[#FFF5E9] flex items-center justify-center">Loading...</div>;
    if (!data) return <div className="min-h-screen bg-[#FFF5E9] flex items-center justify-center">Not Found</div>;

    const bgImage = data._cover_url || data.img_url || "";

    return (
        <div className="min-h-screen bg-[#FFF5E9] font-body text-gray-900 pb-20">
            {/* Hero Section */}
            <div className="relative h-[60vh] w-full">
                {bgImage ? (
                    <img src={bgImage} className="w-full h-full object-cover brightness-75" alt={data.name} />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-500 via-blue-500 to-indigo-600" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#FFF5E9] via-transparent to-transparent"></div>

                <div className="absolute bottom-0 left-0 right-0 p-8 max-w-7xl mx-auto">
                    <button onClick={() => router.back()} className="mb-4 text-white/80 hover:text-white flex items-center gap-2 backdrop-blur-md bg-black/20 px-4 py-2 rounded-full">
                        ← Back
                    </button>
                    <h1 className="text-5xl md:text-7xl font-bold mb-2 text-gray-900 drop-shadow-sm">{data.name}</h1>
                    <div className="flex items-center gap-4 text-gray-700 font-semibold uppercase tracking-widest">
                        <span>{data.country || data.countries?.name || type}</span>
                        {data.continent && <span>• {data.continent}</span>}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 -mt-10 relative z-10">

                {/* Left Column: Main Content */}
                <div className="lg:col-span-2 space-y-12">

                    {/* Actions Bar */}
                    <div className="flex gap-4">
                        {type !== 'country' && (
                            <button
                                onClick={handleAddToCollection}
                                disabled={isInCollection}
                                className={`flex-1 py-4 rounded-xl font-bold text-lg shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2
                                    ${isInCollection ? 'bg-green-100 text-green-700' : 'bg-[#4A9B7F] text-white'}`}
                            >
                                {isInCollection ? "✓ Saved to Trip" : "+ Add to Trip"}
                            </button>
                        )}
                        <button
                            onClick={handleShowOnMap}
                            className="px-8 py-4 bg-white text-gray-800 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            🗺️ Show on Map
                        </button>
                    </div>

                    {/* Description */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm">
                        <h2 className="text-2xl font-bold mb-4">About {data.name}</h2>
                        <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                            {data.description || data.short_desc || "Explore the wonders of this destination. A perfect place for your next adventure."}
                        </p>
                    </div>

                    {/* Country: Top Cities */}
                    {type === 'country' && topCities.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">Top Cities</h2>
                                <Link href={`/destinations/view/country/${id}/all`} className="text-[#4A9B7F] font-semibold hover:underline">See All</Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {topCities.map(city => (
                                    <Link key={city.id} href={`/destinations/view/city/${city.id}`} className="block group">
                                        <div className="relative h-40 rounded-xl overflow-hidden shadow-sm">
                                            {city.img_url ? (
                                                <img src={city.img_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt={city.name} />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-500" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                                <h3 className="text-white font-bold text-lg">{city.name}</h3>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Country: Top POIs */}
                    {type === 'country' && topPOIs.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">Top Attractions</h2>
                                <Link href={`/destinations/view/country/${id}/all`} className="text-[#4A9B7F] font-semibold hover:underline">See All</Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {topPOIs.map(poi => (
                                    <Link key={poi.id} href={`/destinations/view/poi/${poi.id}`} className="block group">
                                        <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex gap-4 items-center">
                                            <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                                {poi.img_url ? (
                                                    <img src={poi.img_url} className="w-full h-full object-cover" alt={poi.name} />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-amber-300 to-orange-400" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 group-hover:text-[#4A9B7F] transition-colors">{poi.name}</h3>
                                                <p className="text-xs text-gray-500">{poi.cities?.name}</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* City: All POIs */}
                    {type === 'city' && cityPOIs.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Things to Do</h2>
                            <div className="space-y-4">
                                {cityPOIs.map(poi => (
                                    <Link key={poi.id} href={`/destinations/view/poi/${poi.id}`} className="block group">
                                        <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex gap-4">
                                            <div className="w-32 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                                {poi.img_url ? (
                                                    <img src={poi.img_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt={poi.name} />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-teal-500" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#4A9B7F] transition-colors mb-1">{poi.name}</h3>
                                                <p className="text-sm text-gray-600 line-clamp-2">{poi.short_desc || "An amazing place to visit."}</p>
                                                {poi.primary_category && <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-xs font-semibold rounded text-gray-600 uppercase">{poi.primary_category}</span>}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Column: Key Stats / Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm sticky top-8">
                        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-6">Key Information</h3>

                        <div className="space-y-6">
                            {data.population && (
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">Population</label>
                                    <p className="font-semibold text-lg">{Number(data.population).toLocaleString()}</p>
                                </div>
                            )}
                            {data.currency && (
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">Currency</label>
                                    <p className="font-semibold text-lg">{data.currency}</p>
                                </div>
                            )}
                            {data.est_cost_per_day && (
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">Est. Daily Cost</label>
                                    <p className="font-semibold text-lg text-[#4A9B7F]">${data.est_cost_per_day}</p>
                                </div>
                            )}
                            {data.best_time_to_visit && (
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">Best Time to Visit</label>
                                    <p className="font-semibold text-lg">{data.best_time_to_visit}</p>
                                </div>
                            )}
                            {data.visa_required !== undefined && (
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">Visa Requirement</label>
                                    <p className="font-semibold text-lg">{data.visa_required ? "Visa Required" : "Visa Free / On Arrival"}</p>
                                </div>
                            )}
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}
