
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Download, Users, Loader2, Save, AlertCircle, X, CheckCircle, Filter, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import CustomDropdown from '../components/CustomDropdown';

export default function Scraper() {
    const { t } = useLanguage();
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [groupLink, setGroupLink] = useState('');
    const [limit, setLimit] = useState(100);
    const [onlyUsernames, setOnlyUsernames] = useState(true);
    const [activeOnly, setActiveOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [duration, setDuration] = useState(null);
    const [dialogs, setDialogs] = useState([]);
    const [showDialogs, setShowDialogs] = useState(false);
    const [isChatDropdownOpen, setIsChatDropdownOpen] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [newListName, setNewListName] = useState('');

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get('http://localhost:8000/accounts/');
            setAccounts(res.data);
            if (res.data.length > 0) setSelectedAccount(res.data[0].id);
        } catch (err) {
            console.error("Failed to fetch accounts", err);
            setError("Failed to fetch accounts");
        }
    };

    const handleScrape = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResults([]);
        setError(null);
        setSuccess(null);
        try {
            const res = await axios.post('http://localhost:8000/scraper/scrape', {
                account_id: selectedAccount,
                group_link: groupLink,
                limit: parseInt(limit),
                only_usernames: onlyUsernames,
                active_only: activeOnly
            });
            setResults(res.data.members);
            setDuration(res.data.duration);
            setSuccess(`Successfully scraped ${res.data.members.length} members in ${res.data.duration.toFixed(2)}s`);
        } catch (err) {
            setError("Scraping failed: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTxt = () => {
        const content = results
            .map(u => u.username ? `@${u.username}` : u.id)
            .join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scraped_users_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const saveToList = async () => {
        if (!newListName.trim()) {
            setError("Please enter a list name");
            return;
        }

        try {
            // Prefer usernames if available, otherwise IDs
            const userIds = results.map(u => u.username ? `@${u.username}` : u.id);
            await axios.post('http://localhost:8000/lists/', {
                name: newListName,
                users: userIds
            });
            setSuccess("List saved successfully!");
            setShowSaveModal(false);
            setNewListName('');
        } catch (err) {
            setError("Failed to save list");
        }
    };

    const loadChats = async () => {
        if (!selectedAccount) {
            setError("Select an account first");
            return;
        }
        try {
            const res = await axios.get(`http://localhost:8000/scraper/dialogs/${selectedAccount}`);
            setDialogs(res.data);
            setShowDialogs(true);
            setIsChatDropdownOpen(true); // Auto-open the dropdown
        } catch (err) {
            setError("Failed to load chats: " + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 tracking-tight">
                        {t('audienceScraper') || "Audience Scraper"}
                    </h2>
                    <p className="text-gray-400 mt-2 text-lg">Extract members from Telegram groups and channels</p>
                </div>
            </div>

            {/* Notifications */}
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
            {success && (
                <div className="mb-8 bg-green-500/10 border border-green-500/50 text-green-200 px-6 py-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center space-x-3">
                        <CheckCircle className="text-green-500" size={24} />
                        <span className="font-medium">{success}</span>
                    </div>
                    <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Control Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-800/40 backdrop-blur-xl p-6 rounded-3xl border border-gray-700/50 shadow-xl sticky top-6">
                        <h3 className="text-xl font-bold text-gray-100 mb-6 flex items-center">
                            <Filter className="mr-2 text-blue-400" size={20} />
                            Scrape Settings
                        </h3>
                        <form onSubmit={handleScrape} className="space-y-6">

                            <div>
                                <CustomDropdown
                                    label="Select Account"
                                    options={accounts.map(acc => ({ value: acc.id, label: acc.phone_number }))}
                                    value={selectedAccount}
                                    onChange={setSelectedAccount}
                                    placeholder="Select an account"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">Group Link or Chat</label>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-10 pr-4 py-3.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-gray-600"
                                            placeholder="https://t.me/groupname or Chat ID"
                                            value={groupLink}
                                            onChange={e => setGroupLink(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={loadChats}
                                            className="text-sm bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl transition-all w-full border border-gray-600/50 hover:border-gray-500"
                                        >
                                            Load My Chats
                                        </button>
                                    </div>

                                    {showDialogs && dialogs.length > 0 && (
                                        <div className="relative animate-in fade-in slide-in-from-top-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsChatDropdownOpen(!isChatDropdownOpen)}
                                                className="w-full bg-gray-900/80 border border-gray-700 rounded-xl px-4 py-3.5 text-gray-100 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all flex justify-between items-center hover:bg-gray-800/80"
                                            >
                                                <span className="text-gray-300 font-medium">Select a chat...</span>
                                                <ChevronDown className={`text-gray-400 transition-transform duration-300 ${isChatDropdownOpen ? 'rotate-180' : ''}`} size={20} />
                                            </button>

                                            {isChatDropdownOpen && (
                                                <div className="absolute z-50 mt-2 w-full bg-gray-800/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 slide-in-from-top-2 origin-top">
                                                    <div className="p-2 space-y-1">
                                                        {dialogs.map(d => (
                                                            <button
                                                                key={d.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setGroupLink(d.id); // Assuming ID is what we need, or username if available? Usually ID for scraper.
                                                                    setShowDialogs(false);
                                                                    setIsChatDropdownOpen(false);
                                                                }}
                                                                className="w-full text-left px-4 py-3 hover:bg-blue-600/20 hover:text-blue-300 transition-all border border-transparent hover:border-blue-500/30 rounded-lg flex items-center justify-between group"
                                                            >
                                                                <span className="font-medium text-gray-300 group-hover:text-white truncate pr-2">{d.title}</span>
                                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                                                    d.type === 'channel' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                                    d.type === 'group' || d.type === 'supergroup' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                    'bg-gray-700 text-gray-400 border-gray-600'
                                                                }`}>
                                                                    {d.type}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">Limit Users</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10000"
                                    className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-3.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    value={limit}
                                    onChange={e => setLimit(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col space-y-3 bg-gray-900/30 p-4 rounded-xl border border-gray-700/30">
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        id="onlyUsernames"
                                        className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800 transition-all"
                                        checked={onlyUsernames}
                                        onChange={e => setOnlyUsernames(e.target.checked)}
                                    />
                                    <label htmlFor="onlyUsernames" className="text-sm text-gray-300 cursor-pointer select-none">
                                        Only users with usernames
                                    </label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        id="activeOnly"
                                        className="w-5 h-5 rounded border-gray-600 text-green-600 focus:ring-green-500 bg-gray-800 transition-all"
                                        checked={activeOnly}
                                        onChange={e => setActiveOnly(e.target.checked)}
                                    />
                                    <label htmlFor="activeOnly" className="text-sm text-gray-300 cursor-pointer select-none">
                                        Active users only (Online/Recent)
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !selectedAccount}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <Loader2 className="animate-spin mr-2" />
                                        Scraping...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Search className="mr-2" size={18} />
                                        Start Scraping
                                    </span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-800/40 backdrop-blur-xl p-6 rounded-3xl border border-gray-700/50 shadow-xl h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-100 flex items-center">
                                <Users className="mr-3 text-blue-400" />
                                Scraped Members
                                <span className="ml-3 bg-gray-700/50 px-3 py-1 rounded-full text-sm text-gray-300 border border-gray-600/50">
                                    {results.length}
                                </span>
                            </h3>
                            {results.length > 0 && (
                                <div className="flex space-x-3">
                                    <button
                                        onClick={handleDownloadTxt}
                                        className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-xl transition-all border border-gray-600 hover:border-gray-500"
                                    >
                                        <Download size={18} />
                                        <span>Export TXT</span>
                                    </button>
                                    <button
                                        onClick={() => setShowSaveModal(true)}
                                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-green-500/20"
                                    >
                                        <Save size={18} />
                                        <span>Save List</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-hidden bg-gray-900/40 rounded-2xl border border-gray-700/30 flex flex-col">
                            <div className="overflow-auto custom-scrollbar flex-1">
                                <table className="w-full text-left text-sm text-gray-400">
                                    <thead className="bg-gray-800/80 text-gray-200 sticky top-0 backdrop-blur-md z-10">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">ID</th>
                                            <th className="px-6 py-4 font-semibold">Username</th>
                                            <th className="px-6 py-4 font-semibold">Name</th>
                                            <th className="px-6 py-4 font-semibold">Phone</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/30">
                                        {results.map((user, i) => (
                                            <tr key={i} className="hover:bg-blue-500/5 transition-colors group">
                                                <td className="px-6 py-3 font-mono text-xs text-gray-500 group-hover:text-gray-300">{user.id}</td>
                                                <td className="px-6 py-3">
                                                    {user.username ? (
                                                        <span className="text-blue-400 hover:underline cursor-pointer">@{user.username}</span>
                                                    ) : (
                                                        <span className="text-gray-600 italic">No username</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-gray-300 font-medium">{user.first_name} {user.last_name}</td>
                                                <td className="px-6 py-3 font-mono text-xs">{user.phone || '-'}</td>
                                            </tr>
                                        ))}
                                        {results.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-20 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Search size={48} className="mb-4 opacity-20" />
                                                        <p className="text-lg font-medium">No results yet</p>
                                                        <p className="text-sm mt-1 opacity-60">Start scraping to see members here</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save List Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={() => setShowSaveModal(false)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-gray-100 mb-6">Save to List</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">List Name</label>
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="e.g. Crypto Enthusiasts"
                                    value={newListName}
                                    onChange={e => setNewListName(e.target.value)}
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveToList}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
