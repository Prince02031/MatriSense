"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Calendar, MapPin } from 'lucide-react';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';
import ShareButton from './ShareButton';
import TripUpdateCard from './TripUpdateCard';
import type { Post } from '@/hooks/usePosts';

interface PostCardProps {
  post: Post;
  feedSource?: 'friends' | 'trending';
  onPostClick?: (postId: string) => void;
}

export default function PostCard({ post, feedSource, onPostClick }: PostCardProps) {
  // If it's a trip update (auto-generated), render special card
  if (post.type === 'auto') {
    return <TripUpdateCard post={post} feedSource={feedSource} onPostClick={onPostClick} />;
  }

  // Otherwise, render regular blog post card
  const router = useRouter();
  // Ensure likesCount is never negative
  const [likesCount, setLikesCount] = useState(Math.max(0, post.likesCount));

  // Extract text content from BlockNote JSON
  const extractTextContent = (content: any): string => {
    if (!content || !content.content) return '';
    
    let text = '';
    const traverse = (node: any) => {
      if (node.type === 'text') {
        text += node.text + ' ';
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    };
    
    content.content.forEach(traverse);
    return text.trim();
  };

  const textContent = extractTextContent(post.content);
  const preview = textContent.slice(0, 200) + (textContent.length > 200 ? '...' : '');
  
  // Get the first heading as title if available
  const getTitle = () => {
    if (!post.content || !post.content.content) return 'Untitled Post';
    
    for (const node of post.content.content) {
      if (node.type === 'heading' && node.content && node.content[0]?.text) {
        return node.content[0].text;
      }
    }
    return post.tripName || 'Untitled Post';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePostClick = () => {
    if (onPostClick) {
      onPostClick(post._id);
    } else {
      router.push(`/feed/${post._id}`);
    }
  };

  return (
    <div
      onClick={handlePostClick}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
    >
      {/* Feed source badge */}
      {feedSource && (
        <div className="px-6 pt-4 pb-0">
          {feedSource === 'friends' ? (
            <span className="text-xs text-blue-500 font-medium">👥 From someone you follow</span>
          ) : (
            <span className="text-xs text-orange-400 font-medium">🔥 Trending</span>
          )}
        </div>
      )}
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4A9B7F] to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
            {post.authorId?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{post.authorId?.username || 'Unknown User'}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.createdAt)}</span>
              {post.type === 'auto' && (
                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                  Trip Complete
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{getTitle()}</h2>
        
        {post.tripName && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <MapPin className="w-4 h-4" />
            <span>{post.tripName}</span>
          </div>
        )}

        <p className="text-gray-700 leading-relaxed">{preview}</p>
        
        {/* Blog post images */}
        {post.images && post.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {post.images.slice(0, 4).map((img, idx) => (
              <div key={idx} className="relative aspect-video overflow-hidden rounded-lg">
                <img
                  src={img}
                  alt={`Image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {idx === 3 && post.images && post.images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold text-xl">
                      +{post.images.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div onClick={(e) => e.stopPropagation()}>
            <LikeButton
              postId={post._id}
              initialLikesCount={likesCount}
              onLikeChange={setLikesCount}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 hover:bg-white/80 transition-all duration-200">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {post.commentsCount}
            </span>
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <SaveButton postId={post._id} />
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <ShareButton postId={post._id} postTitle={getTitle()} />
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePostClick();
          }}
          className="text-sm font-medium text-[#4A9B7F] hover:text-[#3d8268] transition-colors"
        >
          Read More →
        </button>
      </div>
    </div>
  );
}
