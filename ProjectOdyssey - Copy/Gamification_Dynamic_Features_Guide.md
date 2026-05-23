# Project Odyssey — Dynamic Gamification Features
### Implementation Guide for Antigravity · Team Route6 · Feb 2026

---

## Overview

The `TravelStatsCard` component (`client/odyssey/app/profile/TravelStatsCard.tsx`) currently displays a gamification dashboard with five metrics. Two of these — **Travel Efficiency** and **Current Streak** — are fully hardcoded with fake values. This guide explains exactly what needs to be built, where, and in what order to make them dynamic.

**What is currently static (needs to be fixed):**

| Metric | Hardcoded Value | Where It's Hardcoded |
|---|---|---|
| Travel Efficiency | `efficiency: 92` | Inside `stats` object in `TravelStatsCard.tsx` |
| Current Streak | `streak: { days: 14, message: 'Personal Best!' }` | Inside `stats` object in `TravelStatsCard.tsx` |

**Stack:**
- Frontend: Next.js (React, TypeScript, Tailwind)
- Backend: Node.js / Express
- Primary DB (travel data): Supabase (`visit_logs`, `itineraries` tables)
- User DB: MongoDB via Mongoose (`User` model)
- Existing gamification: `server/src/services/GamificationService.js`

---

## Part 1 — Travel Efficiency

### What it means
Travel Efficiency measures how well the user's actual visits match their planned itinerary.

**Formula:**
```
efficiency = (completed_visits / planned_visits) * 100
```

- `completed_visits` = rows in `visit_logs` where `status = 'completed'` for a given `user_id`
- `planned_visits` = total activities across all `confirmed` itineraries for the same `user_id`
- Result is a percentage (0–100), clamped so it never exceeds 100

---

### 1.1 Backend — Add `calculateEfficiency()` to `GamificationService.js`

**File:** `server/src/services/GamificationService.js`

Add this static method to the `GamificationService` class:

```javascript
static async calculateEfficiency(userId) {
  try {
    // Count completed visits (cheap — no row fetch)
    const { count: completedVisits, error: visitError } = await supabase
      .from('visit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (visitError) throw visitError;

    // Fetch all confirmed itineraries to count planned activities
    const { data: itineraries, error: itinError } = await supabase
      .from('itineraries')
      .select('selected_itinerary')
      .eq('user_id', userId)
      .eq('status', 'confirmed');

    if (itinError) throw itinError;

    let plannedVisits = 0;
    itineraries.forEach(itin => {
      const schedule = itin.selected_itinerary?.schedule;
      if (Array.isArray(schedule)) {
        schedule.forEach(day => {
          plannedVisits += (day.activities || []).length;
        });
      }
    });

    if (plannedVisits === 0) return 0;

    const efficiency = Math.min(100, Math.round((completedVisits / plannedVisits) * 100));
    return efficiency;
  } catch (err) {
    console.error('calculateEfficiency error:', err);
    return 0;
  }
}
```

> **Note:** Use `{ count: 'exact', head: true }` on the Supabase query so you get only the count without fetching all rows — much cheaper on large datasets.

---

### 1.2 Backend — Create the unified stats endpoint

**File:** `server/src/routes/protected.js` (or a new `gamificationRoutes.js` — see Part 3)

This endpoint will be used for **all** gamification data. For now the efficiency part is:

```javascript
// GET /api/gamification/stats
router.get('/gamification/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const [xpResult, efficiency, streak] = await Promise.all([
      GamificationService.calculateAndSyncXP(userId),
      GamificationService.calculateEfficiency(userId),
      GamificationService.calculateAndSyncStreak(userId),  // built in Part 2
    ]);

    res.json({
      success: true,
      data: {
        xp: xpResult.totalXP,
        level: xpResult.level,
        efficiency,                      // <-- dynamic now
        streak: {
          current: streak.currentStreak, // <-- dynamic now
          personalBest: streak.personalBest,
        },
        // badge and leaderboard omitted here — not in scope for this task
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
```

---

## Part 2 — Current Streak

### What it means
A streak = the number of **consecutive calendar days** (UTC) on which the user completed at least one visit (`status = 'completed'` in `visit_logs`).

- The streak is **not broken** if the user hasn't completed a visit yet today — only if their last activity was **2 or more days ago**.
- **Personal Best** = the longest streak ever maintained by this user.

