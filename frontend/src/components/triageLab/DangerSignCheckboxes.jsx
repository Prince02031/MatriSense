import React from 'react';

/**
 * DangerSignCheckboxes
 * Visual checklist for common danger signs.
 */
const DangerSignCheckboxes = ({ selected = [], onChange }) => {
  const commonSigns = [
    { id: 'vaginal_bleeding', labelBn: 'যোনিপথে রক্তপাত', labelEn: 'Vaginal Bleeding' },
    { id: 'convulsion', labelBn: 'খিঁচুনি', labelEn: 'Convulsion' },
    { id: 'severe_headache', labelBn: 'তীব্র মাথাব্যথা', labelEn: 'Severe Headache' },
    { id: 'blurred_vision', labelBn: 'চোখে ঝাপসা দেখা', labelEn: 'Blurred Vision' },
    { id: 'severe_abdominal_pain', labelBn: 'তীব্র পেটব্যথা', labelEn: 'Severe Abdominal Pain' },
    { id: 'reduced_fetal_movement', labelBn: 'বাচ্চার নড়াচড়া কমে যাওয়া', labelEn: 'Reduced Fetal Movement' }
  ];

  const toggleSign = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="bg-orange-50/30 border border-orange-100 rounded-2xl p-6">
      <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Common Danger Signs (বিপদ সংকেত)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {commonSigns.map((sign) => (
          <button
            key={sign.id}
            onClick={() => toggleSign(sign.id)}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left group
              ${selected.includes(sign.id)
                ? 'bg-orange-600 border-orange-700 text-white shadow-md'
                : 'bg-white border-orange-100 text-gray-700 hover:border-orange-300'}`}
          >
            <div className="flex flex-col">
              <span className={`font-bold ${selected.includes(sign.id) ? 'text-white' : 'text-gray-900'}`}>
                {sign.labelBn}
              </span>
              <span className={`text-[11px] uppercase tracking-wide ${selected.includes(sign.id) ? 'text-orange-100' : 'text-gray-500'}`}>
                {sign.labelEn}
              </span>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
              ${selected.includes(sign.id) ? 'bg-white border-white text-orange-600' : 'border-orange-200 group-hover:border-orange-400'}`}>
              {selected.includes(sign.id) && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DangerSignCheckboxes;
