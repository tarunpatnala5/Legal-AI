"use client";

import { Moon, Bell, User, LogOut, Mail, Lock, Pencil, X, Check, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function SettingsPage() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const { user, logout, refreshUser } = useAuth();
    const [notifications, setNotifications] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [deletingAccount, setDeletingAccount] = useState(false);

    const [form, setForm] = useState({
        full_name: user?.full_name || "",
        email: user?.email || "",
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const handleLogout = () => {
        logout();
        router.push("/auth/login");
    };

    const handleDeleteAccount = async () => {
        if (deleteInput !== "DELETE") {
            toast.error("Type DELETE to confirm");
            return;
        }
        setDeletingAccount(true);
        try {
            await api.delete("/auth/me");
            toast.success("Account deleted");
            logout();
            router.push("/auth/login");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to delete account");
        } finally {
            setDeletingAccount(false);
        }
    };

    const openEdit = () => {
        setForm({
            full_name: user?.full_name || "",
            email: user?.email || "",
            current_password: "",
            new_password: "",
            confirm_password: "",
        });
        setEditOpen(true);
    };

    const handleSave = async () => {
        if (form.new_password && form.new_password !== form.confirm_password) {
            toast.error("New passwords do not match");
            return;
        }
        if (form.new_password && form.new_password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        setSaving(true);
        try {
            await api.put("/auth/profile", {
                full_name: form.full_name || undefined,
                email: form.email !== user?.email ? form.email : undefined,
                current_password: form.current_password || undefined,
                new_password: form.new_password || undefined,
            });
            toast.success("Profile updated successfully!");
            await refreshUser();
            setEditOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">

                {/* Account Profile */}
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-lg"><User size={20} /></div>
                            <div>
                                <h3 className="font-semibold text-slate-800 dark:text-white">Account Profile</h3>
                                <p className="text-slate-500 text-sm">
                                    {user ? `${user.full_name} · ${user.email}` : "Manage your personal information"}
                                </p>
                            </div>
                        </div>
                        {user && (
                            <button
                                onClick={openEdit}
                                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            >
                                <Pencil size={14} /> Edit
                            </button>
                        )}
                    </div>

                    {/* Inline Edit Form */}
                    {editOpen && (
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                        <input
                                            value={form.full_name}
                                            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                                            placeholder="Email"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                <p className="text-xs font-medium text-slate-500 mb-3">Change Password</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {[
                                        { label: "Current Password", key: "current_password" },
                                        { label: "New Password", key: "new_password" },
                                        { label: "Confirm New", key: "confirm_password" },
                                    ].map(({ label, key }) => (
                                        <div key={key}>
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">{label}</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                                <input
                                                    type="password"
                                                    value={(form as any)[key]}
                                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setEditOpen(false)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                                    <X size={14} /> Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-70">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Changes
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-lg"><Bell size={20} /></div>
                        <div>
                            <h3 className="font-semibold text-slate-800 dark:text-white">Notifications</h3>
                            <p className="text-slate-500 text-sm">Case updates and reminders</p>
                        </div>
                    </div>
                    <div onClick={() => setNotifications(!notifications)} className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${notifications ? "bg-blue-600" : "bg-slate-300"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${notifications ? "translate-x-6" : ""}`} />
                    </div>
                </div>

                {/* Appearance */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-lg"><Moon size={20} /></div>
                        <div>
                            <h3 className="font-semibold text-slate-800 dark:text-white">Appearance</h3>
                            <p className="text-slate-500 text-sm">Toggle Dark/Light Mode</p>
                        </div>
                    </div>
                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button onClick={() => setTheme("light")} className={`p-1 px-3 rounded text-xs font-medium transition ${theme === "light" ? "bg-white dark:bg-white text-slate-800 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>Light</button>
                        <button onClick={() => setTheme("dark")} className={`p-1 px-3 rounded text-xs font-medium transition ${theme === "dark" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>Dark</button>
                    </div>
                </div>

                {/* Logout */}
                {user && (
                    <div className="p-6 flex items-center justify-between text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition" onClick={handleLogout}>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg"><LogOut size={20} /></div>
                            <div>
                                <h3 className="font-semibold">Log Out</h3>
                                <p className="text-red-400 text-sm">Sign out of your account</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Account - not shown for admin */}
                {user && !user.is_admin && (
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-700 rounded-lg"><Trash2 size={20} /></div>
                                <div>
                                    <h3 className="font-semibold text-red-700 dark:text-red-400">Delete Account</h3>
                                    <p className="text-slate-500 text-sm">Permanently remove your account and all data</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowDeleteConfirm(!showDeleteConfirm); setDeleteInput(""); }}
                                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            >
                                {showDeleteConfirm ? "Cancel" : "Delete"}
                            </button>
                        </div>

                        {showDeleteConfirm && (
                            <div className="mt-5 pt-5 border-t border-red-100 dark:border-red-900/30 space-y-4">
                                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                    <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        This will <strong>permanently delete</strong> your account, all your cases, chat history, and schedules. This action <strong>cannot be undone</strong>.
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
                                        Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
                                    </label>
                                    <input
                                        value={deleteInput}
                                        onChange={e => setDeleteInput(e.target.value)}
                                        placeholder="DELETE"
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500 transition font-mono"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deletingAccount || deleteInput !== "DELETE"}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
                                    >
                                        {deletingAccount ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                        Permanently Delete Account
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
