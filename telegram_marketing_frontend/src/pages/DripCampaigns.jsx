import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Play, Pause, Clock, Trash2, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function DripCampaigns() {
    const { t } = useLanguage();
    const [campaigns, setCampaigns] = useState([]);
    const [lists, setLists] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);

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
        if (!newCampaign.name || !newCampaign.list_id || !newCampaign.account_id || newCampaign.steps.length === 0) {
            alert("Please fill all fields and add at least one step.");
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
            alert("Failed to create campaign");
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async (id) => {
        if (!window.confirm("Start this drip campaign? Users will be enrolled immediately.")) return;
        try {
            await axios.post(`http://localhost:8000/drip/${id}/start`);
            fetchCampaigns();
        } catch (err) {
            alert("Failed to start campaign");
        }
    };

    const handlePause = async (id) => {
        try {
            await axios.post(`http://localhost:8000/drip/${id}/pause`);
            fetchCampaigns();
        } catch (err) {
            alert("Failed to pause campaign");
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    Drip Campaigns
                </h2>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20"
                >
                    <Plus size={20} />
                    <span>{isCreating ? "Cancel" : "New Campaign"}</span>
                </button>
            </div>

            {isCreating && (
                <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl border border-gray-700/50 shadow-xl mb-8">
                    <h3 className="text-xl font-bold text-gray-100 mb-6">Create Drip Sequence</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Campaign Name</label>
                            <input
                                type="text"
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={newCampaign.name}
                                onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Target List</label>
                            <select
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={newCampaign.list_id}
                                onChange={e => setNewCampaign({ ...newCampaign, list_id: e.target.value })}
                            >
                                <option value="">Select List</option>
                                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Sending Account</label>
                            <select
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={newCampaign.account_id}
                                onChange={e => setNewCampaign({ ...newCampaign, account_id: e.target.value })}
                            >
                                <option value="">Select Account</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.phone_number}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-300 mb-4">Sequence Steps</h4>
                        <div className="space-y-4">
                            {newCampaign.steps.map((step, idx) => (
                                <div key={idx} className="flex items-center p-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mr-4">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-200">
                                            Template: {templates.find(t => t.id == step.template_id)?.name || step.template_id}
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center mt-1">
                                            <Clock size={14} className="mr-1" />
                                            Delay: {step.delay_minutes} minutes
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newSteps = [...newCampaign.steps];
                                            newSteps.splice(idx, 1);
                                            setNewCampaign({ ...newCampaign, steps: newSteps });
                                        }}
                                        className="text-gray-500 hover:text-red-400"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex items-end space-x-4 p-4 bg-gray-900/30 rounded-xl border border-gray-700/30 border-dashed">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Message Template</label>
                                <select
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                                    value={newStep.template_id}
                                    onChange={e => setNewStep({ ...newStep, template_id: e.target.value })}
                                >
                                    <option value="">Select Template</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="w-32">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Delay (mins)</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                                    value={newStep.delay_minutes}
                                    onChange={e => setNewStep({ ...newStep, delay_minutes: parseInt(e.target.value) })}
                                />
                            </div>
                            <button
                                onClick={handleAddStep}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                                Add Step
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all"
                    >
                        {loading ? "Creating..." : "Create Campaign"}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {campaigns.map(campaign => (
                    <div key={campaign.id} className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl border border-gray-700/50 shadow-xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-xl text-gray-100">{campaign.name}</h3>
                                <div className="flex items-center space-x-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${campaign.status === 'active' ? 'bg-green-500/10 text-green-400' :
                                            campaign.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
                                                'bg-gray-700 text-gray-400'
                                        }`}>
                                        {campaign.status.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(campaign.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                {campaign.status !== 'active' && (
                                    <button
                                        onClick={() => handleStart(campaign.id)}
                                        className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                        title="Start"
                                    >
                                        <Play size={18} />
                                    </button>
                                )}
                                {campaign.status === 'active' && (
                                    <button
                                        onClick={() => handlePause(campaign.id)}
                                        className="p-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                                        title="Pause"
                                    >
                                        <Pause size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">List</span>
                                <span className="text-gray-300">{lists.find(l => l.id === campaign.list_id)?.name || campaign.list_id}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Account</span>
                                <span className="text-gray-300">{accounts.find(a => a.id === campaign.account_id)?.phone_number || campaign.account_id}</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-700/50 pt-4">
                            <h4 className="text-sm font-semibold text-gray-400 mb-3">Steps ({campaign.steps.length})</h4>
                            <div className="space-y-2">
                                {campaign.steps.map((step, idx) => (
                                    <div key={idx} className="flex items-center text-sm">
                                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 mr-3">
                                            {step.step_order}
                                        </div>
                                        <div className="flex-1 text-gray-300 truncate">
                                            Template #{step.template_id}
                                        </div>
                                        <div className="text-gray-500 text-xs">
                                            +{step.delay_minutes}m
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
