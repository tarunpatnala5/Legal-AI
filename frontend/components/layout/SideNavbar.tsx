"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Home, MessageSquare, PlusCircle, Library, Calendar,
    Settings, ChevronLeft, ChevronRight, Scale, LogOut,
    Menu, X, LogIn, Users
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const publicNavItems = [
    { name: "Home", href: "/", icon: Home },
];

const protectedNavItems = [
    { name: "Chat Assistant", href: "/chat", icon: MessageSquare },
    { name: "New Case", href: "/cases/new", icon: PlusCircle },
    { name: "Library", href: "/library", icon: Library },
    { name: "Schedule", href: "/schedule", icon: Calendar },
    { name: "Settings", href: "/settings", icon: Settings },
];

export default function SideNavbar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user, isLoggedIn, logout } = useAuth();

    const handleLogout = () => {
        logout();
        toast.success("Logged out successfully");
        router.push("/");
    };

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    const navItems = [
        ...publicNavItems,
        ...(isLoggedIn ? protectedNavItems : []),
        ...(user?.is_admin ? [{ name: "Users", href: "/admin/users", icon: Users }] : []),
    ];

    // Settings is always visible even when not logged in (bottom of list when not logged in)
    const allNavItems = isLoggedIn
        ? navItems
        : [...publicNavItems, { name: "Settings", href: "/settings", icon: Settings }];

    const NavItem = ({ item }: { item: typeof navItems[0] }) => {
        const isActive = pathname === item.href;
        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={cn(
                    "flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                    isActive
                        ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-600/30"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
            >
                <item.icon className={cn("w-6 h-6 min-w-[24px]", isActive && "text-blue-600 dark:text-blue-400")} />
                {!isCollapsed && (
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="whitespace-nowrap font-medium"
                    >
                        {item.name}
                    </motion.span>
                )}
                {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-slate-200 dark:border-slate-700">
                        {item.name}
                    </div>
                )}
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800"
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeMobileMenu}
                        className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0, width: isCollapsed ? 80 : 240 }}
                className={cn(
                    "h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-white flex flex-col border-r border-slate-200 dark:border-slate-800 shadow-xl relative z-50 transition-colors duration-300",
                    "fixed lg:static",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
                style={{ width: isCollapsed ? 80 : 240 }}
            >
                {/* Logo */}
                <div className="p-4 flex items-center justify-between h-16 border-b border-slate-200 dark:border-slate-800">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 font-bold text-xl text-blue-600 dark:text-blue-400"
                        >
                            <Scale className="w-6 h-6" />
                            <span>LegalAI</span>
                        </motion.div>
                    )}
                    {isCollapsed && <Scale className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400" />}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:block absolute -right-3 top-6 bg-blue-600 rounded-full p-1 text-white shadow-lg hover:bg-blue-500 transition"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                {/* Nav Items */}
                <div className="flex-1 py-6 flex flex-col gap-2 p-2 overflow-y-auto">
                    {allNavItems.map((item) => <NavItem key={item.href} item={item} />)}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    {isLoggedIn ? (
                        <button
                            onClick={() => { handleLogout(); closeMobileMenu(); }}
                            className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 group"
                        >
                            <LogOut className="w-6 h-6 min-w-[24px]" />
                            {!isCollapsed && (
                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-nowrap font-medium">
                                    Sign Out
                                </motion.span>
                            )}
                        </button>
                    ) : (
                        <Link
                            href="/auth/login"
                            onClick={closeMobileMenu}
                            className="w-full flex items-center gap-4 px-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
                        >
                            <LogIn className="w-6 h-6 min-w-[24px]" />
                            {!isCollapsed && (
                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-nowrap font-medium">
                                    Login
                                </motion.span>
                            )}
                        </Link>
                    )}
                </div>
            </motion.div>
        </>
    );
}
