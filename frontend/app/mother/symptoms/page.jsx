import React from 'react';
import Link from 'next/link';

export default function SymptomInputPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
            <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 mt-10">
                <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">Report Symptoms</h1>

                <form className="flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">আপনার সমস্যা লিখুন (Describe your problem)</label>
                        <textarea
                            rows="4"
                            className="w-full border rounded-lg p-3 text-slate-800"
                            placeholder="আমার মাথা ব্যথা করছে এবং বমি বমি লাগছে..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Danger Signs (Check any that apply)</label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2"><input type="checkbox" /> রক্তপাত হচ্ছে (Bleeding)</label>
                            <label className="flex items-center gap-2"><input type="checkbox" /> তীব্র পেটব্যথা (Severe abdominal pain)</label>
                            <label className="flex items-center gap-2"><input type="checkbox" /> চোখে ঝাপসা দেখা (Blurred vision)</label>
                            <label className="flex items-center gap-2"><input type="checkbox" /> জ্বর (Fever)</label>
                        </div>
                    </div>

                    <div className="mt-2">
                        <Link
                            href="#"
                            className="block w-full text-center bg-rose-600 text-white font-medium py-3 rounded-lg hover:bg-rose-700"
                        >
                            Submit Symptoms
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
