import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Play, Pause, Clock, Trash2, ChevronRight, CheckCircle, AlertCircle, X, Loader2, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import CustomDropdown from '../components/CustomDropdown';
import ConfirmModal from '../components/ConfirmModal';

export default function DripCampaigns() {
    const { t } = useLanguage();
    const [campaigns, setCampaigns] = useState([]);
    const [lists, setLists] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null); // { type: 'start' | 'pause', id: number }

    const [newCampaign, setNewCampaign] = useState({
        name: '',
        list_id: '',
        account_id: '',
        steps: []
    });

    const [newStep, setNewStep] = useState({
        template_id: '',
        delay_minutes: 0
    });

    useEffect(() => {
        fetchCampaigns();
        fetchDependencies();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const res = await axios.get('http://localhost:8000/drip/');
            setCampaigns(res.data);
        } catch (err) {
            console.error("Failed to fetch drip campaigns", err);
        }
    };

    const fetchDependencies = async () => {
        try {
            const [listsRes, accountsRes, templatesRes] = await Promise.all([
                axios.get('http://localhost:8000/lists/'),
                axios.get('http://localhost:8000/accounts/'),
                axios.get('http://localhost:8000/messages/')
            ]);
            setLists(listsRes.data);
            setAccounts(accountsRes.data);
            setTemplates(templatesRes.data);
        } catch (err) {
            console.error("Failed to fetch dependencies", err);
        }
    };

    const handleAddStep = () => {
        if (!newStep.template_id) return;
        setNewCampaign({
            ...newCampaign,
            steps: [...newCampaign.steps, { ...newStep, step_order: newCampaign.steps.length + 1 }]
        });
        setNewStep({ template_id: '', delay_minutes: 0 });
    };

    const handleCreate = async () => {
        setError(null);
        if (!newCampaign.name || !newCampaign.list_id || !newCampaign.account_id || newCampaign.steps.length === 0) {
            setError("Please fill all fields and add at least one step.");
            return;
        }

        setLoading(true);
        try {
            await axios.post('http://localhost:8000/drip/', newCampaign);
            setIsCreating(false);
            setNewCampaign({ name: '', list_id: '', account_id: '', steps: [] });
            fetchCampaigns();
        } catch (err) {
            console.error("Failed to create campaign", err);
            setError(err.response?.data?.detail || "Failed to create campaign");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmAction = async () => {
        if (!confirmModal) return;
        
        try {
            if (confirmModal.type === 'start') {
                await axios.post(`http://localhost:8000/drip/${confirmModal.id}/start`);
            } else if (confirmModal.type === 'pause') {
                await axios.post(`http://localhost:8000/drip/${confirmModal.id}/pause`);
            }
            fetchCampaigns();
        } catch (err) {
            setError(`Failed to ${confirmModal.type} campaign`);
        } finally {
            setConfirmModal(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 tracking-tight">
                        Drip Campaigns
                    </h2>
                    <p className="text-gray-400 mt-2 text-lg">Automate your customer journey sequences</p>
                </div>
                <button
                    onClick={() => { setIsCreating(!isCreating); setError(null); }}
                    className={`group relative px-6 py-3 rounded-xl transition-all duration-300 shadow-lg overflow-hidden ${isCreating ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30 hover:shadow-blue-500/50'}`}
                >
                    <div className="flex items-center space-x-2 relative z-10">
                        {isCreating ? <X size={20} /> : <Plus size={20} />}
                        <span className="font-semibold">{isCreating ? "Cancel" : "New Campaign"}</span>
                    </div>
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-8 bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center space-x-3">
                        <AlertCircle className="text-red-500" size={24} />
                        <span className="font-medium">{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            )}

            {isCreating && (
                <div className="mb-10 bg-gray-800/40 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                    
                    <h3 className="text-2xl font-bold text-gray-100 mb-8 flex items-center">
                        <span className="bg-blue-500/20 p-2 rounded-lg mr-3 text-blue-400"><Plus size={24} /></span>
                        Create Drip Sequence
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">Campaign Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Onboarding Sequence"
                                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-3.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-gray-600"
                                value={newCampaign.name}
                                onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                            />
                        </div>
                        <div>

                        <div>
                            <CustomDropdown
                                label="Target List"
                                options={lists.map(l => ({ value: l.id, label: l.name }))}
                                value={newCampaign.list_id}
                                onChange={val => setNewCampaign({ ...newCampaign, list_id: val })}
                                placeholder="Select List"
                            />
                        </div>
                        </div>
                        <div>
                        <div>
                            <CustomDropdown
                                label="Sending Account"
                                options={accounts.map(a => ({ value: a.id, label: a.phone_number }))}
                                value={newCampaign.account_id}
                                onChange={val => setNewCampaign({ ...newCampaign, account_id: val })}
                                placeholder="Select Account"
                            />
                        </div>
                        </div>
                    </div>

                    <div className="mb-8 bg-gray-900/30 rounded-2xl p-6 border border-gray-700/30">
                        <h4 className="text-lg font-semibold text-gray-200 mb-5 flex items-center">
                            <Clock className="mr-2 text-purple-400" size={20} />
                            Sequence Steps
                        </h4>
                        
                        {newCampaign.steps.length > 0 ? (
                            <div className="space-y-4 mb-6 relative">
                                {/* Connector Line */}
                                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-700/50 -z-10"></div>
                                
                                {newCampaign.steps.map((step, idx) => (
                                    <div key={idx} className="flex items-center p-4 bg-gray-800/80 rounded-xl border border-gray-700/50 shadow-sm hover:border-blue-500/30 transition-colors group">
                                        <div className="w-14 h-14 rounded-full bg-gray-900 border-2 border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-lg mr-5 shadow-lg z-10">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-100 text-lg">
                                                {templates.find(t => t.id == step.template_id)?.name || `Template #${step.template_id}`}
                                            </div>
                                            <div className="text-sm text-gray-400 flex items-center mt-1">
                                                <Clock size={14} className="mr-1.5 text-purple-400" />
                                                Wait <span className="text-gray-200 font-mono mx-1.5 bg-gray-700 px-1.5 rounded">{step.delay_minutes}</span> minutes after previous step
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newSteps = [...newCampaign.steps];
                                                newSteps.splice(idx, 1);
                                                setNewCampaign({ ...newCampaign, steps: newSteps });
                                            }}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed border-gray-700/50 rounded-xl mb-6 text-gray-500">
                                <p>No steps added yet. Add your first message below.</p>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row items-end gap-4 p-5 bg-gray-800/50 rounded-xl border border-gray-700/50">
                            <div className="flex-1 w-full">
                                <CustomDropdown
                                    label="Message Template"
                                    options={templates.map(t => ({ value: t.id, label: t.name }))}
                                    value={newStep.template_id}
                                    onChange={val => setNewStep({ ...newStep, template_id: val })}
                                    placeholder="Select Template"
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1 uppercase tracking-wider">Delay (minutes)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-gray-900/80 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    value={newStep.delay_minutes}
                                    onChange={e => setNewStep({ ...newStep, delay_minutes: parseInt(e.target.value) })}
                                />
                            </div>
                            <button
                                onClick={handleAddStep}
                                disabled={!newStep.template_id}
                                className="w-full md:w-auto bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center"
                            >
                                <Plus size={18} className="mr-2" />
                                Add Step
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-700/50">
                        <button
                            onClick={handleCreate}
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-10 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                            {loading ? "Creating..." : "Create Campaign"}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {campaigns.map(campaign => (
                    <div key={campaign.id} className="group bg-gray-800/30 backdrop-blur-md p-6 rounded-3xl border border-gray-700/50 shadow-xl hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-bold text-xl text-gray-100 group-hover:text-blue-400 transition-colors">{campaign.name}</h3>
                                <div className="flex items-center space-x-3 mt-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${campaign.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            campaign.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                'bg-gray-700/50 text-gray-400 border-gray-600'
                                        }`}>
                                        {campaign.status.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-gray-500 flex items-center">
                                        <Clock size={12} className="mr-1" />
                                        {new Date(campaign.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                {campaign.status !== 'active' && (
                                    <button
                                        onClick={() => setConfirmModal({ type: 'start', id: campaign.id })}
                                        className="p-2.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-xl transition-colors border border-green-500/20"
                                        title="Start Campaign"
                                    >
                                        <Play size={20} fill="currentColor" className="opacity-80" />
                                    </button>
                                )}
                                {campaign.status === 'active' && (
                                    <button
                                        onClick={() => setConfirmModal({ type: 'pause', id: campaign.id })}
                                        className="p-2.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded-xl transition-colors border border-yellow-500/20"
                                        title="Pause Campaign"
                                    >
                                        <Pause size={20} fill="currentColor" className="opacity-80" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-700/30">
                                <span className="text-xs text-gray-500 block mb-1 uppercase tracking-wider">Target List</span>
                                <span className="text-gray-200 font-medium truncate block" title={lists.find(l => l.id === campaign.list_id)?.name}>
                                    {lists.find(l => l.id === campaign.list_id)?.name || campaign.list_id}
                                </span>
                            </div>
                            <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-700/30">
                                <span className="text-xs text-gray-500 block mb-1 uppercase tracking-wider">Sender</span>
                                <span className="text-gray-200 font-medium truncate block" title={accounts.find(a => a.id === campaign.account_id)?.phone_number}>
                                    {accounts.find(a => a.id === campaign.account_id)?.phone_number || campaign.account_id}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-gray-700/50 pt-5">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                                <span>Sequence Steps</span>
                                <span className="bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">{campaign.steps.length}</span>
                            </h4>
                            <div className="space-y-3 relative">
                                {campaign.steps.length > 1 && (
                                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-800 -z-10"></div>
                                )}
                                {campaign.steps.map((step, idx) => (
                                    <div key={idx} className="flex items-center text-sm group/step">
                                        <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs text-gray-400 font-mono mr-3 z-10 group-hover/step:border-blue-500 group-hover/step:text-blue-400 transition-colors">
                                            {step.step_order}
                                        </div>
                                        <div className="flex-1 bg-gray-900/30 px-3 py-2 rounded-lg border border-gray-700/30 flex justify-between items-center">
                                            <span className="text-gray-300 truncate mr-2">
                                                Template #{step.template_id}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                                                +{step.delay_minutes}m
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal 
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={handleConfirmAction}
                title={confirmModal?.type === 'start' ? "Start Campaign" : "Pause Campaign"}
                message={confirmModal?.type === 'start' 
                    ? "Are you sure you want to start this drip campaign? Users will be enrolled immediately." 
                    : "Are you sure you want to pause this campaign? No new messages will be sent."}
                confirmText={confirmModal?.type === 'start' ? "Start Campaign" : "Pause Campaign"}
                isDestructive={false}
            />
        </div>
    );
}