---

### 2.1 Database — Add streak fields to User model

**File:** `server/src/models/User.js`

Add these three fields inside the `userSchema` definition (in the `// Gamification` section, alongside `xp` and `level`):

```javascript
// Gamification (existing)
xp: { type: Number, default: 0 },
level: { type: Number, default: 1 },

// Streak tracking (NEW)
currentStreak: { type: Number, default: 0 },
personalBest: { type: Number, default: 0 },
lastActivityDate: { type: String, default: '' }, // Format: 'YYYY-MM-DD' UTC
```

> **Why string for date?** Comparing `'2026-02-28'` vs `'2026-03-01'` as strings is deterministic and avoids timezone edge cases. Always derive and compare in UTC.

---

### 2.2 Backend — Add `calculateAndSyncStreak()` to `GamificationService.js`

**File:** `server/src/services/GamificationService.js`

Add this static method to the class:

```javascript
static async calculateAndSyncStreak(userId) {
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
    // (don't break streak just because today isn't over yet)
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
```

---

### 2.3 Trigger Points — When to call `calculateAndSyncStreak()`

Add a non-blocking call to the streak calculation in the same places XP is synced:

**File: `server/src/routes/visitRoutes.js`** — in the checkout handler, after the primary DB write:

```javascript
// Non-blocking — don't await, don't let it fail the request
GamificationService.calculateAndSyncStreak(req.user.id).catch(console.error);
GamificationService.calculateAndSyncXP(req.user.id).catch(console.error);
```

**File: `server/src/routes/tripRoutes.js`** — in the trip completion/status update handler, same pattern.

---

## Part 3 — Unified Stats Endpoint

Rather than four separate API calls from the frontend, create one endpoint that returns everything.

### 3.1 Register the new route

**File: `server/src/index.js`** (or wherever routes are registered):

```javascript
const protectedRoutes = require('./routes/protected');
// Already exists:
app.use('/api/user', protectedRoutes);

// Add this — or extend protected.js to include the gamification route (see 1.2)
app.use('/api', protectedRoutes);
```

If you prefer a separate file, create `server/src/routes/gamificationRoutes.js` with the endpoint from Part 1.2 and register it:

```javascript
const gamificationRoutes = require('./routes/gamificationRoutes');
app.use('/api/gamification', gamificationRoutes);
// Endpoint becomes: GET /api/gamification/stats
```

---

## Part 4 — Frontend Wiring

### 4.1 Create `useGamificationStats` hook

**File:** `client/odyssey/hooks/useGamificationStats.ts` *(create new file)*

```typescript
import { useState, useEffect } from 'react';
import { getApiBase } from '@/lib/api'; // use whatever your existing helper is

interface GamificationStats {
  xp: number;
  level: number;
  efficiency: number;
  streak: {
    current: number;
    personalBest: number;
  };
}

export function useGamificationStats() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token'); // adjust to your auth mechanism
        const res = await fetch(`${getApiBase()}/api/gamification/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch gamification stats');
        const data = await res.json();
        if (data.success) setStats(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}
