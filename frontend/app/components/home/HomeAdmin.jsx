import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function HomeAdmin({ user }) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-matri-soft text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl bg-white p-10 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Admin</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                {t.adminTitle}
              </h1>
              <p className="mt-3 text-base text-slate-600">
                {t.patientWelcome}, {user?.name || 'অ্যাডমিন'}। {t.adminSubtitle}
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/admin"
                  className="rounded-xl bg-matri-teal px-6 py-3 text-base font-semibold text-white shadow-soft"
                >
                  {t.goToDashboard}
                </Link>
              </div>
            </div>
            <Link
              href="/settings"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {t.languageLabel}
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-sm text-slate-500">{t.adminUsers}</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">—</h3>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-sm text-slate-500">{t.adminCases}</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">—</h3>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-sm text-slate-500">{t.adminReferrals}</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">—</h3>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">{t.adminNotes}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
            {t.adminNoteItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
