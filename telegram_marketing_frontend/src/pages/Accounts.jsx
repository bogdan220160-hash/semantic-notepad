import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Loader2, Trash2, CheckCircle, XCircle, Flame, Network, Activity, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';

export default function Accounts() {
    const { t } = useLanguage();
    const [accounts, setAccounts] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [step, setStep] = useState('phone'); // phone, code, password
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showLogsModal, setShowLogsModal] = useState(null); // accountId
    const [showCheckAllConfirm, setShowCheckAllConfirm] = useState(false);
    const [warmupLogs, setWarmupLogs] = useState([]);
    const [healthModal, setHealthModal] = useState(null); // { status: 'alive'|'flood_wait'|'banned'|'error', message: string }
    const [deleteModal, setDeleteModal] = useState(null); // accountId to delete

    const [formData, setFormData] = useState({
        api_id: '',
        api_hash: '',
        phone: '',
        code: '',
        password: '',
        phone_code_hash: '',
        session_string: '',
        proxy_url: ''
    });

    const fetchAccounts = async () => {
        try {
            const res = await axios.get('http://localhost:8000/accounts/');
            setAccounts(res.data);
        } catch (err) {
            console.error("Failed to fetch accounts", err);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleRequestCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('http://localhost:8000/accounts/request-code', {
                api_id: formData.api_id,
                api_hash: formData.api_hash,
                phone: formData.phone
            });

            setFormData({
                ...formData,
                phone_code_hash: res.data.phone_code_hash,
                session_string: res.data.session_string
            });

            // Show delivery message
            const type = res.data.delivery_type;
            let msg = "Code sent!";
            if (type === 'app') msg = "Code sent to your Telegram App (on another device).";
            else if (type === 'sms') msg = "Code sent via SMS.";
            else if (type === 'call') msg = "Telegram is calling you with the code.";

            setError(msg);
            setStep('code');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to request code');
        } finally {
            setLoading(false);
        }
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post('http://localhost:8000/accounts/sign-in', formData);
            setIsAdding(false);
            setStep('phone');
            setFormData({ api_id: '', api_hash: '', phone: '', code: '', password: '', phone_code_hash: '', session_string: '', proxy_url: '' });
            fetchAccounts();
        } catch (err) {
            if (err.response?.data?.detail?.includes('password')) {
                setStep('password');
            } else {
                setError(err.response?.data?.detail || 'Failed to sign in');
            }
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        try {
            await axios.delete(`http://localhost:8000/accounts/${deleteModal}`);
            fetchAccounts();
        } catch (err) {
            alert("Failed to delete account");
        } finally {
            setDeleteModal(null);
        }
    };

    const toggleWarmup = async (accountId, currentStatus) => {
        try {
            await axios.post(`http://localhost:8000/accounts/${accountId}/warmup`, {
                enabled: !currentStatus
            });
            fetchAccounts();
        } catch (err) {
            console.error("Failed to toggle warmup", err);
        }
    };

    const handleShowLogs = async (accountId) => {
        setShowLogsModal(accountId);
        setWarmupLogs([]);
        try {
            const res = await axios.get(`http://localhost:8000/accounts/${accountId}/warmup-logs`);
            setWarmupLogs(res.data);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        }
    };

    const handleCheckProxy = async (id) => {
        try {
            const res = await axios.post(`http://localhost:8000/accounts/${id}/check-proxy`);
            if (res.data.status === 'success') {
                alert(`Proxy is working! Latency: ${res.data.latency_ms}ms`);
            } else if (res.data.status === 'no_proxy') {
                alert("No proxy configured for this account.");
            } else {
                alert(`Proxy Error: ${res.data.error || 'Unknown error'}`);
            }
        } catch (err) {
            alert("Failed to check proxy: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleCheckHealth = async (id) => {
        try {
            const res = await axios.post(`http://localhost:8000/accounts/${id}/check-health`);
            // Update local state
            setAccounts(accounts.map(acc =>
                acc.id === id ? { ...acc, health_status: res.data.status, last_health_check: res.data.last_check } : acc
            ));

            const status = res.data.status;
            let message = `Account status: ${status}`;
            if (status === 'alive') message = "Account is Healthy!";
            else if (status === 'flood_wait') message = "Account has Flood Wait!";
            else if (status === 'banned') message = "Account is BANNED!";

            setHealthModal({ status, message });

        } catch (err) {
            setHealthModal({ status: 'error', message: "Failed to check health: " + (err.response?.data?.detail || err.message) });
        }
    };

    const confirmCheckAllHealth = async () => {
        setShowCheckAllConfirm(false);
        setLoading(true);
        for (const acc of accounts) {
            try {
                await axios.post(`http://localhost:8000/accounts/${acc.id}/check-health`);
            } catch (e) {
                console.error(`Failed to check ${acc.id}`, e);
            }
        }
        await fetchAccounts();
        setLoading(false);
        setHealthModal({ status: 'alive', message: "Health check completed for all accounts." });
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    {t('accounts')}
                </h2>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowCheckAllConfirm(true)}
                        disabled={loading}
                        className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl transition-all duration-200 border border-gray-700 hover:border-gray-600 shadow-lg"
                    >
                        <Activity size={20} className={loading ? "animate-pulse" : ""} />
                        <span>{t('checkAllHealth') || "Check Health"}</span>
                    </button>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={20} />
                        <span>{isAdding ? t('cancel') : t('addAccount')}</span>
                    </button>
                </div>
            </div>

            {/* Add Account Form */}
            {isAdding && (
                <div className="mb-8 bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={step === 'phone' ? handleRequestCode : handleSignIn} className="max-w-md mx-auto space-y-6">

                        {step === 'phone' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('phoneNumber')}</label>
                                    <input
                                        type="text"
                                        placeholder={t('phonePlaceholder')}
                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('apiId')}</label>
                                        <input
                                            type="text"
                                            placeholder="123456"
                                            className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                            value={formData.api_id}
                                            onChange={e => setFormData({ ...formData, api_id: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('apiHash')}</label>
                                        <input
                                            type="text"
                                            placeholder={t('apiHashPlaceholder')}
                                            className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                            value={formData.api_hash}
                                            onChange={e => setFormData({ ...formData, api_hash: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('proxyUrl')} ({t('optional') || 'Optional'})</label>
                                    <input
                                        type="text"
                                        placeholder={t('proxyUrlPlaceholder')}
                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-sm"
                                        value={formData.proxy_url || ''}
                                        onChange={e => setFormData({ ...formData, proxy_url: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Format: scheme://user:pass@host:port (e.g. socks5://user:pass@1.2.3.4:1080)</p>
                                </div>
                            </>
                        )}

                        {step === 'code' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('enterCode')}</label>
                                <input
                                    type="text"
                                    placeholder="12345"
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        {step === 'password' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">2FA Password</label>
                                <input
                                    type="password"
                                    placeholder="Your 2FA Password"
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400">
                                <XCircle size={20} />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 flex justify-center items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>{t('loading')}</span>
                                </>
                            ) : (
                                <span>{step === 'phone' ? t('submitCode') : t('save')}</span>
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* Accounts List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(acc => (
                    <div key={acc.id} className="group relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden">
                        {/* Gradient Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                                        {acc.phone_number ? acc.phone_number.slice(-2) : '??'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-100 text-lg">{acc.phone_number || 'Unknown'}</h3>
                                        <span className="text-xs text-gray-500 font-mono bg-gray-900/50 px-2 py-0.5 rounded">ID: {acc.id}</span>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1 shadow-sm ${acc.session_string
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                    {acc.session_string ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                    <span>{acc.session_string ? t('active') : t('inactive')}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 bg-gray-900/30 rounded-xl p-4 border border-gray-700/30">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">{t('apiId')}</span>
                                    <span className="text-gray-300 font-mono">{acc.api_id}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">{t('created')}</span>
                                    <span className="text-gray-300">{new Date(acc.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-gray-500">Proxy</span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-gray-300 font-mono text-xs truncate max-w-[120px]">
                                            {acc.proxy_url || <span className="text-gray-600 italic">None</span>}
                                        </span>
                                        {acc.proxy_url && (
                                            <button
                                                onClick={() => handleCheckProxy(acc.id)}
                                                className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/10 transition-colors"
                                                title="Check Proxy"
                                            >
                                                <Network size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Health Status */}
                                <div className="flex justify-between text-sm items-center pt-2 border-t border-gray-700/30">
                                    <span className="text-gray-500">Health</span>
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${acc.health_status === 'alive' ? 'bg-green-500/20 text-green-400' :
                                            acc.health_status === 'flood_wait' ? 'bg-yellow-500/20 text-yellow-400' :
                                                acc.health_status === 'banned' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-gray-700 text-gray-400'
                                            }`}>
                                            {acc.health_status || 'UNKNOWN'}
                                        </span>
                                        <button
                                            onClick={() => handleCheckHealth(acc.id)}
                                            className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/10 transition-colors"
                                            title="Check Health"
                                        >
                                            <Activity size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700/30">
                                        <Flame size={16} className={acc.warmup_enabled ? "text-orange-500 animate-pulse" : "text-gray-600"} />
                                        <span className="text-xs font-medium text-gray-400">Warm-up</span>
                                        <button
                                            onClick={() => toggleWarmup(acc.id, acc.warmup_enabled)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-900 ml-2 ${acc.warmup_enabled ? 'bg-orange-500' : 'bg-gray-700'
                                                }`}
                                        >
                                            <span
                                                className={`${acc.warmup_enabled ? 'translate-x-4' : 'translate-x-1'
                                                    } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                                            />
                                        </button>
                                    </div>
                                    
                                    {acc.warmup_enabled && (
                                        <button
                                            onClick={() => handleShowLogs(acc.id)}
                                            className="text-gray-400 hover:text-blue-400 p-2 hover:bg-blue-500/10 rounded-lg transition-colors"
                                            title="View Logs"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={() => setDeleteModal(acc.id)}
                                    className="text-gray-500 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg group-hover:text-red-500"
                                    title="Delete Account"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modals */}
            <ConfirmModal 
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                onConfirm={confirmDelete}
                title="Delete Account"
                message="Are you sure you want to remove this account? This action cannot be undone."
                confirmText="Delete"
                isDestructive={true}
            />

            <ConfirmModal
                isOpen={showCheckAllConfirm}
                onClose={() => setShowCheckAllConfirm(false)}
                onConfirm={confirmCheckAllHealth}
                title="Check All Accounts?"
                message="This will check the health status of all your accounts. It might take a while depending on the number of accounts."
                confirmText="Start Check"
            />

            {/* Warmup Logs Modal */}
            {
                showLogsModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
                                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                                    <Flame className="text-orange-500" />
                                    <span>Warm-up Logs</span>
                                </h3>
                                <button onClick={() => setShowLogsModal(null)} className="text-gray-400 hover:text-white transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {warmupLogs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-3">
                                        <Activity size={48} className="opacity-20" />
                                        <p>No logs found yet.</p>
                                    </div>
                                ) : (
                                    warmupLogs.map((log, i) => (
                                        <div key={i} className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex justify-between items-center hover:bg-gray-800 transition-colors">
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${log.action === 'error' ? 'bg-red-500/20 text-red-400' :
                                                        log.action === 'join' ? 'bg-purple-500/20 text-purple-400' :
                                                            'bg-blue-500/20 text-blue-400'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                    <span className="text-gray-300 text-sm font-medium">{log.details}</span>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500 font-mono bg-gray-900/50 px-2 py-1 rounded">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Health Status Modal */}
            {healthModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full shadow-2xl transform scale-100 transition-all">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${healthModal.status === 'alive' ? 'bg-green-500/20 text-green-400 shadow-green-500/20' :
                                healthModal.status === 'flood_wait' ? 'bg-yellow-500/20 text-yellow-400 shadow-yellow-500/20' :
                                    healthModal.status === 'banned' ? 'bg-red-500/20 text-red-400 shadow-red-500/20' :
                                        'bg-gray-700/50 text-gray-400'
                                }`}>
                                {healthModal.status === 'alive' ? <CheckCircle size={32} /> :
                                    healthModal.status === 'flood_wait' ? <Clock size={32} /> :
                                        healthModal.status === 'banned' ? <XCircle size={32} /> :
                                            <Activity size={32} />
                                }
                            </div>

                            <h3 className="text-xl font-bold text-white">
                                {healthModal.status === 'alive' ? 'Great News!' :
                                    healthModal.status === 'banned' ? 'Account Banned' :
                                        healthModal.status === 'flood_wait' ? 'Flood Wait' :
                                            'Status Update'}
                            </h3>

                            <p className="text-gray-300">
                                {healthModal.message}
                            </p>

                            <button
                                onClick={() => setHealthModal(null)}
                                className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-xl transition-colors border border-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
