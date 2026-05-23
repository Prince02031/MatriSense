"use client";

import React, { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { useSavedStatus, toggleSavePost } from '@/hooks/useSavedPosts';
import { UI_CONFIG } from '../lib/constants';

interface SaveButtonProps {
  postId: string;
  onSaveChange?: (isSaved: boolean) => void;
}

export default function SaveButton({ postId, onSaveChange }: SaveButtonProps) {
  const { isSaved: initialIsSaved, loading, refetch } = useSavedStatus(postId);
  const [isSaved, setIsSaved] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync local state with hook state when it changes
  useEffect(() => {
    setIsSaved(initialIsSaved);
  }, [initialIsSaved]);

  const handleToggleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to save posts');
      return;
    }

    // Optimistic update
    const newIsSaved = !isSaved;
    
    setIsSaved(newIsSaved);
    setIsAnimating(true);
    
    if (onSaveChange) {
      onSaveChange(newIsSaved);
    }

    // Actual API call
    const result = await toggleSavePost(postId);
    
    if (result.success) {
      console.log('[SaveButton] Toggle successful:', result.saved ? 'SAVED' : 'UNSAVED');
      // Use the backend response to ensure correctness
      if (result.saved !== undefined) {
        setIsSaved(result.saved);
        if (onSaveChange) {
          onSaveChange(result.saved);
        }
      }
      // Refetch to ensure we have the latest state
      refetch();
      
      // Notify parent to refresh saved posts list if needed
      window.dispatchEvent(new CustomEvent('savedPostsChanged'));
    } else {
      // Revert on error
      setIsSaved(!newIsSaved);
      if (onSaveChange) {
        onSaveChange(!newIsSaved);
      }
      alert(result.error || 'Failed to save post');
    }

    setTimeout(() => setIsAnimating(false), UI_CONFIG.ANIMATION_DURATION);
  };

  return (
    <button
      onClick={handleToggleSave}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 hover:bg-white/80 transition-all duration-200 disabled:opacity-50"
      title={isSaved ? 'Unsave post' : 'Save post'}
    >
      <Bookmark
        className={`w-5 h-5 transition-all duration-200 ${
          isSaved ? 'fill-[#4A9B7F] text-[#4A9B7F]' : 'text-gray-600'
        } ${isAnimating ? 'scale-125' : 'scale-100'}`}
      />
    </button>
  );
}
