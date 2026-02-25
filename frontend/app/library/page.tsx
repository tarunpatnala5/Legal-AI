"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, Filter, Download, Trash2 } from "lucide-react";
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
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<CaseDoc | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [downloadLoading, setDownloadLoading] = useState<number | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchCases();
    }, []);

    const fetchCases = async () => {
        setLoading(true);
        try {
            const response = await api.get("/cases");
            setCases(response.data);
        } catch (error) {
            console.error("Failed to fetch cases:", error);
        } finally {
            setLoading(false);
        }
    };

    // Navigate to the translated content viewer
    const handleView = (doc: CaseDoc) => {
        router.push(`/library/${doc.id}`);
    };

    // Download the translated .txt file
    const handleDownload = async (doc: CaseDoc) => {
        setDownloadLoading(doc.id);
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
        } catch (err) {
            console.error("Download failed:", err);
            alert("Download failed. Please try again.");
        } finally {
            setDownloadLoading(null);
        }
    };

    // Delete document
    const handleDelete = async (doc: CaseDoc) => {
        setDeletingId(doc.id);
        try {
            await api.delete(`/cases/${doc.id}`);
            setCases((prev) => prev.filter((c) => c.id !== doc.id));
            setDeleteConfirm(null);
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed. Please try again.");
        } finally {
            setDeletingId(null);
        }
    };

    const filteredCases = cases.filter(
        (doc) =>
            doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.target_language.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto">
            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                <Trash2 size={18} className="text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 dark:text-white">Delete Document</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Are you sure you want to delete{" "}
                                    <span className="font-medium text-slate-700 dark:text-slate-200">
                                        {deleteConfirm.filename}
                                    </span>
                                    ? This cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={deletingId === deleteConfirm.id}
                                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
                            >
                                {deletingId === deleteConfirm.id ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Case Library</h1>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search documents..."
                            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                        />
                    </div>
                    <button className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Document Name</th>
                            <th className="px-6 py-4">Translation Language</th>
                            <th className="px-6 py-4">Upload Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    Loading library…
                                </td>
                            </tr>
                        ) : filteredCases.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    No documents found.
                                </td>
                            </tr>
                        ) : (
                            filteredCases.map((doc) => (
                                <tr
                                    key={doc.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition cursor-pointer"
                                >
                                    <td onClick={() => handleView(doc)} className="px-6 py-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center">
                                            <FileText size={16} />
                                        </div>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {doc.filename}
                                        </span>
                                    </td>
                                    <td onClick={() => handleView(doc)} className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                            {doc.target_language}
                                        </span>
                                    </td>
                                    <td onClick={() => handleView(doc)} className="px-6 py-4 text-slate-500">
                                        {new Date(doc.uploaded_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Download */}
                                            <button
                                                onClick={() => handleDownload(doc)}
                                                disabled={downloadLoading === doc.id}
                                                title="Download translated text"
                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-blue-600 transition disabled:opacity-50"
                                            >
                                                {downloadLoading === doc.id ? (
                                                    <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
                                                ) : (
                                                    <Download size={16} />
                                                )}
                                            </button>
                                            {/* Delete */}
                                            <button
                                                onClick={() => setDeleteConfirm(doc)}
                                                title="Delete document"
                                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-500 hover:text-red-600 transition"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
