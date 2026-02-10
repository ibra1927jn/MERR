/**
 * Send Direct Message Modal - Shared component
 */
import React, { useState } from 'react';

export interface Recipient {
    id: string;
    name: string;
    role: string;
    department?: string;
}

interface SendDirectMessageModalProps {
    onClose: () => void;
    onSend: (recipient: Recipient, message: string) => void;
    recipients: Recipient[];
    accentColor?: string;
}

const SendDirectMessageModal: React.FC<SendDirectMessageModalProps> = ({
    onClose,
    onSend,
    recipients,
    accentColor = '#d91e36',
}) => {
    const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (selectedRecipient && message.trim()) {
            onSend(selectedRecipient, message);
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Send Direct Message</h3>
                    <button onClick={onClose} className="text-gray-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Select Recipient</p>
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {recipients.map(person => (
                        <label
                            key={person.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedRecipient?.id === person.id
                                    ? 'text-white'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                            style={
                                selectedRecipient?.id === person.id ? { backgroundColor: accentColor } : undefined
                            }
                        >
                            <input
                                type="radio"
                                name="recipient"
                                checked={selectedRecipient?.id === person.id}
                                onChange={() => setSelectedRecipient(person)}
                                className="size-5"
                            />
                            <div className="flex-1">
                                <p
                                    className={`font-bold text-sm ${selectedRecipient?.id === person.id ? 'text-white' : 'text-gray-900'
                                        }`}
                                >
                                    {person.name}
                                </p>
                                <p
                                    className={`text-xs ${selectedRecipient?.id === person.id ? 'text-white/80' : 'text-gray-500'
                                        }`}
                                >
                                    {person.role}
                                    {person.department && ` • ${person.department}`}
                                </p>
                            </div>
                        </label>
                    ))}
                </div>

                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Your Message</p>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none resize-none mb-4"
                    rows={4}
                />

                <button
                    onClick={handleSend}
                    disabled={!selectedRecipient || !message.trim()}
                    className="w-full py-4 text-white rounded-xl font-bold uppercase tracking-widest disabled:bg-gray-300 active:scale-95 transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: selectedRecipient && message.trim() ? accentColor : undefined }}
                >
                    <span className="material-symbols-outlined">send</span>
                    Send Message
                </button>
            </div>
        </div>
    );
};

export default SendDirectMessageModal;
