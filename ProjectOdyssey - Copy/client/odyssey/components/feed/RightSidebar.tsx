"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Heart, MessageCircle, FileText, MapPin, TrendingUp, PenSquare, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Post } from '@/hooks/usePosts';
import UserSearch from '../UserSearch';

interface TrendingDestination {
  id: string;
  name: string;
  type: string;
  country: string;
  slug?: string;
  popularity?: number;
}

interface RightSidebarProps {
  userPosts: Post[];
  allPosts: Post[];
  isAuthenticated: boolean;
  currentUserId?: string;
  onCreatePost?: () => void;
  onPostClick?: (postId: string) => void;
}

export default function RightSidebar({ userPosts, allPosts, isAuthenticated, currentUserId, onCreatePost, onPostClick }: RightSidebarProps) {
  const router = useRouter();
  const [trendingDestinations, setTrendingDestinations] = useState<TrendingDestination[]>([]);
  const [userActivityStats, setUserActivityStats] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    thisMonth: 0
  });
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Fetch trending destinations from API
  useEffect(() => {
    fetch('http://localhost:4000/api/places/trending')
      .then(res => res.json())
      .then(data => {
        if (data.places) {
          setTrendingDestinations(data.places.slice(0, 3)); // Only get top 3
        }
      })
      .catch(err => console.error('Failed to fetch trending destinations', err));
  }, []);

  // Fetch user's complete activity stats
  useEffect(() => {
    // Check localStorage directly to avoid timing issues with props
    const token = localStorage.getItem('token');
    let userId = localStorage.getItem('userId');
    
    // Fallback: try to get userId from user object if not found directly
    if (!userId) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.id;
        } catch (e) {
          console.error('[RightSidebar] Failed to parse user from localStorage');
        }
      }
    }
    
    if (!token || !userId) {
      setStatsLoaded(true);
      return;
    }
    
    fetch(`http://localhost:4000/api/posts/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const posts = data.data;
          const now = new Date();
          
          const stats = {
            totalPosts: posts.length,
            totalLikes: posts.reduce((sum: number, post: Post) => sum + (post.likesCount || 0), 0),
            totalComments: posts.reduce((sum: number, post: Post) => sum + (post.commentsCount || 0), 0),
            thisMonth: posts.filter((post: Post) => {
              const postDate = new Date(post.createdAt);
              return postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear();
            }).length
          };
          
          setUserActivityStats(stats);
          setStatsLoaded(true);
        } else {
          setStatsLoaded(true);
        }
      })
      .catch(err => {
        console.error('Failed to fetch user activity stats:', err);
        setStatsLoaded(true);
      });
  }, []); // Empty dependency array - only run once on mount

  // Calculate user activity stats (use API data if loaded, otherwise fallback to userPosts)
  const userStats = useMemo(() => {
    // If API has loaded, always use that data (even if it's 0)
    if (statsLoaded) {
      return userActivityStats;
    }
    
    // Otherwise calculate from provided userPosts as temporary display
    const totalLikes = userPosts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
    const totalComments = userPosts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);
    
    return {
      totalPosts: userPosts.length,
      totalLikes,
      totalComments,
      thisMonth: userPosts.filter(post => {
        const postDate = new Date(post.createdAt);
        const now = new Date();
        return postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear();
      }).length
    };
  }, [userPosts, userActivityStats, statsLoaded]);

  return (
    <div className="sticky top-24 space-y-6">
      {/* Find People Section */}
      {isAuthenticated && (
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#4A9B7F]" />
            <h3 className="text-lg font-bold text-gray-900">Find People</h3>
          </div>
          <UserSearch token={typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined} />
        </div>
      )}

      {/* User Activity Stats */}
      {isAuthenticated && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Your Activity</h3>
            <PenSquare className="w-5 h-5 text-gray-600" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-[#4A9B7F]" />
                <span className="text-xs text-gray-600">Posts</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{userStats.totalPosts}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-xs text-gray-600">Likes</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{userStats.totalLikes}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-600">Comments</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{userStats.totalComments}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-gray-600">This Month</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{userStats.thisMonth}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Post */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-bold mb-2 text-gray-900">Share Your Journey</h3>
        <p className="text-sm text-gray-600 mb-4">Write about your latest adventure and inspire others!</p>
        <button
          onClick={() => onCreatePost ? onCreatePost() : router.push('/feed/create')}
          className="w-full bg-[#4A9B7F] text-white font-semibold py-3 rounded-xl hover:bg-[#3d8268] transition-all duration-200 flex items-center justify-center gap-2"
        >
          <PenSquare className="w-5 h-5" />
          Create Post
        </button>
      </div>

      {/* Popular Destinations */}
      {trendingDestinations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#4A9B7F]" />
            <h3 className="text-lg font-bold text-gray-900">Popular Destinations</h3>
          </div>
          <div className="space-y-2">
            {trendingDestinations.map((dest, index) => (
              <div
                key={`trending-${dest.id}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  router.push('/destinations');
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{dest.name}</p>
                    <p className="text-xs text-gray-500">{dest.country}</p>
                  </div>
                </div>
                <TrendingUp className="w-4 h-4 text-[#4A9B7F]" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
