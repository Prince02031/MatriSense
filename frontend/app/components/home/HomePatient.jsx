import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from '../LanguageToggle';

export default function HomePatient({ user }) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-matri-soft text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-3xl bg-white p-10 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">{t.patientWelcome}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                {t.patientWelcome}, {user?.name || 'মা'} 👋
              </h1>
              <p className="mt-3 text-base text-slate-600">
                {t.patientLead}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/patient"
                  className="rounded-xl border border-slate-200 px-6 py-3 text-base font-semibold text-slate-700"
                >
                  {t.goToDashboard}
                </Link>
                <Link
                  href="/dashboard/patient#symptoms"
                  className="rounded-xl bg-matri-teal px-6 py-3 text-base font-semibold text-white shadow-soft"
                >
                  {t.patientStart}
                </Link>
                <Link
                  href="/dashboard/patient#history"
                  className="rounded-xl border border-slate-200 px-6 py-3 text-base font-semibold text-slate-700"
                >
                  {t.patientHistory}
                </Link>
              </div>
            </div>
            <LanguageToggle compact />
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-sm text-slate-500">{t.patientStatus}</p>
            <h3 className="mt-2 text-2xl font-bold text-matri-green">LOW</h3>
            <p className="mt-2 text-sm text-slate-600">{t.lowHelp}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-sm text-slate-500">{t.patientNext}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{t.patientNextValue}</h3>
            <p className="mt-2 text-sm text-slate-600">{t.patientNextHelp}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-sm text-slate-500">{t.patientSupport}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{t.patientSupport}</h3>
            <p className="mt-2 text-sm text-slate-600">{t.patientSupportHelp}</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-lg font-semibold text-rose-700">{t.patientWarningTitle}</h3>
          <p className="mt-2 text-sm text-rose-600">
            {t.patientWarningBody}
          </p>
        </section>
      </div>
    </main>
  );
}
