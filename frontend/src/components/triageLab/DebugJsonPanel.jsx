import React, { useState } from 'react';

/**
 * DebugJsonPanel
 * A collapsible panel for displaying pretty-printed JSON data.
 */
const DebugJsonPanel = ({ title, data, initialExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [copied, setCopied] = useState(false);

  const isEmpty = !data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0);

  const handleCopy = () => {
    if (isEmpty) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1e293b] rounded-xl overflow-hidden mb-3 border border-gray-800 shadow-sm transition-all duration-300">
      {/* Header */}
      <div 
        className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors
          ${isExpanded ? 'bg-[#0f172a]' : 'hover:bg-[#243146]'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isEmpty ? 'bg-gray-600' : 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]'}`}></div>
          <span className={`text-xs font-black uppercase tracking-widest ${isEmpty ? 'text-gray-500' : 'text-teal-400'}`}>
            {title}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {!isEmpty && isExpanded && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="text-[10px] text-gray-500 hover:text-teal-400 transition-colors uppercase font-bold flex items-center gap-1"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-[#1e293b] border-t border-gray-800/50">
          {isEmpty ? (
            <div className="text-gray-600 italic text-xs py-2 px-1">
              Not generated yet or empty...
            </div>
          ) : (
            <pre className="text-[11px] leading-relaxed font-mono text-teal-300/90 whitespace-pre-wrap break-all custom-scrollbar overflow-auto max-h-[400px]">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugJsonPanel;
