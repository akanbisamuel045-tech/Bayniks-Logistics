'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import {
  Zap,
  ArrowLeft,
  Star,
  Search,
  X,
  Building2,
  User,
  PackageOpen,
  Repeat,
  Check,
} from 'lucide-react';

export interface RepeatRoute {
  id: string;
  title: string;
  category: 'business' | 'personal';
  isFavorite: boolean;
  frequencyBadge: string;
  pickup: string;
  pickupLandmark: string;
  dropoff: string;
  dropoffLandmark: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  packageDesc: string;
  packageSize: 'small' | 'medium' | 'large';
  sizeLabel: string;
  distance: string;
  priceKobo: number;
}

export interface RepeatDeliveryViewProps {
  onBackClick?: () => void;
  onCustomDispatch?: (route: RepeatRoute) => void;
  onConfirmReOrder?: (route: RepeatRoute) => void;
  initialRoutes?: RepeatRoute[];
  walletBalanceKobo?: number;
}

const DEFAULT_REPEAT_ROUTES: RepeatRoute[] = [
  {
    id: 'rep-1',
    title: 'Tech Store → Lekki Phase 1',
    category: 'business',
    isFavorite: true,
    frequencyBadge: 'Dispatched 8x • Yesterday',
    pickup: '12 Commercial Avenue, Sabo Yaba, Lagos',
    pickupLandmark: 'Near Ozone Cinemas, Sabo Bus Stop',
    dropoff: 'Admiralty Way, Lekki Phase 1, Lagos',
    dropoffLandmark: 'Opposite Ebeano Supermarket',
    senderName: 'Sarah Johnson',
    senderPhone: '+234 803 421 8900',
    recipientName: 'Michael Chen',
    recipientPhone: '+234 812 990 3412',
    packageDesc: 'MacBook Pro & Accessories',
    packageSize: 'medium',
    sizeLabel: 'Medium Box',
    distance: '8.4 km • ~22 mins',
    priceKobo: 450000,
  },
  {
    id: 'rep-2',
    title: 'VI Corporate HQ → Ikoyi Crescent',
    category: 'business',
    isFavorite: true,
    frequencyBadge: 'Weekly Corporate • 5x',
    pickup: 'Victoria Island Towers, Plot 4, Lagos',
    pickupLandmark: 'Adeola Odeku Roundabout',
    dropoff: 'Bourdillon Road, Ikoyi, Lagos',
    dropoffLandmark: 'Beside Ikoyi Club 1938',
    senderName: 'Kainul Stevano',
    senderPhone: '+234 812 345 6789',
    recipientName: 'David Sterling',
    recipientPhone: '+234 901 882 1100',
    packageDesc: 'Sealed Legal Contracts & Deeds',
    packageSize: 'small',
    sizeLabel: 'Small Pouch',
    distance: '5.1 km • ~14 mins',
    priceKobo: 320000,
  },
  {
    id: 'rep-3',
    title: 'Central Warehouse → Ikeja GRA Hub',
    category: 'personal',
    isFavorite: false,
    frequencyBadge: 'Dispatched 4x • 3 days ago',
    pickup: 'Marina Central Depot, Lagos Island',
    pickupLandmark: 'CMS Bus Terminus',
    dropoff: 'Isaac John Street, Ikeja GRA, Lagos',
    dropoffLandmark: 'Opposite The Place Restaurant',
    senderName: 'Kainul Stevano',
    senderPhone: '+234 812 345 6789',
    recipientName: 'Grace Okafor',
    recipientPhone: '+234 809 441 2290',
    packageDesc: 'Fashion Apparel Sample Box',
    packageSize: 'large',
    sizeLabel: 'Large Cargo',
    distance: '16.2 km • ~38 mins',
    priceKobo: 680000,
  },
  {
    id: 'rep-4',
    title: 'Home Residence → Maryland Mall',
    category: 'personal',
    isFavorite: false,
    frequencyBadge: 'Dispatched 2x • Last Week',
    pickup: '12 Commercial Avenue, Sabo Yaba, Lagos',
    pickupLandmark: 'Sabo Market Junction',
    dropoff: 'Ikorodu Road, Maryland, Lagos',
    dropoffLandmark: 'Opposite Maryland Mall',
    senderName: 'Kainul Stevano',
    senderPhone: '+234 812 345 6789',
    recipientName: 'Diego Fernando',
    recipientPhone: '+234 706 118 9034',
    packageDesc: 'Care Package & Gift Hamper',
    packageSize: 'medium',
    sizeLabel: 'Medium Box',
    distance: '7.0 km • ~19 mins',
    priceKobo: 410000,
  },
];

