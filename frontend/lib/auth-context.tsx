"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/lib/api";

interface User {
    id: number;
    email: string;
    full_name: string;
    is_admin: boolean;
    is_active: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "token";
const USER_KEY = "cached_user";

export function AuthProvider({ children }: { children: ReactNode }) {
    // Start with null to match SSR — load cached user in effect to avoid hydration mismatch
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            localStorage.removeItem(USER_KEY);
            setUser(null);
            setIsLoading(false);
            return;
        }
        try {
            const res = await api.get("/auth/me");
            const userData: User = res.data;
            localStorage.setItem(USER_KEY, JSON.stringify(userData));
            setUser(userData);
        } catch {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Load cached user immediately from localStorage so avatar shows on first paint
        // This runs only on client — no SSR mismatch
        try {
            const cached = localStorage.getItem(USER_KEY);
            if (cached) {
                setUser(JSON.parse(cached));
            }
        } catch {
            // ignore bad cache
        }
        // Then validate with backend in background
        fetchUser();
    }, []);

    const login = async (token: string) => {
        localStorage.setItem(TOKEN_KEY, token);
        await fetchUser();
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
    };

    const refreshUser = async () => {
        await fetchUser();
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoggedIn: !!user,
            isLoading,
            login,
            logout,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
