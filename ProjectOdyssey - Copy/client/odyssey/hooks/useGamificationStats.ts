import { useState, useEffect } from 'react';

const getApiBase = () => {
    if (typeof window !== 'undefined') {
        const { hostname, protocol } = window.location;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return `${protocol}//${hostname}:4000`;
        }
    }
    return 'http://localhost:4000';
};

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
                const token = localStorage.getItem('token');
                if (!token) {
                    setLoading(false);
                    return;
                }
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
