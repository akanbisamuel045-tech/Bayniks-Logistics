import React from 'react';
import { Sparkles, TrendingUp, X } from 'lucide-react';
import { playKeypadChime } from '../../utils/audioChimes';

export interface SurgePromptModalProps {
  isOpen: boolean;
  onStayOnline: () => void;
  onGoOffline: () => void;
}

export const SurgePromptModal: React.FC<SurgePromptModalProps> = ({
  isOpen,
  onStayOnline,
  onGoOffline,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-6 select-none"
      data-testid="surge-prompt-modal"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4 animate-scaleUp">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
          <TrendingUp size={30} strokeWidth={2.4} />
        </div>

        <div>
          <h3 className="text-xl font-black text-zinc-950 tracking-tight">
            Higher rates!
          </h3>
          <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">
            Now is the best time to earn. Surge pricing and active multiplier are live in your zone.
          </p>
        </div>

        <div className="w-full space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              onStayOnline();
            }}
            className="w-full py-3.5 rounded-2xl bg-[#18181B] hover:bg-black text-white font-extrabold text-sm shadow-sm transition active:scale-[0.99] cursor-pointer"
          >
            Stay online
          </button>
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              onGoOffline();
            }}
            className="w-full py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer"
          >
            Go offline
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurgePromptModal;

