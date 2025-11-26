import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { Activity, CheckCircle, XCircle, AlertTriangle, Send, BarChart2, TrendingUp, Clock } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

export default function Analytics() {
    const { t } = useLanguage();
    const [dailyData, setDailyData] = useState(null);
    const [statusData, setStatusData] = useState(null);
    const [hourlyData, setHourlyData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dailyRes, statusRes, hourlyRes] = await Promise.all([
                    axios.get('http://localhost:8000/analytics/daily'),
                    axios.get('http://localhost:8000/analytics/status-distribution'),
                    axios.get('http://localhost:8000/analytics/hourly-activity')
                ]);

                setDailyData(dailyRes.data);
                setStatusData(statusRes.data);
                setHourlyData(hourlyRes.data);
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            }
        };
        fetchData();
    }, []);

    // Calculate Summary Metrics
    const totalSent = statusData ? (statusData.sent + statusData.failed + statusData.skipped) : 0;
    const successRate = totalSent > 0 ? ((statusData?.sent || 0) / totalSent * 100).toFixed(1) : 0;

    const lineChartData = {
        labels: dailyData?.data.map(d => d.date) || [],
        datasets: [
            {
                label: t('sent'),
                data: dailyData?.data.map(d => d.sent) || [],
                borderColor: '#22c55e', // Green-500
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.5)');
                    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
                    return gradient;
                },
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
            {
                label: t('failed'),
                data: dailyData?.data.map(d => d.failed) || [],
                borderColor: '#ef4444', // Red-500
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
        ],
    };

    const doughnutChartData = {
        labels: [t('sent'), t('failed'), t('skipped')],
        datasets: [
            {
                data: [
                    statusData?.sent || 0,
                    statusData?.failed || 0,
                    statusData?.skipped || 0
                ],
                backgroundColor: [
                    '#22c55e', // Green-500
                    '#ef4444', // Red-500
                    '#eab308', // Yellow-500
                ],
                borderColor: [
                    'rgba(34, 197, 94, 0.2)',
                    'rgba(239, 68, 68, 0.2)',
                    'rgba(234, 179, 8, 0.2)',
                ],
                borderWidth: 2,
                hoverOffset: 4
            },
        ],
    };

    const barChartData = {
        labels: hourlyData?.map(d => d.hour) || [],
        datasets: [
            {
                label: t('messagesPerHour'),
                data: hourlyData?.map(d => d.count) || [],
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // Blue-500
                    gradient.addColorStop(1, 'rgba(147, 51, 234, 0.8)'); // Purple-600
                    return gradient;
                },
                borderRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#9ca3af',
                    font: { family: 'Inter, sans-serif' },
                    usePointStyle: true,
                    boxWidth: 8
                }
            },
            title: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleColor: '#f3f4f6',
                bodyColor: '#d1d5db',
                borderColor: 'rgba(75, 85, 99, 0.5)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(55, 65, 81, 0.3)' },
                ticks: { color: '#9ca3af', font: { family: 'Inter, sans-serif' } },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#9ca3af', font: { family: 'Inter, sans-serif' } },
                border: { display: false }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    const doughnutOptions = {
        responsive: true,
        cutout: '70%',
        plugins: {
            legend: { position: 'bottom', labels: { color: '#9ca3af', padding: 20, usePointStyle: true } }
        }
    };

    return (
        <div className="p-6 space-y-8">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex items-center">
                <BarChart2 className="mr-3 text-blue-500" />
                {t('analyticsDashboard')}
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard
                    title="Total Processed"
                    value={totalSent}
                    icon={<Activity size={24} className="text-blue-400" />}
                    gradient="from-blue-500/20 to-blue-600/5"
                    borderColor="border-blue-500/30"
                />
                <SummaryCard
                    title="Successfully Sent"
                    value={statusData?.sent || 0}
                    icon={<CheckCircle size={24} className="text-green-400" />}
                    gradient="from-green-500/20 to-green-600/5"
                    borderColor="border-green-500/30"
                />
                <SummaryCard
                    title="Failed"
                    value={statusData?.failed || 0}
                    icon={<XCircle size={24} className="text-red-400" />}
                    gradient="from-red-500/20 to-red-600/5"
                    borderColor="border-red-500/30"
                />
                <SummaryCard
                    title="Success Rate"
                    value={`${successRate}%`}
                    icon={<TrendingUp size={24} className="text-purple-400" />}
                    gradient="from-purple-500/20 to-purple-600/5"
                    borderColor="border-purple-500/30"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Activity Line Chart */}
                <div className="lg:col-span-2 bg-gray-800/40 backdrop-blur-xl p-6 rounded-2xl border border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <h3 className="text-lg font-semibold text-gray-200 mb-6 flex items-center">
                        <Activity className="mr-2 text-blue-400" size={20} />
                        {t('dailyActivity')}
                    </h3>
                    <div className="h-[300px]">
                        <Line options={{ ...options, maintainAspectRatio: false }} data={lineChartData} />
                    </div>
                </div>

                {/* Status Distribution Doughnut Chart */}
                <div className="bg-gray-800/40 backdrop-blur-xl p-6 rounded-2xl border border-gray-700/50 shadow-xl flex flex-col hover:shadow-2xl transition-shadow duration-300">
                    <h3 className="text-lg font-semibold text-gray-200 mb-6 flex items-center">
                        <AlertTriangle className="mr-2 text-yellow-400" size={20} />
                        {t('statusDistribution')}
                    </h3>
                    <div className="flex-1 flex items-center justify-center relative">
                        <div className="w-[250px] h-[250px]">
                            <Doughnut data={doughnutChartData} options={doughnutOptions} />
                        </div>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-gray-100">{statusData?.sent || 0}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Sent</span>
                        </div>
                    </div>
                </div>

                {/* Hourly Activity Bar Chart */}
                <div className="lg:col-span-3 bg-gray-800/40 backdrop-blur-xl p-6 rounded-2xl border border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <h3 className="text-lg font-semibold text-gray-200 mb-6 flex items-center">
                        <Clock className="mr-2 text-purple-400" size={20} />
                        {t('hourlyActivity')}
                    </h3>
                    <div className="h-[250px]">
                        <Bar options={{ ...options, maintainAspectRatio: false }} data={barChartData} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ title, value, icon, gradient, borderColor }) {
    return (
        <div className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl border ${borderColor} backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-wider">{title}</p>
                    <h4 className="text-3xl font-bold text-gray-100">{value}</h4>
                </div>
                <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700/30 shadow-inner">
                    {icon}
                </div>
            </div>
        </div>
    );
}