```

---

### 4.2 Update `TravelStatsCard` props

**File:** `client/odyssey/app/profile/TravelStatsCard.tsx`

**Change the props interface from:**
```typescript
interface TravelStatsCardProps {
  xp?: number;
  level?: number;
}
```

**To:**
```typescript
interface TravelStatsCardProps {
  xp?: number;
  level?: number;
  efficiency?: number;      // NEW — replaces hardcoded 92
  streak?: number;          // NEW — replaces hardcoded 14
  personalBest?: number;    // NEW — for "Personal Best!" badge logic
  loading?: boolean;        // NEW — for skeleton state
}
```

**Change the component signature from:**
```typescript
const TravelStatsCard: React.FC<TravelStatsCardProps> = ({ xp = 0, level = 1 }) => {
```

**To:**
```typescript
const TravelStatsCard: React.FC<TravelStatsCardProps> = ({
  xp = 0,
  level = 1,
  efficiency = 0,
  streak = 0,
  personalBest = 0,
  loading = false,
}) => {
```

**Remove the static `stats` object entirely** (lines that look like):
```typescript
// DELETE THIS ENTIRE BLOCK:
const stats = {
  efficiency: 92,
  totalXP: xp.toLocaleString(),
  badge: { ... },
  streak: { days: 14, message: 'Personal Best!' },
  leaderboard: { rank: 4, totalFriends: 12, rankChange: 'up' }
};
```

**Replace hardcoded references in the JSX:**

| Find (static) | Replace with (dynamic) |
|---|---|
| `{stats.efficiency}%` | `{efficiency}%` |
| `style={{ width: \`${stats.efficiency}%\` }}` | `style={{ width: \`${efficiency}%\` }}` |
| `{stats.streak.days}` | `{streak}` |
| `{stats.streak.message}` | `{streak > 0 && streak >= personalBest ? 'Personal Best!' : 'Keep it up!'}` |
| `{stats.totalXP}` | `{xp.toLocaleString()}` |

---

### 4.3 Add skeleton loading state

Inside `TravelStatsCard`, wrap the efficiency and streak values so they show a placeholder while data loads:

```typescript
// Example for the efficiency value:
{loading ? (
  <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
) : (
  <span className="text-2xl font-black text-gray-900">{efficiency}%</span>
)}

// Example for the streak value:
{loading ? (
  <div className="h-12 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
) : (
  <span className="text-5xl font-black text-gray-900">{streak}</span>
)}
```

---

### 4.4 Wire the hook into `profile/page.tsx`

**File:** `client/odyssey/app/profile/page.tsx`

**Add the import:**
```typescript
import { useGamificationStats } from '@/hooks/useGamificationStats';
```

**Add the hook call inside the component** (near the top, alongside other data fetches):
```typescript
const { stats: gamificationStats, loading: gamificationLoading } = useGamificationStats();
```

**Update the `<TravelStatsCard>` usage** (currently around line 17333):

From:
```typescript
<TravelStatsCard
  xp={userData.xp || 0}
  level={userData.level || 1}
/>
```

To:
```typescript
<TravelStatsCard
  xp={gamificationStats?.xp ?? userData.xp ?? 0}
  level={gamificationStats?.level ?? userData.level ?? 1}
  efficiency={gamificationStats?.efficiency ?? 0}
  streak={gamificationStats?.streak.current ?? 0}
  personalBest={gamificationStats?.streak.personalBest ?? 0}
  loading={gamificationLoading}
/>
```

---

## Part 5 — Build Order

Implement in this sequence to avoid blockers:

1. **User model changes** — add `currentStreak`, `personalBest`, `lastActivityDate` to `User.js`
2. **`calculateEfficiency()`** in `GamificationService.js` — standalone, no dependencies
3. **`calculateAndSyncStreak()`** in `GamificationService.js` — depends on User model fields from step 1
4. **Add sync triggers** to `visitRoutes.js` and `tripRoutes.js`
5. **`GET /api/gamification/stats`** endpoint — depends on steps 2 and 3
6. **`useGamificationStats` hook** — frontend, depends on step 5
7. **Refactor `TravelStatsCard` props** — remove static values, add new props
8. **Wire hook into `profile/page.tsx`** — final integration
9. **Add loading skeletons** to `TravelStatsCard`

---

## Part 6 — Quick Reference: Files to Change

| File | Action |
|---|---|
| `server/src/models/User.js` | Add `currentStreak`, `personalBest`, `lastActivityDate` fields |
| `server/src/services/GamificationService.js` | Add `calculateEfficiency()` and `calculateAndSyncStreak()` methods |
| `server/src/routes/visitRoutes.js` | Add non-blocking streak + XP sync after checkout |
| `server/src/routes/tripRoutes.js` | Add non-blocking streak + XP sync after trip completion |
| `server/src/routes/protected.js` (or new `gamificationRoutes.js`) | Add `GET /api/gamification/stats` endpoint |
| `server/src/index.js` | Register new gamification route |
| `client/odyssey/hooks/useGamificationStats.ts` | **Create new file** — custom hook |
| `client/odyssey/app/profile/TravelStatsCard.tsx` | Update props interface, remove static `stats` object, add skeleton state |
| `client/odyssey/app/profile/page.tsx` | Import hook, wire `efficiency`, `streak`, `personalBest`, `loading` props |

---

*Project Odyssey · Team Route6 · Dynamic Gamification — Travel Efficiency & Streak*
