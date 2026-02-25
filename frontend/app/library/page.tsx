"use client";

import { useEffect, useState, useRef } from "react";
import { FileText, Search, Filter, MoreVertical, Download, Eye, Trash2, X } from "lucide-react";
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
    const [activeMenu, setActiveMenu] = useState<number | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<CaseDoc | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    useEffect(() => {
        fetchCases();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
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

    // View: open the file in a new browser tab
    const handleView = (doc: CaseDoc) => {
        const token = localStorage.getItem("token");
        // Open via the download endpoint but the browser will render PDFs natively
        const url = `${BASE_URL}/cases/${doc.id}/download`;
        // We can't pass the auth header via window.open, so use a temporary anchor with fetch blob
        api
            .get(`/cases/${doc.id}/download`, { responseType: "blob" })
            .then((res) => {
                const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/pdf" });
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, "_blank");
                // Clean up after a delay
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            })
            .catch(() => alert("Could not open document. Please try downloading it instead."));
    };

    // Download: trigger a file download
    const handleDownload = (doc: CaseDoc) => {
        api
            .get(`/cases/${doc.id}/download`, { responseType: "blob" })
            .then((res) => {
                const blob = new Blob([res.data]);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = doc.filename;
                a.click();
                URL.revokeObjectURL(url);
            })
            .catch(() => alert("Download failed. Please try again."));
    };

    // Delete
    const handleDelete = async (doc: CaseDoc) => {
        setDeletingId(doc.id);
        try {
            await api.delete(`/cases/${doc.id}`);
            setCases((prev) => prev.filter((c) => c.id !== doc.id));
        } catch {
            alert("Delete failed. Please try again.");
        } finally {
            setDeletingId(null);
            setDeleteConfirm(null);
        }
    };

    const filteredCases = cases.filter((doc) =>
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
                                    Are you sure you want to delete <span className="font-medium text-slate-700 dark:text-slate-200">{deleteConfirm.filename}</span>? This action cannot be undone.
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
                                {deletingId === deleteConfirm.id ? "Deleting..." : "Delete"}
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
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading library...</td></tr>
                        ) : filteredCases.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">No documents found.</td></tr>
                        ) : filteredCases.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
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
                                    <div className="flex items-center justify-end gap-2 relative" ref={activeMenu === doc.id ? menuRef : null}>
                                        {/* View button */}
                                        <button
                                            onClick={() => handleView(doc)}
                                            title="View document"
                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-blue-600 transition"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        {/* Download button */}
                                        <button
                                            onClick={() => handleDownload(doc)}
                                            title="Download document"
                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-blue-600 transition"
                                        >
                                            <Download size={16} />
                                        </button>
                                        {/* More options */}
                                        <button
                                            onClick={() => setActiveMenu(activeMenu === doc.id ? null : doc.id)}
                                            title="More options"
                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 transition"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                        {/* Dropdown menu */}
                                        {activeMenu === doc.id && (
                                            <div className="absolute right-0 top-8 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 w-40">
                                                <button
                                                    onClick={() => { handleView(doc); setActiveMenu(null); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                                >
                                                    <Eye size={14} /> View
                                                </button>
                                                <button
                                                    onClick={() => { handleDownload(doc); setActiveMenu(null); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                                >
                                                    <Download size={14} /> Download
                                                </button>
                                                <hr className="my-1 border-slate-100 dark:border-slate-700" />
                                                <button
                                                    onClick={() => { setDeleteConfirm(doc); setActiveMenu(null); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        )}
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
