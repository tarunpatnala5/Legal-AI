"use client";

import { Moon, Sun, Bell, User, LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme-context";

export default function SettingsPage() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [notifications, setNotifications] = useState(true);

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/auth/login");
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">

                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 dark:text-white">Account Profile</h3>
                            <p className="text-slate-500 text-sm">Manage your personal information</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        Edit
                    </button>
                </div>

                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                            <Bell size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 dark:text-white">Notifications</h3>
                            <p className="text-slate-500 text-sm">Case updates and reminders</p>
                        </div>
                    </div>
                    <div
                        onClick={() => setNotifications(!notifications)}
                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${notifications ? "bg-blue-600" : "bg-slate-300"}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${notifications ? "translate-x-6" : ""}`} />
                    </div>
                </div>

                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-lg">
                            <Moon size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 dark:text-white">Appearance</h3>
                            <p className="text-slate-500 text-sm">Toggle Dark/Light Mode</p>
                        </div>
                    </div>
                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setTheme("light")}
                            className={`p-1 px-3 rounded text-xs font-medium transition ${theme === 'light' ? 'bg-white dark:bg-white text-slate-800 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Light
                        </button>
                        <button
                            onClick={() => setTheme("dark")}
                            className={`p-1 px-3 rounded text-xs font-medium transition ${theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Dark
                        </button>
                    </div>
                </div>

                <div className="p-6 flex items-center justify-between text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition" onClick={handleLogout}>
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg">
                            <LogOut size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold">Log Out</h3>
                            <p className="text-red-400 text-sm">Sign out of your account</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
