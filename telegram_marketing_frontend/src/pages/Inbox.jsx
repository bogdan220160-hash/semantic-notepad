import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, User, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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
        }
    };

    const fetchDialogs = async () => {
        setLoadingDialogs(true);
        try {
            const res = await axios.get(`http://localhost:8000/inbox/${selectedAccount}/dialogs`);
            setDialogs(res.data);
        } catch (err) {
            console.error("Failed to fetch dialogs", err);
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
            alert("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    {t('unifiedInbox') || "Unified Inbox"}
                </h2>
                <div className="flex items-center space-x-4">
                    <select
                        className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedAccount || ''}
                        onChange={e => {
                            setSelectedAccount(e.target.value);
                            setSelectedDialog(null);
                            setMessages([]);
                        }}
                    >
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.phone_number}</option>
                        ))}
                    </select>
                    <button
                        onClick={fetchDialogs}
                        className="p-2 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
                        title="Refresh Chats"
                    >
                        <RefreshCw size={20} className={loadingDialogs ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden shadow-xl">
                {/* Sidebar - Chat List */}
                <div className="w-1/3 border-r border-gray-700/50 flex flex-col">
                    <div className="p-4 border-b border-gray-700/50 bg-gray-900/30">
                        <h3 className="font-semibold text-gray-300">Chats</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loadingDialogs ? (
                            <div className="flex justify-center items-center h-full text-gray-500">
                                <Loader2 className="animate-spin mr-2" /> Loading...
                            </div>
                        ) : dialogs.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">No chats found</div>
                        ) : (
                            dialogs.map(dialog => (
                                <div
                                    key={dialog.id}
                                    onClick={() => setSelectedDialog(dialog)}
                                    className={`p-4 border-b border-gray-700/30 cursor-pointer transition-colors hover:bg-gray-700/30 ${selectedDialog?.id === dialog.id ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-gray-200 truncate pr-2">{dialog.name || 'Unknown'}</span>
                                        {dialog.unread_count > 0 && (
                                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                {dialog.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">{dialog.last_message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Area - Messages */}
                <div className="flex-1 flex flex-col bg-gray-900/30">
                    {selectedDialog ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-700/50 flex items-center bg-gray-800/80">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                                    {selectedDialog.name ? selectedDialog.name[0].toUpperCase() : '?'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-100">{selectedDialog.name}</h3>
                                    <span className="text-xs text-gray-400">ID: {selectedDialog.id}</span>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {loadingMessages ? (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex ${msg.is_outgoing ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.is_outgoing
                                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                                        : 'bg-gray-700 text-gray-100 rounded-tl-none'
                                                    }`}
                                            >
                                                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                                <div className={`text-[10px] mt-1 text-right ${msg.is_outgoing ? 'text-blue-200' : 'text-gray-400'}`}>
                                                    {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-gray-800 border-t border-gray-700/50">
                                <form onSubmit={handleSendMessage} className="flex space-x-3">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || !newMessage.trim()}
                                        className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {sending ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <MessageSquare size={64} className="mb-4 opacity-20" />
                            <p className="text-xl font-medium">Select a chat to start messaging</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
