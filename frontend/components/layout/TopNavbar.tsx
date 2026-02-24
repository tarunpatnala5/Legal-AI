"use client";

import { Bell, Search, Sun, Moon, LogIn } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface ScheduleEvent {
    id: number;
    case_name: string;
    court_date: string;
    notification_enabled: boolean;
}

export default function TopNavbar() {
    const { theme, toggleTheme } = useTheme();
    const { user, isLoggedIn, logout } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<ScheduleEvent[]>([]);
    const notifiedEvents = useRef(new Set<number>());

    const initials = user?.full_name
        ? user.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
        : "?";

    useEffect(() => {
        if (!isLoggedIn) return;

        const checkSchedules = async () => {
            try {
                const res = await api.get("/schedule/");
                const events: ScheduleEvent[] = res.data;
                const now = new Date();
                const upcoming: ScheduleEvent[] = [];

                events.forEach(event => {
                    if (!event.notification_enabled) return;
                    const eventTime = new Date(event.court_date);
                    const timeDiff = eventTime.getTime() - now.getTime();
                    if (Math.abs(timeDiff) < 60000 && !notifiedEvents.current.has(event.id)) {
                        toast((t) => (
                            <div className="flex items-start gap-4">
                                <div className="text-blue-600 bg-blue-100 p-2 rounded-full"><Bell size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">Scheduled Event</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">It&apos;s time for: <b>{event.case_name}</b></p>
                                </div>
                            </div>
                        ), { duration: 5000, position: "top-right" });
                        notifiedEvents.current.add(event.id);
                    }
                    if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) upcoming.push(event);
                });

                setNotifications(upcoming);
            } catch {
                setNotifications([]);
            }
        };

        checkSchedules();
        const interval = setInterval(checkSchedules, 30000);
        return () => clearInterval(interval);
    }, [isLoggedIn]);

    return (
        <div className="h-14 sm:h-16 bg-background border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 shadow-sm transition-colors duration-300">
            {/* Left */}
            <div className="flex items-center gap-2 flex-1">
                <div className="w-10 lg:hidden" />
                <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-900 px-3 sm:px-4 py-2 rounded-lg w-full max-w-md border border-transparent focus-within:border-blue-500 transition-all">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 mr-2 sm:mr-3 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search cases, statutes..."
                        className="bg-transparent border-none outline-none w-full text-xs sm:text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2 sm:gap-4">
                <button className="sm:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
                    <Search size={18} />
                </button>

                <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400 transition"
                    title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                >
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Notifications (only when logged in) */}
                {isLoggedIn && (
                    <div className="relative group">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400 relative transition">
                            <Bell size={18} />
                            {notifications.length > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse" />
                            )}
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="font-semibold text-sm text-slate-800 dark:text-white">Upcoming Events (24h)</h3>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500 text-xs">No upcoming events</div>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0 border-slate-100 dark:border-slate-800 transition">
                                            <div className="font-medium text-xs text-slate-800 dark:text-slate-200">{n.case_name}</div>
                                            <div className="text-[10px] text-slate-500 mt-1">
                                                {new Date(n.court_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="hidden sm:block h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

                {isLoggedIn ? (
                    <button
                        onClick={() => router.push("/settings")}
                        className="hidden sm:flex items-center gap-2 sm:gap-3 hover:bg-slate-100 dark:hover:bg-slate-900 pl-1 sm:pl-2 pr-2 sm:pr-4 py-1 sm:py-1.5 rounded-full transition border border-slate-200 dark:border-slate-800"
                    >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xs sm:text-sm">
                            {initials}
                        </div>
                        <div className="hidden md:flex flex-col items-start">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{user?.full_name}</span>
                            <span className="text-[10px] text-slate-500">{user?.is_admin ? "Administrator" : "Advocate"}</span>
                        </div>
                    </button>
                ) : (
                    <button
                        onClick={() => router.push("/auth/login")}
                        className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition"
                    >
                        <LogIn size={16} />
                        Login
                    </button>
                )}

                {/* Mobile avatar or login */}
                {isLoggedIn ? (
                    <button
                        onClick={() => router.push("/settings")}
                        className="sm:hidden w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xs"
                    >
                        {initials}
                    </button>
                ) : (
                    <button
                        onClick={() => router.push("/auth/login")}
                        className="sm:hidden p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition"
                    >
                        <LogIn size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
