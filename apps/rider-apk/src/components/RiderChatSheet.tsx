import React, { useState } from 'react';
import {
  MessageSquareQuote,
  Send,
  Phone,
  X,
  CheckCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';

interface RiderChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'rider' | 'customer';
  text: string;
  time: string;
}

export const RiderChatSheet: React.FC<RiderChatSheetProps> = ({ isOpen, onClose }) => {
  const { activeOrder, tripPhase } = useRiderStore();

  const recipientName =
    activeOrder?.stops[0]?.recipientName || activeOrder?.pickup.contactName || 'Kainul Stevano';
  const recipientPhone =
    activeOrder?.stops[0]?.recipientPhone || activeOrder?.pickup.contactPhone || '+2348021112233';
  const trackingCode = activeOrder?.trackingCode || '#473215090';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'customer',
      text: 'Good day! Please drop package with security if I am not at the door.',
      time: '11:02 AM',
    },
    {
      id: 'm2',
      sender: 'rider',
      text: 'Noted sir! I am currently en route, ETA is around 12 minutes.',
      time: '11:04 AM',
    },
    {
      id: 'm3',
      sender: 'customer',
      text: 'Great, thanks! I will have the delivery PIN ready for you.',
      time: '11:05 AM',
    },
  ]);

  const [inputVal, setInputVal] = useState('');

  if (!isOpen) return null;

  const quickReplies = [
    'I have arrived at your gate / entrance 📍',
    'Heavy traffic on express, ETA +6 mins ⏳',
    'Please have your 4-digit delivery PIN ready 🔑',
    'Calling your phone number now 📞',
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputVal.trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: 'm-' + Date.now(),
      sender: 'rider',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputVal('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0E1013] border-t-2 sm:border-2 border-zinc-800 rounded-t-3xl sm:rounded-3xl h-[88vh] flex flex-col shadow-2xl overflow-hidden safe-bottom">
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FF6D1F] flex items-center justify-center font-bold text-white text-xs">
              {recipientName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-xs text-white truncate">{recipientName}</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">Waybill: {trackingCode}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${recipientPhone}`}
              className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-xs font-bold transition-colors active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 text-black bg-emerald-400 rounded-full p-0.5" />
              <span className="hidden sm:inline">Call</span>
            </a>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
            >
              <X className="w-4 h-4 text-black bg-white rounded-full p-0.5" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar bg-black/40">
          <div className="text-center">
            <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-medium inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#FF6D1F]" />
              <span>In-Transit Safety Monitored by Bayniks Dispatch</span>
            </span>
          </div>

          {messages.map((m) => {
            const isRider = m.sender === 'rider';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isRider ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isRider
                      ? 'bg-[#FF6D1F] text-white rounded-br-none shadow-md shadow-orange-500/10'
                      : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-zinc-500 mt-1 px-1">
                  <span>{m.time}</span>
                  {isRider && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* 1-Tap Motorbike Glove Quick Replies */}
        <div className="px-3 py-2 bg-zinc-950 border-t border-zinc-800/80 overflow-x-auto hide-scrollbar flex items-center gap-2">
          {quickReplies.map((qr, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qr)}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-zinc-300 transition-colors shrink-0 active:scale-95"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Text Input Bar */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type message to customer..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6D1F]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputVal.trim()}
            className="w-10 h-10 rounded-xl bg-[#FF6D1F] hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-orange-500/20"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
