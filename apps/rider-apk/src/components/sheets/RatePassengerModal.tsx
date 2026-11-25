import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { playKeypadChime, playMissionAcceptChime } from '../../utils/audioChimes';

export interface RatePassengerModalProps {
  isOpen: boolean;
  passengerName?: string;
  onConfirmRating: (rating: number, comment: string) => void;
}

const LOW_RATING_REASONS = [
  'Passenger did not pay for the trip',
  'Passenger was misbehaving',
  'Passenger messed up my car',
] as const;

export const RatePassengerModal: React.FC<RatePassengerModalProps> = ({
  isOpen,
  passengerName = 'Ebi',
  onConfirmRating,
}) => {
  const [rating, setRating] = useState(5);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    playMissionAcceptChime();
    const combinedComment = [selectedReason, comment.trim()].filter(Boolean).join(' • ');
    onConfirmRating(rating, combinedComment || `Rated ${passengerName} ${rating} stars`);
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-white flex flex-col justify-between select-none animate-fadeIn text-[#18181B]"
      data-testid="rate-passenger-modal"
    >
      <div className="px-6 pt-10 flex-1 overflow-y-auto">
        <div className="text-center">
          <h2 className="text-[19px] font-bold text-[#18181B] tracking-tight">
            Rate passenger
          </h2>
          <p className="text-[12.5px] text-zinc-400 mt-1">{passengerName}</p>
        </div>

        {/* 5 Interactive Stars */}
        <div className="flex items-center justify-center gap-2.5 py-6">
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const isFilled = starIndex <= rating;
            return (
              <button
                key={starIndex}
                type="button"
                onClick={() => {
                  playKeypadChime();
                  setRating(starIndex);
                  if (starIndex >= 4) {
                    setSelectedReason(null);
                  }
                }}
                className="p-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                aria-label={`${starIndex} Star`}
              >
                <Star
                  size={34}
                  fill={isFilled ? '#FF5722' : 'none'}
                  stroke={isFilled ? '#FF5722' : '#A1A1AA'}
                  strokeWidth={1.8}
                />
              </button>
            );
          })}
        </div>

        {/* Issue Radios When Rating < 4 Stars (Matching Video Frame #216) */}
        {rating <= 3 && (
          <div className="space-y-3 pb-6" data-testid="low-rating-reasons">
            {LOW_RATING_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setSelectedReason(isSelected ? null : reason);
                  }}
                  className="w-full py-1.5 flex items-center gap-3.5 text-left"
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-[5px] border-[#18181B] bg-[#FF5722]'
                        : 'border-2 border-[#18181B]/60 bg-white'
                    }`}
                  />
                  <span className="text-[14px] text-[#18181B] font-medium">
                    {reason}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Underline Comment Input */}
        <div className="pt-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment"
            className="w-full py-2.5 text-center border-b border-zinc-200 focus:border-[#18181B] bg-transparent text-[14px] text-[#18181B] placeholder:text-zinc-400 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Bottom Pill Confirm Button */}
      <div className="p-5 bg-white">
        <button
          type="button"
          onClick={handleSubmit}
          data-testid="rate-passenger-confirm-btn"
          className="w-full py-3.5 rounded-full bg-[#18181B] hover:bg-zinc-800 active:scale-[0.98] text-white font-semibold text-[15px] shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Confirm</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]" />
        </button>
      </div>
    </div>
  );
};

export default RatePassengerModal;
