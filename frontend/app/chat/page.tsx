"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, FileText, Bot, User, Paperclip, Plus, MessageSquare, Loader2, Calendar as CalendarIcon, Trash2, Menu, X, LogIn } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

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
    const router = useRouter();
    const { isLoggedIn } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load Sessions on Mount (only for logged-in users)
    useEffect(() => {
        if (isLoggedIn) {
            fetchSessions();
        }
    }, [isLoggedIn]);

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
        setMobileSessionsOpen(false); // Close drawer on mobile when selecting session
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
        setMobileSessionsOpen(false); // Close drawer on mobile

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
        if (!isLoggedIn) {
            toast.error("Please login to add events to your calendar");
            router.push("/auth/login?returnTo=/chat");
            return;
        }
        try {
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
                <div className="[color:inherit]">
                    <div className="whitespace-pre-wrap">{textPart}</div>
                    {eventData && (
                        <div className="mt-4 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-600 rounded-xl p-4 shadow-sm max-w-sm">
                            <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400 font-semibold">
                                <CalendarIcon size={18} />
                                <span>Suggested Event</span>
                            </div>
                            <div className="text-sm space-y-1 mb-4 text-slate-700 dark:text-slate-200">
                                <div className="font-medium text-slate-800 dark:text-white">{eventData.title}</div>
                                <div className="text-slate-500 dark:text-slate-400">{eventData.date} at {eventData.time}</div>
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
        return <div className="whitespace-pre-wrap [color:inherit]">{content}</div>;
    };

    /* Sessions sidebar - drawer on mobile, column on desktop */
    const sessionsPanel = (
        <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-800">
            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
                <span className="font-semibold text-slate-800 dark:text-white lg:block hidden">Conversations</span>
                <button
                    onClick={handleNewSession}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition min-h-[44px]"
                >
                    New Chat
                </button>
                <button
                    onClick={() => setMobileSessionsOpen(false)}
                    className="lg:hidden p-2.5 -mr-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
                {!isLoggedIn ? (
                    <div className="flex flex-col items-center justify-center h-full py-10 px-4 text-center gap-3">
                        <LogIn size={32} className="text-slate-300 dark:text-slate-600" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Login to save and view your chat history
                        </p>
                        <button
                            onClick={() => router.push("/auth/login?returnTo=/chat")}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
                        >
                            <LogIn size={14} />
                            Login
                        </button>
                    </div>
                ) : (
                    <>
                        {sessions.map(session => (
                            <div key={session.id} className="group relative">
                                <button
                                    onClick={() => loadSession(session.id)}
                                    className={cn(
                                        "w-full text-left p-3.5 rounded-xl text-sm truncate flex items-center gap-3 transition pr-12 min-h-[44px] touch-manipulation",
                                        currentSessionId === session.id
                                            ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-medium"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800"
                                    )}
                                >
                                    <MessageSquare size={16} className="shrink-0" />
                                    <span className="truncate">{session.title}</span>
                                </button>
                                <button
                                    onClick={(e) => handleDeleteSession(e, session.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 lg:opacity-0 lg:group-hover:opacity-100 transition"
                                    title="Delete Conversation"
                                    aria-label="Delete conversation"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {sessions.length === 0 && (
                            <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm px-4">
                                No history yet. Start a new chat above.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] min-h-0 max-h-[calc(100dvh-8rem)] lg:h-[calc(100vh-8rem)] gap-0 lg:gap-6 rounded-2xl overflow-hidden">
            {/* Mobile: overlay when sessions open */}
            <AnimatePresence>
                {mobileSessionsOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            onClick={() => setMobileSessionsOpen(false)}
                            aria-hidden
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "tween", duration: 0.2 }}
                            className="fixed inset-y-0 left-0 w-[min(280px,85vw)] z-50 lg:hidden flex flex-col bg-white dark:bg-slate-800 shadow-xl"
                        >
                            {sessionsPanel}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Sidebar - hidden on mobile (shown in drawer above) */}
            <div className="hidden lg:flex w-64 shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-col bg-white dark:bg-slate-800">
                {sessionsPanel}
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                {/* Mobile: header with menu to open sessions */}
                <div className="lg:hidden flex items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <button
                        onClick={() => setMobileSessionsOpen(true)}
                        className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                        aria-label="Open conversations"
                    >
                        <Menu size={22} />
                    </button>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                        {currentSessionId ? sessions.find(s => s.id === currentSessionId)?.title ?? "Chat" : "New Chat"}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-0">
                    {messages.length === 0 ? (
                        <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-center px-4">
                            <Bot size={40} className="mb-3 sm:mb-4" />
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">Select a conversation or start a new one to begin drafting.</p>
                            <button
                                onClick={() => setMobileSessionsOpen(true)}
                                className="lg:hidden mt-4 text-blue-600 dark:text-blue-400 text-sm font-medium"
                            >
                                Open conversations
                            </button>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={cn("flex gap-3 sm:gap-4 max-w-4xl", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                                <div className={cn("w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", msg.role === "assistant" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700")}>
                                    {msg.role === "assistant" ? <Bot size={18} className="sm:w-4 sm:h-4" /> : <User size={18} className="sm:w-4 sm:h-4" />}
                                </div>
                                <div className={cn("group relative p-4 sm:p-5 rounded-2xl shadow-sm border text-sm leading-relaxed max-w-[92%] sm:max-w-[85%] break-words",
                                    msg.role === "assistant"
                                        ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-tl-none"
                                        : "bg-blue-50 dark:bg-blue-900/30 text-slate-800 dark:text-slate-100 border-blue-100 dark:border-blue-800 rounded-tr-none"
                                )}>
                                    {msg.document_name && (
                                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-black/5 dark:border-white/10 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                            <FileText size={14} />
                                            <span className="truncate">Reference: {msg.document_name}</span>
                                        </div>
                                    )}
                                    {renderMessageContent(msg.content)}
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex gap-3 sm:gap-4 max-w-4xl">
                            <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                <Bot size={18} className="text-white sm:w-4 sm:h-4" />
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {/* Input Area - sticky, safe area friendly */}
                <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0)] shrink-0">
                    <div className="flex gap-2 sm:gap-3 max-w-4xl mx-auto items-end">
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
                            className={cn("p-3 rounded-xl transition disabled:opacity-50 relative min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation shrink-0",
                                pendingFile ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            )}
                            title="Attach PDF Context"
                            aria-label="Attach PDF"
                        >
                            <Paperclip size={20} />
                            {pendingFile && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
                        </button>

                        <div className="flex-1 min-w-0 relative">
                            {pendingFile && (
                                <div className="absolute -top-7 left-0 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-t border border-blue-100 dark:border-blue-800 flex items-center gap-1 max-w-full truncate">
                                    <FileText size={10} className="shrink-0" /> <span className="truncate">{pendingFile.name}</span>
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
                                className={cn("w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 resize-none max-h-28 sm:max-h-32 min-h-[44px] text-base sm:text-sm touch-manipulation",
                                    pendingFile ? "rounded-tl-none" : ""
                                )}
                                rows={1}
                            />
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={(!input.trim() && !pendingFile) || loading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition shadow-lg shadow-blue-500/20 touch-manipulation shrink-0"
                            aria-label="Send"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
