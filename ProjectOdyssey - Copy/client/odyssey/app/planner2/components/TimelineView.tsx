"use client";

import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GripVertical, Trash2, Edit2, Plus, Car, Train, UtensilsCrossed, MapPin, Loader2 } from "lucide-react";

type ItineraryItem = {
    id: string;
    name: string;
    placeId?: string;
    category?: string;
    visitDurationMin?: number;
    time?: string;
    description?: string;
    source?: "db" | "ai";
    isBreak?: boolean;
    isCommute?: boolean;
    commuteMode?: "transit" | "driving";
    commuteDurationMin?: number;
    lat?: number;
    lng?: number;
    entryCost?: number | null;
    currency?: string;
};

interface TimelineViewProps {
    day: number;
    items: ItineraryItem[];
    onRemoveItem: (id: string) => void;
    onEditItem: (item: ItineraryItem) => void;
    onAddItem?: (time: string) => void;
    onUpdateItemTime?: (id: string, newTime: string) => void;
    onAddMealBreak?: (afterIndex?: number) => void;
    onCommuteChange?: (commuteId: string, mode: "transit" | "driving") => void;
    startTime?: string;
}

function SortableTimelineItem({ item, onRemove, onEdit, onAddMealBreak, index, onCommuteChange }: {
    item: ItineraryItem;
    onRemove: () => void;
    onEdit: () => void;
    onAddMealBreak?: (afterIndex: number) => void;
    index: number;
    onCommuteChange?: (mode: "transit" | "driving") => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id,
        data: { ...item, type: "timeline-item" },
        disabled: item.isCommute, // Commute cards are not draggable
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        height: item.isCommute
            ? '48px' // Fixed height for commute cards
            : `${Math.max(64, ((item.visitDurationMin || 60) / 60) * 64)}px`, // 64px per hour
    };

    const isBreak = item.isBreak;
    const isCommute = item.isCommute;

    // Commute card rendering
    if (isCommute) {
        const durationMin = item.commuteDurationMin || 15;
        return (
            <div ref={setNodeRef} style={style} className="group relative flex items-center gap-3 px-4 py-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 z-10 w-full">
                {/* Left icon */}
                <div className="text-gray-400">
                    {item.commuteMode === "driving" ? <Car size={16} /> : <Train size={16} />}
                </div>
                {/* Info */}
                <div className="flex-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono font-bold text-gray-400">{item.time || ""}</span>
                    <span>↔ {durationMin} min travel</span>
                </div>
                {/* Mode toggle */}
                {onCommuteChange && (
                    <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => onCommuteChange("driving")}
                            className={`px-2 py-1 text-xs flex items-center gap-1 transition-colors ${item.commuteMode === "driving" ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-400 hover:text-gray-600"}`}
                            title="Driving"
                        >
                            <Car size={12} />
                        </button>
                        <button
                            onClick={() => onCommuteChange("transit")}
                            className={`px-2 py-1 text-xs flex items-center gap-1 transition-colors ${item.commuteMode === "transit" ? "bg-green-50 text-green-600 font-bold" : "text-gray-400 hover:text-gray-600"}`}
                            title="Public Transit"
                        >
                            <Train size={12} />
                        </button>
                    </div>
                )}
                {/* Remove */}
                <button onClick={onRemove} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={12} />
                </button>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className={`group relative pl-4 pr-3 py-3 rounded-xl border shadow-sm hover:shadow-md transition-all flex gap-3 items-start z-10 w-full ${
            isBreak ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'
        }`}>
            {/* Time Indicator Line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${isBreak ? 'bg-orange-400' : 'bg-[#4A9B7F]'}`}></div>

            <div className="mt-1 text-gray-400 cursor-grab active:cursor-grabbing" {...listeners} {...attributes}>
                <GripVertical size={16} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                        isBreak ? 'text-orange-600 bg-orange-100' : 'text-[#4A9B7F] bg-[#4A9B7F]/10'
                    }`}>
                        {item.time || "09:00"}
                    </span>
                    {isBreak && <span className="text-base">🍽️</span>}
                    <h4 className="font-bold text-gray-900 text-sm truncate">{item.name}</h4>
                </div>
                {item.category && !isBreak && (
                    <p className="text-xs text-gray-500 mb-1">{item.category}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>{item.visitDurationMin || 60} min</span>
                    {item.lat && item.lng && (
                        <span className="flex items-center gap-1 text-gray-300">
                            <MapPin size={10} /> {item.lat.toFixed(2)}, {item.lng.toFixed(2)}
                        </span>
                    )}
                </div>
                {item.entryCost !== null && item.entryCost !== undefined && !isBreak && (
                    <div className="mt-1 text-xs font-semibold text-[#4A9B7F]">
                        {item.entryCost === 0
                            ? "Free entry"
                            : `${item.currency || ""} ${item.entryCost.toLocaleString()}`.trim()}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                {!isBreak && onAddMealBreak && (
                    <button
                        onClick={() => onAddMealBreak(index)}
                        className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"
                        title="Add meal break after this"
                    >
                        <UtensilsCrossed size={14} />
                    </button>
                )}
                {!isBreak && (
                    <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 size={14} />
                    </button>
                )}
                <button onClick={onRemove} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

export default function TimelineView({
    day,
    items = [],
    onRemoveItem,
    onEditItem,
    onAddItem,
    onAddMealBreak,
    onCommuteChange,
    startTime = "04:00"
}: TimelineViewProps) {
    // Derive START_HOUR from the startTime prop
    const START_HOUR = parseInt(startTime.split(':')[0], 10) || 4;
    const END_HOUR = 23;
    const HOUR_HEIGHT = 64; // px per hour
    const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
        const h = i + START_HOUR;
        return `${h.toString().padStart(2, '0')}:00`;
    });

    /** Convert a "HH:MM" string into a pixel offset from the start hour */
    const timeToTop = (time: string): number => {
        const [hStr, mStr] = (time || `${String(START_HOUR).padStart(2,'0')}:00`).split(':');
        const h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);
        return (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
    };

    // We need to render the droppable area for the DAY
    const { setNodeRef } = useDroppable({
        id: `timeline-day-${day}`,
    });

    // Sort items by time
    const safeItems = Array.isArray(items) ? items : [];
    const sortedItems = [...safeItems].sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">

            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    Day {day} <span className="text-xs font-normal text-gray-500 bg-white border px-2 py-0.5 rounded-full">{safeItems.filter(i => !i.isCommute).length} Activities</span>
                </h3>
                <button
                    onClick={() => onAddItem?.(startTime)}
                    className="text-xs flex items-center gap-1 font-medium text-[#4A9B7F] hover:bg-[#4A9B7F]/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <Plus size={14} /> Add Item
                </button>
            </div>

            {/* Scrollable Timeline */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative" ref={setNodeRef}>
                <SortableContext items={sortedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {/* Render Hour Slots Visualization */}
                    <div className="relative" style={{ minHeight: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
                        {/* Background Grid */}
                        <div className="absolute inset-0 pointer-events-none">
                            {hours.map((hour, i) => (
                                <div key={hour} className="flex h-16 border-b border-dashed border-gray-100 last:border-0" style={{ top: `${i * HOUR_HEIGHT}px`, position: 'absolute', width: '100%' }}>
                                    <span className="text-xs font-mono text-gray-300 w-12 pt-2">{hour}</span>
                                    <div className="flex-1"></div>
                                </div>
                            ))}
                        </div>

                        {/* Items Layer — absolutely positioned to align with hour ticks */}
                        {sortedItems.length > 0 ? (
                            sortedItems.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="absolute"
                                    style={{
                                        top: `${timeToTop(item.time || `${String(START_HOUR).padStart(2,'0')}:00`)}px`,
                                        left: '48px',
                                        right: '0px',
                                    }}
                                >
                                    <SortableTimelineItem
                                        item={item}
                                        index={idx}
                                        onRemove={() => onRemoveItem(item.id)}
                                        onEdit={() => onEditItem(item)}
                                        onAddMealBreak={onAddMealBreak}
                                        onCommuteChange={onCommuteChange ? (mode) => onCommuteChange(item.id, mode) : undefined}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 text-gray-400 italic" style={{ paddingLeft: '48px' }}>
                                Drag places here from the right
                            </div>
                        )}

                    </div>
                </SortableContext>
            </div>

            {/* Add Meal Break Button */}
            <div className="p-3 border-t border-gray-100">
                <button
                    onClick={() => onAddMealBreak?.()}
                    className="w-full text-sm flex items-center justify-center gap-2 font-medium text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors border border-dashed border-orange-300"
                >
                    🍽️ Add Meal Break
                </button>
            </div>
        </div>
    );
}
