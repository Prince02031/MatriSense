'use client';

import { useLanguage } from '../context/LanguageContext';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <main className="min-h-screen bg-matri-soft text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-3xl bg-white p-10 shadow-soft">
          <h1 className="text-3xl font-bold text-slate-900">{t.languageLabel}</h1>
          <p className="mt-2 text-sm text-slate-600">{t.languageHelper}</p>

          <div className="mt-8 rounded-2xl border border-slate-200 p-6">
            <p className="text-sm font-semibold text-slate-500">{t.languageToggleLabel}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
                  language === 'bn'
                    ? 'border-matri-teal bg-matri-teal/10 text-matri-teal'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                {t.bangla}
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
                  language === 'en'
                    ? 'border-matri-teal bg-matri-teal/10 text-matri-teal'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                {t.english}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">{t.saveNote}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
