/**
 * Chat Modal - Shared chat window component
 */
import React, { useState } from 'react';

export interface ChatMessage {
    id: number;
    sender: string;
    text: string;
    time: string;
    isMe: boolean;
}

export interface Chat {
    id: string;
    name: string;
    isGroup?: boolean;
    members?: string[];
    lastMsg?: string;
    time?: string;
}

interface ChatModalProps {
    chat: Chat;
    onClose: () => void;
    onSendMessage?: (message: string) => void;
    initialMessages?: ChatMessage[];
    accentColor?: string;
}

const ChatModal: React.FC<ChatModalProps> = ({
    chat,
    onClose,
    onSendMessage,
    initialMessages,
    accentColor = '#d91e36',
}) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>(
        initialMessages || [
            {
                id: 1,
                sender: chat.members?.[0] || 'Team Lead',
                text: chat.lastMsg || 'Hello team!',
                time: chat.time || '14:20',
                isMe: false,
            },
        ]
    );

    const handleSend = () => {
        if (!message.trim()) return;
        const newMsg: ChatMessage = {
            id: messages.length + 1,
            sender: 'You',
            text: message,
            time: new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }),
            isMe: true,
        };
        setMessages([...messages, newMsg]);
        onSendMessage?.(message);
        setMessage('');
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200">
                <button onClick={onClose} className="text-gray-600">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="flex items-center gap-2 flex-1">
                    <span className="material-symbols-outlined filled" style={{ color: accentColor }}>
                        {chat.isGroup ? 'groups' : 'person'}
                    </span>
                    <div>
                        <h3 className="font-bold text-gray-900">{chat.name}</h3>
                        <p className="text-xs text-gray-500">
                            {chat.isGroup ? `${chat.members?.length || 3} members` : 'Direct message'}
                        </p>
                    </div>
                </div>
                <button className="text-gray-600">
                    <span className="material-symbols-outlined">more_vert</span>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.isMe
                                    ? 'text-white'
                                    : 'bg-white border border-gray-200 text-gray-900'
                                }`}
                            style={msg.isMe ? { backgroundColor: accentColor } : undefined}
                        >
                            {!msg.isMe && <p className="text-xs font-bold mb-1 opacity-70">{msg.sender}</p>}
                            <p className="text-sm">{msg.text}</p>
                            <p className={`text-xs mt-1 ${msg.isMe ? 'text-white/70' : 'text-gray-500'}`}>
                                {msg.time}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                    <button className="size-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                        <span className="material-symbols-outlined">add</span>
                    </button>
                    <input
                        type="text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                        style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!message.trim()}
                        className="px-6 py-3 text-white rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform disabled:bg-gray-300"
                        style={{ backgroundColor: message.trim() ? accentColor : undefined }}
                    >
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
