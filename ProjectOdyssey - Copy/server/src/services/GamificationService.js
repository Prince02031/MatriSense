"use strict";

const supabase = require("../config/supabaseClient");
const User = require("../models/User");

class GamificationService {
    /**
     * Calculate total XP for a user based on their travel history
     * @param {string} userId - User ID
     * @returns {object} { totalXP, level, breakdown }
     */
    static async calculateAndSyncXP(userId) {
        try {
            // 1. Fetch all confirmed itineraries
            const { data: itineraries, error: itineraryError } = await supabase
                .from("itineraries")
                .select("*")
                .eq("user_id", userId)
                .eq("status", "confirmed");

            if (itineraryError) throw itineraryError;

            // 2. Fetch all completed visit logs
            const { data: visitLogs, error: visitError } = await supabase
                .from("visit_logs")
                .select("*")
                .eq("user_id", userId)
                .eq("status", "completed");

            if (visitError) throw visitError;

            let totalXP = 0;
            const breakdown = {
                activities: 0,
                days: 0,
                trips: 0
            };

            // --- Calculation Logic ---

            // A. Activity XP (+20 each)
            const activityXP = visitLogs.length * 20;
            totalXP += activityXP;
            breakdown.activities = activityXP;

            // B. Trip XP (+200 each confirmed trip)
            const tripXP = itineraries.length * 200;
            totalXP += tripXP;
            breakdown.trips = tripXP;

            // C. Day XP (+50 per fully completed day)
            // We need to check each itinerary's schedule and see if all places for a day were visited
            let completedDays = 0;

            itineraries.forEach(itinerary => {
                const schedule = itinerary.selected_itinerary?.schedule;
                if (Array.isArray(schedule)) {
                    schedule.forEach(day => {
                        const dayActivities = day.activities || [];
                        if (dayActivities.length > 0) {
                            // Check if ALL activities for this day were completed
                            // Match by place_id or name
                            const allCompleted = dayActivities.every(activity => {
                                const placeId = activity.place_id;
                                // Check if there is a completed visit log for this place in this trip
                                return visitLogs.some(log =>
                                    log.itinerary_id === itinerary.id &&
                                    log.place_id === placeId
                                );
                            });

                            if (allCompleted) completedDays++;
                        }
                    });
                }
            });

            const dayXP = completedDays * 50;
            totalXP += dayXP;
            breakdown.days = dayXP;

            // Calculate Level (Simple linear progression: 1000 XP per level)
            const level = Math.floor(totalXP / 1000) + 1;

            // 3. Sync to MongoDB User Model
            await User.findByIdAndUpdate(userId, { xp: totalXP, level: level });

            return { totalXP, level, breakdown };
        } catch (err) {
            console.error("GamificationService error:", err);
            throw err;
        }
    }

    /**
     * Calculate travel efficiency for a user
     * efficiency = (completed_visits / planned_visits) * 100
     * @param {string} userId
     * @returns {number} 0-100
     */
    static async calculateEfficiency(userId) {
        console.log(`[Gamification] Calculating efficiency for ${userId}`);
        try {
            // 1. Fetch all confirmed itineraries for the user
            const { data: itineraries, error: itinError } = await supabase
                .from('itineraries')
                .select('id, selected_itinerary')
                .eq('user_id', userId)
                .eq('status', 'confirmed');

            if (itinError) throw itinError;
            console.log(`[Gamification] Confirmed itineraries found: ${itineraries.length}`);

            if (itineraries.length === 0) return 0;

            let totalPlannedActivities = 0;
            let completedPlannedActivities = 0;

            // 2. Iterate through itineraries and match activities with visit_logs
            for (const itin of itineraries) {
                const schedule = itin.selected_itinerary?.schedule;
                if (!Array.isArray(schedule)) continue;

                for (const day of schedule) {
                    const activities = day.activities || [];
                    for (const activity of activities) {
                        totalPlannedActivities++;

                        // Check if this specific planned activity has a matching completed visit
                        const { count, error: visitError } = await supabase
                            .from('visit_logs')
                            .select('*', { count: 'exact', head: true })
                            .eq('user_id', userId)
                            .eq('itinerary_id', itin.id)
                            .eq('place_id', activity.place_id)
                            .eq('status', 'completed');

                        if (!visitError && count > 0) {
                            completedPlannedActivities++;
                        }
                    }
                }
            }

            console.log(`[Gamification] Total Planned: ${totalPlannedActivities}, Completed Planned: ${completedPlannedActivities}`);

            if (totalPlannedActivities === 0) return 0;

            const efficiency = Math.min(100, Math.round((completedPlannedActivities / totalPlannedActivities) * 100));
            return efficiency;
        } catch (err) {
            console.error('calculateEfficiency error:', err);
            return 0;
        }
    }

    /**
     * Calculate and persist current streak and personal best for a user.
     * A streak = consecutive calendar days (UTC) with at least one completed visit.
     * @param {string} userId
     * @returns {{ currentStreak: number, personalBest: number }}
     */
    static async calculateAndSyncStreak(userId) {
        console.log(`[Gamification] Calculating streak for ${userId}`);
        try {
            // 1. Fetch all completed visit dates for this user
            const { data: visits, error } = await supabase
                .from('visit_logs')
                .select('exited_at')
                .eq('user_id', userId)
                .eq('status', 'completed')
                .not('exited_at', 'is', null)
                .order('exited_at', { ascending: true });

            if (error) throw error;
            console.log(`[Gamification] Found ${visits?.length || 0} visits for streak`);

            if (!visits || visits.length === 0) {
                await User.findByIdAndUpdate(userId, {
                    currentStreak: 0,
                    personalBest: 0,
                    lastActivityDate: '',
                });
                return { currentStreak: 0, personalBest: 0 };
            }

            // 2. Collect unique UTC calendar dates the user was active
            const uniqueDates = [
                ...new Set(
                    visits.map(v => new Date(v.exited_at).toISOString().split('T')[0])
                )
            ].sort();

            // 3. Calculate longest historical streak
            let longestStreak = 1;
            let runningStreak = 1;
            for (let i = 1; i < uniqueDates.length; i++) {
                const prev = new Date(uniqueDates[i - 1]);
                const curr = new Date(uniqueDates[i]);
                const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
                if (diffDays === 1) {
                    runningStreak++;
                    longestStreak = Math.max(longestStreak, runningStreak);
                } else {
                    runningStreak = 1;
                }
            }

            // 4. Calculate current active streak (from today backwards)
            const todayStr = new Date().toISOString().split('T')[0];
            const yesterdayDate = new Date();
            yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
            const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

            const lastDate = uniqueDates[uniqueDates.length - 1];
            let currentStreak = 0;

            // Only count streak if user was active today OR yesterday
            if (lastDate === todayStr || lastDate === yesterdayStr) {
                currentStreak = 1;
                for (let i = uniqueDates.length - 2; i >= 0; i--) {
                    const curr = new Date(uniqueDates[i + 1]);
                    const prev = new Date(uniqueDates[i]);
                    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
                    if (diffDays === 1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }

            const personalBest = Math.max(longestStreak, currentStreak);

            // 5. Persist to MongoDB
            await User.findByIdAndUpdate(userId, {
                currentStreak,
                personalBest,
                lastActivityDate: lastDate,
            });

            return { currentStreak, personalBest };
        } catch (err) {
            console.error('calculateAndSyncStreak error:', err);
            return { currentStreak: 0, personalBest: 0 };
        }
    }
}

module.exports = GamificationService;
