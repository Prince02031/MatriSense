"use client";

import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import PostEditor from './PostEditor';
import type { Post } from '@/hooks/usePosts';

interface EditBlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onUpdated?: () => void;
}

export default function EditBlogModal({ isOpen, onClose, post, onUpdated }: EditBlogModalProps) {
  const [content, setContent] = useState<any>(post.content);
  const [tripName, setTripName] = useState(post.tripName || '');
  const [images, setImages] = useState<string[]>(post.images || []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setContent(post.content);
      setTripName(post.tripName || '');
      setImages(post.images || []);
      setCurrentImageUrl('');
    }
  }, [isOpen, post]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxImage) {
        if (e.key === 'Escape') {
          setLightboxImage(null);
        } else if (e.key === 'ArrowRight' && lightboxIndex < images.length - 1) {
          setLightboxIndex(lightboxIndex + 1);
          setLightboxImage(images[lightboxIndex + 1]);
        } else if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
          setLightboxIndex(lightboxIndex - 1);
          setLightboxImage(images[lightboxIndex - 1]);
        }
      } else if (e.key === 'Escape' && !isSubmitting) {
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
  }, [isOpen, onClose, isSubmitting, lightboxImage, lightboxIndex, images]);

  const handleContentChange = (newContent: any) => {
    setContent(newContent);
  };

  // Image upload handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setImages([...images, data.imageUrl]);
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!currentImageUrl.trim()) return;
    
    try {
      new URL(currentImageUrl);
      setImages([...images, currentImageUrl]);
      setCurrentImageUrl('');
    } catch {
      alert('Please enter a valid URL');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const openLightbox = (imageUrl: string) => {
    const index = images.indexOf(imageUrl);
    setLightboxIndex(index);
    setLightboxImage(imageUrl);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' ? lightboxIndex + 1 : lightboxIndex - 1;
    if (newIndex >= 0 && newIndex < images.length) {
      setLightboxIndex(newIndex);
      setLightboxImage(images[newIndex]);
    }
  };

  const handleSubmit = async () => {
    if (!content) {
      alert('Please write something before updating!');
      return;
    }

    // Validate content has some text
    let hasText = false;
    if (content.content && Array.isArray(content.content)) {
      for (const block of content.content) {
        if (block.content && Array.isArray(block.content)) {
          for (const node of block.content) {
            if (node.type === 'text' && node.text?.trim()) {
              hasText = true;
              break;
            }
          }
        }
        if (hasText) break;
      }
    }

    if (!hasText) {
      alert('Please write some content before updating!');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/posts/${post._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          images,
          tripName: tripName.trim() || undefined,
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Post updated successfully! 🎉');
        onClose();
        if (onUpdated) {
          onUpdated();
        }
        window.location.reload();
      } else {
        alert(data.error || 'Failed to update post');
        setIsSubmitting(false);
      }
    } catch (error: any) {
      alert('Network error: ' + error.message);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-20 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden animate-scaleIn flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4A9B7F] to-teal-600 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              ✏️
            </div>
            <div>
              <h2 className="text-xl font-bold">Edit Your Story</h2>
              <p className="text-teal-50 text-sm">Update your travel blog post</p>
            </div>
          </div>
          <button
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Trip Name Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-[#4A9B7F]" />
                Trip Name <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="e.g., Summer Adventure in Bali"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A9B7F] focus:border-transparent"
                maxLength={100}
                disabled={isSubmitting}
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {tripName.length}/100
              </div>
            </div>

            {/* Image Upload Section */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                📸 Add Images <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              
              {/* URL Input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={currentImageUrl}
                  onChange={(e) => setCurrentImageUrl(e.target.value)}
                  placeholder="Paste image URL"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
                  disabled={isSubmitting || uploadingImage}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddImageUrl()}
                />
                <button
                  onClick={handleAddImageUrl}
                  disabled={!currentImageUrl.trim() || isSubmitting || uploadingImage}
                  className="px-4 py-2 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Add URL
                </button>
              </div>

              {/* File Upload Button */}
              <label 
                className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-[#4A9B7F] hover:bg-teal-50 transition-all cursor-pointer ${
                  (isSubmitting || uploadingImage) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#4A9B7F]" />
                    <span className="text-sm text-gray-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-600">Upload from device</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isSubmitting || uploadingImage}
                  className="hidden"
                />
              </label>

              {/* Image Preview Grid */}
              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt={`Upload ${idx + 1}`}
                        className="w-full h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openLightbox(img)}
                      />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Editor */}
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden min-h-[400px]">
              <PostEditor
                initialContent={content}
                onChange={handleContentChange}
                editable={!isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            <span className="hidden sm:inline">Make your changes and save when ready</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !content}
              className="flex items-center gap-2 px-6 py-2 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Post</span>
                </>
              )}
            </button>
          </div>
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
        {images.length > 1 && (
          <>
            {lightboxIndex > 0 && (
              <button
                onClick={() => navigateLightbox('prev')}
                className="absolute left-4 z-[10000] p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
            )}
            {lightboxIndex < images.length - 1 && (
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
        {images.length > 1 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[10000] px-4 py-2 bg-black/50 rounded-full text-white text-sm font-medium">
            {lightboxIndex + 1} / {images.length}
          </div>
        )}

        {/* Image */}
        <div className="relative z-[9999] max-w-[95vw] max-h-[95vh] flex items-center justify-center">
          <img
            src={lightboxImage!}
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
