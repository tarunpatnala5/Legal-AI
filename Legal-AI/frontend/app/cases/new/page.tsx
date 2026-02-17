"use client";

import { useState } from "react";
import { UploadCloud, FileText, Check, Languages } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

const LANGUAGES = [
    "English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Urdu", "Gujarati",
    "Kannada", "Malayalam", "Odia", "Punjabi", "Assamese", "Maithili", "Santali",
    "Kashmiri", "Nepali", "Konkani", "Sindhi", "Dogri", "Manipuri", "Bodo", "Sanskrit"
];

export default function NewCasePage() {
    const [file, setFile] = useState<File | null>(null);
    const [language, setLanguage] = useState("Hindi");
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("language", language);

        try {
            await api.post("/cases/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Case file uploaded successfully!");
            setFile(null);
        } catch (error) {
            toast.error("Upload failed. Please try again.");
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-10">
            <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Upload New Case</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Upload case documents (PDF) for AI analysis and translation.</p>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">

                {/* File Drop Zone */}
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center hover:border-blue-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            {file ? <FileText size={32} /> : <UploadCloud size={32} />}
                        </div>
                        {file ? (
                            <div className="text-center">
                                <p className="font-semibold text-slate-800 dark:text-white">{file.name}</p>
                                <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <button onClick={(e) => { e.preventDefault(); setFile(null); }} className="text-red-500 text-xs mt-2 hover:underline">Remove</button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="font-medium text-slate-700 dark:text-slate-300">Click to upload or drag and drop</p>
                                <p className="text-xs text-slate-500 mt-1">PDF files only (Max 10MB)</p>
                            </div>
                        )}
                    </label>
                </div>

                {/* Language Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Languages size={16} /> Target Translation Language
                    </label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                    {uploading ? (
                        "Uploading..."
                    ) : (
                        <>
                            <Check size={20} /> Process Case File
                        </>
                    )}
                </button>

            </div>
        </div>
    );
}
