import React from 'react';

/**
 * ProfileMockForm
 * Allows setting up the patient context for the triage lab.
 */
const ProfileMockForm = ({ profile, onChange, onSubmit }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      onChange({ 
        ...profile, 
        riskFactors: { ...profile.riskFactors, [name]: checked } 
      });
    } else {
      onChange({ ...profile, [name]: value });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Trimester</label>
          <select 
            name="trimester" 
            value={profile.trimester} 
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
          >
            <option value="unknown">Unknown</option>
            <option value="first">First (0-13 weeks)</option>
            <option value="second">Second (14-26 weeks)</option>
            <option value="third">Third (27-40 weeks)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Weeks</label>
          <input 
            type="number" 
            name="gestationalWeek" 
            value={profile.gestationalWeek || ''} 
            onChange={handleChange}
            placeholder="e.g. 32"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Risk Factors</label>
        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          {[
            { id: 'hypertension', label: 'Hypertension' },
            { id: 'diabetes', label: 'Diabetes' },
            { id: 'anemia', label: 'Severe Anemia' },
            { id: 'preEclampsiaHistory', label: 'History of Pre-eclampsia' }
          ].map((rf) => (
            <label key={rf.id} className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                name={rf.id} 
                checked={!!profile.riskFactors?.[rf.id]} 
                onChange={handleChange}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-teal-700 transition-colors">{rf.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button 
        onClick={onSubmit}
        className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transform active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        Start Triage Simulation
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
};

export default ProfileMockForm;
