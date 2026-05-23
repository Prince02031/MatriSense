"use client";

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useLikeStatus, toggleLike } from '@/hooks/useLikes';
import { UI_CONFIG } from '../lib/constants';

interface LikeButtonProps {
  postId: string;
  initialLikesCount: number;
  onLikeChange?: (newCount: number) => void;
}

export default function LikeButton({ postId, initialLikesCount, onLikeChange }: LikeButtonProps) {
  const { isLiked: initialIsLiked, loading, refetch } = useLikeStatus(postId);
  const [isLiked, setIsLiked] = useState(false);
  // Ensure likesCount is never negative
  const [likesCount, setLikesCount] = useState(Math.max(0, initialLikesCount));
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync local state with hook state when it changes
  useEffect(() => {
    setIsLiked(initialIsLiked);
  }, [initialIsLiked]);

  useEffect(() => {
    setLikesCount(initialLikesCount);
  }, [initialLikesCount]);

  const handleToggleLike = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to like posts');
      return;
    }

    // Optimistic update
    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    
    setIsLiked(newIsLiked);
    setLikesCount(newCount);
    setIsAnimating(true);
    
    if (onLikeChange) {
      onLikeChange(newCount);
    }

    // Actual API call
    const result = await toggleLike(postId);
    
    if (result.success) {
      // Use the backend response to ensure correctness
      if (result.liked !== undefined) {
        setIsLiked(result.liked);
      }
      // Refetch to ensure we have the latest state
      refetch();
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('postLikeChanged', { detail: { postId } }));
    } else {
      // Revert on error
      setIsLiked(!newIsLiked);
      setLikesCount(initialLikesCount);
      if (onLikeChange) {
        onLikeChange(initialLikesCount);
      }
    }

    setTimeout(() => setIsAnimating(false), UI_CONFIG.ANIMATION_DURATION);
  };

  return (
    <button
      onClick={handleToggleLike}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 hover:bg-white/80 transition-all duration-200 disabled:opacity-50"
    >
      <Heart
        className={`w-5 h-5 transition-all duration-200 ${
          isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'
        } ${isAnimating ? 'scale-125' : 'scale-100'}`}
      />
      <span className="text-sm font-medium text-gray-700">
        {likesCount}
      </span>
    </button>
  );
}
