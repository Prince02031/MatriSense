"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const POLL_INTERVAL = 5000; // 5 s polling

interface Member {
  id: string;
  username: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  message_type: string;
  mentions: string[];
  created_at: string;
}

interface Props {
  groupId: string;
  currentUserId: string;
  currentUsername: string;
  /** Approved member list — used for @mention autocomplete */
  members: Member[];
  /** Show a back-arrow in the header (used when launched from global group picker) */
  onBack?: () => void;
  /** Group name shown in the header */
  groupTitle?: string;
  /** Auto-open the chat panel on mount (e.g. after picking from group selector) */
  autoOpen?: boolean;
}

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

/** Deterministic pastel color from a string */
function avatarColor(str: string) {
  const colors = [
    "#4A9B7F", "#6366f1", "#f59e0b", "#ef4444",
    "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(username: string) {
  return username ? username.slice(0, 2).toUpperCase() : "??";
}

/** Parse @mention tokens in content and highlight them */
function renderContent(content: string, mentions: string[], members: Member[]) {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const name = part.slice(1);
      const isMentioned =
        name === "everyone" ||
        members.some((m) => m.username.toLowerCase() === name.toLowerCase());
      if (isMentioned) {
        return (
          <span key={i} className="font-semibold text-[#4A9B7F] bg-[#4A9B7F]/10 px-0.5 rounded">
            {part}
          </span>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}

export default function FloatingGroupChat({ groupId, currentUserId, currentUsername, members, onBack, groupTitle, autoOpen }: Props) {
  const [open, setOpen]           = useState(false);

  // Auto-open when navigating here from the global group picker
  useEffect(() => { if (autoOpen) setOpen(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [unread, setUnread]       = useState(0);
  const [mentionQuery, setMentionQuery]   = useState<string | null>(null);
  const [mentionIndex, setMentionIndex]   = useState(0);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const lastSeenAt = useRef<string | null>(null);

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API}/api/groups/${groupId}/messages`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        // Count unread when panel is closed
        if (!open && lastSeenAt.current) {
          const newCount = (data.messages || []).filter(
            (m: Message) => m.sender_id !== currentUserId && m.created_at > lastSeenAt.current!
          ).length;
          setUnread(newCount);
        }
      }
    } catch { /* ignore polling errors */ }
    finally { if (!silent) setLoading(false); }
  }, [groupId, open, currentUserId]);

  // Initial load when panel opens
  useEffect(() => {
    if (open) {
      fetchMessages();
      setUnread(0);
      // Mark seen timestamp
      lastSeenAt.current = new Date().toISOString();
    }
  }, [open, fetchMessages]);

  // Polling
  useEffect(() => {
    const id = setInterval(() => fetchMessages(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // Scroll to bottom on new messages when open
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // ── Send message ───────────────────────────────────────────────────────────
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    // Parse @mentions
    const mentionedNames = [...content.matchAll(/@(\w+)/g)].map((m) => m[1].toLowerCase());
    const mentions: string[] = [];
    for (const name of mentionedNames) {
      if (name === "everyone") { mentions.push("everyone"); continue; }
      const found = members.find((m) => m.username.toLowerCase() === name);
      if (found) mentions.push(found.id);
    }

    setSending(true);
    setInput("");
    setMentionQuery(null);
    try {
      const res = await fetch(`${API}/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, mentions }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        lastSeenAt.current = data.message.created_at;
      }
    } catch { /* show nothing, message will re-appear on next poll */ }
    finally { setSending(false); }
  }

  // ── @mention autocomplete ──────────────────────────────────────────────────
  const mentionSuggestions = mentionQuery !== null
    ? [
        { id: "everyone", username: "everyone" },
        ...members.filter((m) =>
          m.id !== currentUserId &&
          m.username.toLowerCase().startsWith(mentionQuery.toLowerCase())
        ),
      ].slice(0, 6)
    : [];

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInput(val);

    // Detect @mention trigger
    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  function applyMention(username: string) {
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const textBefore = input.slice(0, cursor);
    const replaced = textBefore.replace(/@(\w*)$/, `@${username} `);
    setInput(replaced + input.slice(cursor));
    setMentionQuery(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mentionQuery !== null && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionSuggestions.length); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); applyMention(mentionSuggestions[mentionIndex].username); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title="Group Chat"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{ height: "480px" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#4A9B7F] text-white">
            <div className="flex items-center gap-2">
              {/* Back to group picker */}
              {onBack && (
                <button onClick={onBack} className="hover:opacity-70 transition mr-1" title="Back to group list">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <span className="text-lg">💬</span>
              <span className="font-semibold text-sm truncate max-w-[160px]">{groupTitle || "Group Chat"}</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:opacity-70 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f9f9f7]">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Loading messages…
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
                <span className="text-3xl">💬</span>
                <span>No messages yet. Say hello!</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === currentUserId;
                const color = avatarColor(msg.sender_id);
                return (
                  <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative group/avatar">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-default"
                        style={{ backgroundColor: color }}
                      >
                        {initials(msg.sender_username || "?")}
                      </div>
                      {/* Hover tooltip — username */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-0.5 rounded-md whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 pointer-events-none transition-opacity z-10">
                        {msg.sender_username || "Unknown"}
                      </div>
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[75%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                      {!isOwn && (
                        <span className="text-xs text-gray-400 mb-0.5 px-1">{msg.sender_username}</span>
                      )}
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                          isOwn
                            ? "bg-[#1f2937] text-white rounded-tr-sm"
                            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                        }`}
                      >
                        {renderContent(msg.content, msg.mentions, members)}
                      </div>
                      <span className="text-xs text-gray-400 mt-0.5 px-1">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* @mention autocomplete */}
          {mentionQuery !== null && mentionSuggestions.length > 0 && (
            <div className="border-t border-gray-100 bg-white shadow-md max-h-36 overflow-y-auto">
              {mentionSuggestions.map((s, i) => (
                <button
                  key={s.id}
                  onMouseDown={(e) => { e.preventDefault(); applyMention(s.username); }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#4A9B7F]/10 transition ${i === mentionIndex ? "bg-[#4A9B7F]/10" : ""}`}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: avatarColor(s.id) }}
                  >
                    {s.username === "everyone" ? "✱" : initials(s.username)}
                  </div>
                  <span className="text-gray-700">@{s.username}</span>
                  {s.username === "everyone" && (
                    <span className="text-xs text-gray-400 ml-auto">notify all</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={sendMessage} className="px-3 py-2 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              {/* Current user avatar */}
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: avatarColor(currentUserId) }}
              >
                {initials(currentUsername)}
              </div>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message… (@ to mention)"
                  disabled={sending}
                  className="w-full px-3 py-2 pr-9 text-sm bg-gray-100 rounded-full border-none outline-none focus:ring-2 focus:ring-[#4A9B7F]/30 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#4A9B7F] disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition"
                >
                  {sending ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1 pl-9">Type @ to mention a member</p>
          </form>
        </div>
      )}
    </>
  );
}
