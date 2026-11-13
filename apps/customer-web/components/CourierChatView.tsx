'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import {
  Zap,
  ArrowLeft,
  Bike,
  Star,
  Phone,
  Package,
  ExternalLink,
  MapPin,
  CheckCheck,
  DoorOpen,
  Building2,
  Send,
  Camera,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'rider' | 'customer';
  text: string;
  timestamp: string;
  isLocation?: boolean;
  locationDetails?: {
    title: string;
    address: string;
    lat: number;
    lng: number;
  };
}

export interface CourierChatViewProps {
  courierName?: string;
  courierRating?: number;
  courierPlate?: string;
  courierVehicle?: string;
  courierPhone?: string;
  waybillId?: string;
  handoverPin?: string;
  onBackClick?: () => void;
  onOpenLiveMap?: () => void;
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'rider',
    text: "Hello! I have picked up your package at Sabo Yaba Hub and I'm currently crossing the Third Mainland Bridge corridor.",
    timestamp: '11:42 AM',
  },
  {
    id: 'msg-2',
    sender: 'customer',
    text: 'Great, thanks Tariq! Please be mindful that the parcel contains fragile prototype electronics.',
    timestamp: '11:44 AM',
  },
  {
    id: 'msg-3',
    sender: 'rider',
    text: 'Noted! It is safely secured in the padded rear cargo trunk. ETA to Adeola Odeku is about 12 minutes.',
    timestamp: '11:46 AM',
  },
];

