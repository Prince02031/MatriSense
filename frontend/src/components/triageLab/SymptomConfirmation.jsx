import React from 'react';

/**
 * SymptomConfirmation
 * Displays detected symptoms as interactive chips for user validation.
 */
const SymptomConfirmation = ({ symptoms = [], source = 'llm', onConfirm, onAddSymptom, onRemoveSymptom }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
          Detected Symptoms
        </h3>
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm
          ${source === 'llm' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
          {source === 'llm' ? 'AI Extracted' : 'Keyword Fallback'}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {symptoms.length > 0 ? (
          symptoms.map((symptom) => (
            <div 
              key={symptom}
              className="group flex items-center gap-2 bg-white border-2 border-teal-600 px-4 py-2.5 rounded-full text-teal-900 font-bold shadow-sm hover:shadow-md transition-all animate-in fade-in zoom-in duration-300"
            >
              <span className="capitalize">{symptom.replace(/_/g, ' ')}</span>
              <button 
                onClick={() => onRemoveSymptom(symptom)}
                className="w-5 h-5 flex items-center justify-center rounded-full bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white transition-colors"
                title="Remove"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <div className="w-full py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-medium italic">
            No symptoms detected. Try adding some manually.
          </div>
        )}
        
        {/* Placeholder for Add Symptom Button */}
        <button 
          onClick={onAddSymptom}
          className="flex items-center gap-2 bg-gray-50 border-2 border-dashed border-gray-300 px-4 py-2.5 rounded-full text-gray-500 font-bold hover:bg-gray-100 hover:border-gray-400 transition-all group"
        >
          <svg className="w-4 h-4 group-hover:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Another
        </button>
      </div>

      <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
        <p className="text-sm text-gray-500 italic">
          Please confirm if the list above correctly represents your symptoms.
        </p>
        <button
          onClick={onConfirm}
          className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl shadow-lg transition-all transform active:scale-[0.98] uppercase tracking-wider"
        >
          Confirm and Continue
        </button>
      </div>
    </div>
  );
};

export default SymptomConfirmation;
