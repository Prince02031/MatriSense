'use client';

import React from 'react';
import { MapPin, Calendar, Star, Trophy } from 'lucide-react';
import Image from 'next/image';

interface Trip {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  isCompleted: boolean;
  image: string | null;
  memory: any;
  selectedPlaces: any[];
  visitedPlaces: { name: string; id: string; status: string }[];
  itineraryData: any;
}

interface TimelineCardProps {
  trip: Trip;
  isCompleted: boolean;
  onClick: () => void;
}

const TimelineCard: React.FC<TimelineCardProps> = ({ trip, isCompleted, onClick }) => {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPlaceNames = () => {
    if (Array.isArray(trip.visitedPlaces) && trip.visitedPlaces.length > 0) {
      return trip.visitedPlaces.slice(0, 3).map(p => p.name).filter(Boolean).join(', ');
    }
    if (Array.isArray(trip.selectedPlaces) && trip.selectedPlaces.length > 0) {
      return trip.selectedPlaces.slice(0, 3).map(p => p.name || p.title).filter(Boolean).join(', ');
    }
    return 'No places recorded yet';
  };

  const visitedCount = trip.visitedPlaces?.length ?? 0;
  const plannedCount = trip.selectedPlaces?.length ?? 0;

  const hasBadges = trip.memory?.badges_earned && trip.memory.badges_earned.length > 0;

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300
        ${isCompleted
          ? 'bg-white shadow-lg hover:shadow-2xl hover:scale-102'
          : 'bg-white/80 border-2 border-dashed border-blue-300 shadow-md hover:shadow-lg'
        }
        ${hasBadges && isCompleted ? 'ring-2 ring-amber-400' : ''}
        group
      `}
    >
      {/* Badge Highlight */}
      {hasBadges && isCompleted && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-amber-400 text-white px-3 py-1 rounded-full text-xs font-semibold animate-bounce">
          <Trophy className="w-3 h-3" />
          Badge Earned
        </div>
      )}

      {/* Image Container */}
      <div className="relative h-40 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
        {trip.image ? (
          <img
            src={trip.image}
            alt={trip.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-white opacity-50" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end">
          <div className="w-full translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black to-transparent p-4 text-white">
            <p className="text-sm font-medium">Click to view memories</p>
          </div>
        </div>

        {/* Upcoming badge */}
        {!isCompleted && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Upcoming
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Trip Name */}
        <h4 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
          {trip.name}
        </h4>

        {/* Dates */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{formatDate(startDate)}</span>
          {startDate.getTime() !== endDate.getTime() && (
            <>
              <span className="text-gray-400">→</span>
              <span className="font-medium">{formatDate(endDate)}</span>
            </>
          )}
        </div>

        {/* Places on Hover */}
        <div className="max-h-0 overflow-hidden group-hover:max-h-24 transition-all duration-300">
          <div className="text-xs text-gray-600 py-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-gray-700">Visited Places:</p>
              {visitedCount > 0 && plannedCount > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                  {visitedCount}/{plannedCount} visited
                </span>
              )}
            </div>
            <p className="line-clamp-2">{getPlaceNames()}</p>
          </div>
        </div>

        {/* Hover - Stats */}
        <div className="max-h-0 overflow-hidden group-hover:max-h-60 transition-all duration-300 border-t border-gray-200 pt-3 mt-3">
          {/* Memory Stats */}
          {trip.memory ? (
            <div className="space-y-2 text-sm">
              {trip.memory.trip_rating && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-gray-700 font-medium">{trip.memory.trip_rating}/5</span>
                </div>
              )}

              {trip.memory.mood && (
                <div className="text-gray-700">
                  <span className="font-medium">Mood:</span> {trip.memory.mood}
                </div>
              )}

              {trip.memory.favorite_moment && (
                <div className="text-gray-700 line-clamp-2">
                  <span className="font-medium">Highlight:</span> {trip.memory.favorite_moment}
                </div>
              )}

              {trip.memory.would_revisit && (
                <div className="text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded w-fit">
                  Would revisit ✓
                </div>
              )}

              {trip.memory.memory_photos && trip.memory.memory_photos.length > 0 && (
                <div className="text-gray-600 text-xs">
                  📷 {trip.memory.memory_photos.length} memories
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">
              No memories yet. Click to add!
            </div>
          )}
        </div>
      </div>

      {/* Upcoming trip faded style */}
      {!isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-t from-blue-100/20 to-transparent pointer-events-none"></div>
      )}
    </div>
  );
};

export default TimelineCard;
