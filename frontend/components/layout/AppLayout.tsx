"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import SideNavbar from "@/components/layout/SideNavbar";
import TopNavbar from "@/components/layout/TopNavbar";
import { useAuth } from "@/lib/auth-context";

const PROTECTED_ROUTES = ["/chat", "/cases", "/library", "/schedule"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { isLoggedIn, isLoading } = useAuth();

    const isAuthPage = pathname?.startsWith("/auth");

    const isProtected = PROTECTED_ROUTES.some(route =>
        pathname === route || pathname?.startsWith(route + "/")
    );

    useEffect(() => {
        if (!isLoading && !isLoggedIn && isProtected) {
            router.push("/auth/login");
        }
    }, [isLoading, isLoggedIn, isProtected, router]);

    if (isAuthPage) {
        return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">{children}</div>;
    }

    // Show loading spinner while auth is resolving for protected pages
    if (isLoading && isProtected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex bg-background min-h-screen text-foreground transition-colors duration-300">
            <SideNavbar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden w-full lg:w-auto">
                <TopNavbar />
                <div className="flex-1 overflow-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                    {children}
                </div>
            </main>
        </div>
    );
}
