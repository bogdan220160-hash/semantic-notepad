import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Download, Users, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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
        }
    };

    const handleScrape = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResults([]);
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
        } catch (err) {
            alert("Scraping failed: " + (err.response?.data?.detail || err.message));
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
        const listName = prompt("Enter name for new list:");
        if (!listName) return;

        try {
            // Prefer usernames if available, otherwise IDs
            const userIds = results.map(u => u.username ? `@${u.username}` : u.id);
            await axios.post('http://localhost:8000/lists/', {
                name: listName,
                users: userIds
            });
            alert("List saved successfully!");
        } catch (err) {
            alert("Failed to save list");
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-8">
                {t('audienceScraper') || "Audience Scraper"}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl border border-gray-700/50 shadow-xl">
                        <form onSubmit={handleScrape} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Select Account</label>
                                <select
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={selectedAccount}
                                    onChange={e => setSelectedAccount(e.target.value)}
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.phone_number}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Group Link or Chat</label>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            placeholder="https://t.me/groupname or Chat ID"
                                            value={groupLink}
                                            onChange={e => setGroupLink(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!selectedAccount) return alert("Select an account first");
                                                try {
                                                    const res = await axios.get(`http://localhost:8000/scraper/dialogs/${selectedAccount}`);
                                                    setDialogs(res.data);
                                                    setShowDialogs(true);
                                                } catch (err) {
                                                    alert("Failed to load chats: " + (err.response?.data?.detail || err.message));
                                                }
                                            }}
                                            className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors w-full"
                                        >
                                            Load My Chats
                                        </button>
                                    </div>

                                    {showDialogs && dialogs.length > 0 && (
                                        <select
                                            className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            onChange={e => {
                                                setGroupLink(e.target.value);
                                                setShowDialogs(false);
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select a chat...</option>
                                            {dialogs.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.title} ({d.type})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Limit</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10000"
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={limit}
                                    onChange={e => setLimit(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col space-y-3 bg-gray-900/30 p-3 rounded-xl border border-gray-700/50">
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        id="onlyUsernames"
                                        className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800"
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
                                        className="w-5 h-5 rounded border-gray-600 text-green-600 focus:ring-green-500 bg-gray-800"
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
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 flex justify-center items-center"
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
                    <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl border border-gray-700/50 shadow-xl h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-100 flex items-center">
                                <Users className="mr-2 text-blue-400" />
                                Scraped Members ({results.length})
                                {duration && <span className="ml-2 text-sm text-gray-400">({duration.toFixed(2)}s)</span>}
                            </h3>
                            {results.length > 0 && (
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleDownloadTxt}
                                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        <Download size={18} />
                                        <span>Download TXT</span>
                                    </button>
                                    <button
                                        onClick={saveToList}
                                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        <Users size={18} />
                                        <span>Save to List</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-auto bg-gray-900/30 rounded-xl border border-gray-700/30">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-gray-800 text-gray-200 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Username</th>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Phone</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50">
                                    {results.map((user, i) => (
                                        <tr key={i} className="hover:bg-gray-700/20">
                                            <td className="px-4 py-3 font-mono text-xs">{user.id}</td>
                                            <td className="px-4 py-3 text-blue-400">
                                                {user.username ? `@${user.username}` : <span className="text-gray-600 italic">No username</span>}
                                            </td>
                                            <td className="px-4 py-3">{user.first_name} {user.last_name}</td>
                                            <td className="px-4 py-3">{user.phone || '-'}</td>
                                        </tr>
                                    ))}
                                    {results.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                                No results yet. Start scraping to see members here.
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
    );
}
