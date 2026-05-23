"use client";

import React, { useState } from 'react';
import { MapPin, Calendar, Navigation, MessageCircle } from 'lucide-react';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';
import ShareButton from './ShareButton';
import type { Post } from '@/hooks/usePosts';

interface TripUpdateCardProps {
  post: Post;
  feedSource?: 'friends' | 'trending';
  onPostClick?: (postId: string) => void;
}

export default function TripUpdateCard({ post, feedSource, onPostClick }: TripUpdateCardProps) {
  const [likesCount, setLikesCount] = useState(Math.max(0, post.likesCount));

  const handleCardClick = () => {
    if (onPostClick) {
      onPostClick(post._id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const tripProgress = post.tripProgress || {
    locations: [],
    currentLocationName: 'Unknown',
    totalLocations: 0,
    completionPercentage: 0
  };

  // Get photos from all locations
  const allPhotos = tripProgress.locations
    ?.flatMap((loc: any) => loc.photos || [])
    .filter(Boolean)
    .slice(0, 4) || [];

  return (
    <article 
      className="bg-gradient-to-br from-teal-50 via-white to-teal-100 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-teal-200"
      onClick={handleCardClick}
    >
      {/* Feed source badge */}
      {feedSource && (
        <div className="px-4 pt-3 pb-0">
          {feedSource === 'friends' ? (
            <span className="text-xs text-blue-500 font-medium">👥 From someone you follow</span>
          ) : (
            <span className="text-xs text-orange-400 font-medium">🔥 Trending</span>
          )}
        </div>
      )}
      {/* Header with special styling for trip update */}
      <div className="bg-white p-4 border-b border-gray-100 rounded-t-2xl">
        <div className="flex items-center gap-3">
          {post.authorId?.profilePicture ? (
            <div className="w-12 h-12 rounded-full bg-gray-100 shadow-sm flex items-center justify-center">
              <img
                src={post.authorId?.profilePicture}
                alt={post.authorId?.username || 'User'}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4A9B7F] to-teal-500 shadow-sm flex items-center justify-center text-white font-bold text-xl">
              {post.authorId?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <span>{post.authorId?.username || 'User'}</span>
              <span className="text-gray-600 font-normal">has shared trip progress</span>
            </h3>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Info */}
      <div className="p-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#4A9B7F]" />
            <h4 className="font-bold text-gray-900 text-lg">{post.tripName || 'Travel Journey'}</h4>
          </div>
          <div className="flex items-center gap-2 bg-teal-100 px-3 py-1 rounded-full">
            <Navigation className="w-4 h-4 text-[#4A9B7F]" />
            <span className="text-sm font-semibold text-[#4A9B7F]">
              {tripProgress.completionPercentage || 0}% Complete
            </span>
          </div>
        </div>
        
        {tripProgress.currentLocationName && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>Currently at: <span className="font-semibold text-gray-900">{tripProgress.currentLocationName}</span></span>
          </div>
        )}
      </div>

      {/* Locations Grid */}
      <div className="p-4">
        <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Visited Locations ({tripProgress.locations?.length || 0})
        </h5>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {tripProgress.locations && tripProgress.locations.length > 0 ? (
            tripProgress.locations.map((location: any, index: number) => (
              <div 
                key={index}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  location.isCurrentLocation 
                    ? 'bg-white border-2 border-[#4A9B7F]' 
                    : 'bg-white border border-gray-200 hover:border-gray-300'
                }`}
              >
                <MapPin className={`w-4 h-4 ${location.isCurrentLocation ? 'text-[#4A9B7F]' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${location.isCurrentLocation ? 'text-[#4A9B7F]' : 'text-gray-900'}`}>
                    {location.name}
                  </p>
                  {location.visitedAt && (
                    <p className="text-xs text-gray-500">
                      {new Date(location.visitedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {location.isCurrentLocation && (
                  <span className="text-xs bg-[#4A9B7F] text-white px-2 py-1 rounded-full font-semibold">
                    Current
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No locations visited yet</p>
          )}
        </div>
      </div>

      {/* Interaction Bar */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center justify-between rounded-b-2xl">
        <div className="flex items-center gap-4">
          <div onClick={(e) => e.stopPropagation()}>
            <LikeButton
              postId={post._id}
              initialLikesCount={likesCount}
              onLikeChange={setLikesCount}
            />
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 hover:bg-white/80 transition-all duration-200"
          >
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{post.commentsCount || 0}</span>
          </button>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <SaveButton postId={post._id} />
          <ShareButton 
            postId={post._id} 
            postTitle={`${post.authorId?.username}'s trip to ${post.tripName}`}
          />
        </div>
      </div>
    </article>
  );
}
