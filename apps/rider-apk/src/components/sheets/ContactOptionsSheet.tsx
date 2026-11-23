import React from 'react';
import { X, MessageSquare, PhoneCall, Phone, Shield } from 'lucide-react';
import { playKeypadChime } from '../../utils/audioChimes';

export interface ContactOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  passengerName?: string;
  passengerPhone?: string;
  onSendMessage?: () => void;
  onCallInApp?: () => void;
  onCallPhone?: () => void;
}

export const ContactOptionsSheet: React.FC<ContactOptionsSheetProps> = ({
  isOpen,
  onClose,
  passengerName = 'Ebi',
  passengerPhone = '+234 803 444 5566',
  onSendMessage,
  onCallInApp,
  onCallPhone,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      data-testid="contact-options-sheet"
      onClick={onClose}
    >
      <div
        className="bg-[#1E293B] text-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl border-t border-slate-700 animate-slideUp space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-black tracking-tight text-white">Contact options</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Carrier rates may apply. Do not talk or text while driving.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Passenger Context Pill */}
        <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl flex items-center justify-between border border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              {passengerName.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold text-white">{passengerName}</div>
              <div className="text-[11px] text-slate-400">{passengerPhone}</div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Active Rider
          </span>
        </div>

        {/* 3 Contact Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* 1. Send Message */}
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              if (onSendMessage) onSendMessage();
              onClose();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-3.5 border border-slate-700 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <MessageSquare size={18} />
            </div>
            <div>
              <div className="text-sm font-bold">Send a message</div>
              <div className="text-[11px] text-slate-400 font-normal">Free in-app instant chat</div>
            </div>
          </button>

          {/* 2. Call In-App (VoIP) */}
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              if (onCallInApp) onCallInApp();
              onClose();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-3.5 border border-slate-700 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <PhoneCall size={18} />
            </div>
            <div>
              <div className="text-sm font-bold">Call in-app</div>
              <div className="text-[11px] text-slate-400 font-normal">Free encrypted voice call over data</div>
            </div>
          </button>

          {/* 3. Call by Phone (GSM) */}
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              if (onCallPhone) onCallPhone();
              onClose();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-3.5 border border-slate-700 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Phone size={18} />
            </div>
            <div>
              <div className="text-sm font-bold">Call by phone</div>
              <div className="text-[11px] text-slate-400 font-normal">Direct cellular dialer fallback</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactOptionsSheet;

