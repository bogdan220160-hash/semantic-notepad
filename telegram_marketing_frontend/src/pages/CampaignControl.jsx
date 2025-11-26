import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Pause, Square, Activity, CheckCircle, AlertCircle, XCircle, Trash2, StopCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';

export default function CampaignControl() {
    const { t } = useLanguage();
    const [campaigns, setCampaigns] = useState([]);
    const [lists, setLists] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [abTests, setAbTests] = useState([]);
    const [mode, setMode] = useState('template'); // 'template', 'ab_test', 'rotation', 'auto_rotation'

    const [formData, setFormData] = useState({
        name: '',
        list_id: '',
        template_id: '',
        ab_test_id: '',
        rotation_steps: [{ template_id: '', count: 1 }],
        auto_rotation_config: { template_ids: [], rotate_every: 5 },
        account_ids: [],
        delay: 1.0,
        scheduled_for: ''
    });

    const addRotationStep = () => {
        setFormData({
            ...formData,
            rotation_steps: [...formData.rotation_steps, { template_id: '', count: 1 }]
        });
    };

    const removeRotationStep = (index) => {
        if (formData.rotation_steps.length === 1) return;
        const newSteps = [...formData.rotation_steps];
        newSteps.splice(index, 1);
        setFormData({ ...formData, rotation_steps: newSteps });
    };

    const updateRotationStep = (index, field, value) => {
        const newSteps = [...formData.rotation_steps];
        newSteps[index][field] = field === 'count' ? parseInt(value) || 0 : value;
        setFormData({ ...formData, rotation_steps: newSteps });
    };

    const [loading, setLoading] = useState(false);
    const [successModal, setSuccessModal] = useState(null); // { type: 'scheduled' | 'started', name: string, scheduledTime: string }
    const [errorModal, setErrorModal] = useState(null); // { message: string }
    const [stopModal, setStopModal] = useState(null); // campaignId to stop
    const [deleteModal, setDeleteModal] = useState(null); // campaignId to delete

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchCampaigns, 5000); // Poll status every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [listsRes, templatesRes, accountsRes, abTestsRes] = await Promise.all([
                axios.get('http://localhost:8000/lists/'),
                axios.get('http://localhost:8000/messages/'),
                axios.get('http://localhost:8000/accounts/'),
                axios.get('http://localhost:8000/ab_test/list')
            ]);
            setLists(listsRes.data);
            setTemplates(templatesRes.data);
            setAccounts(accountsRes.data.filter(a => a.is_active)); // Only active accounts
            setAbTests(abTestsRes.data);
            fetchCampaigns();
        } catch (err) {
            console.error("Failed to load initial data", err);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const res = await axios.get('http://localhost:8000/campaign/');
            setCampaigns(res.data);
        } catch (err) {
            console.error("Failed to fetch campaigns", err);
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();

        if (!formData.list_id || formData.account_ids.length === 0) {
            setErrorModal({ message: t('pleaseSelectListAndAccount') || "Please select a list and at least one account." });
            return;
        }

        if (mode === 'template' && !formData.template_id) {
            setErrorModal({ message: t('pleaseSelectTemplate') || "Please select a message template." });
            return;
        }

        if (mode === 'ab_test' && !formData.ab_test_id) {
            setErrorModal({ message: t('pleaseSelectAbTest') || "Please select an A/B test." });
            return;
        }

        if (mode === 'rotation') {
            if (formData.rotation_steps.some(s => !s.template_id || s.count < 1)) {
                setErrorModal({ message: t('pleaseCompleteRotationSteps') || "Please ensure all rotation steps have a template and count >= 1." });
                return;
            }
        }

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                list_id: parseInt(formData.list_id),
                account_ids: formData.account_ids.map(id => parseInt(id)),
                delay: parseFloat(formData.delay),
                scheduled_for: formData.scheduled_for ? new Date(formData.scheduled_for).toISOString() : null
            };

            if (mode === 'template') {
                payload.template_id = parseInt(formData.template_id);
            } else if (mode === 'ab_test') {
                payload.ab_test_id = parseInt(formData.ab_test_id);
            } else if (mode === 'rotation') {
                payload.rotation_steps = formData.rotation_steps.map(s => ({
                    template_id: parseInt(s.template_id),
                    count: parseInt(s.count)
                }));
            } else if (mode === 'auto_rotation') {
                if (formData.auto_rotation_config.template_ids.length < 2) {
                    setErrorModal({ message: t('pleaseSelectTwoTemplates') || "Please select at least 2 templates for rotation." });
                    setLoading(false);
                    return;
                }
                payload.rotation_steps = formData.auto_rotation_config.template_ids.map(tid => ({
                    template_id: parseInt(tid),
                    count: parseInt(formData.auto_rotation_config.rotate_every)
                }));
            }

            await axios.post('http://localhost:8000/campaigns/start', payload);
            const campaignName = formData.name;
            const scheduledTime = formData.scheduled_for;
            setFormData({ ...formData, name: '', list_id: '', template_id: '', ab_test_id: '', account_ids: [], delay: 1.0, scheduled_for: '' });
            fetchCampaigns();
            setSuccessModal({
                type: scheduledTime ? 'scheduled' : 'started',
                name: campaignName,
                scheduledTime: scheduledTime ? new Date(scheduledTime).toLocaleString() : null
            });
        } catch (err) {
            setErrorModal({ message: "Failed to start campaign: " + (err.response?.data?.detail || err.message) });
        } finally {
            setLoading(false);
        }
    };

    const confirmStop = async () => {
        if (!stopModal) return;
        try {
            await axios.post(`http://localhost:8000/campaigns/stop/${stopModal}`);
            fetchCampaigns();
        } catch (err) {
            setErrorModal({ message: t('failedToStopCampaign') || "Failed to stop campaign" });
        } finally {
            setStopModal(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        try {
            await axios.delete(`http://localhost:8000/campaign/${deleteModal}`);
            fetchCampaigns();
        } catch (err) {
            setErrorModal({ message: t('failedToDeleteCampaign') || "Failed to delete campaign" });
        } finally {
            setDeleteModal(null);
        }
    };

    const toggleAccount = (id) => {
        const current = formData.account_ids;
        if (current.includes(id)) {
            setFormData({ ...formData, account_ids: current.filter(aid => aid !== id) });
        } else {
            setFormData({ ...formData, account_ids: [...current, id] });
        }
    };

    const selectAllAccounts = () => {
        if (formData.account_ids.length === accounts.length) {
            setFormData({ ...formData, account_ids: [] });
        } else {
            setFormData({ ...formData, account_ids: accounts.map(a => a.id) });
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                {t('campaignControl')}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Campaign Form */}
                <div className="lg:col-span-1 bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50 h-fit animate-in fade-in slide-in-from-left-4 duration-300">
                    <h2 className="text-xl font-semibold mb-6 text-blue-400 flex items-center">
                        <Play size={20} className="mr-2" />
                        {t('newCampaign')}
                    </h2>
                    <form onSubmit={handleStart} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">{t('campaignName')}</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Summer Sale Promo"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">{t('targetList')}</label>
                            <select
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.list_id}
                                onChange={e => setFormData({ ...formData, list_id: e.target.value })}
                            >
                                <option value="">{t('selectList')}</option>
                                {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.count} {t('users')})</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">{t('messageSource')}</label>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <label className={`flex items-center justify-center cursor-pointer p-2 rounded-lg border transition-all ${mode === 'template' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-gray-900/30 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                                    <input type="radio" name="mode" value="template" checked={mode === 'template'} onChange={() => setMode('template')} className="hidden" />
                                    <span className="text-sm font-medium">{t('singleTemplate')}</span>
                                </label>
                                <label className={`flex items-center justify-center cursor-pointer p-2 rounded-lg border transition-all ${mode === 'ab_test' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-gray-900/30 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                                    <input type="radio" name="mode" value="ab_test" checked={mode === 'ab_test'} onChange={() => setMode('ab_test')} className="hidden" />
                                    <span className="text-sm font-medium">{t('abTest')}</span>
                                </label>
                                <label className={`flex items-center justify-center cursor-pointer p-2 rounded-lg border transition-all ${mode === 'rotation' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-gray-900/30 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                                    <input type="radio" name="mode" value="rotation" checked={mode === 'rotation'} onChange={() => setMode('rotation')} className="hidden" />
                                    <span className="text-sm font-medium">{t('rotation')}</span>
                                </label>
                                <label className={`flex items-center justify-center cursor-pointer p-2 rounded-lg border transition-all ${mode === 'auto_rotation' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-gray-900/30 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                                    <input type="radio" name="mode" value="auto_rotation" checked={mode === 'auto_rotation'} onChange={() => setMode('auto_rotation')} className="hidden" />
                                    <span className="text-sm font-medium">{t('autoRotation') || "Auto"}</span>
                                </label>
                            </div>

                            {mode === 'template' && (
                                <select
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.template_id}
                                    onChange={e => setFormData({ ...formData, template_id: e.target.value })}
                                >
                                    <option value="">{t('selectTemplate')}</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            )}

                            {mode === 'ab_test' && (
                                <select
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.ab_test_id}
                                    onChange={e => setFormData({ ...formData, ab_test_id: e.target.value })}
                                >
                                    <option value="">{t('selectAbTest')}</option>
                                    {abTests.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            )}

                            {mode === 'rotation' && (
                                <div className="space-y-2 bg-gray-900/30 p-3 rounded-xl border border-gray-700/50">
                                    {formData.rotation_steps.map((step, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <select
                                                className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={step.template_id}
                                                onChange={e => updateRotationStep(index, 'template_id', e.target.value)}
                                            >
                                                <option value="">{t('selectTemplate')}</option>
                                                {templates.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-16 bg-gray-900/50 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none text-center"
                                                placeholder="#"
                                                value={step.count}
                                                onChange={e => updateRotationStep(index, 'count', e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeRotationStep(index)}
                                                className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-500/10 rounded"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addRotationStep}
                                        className="text-blue-400 text-sm hover:text-blue-300 flex items-center transition-colors w-full justify-center py-2 border border-dashed border-blue-500/30 rounded-lg hover:bg-blue-500/5"
                                    >
                                        + {t('addStep')}
                                    </button>
                                </div>
                            )}

                            {mode === 'auto_rotation' && (
                                <div className="space-y-4 bg-gray-900/30 p-3 rounded-xl border border-gray-700/50">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">{t('selectTemplates') || "Select Templates"}</label>
                                        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                            {templates.map(tmpl => (
                                                <label key={tmpl.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-800/50 p-1.5 rounded transition-colors text-gray-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.auto_rotation_config.template_ids.includes(tmpl.id)}
                                                        onChange={() => {
                                                            const current = formData.auto_rotation_config.template_ids;
                                                            const newIds = current.includes(tmpl.id)
                                                                ? current.filter(id => id !== tmpl.id)
                                                                : [...current, tmpl.id];
                                                            setFormData({
                                                                ...formData,
                                                                auto_rotation_config: { ...formData.auto_rotation_config, template_ids: newIds }
                                                            });
                                                        }}
                                                        className="rounded text-blue-500 bg-gray-800 border-gray-600 focus:ring-blue-500"
                                                    />
                                                    <span>{tmpl.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">{t('rotateEvery') || "Rotate every (users)"}</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.auto_rotation_config.rotate_every}
                                            onChange={e => setFormData({
                                                ...formData,
                                                auto_rotation_config: { ...formData.auto_rotation_config, rotate_every: parseInt(e.target.value) || 1 }
                                            })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2 flex justify-between items-center">
                                <span>{t('sendingAccounts')}</span>
                                <button type="button" onClick={selectAllAccounts} className="text-blue-400 text-xs hover:text-blue-300 transition-colors font-medium">
                                    {formData.account_ids.length === accounts.length ? t('deselectAll') : t('selectAll')}
                                </button>
                            </label>
                            <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                {accounts.map(account => (
                                    <label key={account.id} className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-gray-800/50 p-2 rounded-lg transition-colors text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={formData.account_ids.includes(account.id)}
                                            onChange={() => toggleAccount(account.id)}
                                            className="rounded text-blue-500 bg-gray-800 border-gray-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        <span className="font-mono">{account.phone_number}</span>
                                    </label>
                                ))}
                                {accounts.length === 0 && <p className="text-gray-500 text-xs text-center py-4">{t('noActiveAccounts')}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">{t('delaySeconds')}</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.delay}
                                onChange={e => setFormData({ ...formData, delay: parseFloat(e.target.value) })}
                            />
                        </div>

                        <div className="border-t border-gray-700/50 pt-4 mt-4">
                            <label className="flex items-center mb-3 cursor-pointer text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    className="mr-2 rounded text-blue-500 bg-gray-800 border-gray-600 focus:ring-blue-500 w-4 h-4"
                                    checked={!!formData.scheduled_for}
                                    onChange={e => setFormData({ ...formData, scheduled_for: e.target.checked ? new Date().toISOString().slice(0, 16) : '' })}
                                />
                                <span className="font-medium">{t('scheduleForLater')}</span>
                            </label>

                            {formData.scheduled_for && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('startTimeUtc')}</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={formData.scheduled_for}
                                        onChange={e => setFormData({ ...formData, scheduled_for: e.target.value })}
                                        style={{ colorScheme: 'dark' }}
                                    />
                                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                                        <Activity size={12} className="mr-1" />
                                        {t('serverTimeUtc')}
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3.5 rounded-xl hover:shadow-lg hover:shadow-green-500/20 transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
                        >
                            {loading ? t('processing') : (
                                formData.scheduled_for ?
                                    <><span className="mr-2">📅</span> {t('scheduleCampaign')}</> :
                                    <><Play size={20} className="mr-2 fill-current" /> {t('startCampaign')}</>
                            )}
                        </button>
                    </form>
                </div>

                {/* Preview Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50 h-fit sticky top-6 animate-in fade-in slide-in-from-right-4 duration-300 delay-100">
                        <h2 className="text-xl font-semibold mb-4 text-purple-400">{t('messagePreview') || "Preview"}</h2>
                        <MessagePreview
                            formData={formData}
                            templates={templates}
                            mode={mode}
                        />
                    </div>
                </div>

                {/* Active Campaigns List */}
                <div className="lg:col-span-3 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-200">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <Activity className="mr-3 text-blue-500" />
                        {t('campaignStatus')}
                    </h2>
                    {campaigns.length === 0 && (
                        <div className="bg-gray-800/30 border-2 border-dashed border-gray-700 rounded-2xl p-16 text-center text-gray-500 flex flex-col items-center">
                            <Activity size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">{t('noCampaignsFound')}</p>
                            <p className="text-sm opacity-60">Start a new campaign to see it here</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {campaigns.map(campaign => (
                            <div key={campaign.id} className="group bg-gray-800/40 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-xl flex items-center text-gray-100 mb-1">
                                            {campaign.name}
                                        </h3>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${campaign.status === 'running' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            campaign.status === 'stopped' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                'bg-gray-700/50 text-gray-400 border-gray-600'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${campaign.status === 'running' ? 'bg-green-400 animate-pulse' : campaign.status === 'stopped' ? 'bg-red-400' : 'bg-gray-400'}`}></span>
                                            {campaign.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex space-x-2">
                                        {campaign.status === 'running' && (
                                            <button
                                                onClick={() => setStopModal(campaign.id)}
                                                className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg border border-transparent hover:border-red-500/20 transition-all"
                                                title={t('stop')}
                                            >
                                                <Square size={20} className="fill-current" />
                                            </button>
                                        )}
                                        {campaign.status !== 'running' && (
                                            <button
                                                onClick={() => setDeleteModal(campaign.id)}
                                                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg border border-transparent hover:border-red-500/20 transition-all"
                                                title={t('delete')}
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-6 bg-gray-900/30 rounded-xl p-4 border border-gray-700/30">
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('configuredDelay')}</p>
                                        <p className="text-lg font-mono text-blue-400 font-medium">{campaign.config?.delay}s</p>
                                    </div>
                                    <div className="text-center border-l border-gray-700/50">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('listId')}</p>
                                        <p className="text-lg font-mono text-purple-400 font-medium">{campaign.config?.list_id}</p>
                                    </div>
                                    <div className="text-center border-l border-gray-700/50">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('accounts')}</p>
                                        <p className="text-lg font-mono text-green-400 font-medium">{campaign.config?.account_ids?.length || 0}</p>
                                    </div>
                                </div>
                                
                                <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
                                    <span>{t('started')}: {new Date(campaign.created_at).toLocaleString()}</span>
                                    <span className="font-mono opacity-50">ID: {campaign.id}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Confirm Stop Modal */}
            <ConfirmModal 
                isOpen={!!stopModal}
                onClose={() => setStopModal(null)}
                onConfirm={confirmStop}
                title="Stop Campaign"
                message="Are you sure you want to stop this campaign? Sending will be paused."
                confirmText="Stop Campaign"
                isDestructive={true}
            />

            {/* Confirm Delete Modal */}
            <ConfirmModal 
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                onConfirm={confirmDelete}
                title="Delete Campaign"
                message="Are you sure you want to delete this campaign history? This action cannot be undone."
                confirmText="Delete"
                isDestructive={true}
            />

            {/* Success Modal */}
            {successModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-green-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-green-500/20 transform scale-100 transition-all">
                        <div className="flex flex-col items-center text-center space-y-4">
                            {/* Success Icon with Animation */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/50">
                                    <CheckCircle size={40} className="text-white" strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                                {successModal.type === 'scheduled' ? '📅 ' + (t('campaignScheduled') || 'Campaign Scheduled!') : '🚀 ' + (t('campaignStarted') || 'Campaign Started!')}
                            </h3>

                            {/* Campaign Details Card */}
                            <div className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3">
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                        <Activity size={16} className="text-blue-400" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{t('campaignName') || 'Campaign Name'}</p>
                                        <p className="text-white font-medium">{successModal.name}</p>
                                    </div>
                                </div>

                                {successModal.type === 'scheduled' && successModal.scheduledTime && (
                                    <div className="flex items-start space-x-3 pt-3 border-t border-gray-700/50">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg">⏰</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{t('scheduledFor') || 'Scheduled For'}</p>
                                            <p className="text-white font-medium font-mono text-sm">{successModal.scheduledTime}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Success Message */}
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {successModal.type === 'scheduled' 
                                    ? (t('campaignScheduledMessage') || 'Your campaign has been scheduled and will start automatically at the specified time.')
                                    : (t('campaignStartedMessage') || 'Your campaign is now running! Monitor progress in the campaign status section below.')}
                            </p>

                            {/* Close Button */}
                            <button
                                onClick={() => setSuccessModal(null)}
                                className="mt-4 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transform hover:scale-[1.02]"
                            >
                                {t('gotIt') || 'Got it!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {errorModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-red-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-red-500/20 transform scale-100 transition-all">
                        <div className="flex flex-col items-center text-center space-y-4">
                            {/* Error Icon with Animation */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/50">
                                    <AlertCircle size={40} className="text-white" strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500">
                                ⚠️ {t('validationError') || 'Validation Error'}
                            </h3>

                            {/* Error Message */}
                            <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                <p className="text-gray-200 text-sm leading-relaxed">
                                    {errorModal.message}
                                </p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setErrorModal(null)}
                                className="mt-4 w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transform hover:scale-[1.02]"
                            >
                                {t('understood') || 'Understood'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MessagePreview({ formData, templates, mode }) {
    // Determine which template to show
    let activeTemplate = null;

    if (mode === 'template' && formData.template_id) {
        activeTemplate = templates.find(t => t.id == formData.template_id);
    } else if (mode === 'rotation' && formData.rotation_steps.length > 0 && formData.rotation_steps[0].template_id) {
        // Show first step template
        activeTemplate = templates.find(t => t.id == formData.rotation_steps[0].template_id);
    } else if (mode === 'auto_rotation' && formData.auto_rotation_config.template_ids.length > 0) {
        // Show first selected template
        activeTemplate = templates.find(t => t.id == formData.auto_rotation_config.template_ids[0]);
    }

    if (!activeTemplate) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-900/30 rounded-xl border border-gray-700/30 border-dashed">
                <p className="text-sm">Select a template to preview</p>
            </div>
        );
    }

    return (
        <div className="bg-[#0e1621] rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
            {/* Telegram Header Mockup */}
            <div className="bg-[#17212b] p-3 flex items-center border-b border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                    TG
                </div>
                <div className="ml-3">
                    <p className="text-gray-100 text-sm font-medium">Recipient Name</p>
                    <p className="text-blue-400 text-xs">online</p>
                </div>
            </div>

            {/* Message Area */}
            <div className="p-4 bg-[url('https://w.wallhaven.cc/full/vg/wallhaven-vg82p5.jpg')] bg-cover bg-center min-h-[300px] relative">
                <div className="absolute inset-0 bg-[#0e1621]/80 backdrop-blur-[1px]"></div>

                <div className="relative z-10 flex flex-col space-y-2">
                    <div className="self-start bg-[#182533] text-white p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl max-w-[85%] shadow-sm border border-gray-800/50">
                        {activeTemplate.media_url && (
                            <div className="mb-2 rounded-lg overflow-hidden">
                                <img src={activeTemplate.media_url} alt="Media" className="w-full h-auto object-cover" onError={(e) => e.target.style.display = 'none'} />
                            </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{activeTemplate.content}</p>
                        <div className="flex justify-end items-center mt-1 space-x-1">
                            <span className="text-[10px] text-gray-400">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
