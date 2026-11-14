import React from 'react';
import {
  UserCheck,
  Bike,
  ShieldCheck,
  Volume2,
  Sun,
  Moon,
  X,
  MapPin,
  CheckCircle2,
  FileText,
  Smartphone,
  LogOut,
} from 'lucide-react';
import { useRiderStore, playDispatchChime } from '../store/riderStore';

interface RiderProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isSunlightMode: boolean;
  onToggleSunlightMode: () => void;
}

export const RiderProfileSheet: React.FC<RiderProfileSheetProps> = ({
  isOpen,
  onClose,
  isSunlightMode,
  onToggleSunlightMode,
}) => {
  const {
    riderName,
    plateNumber,
    simulationMode,
    setSimulationMode,
    riderStatus,
    toggleOnlineStatus,
  } = useRiderStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0E1013] border-t-2 sm:border-2 border-zinc-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden safe-bottom">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FF6D1F] flex items-center justify-center text-white shadow-md">
              <UserCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Rider & Vehicle Profile</h2>
              <p className="text-[10px] text-zinc-400">Verified Bayniks Dispatch Courier</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
          >
            <X className="w-4 h-4 text-black bg-white rounded-full p-0.5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto hide-scrollbar">
          {/* Identity Card */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6D1F] to-orange-700 flex items-center justify-center text-xl font-black text-white shadow-lg">
              TD
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white truncate">{riderName || 'Tariq Danladi'}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[9px] font-bold uppercase border border-emerald-800">
                  NIN Verified
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">+234 803 123 4567</p>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
                <MapPin className="w-3 h-3 text-[#FF6D1F]" />
                <span>Lagos Central Hub (Ikeja Fleet)</span>
              </div>
            </div>
          </div>

          {/* Vehicle & Permit Specifications */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              Registered Dispatch Vehicle
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-bold block">Vehicle Model</span>
                <span className="font-bold text-white">Bajaj Boxer 150cc</span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-bold block">Plate Number</span>
                <span className="font-mono font-bold text-amber-400">{plateNumber}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-bold block">LASRERA Riders Permit</span>
                <span className="font-mono text-zinc-300">LGS-RDR-2026-991</span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-bold block">GIT Insurance</span>
                <span className="font-bold text-emerald-400">Active (Leadway)</span>
              </div>
            </div>
          </div>

          {/* Rider App Settings */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              Preferences & Audio
            </span>

            {/* Sunlight Mode */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                {isSunlightMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-400" />
                )}
                <div>
                  <span className="text-xs font-bold text-white block">Sunlight High-Contrast Mode</span>
                  <span className="text-[10px] text-zinc-400">Boosts visibility for direct Lagos midday sun</span>
                </div>
              </div>
              <button
                onClick={onToggleSunlightMode}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isSunlightMode ? 'bg-[#FF6D1F]' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    isSunlightMode ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Helmet Dispatch Audio Chime Test */}
            <div className="flex items-center justify-between py-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#FF6D1F]" />
                <div>
                  <span className="text-xs font-bold text-white block">Test Dispatch Audio Chime</span>
                  <span className="text-[10px] text-zinc-400">Audible through motorcycle helmet engine rumble</span>
                </div>
              </div>
              <button
                onClick={() => playDispatchChime()}
                className="py-1 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-amber-400 border border-zinc-700 active:scale-95 transition-transform"
              >
                PLAY CHIME
              </button>
            </div>

            {/* Simulation Mode Toggle */}
            <div className="flex items-center justify-between py-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Dev Simulation Mode</span>
                  <span className="text-[10px] text-zinc-400">Enables mock offers and simulated Lagos trips</span>
                </div>
              </div>
              <button
                onClick={() => setSimulationMode(!simulationMode)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  simulationMode ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    simulationMode ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sign Out / End Shift */}
          <button
            onClick={() => {
              if (riderStatus !== 'offline') toggleOnlineStatus();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4 text-zinc-500" />
            <span>End Shift & Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
