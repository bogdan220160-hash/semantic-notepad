import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Download, Search, Filter } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    {t('campaignLogs')}
                </h2>
                <div className="flex space-x-3">
                    <button
                        onClick={fetchLogs}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-gray-400 hover:text-white"
                        title={t('refresh')}
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-green-500/20"
                    >
                        <Download size={18} />
                        <span>{t('exportCsv')}</span>
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search recipient or error..."
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                    <select
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="sent">Sent</option>
                        <option value="failed">Failed</option>
                        <option value="skipped">Skipped</option>
                    </select>
                </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-900/50 text-gray-400 text-sm uppercase tracking-wider">
                                <th className="p-4 font-medium">{t('time')}</th>
                                <th className="p-4 font-medium">{t('campaignStatus')}</th>
                                <th className="p-4 font-medium">{t('recipient')}</th>
                                <th className="p-4 font-medium">{t('status')}</th>
                                <th className="p-4 font-medium">{t('error')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                        {t('noLogsFound')}
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-700/30 transition-colors">
                                        <td className="p-4 text-gray-300 font-mono text-sm">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {log.campaign_id}
                                        </td>
                                        <td className="p-4 text-gray-300 font-medium">
                                            {log.recipient}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.status === 'sent' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                    log.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-red-400 text-sm max-w-xs truncate" title={log.error_message}>
                                            {log.error_message || '-'}
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
