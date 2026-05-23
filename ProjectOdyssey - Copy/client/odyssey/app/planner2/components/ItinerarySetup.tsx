"use client";

import React, { useState } from "react";
import { Calendar, Users, MapPin, ArrowRight } from "lucide-react";

interface ItinerarySetupProps {
    onCreate: (data: {
        title: string;
        startDate: string;
        days: number;
        travelers: number;
    }) => void;
    onCancel?: () => void;
}

export default function ItinerarySetup({ onCreate, onCancel }: ItinerarySetupProps) {
    const [title, setTitle] = useState("");
    const [startDate, setStartDate] = useState("");
    const [days, setDays] = useState(3);
    const [travelers, setTravelers] = useState(1);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title && days > 0 && travelers > 0) {
            onCreate({ title, startDate, days, travelers });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white p-6 rounded-2xl shadow-sm border border-black/5 animate-in fade-in zoom-in duration-300">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="w-16 h-16 bg-[#F5EFE7] rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🌍</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Plan Your Next Odyssey</h2>
                    <p className="mt-2 text-gray-600">Start by telling us a bit about your trip.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Trip Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4A9B7F] focus:border-[#4A9B7F] sm:text-sm transition-all"
                                placeholder="e.g. Summer in Paris"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Calendar className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="date"
                                    required
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4A9B7F] focus:border-[#4A9B7F] sm:text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    required
                                    value={days}
                                    onChange={(e) => setDays(parseInt(e.target.value))}
                                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4A9B7F] focus:border-[#4A9B7F] sm:text-sm transition-all"
                                />
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm pointer-events-none">
                                    Days
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Travelers */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Travelers</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Users className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="number"
                                min="1"
                                required
                                value={travelers}
                                onChange={(e) => setTravelers(parseInt(e.target.value))}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4A9B7F] focus:border-[#4A9B7F] sm:text-sm transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#4A9B7F] hover:bg-[#3d8269] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A9B7F] transition-all transform hover:scale-[1.02]"
                    >
                        Start Planning
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </button>

                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full flex justify-center items-center py-3 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
