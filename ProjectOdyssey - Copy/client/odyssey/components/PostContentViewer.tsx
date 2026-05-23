"use client";

import React from 'react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

interface PostContentViewerProps {
  content: any;
}

export default function PostContentViewer({ content }: PostContentViewerProps) {
  const editor = useCreateBlockNote({
    initialContent: content?.content || [],
  });

  return (
    <div className="prose prose-lg max-w-none">
      <BlockNoteView
        editor={editor}
        editable={false}
        theme="light"
      />

      <style jsx global>{`
        .bn-container {
          padding: 0 !important;
        }

        .bn-editor {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .prose {
          color: #374151;
          line-height: 1.8;
        }

        .prose h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 2rem 0 1.5rem 0;
          color: #111827;
          letter-spacing: -0.5px;
        }

        .prose h2 {
          font-size: 2rem;
          font-weight: 700;
          margin: 1.5rem 0 1rem 0;
          color: #1f2937;
        }

        .prose h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem 0;
          color: #374151;
        }

        .prose p {
          font-size: 1.0625rem;
          line-height: 1.8;
          margin: 1rem 0;
          color: #4b5563;
        }

        .prose ul,
        .prose ol {
          margin: 1.25rem 0;
          padding-left: 1.75rem;
        }

        .prose li {
          margin: 0.5rem 0;
          font-size: 1.0625rem;
          color: #4b5563;
        }

        .prose li > strong {
          font-weight: 700;
          color: #374151;
        }

        .prose blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1.25rem;
          margin: 1.5rem 0;
          color: #6b7280;
          font-style: italic;
          background: #f0f9ff;
          padding: 1rem 1.25rem;
          border-radius: 0.5rem;
          font-size: 1.0625rem;
        }

        .prose em {
          color: #6366f1;
          font-style: italic;
        }

        .prose strong {
          color: #111827;
          font-weight: 700;
        }

        .prose code {
          background: #f3f4f6;
          padding: 0.125rem 0.5rem;
          border-radius: 0.375rem;
          font-family: "Roboto Mono", "Monaco", "Courier New", monospace;
          font-size: 0.875em;
          color: #d946ef;
        }

        .prose pre {
          background: #1f2937;
          color: #f3f4f6;
          padding: 1.5rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          margin: 1.5rem 0;
          border: 1px solid #374151;
        }

        .prose pre code {
          background: transparent;
          padding: 0;
          color: #f3f4f6;
          font-size: 0.9375rem;
        }

        .prose a {
          color: #2563eb;
          text-decoration: none;
          border-bottom: 1px dotted #2563eb;
          transition: color 0.2s;
        }

        .prose a:hover {
          color: #1d4ed8;
        }

        .prose hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 2rem 0;
        }

        .bn-block-content {
          padding: 0;
        }
      `}</style>
    </div>
  );
}
