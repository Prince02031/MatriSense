"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Loader2, Edit2, Trash2 } from 'lucide-react';
import { usePost, deletePost } from '@/hooks/usePosts';
import LikeButton from '@/components/LikeButton';
import SaveButton from '@/components/SaveButton';
import ShareButton from '@/components/ShareButton';
import CommentSection from '@/components/CommentSection';
import PostContentViewer from '@/components/PostContentViewer';
import EditTripUpdateModal from '@/components/EditTripUpdateModal';
import EditReviewModal from '@/components/EditReviewModal';
import EditBlogModal from '@/components/EditBlogModal';

export default function SinglePostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const { post, loading, error } = usePost(postId);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editTripModalOpen, setEditTripModalOpen] = useState(false);
  const [editReviewModalOpen, setEditReviewModalOpen] = useState(false);
  const [editBlogModalOpen, setEditBlogModalOpen] = useState(false);

  useEffect(() => {
    if (post) {
      // Ensure counts are never negative
      setLikesCount(Math.max(0, post.likesCount));
      setCommentsCount(Math.max(0, post.commentsCount));
    }
  }, [post]);

  useEffect(() => {
    // Get current user ID
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id || payload.userId || payload._id);
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    const result = await deletePost(postId);
    if (result.success) {
      router.push('/feed');
    } else {
      alert(result.error || 'Failed to delete post');
    }
  };

  const handleEdit = () => {
    if (post?.type === 'auto') {
      setEditTripModalOpen(true);
    } else if (post?.type === 'review') {
      setEditReviewModalOpen(true);
    } else if (post?.type === 'blog') {
      setEditBlogModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5E9] pt-8">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#FFF5E9] pt-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😞</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Post not found</h2>
            <p className="text-gray-600 mb-6">{error || 'The post you are looking for does not exist.'}</p>
            <button
              onClick={() => router.push('/feed')}
              className="px-6 py-3 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] transition-colors"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = currentUserId === post.authorId._id;

  // Get post title for sharing
  const getPostTitle = () => {
    if (post.tripName) return post.tripName;
    if (post.content) {
      try {
        const contentObj = typeof post.content === 'string' ? JSON.parse(post.content) : post.content;
        const firstBlock = contentObj?.content?.[0];
        if (firstBlock?.type === 'heading' && firstBlock?.content?.[0]?.text) {
          return firstBlock.content[0].text;
        }
        if (firstBlock?.type === 'paragraph' && firstBlock?.content?.[0]?.text) {
          const text = firstBlock.content[0].text;
          return text.length > 60 ? text.substring(0, 60) + '...' : text;
        }
      } catch (e) {
        console.error('Error parsing content for title:', e);
      }
    }
    return 'Travel Story';
  };

  return (
    <>
      {editTripModalOpen && post && post.type === 'auto' && (
        <EditTripUpdateModal
          post={post}
          isOpen={editTripModalOpen}
          onClose={() => setEditTripModalOpen(false)}
          onUpdated={() => {
            setEditTripModalOpen(false);
            window.location.reload();
          }}
        />
      )}
      {editReviewModalOpen && post && post.type === 'review' && post.reviewData && (
        <EditReviewModal
          post={post}
          isOpen={editReviewModalOpen}
          onClose={() => setEditReviewModalOpen(false)}
          onUpdated={() => {
            setEditReviewModalOpen(false);
            window.location.reload();
          }}
        />
      )}
      {editBlogModalOpen && post && post.type === 'blog' && (
        <EditBlogModal
          post={post}
          isOpen={editBlogModalOpen}
          onClose={() => setEditBlogModalOpen(false)}
          onUpdated={() => {
            setEditBlogModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    <div className="min-h-screen bg-[#FFF5E9] pt-8 pb-20">
      <div className="max-w-5xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Feed</span>
        </button>

        {/* Post Container */}
        <article className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Header - Author Info */}
          <div className="relative bg-gradient-to-r from-teal-50 to-purple-50 px-8 py-12 border-b border-gray-200">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4A9B7F] to-purple-500 flex items-center justify-center text-white font-semibold text-2xl shadow-lg">
                  {post.authorId.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{post.authorId.username}</h3>
                  <div className="flex items-center gap-4 flex-wrap text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                    {post.type === 'auto' && (
                      <span className="px-3 py-1 bg-gradient-to-r from-teal-100 to-teal-50 text-teal-700 rounded-full text-xs font-semibold border border-teal-200">
                        ✨ Trip Complete
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions for author */}
              {isAuthor && (
                <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-1">
                  <button
                    onClick={handleEdit}
                    className="p-2.5 text-gray-600 hover:text-[#4A9B7F] hover:bg-teal-50 rounded-lg transition-all duration-200"
                    title="Edit post"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Delete post"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Trip Badge */}
            {post.tripName && (
              <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-sm inline-flex border border-gray-100">
                <MapPin className="w-5 h-5 text-[#4A9B7F]" />
                <span className="font-semibold text-gray-900">{post.tripName}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-8 py-12 border-b border-gray-200 max-w-4xl">
            <PostContentViewer content={post.content} />
          </div>

          {/* Blog Post Images */}
          {post.images && post.images.length > 0 && (
            <div className="px-8 py-8 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">📸 Images</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {post.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                    <img
                      src={img}
                      alt={`Image ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trip Progress Details (for trip update posts) */}
          {post.type === 'auto' && post.tripProgress && (
            <div className="px-8 py-8 border-b border-gray-200">
              {/* Completion bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">Trip Completion</h4>
                  <span className="text-sm font-bold text-[#4A9B7F]">{post.tripProgress.completionPercentage || 0}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4A9B7F] rounded-full transition-all"
                    style={{ width: `${post.tripProgress.completionPercentage || 0}%` }}
                  />
                </div>
              </div>

              {/* Locations */}
              {post.tripProgress.locations && post.tripProgress.locations.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#4A9B7F]" />
                    Visited Locations ({post.tripProgress.locations.length})
                  </h4>
                  <div className="space-y-2">
                    {post.tripProgress.locations.map((location: any, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          location.isCurrentLocation
                            ? 'border-[#4A9B7F] bg-teal-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <MapPin className={`w-4 h-4 flex-shrink-0 ${location.isCurrentLocation ? 'text-[#4A9B7F]' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <p className={`font-medium ${location.isCurrentLocation ? 'text-[#4A9B7F]' : 'text-gray-900'}`}>{location.name}</p>
                          {location.visitedAt && (
                            <p className="text-xs text-gray-500">{new Date(location.visitedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                        {location.isCurrentLocation && (
                          <span className="text-xs bg-[#4A9B7F] text-white px-2 py-1 rounded-full font-semibold">Current</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {post.tripProgress.locations?.some((loc: any) => loc.photos?.length > 0) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Trip Photos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {post.tripProgress.locations.flatMap((loc: any) => loc.photos || []).filter(Boolean).map((photo: string, index: number) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden">
                        <img
                          src={photo}
                          alt={`Trip photo ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interaction Bar */}
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-teal-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div onClick={(e) => e.stopPropagation()}>
                  <LikeButton
                    postId={post._id}
                    initialLikesCount={likesCount}
                    onLikeChange={setLikesCount}
                  />
                </div>
                <div className="h-8 w-px bg-gray-300"></div>
                <div className="text-sm text-gray-600 font-medium">
                  <span className="text-lg font-bold text-gray-900">{commentsCount}</span>
                  <span className="ml-2">{commentsCount === 1 ? 'comment' : 'comments'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <SaveButton postId={post._id} />
                <ShareButton postId={post._id} postTitle={getPostTitle()} />
              </div>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div className="mt-8 bg-white rounded-3xl shadow-lg p-8 md:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Comments</h2>
          <CommentSection
            postId={post._id}
            onCommentCountChange={setCommentsCount}
          />
        </div>

        {/* Related Posts Hint */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/feed')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium hover:shadow-lg transition-all duration-200 border border-gray-200"
          >
            <span>← Explore More Posts</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        .prose {
          color: #374151;
        }
        
        .prose h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 1rem 0;
          color: #111;
        }
        
        .prose h2 {
          font-size: 2rem;
          font-weight: 600;
          margin: 0.875rem 0;
          color: #111;
        }
        
        .prose h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.75rem 0;
          color: #111;
        }
        
        .prose p {
          font-size: 1.125rem;
          line-height: 1.75;
          margin: 0.75rem 0;
        }
        
        .prose ul,
        .prose ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }
        
        .prose li {
          margin: 0.5rem 0;
        }
        
        .prose blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1.5rem 0;
          color: #6b7280;
          font-style: italic;
        }
        
        .prose code {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: "Roboto Mono", monospace;
          font-size: 0.875em;
        }
        
        .prose pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1.5rem 0;
        }
        
        .prose pre code {
          background: transparent;
          padding: 0;
          color: inherit;
        }
      `}</style>
    </div>
    </>
  );
}
