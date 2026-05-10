import React from 'react';

/**
 * FollowUpQuestionCard
 * Renders a single clinical follow-up question with interactive options.
 */
const FollowUpQuestionCard = ({ question, value, onChange }) => {
  if (!question) return null;

  const renderOptions = () => {
    switch (question.type) {
      case 'yes_no':
        return (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'হ্যাঁ (Yes)', val: true, color: 'teal' },
              { label: 'না (No)', val: false, color: 'rose' }
            ].map((opt) => (
              <button
                key={opt.val.toString()}
                onClick={() => onChange(question.id, opt.val)}
                className={`py-4 rounded-xl font-bold text-lg border-2 transition-all shadow-sm
                  ${value === opt.val 
                    ? `bg-${opt.color}-600 border-${opt.color}-700 text-white shadow-md` 
                    : `bg-white border-gray-200 text-gray-700 hover:border-${opt.color}-400`}`}
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
            {question.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange(question.id, opt.value)}
                className={`w-full p-4 rounded-xl font-bold text-left border-2 transition-all flex items-center justify-between group
                  ${value === opt.value 
                    ? 'bg-teal-600 border-teal-700 text-white shadow-md' 
                    : 'bg-white border-gray-100 text-gray-700 hover:border-teal-400'}`}
              >
                <span>{opt.labelBn} <span className="font-normal opacity-70 ml-2">({opt.labelEn})</span></span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                  ${value === opt.value ? 'bg-white border-white text-teal-600' : 'border-gray-200 group-hover:border-teal-300'}`}>
                  {value === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-teal-600"></div>}
                </div>
              </button>
            ))}
          </div>
        );

      default:
        return <p className="text-rose-500 italic">Unknown question type: {question.type}</p>;
    }
  };

  return (
    <div className="p-6 bg-white border border-teal-100 rounded-2xl shadow-sm space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-teal-500 bg-teal-50 px-2 py-0.5 rounded">
          Required Context
        </span>
        <h3 className="text-xl font-black text-teal-900 leading-tight">
          {question.questionBn}
        </h3>
      </div>

      <div className="bg-gray-50/50 p-2 rounded-2xl">
        {renderOptions()}
      </div>
    </div>
  );
};

export default FollowUpQuestionCard;
