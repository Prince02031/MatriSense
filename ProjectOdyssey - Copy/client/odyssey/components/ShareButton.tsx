"use client";

import React, { useState } from 'react';
import { Share2, Facebook, Twitter, MessageCircle, Link as LinkIcon, X } from 'lucide-react';

interface ShareButtonProps {
  postId: string;
  postTitle: string;
  className?: string;
}

export default function ShareButton({ postId, postTitle, className = '' }: ShareButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const postUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/feed/${postId}`
    : '';

  const shareText = `Check out this travel story: ${postTitle}`;

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedTitle = encodeURIComponent(postTitle);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        // Facebook's sharer.php only reads the URL and pulls description from Open Graph meta tags
        // URL parameters like 'quote' don't work without Facebook SDK
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'native':
        // Use Web Share API if available
        if (navigator.share) {
          navigator.share({
            title: postTitle,
            text: shareText,
            url: postUrl,
          }).catch(err => console.log('Error sharing:', err));
          setShowShareMenu(false);
          return;
        }
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      setShowShareMenu(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(postUrl).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 2000);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowShareMenu(!showShareMenu);
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 hover:bg-white/80 transition-all duration-200 ${className}`}
        title="Share post"
      >
        <Share2 className="w-5 h-5 text-gray-600" />
      </button>

      {/* Share Menu */}
      {showShareMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100]"
            onClick={(e) => {
              e.stopPropagation();
              setShowShareMenu(false);
            }}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-[101] w-56">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <h4 className="font-semibold text-gray-900 text-sm">Share to</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareMenu(false);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-1">
              {/* Facebook */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare('facebook');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Facebook className="w-4 h-4 text-white fill-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">Facebook</span>
              </button>

              {/* Twitter */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare('twitter');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-sky-50 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center">
                  <Twitter className="w-4 h-4 text-white fill-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">Twitter</span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare('whatsapp');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-green-50 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white fill-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">WhatsApp</span>
              </button>

              {/* Divider */}
              <div className="border-t border-gray-100 my-2" />

              {/* Copy Link */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyLink();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {copied ? '✓ Link Copied!' : 'Copy Link'}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
