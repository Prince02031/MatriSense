"use client";

import React, { useState, useEffect } from 'react';
import { Send, Trash2, Edit2, X } from 'lucide-react';
import { useComments, addComment, deleteComment, updateComment, type Comment } from '@/hooks/useComments';

interface CommentSectionProps {
  postId: string;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentSection({ postId, onCommentCountChange }: CommentSectionProps) {
  const { comments, loading, error, refresh } = useComments(postId);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID from token (you might want to decode JWT or fetch from profile)
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

  useEffect(() => {
    if (onCommentCountChange) {
      onCommentCountChange(comments.length);
    }
  }, [comments.length, onCommentCountChange]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCommentText.trim()) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to comment');
      return;
    }

    setIsSubmitting(true);
    const result = await addComment(postId, newCommentText.trim());
    
    if (result.success) {
      setNewCommentText('');
      refresh();
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('commentAdded', { detail: { postId } }));
    } else {
      alert(result.error || 'Failed to add comment');
    }
    
    setIsSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    const result = await deleteComment(commentId);
    if (result.success) {
      refresh();
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('commentDeleted', { detail: { postId } }));
    } else {
      alert(result.error || 'Failed to delete comment');
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.text);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) return;

    const result = await updateComment(commentId, editText.trim());
    if (result.success) {
      setEditingCommentId(null);
      setEditText('');
      refresh();
    } else {
      alert(result.error || 'Failed to update comment');
    }
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return commentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              {editingCommentId === comment._id ? (
                // Edit mode
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUpdateComment(comment._id)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                      {comment.userId.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {comment.userId.username}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        
                        {currentUserId === comment.userId._id && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartEdit(comment)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit comment"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-700 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Write a comment..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
          maxLength={500}
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">
            {newCommentText.length}/500
          </span>
          <button
            type="submit"
            disabled={isSubmitting || !newCommentText.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Posting...' : 'Comment'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
