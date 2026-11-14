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
  const { activeOrder, tripPhase, chatMessages, sendChatMessage } = useRiderStore();

  const recipientName =
    activeOrder?.stops[0]?.recipientName || activeOrder?.pickup.contactName || 'Kainul Stevano';
  const recipientPhone =
    activeOrder?.stops[0]?.recipientPhone || activeOrder?.pickup.contactPhone || '+2348021112233';
  const trackingCode = activeOrder?.trackingCode || '#473215090';

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

    sendChatMessage(text);
    if (!textToSend) setInputVal('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border-t-2 sm:border-2 border-zinc-200 rounded-t-3xl sm:rounded-3xl h-[88vh] flex flex-col shadow-2xl overflow-hidden safe-bottom text-zinc-900">
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FF6D1F] flex items-center justify-center font-bold text-white text-xs">
              {recipientName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-xs text-zinc-900 truncate">{recipientName}</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Waybill: {trackingCode}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${recipientPhone}`}
              className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 text-xs font-bold transition-colors active:scale-95 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Call</span>
            </a>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200 flex items-center justify-center transition-colors active:scale-95 shadow-sm"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar bg-[#F8F9FA]">
          <div className="text-center">
            <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-[10px] text-zinc-600 font-medium inline-flex items-center gap-1 shadow-sm">
              <ShieldCheck className="w-3 h-3 text-[#FF6D1F]" />
              <span>In-Transit Safety Monitored by Bayniks Dispatch</span>
            </span>
          </div>

          {chatMessages.map((m) => {
            const isRider = m.sender === 'rider';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isRider ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isRider
                      ? 'bg-[#FF6D1F] text-white rounded-br-none shadow-sm'
                      : 'bg-white text-zinc-800 border border-zinc-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-zinc-400 mt-1 px-1">
                  <span>{m.time}</span>
                  {isRider && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* 1-Tap Motorbike Glove Quick Replies */}
        <div className="px-3 py-2 bg-white border-t border-zinc-200 overflow-x-auto hide-scrollbar flex items-center gap-2">
          {quickReplies.map((qr, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qr)}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-[11px] font-medium text-zinc-700 transition-colors shrink-0 active:scale-95"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Text Input Bar */}
        <div className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type message to customer..."
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#FF6D1F]"
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

