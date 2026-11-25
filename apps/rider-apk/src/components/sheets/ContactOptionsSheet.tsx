import React from 'react';
import { MessageSquare, Phone, PhoneCall, X } from 'lucide-react';
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
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-xs animate-fadeIn"
      data-testid="contact-options-sheet"
      onClick={onClose}
    >
      <div
        className="bg-[#18181B] text-white w-full rounded-t-3xl p-5 shadow-2xl border-t border-zinc-800 animate-slideUp space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-2">
          <div>
            <h3 className="text-[17px] font-bold tracking-tight text-white">
              Contact options
            </h3>
            <p className="text-[12px] text-zinc-400 mt-0.5 leading-snug">
              Carrier rates may apply. Do not talk or text while driving.
            </p>
            <p className="text-[11px] text-[#FF5722] font-semibold mt-1">
              {passengerName} • {passengerPhone}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* 3 Clean Action Rows */}
        <div className="divide-y divide-zinc-800">
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              if (onSendMessage) onSendMessage();
              onClose();
            }}
            data-testid="contact-send-message-btn"
            className="w-full py-3.5 flex items-center gap-3.5 text-left hover:bg-zinc-800/60 transition-colors"
          >
            <MessageSquare size={18} className="text-[#FF5722] shrink-0" />
            <span className="text-[14.5px] font-medium text-white">Send a message</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              if (onCallInApp) onCallInApp();
              onClose();
            }}
            data-testid="contact-call-inapp-btn"
            className="w-full py-3.5 flex items-center gap-3.5 text-left hover:bg-zinc-800/60 transition-colors"
          >
            <PhoneCall size={18} className="text-[#FF5722] shrink-0" />
            <span className="text-[14.5px] font-medium text-white">Call in-app</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              if (onCallPhone) onCallPhone();
              onClose();
            }}
            data-testid="contact-call-phone-btn"
            className="w-full py-3.5 flex items-center gap-3.5 text-left hover:bg-zinc-800/60 transition-colors"
          >
            <Phone size={18} className="text-zinc-300 shrink-0" />
            <span className="text-[14.5px] font-medium text-white">Call by phone</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactOptionsSheet;
