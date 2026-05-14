'use client';

import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle({ compact = false }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <span className="text-xs font-semibold text-slate-500">{t.languageToggleLabel}</span>
      )}
      <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setLanguage('bn')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            language === 'bn' ? 'bg-matri-teal text-white' : 'text-slate-600'
          }`}
        >
          বাংলা
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            language === 'en' ? 'bg-matri-teal text-white' : 'text-slate-600'
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
