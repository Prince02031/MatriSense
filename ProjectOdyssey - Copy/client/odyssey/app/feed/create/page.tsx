"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import PostEditor from '@/components/PostEditor';
import { createPost } from '@/hooks/usePosts';

export default function CreatePostPage() {
  const router = useRouter();
  const [content, setContent] = useState<any>(null);
  const [tripName, setTripName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setIsAuthenticated(true);
    setIsLoading(false);
  }, [router]);

  const handleContentChange = (newContent: any) => {
    setContent(newContent);
  };

  const handleSubmit = async () => {
    if (!content) {
      alert('Please write something before publishing!');
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
      alert('Please write some content before publishing!');
      return;
    }

    setIsSubmitting(true);

    const result = await createPost({
      type: 'blog',
      content,
      tripName: tripName.trim() || undefined,
    });

    if (result.success) {
      router.push(`/feed/${result.data?._id}`);
    } else {
      alert(result.error || 'Failed to create post');
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    // Save to localStorage as draft
    const draft = {
      content,
      tripName,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('postDraft', JSON.stringify(draft));
    alert('Draft saved! ✓');
  };

  // Load draft if exists
  useEffect(() => {
    if (!isAuthenticated) return;

    const savedDraft = localStorage.getItem('postDraft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (confirm('You have a saved draft. Would you like to continue editing it?')) {
          setContent(draft.content);
          setTripName(draft.tripName || '');
        }
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5E9] pt-8">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FFF5E9] pt-8 pb-20">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Feed</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Share Your Journey</h1>
              <p className="text-gray-600">Write about your amazing travel experiences</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>Publish Story</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Trip Name Input (Optional) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trip Name (Optional)
          </label>
          <input
            type="text"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="e.g., Summer Trip to Bali"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={100}
          />
        </div>

        {/* Editor */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <PostEditor
            onChange={handleContentChange}
            editable={!isSubmitting}
          />
        </div>

        {/* Tips */}
        <div className="mt-8 bg-teal-50 border border-teal-200 rounded-lg p-6">
          <h3 className="font-semibold text-teal-900 mb-3">✍️ Writing Tips</h3>
          <ul className="space-y-2 text-sm text-teal-800">
            <li>• Start with an engaging title (Heading 1)</li>
            <li>• Share your personal experiences and emotions</li>
            <li>• Include specific details about places, food, and people</li>
            <li>• Use photos to bring your story to life (coming soon!)</li>
            <li>• End with tips or recommendations for fellow travelers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
