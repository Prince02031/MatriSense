import React from 'react';

export default function WorkerDashboardPage() {
    return (
        <div className="min-h-screen bg-slate-100 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-800 mb-8">Health Worker Dashboard</h1>

                <div className="bg-white rounded-xl shadow p-6">
                    <h2 className="text-xl font-semibold mb-4 text-slate-700">Active Cases</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-3 px-4 font-medium text-slate-500">Patient</th>
                                    <th className="py-3 px-4 font-medium text-slate-500">Trimester</th>
                                    <th className="py-3 px-4 font-medium text-slate-500">Risk Level</th>
                                    <th className="py-3 px-4 font-medium text-slate-500">Status</th>
                                    <th className="py-3 px-4 font-medium text-slate-500">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b hover:bg-slate-50">
                                    <td className="py-4 px-4 text-slate-800">Mst. Rahima</td>
                                    <td className="py-4 px-4 text-slate-600">3rd</td>
                                    <td className="py-4 px-4"><span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-sm font-medium">HIGH</span></td>
                                    <td className="py-4 px-4 text-slate-600">ESCALATED</td>
                                    <td className="py-4 px-4"><button className="text-blue-600 hover:text-blue-800 font-medium">View Case</button></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="py-4 px-4 text-slate-800">Fatema Begum</td>
                                    <td className="py-4 px-4 text-slate-600">2nd</td>
                                    <td className="py-4 px-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-sm font-medium">MEDIUM</span></td>
                                    <td className="py-4 px-4 text-slate-600">STARTED</td>
                                    <td className="py-4 px-4"><button className="text-blue-600 hover:text-blue-800 font-medium">View Case</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
