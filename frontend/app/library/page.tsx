"use client";

import { useEffect, useState } from "react";
import { FileText, Search, Filter, MoreVertical, Download, Eye } from "lucide-react";
import api from "@/lib/api";

interface CaseDoc {
    id: number;
    filename: string;
    uploaded_at: string;
    target_language: string;
}

export default function LibraryPage() {
    const [cases, setCases] = useState<CaseDoc[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCases = async () => {
            try {
                const response = await api.get("/cases");
                setCases(response.data);
            } catch (error) {
                console.error("Failed to fetch cases:", error);
                // toast.error("Could not load library"); // Context: Toast might not be imported, safe to skip or add if needed
            } finally {
                setLoading(false);
            }
        };

        fetchCases();
    }, []);

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Case Library</h1>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                        <input
                            placeholder="Search documents..."
                            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Document Name</th>
                            <th className="px-6 py-4">Translation Language</th>
                            <th className="px-6 py-4">Upload Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading library...</td></tr>
                        ) : cases.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center">
                                        <FileText size={16} />
                                    </div>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{doc.filename}</span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                        {doc.target_language}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-blue-600">
                                            <Eye size={16} />
                                        </button>
                                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-blue-600">
                                            <Download size={16} />
                                        </button>
                                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500">
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
