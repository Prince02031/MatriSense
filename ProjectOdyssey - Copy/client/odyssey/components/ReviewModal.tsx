"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** When true, the "Share to community feed" checkbox defaults to checked */
  defaultShareToFeed?: boolean;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, onSuccess, defaultShareToFeed = false }) => {
  const router = useRouter();
  const [newReview, setNewReview] = useState({ placeName: "", location: "", rating: 5, comment: "", images: [] as string[] });
  const [shareToFeed, setShareToFeed] = useState(defaultShareToFeed);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Reset form & shareToFeed toggle each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setShareToFeed(defaultShareToFeed);
    }
  }, [isOpen, defaultShareToFeed]);

  const handleSubmitReview = async () => {
    if (!newReview.placeName || !newReview.rating) return;
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newReview, shareToFeed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNewReview({ placeName: "", location: "", rating: 5, comment: "", images: [] });
          setCurrentImageUrl("");
          onClose();
          if (onSuccess) onSuccess();
          alert(shareToFeed ? "Review submitted and shared to the community feed!" : "Review submitted successfully!");
          // Only navigate away when not sharing to feed (avoid leaving the feed page)
          if (!shareToFeed) {
            router.push("/profile?tab=reviews");
          }
        } else {
          alert(data.error || "Failed to submit review");
        }
      } else {
        const errData = await res.json();
        alert(errData.error || "Server error occurred");
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddImage = () => {
    if (!currentImageUrl.trim()) return;
    setNewReview((prev) => ({ ...prev, images: [...prev.images, currentImageUrl.trim()] }));
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
          setNewReview((prev) => ({ ...prev, images: [...prev.images, data.imageUrl] }));
        }
      } else {
        console.error("Upload failed");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setNewReview((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Write a Review</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Place Name */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Place Name *</label>
            <input
              type="text"
              placeholder="e.g. Tanah Lot Temple"
              value={newReview.placeName}
              onChange={(e) => setNewReview({ ...newReview, placeName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Location</label>
            <input
              type="text"
              placeholder="e.g. Bali, Indonesia"
              value={newReview.location}
              onChange={(e) => setNewReview({ ...newReview, location: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
            />
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Rating *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                  className="focus:outline-none transition transform hover:scale-110"
                >
                  <svg
                    className={`w-8 h-8 ${star <= newReview.rating ? "fill-yellow-400" : "fill-gray-300"}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Your Review</label>
            <textarea
              placeholder="Share your experience..."
              rows={4}
              value={newReview.comment}
              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A9B7F] resize-none"
            />
          </div>

          {/* Image URLs */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Add Photos</label>

            {/* URL Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Paste image URL here..."
                value={currentImageUrl}
                onChange={(e) => setCurrentImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddImage()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
              />
              <button
                onClick={handleAddImage}
                type="button"
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 font-medium whitespace-nowrap"
              >
                Add URL
              </button>
            </div>

            {/* File Upload Button */}
            <div className="mb-2">
              <label className="cursor-pointer bg-[#FFF5E9] border-2 border-dashed border-[#4A9B7F] rounded-xl px-4 py-8 flex flex-col items-center justify-center hover:bg-[#ffeacc] transition group">
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                {uploadingImage ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A9B7F]"></div>
                ) : (
                  <>
                    <svg
                      className="w-8 h-8 text-[#4A9B7F] mb-2 group-hover:scale-110 transition"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-[#4A9B7F] font-semibold">Upload from Device</span>
                    <span className="text-gray-500 text-sm mt-1">Supports JPG, PNG</span>
                  </>
                )}
              </label>
            </div>

            {/* Image Previews */}
            {newReview.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newReview.images.map((url, index) => (
                  <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Share to Feed Toggle */}
        <div className="mt-5 flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <button
            type="button"
            onClick={() => setShareToFeed((v) => !v)}
            className={`relative inline-flex w-11 h-6 items-center rounded-full transition-colors flex-shrink-0 ${
              shareToFeed ? 'bg-[#4A9B7F]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full shadow transition-transform ${
                shareToFeed ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Share to community feed</p>
            <p className="text-xs text-gray-500">Your review will appear as a post in the Travel Feed</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-full font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitReview}
            disabled={!newReview.placeName || submittingReview}
            className="flex-1 bg-[#4A9B7F] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#3d8a6d] transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingReview ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
