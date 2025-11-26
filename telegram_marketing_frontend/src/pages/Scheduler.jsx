import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, RefreshCw, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Scheduler() {
    const { t } = useLanguage();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await axios.get('http://localhost:8000/scheduler/');
            setJobs(res.data);
        } catch (err) {
            console.error("Failed to fetch schedules", err);
        } finally {
            setLoading(false);
        }
    };

    const deleteJob = async (id) => {
        if (!window.confirm(t('cancelScheduleConfirm'))) return;
        try {
            await axios.delete(`http://localhost:8000/scheduler/${id}`);
            fetchJobs();
        } catch (err) {
            alert("Failed to cancel schedule: " + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-100">{t('scheduledCampaigns')}</h1>
                <button
                    onClick={fetchJobs}
                    className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-white transition-colors border border-gray-700"
                    title={t('refreshJobs')}
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-900/50 border-b border-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('jobId')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('nextRun')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('campaign')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {jobs.map((job) => (
                                <tr key={job.id} className="hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                                        {job.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        <div className="flex items-center">
                                            <Calendar size={16} className="mr-2 text-blue-400" />
                                            {new Date(job.next_run_time).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {job.name || t('unnamedCampaign')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => deleteJob(job.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors flex items-center"
                                        >
                                            <Trash2 size={18} className="mr-1" /> {t('cancel')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {jobs.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        {t('noScheduledCampaigns')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
