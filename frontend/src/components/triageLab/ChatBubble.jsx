import React from 'react';

/**
 * ChatBubble Component
 * Displays a single message bubble in the triage flow.
 * Supports 'assistant' (AI) and 'user' (Patient) roles.
 */
const ChatBubble = ({ role = 'assistant', children, timestamp }) => {
  const isAssistant = role === 'assistant';

  return (
    <div className={`flex w-full mb-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'} gap-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm
          ${isAssistant ? 'bg-teal-600 text-white' : 'bg-gray-100 text-teal-800'}`}>
          {isAssistant ? 'AI' : 'You'}
        </div>

        {/* Bubble */}
        <div className={`relative p-4 rounded-2xl shadow-sm border
          ${isAssistant 
            ? 'bg-white border-teal-100 rounded-tl-none text-gray-800' 
            : 'bg-teal-600 border-teal-500 rounded-tr-none text-white'}`}>
          <div className="text-base leading-relaxed whitespace-pre-wrap">
            {children}
          </div>
          
          {timestamp && (
            <div className={`mt-1 text-[10px] opacity-60 ${isAssistant ? 'text-gray-500' : 'text-teal-100'}`}>
              {timestamp}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
