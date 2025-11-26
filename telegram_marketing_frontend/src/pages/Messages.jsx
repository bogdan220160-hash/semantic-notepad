import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, Save, X, MessageSquare, Eye, XCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';

export default function Messages() {
    const { t } = useLanguage();
    const [templates, setTemplates] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [formData, setFormData] = useState({ name: '', content: '', media_url: '' });
    const [loading, setLoading] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null); // templateId to delete
    const [error, setError] = useState(null);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get('http://localhost:8000/messages/');
            setTemplates(res.data);
        } catch (err) {
            console.error("Failed to fetch templates", err);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleEdit = (template) => {
        setCurrentTemplate(template);
        setFormData({
            name: template.name,
            content: template.content,
            media_url: template.media_url || ''
        });
        setIsEditing(true);
        setIsAdding(false);
        setError(null);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await axios.post('http://localhost:8000/messages/', formData);
            setIsAdding(false);
            setFormData({ name: '', content: '', media_url: '' });
            fetchTemplates();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to create template");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await axios.put(`http://localhost:8000/messages/${currentTemplate.id}`, formData);
            setIsEditing(false);
            setCurrentTemplate(null);
            setFormData({ name: '', content: '', media_url: '' });
            fetchTemplates();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to update template");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        setError(null);
        try {
            await axios.delete(`http://localhost:8000/messages/${deleteModal}`);
            fetchTemplates();
            setDeleteModal(null);
        } catch (err) {
            // Keep modal open if error? Or close and show toast?
            // Let's close modal and show error in main view for visibility
            setDeleteModal(null);
            setError(err.response?.data?.detail || "Failed to delete template");
            
            // Auto-clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
        }
    };

    const handlePreview = (template) => {
        setPreviewTemplate(template);
    };

    const renderPreview = (content) => {
        // Simple variable substitution for preview
        let preview = content
            .replace(/{name}/g, "John Doe")
            .replace(/{username}/g, "@johndoe")
            .replace(/{phone}/g, "+1234567890");
        return preview;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 tracking-tight">
                        {t('messageTemplates')}
                    </h2>
                    <p className="text-gray-400 mt-2 text-lg">Manage your automated message templates</p>
                </div>
                {!isAdding && !isEditing && (
                    <button
                        onClick={() => { setIsAdding(true); setError(null); }}
                        className="group relative px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        <div className="flex items-center space-x-2 relative z-10">
                            <Plus size={20} />
                            <span className="font-semibold">{t('createTemplate')}</span>
                        </div>
                    </button>
                )}
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-8 bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center space-x-3">
                        <XCircle className="text-red-500" size={24} />
                        <span className="font-medium">{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Add/Edit Template Form */}
            {(isAdding || isEditing) && (
                <div className="mb-10 bg-gray-800/40 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                    
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${isEditing ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
                                {isEditing ? <Edit2 className="text-yellow-400" size={24} /> : <Plus className="text-blue-400" size={24} />}
                            </div>
                            <span>{isEditing ? t('editTemplate') : t('createTemplate')}</span>
                        </h3>
                        <button
                            onClick={() => { setIsAdding(false); setIsEditing(false); setError(null); }}
                            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-full"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    
                    <form onSubmit={isEditing ? handleUpdate : handleCreate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">{t('templateName')}</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Welcome Message"
                                        className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-5 py-3.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-gray-600"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">{t('mediaUrl')}</label>
                                    <div className="relative group">
                                        <ImageIcon className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                                        <input
                                            type="text"
                                            placeholder="https://example.com/image.jpg"
                                            className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-12 pr-4 py-3.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-gray-600"
                                            value={formData.media_url}
                                            onChange={e => setFormData({ ...formData, media_url: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">{t('messageContent')}</label>
                                <textarea
                                    placeholder="Hello {name}, ..."
                                    className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-5 py-3.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all h-[160px] custom-scrollbar resize-none placeholder-gray-600 font-mono text-sm leading-relaxed"
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    required
                                />
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mr-1">Variables:</span>
                                    {['{name}', '{username}', '{phone}'].map(v => (
                                        <span key={v} className="bg-gray-800/80 border border-gray-700 px-2 py-1 rounded-md text-xs text-blue-300 font-mono cursor-help hover:border-blue-500/30 transition-colors" title={`Use ${v} in your message`}>
                                            {v}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-8 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                <span>{t('save')}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Templates List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {templates.map(tmpl => (
                    <div key={tmpl.id} className="group relative bg-gray-800/30 backdrop-blur-md border border-gray-700/50 rounded-3xl p-6 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 flex flex-col overflow-hidden">
                        {/* Gradient Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-5">
                                <div className="flex-1 mr-2">
                                    <h3 className="font-bold text-xl text-gray-100 line-clamp-1 group-hover:text-blue-400 transition-colors" title={tmpl.name}>{tmpl.name}</h3>
                                    <div className="text-xs text-gray-500 mt-1 font-mono">ID: {tmpl.id}</div>
                                </div>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => handlePreview(tmpl)}
                                        className="p-2 bg-gray-700/30 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-xl transition-all duration-200"
                                        title={t('preview')}
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(tmpl)}
                                        className="p-2 bg-gray-700/30 hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-400 rounded-xl transition-all duration-200"
                                        title={t('edit')}
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => setDeleteModal(tmpl.id)}
                                        className="p-2 bg-gray-700/30 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-all duration-200"
                                        title={t('delete')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-gray-900/40 rounded-2xl p-4 mb-4 overflow-hidden relative border border-gray-700/30 group-hover:border-gray-600/50 transition-colors">
                                <p className="text-gray-300 whitespace-pre-wrap text-sm line-clamp-4 font-light leading-relaxed opacity-90">{tmpl.content}</p>
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900/90 to-transparent"></div>
                            </div>
                            
                            {tmpl.media_url && (
                                <div className="mt-auto">
                                    <div className="text-xs text-blue-300 flex items-center space-x-2 bg-blue-500/10 px-3 py-2.5 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-default">
                                        <ImageIcon size={14} />
                                        <span className="truncate flex-1 font-medium">{tmpl.media_url}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirm Delete Modal */}
            <ConfirmModal 
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                onConfirm={confirmDelete}
                title="Delete Template"
                message="Are you sure you want to delete this template? This action cannot be undone."
                confirmText="Delete"
                isDestructive={true}
            />

            {/* Preview Modal */}
            {previewTemplate && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewTemplate(null)}>
                    <div className="bg-gray-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-700 transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                            <h3 className="font-bold text-lg text-white flex items-center space-x-2">
                                <Eye className="text-blue-400" size={20} />
                                <span>{t('preview')}</span>
                            </h3>
                            <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50 shadow-inner">
                                {previewTemplate.media_url && (
                                    <div className="relative mb-5 rounded-xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center border border-gray-700/50">
                                        <img
                                            src={previewTemplate.media_url}
                                            alt="Media"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = '<div class="text-gray-500 text-xs flex flex-col items-center gap-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span>Image failed to load</span></div>';
                                            }}
                                        />
                                    </div>
                                )}
                                <p className="text-gray-100 whitespace-pre-wrap text-sm leading-relaxed font-sans">
                                    {renderPreview(previewTemplate.content)}
                                </p>
                            </div>
                            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 italic">
                                <span>Preview mode</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span>Variables replaced with sample data</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
