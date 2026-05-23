"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePost, deletePost } from '@/hooks/usePosts';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';
import ShareButton from './ShareButton';
import CommentSection from './CommentSection';
import PostContentViewer from './PostContentViewer';
import EditTripUpdateModal from './EditTripUpdateModal';
import EditReviewModal from './EditReviewModal';
import EditBlogModal from './EditBlogModal';

interface PostDetailModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function PostDetailModal({ postId, isOpen, onClose, onDeleted }: PostDetailModalProps) {
  const { post, loading, error } = usePost(postId);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editTripModalOpen, setEditTripModalOpen] = useState(false);
  const [editReviewModalOpen, setEditReviewModalOpen] = useState(false);
  const [editBlogModalOpen, setEditBlogModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (post) {
      setLikesCount(Math.max(0, post.likesCount));
      setCommentsCount(Math.max(0, post.commentsCount));
    }
  }, [post]);

  useEffect(() => {
    // Get current user ID
    const userId = localStorage.getItem('userId');
    if (userId) {
      setCurrentUserId(userId);
    }
  }, []);

  // Handle lightbox keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxImage) {
        if (e.key === 'Escape') {
          setLightboxImage(null);
        } else if (e.key === 'ArrowRight' && lightboxIndex < lightboxImages.length - 1) {
          setLightboxIndex(lightboxIndex + 1);
          setLightboxImage(lightboxImages[lightboxIndex + 1]);
        } else if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
          setLightboxIndex(lightboxIndex - 1);
          setLightboxImage(lightboxImages[lightboxIndex - 1]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, lightboxImage, lightboxImages, lightboxIndex]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTitle = () => {
    if (!post || !post.content || !post.content.content) return 'Untitled Post';
    
    for (const node of post.content.content) {
      if (node.type === 'heading' && node.content && node.content[0]?.text) {
        return node.content[0].text;
      }
    }
    return post.tripName || 'Untitled Post';
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    const result = await deletePost(postId);
    if (result.success) {
      onClose();
      if (onDeleted) onDeleted();
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

  const openLightbox = (imageUrl: string, allImages: string[]) => {
    const index = allImages.indexOf(imageUrl);
    setLightboxImages(allImages);
    setLightboxIndex(index);
    setLightboxImage(imageUrl);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' ? lightboxIndex + 1 : lightboxIndex - 1;
    if (newIndex >= 0 && newIndex < lightboxImages.length) {
      setLightboxIndex(newIndex);
      setLightboxImage(lightboxImages[newIndex]);
    }
  };

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pt-24 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-scaleIn mt-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {post?.authorId.username}'s post
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
            </div>
          ) : error || !post ? (
            <div className="text-center py-20 px-4">
              <div className="text-6xl mb-4">😞</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Post not found</h3>
              <p className="text-gray-600">{error || 'The post you are looking for does not exist.'}</p>
            </div>
          ) : (
            <>
              {/* Post Header */}
              <div className="px-6 py-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4A9B7F] to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                      {post.authorId.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{post.authorId.username}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(post.createdAt)}</span>
                        </div>
                        {post.type === 'auto' && (
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
                            ✨ Trip Complete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for author */}
                  {currentUserId === post.authorId._id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleEdit}
                        className="p-2 text-gray-600 hover:text-[#4A9B7F] hover:bg-teal-50 rounded-lg transition-colors"
                        title="Edit post"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleDelete}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Trip Name */}
                {post.tripName && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 bg-teal-50 px-3 py-2 rounded-lg inline-flex">
                    <MapPin className="w-4 h-4 text-[#4A9B7F]" />
                    <span className="font-medium">{post.tripName}</span>
                  </div>
                )}
              </div>

              {/* Post Content */}
              <div className="px-6 py-6 border-b border-gray-100">
                <PostContentViewer content={post.content} />
              </div>

              {/* Blog Images (for blog posts) */}
              {post.type === 'blog' && post.images && post.images.length > 0 && (
                <div className="px-6 py-6 border-b border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-3">Images</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {post.images.filter(Boolean).map((src: string, index: number) => (
                      <div 
                        key={index} 
                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 cursor-pointer group"
                        onClick={() => openLightbox(src, post.images.filter(Boolean))}
                      >
                        <img
                          src={src}
                          alt={`Blog image ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trip Progress Details (for trip update posts) */}
              {post.type === 'auto' && post.tripProgress && (
                <div className="px-6 py-6 border-b border-gray-100 space-y-5">
                  {/* Completion Bar */}
                  <div>
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
                    <div>
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
                        {post.tripProgress.locations
                          .flatMap((loc: any) => loc.photos || [])
                          .filter(Boolean)
                          .map((photo: string, index: number) => {
                            const allPhotos = post.tripProgress.locations.flatMap((loc: any) => loc.photos || []).filter(Boolean);
                            return (
                              <div 
                                key={index} 
                                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                                onClick={() => openLightbox(photo, allPhotos)}
                              >
                                <img
                                  src={photo}
                                  alt={`Trip photo ${index + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Review Details (for review posts) */}
              {post.type === 'review' && post.reviewData && (
                <div className="px-6 py-6 border-b border-gray-100 space-y-5">
                  {/* Place + Rating Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-5 h-5 text-amber-500" />
                        <h4 className="font-bold text-gray-900 text-xl">{post.reviewData.placeName}</h4>
                      </div>
                      {post.reviewData.placeType && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                          {post.reviewData.placeType === 'POI' ? 'Point of Interest' : post.reviewData.placeType === 'CITY' ? 'City' : post.reviewData.placeType === 'COUNTRY' ? 'Country' : post.reviewData.placeType}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={`text-xl ${i < post.reviewData!.rating ? 'text-amber-400' : 'text-gray-300'}`}>★</span>
                        ))}
                      </div>
                      <span className="text-sm font-bold text-amber-600">{post.reviewData.rating} / 5</span>
                    </div>
                  </div>

                  {/* Review Title */}
                  {post.reviewData.title && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="font-semibold text-gray-800 italic text-lg">&ldquo;{post.reviewData.title}&rdquo;</p>
                    </div>
                  )}

                  {/* Review Comment */}
                  {post.reviewData.comment && (
                    <div>
                      <h5 className="font-semibold text-gray-700 mb-2">Review</h5>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{post.reviewData.comment}</p>
                    </div>
                  )}

                  {/* Visit Date */}
                  {post.reviewData.visitDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>Visited: <span className="font-medium text-gray-700">{new Date(post.reviewData.visitDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></span>
                    </div>
                  )}

                  {/* Review Images */}
                  {post.reviewData.images && post.reviewData.images.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-700 mb-3">Photos</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {post.reviewData.images.filter(Boolean).map((src: string, index: number) => (
                          <div 
                            key={index} 
                            className="relative aspect-square rounded-xl overflow-hidden bg-amber-50 cursor-pointer group"
                            onClick={() => openLightbox(src, post.reviewData!.images.filter(Boolean))}
                          >
                            <img
                              src={src}
                              alt={`Review photo ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interaction Bar */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LikeButton
                      postId={post._id}
                      initialLikesCount={likesCount}
                      onLikeChange={setLikesCount}
                    />
                    <SaveButton postId={post._id} />
                    <ShareButton postId={post._id} postTitle={getTitle()} />
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">{commentsCount}</span>
                    <span className="ml-1">{commentsCount === 1 ? 'comment' : 'comments'}</span>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="px-6 py-6">
                <CommentSection
                  postId={post._id}
                  onCommentCountChange={setCommentsCount}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {/* Image Lightbox */}
    {lightboxImage && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        />
        
        {/* Close Button */}
        <button
          onClick={() => setLightboxImage(null)}
          className="absolute top-4 right-4 z-[10000] p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Navigation Buttons */}
        {lightboxImages.length > 1 && (
          <>
            {lightboxIndex > 0 && (
              <button
                onClick={() => navigateLightbox('prev')}
                className="absolute left-4 z-[10000] p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
            )}
            {lightboxIndex < lightboxImages.length - 1 && (
              <button
                onClick={() => navigateLightbox('next')}
                className="absolute right-4 z-[10000] p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            )}
          </>
        )}

        {/* Image Counter */}
        {lightboxImages.length > 1 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[10000] px-4 py-2 bg-black/50 rounded-full text-white text-sm font-medium">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
        )}

        {/* Image */}
        <div className="relative z-[9999] max-w-[95vw] max-h-[95vh] flex items-center justify-center">
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    )}

    </>
  );
}

