"use client";

import React from 'react';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { useFollowButton } from '@/hooks/useFollow';

interface FollowButtonProps {
  /** MongoDB _id of the user to follow/unfollow */
  targetUserId: string;
  /** Optional override size: 'sm' (default on cards) | 'md' (profile page) */
  size?: 'sm' | 'md';
  /** Called after a successful follow */
  onFollowed?: () => void;
  /** Called after a successful unfollow */
  onUnfollowed?: () => void;
  /** Initial follow state (skips the check API call if provided) */
  initialState?: boolean;
}

export default function FollowButton({
  targetUserId,
  size = 'sm',
  onFollowed,
  onUnfollowed,
  initialState,
}: FollowButtonProps) {
  const { isFollowing, loading, checked, isSelf, toggle } = useFollowButton(targetUserId, initialState);

  // Don't render on own profile or before check completes
  if (!checked || isSelf) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click
    const prev = isFollowing;
    await toggle();
    // Only trigger callbacks after successful toggle
    // Wait a moment to ensure backend has processed the follow/unfollow
    setTimeout(() => {
      if (!prev && onFollowed) onFollowed();
      if (prev && onUnfollowed) onUnfollowed();
    }, 100);
  };

  const isSmall = size === 'sm';

  if (isFollowing) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1.5 font-semibold rounded-full border transition-all ${
          isSmall
            ? 'px-3 py-1 text-xs border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500 hover:bg-red-50'
            : 'px-5 py-2 text-sm border-[#4A9B7F] text-[#4A9B7F] hover:border-red-400 hover:text-red-500 hover:bg-red-50'
        } disabled:opacity-50`}
      >
        {loading ? (
          <Loader2 className={`animate-spin ${isSmall ? 'w-3 h-3' : 'w-4 h-4'}`} />
        ) : (
          <UserCheck className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
        )}
        Following
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1.5 font-semibold rounded-full transition-all ${
        isSmall
          ? 'px-3 py-1 text-xs bg-[#4A9B7F] text-white hover:bg-[#3d8a6d]'
          : 'px-5 py-2 text-sm bg-[#4A9B7F] text-white hover:bg-[#3d8a6d] shadow-md'
      } disabled:opacity-50`}
    >
      {loading ? (
        <Loader2 className={`animate-spin ${isSmall ? 'w-3 h-3' : 'w-4 h-4'}`} />
      ) : (
        <UserPlus className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
      )}
      Follow
    </button>
  );
}
