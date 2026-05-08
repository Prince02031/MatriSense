'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const AuthContext = createContext(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    const clearSession = useCallback(() => {
        localStorage.removeItem('matrisense_token');
        localStorage.removeItem('matrisense_user');
        setToken(null);
        setUser(null);
    }, []);

    const verifySession = useCallback(
        async (activeToken) => {
            if (!activeToken) {
                clearSession();
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${activeToken}` },
                });
                if (!res.ok) throw new Error('Invalid token');
                const data = await res.json();
                setUser(data.user);
                localStorage.setItem('matrisense_user', JSON.stringify(data.user));
            } catch (error) {
                clearSession();
            } finally {
                setLoading(false);
            }
        },
        [clearSession]
    );

    // Hydrate from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('matrisense_token');
        if (savedToken) {
            setToken(savedToken);
            verifySession(savedToken);
        } else {
            setLoading(false);
        }
    }, [verifySession]);

    useEffect(() => {
        if (!token) return;
        verifySession(token);
    }, [pathname, token, verifySession]);

    const register = async (name, email, password, role, phone) => {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, phone }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');

        localStorage.setItem('matrisense_token', data.token);
        localStorage.setItem('matrisense_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data.user;
    };

    const login = async (email, password) => {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');

        localStorage.setItem('matrisense_token', data.token);
        localStorage.setItem('matrisense_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        clearSession();
    };

    const authFetch = (url, options = {}) => {
        const headers = {
            ...(options.headers || {}),
            Authorization: token ? `Bearer ${token}` : undefined,
        };

        if (!headers.Authorization) {
            delete headers.Authorization;
        }

        return fetch(url, { ...options, headers });
    };

    return (
        <AuthContext.Provider
            value={{ user, token, loading, login, register, logout, authFetch, isAuthenticated: !!token }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
