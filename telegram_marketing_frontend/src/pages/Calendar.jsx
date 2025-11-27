
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, XCircle, PlayCircle, AlertCircle, Trash2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';

export default function Calendar() {
    const { t } = useLanguage();
    const [campaigns, setCampaigns] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [error, setError] = useState(null);
    const [cancelModal, setCancelModal] = useState(null); // campaignId to cancel

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const res = await axios.get('http://localhost:8000/campaigns/');
            setCampaigns(res.data);
        } catch (err) {
            console.error("Failed to fetch campaigns", err);
            setError("Failed to fetch campaigns");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelCampaign = async () => {
        if (!cancelModal) return;
        try {
            await axios.post(`http://localhost:8000/campaigns/stop/${cancelModal}`);
            fetchCampaigns(); // Refresh list
            setCancelModal(null);
        } catch (err) {
            setError("Failed to cancel campaign: " + (err.response?.data?.detail || err.message));
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
                grid.push(<div key={i} className="bg-gray-900/20 border border-gray-800/30 min-h-[120px]"></div>);
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
                    className={`border border-gray-700/30 min-h-[120px] p-3 transition-all hover:bg-gray-800/60 cursor-pointer group relative ${isToday ? 'bg-blue-900/10 border-blue-500/30' : 'bg-gray-800/30'
                        } ${selectedDate === dayNum ? 'ring-2 ring-blue-500/50 z-10' : ''}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 group-hover:text-gray-200'}`}>
                            {dayNum}
                        </span>
                        {dayCampaigns.length > 0 && (
                            <span className="text-[10px] font-bold bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full border border-gray-600">
                                {dayCampaigns.length}
                            </span>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        {dayCampaigns.slice(0, 3).map(c => (
                            <div key={c.id} className={`text-[10px] px-2 py-1 rounded-md border truncate flex items-center space-x-1.5 ${getStatusColor(c.status)}`}>
                                {renderStatusIcon(c.status)}
                                <span className="truncate font-medium">{c.name}</span>
                            </div>
                        ))}
                        {dayCampaigns.length > 3 && (
                            <div className="text-[10px] text-gray-500 pl-1 font-medium">
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
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 flex items-center space-x-3 tracking-tight">
                        <CalendarIcon className="text-blue-500 mr-3" size={32} />
                        <span>{t('campaignCalendar') || "Campaign Calendar"}</span>
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg ml-11">Schedule and manage your campaigns</p>
                </div>

                <div className="flex items-center space-x-6 bg-gray-800/40 backdrop-blur-md rounded-2xl p-2 border border-gray-700/50 shadow-lg">
                    <button onClick={prevMonth} className="p-3 hover:bg-gray-700/50 rounded-xl text-gray-400 hover:text-white transition-all hover:scale-110">
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-xl font-bold text-gray-100 min-w-[200px] text-center">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="p-3 hover:bg-gray-700/50 rounded-xl text-gray-400 hover:text-white transition-all hover:scale-110">
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center space-x-3">
                        <AlertCircle className="text-red-500" size={24} />
                        <span className="font-medium">{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            )}

            <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
                {/* Calendar Grid */}
                <div className="flex-1 bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="grid grid-cols-7 bg-gray-900/60 border-b border-gray-700/50">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="py-4 text-center text-sm font-bold text-gray-400 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto custom-scrollbar bg-gray-900/20">
                        {renderCalendarGrid()}
                    </div>
                </div>

                {/* Selected Date Details */}
                <div className={`w-full lg:w-96 bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col transition-all duration-300 ${selectedDate ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-10 lg:translate-x-0'}`}>
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center border-b border-gray-700/50 pb-4">
                        <Clock className="mr-3 text-blue-400" />
                        {selectedDate 
                            ? new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
                            : "Select a date"
                        }
                    </h3>

                    <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
                        {!selectedDate ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <CalendarIcon size={48} className="mb-4 opacity-20" />
                                <p className="text-lg">Click on a date to view details</p>
                            </div>
                        ) : getCampaignsForDate(selectedDate).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-500 bg-gray-900/20 rounded-2xl border border-gray-700/30 border-dashed">
                                <p>No campaigns scheduled</p>
                            </div>
                        ) : (
                            getCampaignsForDate(selectedDate).map(c => (
                                <div key={c.id} className="bg-gray-900/40 border border-gray-700/50 rounded-2xl p-5 hover:border-blue-500/30 transition-all hover:shadow-lg group">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-bold text-gray-100 text-lg">{c.name}</h4>
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-bold border tracking-wide ${getStatusColor(c.status)}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-400 space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Clock size={14} className="text-blue-400" />
                                            <span className="font-mono text-gray-300">
                                                {(() => {
                                                    const dateStr = c.scheduled_for || c.created_at;
                                                    if (!dateStr) return '';
                                                    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
                                                    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-500 font-mono">ID: {c.id}</span>
                                        </div>
                                    </div>

                                    {c.status === 'scheduled' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCancelModal(c.id);
                                            }}
                                            className="mt-4 w-full flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm py-2.5 rounded-xl transition-all border border-red-500/20 hover:border-red-500/40 font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                                        >
                                            <Trash2 size={16} />
                                            <span>Cancel Schedule</span>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!cancelModal}
                onClose={() => setCancelModal(null)}
                onConfirm={handleCancelCampaign}
                title="Cancel Scheduled Campaign"
                message="Are you sure you want to cancel this scheduled campaign? This action cannot be undone."
                confirmText="Yes, Cancel It"
                cancelText="Keep It"
                isDestructive={true}
            />
        </div>
    );
}
