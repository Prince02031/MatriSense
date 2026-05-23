"use client";

import React from "react";
import { Plus, Minus } from "lucide-react";

interface DayTabsProps {
    currentDay: number;
    totalDays: number;
    onDaySelect: (day: number) => void;
    onAddDay?: () => void;
    onRemoveDay?: () => void;
    startDate?: string;
}

export default function DayTabs({ currentDay, totalDays, onDaySelect, onAddDay, onRemoveDay, startDate }: DayTabsProps) {
    const days = Array.from({ length: totalDays }, (_, i) => i + 1);

    // Calculate actual date for each day tab
    const getDateLabel = (dayNum: number): string | null => {
        if (!startDate) return null;
        const date = new Date(startDate);
        date.setDate(date.getDate() + dayNum - 1);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
            {days.map((day) => {
                const dateLabel = getDateLabel(day);
                return (
                    <button
                        key={day}
                        onClick={() => onDaySelect(day)}
                        className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-200 flex flex-col items-center gap-0.5 ${currentDay === day
                                ? "bg-black text-white shadow-md transform scale-105"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            }`}
                    >
                        <span>Day {day}</span>
                        {dateLabel && (
                            <span className={`text-[10px] ${currentDay === day ? "text-gray-300" : "text-gray-400"}`}>
                                {dateLabel}
                            </span>
                        )}
                    </button>
                );
            })}

            {/* Add / Remove Day Buttons */}
            <div className="flex items-center gap-1 ml-1">
                {onAddDay && (
                    <button
                        onClick={onAddDay}
                        className="w-9 h-9 rounded-full bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 hover:border-green-300 flex items-center justify-center transition-all"
                        title="Add a day"
                    >
                        <Plus size={16} />
                    </button>
                )}
                {onRemoveDay && totalDays > 1 && (
                    <button
                        onClick={onRemoveDay}
                        className="w-9 h-9 rounded-full bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:border-red-300 flex items-center justify-center transition-all"
                        title="Remove last day"
                    >
                        <Minus size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
