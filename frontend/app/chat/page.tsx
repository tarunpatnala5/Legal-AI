"use client";

import { useState, useRef, useEffect } from "react";
import { Send, FileText, Bot, User, Paperclip, Plus, MessageSquare, Loader2, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    role: "user" | "assistant";
    content: string;
    document_name?: string;
}

interface Session {
    id: number;
    title: string;
    created_at: string;
}

export default function ChatPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load Sessions on Mount
    useEffect(() => {
        fetchSessions();
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchSessions = async () => {
        try {
            const res = await api.get("/chat/sessions");
            setSessions(res.data);
        } catch (error) {
            console.error("Failed to fetch sessions", error);
        }
    };

    const loadSession = async (sessionId: number) => {
        setLoading(true);
        setCurrentSessionId(sessionId);
        try {
            const res = await api.get(`/chat/sessions/${sessionId}`);
            // Map backend history to frontend format
            setMessages(res.data.map((m: any) => ({
                role: m.role,
                content: m.content,
                document_name: m.document_name
            })));
        } catch (error) {
            toast.error("Failed to load conversation");
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setInput("");
        setPendingFile(null);
        setLoading(false); // Ensure loading state is reset

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        // Focus input for immediate typing
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 50);

        toast.dismiss(); // Clear any existing toasts
        toast.success("New conversation started");
    };

    const handleSend = async () => {
        if (!input.trim() && !pendingFile) return;

        let activeSessionId = currentSessionId;

        // 1. Handle File Upload if present
        if (pendingFile) {
            setLoading(true);
            try {
                if (!activeSessionId) {
                    const res = await api.post("/chat/sessions", { title: "New Document Analysis" });
                    activeSessionId = res.data.id;
                    setCurrentSessionId(activeSessionId);
                }

                const formData = new FormData();
                formData.append("file", pendingFile);
                formData.append("session_id", activeSessionId!.toString());

                await api.post("/chat/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                setPendingFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                toast.success("Document attached to context");

                if (activeSessionId) loadSession(activeSessionId);

            } catch (error) {
                toast.error("Failed to upload file");
                setLoading(false);
                return;
            }
        }

        // 2. Handle Text Message
        if (!input.trim()) {
            setLoading(false);
            return;
        }

        const userMsg: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        const currentInput = input;
        setInput("");
        setLoading(true);

        try {
            const res = await api.post("/chat/message", {
                session_id: activeSessionId,
                message: currentInput
            });

            const botMsg: Message = { role: "assistant", content: res.data.response };
            setMessages(prev => [...prev, botMsg]);

            if (!activeSessionId && res.data.session_id) {
                setCurrentSessionId(res.data.session_id);
                fetchSessions();
            }
        } catch (error) {
            toast.error("Failed to send message");
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setPendingFile(file);
    };

    const handleQuickSchedule = async (eventData: any) => {
        try {
            // We need to construct a full datetime. Assuming 9 AM if not specified or just use 'time' field.
            const dateTimeStr = `${eventData.date}T${eventData.time || "10:00"}:00`;

            await api.post("/schedule/", {
                case_name: eventData.title,
                court_date: dateTimeStr,
                reminder_date: dateTimeStr
            });
            toast.success("Event added to Schedule");
        } catch (error) {
            toast.error("Failed to schedule event");
        }
    };

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: number) => {
        e.stopPropagation(); // Prevent loading the session when clicking delete
        if (!confirm("Are you sure you want to delete this conversation?")) return;

        try {
            await api.delete(`/chat/sessions/${sessionId}`);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) {
                handleNewSession();
            }
            toast.success("Conversation deleted");
        } catch (error) {
            toast.error("Failed to delete conversation");
        }
    };

    const renderMessageContent = (content: string) => {
        const jsonBlockRegex = /```json\s*(\{\s*"action":\s*"schedule"[\s\S]*?\})\s*```/;
        const match = content.match(jsonBlockRegex);

        if (match) {
            const textPart = content.replace(jsonBlockRegex, "").trim();
            let eventData = null;
            try {
                eventData = JSON.parse(match[1]);
            } catch (e) { }

            return (
                <div>
                    <div className="whitespace-pre-wrap">{textPart}</div>
                    {eventData && (
                        <div className="mt-4 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-xl p-4 shadow-sm max-w-sm">
                            <div className="flex items-center gap-2 mb-2 text-blue-600 font-semibold">
                                <CalendarIcon size={18} />
                                <span>Suggested Event</span>
                            </div>
                            <div className="text-sm space-y-1 mb-4">
                                <div className="font-medium text-slate-800 dark:text-white">{eventData.title}</div>
                                <div className="text-slate-500">{eventData.date} at {eventData.time}</div>
                            </div>
                            <button
                                onClick={() => handleQuickSchedule(eventData)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition shadow-sm"
                            >
                                Add to Calendar
                            </button>
                        </div>
                    )}
                </div>
            );
        }
        return <div className="whitespace-pre-wrap">{content}</div>;
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            {/* Sidebar - Library */}
            <div className="w-64 shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <button
                        onClick={handleNewSession}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition"
                    >
                        <Plus size={16} /> New Chat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.map(session => (
                        <div key={session.id} className="group relative">
                            <button
                                onClick={() => loadSession(session.id)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg text-sm truncate flex items-center gap-2 transition pr-8",
                                    currentSessionId === session.id
                                        ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-medium"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                )}
                            >
                                <MessageSquare size={14} />
                                <span className="truncate">{session.title}</span>
                            </button>
                            <button
                                onClick={(e) => handleDeleteSession(e, session.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                                title="Delete Conversation"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-xs">
                            No history yet
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                            <Bot size={48} className="mb-4" />
                            <p>Select a conversation or start a new one to begin drafting.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={cn("flex gap-4 max-w-4xl", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1", msg.role === "assistant" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700")}>
                                    {msg.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                                </div>
                                <div className={cn("group relative p-5 rounded-2xl shadow-sm border text-sm leading-relaxed max-w-[85%]",
                                    msg.role === "assistant"
                                        ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-tl-none"
                                        : "bg-blue-50 dark:bg-blue-900/20 text-slate-800 dark:text-slate-200 border-blue-100 dark:border-blue-800 rounded-tr-none"
                                )}>
                                    {msg.document_name && (
                                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-black/5 dark:border-white/10 text-xs font-semibold text-blue-500">
                                            <FileText size={14} />
                                            <span>Reference: {msg.document_name}</span>
                                        </div>
                                    )}
                                    {renderMessageContent(msg.content)}
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex gap-4 max-w-4xl">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                <Bot size={16} className="text-white" />
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef}></div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex gap-3 max-w-4xl mx-auto items-end">
                        <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className={cn("p-3 rounded-lg transition disabled:opacity-50 relative",
                                pendingFile ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            )}
                            title="Attach PDF Context"
                        >
                            <Paperclip size={20} />
                            {pendingFile && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                        </button>

                        <div className="flex-1 relative">
                            {pendingFile && (
                                <div className="absolute -top-8 left-0 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-t border border-blue-100 flex items-center gap-1">
                                    <FileText size={10} /> {pendingFile.name}
                                </div>
                            )}
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={pendingFile ? "Add a message with your file..." : "Draft a notice for... or Ask about IPC Section..."}
                                className={cn("w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 resize-none max-h-32 min-h-[50px]",
                                    pendingFile ? "rounded-tl-none" : ""
                                )}
                                rows={1}
                            />
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={(!input.trim() && !pendingFile) || loading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition shadow-lg shadow-blue-500/20"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