export function RepeatDeliveryView({
  onBackClick,
  onCustomDispatch,
  onConfirmReOrder,
  initialRoutes = DEFAULT_REPEAT_ROUTES,
  walletBalanceKobo = 4520000,
}: RepeatDeliveryViewProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  const [routes, setRoutes] = useState<RepeatRoute[]>(initialRoutes);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'favorite' | 'business' | 'personal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalRoute, setActiveModalRoute] = useState<RepeatRoute | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/');
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = !r.isFavorite;
          showToast(updated ? `Added "${r.title}" to Favorites` : `Removed from Favorites`);
          return { ...r, isFavorite: updated };
        }
        return r;
      })
    );
  };

  const formatKobo = (kobo: number) => {
    return `₦${(kobo / 100).toLocaleString()}`;
  };

  // Filter routes
  const filteredRoutes = routes.filter((route) => {
    if (selectedCategory === 'favorite' && !route.isFavorite) return false;
    if (selectedCategory === 'business' && route.category !== 'business') return false;
    if (selectedCategory === 'personal' && route.category !== 'personal') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = route.title.toLowerCase().includes(q);
      const matchPickup = route.pickup.toLowerCase().includes(q);
      const matchDropoff = route.dropoff.toLowerCase().includes(q);
      const matchRecipient = route.recipientName.toLowerCase().includes(q);
      const matchPackage = route.packageDesc.toLowerCase().includes(q);
      return matchTitle || matchPickup || matchDropoff || matchRecipient || matchPackage;
    }

    return true;
  });

  const handleExecuteReOrder = (route: RepeatRoute) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setActiveModalRoute(null);
      showToast(`Order re-dispatched! Waybill #BYN-LGS-${Math.floor(100000 + Math.random() * 900000)}`);

      if (onConfirmReOrder) {
        onConfirmReOrder(route);
      } else {
        router.push('/deliveries');
      }
    }, 700);
  };

  const handleCustomize = (route: RepeatRoute) => {
    if (onCustomDispatch) {
      onCustomDispatch(route);
    } else {
      try {
        sessionStorage.setItem('bayniks-prefill-shipment', JSON.stringify(route));
      } catch {}
      router.push('/shipment/new');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50 text-slate-900">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-bayniks-orange text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-bolt-glow flex items-center space-x-2 animate-bounce">
          <Zap className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="px-5 py-3 border-b flex items-center justify-between shrink-0 sticky top-0 z-30 bg-white border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-slate-100 text-slate-800 hover:bg-slate-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-[9px] uppercase font-mono font-extrabold text-bayniks-orange tracking-wider block">
            1-TAP RE-ORDER
          </span>
          <h1 className="text-sm font-extrabold tracking-tight text-slate-900">Repeat Delivery</h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => router.push('/shipment/new')}
            title="Create Custom Delivery"
            className="w-10 h-10 rounded-full bg-bayniks-orange hover:bg-bayniks-orangeDark text-white flex items-center justify-center shadow-bolt-glow font-extrabold text-base transition active:scale-95"
          >
            +
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-5 space-y-4">
        {/* 1. Smart Route Memory Hero Card */}
        <div className="bg-white text-slate-900 rounded-3xl p-5 shadow-sm relative overflow-hidden border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-bayniks-orange animate-pulse" />
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-bayniks-orange">
                Smart Route Memory
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-orange-50 text-bayniks-orange border border-orange-200 flex items-center gap-1">
              <Zap className="w-3 h-3 text-bayniks-orange" />
              <span>Zero Typing</span>
            </span>
          </div>

          <div className="mt-3">
            <h2 className="text-base font-extrabold text-slate-900 leading-snug">
              Re-dispatch frequent routes in 1 tap.
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
              Pre-filled sender & recipient contacts, locked base rates, and priority matching with your top-rated couriers.
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-100 text-left">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">
                Templates
              </span>
              <p className="text-xs font-mono font-extrabold text-slate-900 mt-0.5">
                {routes.length} Saved
              </p>
            </div>
            <div className="border-l border-slate-100 pl-2.5">
              <span className="text-[9px] uppercase font-bold text-bayniks-orange block tracking-wider">
                Avg Speed
              </span>
              <p className="text-xs font-mono font-extrabold text-bayniks-orange mt-0.5">
                ~6 secs
              </p>
            </div>
            <div className="border-l border-slate-100 pl-2.5">
              <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">
                Top Courier
              </span>
              <p className="text-xs font-extrabold text-slate-900 truncate mt-0.5 flex items-center gap-1">
                <span>Tariq</span>
                <span className="inline-flex items-center text-amber-500">
                  <Star className="w-3 h-3 fill-amber-500" />
                  <span>4.95</span>
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* 2. Search & Category Filters */}
        <div className="space-y-2.5">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past routes, recipients, or items..."
              className="w-full text-xs font-medium pl-10 pr-9 py-3 rounded-2xl border transition focus:outline-none focus:border-bayniks-orange shadow-2xs bg-white text-slate-900 border-slate-200 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear Search"
                className="absolute right-3 text-slate-400 hover:text-slate-900 text-xs font-bold p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto hide-scrollbar py-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              All Routes ({routes.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('favorite')}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition shrink-0 flex items-center gap-1.5 ${
                selectedCategory === 'favorite'
                  ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Favorites ({routes.filter((r) => r.isFavorite).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('business')}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition shrink-0 flex items-center gap-1.5 ${
                selectedCategory === 'business'
                  ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Business ({routes.filter((r) => r.category === 'business').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('personal')}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition shrink-0 flex items-center gap-1.5 ${
                selectedCategory === 'personal'
                  ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal ({routes.filter((r) => r.category === 'personal').length})</span>
            </button>
          </div>
        </div>

        {/* 3. Repeat Route Cards List */}
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 pb-20">
          {filteredRoutes.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-slate-400 space-y-2">
              <PackageOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No repeat templates found</p>
              <p className="text-xs text-slate-500">Try clearing search filters or create a new delivery</p>
            </div>
          ) : (
            filteredRoutes.map((route) => (
              <div
                key={route.id}
                className="rounded-3xl p-4 border transition flex flex-col justify-between shadow-xs bg-white border-slate-200 hover:border-bayniks-orange/40"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-xs font-mono font-extrabold truncate text-slate-900">
                        {route.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          route.category === 'business'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {route.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(route.id, e)}
                      aria-label={`Toggle favorite for ${route.title}`}
                      className="text-sm hover:scale-110 transition active:scale-90"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          route.isFavorite
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Frequency Badge */}
                  <div className="mt-2 text-[10px] font-mono text-bayniks-orange font-bold">
                    {route.frequencyBadge}
                  </div>

                  {/* Corridor Summary with Nigerian Landmarks */}
                  <div className="mt-2.5 space-y-2 text-xs">
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-slate-900">{route.pickup}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Landmark: {route.pickupLandmark}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 rounded-full bg-bayniks-orange mt-1 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-slate-900">{route.dropoff}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Landmark: {route.dropoffLandmark}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Package & Distance Specs */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {route.packageDesc} •{' '}
                      <span className="font-bold text-slate-900">{route.sizeLabel}</span>
                    </span>
                    <span className="font-mono text-slate-600">{route.distance}</span>
                  </div>
                </div>

                {/* Price & Action Suite */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Fare
                    </span>
                    <span className="text-sm font-mono font-extrabold text-bayniks-orange">
                      {formatKobo(route.priceKobo)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleCustomize(route)}
                      className="px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Customize
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModalRoute(route)}
                      className="px-3.5 py-2 rounded-xl bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-xs shadow-bolt-glow transition active:scale-95"
                    >
                      1-Tap Re-Order
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 1-Tap Re-Order Confirmation Bottom Sheet / Modal */}
      {activeModalRoute && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 border bg-white border-slate-200 text-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-bayniks-orange" />
                <h3 className="text-sm font-extrabold text-slate-900">Instant 1-Tap Re-Dispatch</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalRoute(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Origin */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[9px] font-bold uppercase text-slate-500">Pickup Origin</span>
                <p className="font-bold text-slate-900">{activeModalRoute.pickup}</p>
                <p className="text-[10px] text-bayniks-orange font-mono">
                  Sender: {activeModalRoute.senderName} • {activeModalRoute.senderPhone}
                </p>
              </div>

              {/* Destination */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[9px] font-bold uppercase text-slate-500">Drop-off Destination</span>
                <p className="font-bold text-slate-900">{activeModalRoute.dropoff}</p>
                <p className="text-[10px] text-bayniks-orange font-mono">
                  Recipient: {activeModalRoute.recipientName} • {activeModalRoute.recipientPhone}
                </p>
              </div>

              {/* Package and Wallet Info */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Package Specs</span>
                  <p className="font-bold text-slate-900 truncate mt-0.5">{activeModalRoute.packageDesc}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{activeModalRoute.sizeLabel}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Bayniks Wallet</span>
                  <p className="font-bold font-mono text-emerald-700 mt-0.5">
                    {formatKobo(walletBalanceKobo)}
                  </p>
                  <p className="text-[10px] text-slate-500">Escrow Ready</p>
                </div>
              </div>

              {/* Price Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200">
                <span className="font-extrabold text-xs text-slate-900">Total Fare Deduction</span>
                <span className="text-base font-mono font-extrabold text-bayniks-orange">
                  {formatKobo(activeModalRoute.priceKobo)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleExecuteReOrder(activeModalRoute)}
                className="w-full py-3.5 rounded-2xl bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-xs shadow-bolt-glow transition active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Dispatching Courier...</span>
                ) : (
                  <>
                    <span>Confirm 1-Tap Re-Order</span>
                    <span>→</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveModalRoute(null)}
                className="w-full py-2.5 rounded-2xl font-bold text-xs transition bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

