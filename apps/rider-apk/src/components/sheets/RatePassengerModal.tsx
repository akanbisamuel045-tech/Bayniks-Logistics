import React, { useState } from 'react';
import { Star, CheckCircle2, Sparkles, MessageSquare } from 'lucide-react';
import { playMissionAcceptChime, playKeypadChime } from '../../utils/audioChimes';

export interface RatePassengerModalProps {
  isOpen: boolean;
  passengerName?: string;
  onConfirmRating: (rating: number, comment: string) => void;
}

export const RatePassengerModal: React.FC<RatePassengerModalProps> = ({
  isOpen,
  passengerName = 'Ebi',
  onConfirmRating,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('Nice ride');

  if (!isOpen) return null;

  const quickTags = ['Nice ride', 'Polite passenger', 'On time', 'Clean', 'Great route'];

  const handleSubmit = () => {
    playMissionAcceptChime();
    onConfirmRating(rating, comment.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fadeIn"
      data-testid="rate-passenger-modal"
    >
      <div className="bg-white w-full max-w-[390px] rounded-3xl p-6 shadow-2xl border border-zinc-200 text-center animate-slideUp space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-xl font-black tracking-tight text-zinc-900">Rate passenger</h2>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            How was your trip with {passengerName}?
          </p>
        </div>

        {/* 5 Interactive Golden Stars */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const isFilled = starIndex <= rating;
            return (
              <button
                key={starIndex}
                type="button"
                onClick={() => {
                  playKeypadChime();
                  setRating(starIndex);
                }}
                className="p-1 text-amber-400 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                aria-label={`${starIndex} Star`}
              >
                <Star
                  size={36}
                  fill={isFilled ? '#FBBF24' : 'none'}
                  stroke="#FBBF24"
                  strokeWidth={2}
                />
              </button>
            );
          })}
        </div>

        {/* Comment Input */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Comment (Optional)
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#00A859] transition-colors"
          />

          {/* Quick Tag Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  playKeypadChime();
                  setComment(tag);
                }}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                  comment === tag
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl bg-[#00A859] hover:bg-[#00924C] active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

export default RatePassengerModal;

