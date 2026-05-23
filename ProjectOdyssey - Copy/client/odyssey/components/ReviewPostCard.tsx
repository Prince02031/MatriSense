"use client";

import React, { useState } from 'react';
import { MapPin, Calendar, MessageCircle, Star } from 'lucide-react';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';
import ShareButton from './ShareButton';
import type { Post } from '@/hooks/usePosts';

interface ReviewPostCardProps {
  post: Post;
  feedSource?: 'friends' | 'trending';
  onPostClick?: (postId: string) => void;
}

const PLACE_TYPE_LABELS: Record<string, string> = {
  POI: 'Point of Interest',
  CITY: 'City',
  COUNTRY: 'Country',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-amber-600">{rating}/5</span>
    </div>
  );
}

export default function ReviewPostCard({ post, feedSource, onPostClick }: ReviewPostCardProps) {
  const [likesCount, setLikesCount] = useState(Math.max(0, post.likesCount));

  const reviewData = post.reviewData;

  const handleCardClick = () => {
    if (onPostClick) {
      onPostClick(post._id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const images = reviewData?.images?.filter(Boolean) || [];
  const displayImages = images.slice(0, 4);

  return (
    <article
      className="bg-gradient-to-br from-amber-50 via-white to-amber-100 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-amber-200"
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
      {/* Header */}
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
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm flex items-center justify-center text-white font-bold text-xl">
              {post.authorId?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <span>{post.authorId?.username || 'User'}</span>
              <span className="text-gray-600 font-normal">reviewed a place</span>
            </h3>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>

          {/* Place type badge */}
          {reviewData?.placeType && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              {PLACE_TYPE_LABELS[reviewData.placeType] || reviewData.placeType}
            </span>
          )}
        </div>
      </div>

      {/* Place Info */}
      <div className="p-4 bg-white border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
            <h4 className="font-bold text-gray-900 text-lg truncate">
              {reviewData?.placeName || 'Unknown Place'}
            </h4>
          </div>
          {reviewData?.rating != null && (
            <StarRating rating={reviewData.rating} />
          )}
        </div>

        {/* Optional review title */}
        {reviewData?.title && (
          <p className="mt-2 text-gray-700 font-semibold italic text-sm">
            &ldquo;{reviewData.title}&rdquo;
          </p>
        )}

        {/* Review comment preview */}
        {reviewData?.comment && (
          <p className="mt-2 text-gray-600 text-sm line-clamp-3">
            {reviewData.comment}
          </p>
        )}
      </div>

      {/* Image Grid */}
      {displayImages.length > 0 && (
        <div
          className={`grid gap-1 p-2 ${
            displayImages.length === 1
              ? 'grid-cols-1'
              : displayImages.length === 2
              ? 'grid-cols-2'
              : displayImages.length === 3
              ? 'grid-cols-3'
              : 'grid-cols-2'
          }`}
        >
          {displayImages.map((src, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-lg bg-amber-50 ${
                displayImages.length === 4 && index === 3 && images.length > 4
                  ? 'relative'
                  : ''
              } ${displayImages.length >= 3 ? 'aspect-square' : 'aspect-video'}`}
            >
              <img
                src={src}
                alt={`Review image ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* "+N more" overlay on 4th image */}
              {displayImages.length === 4 && index === 3 && images.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <span className="text-white font-bold text-xl">+{images.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
            postTitle={`${post.authorId?.username}'s review of ${reviewData?.placeName}`}
          />
        </div>
      </div>
    </article>
  );
}
