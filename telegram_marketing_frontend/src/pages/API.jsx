import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Key, Trash2, Copy, Plus, Terminal, Code, ExternalLink, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';

export default function API() {
    const { t } = useLanguage();
    const [tokens, setTokens] = useState([]);
    const [newTokenName, setNewTokenName] = useState('');
    const [createdToken, setCreatedToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [revokeModal, setRevokeModal] = useState(null); // tokenId to revoke

    useEffect(() => {
        fetchTokens();
    }, []);

    const fetchTokens = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/tokens');
            setTokens(res.data);
        } catch (err) {
            console.error("Failed to fetch tokens", err);
            setError("Failed to fetch tokens");
        }
    };

    const createToken = async (e) => {
        e.preventDefault();
        if (!newTokenName) return;

        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await axios.post('http://localhost:8000/api/tokens', { name: newTokenName });
            setCreatedToken(res.data.token);
            setNewTokenName('');
            fetchTokens();
            setSuccess(t('tokenGeneratedSuccess') || "Token generated successfully");
        } catch (err) {
            setError("Failed to create token");
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeToken = async () => {
        if (!revokeModal) return;
        try {
            await axios.delete(`http://localhost:8000/api/tokens/${revokeModal}`);
            fetchTokens();
            setRevokeModal(null);
            setSuccess("Token revoked successfully");
        } catch (err) {
            setError("Failed to revoke token");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setSuccess(t('copiedToClipboard') || "Copied to clipboard");
        setTimeout(() => setSuccess(null), 3000);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 tracking-tight flex items-center">
                        <Terminal className="mr-4 text-blue-500" size={32} />
                        {t('apiAccess') || "API Access"}
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg ml-12">Manage API tokens and view documentation</p>
                </div>
            </div>

            {/* Notifications */}
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
            {success && (
                <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-200 px-6 py-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center space-x-3">
                        <CheckCircle className="text-green-500" size={24} />
                        <span className="font-medium">{success}</span>
                    </div>
                    <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Token Management */}
                <div className="space-y-8">
                    {/* Generate Token */}
                    <div className="bg-gray-800/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-700/50">
                        <h2 className="text-xl font-bold mb-6 text-gray-100 flex items-center">
                            <Plus className="mr-2 text-blue-400" size={24} />
                            {t('generateNewToken')}
                        </h2>
                        <form onSubmit={createToken} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('tokenName')}</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder-gray-600"
                                    placeholder="e.g., Marketing Dashboard"
                                    value={newTokenName}
                                    onChange={(e) => setNewTokenName(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 flex justify-center items-center transition-all transform hover:-translate-y-0.5 font-medium"
                            >
                                {loading ? t('generating') : <><Key size={20} className="mr-2" /> {t('generateToken')}</>}
                            </button>
                        </form>

                        {createdToken && (
                            <div className="mt-8 p-6 bg-green-900/10 border border-green-500/30 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
                                <p className="text-sm text-green-400 mb-3 font-medium flex items-center">
                                    <CheckCircle size={16} className="mr-2" />
                                    {t('tokenGeneratedSuccess')}
                                </p>
                                <div className="flex items-center bg-gray-900/80 p-4 rounded-xl border border-green-500/20 shadow-inner group">
                                    <code className="flex-1 text-green-300 text-sm font-mono break-all selection:bg-green-500/30">{createdToken}</code>
                                    <button
                                        onClick={() => copyToClipboard(createdToken)}
                                        className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                        title="Copy to clipboard"
                                    >
                                        <Copy size={18} />
                                    </button>
                                </div>
                                <p className="text-xs text-green-500/60 mt-3 text-center">
                                    Make sure to copy your token now. You won't be able to see it again!
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Active Tokens */}
                    <div className="bg-gray-800/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-700/50">
                        <h2 className="text-xl font-bold mb-6 text-gray-100 flex items-center">
                            <Key className="mr-2 text-purple-400" size={24} />
                            {t('activeTokens')}
                        </h2>
                        <div className="overflow-hidden rounded-2xl border border-gray-700/50">
                            <table className="w-full">
                                <thead className="bg-gray-900/50 border-b border-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{t('name')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{t('created')}</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">{t('action')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50 bg-gray-800/20">
                                    {tokens.map((token) => (
                                        <tr key={token.id} className="hover:bg-gray-700/30 transition-colors group">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-200">{token.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-400 font-mono">{new Date(token.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setRevokeModal(token.id)}
                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title={t('revokeToken')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {tokens.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500 italic">{t('noActiveTokens')}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Documentation */}
                <div className="bg-gray-800/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-700/50 h-fit sticky top-6">
                    <h2 className="text-xl font-bold mb-6 text-gray-100 flex items-center">
                        <Code size={24} className="mr-2 text-blue-400" />
                        {t('quickDocumentation')}
                    </h2>
                    <div className="space-y-8 text-sm text-gray-300">
                        <div>
                            <h3 className="font-bold text-gray-200 mb-3 flex items-center">
                                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs mr-2">1</span>
                                {t('authentication')}
                            </h3>
                            <p className="mb-3 text-gray-400 leading-relaxed">{t('authHeaderDesc')}</p>
                            <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700/50 font-mono text-xs text-blue-300 shadow-inner overflow-x-auto">
                                Authorization: Bearer YOUR_TOKEN
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-200 mb-3 flex items-center">
                                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs mr-2">2</span>
                                {t('endpoints')}
                            </h3>
                            <ul className="space-y-4">
                                <li className="bg-gray-900/30 p-4 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-colors">
                                    <div className="flex items-center mb-2">
                                        <span className="bg-green-500/10 text-green-400 px-2.5 py-1 rounded-md text-xs font-bold font-mono mr-3 border border-green-500/20">POST</span>
                                        <code className="text-gray-200 font-mono text-sm">/campaigns/start</code>
                                    </div>
                                    <p className="text-gray-400 text-xs leading-relaxed">{t('endpointStartCampaignDesc')}</p>
                                </li>
                                <li className="bg-gray-900/30 p-4 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-colors">
                                    <div className="flex items-center mb-2">
                                        <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md text-xs font-bold font-mono mr-3 border border-blue-500/20">GET</span>
                                        <code className="text-gray-200 font-mono text-sm">/analytics/daily</code>
                                    </div>
                                    <p className="text-gray-400 text-xs leading-relaxed">{t('endpointAnalyticsDesc')}</p>
                                </li>
                            </ul>
                        </div>

                        <div className="pt-6 border-t border-gray-700/50">
                            <a
                                href="http://localhost:8000/docs"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors font-medium group"
                            >
                                {t('viewFullDocs')} 
                                <ExternalLink size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!revokeModal}
                onClose={() => setRevokeModal(null)}
                onConfirm={handleRevokeToken}
                title={t('revokeToken')}
                message={t('revokeTokenConfirm') || "Are you sure you want to revoke this token? Any applications using it will lose access immediately."}
                confirmText="Yes, Revoke"
                cancelText="Cancel"
                isDestructive={true}
            />
        </div>
    );
}
