"use client";

import { usePathname } from "next/navigation";
import SideNavbar from "@/components/layout/SideNavbar";
import TopNavbar from "@/components/layout/TopNavbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname?.startsWith("/auth");

    if (isAuthPage) {
        return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">{children}</div>;
    }

    return (
        <div className="flex bg-background min-h-screen text-foreground transition-colors duration-300">
            <SideNavbar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopNavbar />
                <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                    {children}
                </div>
            </main>
        </div>
    );
}
