import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Filter, UserX, Bot, CheckCircle, XCircle, Shield, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Filters() {
    const { t } = useLanguage();
    const [settings, setSettings] = useState({
        skip_no_photo: false,
        skip_bots: true
    });
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(null); // { type: 'success'|'error', message: string }

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('http://localhost:8000/filters/');
            setSettings(res.data);
        } catch (err) {
            console.error("Failed to fetch filter settings", err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('http://localhost:8000/filters/', settings);
            setShowModal({ type: 'success', message: t('filtersSaved') });
        } catch (err) {
            setShowModal({ type: 'error', message: "Failed to save filters" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                {t('globalFilters')}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-gray-700/50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="mb-8 p-4 bg-blue-900/20 text-blue-200 border border-blue-700/50 rounded-xl flex items-start space-x-3">
                            <Shield className="flex-shrink-0 text-blue-400" size={24} />
                            <div>
                                <h3 className="font-semibold text-blue-100 mb-1">{t('smartFiltering')}</h3>
                                <p className="text-sm text-blue-200/80 leading-relaxed">{t('filtersDescription')}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="group flex items-center justify-between p-5 border border-gray-700 rounded-2xl hover:bg-gray-700/30 hover:border-blue-500/30 transition-all duration-300">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400 group-hover:scale-110 transition-transform duration-300">
                                        <Bot size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-100 text-lg">{t('skipBots')}</h3>
                                        <p className="text-sm text-gray-400">{t('skipBotsDesc')}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={settings.skip_bots}
                                        onChange={e => setSettings({ ...settings, skip_bots: e.target.checked })}
                                    />
                                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                </label>
                            </div>

                            <div className="group flex items-center justify-between p-5 border border-gray-700 rounded-2xl hover:bg-gray-700/30 hover:border-purple-500/30 transition-all duration-300">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-purple-500/10 p-3 rounded-xl text-purple-400 group-hover:scale-110 transition-transform duration-300">
                                        <EyeOff size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-100 text-lg">{t('skipNoPhoto')}</h3>
                                        <p className="text-sm text-gray-400">{t('skipNoPhotoDesc')}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={settings.skip_no_photo}
                                        onChange={e => setSettings({ ...settings, skip_no_photo: e.target.checked })}
                                    />
                                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600 shadow-inner"></div>
                                </label>
                            </div>

                            <div className="pt-4">
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
                                            {t('saveFilters')}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                {/* Info Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/30 sticky top-6">
                        <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('whyUseFilters')}</h3>
                        <ul className="space-y-4 text-sm text-gray-400">
                            <li className="flex items-start">
                                <div className="bg-green-500/10 p-1 rounded mr-3 mt-0.5">
                                    <CheckCircle size={14} className="text-green-400" />
                                </div>
                                <span><strong>{t('improveEfficiency')}:</strong> {t('improveEfficiencyDesc')}</span>
                            </li>
                            <li className="flex items-start">
                                <div className="bg-green-500/10 p-1 rounded mr-3 mt-0.5">
                                    <CheckCircle size={14} className="text-green-400" />
                                </div>
                                <span><strong>{t('higherConversion')}:</strong> {t('higherConversionDesc')}</span>
                            </li>
                            <li className="flex items-start">
                                <div className="bg-green-500/10 p-1 rounded mr-3 mt-0.5">
                                    <CheckCircle size={14} className="text-green-400" />
                                </div>
                                <span><strong>{t('safety')}:</strong> {t('safetyDesc')}</span>
                            </li>
                        </ul>
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
                                {showModal.type === 'success' ? t('success') : t('error')}
                            </h3>

                            <p className="text-gray-300">
                                {showModal.message}
                            </p>

                            <button
                                onClick={() => setShowModal(null)}
                                className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-xl transition-colors border border-gray-700"
                            >
                                {t('close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
