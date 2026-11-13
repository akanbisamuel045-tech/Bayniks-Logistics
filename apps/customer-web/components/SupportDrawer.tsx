'use client';

import React, { useState } from 'react';
import { Headphones, X, PhoneCall, MessageSquare, Send } from 'lucide-react';

export interface SupportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportDrawer({ isOpen, onClose }: SupportDrawerProps) {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: 'Hello! I am Bayo from Bayniks Priority Operations. How can I assist your dispatch today?',
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      sender: 'user' as const,
      text: inputText.trim(),
      time: 'Just now',
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: 'Thank you. I have pulled your account records. Our dispatch controller in Ikeja is monitoring your active waybills now.',
          time: 'Just now',
        },
      ]);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl text-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-bayniks-orange text-white flex items-center justify-center shadow-bolt-glow">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                24/7 Priority Support Desk
              </h3>
              <span className="text-[10px] font-mono text-emerald-600 font-bold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Controllers Live • Avg Reply 45s</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close support drawer"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Connect Channels */}
        <div className="p-4 grid grid-cols-2 gap-2 bg-slate-50 border-b border-slate-200">
          <a
            href="tel:08002296457"
            className="p-3 rounded-xl bg-white border border-slate-200 hover:border-bayniks-orange text-left transition-all group shadow-sm flex flex-col justify-between"
          >
            <PhoneCall className="w-4 h-4 text-bayniks-orange mb-2" />
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:text-bayniks-orange">
                0800-BAYNIKS
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">Toll-Free Hotline</span>
            </div>
          </a>

          <a
            href="https://wa.me/2348002296457?text=Hello%20Bayniks%20Support"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-left transition-all group shadow-sm flex flex-col justify-between"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600 mb-2" />
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-600">
                WhatsApp Desk
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">Instant Chat</span>
            </div>
          </a>
        </div>

        {/* Chat Message Scrollable Container */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50/50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                  m.sender === 'user'
                    ? 'bg-bayniks-orange text-white rounded-br-none shadow-bolt-glow'
                    : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-sm'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-1 px-1">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your question or waybill issue..."
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-bayniks-orange focus:bg-white transition"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-bold text-xs rounded-xl shadow-bolt-glow transition-all"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

