"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface CaseDetail {
    id: number;
    filename: string;
    uploaded_at: string;
    target_language: string;
    translated_content: string;
}

const POLLING_INTERVAL = 5000; // 5 s — re-fetch while translation is pending

export default function DocumentViewerPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [doc, setDoc] = useState<CaseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    const isPending = (content: string) =>
        !content || content.startsWith("Translating…") || content.startsWith("Translation failed");

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        const fetch = async () => {
            try {
                const res = await api.get(`/cases/${id}`);
                setDoc(res.data);
                if (isPending(res.data.translated_content)) {
                    // Poll again after interval
                    timer = setTimeout(fetch, POLLING_INTERVAL);
                }
            } catch {
                // ignore — may have been deleted
            } finally {
                setLoading(false);
            }
        };

        fetch();
        return () => clearTimeout(timer);
    }, [id]);

    const handleDownload = async () => {
        if (!doc) return;
        setDownloading(true);
        try {
            const res = await api.get(`/cases/${doc.id}/download`, { responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            const base = doc.filename.replace(/\.pdf$/i, "");
            a.download = `${base}_${doc.target_language}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            alert("Download failed. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500">
                <Loader2 className="animate-spin mr-2" size={20} /> Loading document…
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4">
                <p>Document not found.</p>
                <button onClick={() => router.back()} className="text-blue-600 hover:underline">
                    ← Go back
                </button>
            </div>
        );
    }

    const pending = isPending(doc.translated_content);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center">
                            <FileText size={16} />
                        </div>
                        <div>
                            <h1 className="font-semibold text-slate-800 dark:text-white text-sm leading-tight">
                                {doc.filename}
                            </h1>
                            <p className="text-xs text-slate-400">
                                Translated to{" "}
                                <span className="text-blue-500 font-medium">{doc.target_language}</span>
                                {" · "}
                                {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                {!pending && (
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition disabled:opacity-60"
                    >
                        {downloading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Download size={14} />
                        )}
                        Download Translation
                    </button>
                )}
            </div>

            {/* Content box */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                {pending ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-4">
                        <Loader2 size={32} className="animate-spin text-blue-500" />
                        <div className="text-center">
                            <p className="font-medium text-slate-700 dark:text-slate-200">
                                Translation in progress…
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                                This page will automatically refresh once ready.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                            {doc.translated_content}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
