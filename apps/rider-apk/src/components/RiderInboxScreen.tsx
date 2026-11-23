import React, { useState } from 'react';
import {
  Bell,
  Sparkles,
  ShieldAlert,
  CreditCard,
  Tag,
  ChevronRight,
  Info,
  Calendar,
} from 'lucide-react';
import { playKeypadChime } from '../utils/audioChimes';

export interface RiderInboxScreenProps {
  onOpenCampaigns?: () => void;
  onOpenEarnings?: () => void;
}

export const RiderInboxScreen: React.FC<RiderInboxScreenProps> = ({
  onOpenCampaigns,
  onOpenEarnings,
}) => {
  const [activeTab, setActiveTab] = useState<'news' | 'campaigns'>('news');

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

  const campaignNotices = [
    {
      id: 'camp-1',
      title: '₦1,500 Morning Rush Bonus is Live!',
      date: 'Today, 07:00 - 11:59',
      body: 'Complete 6 deliveries in Lagos Mainland to earn an extra ₦1,500 cash directly into your wallet.',
    },
    {
      id: 'camp-2',
      title: 'Weekend Super Bonus: Earn up to ₦4,200',
      date: 'Fri 00:00 - Sun 23:59',
      body: 'Drive 21 hours and complete 21 trips this weekend with minimum 85% confirmation rate.',
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

      {/* Sub-tabs: News vs Campaigns */}
      <div className="shrink-0 bg-white border-b border-zinc-100 px-4 py-2">
        <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setActiveTab('news');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'news'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            News
          </button>
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setActiveTab('campaigns');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'campaigns'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Campaigns
          </button>
        </div>
      </div>

      {/* Main List Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'news' ? (
          newsItems.map((item) => {
            const Icon = item.icon;
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
          })
        ) : (
          campaignNotices.map((camp) => (
            <div
              key={camp.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                playKeypadChime();
                if (onOpenCampaigns) onOpenCampaigns();
              }}
              className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs space-y-2 cursor-pointer hover:bg-zinc-50 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Tag size={12} />
                  <span>Promo</span>
                </span>
                <span className="text-xs text-zinc-400 font-medium">{camp.date}</span>
              </div>
              <h3 className="text-sm font-black text-zinc-900">{camp.title}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                {camp.body}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs font-bold text-purple-700">
                <span>View Campaign Details</span>
                <ChevronRight size={15} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RiderInboxScreen;

