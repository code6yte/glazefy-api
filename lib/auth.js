'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('glazefy_token');
        if (stored) {
            setToken(stored);
            fetchProfile(stored);
        } else {
            setLoading(false);
        }
    }, []);

    async function fetchProfile(t) {
        try {
            const res = await fetch(`${API_URL}/api/auth/profile`, {
                headers: { Authorization: `Bearer ${t}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.cafe);
            } else {
                localStorage.removeItem('glazefy_token');
                setToken(null);
            }
        } catch {
            localStorage.removeItem('glazefy_token');
            setToken(null);
        } finally {
            setLoading(false);
        }
    }

    async function login(email, password) {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        localStorage.setItem('glazefy_token', data.token);
        setToken(data.token);
        setUser(data.cafe);
        return data;
    }

    async function register(name, email, password, description) {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, description }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        localStorage.setItem('glazefy_token', data.token);
        setToken(data.token);
        setUser(data.cafe);
        return data;
    }

    function logout() {
        localStorage.removeItem('glazefy_token');
        setToken(null);
        setUser(null);
    }

    async function updateProfile(updates) {
        const res = await fetch(`${API_URL}/api/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Update failed');
        setUser(data.cafe);
        return data;
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
