import React, { useState } from 'react';
import { X, Phone, MessageSquare, ShieldCheck, ChevronRight, ExternalLink } from 'lucide-react';
import {
  ContactPartyInfo,
  WHATSAPP_TEMPLATES,
  WhatsAppTemplateKey,
  launchWhatsAppChat,
} from '../../utils/whatsappTemplates';
import { playKeypadChime } from '../../utils/audioChimes';

export interface RiderContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: ContactPartyInfo | null;
  onCallMasked?: () => void;
}

export const RiderContactModal: React.FC<RiderContactModalProps> = ({
  isOpen,
  onClose,
  party,
  onCallMasked,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateKey>('at_gate');

  if (!isOpen || !party) return null;

  const handleDirectCall = () => {
    playKeypadChime();
    window.location.href = `tel:${party.phone}`;
    onClose();
  };

  const handleSendWhatsApp = (key: WhatsAppTemplateKey) => {
    playKeypadChime();
    launchWhatsAppChat(party, key);
    onClose();
  };

  const activeTemplateObj =
    WHATSAPP_TEMPLATES.find((t) => t.key === selectedTemplate) || WHATSAPP_TEMPLATES[0]!;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-black/60 backdrop-blur-sm animate-fadeIn"
      data-testid="rider-contact-modal"
    >
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#1E1C1A] to-[#2B2724] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Phone size={16} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Contact {party.name}</h2>
              <p className="text-[11px] text-zinc-300">
                {party.role === 'sender' ? 'Sender Pickup Depot' : 'Drop-off Recipient'} • {party.phone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close Contact Modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Action Panel */}
        <div className="p-4 space-y-4">
          {/* Action 1: Direct Voice Call */}
          <button
            type="button"
            onClick={handleDirectCall}
            className="w-full p-3 rounded-2xl bg-neutral-900 hover:bg-black text-white font-extrabold text-xs flex items-center justify-between transition-all shadow-md active:scale-[0.98]"
            data-testid="btn-direct-phone-call"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                <Phone size={17} strokeWidth={2.4} />
              </div>
              <div className="text-left">
                <div className="font-black text-white">Direct Phone Call</div>
                <div className="text-[10px] text-zinc-300">Dial {party.phone} via cellular dialer</div>
              </div>
            </div>
            <ExternalLink size={15} className="text-zinc-400" />
          </button>

          {/* Action 2: WhatsApp Quick Templates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                WhatsApp Quick Connect
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Free • Uses Data
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {WHATSAPP_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.key}
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl.key)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    selectedTemplate === tmpl.key
                      ? 'border-emerald-500 bg-emerald-50/70 font-extrabold text-neutral-900 shadow-sm'
                      : 'border-neutral-200 bg-neutral-50/60 font-semibold text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <div className="text-sm mb-1">{tmpl.iconText}</div>
                  <div className="text-[11px] leading-tight">{tmpl.label}</div>
                </button>
              ))}
            </div>

            {/* Template Message Preview */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs">
              <span className="text-[10px] font-bold text-neutral-400 block mb-1">MESSAGE PREVIEW:</span>
              <p className="text-neutral-800 italic leading-relaxed text-[11px]">
                "{activeTemplateObj.getText(party)}"
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleSendWhatsApp(selectedTemplate)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
              data-testid="btn-send-whatsapp"
            >
              <MessageSquare size={16} strokeWidth={2.4} />
              <span>Open in WhatsApp with Template →</span>
            </button>
          </div>

          {/* Action 3: Masked Relay Notice */}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-neutral-500 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>NDPR Phone Masking Active</span>
            </div>
            {onCallMasked && (
              <button
                type="button"
                onClick={onCallMasked}
                className="text-[11px] font-extrabold text-[#FF5722] hover:underline"
              >
                Use Relay
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
