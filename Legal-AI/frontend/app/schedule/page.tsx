"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Plus, Bell, BellOff, CheckCircle, Loader2, X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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

type FilterType = 'all' | 'custom' | 'month';

export default function SchedulePage() {
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<ScheduleEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

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
        filterEvents();
    }, [events, filterType, selectedDate, currentMonth]);

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

    const filterEvents = () => {
        let filtered = [...events];

        if (filterType === 'custom' && selectedDate) {
            // Filter by specific selected date
            filtered = events.filter(event => {
                const eventDate = new Date(event.court_date);
                return eventDate.toDateString() === selectedDate.toDateString();
            });
        } else if (filterType === 'month') {
            // Filter by current month view
            filtered = events.filter(event => {
                const eventDate = new Date(event.court_date);
                return eventDate.getMonth() === currentMonth.getMonth() &&
                    eventDate.getFullYear() === currentMonth.getFullYear();
            });
        }

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

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setFilterType('custom');
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

    // Calendar Helper Functions
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const hasEventsOnDate = (date: Date) => {
        return events.some(event => {
            const eventDate = new Date(event.court_date);
            return eventDate.toDateString() === date.toDateString();
        });
    };

    const renderCalendar = () => {
        const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
        const days = [];
        const today = new Date();

        // Empty cells for days before the month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 sm:h-10 lg:h-12"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            const hasEvents = hasEventsOnDate(date);

            days.push(
                <button
                    key={day}
                    onClick={() => handleDateSelect(date)}
                    className={cn(
                        "h-8 sm:h-10 lg:h-12 rounded-lg flex items-center justify-center text-xs sm:text-sm lg:text-base font-semibold transition-all relative",
                        isSelected && "bg-blue-600 text-white shadow-lg",
                        !isSelected && isToday && "bg-blue-100 text-blue-600 dark:bg-blue-900/30",
                        !isSelected && !isToday && "hover:bg-slate-100 dark:hover:bg-slate-800",
                    )}
                >
                    {day}
                    {hasEvents && (
                        <span className={cn(
                            "absolute bottom-0.5 sm:bottom-1 lg:bottom-1.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full",
                            isSelected ? "bg-white" : "bg-blue-600 dark:bg-blue-400"
                        )}></span>
                    )}
                </button>
            );
        }

        return days;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-3 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mb-1 sm:mb-2">
                            Schedule & Calendar
                        </h1>
                        <p className="text-xs sm:text-sm lg:text-base text-slate-500 dark:text-slate-400">
                            Manage court dates and important deadlines
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium shadow-lg shadow-blue-600/30 transition-all hover:shadow-xl hover:shadow-blue-600/40 text-sm sm:text-base"
                    >
                        <Plus size={18} className="sm:w-5 sm:h-5" />
                        Add Event
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
                    {/* Calendar Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800">
                            <div className="mb-4 sm:mb-6">
                                <div className="flex items-center justify-between mb-3 sm:mb-4">
                                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Calendar</h2>
                                    <button
                                        onClick={() => {
                                            const today = new Date();
                                            setCurrentMonth(today);
                                            setSelectedDate(today);
                                            setFilterType('custom');
                                        }}
                                        className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                                    >
                                        Current Date
                                    </button>
                                </div>
                                
                                {/* Month and Year Selection with Navigation Arrows */}
                                <div className="flex items-end gap-1 sm:gap-2 mb-3 sm:mb-4">
                                    <div className="flex-1 min-w-[100px] sm:min-w-[130px]">
                                        <label className="block text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Month</label>
                                        <select
                                            value={currentMonth.getMonth()}
                                            onChange={(e) => {
                                                const newDate = new Date(currentMonth);
                                                newDate.setMonth(parseInt(e.target.value));
                                                setCurrentMonth(newDate);
                                            }}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                        >
                                            {['January', 'February', 'March', 'April', 'May', 'June', 
                                              'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                                                <option key={month} value={idx}>{month}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[70px] sm:min-w-[90px]">
                                        <label className="block text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Year</label>
                                        <select
                                            value={currentMonth.getFullYear()}
                                            onChange={(e) => {
                                                const newDate = new Date(currentMonth);
                                                newDate.setFullYear(parseInt(e.target.value));
                                                setCurrentMonth(newDate);
                                            }}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                        >
                                            {Array.from({ length: 101 }, (_, i) => 2000 + i).map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Navigation Arrows */}
                                    <div className="flex gap-0.5 sm:gap-1">
                                        <button
                                            onClick={() => navigateMonth('prev')}
                                            className="h-[38px] w-[38px] sm:h-[42px] sm:w-[42px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                            title="Previous Month"
                                        >
                                            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                                        </button>
                                        <button
                                            onClick={() => navigateMonth('next')}
                                            className="h-[38px] w-[38px] sm:h-[42px] sm:w-[42px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                            title="Next Month"
                                        >
                                            <ChevronRight size={18} className="sm:w-5 sm:h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="space-y-2">
                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="h-8 sm:h-10 lg:h-12 flex items-center justify-center text-[10px] sm:text-xs lg:text-sm font-bold text-slate-500 dark:text-slate-400">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Days */}
                                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                                    {renderCalendar()}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-600"></div>
                                    <span>Has Events</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Events List */}
                    <div className="lg:col-span-3">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
                            {/* Header with All Events Button */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                    {filterType === 'all' ? 'All Events' : 
                                     filterType === 'custom' && selectedDate ? 
                                     selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) :
                                     filterType === 'month' ?
                                     currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Events'}
                                </h2>
                                {(filterType !== 'all' || selectedDate) && (
                                    <button
                                        onClick={() => {
                                            setFilterType('all');
                                            setSelectedDate(null);
                                        }}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium"
                                    >
                                        <CalendarIcon size={14} className="sm:w-4 sm:h-4" />
                                        Show All Events
                                    </button>
                                )}
                            </div>

                            {/* Events Display */}
                            <div className="space-y-3 sm:space-y-4">
                                {filteredEvents.length === 0 && (
                                    <div className="text-center py-8 sm:py-12">
                                        <CalendarIcon size={40} className="sm:w-12 sm:h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3 sm:mb-4" />
                                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 italic">
                                            {filterType === 'custom' && selectedDate
                                                ? `No events scheduled for ${selectedDate.toLocaleDateString()}`
                                                : filterType === 'month'
                                                    ? 'No events this month'
                                                    : 'No upcoming events'}
                                        </p>
                                    </div>
                                )}
                                {filteredEvents.map((event) => {
                                    const date = new Date(event.court_date);
                                    return (
                                        <div key={event.id} className="bg-white dark:bg-slate-900 p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 sm:gap-3 relative overflow-hidden group shadow-sm hover:shadow-md transition">
                                            <div className={cn("absolute left-0 top-0 w-1 sm:w-1.5 h-full rounded-l-full",
                                                event.status === 'Closed' ? "bg-slate-400" :
                                                    event.status === 'In Progress' ? "bg-blue-500" : "bg-amber-500"
                                            )}></div>

                                            <div className="flex justify-between items-start pl-1 sm:pl-2">
                                                <h3 className="font-bold text-slate-800 dark:text-white ml-1 sm:ml-2 text-base sm:text-lg line-clamp-1 flex-1">{event.case_name}</h3>
                                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                                    <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${getStatusColor(event.status)}`}>
                                                        {event.status}
                                                    </span>
                                                    {event.notification_enabled ?
                                                        <Bell size={14} className="sm:w-4 sm:h-4 text-amber-500" /> :
                                                        <BellOff size={14} className="sm:w-4 sm:h-4 text-slate-300" />
                                                    }
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteEvent(event.id);
                                                        }}
                                                        className="ml-1 sm:ml-2 text-slate-400 hover:text-red-500 transition-colors p-0.5 sm:p-1"
                                                        title="Delete Event"
                                                    >
                                                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-slate-500 ml-2 sm:ml-4 font-medium">
                                                <span className="flex items-center gap-1 sm:gap-1.5"><CalendarIcon size={12} className="sm:w-3.5 sm:h-3.5" /> {date.toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1 sm:gap-1.5"><Clock size={12} className="sm:w-3.5 sm:h-3.5" /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Event Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl scale-100 transform transition-all max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold">Add New Event</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event Title</label>
                                <input
                                    type="text"
                                    value={newEvent.case_name}
                                    onChange={e => setNewEvent({ ...newEvent, case_name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Hearing vs State"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={newEvent.court_date}
                                        onChange={e => setNewEvent({ ...newEvent, court_date: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={newEvent.time}
                                        onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                    <select
                                        value={newEvent.status}
                                        onChange={e => setNewEvent({ ...newEvent, status: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    >
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>
                                <div className="flex items-end pb-2 sm:pb-3">
                                    <label className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={newEvent.notification_enabled}
                                                onChange={e => setNewEvent({ ...newEvent, notification_enabled: e.target.checked })}
                                            />
                                            <div className="w-9 h-5 sm:w-10 sm:h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition">
                                            Notify Me
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 sm:mt-8">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 sm:py-3 rounded-xl font-medium transition text-sm sm:text-base"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEvent}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 sm:py-3 rounded-xl font-medium transition shadow-lg shadow-blue-600/20 text-sm sm:text-base"
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
