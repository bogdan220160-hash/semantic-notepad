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
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('http://localhost:8000/messages/', formData);
            setIsAdding(false);
            setFormData({ name: '', content: '', media_url: '' });
            fetchTemplates();
        } catch (err) {
            alert("Failed to create template");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.put(`http://localhost:8000/messages/${currentTemplate.id}`, formData);
            setIsEditing(false);
            setCurrentTemplate(null);
            setFormData({ name: '', content: '', media_url: '' });
            fetchTemplates();
        } catch (err) {
            alert("Failed to update template");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        try {
            await axios.delete(`http://localhost:8000/messages/${deleteModal}`);
            fetchTemplates();
        } catch (err) {
            alert("Failed to delete template");
        } finally {
            setDeleteModal(null);
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
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    {t('messageTemplates')}
                </h2>
                {!isAdding && !isEditing && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={20} />
                        <span>{t('createTemplate')}</span>
                    </button>
                )}
            </div>

            {/* Add/Edit Template Form */}
            {(isAdding || isEditing) && (
                <div className="mb-8 bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold text-gray-100 flex items-center space-x-2">
                            {isEditing ? <Edit2 className="text-yellow-400" size={24} /> : <Plus className="text-blue-400" size={24} />}
                            <span>{isEditing ? t('editTemplate') : t('createTemplate')}</span>
                        </h3>
                        <button
                            onClick={() => { setIsAdding(false); setIsEditing(false); }}
                            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-lg"
                        >
                            <XCircle size={24} />
                        </button>
                    </div>
                    <form onSubmit={isEditing ? handleUpdate : handleCreate} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">{t('templateName')}</label>
                            <input
                                type="text"
                                placeholder="Welcome Message"
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">{t('messageContent')}</label>
                            <textarea
                                placeholder="Hello {name}, ..."
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all h-32 custom-scrollbar resize-none"
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                                <span>Variables:</span>
                                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 font-mono">{'{name}'}</span>
                                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 font-mono">{'{username}'}</span>
                                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 font-mono">{'{phone}'}</span>
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">{t('mediaUrl')}</label>
                            <div className="relative">
                                <ImageIcon className="absolute left-4 top-3.5 text-gray-500" size={20} />
                                <input
                                    type="text"
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    value={formData.media_url}
                                    onChange={e => setFormData({ ...formData, media_url: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 flex justify-center items-center space-x-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            <span>{t('save')}</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Templates List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(tmpl => (
                    <div key={tmpl.id} className="group relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 flex flex-col overflow-hidden">
                        {/* Gradient Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-xl text-gray-100 line-clamp-1" title={tmpl.name}>{tmpl.name}</h3>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={() => handlePreview(tmpl)}
                                        className="p-2 bg-gray-700/50 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                                        title={t('preview')}
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(tmpl)}
                                        className="p-2 bg-gray-700/50 hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-400 rounded-lg transition-colors"
                                        title={t('edit')}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => setDeleteModal(tmpl.id)}
                                        className="p-2 bg-gray-700/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                        title={t('delete')}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-gray-900/50 rounded-xl p-4 mb-4 overflow-hidden relative border border-gray-700/30 group-hover:border-gray-600/50 transition-colors">
                                <p className="text-gray-300 whitespace-pre-wrap text-sm line-clamp-4 font-light leading-relaxed">{tmpl.content}</p>
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-900 to-transparent"></div>
                            </div>
                            
                            {tmpl.media_url && (
                                <div className="text-xs text-blue-400 flex items-center space-x-2 mb-4 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20">
                                    <ImageIcon size={14} />
                                    <span className="truncate flex-1">{tmpl.media_url}</span>
                                </div>
                            )}
                            
                            <div className="text-xs text-gray-600 mt-auto pt-3 border-t border-gray-700/30 flex justify-between items-center">
                                <span className="font-mono">ID: {tmpl.id}</span>
                                <span className="text-gray-500">Template</span>
                            </div>
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
                    <div className="bg-gray-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-700 transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <h3 className="font-bold text-lg text-white flex items-center space-x-2">
                                <Eye className="text-blue-400" size={20} />
                                <span>{t('preview')}</span>
                            </h3>
                            <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 bg-gray-900/30">
                            <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 shadow-inner">
                                {previewTemplate.media_url && (
                                    <div className="relative mb-4 rounded-lg overflow-hidden bg-gray-800 aspect-video flex items-center justify-center">
                                        <img
                                            src={previewTemplate.media_url}
                                            alt="Media"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = '<div class="text-gray-500 text-xs flex flex-col items-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="mt-2">Image failed to load</span></div>';
                                            }}
                                        />
                                    </div>
                                )}
                                <p className="text-gray-100 whitespace-pre-wrap text-sm leading-relaxed">
                                    {renderPreview(previewTemplate.content)}
                                </p>
                            </div>
                            <p className="text-xs text-gray-500 text-center italic">
                                This is how the message might look with sample data.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
