"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Users, Shield, MessageSquare, FolderOpen, Calendar, Trash2 } from "lucide-react";
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
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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


    const handleDelete = async (id: number) => {
        if (id === user?.id) {
            toast.error("You cannot delete your own account");
            return;
        }
        setDeletingId(id);
        try {
            await api.delete(`/auth/users/${id}`);
            toast.success("User deleted successfully");
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch {
            toast.error("Failed to delete user");
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
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
            {/* Confirm delete modal */}
            {confirmDeleteId !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Delete User?</h2>
                        <p className="text-sm text-slate-500 mb-6">
                            This will permanently delete <strong className="text-slate-800 dark:text-slate-200">{users.find(u => u.id === confirmDeleteId)?.full_name}</strong> and all their data. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDeleteId)}
                                disabled={deletingId === confirmDeleteId}
                                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-60 flex items-center gap-2"
                            >
                                {deletingId === confirmDeleteId ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Trash2 size={14} />
                                )}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                    <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</div>
                        <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>

                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">History</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {users.map((u, index) => (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                    <td className="px-4 py-4 text-sm font-mono text-slate-500">{index + 1}</td>
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
                                    <td className="px-4 py-4">
                                        {u.id === user?.id ? (
                                            <span className="text-xs text-slate-400 italic">You</span>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDeleteId(u.id)}
                                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                                                title="Delete user"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
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
