import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Key, Trash2, Copy, Plus, Terminal, Code, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function API() {
    const { t } = useLanguage();
    const [tokens, setTokens] = useState([]);
    const [newTokenName, setNewTokenName] = useState('');
    const [createdToken, setCreatedToken] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTokens();
    }, []);

    const fetchTokens = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/tokens');
            setTokens(res.data);
        } catch (err) {
            console.error("Failed to fetch tokens", err);
        }
    };

    const createToken = async (e) => {
        e.preventDefault();
        if (!newTokenName) return;

        setLoading(true);
        try {
            const res = await axios.post('http://localhost:8000/api/tokens', { name: newTokenName });
            setCreatedToken(res.data.token);
            setNewTokenName('');
            fetchTokens();
        } catch (err) {
            alert("Failed to create token");
        } finally {
            setLoading(false);
        }
    };

    const revokeToken = async (id) => {
        if (!window.confirm(t('revokeTokenConfirm'))) return;
        try {
            await axios.delete(`http://localhost:8000/api/tokens/${id}`);
            fetchTokens();
        } catch (err) {
            alert("Failed to revoke token");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert(t('copiedToClipboard'));
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-100">{t('apiAccess')}</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Token Management */}
                <div className="space-y-6">
                    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700/50">
                        <h2 className="text-lg font-semibold mb-4 text-gray-100">{t('generateNewToken')}</h2>
                        <form onSubmit={createToken} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{t('tokenName')}</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g., Marketing Dashboard"
                                    value={newTokenName}
                                    onChange={(e) => setNewTokenName(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/20 flex justify-center items-center transition-all"
                            >
                                {loading ? t('generating') : <><Plus size={20} className="mr-2" /> {t('generateToken')}</>}
                            </button>
                        </form>

                        {createdToken && (
                            <div className="mt-6 p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                                <p className="text-sm text-green-400 mb-2">{t('tokenGeneratedSuccess')}</p>
                                <div className="flex items-center bg-gray-900/80 p-3 rounded border border-green-700/30">
                                    <code className="flex-1 text-green-300 text-sm break-all">{createdToken}</code>
                                    <button
                                        onClick={() => copyToClipboard(createdToken)}
                                        className="ml-2 text-gray-400 hover:text-white"
                                    >
                                        <Copy size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700/50">
                        <h2 className="text-lg font-semibold mb-4 text-gray-100">{t('activeTokens')}</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-900/50 border-b border-gray-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">{t('name')}</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">{t('created')}</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">{t('action')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {tokens.map((token) => (
                                        <tr key={token.id} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-300">{token.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400">{new Date(token.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <button
                                                    onClick={() => revokeToken(token.id)}
                                                    className="text-red-400 hover:text-red-300 transition-colors"
                                                    title={t('revokeToken')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {tokens.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-4 text-center text-sm text-gray-500">{t('noActiveTokens')}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Documentation */}
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700/50 h-fit">
                    <h2 className="text-lg font-semibold mb-4 text-gray-100 flex items-center">
                        <Code size={20} className="mr-2 text-blue-400" />
                        {t('quickDocumentation')}
                    </h2>
                    <div className="space-y-6 text-sm text-gray-300">
                        <div>
                            <h3 className="font-medium text-gray-200 mb-2">{t('authentication')}</h3>
                            <p className="mb-2 text-gray-400">{t('authHeaderDesc')}</p>
                            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 font-mono text-xs text-blue-300">
                                Authorization: Bearer YOUR_TOKEN
                            </div>
                        </div>

                        <div>
                            <h3 className="font-medium text-gray-200 mb-2">{t('endpoints')}</h3>
                            <ul className="space-y-3">
                                <li>
                                    <div className="flex items-center mb-1">
                                        <span className="bg-green-900/30 text-green-400 px-2 py-0.5 rounded text-xs font-mono mr-2 border border-green-700/50">POST</span>
                                        <code className="text-gray-300">/campaign/start</code>
                                    </div>
                                    <p className="text-gray-400 text-xs">{t('endpointStartCampaignDesc')}</p>
                                </li>
                                <li>
                                    <div className="flex items-center mb-1">
                                        <span className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded text-xs font-mono mr-2 border border-blue-700/50">GET</span>
                                        <code className="text-gray-300">/analytics/daily</code>
                                    </div>
                                    <p className="text-gray-400 text-xs">{t('endpointAnalyticsDesc')}</p>
                                </li>
                            </ul>
                        </div>

                        <div className="pt-4 border-t border-gray-700">
                            <a
                                href="http://localhost:8000/docs"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                            >
                                {t('viewFullDocs')} <ExternalLink size={14} className="ml-1" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
