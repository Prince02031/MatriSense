"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Bell, X } from "lucide-react";

function getNotificationText(n: Notification): string {
  if (!n.actorId || typeof n.actorId === "string") return "Someone interacted with your content";
  const name = n.actorId.displayName || n.actorId.username || "Someone";
  if (n.type === "like") return `${name} liked your post`;
  if (n.type === "comment") return `${name} commented on your post`;
  if (n.type === "follow") return `${name} started following you`;
  return "New activity on your post";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    fetchNotifications, 
    markRead, 
    markAllRead, 
    clearAll 
  } = useNotifications(token);

  const handleOpen = () => {
    setOpen(prev => {
      if (!prev) fetchNotifications(); // load list on first open
      return !prev;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Click a notification → mark read → navigate to post or profile
  const handleClick = async (n: Notification) => {
    if (!n.read) await markRead(n._id);

    // For follow notifications, navigate to the follower's profile
    if (n.type === "follow") {
      const actorId = typeof n.actorId === "object" ? n.actorId?._id : n.actorId;
      if (actorId) {
        router.push(`/profile/${actorId}`);
      }
    } else {
      // For like/comment, navigate to the post
      const postId = typeof n.postId === "object" ? n.postId?._id : n.postId;
      if (postId) {
        router.push(`/feed?post=${postId}`);
      }
    }

    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell icon + badge */}
      <button 
        onClick={handleOpen} 
        className="relative p-2 text-gray-700 hover:bg-black/5 rounded-full transition-colors"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold shadow-md">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-xl border border-gray-200 z-[9999] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="font-semibold text-sm text-gray-900">Notifications</span>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-xs text-blue-500 hover:underline font-medium"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-red-500 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {loading && (
              <li className="px-4 py-6 text-center text-sm text-gray-400">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4A9B7F]"></div>
                </div>
              </li>
            )}
            {!loading && notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </li>
            )}
            {notifications.map(n => (
              <li 
                key={n._id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? "bg-blue-50/50" : ""}`}
              >
                {/* Actor avatar */}
                {(() => {
                  const actor = n.actorId && typeof n.actorId === "object" ? n.actorId : null;
                  return (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A9B7F] to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden">
                      {actor?.profileImage ? (
                        <img 
                          src={actor.profileImage}
                          alt={actor.username}
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span>
                          {actor?.username?.charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Text + time */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">
                    {getNotificationText(n)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
