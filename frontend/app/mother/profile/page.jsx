import React from 'react';
import Link from 'next/link';

export default function MotherProfilePage() {
    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
            <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 mt-10">
                <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">Mother Profile</h1>

                <form className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input type="text" className="w-full border rounded-lg p-2" placeholder="Full Name" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                        <input type="number" className="w-full border rounded-lg p-2" placeholder="Age" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Trimester</label>
                        <select className="w-full border rounded-lg p-2">
                            <option value="1">First Trimester</option>
                            <option value="2">Second Trimester</option>
                            <option value="3">Third Trimester</option>
                        </select>
                    </div>

                    <div className="mt-4">
                        <Link
                            href="/mother/symptoms"
                            className="block w-full text-center bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700"
                        >
                            Save & Continue
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