export function CourierChatView({
  courierName = 'Tariq Danladi',
  courierRating = 4.95,
  courierPlate = 'LND-4912',
  courierVehicle = 'Bajaj Boxer 150cc',
  courierPhone = '+2348031112233',
  waybillId = 'BYN-LGS-847291',
  handoverPin = '4829',
  onBackClick,
  onOpenLiveMap,
}: CourierChatViewProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/deliveries');
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: 'customer',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMessage]);
    if (!textToSend) setInputText('');

    // Simulate Rider Auto-Response
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const riderReply: ChatMessage = {
          id: `msg-reply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          sender: 'rider',
          text: 'Understood! Arriving shortly. Please have the 4-digit handover PIN ready.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, riderReply]);
      }, 1400);
    }, 600);
  };

  const handleShareLocation = () => {
    const locationMsg: ChatMessage = {
      id: `msg-loc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: 'customer',
      text: 'Shared Delivery Destination GPS Pin',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isLocation: true,
      locationDetails: {
        title: 'Victoria Island Towers',
        address: 'Plot 4, Adeola Odeku Street, Victoria Island',
        lat: 6.4281,
        lng: 3.4219,
      },
    };

    setMessages((prev) => [...prev, locationMsg]);
    showToast('GPS coordinate pin shared with rider');
  };

  const handleLiveMapClick = () => {
    if (onOpenLiveMap) {
      onOpenLiveMap();
    } else {
      router.push(`/track/${waybillId}`);
    }
  };

  return (
    <div className="min-h-full w-full flex flex-col justify-between bg-neutral-50/60 text-neutral-900 font-sans pb-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#FF6D1F] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-bolt-glow flex items-center space-x-2 animate-bounce">
          <Zap className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Dedicated Rider Chat Header (Matching bayniks.edition screenChat) */}
      <header className="px-5 py-3 border-b border-neutral-200/90 bg-white shadow-2xs flex items-center justify-between shrink-0 z-20 sticky top-0">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back to deliveries"
            className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 shrink-0 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-900" />
          </button>

          {/* Courier Identity with photo avatar and active status ring */}
          <div className="flex items-center space-x-3">
            <div className="relative shrink-0">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                alt="Courier Avatar"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#FF6D1F]"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-extrabold text-neutral-900 leading-tight">
                  {courierName}
                </h2>
                <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-[#FF6D1F] text-[9px] font-extrabold flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-[#FF6D1F] text-[#FF6D1F]" />
                  <span>{courierRating}</span>
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                {courierVehicle} • <span className="font-mono text-neutral-900 font-bold">{courierPlate}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Suite: Direct Voice Call */}
        <div className="flex items-center space-x-2">
          <a
            href={`tel:${courierPhone}`}
            title="Voice Call Rider"
            className="w-10 h-10 rounded-2xl bg-[#FF6D1F] hover:bg-[#EA580C] text-white flex items-center justify-center shadow-bolt-glow transition active:scale-95 cursor-pointer"
          >
            <Phone className="w-4 h-4 fill-current" />
          </a>
        </div>
      </header>

      {/* 2. Pinned Waybill Context Bar (Pure dark bar matching bayniks.edition screenChat) */}
      <div className="px-5 py-2.5 bg-[#16181D] text-white flex items-center justify-between shrink-0 shadow-md border-b border-[#FF6D1F]/20">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#FF6D1F] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            🛵
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-extrabold text-white">
                #{waybillId}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/15 font-mono text-[9px] font-bold text-[#FB923C]">
                PIN: {handoverPin}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-mono truncate">
              En Route to Victoria Island • ETA ~12 mins
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLiveMapClick}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-mono font-extrabold text-[#FB923C] border border-white/10 shrink-0 transition active:scale-95 flex items-center space-x-1 cursor-pointer"
        >
          <span>Live Radar</span>
          <ExternalLink className="w-3 h-3 text-[#FB923C]" />
        </button>
      </div>

      {/* 3. Scrollable Message Thread — Spacious Desktop Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-5 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isCustomer = msg.sender === 'customer';

          return (
            <div
              key={msg.id}
              className={`flex items-end space-x-2.5 ${
                isCustomer ? 'justify-end' : 'justify-start'
              }`}
            >
              {!isCustomer && (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-200 shrink-0 mb-1">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
                    alt={courierName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div
                className={`max-w-[80%] md:max-w-[70%] rounded-3xl p-4 shadow-sm transition ${
                  isCustomer
                    ? 'bg-[#FF6D1F] text-white rounded-br-none shadow-bolt-glow/30'
                    : 'bg-white text-neutral-900 border border-neutral-200/90 rounded-bl-none shadow-2xs'
                }`}
              >
                {/* Location Pin Card Component inside Chat */}
                {msg.isLocation && msg.locationDetails ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 font-bold text-xs">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{msg.locationDetails.title}</span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      {msg.locationDetails.address}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[10px] font-mono opacity-80">
                      <span>
                        {msg.locationDetails.lat.toFixed(4)}° N,{' '}
                        {msg.locationDetails.lng.toFixed(4)}° E
                      </span>
                      <button
                        type="button"
                        onClick={handleLiveMapClick}
                        className="underline font-bold cursor-pointer"
                      >
                        View Pin →
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs md:text-sm font-medium leading-relaxed">
                    {msg.text}
                  </p>
                )}

                <div
                  className={`mt-1.5 flex items-center justify-end space-x-1 text-[10px] font-mono ${
                    isCustomer ? 'text-orange-100 font-bold' : 'text-neutral-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {isCustomer && <CheckCheck className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Dynamic Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400 pt-1">
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6D1F] animate-bounce" />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#FF6D1F] animate-bounce"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#FF6D1F] animate-bounce"
                style={{ animationDelay: '0.3s' }}
              />
            </div>
            <span>{courierName} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 4. Quick Reply Chips Strip */}
      <div className="px-5 py-2.5 border-t border-neutral-100 bg-white/90 overflow-x-auto whitespace-nowrap hide-scrollbar flex items-center space-x-2 shrink-0 z-10">
        <button
          type="button"
          onClick={() => handleSendMessage("I am waiting at the main entrance gate")}
          className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 border border-neutral-200 transition active:scale-95 shrink-0 shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          <DoorOpen className="w-3.5 h-3.5 text-neutral-600" />
          <span>At main gate</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendMessage("Please call me once you arrive")}
          className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 border border-neutral-200 transition active:scale-95 shrink-0 shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5 text-neutral-600" />
          <span>Call on arrival</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendMessage("You can leave parcel with building security desk")}
          className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 border border-neutral-200 transition active:scale-95 shrink-0 shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          <Building2 className="w-3.5 h-3.5 text-neutral-600" />
          <span>Leave at security</span>
        </button>

        <button
          type="button"
          onClick={handleShareLocation}
          className="px-3.5 py-1.5 rounded-full bg-orange-50 text-[#FF6D1F] font-extrabold text-xs border border-[#FF6D1F]/30 transition active:scale-95 shrink-0 flex items-center space-x-1.5 shadow-2xs cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Share GPS Pin</span>
        </button>
      </div>

      {/* 5. Bottom Message Input Composer */}
      <footer className="px-5 py-3 border-t border-neutral-200/90 bg-white shrink-0 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="max-w-4xl mx-auto flex items-center space-x-2.5"
        >
          <button
            type="button"
            onClick={handleShareLocation}
            title="Share GPS Location Pin"
            className="w-11 h-11 rounded-2xl flex items-center justify-center transition active:scale-95 shrink-0 bg-neutral-100 text-[#FF6D1F] hover:bg-neutral-200 border border-neutral-200 cursor-pointer"
          >
            <MapPin className="w-5 h-5 text-[#FF6D1F]" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${courierName}...`}
            className="flex-1 text-xs font-medium px-4 py-3 rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:bg-white transition focus:outline-none focus:ring-1 focus:ring-[#FF6D1F] focus:border-[#FF6D1F]"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-2xl bg-[#FF6D1F] hover:bg-[#EA580C] text-white flex items-center justify-center shadow-bolt-glow transition active:scale-95 disabled:opacity-40 shrink-0 text-base font-bold cursor-pointer"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}
