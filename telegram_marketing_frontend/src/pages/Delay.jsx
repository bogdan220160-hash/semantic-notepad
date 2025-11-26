import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Clock, Shuffle, CheckCircle, XCircle, Zap, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Delay() {
    const { t } = useLanguage();
    const [settings, setSettings] = useState({
        type: 'fixed',
        value: 1.0,
        min_delay: 1.0,
        max_delay: 5.0
    });
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(null); // { type: 'success'|'error', message: string }

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('http://localhost:8000/delay/');
            setSettings(res.data);
        } catch (err) {
            console.error("Failed to fetch delay settings", err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('http://localhost:8000/delay/', settings);
            setShowModal({ type: 'success', message: t('settingsSaved') });
        } catch (err) {
            setShowModal({ type: 'error', message: "Failed to save settings" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                {t('delayConfiguration')}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-gray-700/50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="mb-8 p-4 bg-blue-900/20 text-blue-200 border border-blue-700/50 rounded-xl flex items-start space-x-3">
                            <Zap className="flex-shrink-0 text-blue-400" size={24} />
                            <div>
                                <h3 className="font-semibold text-blue-100 mb-1">Optimize Sending Speed</h3>
                                <p className="text-sm text-blue-200/80 leading-relaxed">{t('delayDescription')}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">{t('delayStrategy')}</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setSettings({ ...settings, type: 'fixed' })}
                                        className={`relative p-6 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200 group ${settings.type === 'fixed'
                                            ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/10'
                                            : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800 hover:text-gray-200'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-full mb-3 transition-colors ${settings.type === 'fixed' ? 'bg-blue-500/20' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                                            <Clock size={24} />
                                        </div>
                                        <span className="font-bold text-lg">{t('fixedDelay')}</span>
                                        <span className="text-xs mt-2 opacity-70">Constant wait time</span>
                                        {settings.type === 'fixed' && (
                                            <div className="absolute top-3 right-3 text-blue-500">
                                                <CheckCircle size={20} />
                                            </div>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSettings({ ...settings, type: 'random' })}
                                        className={`relative p-6 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200 group ${settings.type === 'random'
                                            ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-lg shadow-purple-500/10'
                                            : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800 hover:text-gray-200'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-full mb-3 transition-colors ${settings.type === 'random' ? 'bg-purple-500/20' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                                            <Shuffle size={24} />
                                        </div>
                                        <span className="font-bold text-lg">{t('randomDelay')}</span>
                                        <span className="text-xs mt-2 opacity-70">Variable wait time</span>
                                        {settings.type === 'random' && (
                                            <div className="absolute top-3 right-3 text-purple-500">
                                                <CheckCircle size={20} />
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-900/30 p-6 rounded-xl border border-gray-700/50">
                                {settings.type === 'fixed' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('delayValue')} (seconds)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0.1"
                                                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg font-mono"
                                                value={settings.value}
                                                onChange={e => setSettings({ ...settings, value: parseFloat(e.target.value) })}
                                            />
                                            <div className="absolute right-4 top-3.5 text-gray-500 text-sm">sec</div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 flex items-center">
                                            <Info size={12} className="mr-1" />
                                            {t('fixedDelayDesc')}
                                        </p>
                                    </div>
                                )}

                                {settings.type === 'random' && (
                                    <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">{t('minDelay')} (s)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0.1"
                                                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-lg font-mono"
                                                value={settings.min_delay}
                                                onChange={e => setSettings({ ...settings, min_delay: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">{t('maxDelay')} (s)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0.1"
                                                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-lg font-mono"
                                                value={settings.max_delay}
                                                onChange={e => setSettings({ ...settings, max_delay: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500 flex items-center">
                                                <Info size={12} className="mr-1" />
                                                {t('randomDelayDesc')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3.5 rounded-xl shadow-lg shadow-blue-500/20 flex justify-center items-center transition-all duration-200 font-bold text-lg transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        {t('saving')}
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Save size={20} className="mr-2" />
                                        {t('saveConfiguration')}
                                    </span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/30 sticky top-6">
                        <h3 className="text-lg font-semibold text-gray-200 mb-4">Pro Tips</h3>
                        <div className="space-y-4">
                            <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl">
                                <h4 className="text-blue-400 font-medium mb-1 text-sm">Avoid Bans</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Using a random delay (e.g., 2-5 seconds) makes your behavior look more human-like to Telegram's algorithms.
                                </p>
                            </div>
                            
                            <div className="bg-purple-500/5 border border-purple-500/10 p-4 rounded-xl">
                                <h4 className="text-purple-400 font-medium mb-1 text-sm">Recommended Settings</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    {t('delayRecommendation')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success/Error Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full shadow-2xl transform scale-100 transition-all">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${showModal.type === 'success' ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20' : 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20'}`}>
                                {showModal.type === 'success' ? <CheckCircle size={32} /> : <XCircle size={32} />}
                            </div>

                            <h3 className="text-xl font-bold text-white">
                                {showModal.type === 'success' ? 'Success!' : 'Error'}
                            </h3>

                            <p className="text-gray-300">
                                {showModal.message}
                            </p>

                            <button
                                onClick={() => setShowModal(null)}
                                className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-xl transition-colors border border-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
