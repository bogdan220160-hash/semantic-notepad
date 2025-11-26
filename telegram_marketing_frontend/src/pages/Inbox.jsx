
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, User, MessageSquare, RefreshCw, Loader2, Search, MoreVertical, Phone, Video, AlertCircle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import CustomDropdown from '../components/CustomDropdown';

export default function Inbox() {
    const { t } = useLanguage();
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [dialogs, setDialogs] = useState([]);
    const [selectedDialog, setSelectedDialog] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingDialogs, setLoadingDialogs] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (selectedAccount) {
            fetchDialogs();
        }
    }, [selectedAccount]);

    useEffect(() => {
        if (selectedAccount && selectedDialog) {
            fetchMessages();
            // Poll for new messages every 5 seconds
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedAccount, selectedDialog]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchAccounts = async () => {
        try {
            const res = await axios.get('http://localhost:8000/accounts/');
            setAccounts(res.data);
            if (res.data.length > 0) {
                setSelectedAccount(res.data[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch accounts", err);
            setError("Failed to fetch accounts");
        }
    };

    const fetchDialogs = async () => {
        setLoadingDialogs(true);
        setError(null);
        try {
            const res = await axios.get(`http://localhost:8000/inbox/${selectedAccount}/dialogs`);
            setDialogs(res.data);
        } catch (err) {
            console.error("Failed to fetch dialogs", err);
            setError("Failed to fetch dialogs");
        } finally {
            setLoadingDialogs(false);
        }
    };

    const fetchMessages = async () => {
        // Don't set loading on poll to avoid flickering
        if (messages.length === 0) setLoadingMessages(true);
        try {
            const res = await axios.get(`http://localhost:8000/inbox/${selectedAccount}/messages/${selectedDialog.id}`);
            // Reverse to show oldest first (if API returns newest first)
            // Telethon usually returns newest first, so we reverse for chat view
            setMessages(res.data.reverse());
        } catch (err) {
            console.error("Failed to fetch messages", err);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            await axios.post('http://localhost:8000/inbox/reply', {
                account_id: selectedAccount,
                peer_id: selectedDialog.id,
                message: newMessage
            });
            setNewMessage('');
            fetchMessages(); // Refresh immediately
        } catch (err) {
            setError("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col p-6 max-w-[1600px] mx-auto w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        {t('unifiedInbox') || "Unified Inbox"}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Manage all your conversations in one place</p>
                </div>
                
                <div className="flex items-center space-x-4 bg-gray-800/50 p-1.5 rounded-2xl border border-gray-700/50 backdrop-blur-sm">

                    <CustomDropdown
                        options={accounts.map(acc => ({ value: acc.id, label: acc.phone_number }))}
                        value={selectedAccount || ''}
                        onChange={val => {
                            setSelectedAccount(val);
                            setSelectedDialog(null);
                            setMessages([]);
                        }}
                        className="min-w-[200px]"
                        placeholder="Select Account"
                    />
                    <button
                        onClick={fetchDialogs}
                        className="p-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-colors"
                        title="Refresh Chats"
                    >
                        <RefreshCw size={18} className={loadingDialogs ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="absolute top-6 right-6 z-50 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="text-red-500 mr-2" size={20} />
                    <span className="text-sm font-medium mr-4">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="flex-1 flex bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden shadow-2xl">
                {/* Sidebar - Chat List */}
                <div className="w-80 md:w-96 border-r border-gray-700/50 flex flex-col bg-gray-900/20">
                    <div className="p-4 border-b border-gray-700/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search chats..." 
                                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loadingDialogs ? (
                            <div className="flex flex-col justify-center items-center h-40 text-gray-500">
                                <Loader2 className="animate-spin mb-2 text-blue-500" /> 
                                <span className="text-sm">Loading chats...</span>
                            </div>
                        ) : dialogs.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
                                <p>No chats found</p>
                            </div>
                        ) : (
                            <div className="space-y-1 p-2">
                                {dialogs.map(dialog => (
                                    <div
                                        key={dialog.id}
                                        onClick={() => setSelectedDialog(dialog)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                                            selectedDialog?.id === dialog.id 
                                            ? 'bg-blue-600/20 border border-blue-500/30 shadow-lg shadow-blue-500/10' 
                                            : 'hover:bg-gray-700/30 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner ${
                                                selectedDialog?.id === dialog.id 
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                                                : 'bg-gradient-to-br from-gray-700 to-gray-600'
                                            }`}>
                                                {dialog.name ? dialog.name[0].toUpperCase() : '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <span className={`font-semibold truncate pr-2 ${selectedDialog?.id === dialog.id ? 'text-blue-100' : 'text-gray-200'}`}>
                                                        {dialog.name || 'Unknown'}
                                                    </span>
                                                    {dialog.date && (
                                                        <span className="text-[10px] text-gray-500">
                                                            {new Date(dialog.date * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <p className={`text-sm truncate ${selectedDialog?.id === dialog.id ? 'text-blue-200/70' : 'text-gray-500 group-hover:text-gray-400'}`}>
                                                        {dialog.last_message || 'No messages'}
                                                    </p>
                                                    {dialog.unread_count > 0 && (
                                                        <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-blue-500/30 ml-2">
                                                            {dialog.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Area - Messages */}
                <div className="flex-1 flex flex-col bg-gray-900/40 relative">
                    {selectedDialog ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between bg-gray-800/30 backdrop-blur-md sticky top-0 z-10">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold mr-4 shadow-lg shadow-purple-500/20">
                                        {selectedDialog.name ? selectedDialog.name[0].toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-100 text-lg">{selectedDialog.name}</h3>
                                        <div className="flex items-center text-xs text-green-400">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                                            Online
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-400">
                                    <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"><Phone size={20} /></button>
                                    <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"><Video size={20} /></button>
                                    <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"><MoreVertical size={20} /></button>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-gray-900/20">
                                {loadingMessages ? (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 className="animate-spin text-blue-500" size={40} />
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex ${msg.is_outgoing ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-2xl px-5 py-3.5 shadow-md transition-all ${
                                                    msg.is_outgoing
                                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm shadow-blue-500/10'
                                                        : 'bg-gray-800 border border-gray-700/50 text-gray-100 rounded-tl-sm hover:border-gray-600'
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">{msg.text}</p>
                                                <div className={`text-[10px] mt-1.5 text-right font-medium ${msg.is_outgoing ? 'text-blue-200/80' : 'text-gray-500'}`}>
                                                    {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-5 bg-gray-800/50 border-t border-gray-700/50 backdrop-blur-md">
                                <form onSubmit={handleSendMessage} className="flex items-end space-x-3 bg-gray-900/50 p-2 rounded-2xl border border-gray-700/50 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        className="flex-1 bg-transparent border-none px-4 py-3 text-gray-100 focus:outline-none placeholder-gray-500 min-h-[50px]"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || !newMessage.trim()}
                                        className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform active:scale-95 mb-1 mr-1"
                                    >
                                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-900/20">
                            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-gray-700/50">
                                <MessageSquare size={40} className="text-gray-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-300 mb-2">Select a chat</h3>
                            <p className="text-gray-500 max-w-xs text-center">Choose a conversation from the sidebar to start messaging</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
