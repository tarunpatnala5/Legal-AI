"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Share2, Printer, Bookmark } from "lucide-react";
import api from "@/lib/api";

interface Verdict {
    id: number;
    title: string;
    summary: string;
    effective_date: string;
    details: string;
}

export default function VerdictPage() {
    const params = useParams();
    const router = useRouter();
    const [verdict, setVerdict] = useState<Verdict | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, this would fetch /verdicts/{id}
        // For now, we simulate fetching the specific verdict from our list
        const fetchVerdict = async () => {
            try {
                const response = await api.get("/verdicts/recent");
                const found = response.data.find((v: Verdict) => v.id === Number(params.id));
                setVerdict(found || null);
            } catch (error) {
                console.error("Error fetching verdict", error);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) fetchVerdict();
    }, [params.id]);

    if (loading) return <div className="p-8 text-center">Loading case details...</div>;
    if (!verdict) return <div className="p-8 text-center text-red-500">Verdict not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={() => router.back()}
                className="flex items-center text-slate-500 hover:text-blue-600 transition mb-4"
            >
                <ArrowLeft size={18} className="mr-1" /> Back to Dashboard
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold mb-3">
                            Supreme Court Judgement
                        </span>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white leading-tight">
                            {verdict.title}
                        </h1>
                        <div className="flex items-center gap-4 mt-3 text-slate-500 text-sm">
                            <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {verdict.effective_date}
                            </span>
                            <span>•</span>
                            <span>Case ID: SC-{verdict.id}-2024</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition" title="Bookmark">
                            <Bookmark size={20} />
                        </button>
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition" title="Print">
                            <Printer size={20} />
                        </button>
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition" title="Share">
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Summary</h3>
                    <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mb-6">
                        {verdict.summary}
                    </p>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Full Details</h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {verdict.details}
                        {/* Simulated extra content for "Full" feel */}
                        <br /><br />
                        The court, having heard the arguments from both sides, observed that the fundamental question of law revolves around the interpretation of the statute in question.
                        Precedents were cited, but distinguishing factors in the current case necessitate a fresh perspective...
                    </p>
                </div>
            </div>
        </div>
    );
}
