import React from 'react';
import {
  ShieldAlert,
  CreditCard,
  Info,
} from 'lucide-react';

export interface RiderInboxScreenProps {
  onOpenEarnings?: () => void;
}

export const RiderInboxScreen: React.FC<RiderInboxScreenProps> = () => {
  const newsItems = [
    {
      id: 'news-1',
      title: 'Heavy traffic expected on Third Mainland Bridge',
      date: 'Today, 08:30',
      category: 'Traffic',
      icon: ShieldAlert,
      body: 'Maintenance works ongoing between Adeniji Adele and Adekunle. Expect delays or use Ikorodu Road alternative.',
    },
    {
      id: 'news-2',
      title: 'Weekly Payout Successfully Processed',
      date: 'Yesterday, 14:00',
      category: 'Finances',
      icon: CreditCard,
      body: 'Your weekly settlement has been transferred to your registered GTBank account.',
    },
    {
      id: 'news-3',
      title: 'Rainy Season Safety Advisory',
      date: '21 Oct, 10:15',
      category: 'Safety',
      icon: Info,
      body: 'Ensure your motorcycle brake pads and rain gear are in top condition before going online during downpours.',
    },
  ];

  return (
    <div
      className="w-full h-full flex flex-col bg-[#F8FAFC] text-zinc-900 select-none overflow-hidden"
      data-testid="rider-inbox-screen"
    >
      {/* Top Header */}
      <div className="shrink-0 bg-white border-b border-zinc-200 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-black text-zinc-900 tracking-tight">Inbox</h2>
        <span className="text-xs font-bold text-zinc-400">Updates</span>
      </div>

      {/* Main List Body (News & System Updates) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {newsItems.map((item) => {
          return (
            <div
              key={item.id}
              className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  {item.category}
                </span>
                <span className="text-zinc-400 font-medium">{item.date}</span>
              </div>
              <h3 className="text-sm font-black text-zinc-900">{item.title}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                {item.body}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiderInboxScreen;
