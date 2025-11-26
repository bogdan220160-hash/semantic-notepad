import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, XCircle, PlayCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Calendar() {
    const { t } = useLanguage();
    const [campaigns, setCampaigns] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const res = await axios.get('http://localhost:8000/campaigns/');
            setCampaigns(res.data);
        } catch (err) {
            console.error("Failed to fetch campaigns", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelCampaign = async (id, e) => {
        e.stopPropagation(); // Prevent card click
        if (!window.confirm("Are you sure you want to cancel this scheduled campaign?")) return;
        try {
            await axios.post(`http://localhost:8000/campaigns/stop/${id}`);
            fetchCampaigns(); // Refresh list
        } catch (err) {
            alert("Failed to cancel campaign: " + (err.response?.data?.detail || err.message));
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);

    // Adjust firstDay to start on Monday if needed (0=Sun, 1=Mon)
    // Let's stick to Sunday start for standard view, or Monday if European.
    // Standard JS getDay() is 0=Sun.

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDate(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDate(null);
    };

    const getCampaignsForDate = (day) => {
        return campaigns.filter(c => {
            const cDate = c.scheduled_for ? new Date(c.scheduled_for) : new Date(c.created_at);
            return cDate.getDate() === day &&
                cDate.getMonth() === currentDate.getMonth() &&
                cDate.getFullYear() === currentDate.getFullYear();
        });
    };

    const renderStatusIcon = (status) => {
        switch (status) {
            case 'scheduled': return <Clock size={12} />;
            case 'running': return <PlayCircle size={12} />;
            case 'completed': return <CheckCircle size={12} />;
            case 'stopped': return <XCircle size={12} />;
            default: return <AlertCircle size={12} />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'running': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'completed': return 'bg-gray-700/50 text-gray-400 border-gray-600/30';
            case 'stopped': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-700 text-gray-400';
        }
    };

    const renderCalendarGrid = () => {
        const grid = [];
        const totalSlots = Math.ceil((days + firstDay) / 7) * 7;

        for (let i = 0; i < totalSlots; i++) {
            const dayNum = i - firstDay + 1;
            const isCurrentMonth = dayNum > 0 && dayNum <= days;

            if (!isCurrentMonth) {
                grid.push(<div key={i} className="bg-gray-900/30 border border-gray-800/50 min-h-[100px]"></div>);
                continue;
            }

            const dayCampaigns = getCampaignsForDate(dayNum);
            const isToday = new Date().getDate() === dayNum &&
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getFullYear() === currentDate.getFullYear();

            grid.push(
                <div
                    key={i}
                    onClick={() => setSelectedDate(dayNum)}
                    className={`border border-gray-700/50 min-h-[100px] p-2 transition-colors hover:bg-gray-800/50 cursor-pointer ${isToday ? 'bg-blue-900/10 border-blue-500/30' : 'bg-gray-800/20'
                        } ${selectedDate === dayNum ? 'ring-2 ring-blue-500/50' : ''}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-medium ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                            {dayNum}
                        </span>
                        {dayCampaigns.length > 0 && (
                            <span className="text-xs bg-gray-700 text-gray-300 px-1.5 rounded-full">
                                {dayCampaigns.length}
                            </span>
                        )}
                    </div>
                    <div className="space-y-1">
                        {dayCampaigns.slice(0, 3).map(c => (
                            <div key={c.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate flex items-center space-x-1 ${getStatusColor(c.status)}`}>
                                {renderStatusIcon(c.status)}
                                <span className="truncate">{c.name}</span>
                            </div>
                        ))}
                        {dayCampaigns.length > 3 && (
                            <div className="text-[10px] text-gray-500 pl-1">
                                +{dayCampaigns.length - 3} more
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return grid;
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex items-center space-x-3">
                    <CalendarIcon className="text-blue-500" />
                    <span>{t('campaignCalendar') || "Campaign Calendar"}</span>
                </h1>

                <div className="flex items-center space-x-4 bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-lg font-medium text-gray-200 min-w-[150px] text-center">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                {/* Calendar Grid */}
                <div className="flex-1 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                    <div className="grid grid-cols-7 bg-gray-900/50 border-b border-gray-700/50">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
                        {renderCalendarGrid()}
                    </div>
                </div>

                {/* Selected Date Details */}
                {selectedDate && (
                    <div className="w-full lg:w-80 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-xl p-6 overflow-y-auto">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>

                        <div className="space-y-3">
                            {getCampaignsForDate(selectedDate).length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No campaigns for this day.</p>
                            ) : (
                                getCampaignsForDate(selectedDate).map(c => (
                                    <div key={c.id} className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 hover:border-blue-500/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-gray-200">{c.name}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${getStatusColor(c.status)}`}>
                                                {c.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <Clock size={12} />
                                                <span>
                                                    {c.scheduled_for
                                                        ? new Date(c.scheduled_for).toLocaleTimeString()
                                                        : new Date(c.created_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="font-mono text-gray-500">ID: {c.id}</div>
                                        </div>

                                        {c.status === 'scheduled' && (
                                            <button
                                                onClick={(e) => handleCancelCampaign(c.id, e)}
                                                className="mt-3 w-full flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs py-1.5 rounded-lg transition-colors border border-red-500/20"
                                            >
                                                <Trash2 size={12} />
                                                <span>Cancel Schedule</span>
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
