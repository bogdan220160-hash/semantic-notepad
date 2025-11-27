
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Download, Search, Filter, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import CustomDropdown from '../components/CustomDropdown';

export default function Logs() {
    const { t } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (searchQuery) params.append('search', searchQuery);

            const res = await axios.get(`http://localhost:8000/logs/?${params.toString()}`);
            setLogs(res.data);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 500); // Debounce search
        return () => clearTimeout(timer);
    }, [statusFilter, searchQuery]);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (searchQuery) params.append('search', searchQuery);

            const response = await axios.get(`http://localhost:8000/logs/export?${params.toString()}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'logs_export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Failed to export logs", err);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 tracking-tight">
                        {t('campaignLogs')}
                    </h2>
                    <p className="text-gray-400 mt-2 text-lg">{t('logsDescription')}</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={fetchLogs}
                        className="p-3 bg-gray-800/50 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-all border border-gray-700/50 hover:border-gray-600"
                        title={t('refresh')}
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-5 py-3 rounded-xl transition-all shadow-lg shadow-green-500/20 transform hover:-translate-y-0.5"
                    >
                        <Download size={20} />
                        <span className="font-medium">{t('exportCsv')}</span>
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-5 mb-8">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                    <input
                        placeholder={t('searchPlaceholder')}
                        className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl pl-12 pr-4 py-3.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-gray-600 backdrop-blur-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="min-w-[240px]">
                    <CustomDropdown
                        options={[
                            { value: '', label: t('allStatuses') },
                            { value: 'success', label: t('success') },
                            { value: 'failed', label: t('failed') },
                            { value: 'pending', label: t('pending') }
                        ]}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        icon={Filter}
                        placeholder={t('allStatuses')}
                    />
                </div>
            </div>
            <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-300px)]">
                <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-300 border-b border-gray-700/50 whitespace-nowrap">{t('time')}</th>
                                <th className="px-6 py-4 font-semibold text-gray-300 border-b border-gray-700/50 whitespace-nowrap">{t('campaignStatus')}</th>
                                <th className="px-6 py-4 font-semibold text-gray-300 border-b border-gray-700/50 whitespace-nowrap">{t('recipient')}</th>
                                <th className="px-6 py-4 font-semibold text-gray-300 border-b border-gray-700/50 whitespace-nowrap">{t('status')}</th>
                                <th className="px-6 py-4 font-semibold text-gray-300 border-b border-gray-700/50 w-full whitespace-nowrap">{t('error')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/30">
                            {logs.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText size={48} className="mb-4 opacity-20" />
                                            <p className="text-lg font-medium">{t('noLogsFound')}</p>
                                            <p className="text-sm mt-1 opacity-60">{t('adjustFilters')}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-blue-500/5 transition-colors group">
                                        <td className="px-6 py-4 text-gray-400 font-mono text-xs whitespace-nowrap group-hover:text-gray-300">
                                            <div className="flex items-center space-x-2">
                                                <Clock size={14} className="opacity-50" />
                                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">
                                            <span className="bg-gray-700/50 px-2 py-1 rounded text-xs border border-gray-600/30">
                                                ID: {log.campaign_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-200 font-medium">
                                            {log.recipient}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                log.status === 'sent' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                log.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                            }`}>
                                                {log.status === 'sent' && <CheckCircle size={12} className="mr-1.5" />}
                                                {log.status === 'failed' && <AlertCircle size={12} className="mr-1.5" />}
                                                {log.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm max-w-xs truncate">
                                            {log.error_message ? (
                                                <span className="text-red-400 flex items-center" title={log.error_message}>
                                                    <AlertCircle size={14} className="mr-1.5 flex-shrink-0" />
                                                    <span className="truncate">{log.error_message}</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
