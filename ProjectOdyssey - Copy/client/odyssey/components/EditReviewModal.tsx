"use client";

import React, { useState } from "react";
import { X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { updatePost } from "@/hooks/usePosts";
import type { Post } from "@/hooks/usePosts";

interface EditReviewModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditReviewModal({ post, isOpen, onClose, onUpdated }: EditReviewModalProps) {
  const rd = post.reviewData!;

  const [placeName, setPlaceName] = useState(rd.placeName ?? "");
  const [rating, setRating] = useState(rd.rating ?? 5);
  const [title, setTitle] = useState(rd.title ?? "");
  const [comment, setComment] = useState(rd.comment ?? "");
  const [images, setImages] = useState<string[]>(rd.images ?? []);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!isOpen) return null;

  // ── Image helpers ──────────────────────────────────────────────────────
  const handleAddImageUrl = () => {
    const url = currentImageUrl.trim();
    if (!url) return;
    setImages((prev) => [...prev, url]);
    setCurrentImageUrl("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.imageUrl) {
          setImages((prev) => [...prev, data.imageUrl]);
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!placeName.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await updatePost(post._id, {
        type: "review",
        reviewData: {
          reviewId: rd.reviewId ?? null,
          placeName: placeName.trim(),
          placeType: rd.placeType ?? "POI",
          rating,
          title: title.trim() || null,
          comment: comment.trim() || null,
          images,
          visitDate: rd.visitDate ?? null,
        },
      });

      if (result.success) {
        onUpdated();
      } else {
        alert(result.error || "Failed to update review");
      }
    } catch (err) {
      console.error("Failed to update review:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Edit Review</h3>
            <p className="text-sm text-gray-500 mt-0.5">Update your place review</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Place Name */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Place Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="e.g. Tanah Lot Temple"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
            />
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Rating <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition transform hover:scale-110"
                >
                  <svg
                    className={`w-8 h-8 ${star <= rating ? "fill-yellow-400" : "fill-gray-300"}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
              <span className="ml-2 self-center text-sm font-semibold text-amber-600">{rating}/5</span>
            </div>
          </div>

          {/* Review Title */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Review Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="One-line summary of your experience"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Your Review</label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A9B7F] resize-none"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Photos</label>

            {/* URL input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentImageUrl}
                onChange={(e) => setCurrentImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddImageUrl()}
                placeholder="Paste image URL here..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 font-medium whitespace-nowrap"
              >
                Add URL
              </button>
            </div>

            {/* File upload */}
            <label className="cursor-pointer bg-[#FFF5E9] border-2 border-dashed border-[#4A9B7F] rounded-xl px-4 py-6 flex flex-col items-center justify-center hover:bg-[#ffeacc] transition group mb-3">
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              {uploadingImage ? (
                <Loader2 className="w-8 h-8 text-[#4A9B7F] animate-spin" />
              ) : (
                <>
                  <svg
                    className="w-7 h-7 text-[#4A9B7F] mb-1 group-hover:scale-110 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-[#4A9B7F] font-semibold text-sm">Upload from Device</span>
                </>
              )}
            </label>

            {/* Previews */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                    <img 
                      src={url} 
                      alt={`Photo ${i + 1}`} 
                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                      onClick={() => openLightbox(url)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xl opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-full font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!placeName.trim() || isSubmitting}
            className="flex-1 bg-[#4A9B7F] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#3d8a6d] transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
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
