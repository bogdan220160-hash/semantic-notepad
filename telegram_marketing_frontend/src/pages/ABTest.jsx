import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, BarChart2, Play, StopCircle, Loader2, FlaskConical, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import CustomDropdown from '../components/CustomDropdown';
import ConfirmModal from '../components/ConfirmModal';

export default function ABTest() {
    const { t } = useLanguage();
    const [tests, setTests] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState(null); // testId to delete
    const [errorModal, setErrorModal] = useState(null); // { message: string }

    const [newTest, setNewTest] = useState({
        name: '',
        variants: [
            { template_id: '', weight: 50 },
            { template_id: '', weight: 50 }
        ]
    });

    useEffect(() => {
        fetchTests();
        fetchTemplates();
    }, []);

    const fetchTests = async () => {
        try {
            const res = await axios.get('http://localhost:8000/ab_test/list');
            setTests(res.data);
        } catch (err) {
            console.error("Failed to fetch tests", err);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await axios.get('http://localhost:8000/messages/');
            setTemplates(res.data);
        } catch (err) {
            console.error("Failed to fetch templates", err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('http://localhost:8000/ab_test/create', newTest);
            setShowCreate(false);
            fetchTests();
            setNewTest({
                name: '',
                variants: [
                    { template_id: '', weight: 50 },
                    { template_id: '', weight: 50 }
                ]
            });
        } catch (err) {
            setErrorModal({ message: "Failed to create test: " + (err.response?.data?.detail || err.message) });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        try {
            await axios.delete(`http://localhost:8000/ab_test/${deleteModal}`);
            fetchTests();
        } catch (err) {
            setErrorModal({ message: "Failed to delete test" });
        } finally {
            setDeleteModal(null);
        }
    };

    const handleVariantChange = (index, field, value) => {
        const updatedVariants = [...newTest.variants];
        updatedVariants[index][field] = value;
        setNewTest({ ...newTest, variants: updatedVariants });
    };

    const addVariant = () => {
        setNewTest({
            ...newTest,
            variants: [...newTest.variants, { template_id: '', weight: 0 }]
        });
    };

    const removeVariant = (index) => {
        const updatedVariants = newTest.variants.filter((_, i) => i !== index);
        setNewTest({ ...newTest, variants: updatedVariants });
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex items-center">
                    <FlaskConical className="mr-3 text-blue-500" />
                    {t('abTesting')}
                </h2>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 font-medium"
                >
                    <Plus size={20} />
                    <span>{t('newTest')}</span>
                </button>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setShowCreate(false)}>
                    <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-2xl border border-gray-700 shadow-2xl transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                                {t('createTest')}
                            </h3>
                            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('testName')}</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    value={newTest.name}
                                    onChange={e => setNewTest({ ...newTest, name: e.target.value })}
                                    placeholder="e.g. Welcome Message Test"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-4">{t('variants')}</label>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {newTest.variants.map((variant, index) => (
                                        <div key={index} className="flex gap-4 items-end bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 hover:border-blue-500/30 transition-colors">
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-500 mb-1 block uppercase tracking-wider">Template</label>

                                                <CustomDropdown
                                                    options={templates.map(t => ({ value: t.id, label: t.name }))}
                                                    value={variant.template_id}
                                                    onChange={val => handleVariantChange(index, 'template_id', parseInt(val))}
                                                    placeholder={t('selectTemplate')}
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="text-xs text-gray-500 mb-1 block uppercase tracking-wider">{t('weight')}</label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    max="100"
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-center font-mono"
                                                    value={variant.weight}
                                                    onChange={e => handleVariantChange(index, 'weight', parseInt(e.target.value))}
                                                />
                                            </div>
                                            {newTest.variants.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeVariant(index)}
                                                    className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addVariant}
                                    className="w-full py-3 mt-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all flex justify-center items-center font-medium text-sm"
                                >
                                    <Plus size={16} className="mr-2" />
                                    <span>{t('addVariant')}</span>
                                </button>
                            </div>

                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700/50">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="px-6 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors font-medium"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 flex items-center transition-all disabled:opacity-50 font-bold"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                                    {t('create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {tests.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-700/50 text-center">
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <FlaskConical size={40} className="text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-300 mb-2">{t('noTestsFound')}</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">{t('createFirstTest')}</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2.5 rounded-xl transition-colors border border-gray-600 font-medium"
                        >
                            {t('createFirstTestBtn')}
                        </button>
                    </div>
                )}
                
                {tests.map(test => (
                    <div key={test.id} className="bg-gray-800/40 backdrop-blur-xl p-6 rounded-2xl border border-gray-700/50 shadow-xl hover:border-blue-500/30 transition-all group hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1 duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-bold text-xl text-gray-100 mb-2 group-hover:text-blue-400 transition-colors">{test.name}</h3>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${test.status === 'running' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        'bg-gray-700/50 text-gray-400 border-gray-600'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${test.status === 'running' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
                                    {test.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => setDeleteModal(test.id)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            {test.variants.map((v, i) => {
                                const template = templates.find(t => t.id === v.template_id);
                                return (
                                    <div key={i} className="flex justify-between items-center text-sm bg-gray-900/40 p-3 rounded-xl border border-gray-700/30">
                                        <span className="text-gray-300 truncate max-w-[55%] font-medium">
                                            {template ? template.name : `Template ${v.template_id}`}
                                        </span>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-gray-500 text-xs bg-gray-800 px-2 py-1 rounded-md border border-gray-700">{v.weight}%</span>
                                            <span className="font-mono text-blue-400 text-xs">{v.sent_count || 0} {t('sentCount')}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-4 border-t border-gray-700/50 flex justify-between items-center text-xs text-gray-500">
                            <span className="flex items-center">
                                <Clock size={12} className="mr-1" />
                                {new Date(test.created_at).toLocaleDateString()}
                            </span>
                            <button className="text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center">
                                {t('viewReport')} <BarChart2 size={14} className="ml-1" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirm Delete Modal */}
            <ConfirmModal 
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                onConfirm={handleDelete}
                title={t('deleteTestTitle')}
                message={t('deleteTestConfirm')}
                confirmText={t('delete')}
                isDestructive={true}
            />

            {/* Error Modal */}
            {errorModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full shadow-2xl transform scale-100 transition-all">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/20">
                                <AlertCircle size={32} className="text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Error</h3>
                            <p className="text-gray-300">{errorModal.message}</p>
                            <button
                                onClick={() => setErrorModal(null)}
                                className="mt-4 w-full bg-red-600 hover:bg-red-500 text-white font-medium py-2.5 rounded-xl transition-colors shadow-lg shadow-red-500/20"
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
