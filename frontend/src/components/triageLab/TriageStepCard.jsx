import React from 'react';

/**
 * TriageStepCard
 * A focused container for a single triage step (Form, Extraction review, etc.)
 */
const TriageStepCard = ({ title, subtitle, children, footer, isActive = true }) => {
  return (
    <div className={`w-full max-w-2xl mx-auto mb-8 transition-all duration-300 transform 
      ${isActive ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none scale-95'}`}>
      
      <div className="bg-white rounded-xl shadow-lg border border-teal-50 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-teal-50 border-b border-teal-100">
          <h2 className="text-xl font-bold text-teal-900">{title}</h2>
          {subtitle && <p className="text-sm text-teal-700 mt-1">{subtitle}</p>}
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer/Actions */}
        {footer && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default TriageStepCard;
