"use client";

import React, { useRef } from "react";
import { X, Printer } from "lucide-react";

type ItineraryItem = {
    id: string;
    name: string;
    category?: string;
    visitDurationMin?: number;
    time?: string;
    description?: string;
    isBreak?: boolean;
    isCommute?: boolean;
    commuteMode?: "transit" | "driving";
    commuteDurationMin?: number;
};

interface PrintViewProps {
    tripName: string;
    startDate?: string;
    days: number;
    travelers: number;
    schedule: Record<number, ItineraryItem[]>;
    onClose: () => void;
}

export default function PrintView({ tripName, startDate, days, travelers, schedule, onClose }: PrintViewProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    const getDateForDay = (dayNum: number): string => {
        if (!startDate) return `Day ${dayNum}`;
        const date = new Date(startDate);
        date.setDate(date.getDate() + dayNum - 1);
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatDuration = (min?: number): string => {
        if (!min) return "1h";
        if (min < 60) return `${min}min`;
        const h = Math.floor(min / 60);
        const m = min % 60;
        return m > 0 ? `${h}h ${m}min` : `${h}h`;
    };

    return (
        <>
            {/* Print-specific styles */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-content, .print-content * { visibility: visible; }
                    .print-content { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%;
                        padding: 40px;
                    }
                    .no-print { display: none !important; }
                    .print-page-break { page-break-before: always; }
                }
            `}</style>

            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto no-print">
                <div className="bg-white w-full max-w-3xl my-8 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 no-print">
                        <h2 className="font-bold text-lg text-gray-800">Print Preview</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                            >
                                <Printer size={16} /> Print
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Printable Content */}
                    <div ref={printRef} className="print-content p-8">
                        {/* Header */}
                        <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{tripName}</h1>
                            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                                {startDate && <span>📅 Starting {new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
                                <span>📆 {days} Day{days > 1 ? 's' : ''}</span>
                                <span>👥 {travelers} Traveler{travelers > 1 ? 's' : ''}</span>
                            </div>
                        </div>

                        {/* Days */}
                        {Array.from({ length: days }, (_, i) => i + 1).map((dayNum, dayIdx) => {
                            const items = schedule[dayNum] || schedule[String(dayNum) as any] || [];
                            const dayItems = Array.isArray(items) ? items : [];
                            
                            return (
                                <div key={dayNum} className={`mb-8 ${dayIdx > 0 ? 'print-page-break' : ''}`}>
                                    <div className="flex items-baseline gap-3 mb-4">
                                        <h2 className="text-xl font-bold text-gray-900">Day {dayNum}</h2>
                                        <span className="text-sm text-gray-500">{getDateForDay(dayNum)}</span>
                                        <span className="text-xs text-gray-400 ml-auto">{dayItems.filter(i => !i.isCommute).length} activities</span>
                                    </div>

                                    {dayItems.length > 0 ? (
                                        <table className="w-full text-sm border-collapse">
                                            <thead>
                                                <tr className="border-b-2 border-gray-300">
                                                    <th className="text-left py-2 pr-4 font-semibold text-gray-600 w-20">Time</th>
                                                    <th className="text-left py-2 pr-4 font-semibold text-gray-600">Activity</th>
                                                    <th className="text-left py-2 pr-4 font-semibold text-gray-600 w-24">Duration</th>
                                                    <th className="text-left py-2 font-semibold text-gray-600 w-28">Category</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dayItems.map((item, idx) => (
                                                    <tr key={item.id || idx} className={`border-b border-gray-100 ${item.isCommute ? 'text-gray-400 italic' : ''} ${item.isBreak ? 'bg-orange-50' : ''}`}>
                                                        <td className="py-2 pr-4 font-mono text-xs">{item.time || '—'}</td>
                                                        <td className="py-2 pr-4 font-medium">
                                                            {item.isCommute ? `↔ ${item.commuteMode === 'driving' ? '🚗' : '🚌'} Travel` : 
                                                             item.isBreak ? `🍽️ ${item.name}` : item.name}
                                                        </td>
                                                        <td className="py-2 pr-4">{formatDuration(item.isCommute ? item.commuteDurationMin : item.visitDurationMin)}</td>
                                                        <td className="py-2 text-gray-500">{item.isCommute ? item.commuteMode : item.category || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="text-gray-400 italic py-4">No activities scheduled</p>
                                    )}
                                </div>
                            );
                        })}

                        {/* Footer */}
                        <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
                            Generated by Project Odyssey · {new Date().toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
