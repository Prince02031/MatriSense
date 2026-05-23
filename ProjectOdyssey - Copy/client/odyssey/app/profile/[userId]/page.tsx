'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Settings, Lock, Loader2 } from 'lucide-react';
import FollowButton from '@/components/FollowButton';
import PostCard from '@/components/PostCard';
import ReviewPostCard from '@/components/ReviewPostCard';
import TripUpdateCard from '@/components/TripUpdateCard';
import type { PublicProfile } from '@/lib/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${BASE}/api/users/${userId}`, { headers });
        const json = await res.json();

        if (json.success) {
          setProfile(json.data);
          setFollowersCount(json.data.stats?.followersCount ?? 0);
          setFollowingCount(json.data.stats?.followingCount ?? 0);
        } else {
          setError(json.error ?? 'Failed to load profile');
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleFollowed = async () => {
    // Fetch actual stats from server to ensure accuracy
    try {
      const res = await fetch(`${BASE}/api/follow/stats/${userId}`);
      const json = await res.json();
      if (json.success) {
        setFollowersCount(json.data.followersCount);
        setFollowingCount(json.data.followingCount);
      }
    } catch (err) {
      console.error('Failed to fetch updated stats:', err);
      // Fallback to optimistic update if fetch fails
      setFollowersCount(prev => prev + 1);
    }
  };

  const handleUnfollowed = async () => {
    // Fetch actual stats from server to ensure accuracy
    try {
      const res = await fetch(`${BASE}/api/follow/stats/${userId}`);
      const json = await res.json();
      if (json.success) {
        setFollowersCount(json.data.followersCount);
        setFollowingCount(json.data.followingCount);
      }
    } catch (err) {
      console.error('Failed to fetch updated stats:', err);
      // Fallback to optimistic update if fetch fails
      setFollowersCount(prev => Math.max(0, prev - 1));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A9B7F]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268]"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!profile) return null;

  // ── Private profile ───────────────────────────────────────────────────────
  if (profile.isPrivate) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <img
          src={profile.profileImage}
          alt={profile.displayName}
          className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-gray-200"
        />
        <h2 className="text-xl font-bold text-gray-800">{profile.displayName}</h2>
        <p className="text-gray-500">@{profile.username}</p>
        <div className="mt-8 inline-flex items-center gap-2 text-gray-600 bg-gray-100 px-6 py-3 rounded-lg">
          <Lock className="w-5 h-5" />
          <span>This account is private</span>
        </div>
      </div>
    );
  }

  // ── Public / Own profile ──────────────────────────────────────────────────
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Cover image */}
      <div
        className="h-48 lg:h-64 bg-gradient-to-r from-[#4A9B7F] to-[#5DBEAA] bg-cover bg-center"
        style={
          profile.coverImage
            ? { backgroundImage: `url(${profile.coverImage})` }
            : undefined
        }
      />

      {/* Profile header */}
      <div className="px-4 lg:px-8">
        {/* Avatar + Action button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between -mt-12 sm:-mt-16 mb-4 gap-4">
          <img
            src={profile.profileImage}
            alt={profile.displayName}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white object-cover shadow-lg"
          />
          <div className="w-full sm:w-auto mb-2">
            {profile.isOwnProfile ? (
              <button
                onClick={() => router.push('/profile')}
                className="flex items-center gap-2 px-5 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-all w-full sm:w-auto justify-center"
              >
                <Settings className="w-4 h-4" />
                Edit Profile
              </button>
            ) : token ? (
              <FollowButton
                targetUserId={profile._id}
                size="md"
                initialState={profile.isFollowing}
                onFollowed={handleFollowed}
                onUnfollowed={handleUnfollowed}
              />
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="px-5 py-2 bg-[#4A9B7F] text-white rounded-full font-semibold hover:bg-[#3d8268] shadow-md transition-all w-full sm:w-auto"
              >
                Login to Follow
              </button>
            )}
          </div>
        </div>

        {/* Bio section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{profile.displayName}</h1>
          <p className="text-gray-500 text-sm mb-2">@{profile.username}</p>

          {profile.bio && <p className="text-gray-700 mt-3 mb-3">{profile.bio}</p>}

          {profile.travelStyle && profile.travelStyle.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.travelStyle.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-[#4A9B7F]/10 text-[#4A9B7F] rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(profile.level !== undefined || profile.xp !== undefined) && (
            <p className="text-sm text-gray-600 mt-3">
              ⚡ Level {profile.level ?? 0} · {profile.xp ?? 0} XP
            </p>
          )}
        </div>

        {/* Stats */}
        {profile.stats && (
          <div className="flex justify-around border-t border-b border-gray-200 py-4 mb-6">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">{profile.stats.postsCount}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">{followersCount}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">{followingCount}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Following</p>
            </div>
          </div>
        )}

        {/* Recent posts */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
            Recent Posts
          </h3>
          {profile.recentPosts && profile.recentPosts.length > 0 ? (
            <div className="space-y-4">
              {profile.recentPosts.map(post => {
                if (post.type === 'auto') {
                  return <TripUpdateCard key={post._id} post={post} />;
                }
                if (post.type === 'review' && post.reviewData) {
                  return <ReviewPostCard key={post._id} post={post} />;
                }
                return <PostCard key={post._id} post={post} />;
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-400 text-sm">
                {profile.isOwnProfile
                  ? 'You haven\'t posted anything yet'
                  : 'No posts yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
