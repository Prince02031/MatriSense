"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlaceDetailsModal from "../../components/PlaceDetailsModal";

// --- Types & Interfaces ---
interface DestinationCardProps {
  id: string;
  name: string;
  type: string; // 'COUNTRY' | 'DISTRICT' | 'POI'
  img_url?: string;
  short_desc?: string;
  country?: string;
  district?: string; // region for POIs
  source?: string;
}

interface TrendingDestination {
  id: string;
  name: string;
  type: string;
  country: string;
  slug?: string;
  popularity?: number;
}

const DestinationsPage: React.FC = () => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DestinationCardProps[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Data State
  const [trendingDestinations, setTrendingDestinations] = useState<TrendingDestination[]>([]);
  const [recentSearches, setRecentSearches] = useState<DestinationCardProps[]>([]);
  const [showBrowseCountries, setShowBrowseCountries] = useState(false);

  // Modal State
  const [selectedPlace, setSelectedPlace] = useState<DestinationCardProps | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Effects ---

  // 1. Load Trending & Recent Searches on Mount
  useEffect(() => {
    // Recent Searches from LocalStorage
    try {
      const stored = localStorage.getItem("odyssey_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load recent searches", e);
    }

    // Fetch Trending
    fetch("http://localhost:4000/api/places/trending")
      .then(res => res.json())
      .then(data => {
        if (data.places) setTrendingDestinations(data.places);
      })
      .catch(err => console.error("Failed to fetch trending", err));
  }, []);

  // 2. Debounced Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:4000/api/places?search_query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.places) {
        setSearchResults(data.places);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlaceClick = (place: DestinationCardProps) => {
    // 1. Add to Recent Searches
    const updatedRecent = [place, ...recentSearches.filter(p => p.id !== place.id)].slice(0, 4);
    setRecentSearches(updatedRecent);
    localStorage.setItem("odyssey_recent_searches", JSON.stringify(updatedRecent));

    // 2. Open Modal
    setSelectedPlace(place);
    setIsModalOpen(true);
  };

  const addToCollection = (place: any) => {
    // TODO: Implement collection logic (Person 2)
    alert(`Added ${place.name} to your collection! (Feature coming soon)`);
    setIsModalOpen(false);
  };

  // Handle Enter Key / Form Submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0) {
      router.push(`/destinations/search?q=${encodeURIComponent(searchQuery)}`);
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
          onAddToCollection={addToCollection}
        />
      )}


      {/* --- Main Content --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">

        {/* Hero Search Section */}
        <div className="mb-12 relative z-30">
          <form onSubmit={handleSearch} className="relative max-w-4xl mx-auto">
            <div className="flex items-center bg-gray-900 rounded-full overflow-hidden shadow-2xl transition-all focus-within:ring-4 ring-[#4A9B7F]/30">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country, city, or place..."
                className="flex-1 px-6 sm:px-8 py-4 sm:py-5 bg-transparent text-white placeholder-gray-400 focus:outline-none text-lg"
              />
              <button
                type="submit"
                className="mr-3 p-3 bg-white hover:bg-gray-200 rounded-full transition-colors"
                disabled={isSearching}
              >
                {isSearching ? (
                  <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Dropdown Results */}
            {showSearchResults && searchResults.length > 0 && (() => {
              const countries = searchResults.filter(p => p.type === 'COUNTRY');
              const districts = searchResults.filter(p => p.type === 'DISTRICT');
              const pois      = searchResults.filter(p => p.type === 'POI');

              const typeMeta: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
                COUNTRY:  { emoji: '🌍', label: 'Country',  bg: 'bg-blue-100',   text: 'text-blue-700' },
                DISTRICT: { emoji: '🏙️', label: 'District', bg: 'bg-purple-100', text: 'text-purple-700' },
                POI:      { emoji: '📍', label: 'Place',    bg: 'bg-green-100',  text: 'text-green-700' },
              };

              const ResultItem = ({ place }: { place: DestinationCardProps }) => {
                const meta = typeMeta[place.type] || typeMeta.POI;
                return (
                  <div
                    key={place.id}
                    onClick={() => handlePlaceClick(place)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <span className="text-xl w-7 text-center flex-shrink-0">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{place.name}</h4>
                      <p className="text-xs text-gray-400 truncate">
                        {place.type === 'POI' && place.district ? `${place.district} · ` : ''}
                        {place.country}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${meta.bg} ${meta.text}`}>
                      {meta.label}
                    </span>
                  </div>
                );
              };

              const GroupHeader = ({ label }: { label: string }) => (
                <div className="px-5 py-1.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                </div>
              );

              return (
                <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-slideUp max-h-[28rem] overflow-y-auto divide-y divide-gray-100">
                  {countries.length > 0 && (
                    <>
                      <GroupHeader label="Countries" />
                      {countries.map(p => <ResultItem key={p.id} place={p} />)}
                    </>
                  )}
                  {districts.length > 0 && (
                    <>
                      <GroupHeader label="Districts" />
                      {districts.map(p => <ResultItem key={p.id} place={p} />)}
                    </>
                  )}
                  {pois.length > 0 && (
                    <>
                      <GroupHeader label="Places" />
                      {pois.map(p => <ResultItem key={p.id} place={p} />)}
                    </>
                  )}
                </div>
              );
            })()}
            {/* No Results State */}
            {showSearchResults && searchResults.length === 0 && searchQuery.length > 2 && !isSearching && (
              <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-3xl shadow-2xl p-6 text-center text-gray-500">
                No places found matching "{searchQuery}". Try "Japan" or "Paris".
              </div>
            )}

          </form>

          <div className="flex justify-center mt-6">
            <button
              onClick={() => setShowBrowseCountries(!showBrowseCountries)}
              className="bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white px-8 py-3 rounded-full font-semibold shadow-lg transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Browse by Country
            </button>
          </div>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">Recent Searches:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentSearches.map((search) => (
                <div
                  key={search.id}
                  className="relative h-56 rounded-2xl overflow-hidden cursor-pointer group shadow-lg"
                  onClick={() => handlePlaceClick(search)}
                >
                  {(search as any).img_url ? (
                    <img
                      src={(search as any).img_url}
                      alt={search.name}
                      className="w-full h-full object-cover brightness-75 group-hover:scale-110 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white text-xl font-bold">{search.name}</h3>
                    <p className="text-gray-200 text-xs uppercase">{search.country}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Section */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900 flex items-center gap-2">
            Trending <span className="text-3xl">🔥</span> :
          </h2>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            {trendingDestinations.length === 0 ? (
              <div className="text-gray-500 text-center">Loading trending places...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {trendingDestinations.map((destination, index) => (
                  <div
                    key={destination.id || index}
                    className="flex items-center gap-3 p-4 hover:bg-[#FFF5E9] rounded-xl cursor-pointer transition-colors group"
                    onClick={() => handlePlaceClick(destination as any)}
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-[#4A9B7F] text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-[#4A9B7F] transition-colors line-clamp-2 leading-tight">
                        {destination.name}
                      </h3>
                      <p className="text-xs text-gray-500 capitalize">{destination.country}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <footer className="bg-gray-300 py-6 text-center mt-16">
        <p className="text-gray-800 text-sm">©Odyssey. Made with <span className="text-red-500">❤️</span> by Route6</p>
      </footer>
    </div>
  );
};

export default DestinationsPage;