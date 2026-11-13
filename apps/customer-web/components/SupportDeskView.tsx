'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import {
  MessageSquare,
  Search,
  X,
  Phone,
  MessageCircle,
  Mail,
  Clock,
  MapPin,
  Key,
  Bike,
  Send,
  Check,
  ChevronRight,
  Plus,
  Minus,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export interface SupportFaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'tracking' | 'security' | 'payments' | 'routes' | 'insurance';
}

export interface SupportChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
}

export interface SupportDeskViewProps {
  onBackClick?: () => void;
  activeWaybill?: string;
  initialFaqs?: SupportFaqItem[];
}

const DEFAULT_FAQS: SupportFaqItem[] = [
  {
    id: 'faq-1',
    category: 'tracking',
    question: 'How do I track my courier on the live map?',
    answer:
      'Tap on any active delivery card on your Dashboard or Active Deliveries page to open the high-accuracy Leaflet map. You will see Tariq moving with 5-second live telemetry updates and landmark corridor cues.',
  },
  {
    id: 'faq-2',
    category: 'security',
    question: 'What is the 4-digit Handover OTP?',
    answer:
      'To guarantee zero parcel theft, couriers cannot complete delivery without entering your 4-digit security code (currently 4829). Share this code with the rider only after physically inspecting and receiving your package.',
  },
  {
    id: 'faq-3',
    category: 'payments',
    question: 'How do I request a refund or dispute a charge?',
    answer:
      'If a delivery is cancelled or delayed outside our SLA window, our automated billing engine instantly refunds the amount in Integer Kobo directly back to your Bayniks Delivery Wallet within 15 minutes.',
  },
  {
    id: 'faq-4',
    category: 'routes',
    question: 'Can I reroute or change the recipient address?',
    answer:
      'Yes! If the courier has not yet reached within 5 minutes of your location, you can update coordinates via the Quick Issue Resolvers or directly message courier Tariq via in-app chat.',
  },
  {
    id: 'faq-5',
    category: 'insurance',
    question: 'What is the ₦500,000 Cargo Insurance policy?',
    answer:
      'Every parcel dispatched on Bayniks is backed by an automated ₦500,000 cargo loss and accidental damage guarantee underwritten by Nigerian logistics insurance partners.',
  },
];

const INITIAL_SUPPORT_MESSAGES: SupportChatMessage[] = [
  {
    id: 'msg-agent-1',
    sender: 'agent',
    text: "Hello Kainul! I'm Chioma from Bayniks Priority Operations. I see you have active delivery #BYN-LGS-847291 in transit with Tariq. How can I assist you right now?",
    timestamp: 'Just now',
  },
];

