"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, Users, Shield, MessageSquare, FolderOpen, Calendar } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface UserDetail {
    id: number;
    email: string;
    full_name: string;
    is_admin: boolean;
    is_active: boolean;
    created_at: string;
    chat_sessions: number;
    cases: number;
    schedules: number;
}

export default function AdminUsersPage() {
    const { user, isLoggedIn, isLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [revealedPasswords, setRevealedPasswords] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!isLoading) {
            if (!isLoggedIn || !user?.is_admin) {
                toast.error("Admin access required");
                router.push("/");
                return;
            }
            fetchUsers();
        }
    }, [isLoading, isLoggedIn, user]);

    const fetchUsers = async () => {
        try {
            const res = await api.get("/auth/users");
            setUsers(res.data);
        } catch {
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const toggleReveal = (id: number) => {
        setRevealedPasswords(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    if (isLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Users className="text-blue-600" size={28} />
                        User Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Admin panel — {users.length} registered users</p>
                </div>
                <span className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-xs font-semibold">
                    <Shield size={14} /> Admin View
                </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Users", value: users.length, color: "blue" },
                    { label: "Admins", value: users.filter(u => u.is_admin).length, color: "purple" },
                    { label: "Total Chats", value: users.reduce((a, u) => a + u.chat_sessions, 0), color: "green" },
                    { label: "Total Cases", value: users.reduce((a, u) => a + u.cases, 0), color: "amber" },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</div>
                        <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email / Username</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">History</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                    <td className="px-4 py-4 text-sm font-mono text-slate-500">#{u.id}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                                {u.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{u.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{u.email}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                                                {revealedPasswords.has(u.id) ? "(hashed — stored securely)" : "••••••••••"}
                                            </span>
                                            <button
                                                onClick={() => toggleReveal(u.id)}
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                                title={revealedPasswords.has(u.id) ? "Hide" : "Note about password"}
                                            >
                                                {revealedPasswords.has(u.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {u.is_admin ? (
                                            <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                <Shield size={11} /> Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                User
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1" title="Chat sessions">
                                                <MessageSquare size={12} className="text-blue-500" />{u.chat_sessions}
                                            </span>
                                            <span className="flex items-center gap-1" title="Cases">
                                                <FolderOpen size={12} className="text-green-500" />{u.cases}
                                            </span>
                                            <span className="flex items-center gap-1" title="Schedules">
                                                <Calendar size={12} className="text-amber-500" />{u.schedules}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-slate-500">
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
