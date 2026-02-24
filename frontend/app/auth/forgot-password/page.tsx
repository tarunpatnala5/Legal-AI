"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/auth/forgot-password", { email });
            setSent(true);
            toast.success("Reset instructions sent!");
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-amber-500/30">
                        <KeyRound size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Forgot Password</h1>
                    <p className="text-slate-500 mt-2">Enter your registered email to receive a reset link</p>
                </div>

                {sent ? (
                    <div className="text-center space-y-4">
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                            <p className="text-green-700 dark:text-green-300 font-medium">Reset link sent!</p>
                            <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                                Check your inbox. If SMTP is not configured, the link appears in the server logs.
                            </p>
                        </div>
                        <Link href="/auth/login" className="block text-blue-600 hover:underline text-sm">Back to Login</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="lawyer@example.com"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "Send Reset Link"}
                        </button>
                        <p className="text-center text-sm text-slate-500">
                            <Link href="/auth/login" className="text-blue-600 hover:underline">Back to Login</Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