export function SupportDeskView({
  onBackClick,
  activeWaybill = '#BYN-LGS-847291',
  initialFaqs = DEFAULT_FAQS,
}: SupportDeskViewProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  // Search and FAQ states
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  // Live Agent Chat Modal states
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<SupportChatMessage[]>(INITIAL_SUPPORT_MESSAGES);
  const [inputMessage, setInputMessage] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return initialFaqs;
    return initialFaqs.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchQuery, initialFaqs]);

  const handleToggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  // Channels actions
  const handleOpenLiveChat = () => {
    setIsLiveChatOpen(true);
  };

  const handleCallHelpline = () => {
    showToast('Dialing 0800-BAYNIKS (0800-2296457) Toll-Free...');
    if (typeof window !== 'undefined' && !navigator.userAgent.includes('jsdom')) {
      try {
        window.location.href = 'tel:08002296457';
      } catch {
        // Safe fallback in non-telephony environments
      }
    }
  };

  const handleOpenWhatsApp = () => {
    showToast('Connecting to Bayniks WhatsApp Concierge...');
    const message = encodeURIComponent(
      `Hello Bayniks Support, I need assistance with my active parcel ${activeWaybill}.`
    );
    const url = `https://wa.me/2348123456789?text=${message}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSendEmail = () => {
    showToast('Opening Email Helpdesk (support@bayniks.com)...');
    const mailto = `mailto:support@bayniks.com?subject=Bayniks%20Support%20Inquiry%20-%20${encodeURIComponent(
      activeWaybill
    )}`;
    if (typeof window !== 'undefined') {
      window.open(mailto, '_blank');
    }
  };

  // Quick Issue Resolvers
  const handleReportDelay = () => {
    showToast(`Priority alert flagged to dispatch controller for ${activeWaybill}`);
  };

  const handleAddressChangeRequest = () => {
    showToast('Directing you to active delivery corridor update...');
    router.push('/deliveries');
  };

  const handleResendOtp = () => {
    showToast(`Regenerated Handover OTP (4829) sent via SMS & WhatsApp`);
  };

  // Live Agent Message submission
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    const userMsg: SupportChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsAgentTyping(true);

    // Simulate intelligent agent response
    setTimeout(() => {
      setIsAgentTyping(false);
      let replyText = `Thanks for reporting this! Our dispatch supervisor has reviewed ${activeWaybill} and verified rider Tariq is on course.`;
      if (text.toLowerCase().includes('otp') || text.toLowerCase().includes('pin')) {
        replyText = `Your 4-digit handover security PIN is 4829. You can also generate a QR pass from your Handover screen!`;
      } else if (text.toLowerCase().includes('delay') || text.toLowerCase().includes('where')) {
        replyText = `Rider Tariq is currently near Ozone Cinemas in Yaba and ETA is under 12 minutes.`;
      } else if (text.toLowerCase().includes('address') || text.toLowerCase().includes('route')) {
        replyText = `We have placed a 5-minute routing lock so you can adjust your destination landmark seamlessly.`;
      }

      const agentReply: SupportChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: replyText,
        timestamp: 'Just now',
      };
      setChatMessages((prev) => [...prev, agentReply]);
    }, 800);
  };

  return (
    <div className="min-h-full w-full flex flex-col justify-between bg-neutral-50/60 text-neutral-900 pb-16">
      {/* 1. Support Top Header Matching bayniks.edition screenSupport */}
      <header className="px-5 py-3.5 border-b border-neutral-200/90 bg-white sticky top-0 z-20 shadow-2xs flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onBackClick || (() => router.push('/'))}
          aria-label="Back to dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-900" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm md:text-base font-extrabold tracking-tight text-neutral-900">
              24/7 Support Desk
            </h2>
          </div>
          <span className="text-[10px] text-neutral-400 font-bold block">
            Average Response: &lt; 60 seconds
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenLiveChat}
          className="px-3.5 py-2 rounded-xl bg-[#FF6D1F] hover:bg-[#EA580C] text-white text-xs font-extrabold shadow-bolt-glow active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-white" />
          <span>Chat Agent</span>
        </button>
      </header>

      {/* 2. Main Workstation Area — Desktop/Tablet Wide */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* 1. Hero Support Banner Matching bayniks.edition */}
        <div className="bg-gradient-to-br from-[#11151E] via-[#1A2230] to-[#2E1810] rounded-[28px] p-5 md:p-6 text-white shadow-xl relative overflow-hidden border border-[#FF6D1F]/25">
          <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-[#FF6D1F]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#FF6D1F]/20 text-[#FB923C] border border-[#FF6D1F]/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6D1F] animate-pulse" />
              PRIORITY ASSISTANCE
            </span>
            <span className="text-[10px] font-mono text-neutral-300">
              Ticket #TKT-84920
            </span>
          </div>

          <div className="mt-3 relative z-10">
            <h3 className="text-base md:text-lg font-extrabold text-white">
              How can we assist your delivery?
            </h3>
            <p className="text-xs text-neutral-300 font-medium mt-1 leading-relaxed max-w-2xl">
              Our dedicated logistics team and support specialists are online around the clock to assist with active parcels, route rerouting, or billing inquiries.
            </p>
          </div>

          {/* Quick Search FAQ Input */}
          <div className="mt-4 relative flex items-center z-10">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5" />
            <input
              id="supportFaqSearchInput"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics, OTP questions, or claims..."
              className="w-full text-xs font-semibold pl-10 pr-4 py-3 rounded-2xl border transition focus:outline-none focus:border-[#FF6D1F] bg-white/10 text-white placeholder-neutral-400 border-white/15 focus:bg-white/15"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-neutral-400 hover:text-white text-xs cursor-pointer"
                aria-label="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Four Direct Support Channels Grid */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 mb-2.5 px-1">
            DIRECT SUPPORT CHANNELS
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Channel 1: Live Agent Chat */}
            <button
              type="button"
              onClick={handleOpenLiveChat}
              className="p-4 md:p-5 text-left rounded-3xl border transition active:scale-[0.98] group bg-white border-neutral-200/90 text-neutral-900 hover:border-[#FF6D1F] shadow-card-soft cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#FF6D1F] text-white flex items-center justify-center shadow-bolt-glow group-hover:scale-105 transition">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-xs md:text-sm font-extrabold mt-2.5 text-neutral-900">Live Agent Chat</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">Instant human specialist</p>
              <span className="inline-block mt-2 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                &lt; 1m Wait
              </span>
            </button>

            {/* Channel 2: Toll-Free Helpline */}
            <button
              type="button"
              onClick={handleCallHelpline}
              className="p-4 md:p-5 text-left rounded-3xl border transition active:scale-[0.98] group bg-white border-neutral-200/90 text-neutral-900 hover:border-[#FF6D1F] shadow-card-soft cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-xs md:text-sm font-extrabold mt-2.5 text-neutral-900">Toll-Free Helpline</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">0800-BAYNIKS (2296)</p>
              <span className="inline-block mt-2 text-[9px] font-extrabold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                24/7 Available
              </span>
            </button>

            {/* Channel 3: WhatsApp Concierge */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="p-4 md:p-5 text-left rounded-3xl border transition active:scale-[0.98] group bg-white border-neutral-200/90 text-neutral-900 hover:border-[#FF6D1F] shadow-card-soft cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-xs md:text-sm font-extrabold mt-2.5 text-neutral-900">WhatsApp Desk</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">Chat on WhatsApp</p>
              <span className="inline-block mt-2 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Instant Sync
              </span>
            </button>

            {/* Channel 4: Official Email Support Desk */}
            <button
              type="button"
              onClick={handleSendEmail}
              className="p-4 md:p-5 text-left rounded-3xl border transition active:scale-[0.98] group bg-white border-neutral-200/90 text-neutral-900 hover:border-[#FF6D1F] shadow-card-soft cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-xs md:text-sm font-extrabold mt-2.5 text-neutral-900">Email Support</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5 truncate">support@bayniks.com</p>
              <span className="inline-block mt-2 text-[9px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                &lt; 2hr Response
              </span>
            </button>
          </div>
        </div>

        {/* 3. Quick Assistance 1-Tap Resolvers */}
        <div className="rounded-3xl p-5 border space-y-2.5 bg-white border-neutral-200/90 text-neutral-900 shadow-card-soft">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
              Quick Issue Resolvers
            </span>
            <span className="text-[10px] font-mono text-[#FF6D1F] font-bold">
              1-TAP SOLUTIONS
            </span>
          </div>

          <div className="space-y-1.5">
            <div
              onClick={handleReportDelay}
              className="p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <span className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF6D1F] flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[#FF6D1F]" />
                </span>
                <div>
                  <h5 className="text-xs font-extrabold text-neutral-900">Report a Delayed Courier</h5>
                  <p className="text-[10px] text-neutral-400">
                    Flag waybill {activeWaybill} to dispatch HQ
                  </p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[#FF6D1F]">Report →</span>
            </div>

            <div
              onClick={handleAddressChangeRequest}
              className="p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </span>
                <div>
                  <h5 className="text-xs font-extrabold text-neutral-900">Change Drop-off Address</h5>
                  <p className="text-[10px] text-neutral-400">
                    Update gate coordinates while in transit
                  </p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[#FF6D1F]">Update →</span>
            </div>

            <div
              onClick={handleResendOtp}
              className="p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Key className="w-4 h-4 text-blue-600" />
                </span>
                <div>
                  <h5 className="text-xs font-extrabold text-neutral-900">Handover OTP Not Working</h5>
                  <p className="text-[10px] text-neutral-400">
                    Re-verify or bypass code with biometric override
                  </p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[#FF6D1F]">Resend →</span>
            </div>
          </div>
        </div>

        {/* 4. Frequently Asked Questions Accordion */}
        <div className="rounded-3xl p-5 border space-y-3 bg-white border-neutral-200/90 text-neutral-900 shadow-card-soft">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
              Frequently Asked Questions
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {filteredFaqs.length} answers
            </span>
          </div>

          <div className="space-y-2" id="supportFaqAccordion">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-6 text-neutral-500 text-xs">
                No matching FAQ topics found for &quot;{searchQuery}&quot;. Tap &quot;Chat Agent&quot; above to speak with Chioma.
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="faq-item rounded-2xl border p-3.5 transition-all bg-neutral-50 border-neutral-200/80"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleFaq(faq.id)}
                      className="w-full flex items-center justify-between text-left font-extrabold text-xs text-neutral-900 cursor-pointer"
                    >
                      <span className="pr-2">{faq.question}</span>
                      <span className="faq-icon text-neutral-400 text-sm shrink-0">
                        {isExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="faq-content pt-2.5 text-[11px] text-neutral-600 font-medium leading-relaxed border-t border-neutral-200/80 mt-2">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. LIVE AGENT CHAT MODAL (CHIOMA ADEYEMI)                                 */}
      {/* ========================================================================= */}
      {isLiveChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="rounded-3xl max-h-[90vh] h-[640px] max-w-xl w-full flex flex-col overflow-hidden shadow-2xl border bg-white border-neutral-200 text-neutral-900 animate-in fade-in zoom-in-95 duration-200">
            {/* Support Drawer Header */}
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-neutral-100 shrink-0 bg-white">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80"
                    alt="Support Specialist"
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-extrabold text-neutral-900">Chioma Adeyemi</h4>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[9px] font-extrabold border border-emerald-200">
                      Official Specialist
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-medium">
                    Senior Logistics Concierge • Ticket #84920
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLiveChatOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer"
                aria-label="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Support Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/50">
              <div className="flex justify-center">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white text-neutral-600 border border-neutral-200 shadow-2xs">
                  Connected with Chioma • 256-bit Secure Support Session
                </span>
              </div>

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl p-3.5 space-y-1 ${
                      msg.sender === 'user'
                        ? 'bg-[#FF6D1F] text-white rounded-tr-xs shadow-sm'
                        : 'bg-white text-neutral-900 rounded-tl-xs border border-neutral-200/80 shadow-2xs'
                    }`}
                  >
                    <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                    <span className="text-[9px] font-bold opacity-60 block text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {isAgentTyping && (
                <div className="flex items-center space-x-1.5 text-xs text-neutral-400 italic pl-2">
                  <span>Chioma is typing</span>
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse delay-75">●</span>
                  <span className="animate-pulse delay-150">●</span>
                </div>
              )}
            </div>

            {/* Quick Reply Chips */}
            <div className="px-4 py-2 border-t border-neutral-100 bg-white flex items-center space-x-2 overflow-x-auto hide-scrollbar">
              <button
                type="button"
                onClick={() => handleSendMessage('Where is my courier right now?')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 shrink-0 transition border border-neutral-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Where is rider?</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Handover OTP is not working on rider phone')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 shrink-0 transition border border-neutral-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>OTP Issue</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('I want to adjust my drop-off gate landmark')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 shrink-0 transition border border-neutral-200 flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Change landmark</span>
              </button>
            </div>

            {/* Support Drawer Input Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-neutral-200/80 bg-white flex items-center space-x-2 shrink-0"
            >
              <input
                id="supportLiveChatInput"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your question for Chioma..."
                className="flex-1 text-xs font-semibold px-4 py-3 rounded-2xl border transition focus:outline-none focus:border-[#FF6D1F] bg-neutral-50 text-neutral-900 placeholder-neutral-400 border-neutral-200 focus:bg-white"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-2xl bg-[#FF6D1F] hover:bg-[#EA580C] text-white flex items-center justify-center font-bold shadow-bolt-glow active:scale-90 transition shrink-0 cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-neutral-700 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
