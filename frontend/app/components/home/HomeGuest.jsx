import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from '../LanguageToggle';

export default function HomeGuest() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-matri-soft text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-3xl bg-white p-10 shadow-soft">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1 text-sm font-semibold text-slate-600">
                {t.guestBadge}
              </div>
              <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
                {t.guestTitle}
              </h1>
              <p className="text-lg text-slate-600">
                {t.guestSubtitle}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="rounded-xl bg-matri-teal px-6 py-3 text-base font-semibold text-white shadow-soft"
                >
                  {t.login}
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl border border-slate-200 px-6 py-3 text-base font-semibold text-slate-700"
                >
                  {t.register}
                </Link>
              </div>
              <p className="text-sm text-slate-500">
                {t.roleHint}
              </p>
            </div>
            <LanguageToggle compact />
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">{t.stepsTitle}</h2>
            <span className="text-sm text-slate-500">{t.stepsProgress}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 w-1/6 rounded-full bg-matri-teal" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {t.steps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-matri-teal text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-slate-500">LOW</p>
            <h3 className="mt-2 text-xl font-bold text-matri-green">{t.low}</h3>
            <p className="mt-2 text-sm text-slate-600">{t.lowHelp}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-slate-500">MEDIUM</p>
            <h3 className="mt-2 text-xl font-bold text-matri-amber">{t.medium}</h3>
            <p className="mt-2 text-sm text-slate-600">{t.mediumHelp}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-slate-500">HIGH</p>
            <h3 className="mt-2 text-xl font-bold text-matri-rose">{t.high}</h3>
            <p className="mt-2 text-sm text-slate-600">{t.highHelp}</p>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-lg font-semibold text-rose-700">{t.disclaimerTitle}</h3>
          <p className="mt-2 text-sm text-rose-600">
            {t.disclaimerBody}
          </p>
        </section>
      </div>
    </main>
  );
}
