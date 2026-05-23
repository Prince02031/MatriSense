"use client";

import React from 'react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { PartialBlock } from "@blocknote/core";
import "@blocknote/mantine/style.css";

interface PostEditorProps {
  initialContent?: any;
  onChange?: (content: any) => void;
  editable?: boolean;
}

export default function PostEditor({ initialContent, onChange, editable = true }: PostEditorProps) {
  const initialBlocks: PartialBlock[] = initialContent
    ? (initialContent.content || [])
    : [
        {
          type: "heading",
          props: { level: 1 },
          content: [{ type: "text", text: "My Travel Story", styles: {} }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Share your amazing journey...", styles: {} }],
        },
      ];

  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
  });

  const handleChange = () => {
    if (onChange) {
      const content = {
        type: "doc",
        content: editor.document,
      };
      onChange(content);
    }
  };

  return (
    <div className="blocknote-editor-container">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        editable={editable}
        theme="light"
      />
      
      <style jsx global>{`
        .blocknote-editor-container {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }
        
        .bn-container {
          min-height: 400px;
          padding: 20px;
        }
        
        .bn-editor {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        
        .bn-block-content h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 1rem 0;
          color: #111;
        }
        
        .bn-block-content h2 {
          font-size: 2rem;
          font-weight: 600;
          margin: 0.875rem 0;
          color: #111;
        }
        
        .bn-block-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.75rem 0;
          color: #111;
        }
        
        .bn-block-content p {
          font-size: 1.125rem;
          line-height: 1.75;
          margin: 0.5rem 0;
          color: #374151;
        }
        
        .bn-block-content ul,
        .bn-block-content ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .bn-block-content li {
          font-size: 1.125rem;
          line-height: 1.75;
          color: #374151;
        }
        
        .bn-block-content blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }
        
        .bn-block-content code {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: "Roboto Mono", monospace;
          font-size: 0.875em;
        }
        
        .bn-block-content pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        
        .bn-block-content pre code {
          background: transparent;
          padding: 0;
          color: inherit;
        }
        
        .bn-side-menu {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .bn-formatting-toolbar {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .bn-button:hover {
          background: #f3f4f6;
        }
        
        .bn-button[data-active="true"] {
          background: #dbeafe;
          color: #1e40af;
        }
      `}</style>
    </div>
  );
}
