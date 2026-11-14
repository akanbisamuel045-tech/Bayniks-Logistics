import React, { useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  AlertTriangle,
  Wrench,
  CloudRain,
  UserX,
  X,
  CheckCircle2,
  Phone,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';

interface RiderSupportSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RiderSupportSheet: React.FC<RiderSupportSheetProps> = ({ isOpen, onClose }) => {
  const { plateNumber, activeOrder, triggerEmergencySos, reportRoadIncident } = useRiderStore();
  const [reportedIncident, setReportedIncident] = useState<string | null>(null);
  const [sosTicket, setSosTicket] = useState<string | null>(null);

  if (!isOpen) return null;

  const incidents = [
    {
      id: 'breakdown',
      title: 'Bike Breakdown / Puncture',
      desc: 'Request rescue van or backup courier handover',
      icon: Wrench,
    },
    {
      id: 'rain',
      title: 'Severe Rainstorm / Flooding',
      desc: 'Pause timer with weather delay protection',
      icon: CloudRain,
    },
    {
      id: 'customer_unreachable',
      title: 'Customer Unreachable',
      desc: 'Recipient phone ringing or gate locked > 10m',
      icon: UserX,
    },
    {
      id: 'traffic',
      title: 'Highway Gridlock / Police Check',
      desc: 'Extend SLA window automatically for recipient',
      icon: AlertTriangle,
    },
  ];

  const handleReportIncident = async (id: string, title: string) => {
    setReportedIncident(title);
    await reportRoadIncident(id, `Reported by courier: ${title}`);
    setTimeout(() => {
      setReportedIncident(null);
    }, 4000);
  };

  const handleTriggerSos = async () => {
    const res = await triggerEmergencySos();
    if (res.sosTicket) {
      setSosTicket(res.sosTicket);
      setTimeout(() => setSosTicket(null), 6000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border-t-2 sm:border-2 border-zinc-200 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden safe-bottom text-zinc-900">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/25">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900">24/7 Rider Safety & Support</h2>
              <p className="text-[10px] text-zinc-500">Emergency response & roadside assistance</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200 flex items-center justify-center transition-colors active:scale-95 shadow-sm"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto hide-scrollbar">
          {/* Incident Confirmation Banner */}
          {reportedIncident && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center gap-2.5 text-xs animate-in slide-in-from-top">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Incident Logged!</span>
                <p className="text-[11px] text-emerald-700">
                  Dispatch team notified for &quot;{reportedIncident}&quot;. Stand by for phone check-in.
                </p>
              </div>
            </div>
          )}

          {/* SOS Confirmation Banner */}
          {sosTicket && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-300 text-red-800 flex items-center gap-2.5 text-xs animate-in slide-in-from-top">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <span className="font-bold">SOS Broadcast Active! Ref: {sosTicket}</span>
                <p className="text-[11px] text-red-700">
                  Command Ops notified. Live GPS coordinates and telemetry transmitted.
                </p>
              </div>
            </div>
          )}

          {/* CRITICAL SOS PANIC BUTTON */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-red-50 to-red-100/60 border-2 border-red-300 shadow-md text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>HIGH-PRIORITY EMERGENCY</span>
            </div>

            <h3 className="text-lg font-black text-zinc-900">Emergency Assistance Hotline</h3>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto">
              Tap below for instant connection to Lagos State Emergency (112) or Bayniks Dispatch Command.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <a
                href="tel:112"
                onClick={handleTriggerSos}
                className="py-3 px-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-red-600/30 transition-transform"
              >
                <PhoneCall className="w-4 h-4" />
                <span>POLICE / AMBULANCE (112)</span>
              </a>

              <a
                href="tel:+2348002296457"
                onClick={handleTriggerSos}
                className="py-3 px-3 rounded-2xl bg-white border-2 border-red-400 hover:bg-red-50 active:scale-95 text-red-700 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-transform"
              >
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>BAYNIKS OPS SOS</span>
              </a>
            </div>
          </div>

          {/* 1-Tap Incident Report Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
              Quick Road Incident Reports
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {incidents.map((inc) => {
                const Icon = inc.icon;
                return (
                  <button
                    key={inc.id}
                    onClick={() => handleReportIncident(inc.id, inc.title)}
                    className="p-3.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-start gap-3 text-left transition-all active:scale-98 shadow-sm"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0 text-black shadow-sm">
                      <Icon className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">{inc.title}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{inc.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* General Dispatch Support */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
              Contact Dispatcher
            </span>

            <div className="flex items-center justify-between gap-3">
              <a
                href="tel:+2348002296457"
                className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold flex items-center justify-center gap-2 border border-zinc-200 shadow-sm transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-black" />
                <span>Call Center</span>
              </a>

              <a
                href="https://wa.me/2348002296457"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 border border-emerald-300 shadow-sm transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                <span>WhatsApp Ops</span>
              </a>
            </div>
          </div>

          {/* Insurance & SLA Banner */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              All registered couriers on duty are covered with ₦500,000 comprehensive cargo and accident indemnity.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

