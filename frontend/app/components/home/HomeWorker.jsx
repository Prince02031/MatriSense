import Link from 'next/link';

export default function HomeWorker({ user }) {
  return (
    <main className="min-h-screen bg-matri-soft text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl bg-white p-10 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Health Worker</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                Dashboard (demo)
              </h1>
              <p className="mt-3 text-base text-slate-600">
                Welcome, {user?.name || 'Health worker'}. This is a demo dashboard—live cases will appear soon.
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/worker"
                  className="rounded-xl bg-matri-teal px-6 py-3 text-base font-semibold text-white shadow-soft"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            { label: 'New cases', value: '4' },
            { label: 'High risk', value: '1' },
            { label: 'Medium risk', value: '2' },
            { label: 'Low risk', value: '7' },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl bg-white p-6 shadow-soft">
              <p className="text-sm text-slate-500">{card.label}</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">{card.value}</h3>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Recent cases (demo)</h2>
          <div className="mt-4 grid gap-3">
            {['Ayesha · 28 weeks · headache', 'Sumi · 20 weeks · nausea', 'Ruby · 32 weeks · swollen feet'].map(
              (item) => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <span className="text-sm text-slate-700">{item}</span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Medium
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
