import React from 'react';

/**
 * PipelineStatusBar
 * Shows the current progress through the multi-stage triage pipeline.
 */
const PipelineStatusBar = ({ currentStatus }) => {
  const steps = [
    { id: 'profile_setup', label: 'Profile' },
    { id: 'symptom_input', label: 'Input' },
    { id: 'extracting', label: 'Analyze' },
    { id: 'confirm_symptoms', label: 'Review' },
    { id: 'followup_questions', label: 'Probing' },
    { id: 'running_triage', label: 'Decision' },
    { id: 'final_result', label: 'Advice' }
  ];

  const getCurrentIndex = () => steps.findIndex(s => s.id === currentStatus);
  const currentIndex = getCurrentIndex();

  return (
    <div className="w-full max-w-3xl mx-auto py-8">
      <div className="relative flex justify-between">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-teal-500 -translate-y-1/2 z-0 transition-all duration-700 ease-in-out"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {/* Step Circles */}
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500
                ${isCompleted ? 'bg-teal-500 border-teal-600 text-white' : 
                  isCurrent ? 'bg-white border-teal-600 text-teal-600 ring-4 ring-teal-50' : 
                  'bg-white border-gray-200 text-gray-300'}`}>
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-[10px] font-black">{index + 1}</span>
                )}
              </div>
              <span className={`absolute top-10 text-[10px] font-black uppercase tracking-tighter whitespace-nowrap transition-colors
                ${isCurrent ? 'text-teal-900' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineStatusBar;
