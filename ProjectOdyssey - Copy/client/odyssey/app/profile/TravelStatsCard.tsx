"use strict";

import React, { useState } from "react";
import {
    Trophy,
    Flame,
    TrendingUp,
    Award,
    Users,
    Zap
} from "lucide-react";
import BadgeModal from "./BadgeModal";

interface Badge {
    id: string;
    name: string;
    emoji: string;
    description: string;
    earningDate: string;
    isNew: boolean;
}

interface TravelStatsCardProps {
    xp?: number;
    level?: number;
    badges?: Badge[];
    efficiency?: number;   // dynamic — replaces hardcoded 92
    streak?: number;       // dynamic — replaces hardcoded 14
    personalBest?: number; // for "Personal Best!" badge logic
    loading?: boolean;     // skeleton state while fetching
}

const TravelStatsCard: React.FC<TravelStatsCardProps> = ({
    xp = 0,
    level = 1, badges = [],
    efficiency = 0,
    streak = 0,
    personalBest = 0,
    loading = false,
}) => {
    const [showBadgeModal, setShowBadgeModal] = useState(false);

    // Determine dynamic title based on XP
    const getTravelTitle = (points: number) => {
        if (points >= 6000) return "Master Nomad";
        if (points >= 3000) return "World Roamer";
        if (points >= 1000) return "Route Builder";
        return "New Explorer";
    };

    const travelTitle = getTravelTitle(xp);

    // Get most recent badge (first in array since they're sorted by date)
    const topBadge = badges && badges.length > 0 ? badges[0] : null;

    // Badge derived from level (still dynamic via xp/level prop)
    const badge = {
        name: level > 10 ? "Legendary Explorer" : level > 5 ? "Veteran Voyager" : "Elite Voyager",
        level: level > 10 ? "Diamond" : level > 5 ? "Platinum" : "Gold",
        icon: level > 10 ? "💎" : "🏆"
    };

    // Leaderboard stays static (not in scope for this task)
    const leaderboard = { rank: 4, totalFriends: 12 };

    // Streak message
    const streakMessage = streak > 0 && streak >= personalBest ? "Personal Best!" : "Keep it up!";

    return (
        <>
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 overflow-hidden relative">
            {/* Decorative background element */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#4A9B7F]/5 rounded-full blur-3xl"></div>

            {/* Travel Title Header */}
            <div className="mb-6 pb-6 border-b border-gray-100 flex justify-between items-end relative">
                <div>
                    <p className="text-[10px] font-black text-[#4A9B7F] uppercase tracking-[0.2em] mb-1">Current Ranking</p>
                    <h2 className="text-3xl font-black text-gray-900 leading-none">{travelTitle}</h2>
                </div>
                <div className="bg-[#4A9B7F] text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                    Level {level}
                </div>
            </div>

            {/* Top Header Section: Efficiency & XP */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8 relative">
                <div className="flex-1 bg-[#F0F7F4] p-5 rounded-2xl flex items-center gap-4 transition-transform hover:scale-[1.02]">
                    <div className="w-12 h-12 bg-[#4A9B7F]/10 rounded-xl flex items-center justify-center">
                        <TrendingUp className="text-[#4A9B7F] w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Travel Efficiency</p>
                        <div className="flex items-center gap-2">
                            {loading ? (
                                <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
                            ) : (
                                <span className="text-2xl font-black text-gray-900">{efficiency}%</span>
                            )}
                            <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#4A9B7F] rounded-full transition-all duration-700"
                                    style={{ width: `${efficiency}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-[#FFF5E9] p-5 rounded-2xl flex items-center gap-4 transition-transform hover:scale-[1.02]">
                    <div className="w-12 h-12 bg-[#FF8C42]/10 rounded-xl flex items-center justify-center">
                        <Zap className="text-[#FF8C42] w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Points Earned</p>
                        <p className="text-2xl font-black text-gray-900">{xp.toLocaleString()} <span className="text-sm font-bold text-[#FF8C42]">XP</span></p>
                    </div>
                </div>
            </div>

            {/* Main Grid Section: Badge, Streak, Leaderboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Badge Section - Clickable */}
                <div
                    onClick={() => setShowBadgeModal(true)}
                    className="group bg-gray-50 p-6 rounded-2xl border border-transparent hover:border-[#4A9B7F]/20 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <Award className="text-[#4A9B7F] w-5 h-5" />
                        <h4 className="font-bold text-gray-800">Top Badge</h4>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        {topBadge ? (
                            <>
                                <div className="text-5xl mb-3 transform transition-transform group-hover:scale-110 duration-300">
                                    {topBadge.emoji}
                                </div>
                                <p className="font-black text-gray-900">{topBadge.name}</p>
                                <p className="text-xs font-bold text-[#4A9B7F] uppercase tracking-widest mt-1">
                                    Click to view all
                                </p>
                                {topBadge.isNew && (
                                    <div className="mt-3 inline-block bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-[10px] font-black">
                                        🆕 NEW
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="text-5xl mb-3 opacity-30">🎯</div>
                                <p className="font-black text-gray-900">No Badges Yet</p>
                                <p className="text-xs text-gray-500 mt-2">Earn badges by exploring and contributing</p>
                                <p className="text-xs font-bold text-[#4A9B7F] uppercase tracking-widest mt-3">
                                    Click to view requirements
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Streak Section */}
                <div className="group bg-gray-50 p-6 rounded-2xl border border-transparent hover:border-orange-200 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <Flame className="text-orange-500 w-5 h-5" />
                        <h4 className="font-bold text-gray-800">Current Streak</h4>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-end gap-3">
                            {loading ? (
                                <div className="h-12 w-16 bg-gray-200 rounded animate-pulse" />
                            ) : (
                                <span className="text-5xl font-black text-gray-900">{streak}</span>
                            )}
                            <span className="text-sm font-bold text-gray-500 mb-1">DAYS</span>
                        </div>
                        <div className="mt-4 px-3 py-1 bg-orange-100 rounded-full border border-orange-200">
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-tighter italic">
                                {loading ? "..." : streakMessage}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Leaderboard Section */}
                <div className="group bg-gray-50 p-6 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="text-blue-500 w-5 h-5" />
                        <h4 className="font-bold text-gray-800">Leaderboard</h4>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold text-gray-500 uppercase">Rank</span>
                            <span className="text-5xl font-black text-gray-900">#{leaderboard.rank}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-600">
                            Top <span className="font-bold text-blue-600">33%</span> among {leaderboard.totalFriends} friends
                        </p>
                        <div className="mt-3 flex items-center gap-1 text-green-600 font-bold text-xs">
                            <Trophy className="w-3 h-3" />
                            <span>Moving up this week!</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Badge Modal */}
        {showBadgeModal && <BadgeModal badges={badges} onClose={() => setShowBadgeModal(false)} />}
    </>
    );
};

export default TravelStatsCard;
