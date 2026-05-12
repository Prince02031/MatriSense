import React, { useState } from 'react';
import ReadAloudButton from '../voice/ReadAloudButton';

/**
 * FollowUpQuestionCard
 * Renders a single clinical follow-up question with interactive options and Voice assistance.
 * NOTE: Voice assistance highlights the current segment/option being read for 
 * accessibility, but DOES NOT auto-select the answer. Option selection remains 
 * a deliberate manual action by the user.
 */
const FollowUpQuestionCard = ({ question, value, onChange }) => {
  const [activeVoiceSegment, setActiveVoiceSegment] = useState(null);

  if (!question) return null;

  // Build audio segments for the question and options
  const segments = [
    { id: `${question.id}-question`, type: 'question', text: question.questionBn },
    ...(question.type === 'yes_no' 
      ? [
          { id: `${question.id}-option-true`, type: 'option', val: true, text: 'হ্যাঁ' },
          { id: `${question.id}-option-false`, type: 'option', val: false, text: 'না' }
        ]
      : (question.options || []).map((opt, i) => ({
          id: `${question.id}-option-${i}`,
          type: 'option',
          val: opt.value,
          text: opt.labelBn
        })))
  ];

  const handleSegmentStart = (seg) => setActiveVoiceSegment(seg);
  const handleSegmentEnd = () => setActiveVoiceSegment(null);

  const renderOptions = () => {
    switch (question.type) {
      case 'yes_no':
        return (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'হ্যাঁ (Yes)', val: true, color: 'teal', segId: `${question.id}-option-true` },
              { label: 'না (No)', val: false, color: 'rose', segId: `${question.id}-option-false` }
            ].map((opt) => (
              <button
                key={opt.val.toString()}
                onClick={() => onChange(question.id, opt.val)}
                className={`py-4 rounded-xl font-bold text-lg border-2 transition-all shadow-sm
                  ${value === opt.val 
                    ? `bg-${opt.color}-600 border-${opt.color}-700 text-white shadow-md` 
                    : `bg-white border-gray-200 text-gray-700 hover:border-${opt.color}-400`}
                  ${activeVoiceSegment?.id === opt.segId ? 'ring-4 ring-teal-400 bg-teal-50 scale-105' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      case 'single_choice':
      case 'severity_choice':
      case 'duration_choice':
        return (
          <div className="grid grid-cols-1 gap-3">
            {(question.options || []).map((opt, i) => {
              const segId = `${question.id}-option-${i}`;
              const isHighlighted = activeVoiceSegment?.id === segId;
              
              return (
                <button
                  key={opt.value}
                  onClick={() => onChange(question.id, opt.value)}
                  className={`w-full p-4 rounded-xl font-bold text-left border-2 transition-all flex items-center justify-between group
                    ${value === opt.value 
                      ? 'bg-teal-600 border-teal-700 text-white shadow-md' 
                      : 'bg-white border-gray-100 text-gray-700 hover:border-teal-400'}
                    ${isHighlighted ? 'ring-4 ring-teal-400 bg-teal-50 translate-x-2' : ''}`}
                >
                  <span>{opt.labelBn} <span className="font-normal opacity-70 ml-2">({opt.labelEn})</span></span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${value === opt.value ? 'bg-white border-white text-teal-600' : 'border-gray-200 group-hover:border-teal-300'}`}>
                    {value === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-teal-600"></div>}
                  </div>
                </button>
              );
            })}
          </div>
        );

      default:
        return <p className="text-rose-500 italic">Unknown question type: {question.type}</p>;
    }
  };

  const isQuestionHighlighted = activeVoiceSegment?.type === 'question';

  return (
    <div className={`p-6 bg-white border rounded-2xl shadow-sm space-y-6 transition-all duration-300
      ${isQuestionHighlighted ? 'border-teal-400 ring-4 ring-teal-50 bg-teal-50/20' : 'border-teal-100'}`}>
      
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-500 bg-teal-50 px-2 py-0.5 rounded">
            Required Context
          </span>
          <h3 className={`text-xl font-black leading-tight transition-colors ${isQuestionHighlighted ? 'text-teal-700' : 'text-teal-900'}`}>
            {question.questionBn}
          </h3>
        </div>
        
        {/* Voice Assistance Button */}
        <div className="flex-shrink-0">
          <ReadAloudButton 
            segments={segments} 
            onSegmentStart={handleSegmentStart}
            onSegmentEnd={handleSegmentEnd}
          />
        </div>
      </div>

      <div className="bg-gray-50/50 p-2 rounded-2xl">
        {renderOptions()}
      </div>
    </div>
  );
};

export default FollowUpQuestionCard;
