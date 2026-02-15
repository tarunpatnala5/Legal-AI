"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Plus, Bell, BellOff, CheckCircle, Loader2, X, Trash2, Filter } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ScheduleEvent {
    id: number;
    case_name: string;
    court_date: string;
    reminder_date: string;
    status: string;
    notification_enabled: boolean;
}

type FilterType = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function SchedulePage() {
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<ScheduleEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Filter State
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [customDate, setCustomDate] = useState('');

    // Form State
    const [newEvent, setNewEvent] = useState({
        case_name: "",
        court_date: "",
        time: "10:00",
        status: "Scheduled",
        notification_enabled: true
    });

    useEffect(() => {
        fetchSchedules();
    }, []);

    useEffect(() => {
        applyFilter();
    }, [events, filterType, customDate]);

    const fetchSchedules = async () => {
        try {
            const res = await api.get("/schedule/");
            setEvents(res.data);
            checkUpcomingDeadlines(res.data);
        } catch (error) {
            toast.error("Failed to load schedule");
        } finally {
            setLoading(false);
        }
    };

    const applyFilter = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let filtered = [...events];

        switch (filterType) {
            case 'today':
                filtered = events.filter(event => {
                    const eventDate = new Date(event.court_date);
                    eventDate.setHours(0, 0, 0, 0);
                    return eventDate.getTime() === now.getTime();
                });
                break;

            case 'week':
                const weekEnd = new Date(now);
                weekEnd.setDate(now.getDate() + 7);
                filtered = events.filter(event => {
                    const eventDate = new Date(event.court_date);
                    return eventDate >= now && eventDate <= weekEnd;
                });
                break;

            case 'month':
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                filtered = events.filter(event => {
                    const eventDate = new Date(event.court_date);
                    return eventDate >= now && eventDate <= monthEnd;
                });
                break;

            case 'custom':
                if (customDate) {
                    const selectedDate = new Date(customDate);
                    selectedDate.setHours(0, 0, 0, 0);
                    filtered = events.filter(event => {
                        const eventDate = new Date(event.court_date);
                        eventDate.setHours(0, 0, 0, 0);
                        return eventDate.getTime() === selectedDate.getTime();
                    });
                }
                break;

            case 'all':
            default:
                filtered = events;
                break;
        }

        // Sort by date
        filtered.sort((a, b) => new Date(a.court_date).getTime() - new Date(b.court_date).getTime());
        setFilteredEvents(filtered);
    };

    const checkUpcomingDeadlines = (events: ScheduleEvent[]) => {
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const upcoming = events.filter(e => {
            if (!e.notification_enabled) return false;
            const reminderTarget = new Date(e.reminder_date || e.court_date);
            return reminderTarget > now && reminderTarget <= nextWeek;
        });

        if (upcoming.length > 0) {
            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-slate-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                    <div className="flex-1 w-0 p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <Bell className="h-10 w-10 text-amber-500 animate-pulse" />
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Upcoming Deadlines
                                </p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    You have {upcoming.length} active reminders for the next week.
                                </p>
                            </div>
                            <div className="ml-4 flex-shrink-0 flex">
                                <button
                                    className="bg-white dark:bg-slate-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    onClick={() => toast.dismiss(t.id)}
                                >
                                    <span className="sr-only">Close</span>
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ), { duration: 5000 });
        }
    };

    const handleAddEvent = async () => {
        if (!newEvent.case_name || !newEvent.court_date) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            const datetime = new Date(`${newEvent.court_date}T${newEvent.time}:00`);

            await api.post("/schedule/", {
                case_name: newEvent.case_name,
                court_date: datetime.toISOString(),
                reminder_date: datetime.toISOString(),
                status: newEvent.status,
                notification_enabled: newEvent.notification_enabled
            });

            toast.success("Event Scheduled");
            setShowModal(false);
            setNewEvent({ case_name: "", court_date: "", time: "10:00", status: "Scheduled", notification_enabled: true });
            fetchSchedules();
        } catch (error: any) {
            if (error.response?.status === 401) {
                toast.error("Session expired. Please log in again.");
            } else {
                toast.error("Failed to add event");
            }
        }
    };

    const handleDeleteEvent = async (id: number) => {
        if (!confirm("Are you sure you want to delete this event?")) return;

        try {
            await api.delete(`/schedule/${id}`);
            toast.success("Event deleted");
            setEvents(events.filter(e => e.id !== id));
        } catch (error) {
            toast.error("Failed to delete event");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'Closed': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
            case 'Scheduled':
            default:
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Court Schedule
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Manage your court dates and hearings
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
                    >
                        <Plus size={20} />
                        Add Event
                    </button>
                </div>

                {/* Filter Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 mb-6 shadow-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={20} className="text-blue-600" />
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Filter Events</h2>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        {/* Filter Buttons */}
                        <button
                            onClick={() => {
                                setFilterType('all');
                                setCustomDate('');
                            }}
                            className={cn(
                                "px-4 py-2 rounded-xl font-medium transition-all",
                                filterType === 'all'
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                        >
                            All Events
                        </button>
                        
                        <button
                            onClick={() => {
                                setFilterType('today');
                                setCustomDate('');
                            }}
                            className={cn(
                                "px-4 py-2 rounded-xl font-medium transition-all",
                                filterType === 'today'
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                        >
                            Today
                        </button>
                        
                        <button
                            onClick={() => {
                                setFilterType('week');
                                setCustomDate('');
                            }}
                            className={cn(
                                "px-4 py-2 rounded-xl font-medium transition-all",
                                filterType === 'week'
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                        >
                            This Week
                        </button>
                        
                        <button
                            onClick={() => {
                                setFilterType('month');
                                setCustomDate('');
                            }}
                            className={cn(
                                "px-4 py-2 rounded-xl font-medium transition-all",
                                filterType === 'month'
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                        >
                            This Month
                        </button>

                        {/* Custom Date Picker */}
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => {
                                    setCustomDate(e.target.value);
                                    setFilterType('custom');
                                }}
                                className={cn(
                                    "px-4 py-2 rounded-xl font-medium border-2 transition-all",
                                    filterType === 'custom'
                                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                        : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                )}
                            />
                            {customDate && (
                                <button
                                    onClick={() => {
                                        setCustomDate('');
                                        setFilterType('all');
                                    }}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                    title="Clear date"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results count */}
                    <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                        Showing <span className="font-bold text-blue-600">{filteredEvents.length}</span> of <span className="font-bold">{events.length}</span> events
                    </div>
                </div>

                {/* Events List */}
                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
                    <div className="space-y-4">
                        {filteredEvents.length === 0 && (
                            <div className="text-center py-12">
                                <CalendarIcon className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-700 mb-4" />
                                <p className="text-slate-500 dark:text-slate-400 text-lg">
                                    {filterType === 'all' 
                                        ? "No events scheduled yet."
                                        : "No events found for this filter."}
                                </p>
                                <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                                    {filterType !== 'all' && "Try selecting a different date range."}
                                </p>
                            </div>
                        )}
                        
                        {filteredEvents.map((event) => {
                            const date = new Date(event.court_date);
                            return (
                                <div key={event.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 relative overflow-hidden group shadow-sm hover:shadow-md transition">
                                    <div className={cn("absolute left-0 top-0 w-1.5 h-full rounded-l-full",
                                        event.status === 'Closed' ? "bg-slate-400" :
                                            event.status === 'In Progress' ? "bg-blue-500" : "bg-amber-500"
                                    )}></div>

                                    <div className="flex justify-between items-start pl-2">
                                        <h3 className="font-bold text-slate-800 dark:text-white ml-2 text-lg line-clamp-1">{event.case_name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(event.status)}`}>
                                                {event.status}
                                            </span>
                                            {event.notification_enabled ?
                                                <Bell size={16} className="text-amber-500" /> :
                                                <BellOff size={16} className="text-slate-300" />
                                            }
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteEvent(event.id);
                                                }}
                                                className="ml-2 text-slate-400 hover:text-red-500 transition-colors p-1"
                                                title="Delete Event"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-slate-500 ml-4 font-medium">
                                        <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> {date.toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1.5"><Clock size={14} /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Add Event Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-8 shadow-2xl scale-100 transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold">Add New Event</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event Title</label>
                                <input
                                    type="text"
                                    value={newEvent.case_name}
                                    onChange={e => setNewEvent({ ...newEvent, case_name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Hearing vs State"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={newEvent.court_date}
                                        onChange={e => setNewEvent({ ...newEvent, court_date: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={newEvent.time}
                                        onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                    <select
                                        value={newEvent.status}
                                        onChange={e => setNewEvent({ ...newEvent, status: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    >
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>
                                <div className="flex items-end pb-3">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={newEvent.notification_enabled}
                                                onChange={e => setNewEvent({ ...newEvent, notification_enabled: e.target.checked })}
                                            />
                                            <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">
                                            Notify Me
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEvent}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition shadow-lg shadow-blue-600/20"
                            >
                                Schedule Event
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
