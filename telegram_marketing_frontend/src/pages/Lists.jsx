import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Trash2, FileText, Users, Loader2, Split, Eye, X, XCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';

export default function Lists() {
    const { t } = useLanguage();
    const [lists, setLists] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [viewingList, setViewingList] = useState(null);
    const [splittingList, setSplittingList] = useState(null); // ID of list being split
    const [chunkSize, setChunkSize] = useState(50);
    const [deleteModal, setDeleteModal] = useState(null); // ID of list to delete

    const fetchLists = async () => {
        try {
            const res = await axios.get('http://localhost:8000/lists/');
            setLists(res.data);
        } catch (err) {
            console.error("Failed to fetch lists", err);
        }
    };

    useEffect(() => {
        fetchLists();
    }, []);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError('');
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post('http://localhost:8000/lists/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setFile(null);
            document.getElementById('file-upload').value = "";
            fetchLists();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to upload file");
        } finally {
            setUploading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        try {
            await axios.delete(`http://localhost:8000/lists/${deleteModal}`);
            fetchLists();
        } catch (err) {
            alert("Failed to delete list");
        } finally {
            setDeleteModal(null);
        }
    };

    const handleSplit = (id) => {
        setSplittingList(id);
        setChunkSize(50); // Default value
    };

    const confirmSplit = async () => {
        if (!splittingList) return;

        const size = parseInt(chunkSize);
        if (isNaN(size) || size <= 0) {
            alert("Please enter a valid positive number.");
            return;
        }

        try {
            await axios.post(`http://localhost:8000/lists/${splittingList}/split`, { chunk_size: size });
            alert(t('listSplitSuccess'));
            setSplittingList(null);
            fetchLists();
        } catch (err) {
            alert("Failed to split list: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleView = async (id) => {
        try {
            const res = await axios.get(`http://localhost:8000/lists/${id}`);
            setViewingList(res.data);
        } catch (err) {
            console.error("Failed to fetch list details", err);
            alert("Failed to fetch list details");
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                {t('userLists')}
            </h1>

            <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-gray-700/50 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <h2 className="text-xl font-semibold mb-6 flex items-center text-gray-100">
                    <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                        <Upload className="text-blue-400" size={24} />
                    </div>
                    {t('uploadNewList')}
                </h2>
                <form onSubmit={handleUpload} className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            {t('selectFile')}
                        </label>
                        <div className="relative group">
                            <input
                                id="file-upload"
                                type="file"
                                accept=".csv,.json"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label
                                htmlFor="file-upload"
                                className="flex items-center justify-between w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-900 hover:border-blue-500/50 transition-all group-hover:shadow-lg group-hover:shadow-blue-500/10"
                            >
                                <span className={`text-sm ${file ? 'text-gray-200' : 'text-gray-500'}`}>
                                    {file ? file.name : t('chooseFile')}
                                </span>
                                <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-lg text-xs font-medium border border-gray-700 group-hover:border-gray-600 transition-colors">
                                    Browse
                                </span>
                            </label>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!file || uploading}
                        className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 font-medium"
                    >
                        {uploading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Upload size={20} className="mr-2" />}
                        {t('upload')}
                    </button>
                </form>
                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2 text-red-400 text-sm">
                        <XCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}
                <p className="text-gray-500 text-xs mt-3 flex items-center space-x-2">
                    <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400 border border-gray-700">.csv</span>
                    <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400 border border-gray-700">.json</span>
                    <span>Supported formats</span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lists.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 bg-gray-800/30 rounded-2xl border border-dashed border-gray-700 text-gray-500">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">{t('noLists')}</p>
                        <p className="text-sm opacity-60">Upload a file to get started</p>
                    </div>
                )}

                {lists.map(list => (
                    <div key={list.id} className="group relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden">
                        {/* Gradient Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-100 flex items-center mb-1">
                                        <FileText size={20} className="mr-2 text-blue-400" />
                                        <span className="line-clamp-1" title={list.name}>{list.name}</span>
                                    </h3>
                                    <div className="text-xs text-gray-500 font-mono bg-gray-900/50 px-2 py-0.5 rounded inline-block">
                                        ID: {list.id}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-900/30 rounded-xl p-4 mb-6 border border-gray-700/30 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 flex items-center">
                                        <Users size={14} className="mr-2" /> {t('users')}
                                    </span>
                                    <span className="text-gray-200 font-semibold bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                                        {list.count}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">{t('created')}</span>
                                    <span className="text-gray-400">
                                        {new Date(list.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => handleView(list.id)}
                                        className="p-2 bg-gray-700/50 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                                        title={t('viewUsers')}
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleSplit(list.id)}
                                        className="p-2 bg-gray-700/50 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 rounded-lg transition-colors"
                                        title={t('splitList')}
                                    >
                                        <Split size={18} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setDeleteModal(list.id)}
                                    className="p-2 bg-gray-700/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                    title={t('deleteList')}
                                >
                                    <Trash2 size={18} />
                                </button>
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
                title="Delete List"
                message="Are you sure you want to delete this list? This action cannot be undone."
                confirmText="Delete"
                isDestructive={true}
            />

            {/* Split List Modal */}
            {splittingList && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-8 transform scale-100 transition-all">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-purple-500/20 p-3 rounded-full text-purple-400">
                                <Split size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-100">
                                {t('splitList')}
                            </h2>
                        </div>

                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Enter the number of users you want in each new list segment.
                        </p>

                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Users per chunk</label>
                            <input
                                type="number"
                                value={chunkSize}
                                onChange={(e) => setChunkSize(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-lg font-mono"
                                placeholder="50"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setSplittingList(null)}
                                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors border border-gray-700 font-medium"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={confirmSplit}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium shadow-lg shadow-blue-500/20"
                            >
                                {t('split')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Users Modal */}
            {viewingList && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col transform scale-100 transition-all">
                        <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/30 rounded-t-2xl">
                            <div className="flex items-center space-x-3">
                                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-100">{viewingList.name}</h2>
                                    <p className="text-sm text-gray-400">{viewingList.users.length} {t('users')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingList(null)}
                                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-800/80 sticky top-0 backdrop-blur-sm z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700/50 w-20 text-center">#</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700/50">User Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/30">
                                    {viewingList.users.map((user, index) => (
                                        <tr key={index} className="hover:bg-blue-500/5 transition-colors group">
                                            <td className="px-6 py-4 text-sm text-gray-500 text-center font-mono group-hover:text-blue-400">{index + 1}</td>
                                            <td className="px-6 py-4 text-sm text-gray-300 font-mono break-all">
                                                {JSON.stringify(user)}
                                            </td>
                                        </tr>
                                    ))}
                                    {viewingList.users.length === 0 && (
                                        <tr>
                                            <td colSpan="2" className="px-6 py-12 text-center text-gray-500 flex flex-col items-center">
                                                <Users size={32} className="mb-3 opacity-20" />
                                                <span>List is empty</span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="p-4 border-t border-gray-700/50 bg-gray-800/30 rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => setViewingList(null)}
                                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors border border-gray-700 font-medium"
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
