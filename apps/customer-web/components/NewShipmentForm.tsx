'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@logistics/shared-types';
import { useTheme } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import { normalizeNigerianPhone } from './auth/auth-utils';
import {
  ArrowLeft,
  Bike,
  AlertCircle,
  MapPin,
  Package,
  Mail,
  Box,
  Truck,
} from 'lucide-react';

export type PackageSize = 'small' | 'medium' | 'large' | 'freight';

export interface NewShipmentData {
  senderName: string;
  senderPhone: string;
  pickupAddress: string;
  pickupLandmark: string;
  recipientName: string;
  recipientPhone: string;
  dropoffAddress: string;
  dropoffLandmark: string;
  deliveryNotes: string;
  packageDescription: string;
  packageSize: PackageSize;
  isFragile: boolean;
  isPriority: boolean;
  hasCargoCover: boolean;
  totalFareKobo: number;
}

export interface NewShipmentFormProps {
  onBackClick?: () => void;
  onOpenMapPicker?: (target: 'pickup' | 'dropoff') => void;
  onProceedToConfirmation?: (data: NewShipmentData) => void;
  initialData?: Partial<NewShipmentData>;
}

export function NewShipmentForm({
  onBackClick,
  onOpenMapPicker,
  onProceedToConfirmation,
  initialData,
}: NewShipmentFormProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  // Form states with realistic Lagos defaults
  const [senderName, setSenderName] = useState(initialData?.senderName || 'Kainul Designs');
  const [senderPhone, setSenderPhone] = useState(initialData?.senderPhone || '+234 812 345 6789');
  const [pickupAddress, setPickupAddress] = useState(
    initialData?.pickupAddress || '12 Commercial Avenue, Sabo, Yaba, Lagos'
  );
  const [pickupLandmark, setPickupLandmark] = useState(
    initialData?.pickupLandmark || 'Opposite Ozone Cinemas, Yaba'
  );

  const [recipientName, setRecipientName] = useState(initialData?.recipientName || 'Michael Chen');
  const [recipientPhone, setRecipientPhone] = useState(
    initialData?.recipientPhone || '+234 901 882 1100'
  );
  const [dropoffAddress, setDropoffAddress] = useState(
    initialData?.dropoffAddress || 'Victoria Island Towers, Plot 4, Adeola Odeku, Lagos'
  );
  const [dropoffLandmark, setDropoffLandmark] = useState(
    initialData?.dropoffLandmark || 'Beside Zenith Bank Head Office'
  );
  const [deliveryNotes, setDeliveryNotes] = useState(
    initialData?.deliveryNotes || 'Leave with ground floor security if not at desk'
  );

  const [packageDescription, setPackageDescription] = useState(
    initialData?.packageDescription || 'Design documents & tech prototype'
  );
  const [packageSize, setPackageSize] = useState<PackageSize>(initialData?.packageSize || 'medium');
  const [isFragile, setIsFragile] = useState(initialData?.isFragile || false);
  const [isPriority, setIsPriority] = useState(initialData?.isPriority || false);
  const [hasCargoCover, setHasCargoCover] = useState(initialData?.hasCargoCover ?? true);

  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic Kobo Fare Engine calculation
  const fareBreakdown = useMemo(() => {
    const baseRateKobo = 350000; // ₦3,500.00 base rate

    let sizeSurchargeKobo = 0;
    switch (packageSize) {
      case 'small':
        sizeSurchargeKobo = 0; // ₦0
        break;
      case 'medium':
        sizeSurchargeKobo = 70000; // ₦700.00
        break;
      case 'large':
        sizeSurchargeKobo = 150000; // ₦1,500.00
        break;
      case 'freight':
        sizeSurchargeKobo = 350000; // ₦3,500.00
        break;
    }

    const fragileKobo = isFragile ? 30000 : 0; // ₦300.00
    const priorityKobo = isPriority ? 50000 : 0; // ₦500.00
    const insuranceKobo = hasCargoCover ? 20000 : 0; // ₦200.00

    const totalKobo =
      baseRateKobo + sizeSurchargeKobo + fragileKobo + priorityKobo + insuranceKobo;

    return {
      baseRateKobo,
      sizeSurchargeKobo,
      fragileKobo,
      priorityKobo,
      insuranceKobo,
      totalKobo,
    };
  }, [packageSize, isFragile, isPriority, hasCargoCover]);

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Strict Nigerian Landmark Validation
    if (!pickupLandmark || pickupLandmark.trim().length < 3) {
      setFormError('Mandatory Nigerian Landmark required for Pickup location (e.g. Opposite Ozone Cinema)');
      return;
    }
    if (!dropoffLandmark || dropoffLandmark.trim().length < 3) {
      setFormError('Mandatory Nigerian Landmark required for Drop-off location (e.g. Beside Zenith Bank)');
      return;
    }

    if (!senderName.trim() || !recipientName.trim()) {
      setFormError('Both sender and recipient names are required');
      return;
    }

    const shipmentData: NewShipmentData = {
      senderName,
      senderPhone: normalizeNigerianPhone(senderPhone),
      pickupAddress,
      pickupLandmark,
      recipientName,
      recipientPhone: normalizeNigerianPhone(recipientPhone),
      dropoffAddress,
      dropoffLandmark,
      deliveryNotes,
      packageDescription,
      packageSize,
      isFragile,
      isPriority,
      hasCargoCover,
      totalFareKobo: fareBreakdown.totalKobo,
    };

    if (onProceedToConfirmation) {
      onProceedToConfirmation(shipmentData);
    } else {
      // Store in sessionStorage or state for checkout stage
      try {
        sessionStorage.setItem('bayniks-active-draft-shipment', JSON.stringify(shipmentData));
      } catch {}
      router.push('/shipment/confirm');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-4xl w-full mx-auto shrink-0 border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-slate-100 text-slate-800 shadow-sm hover:bg-slate-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-bayniks-orange animate-pulse" />
          <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-bayniks-orange">
            BAYNIKS EXPRESS DISPATCH
          </span>
        </div>

        <div className="w-10" />
      </header>

      {/* Main Booking Form */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 0: Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Create a Delivery</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Enter sender, recipient, mandatory Nigerian landmarks, and parcel specifications.
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-bayniks-orange shadow-sm shrink-0">
              <Bike className="w-6 h-6" />
            </div>
          </div>

          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1 & 2: Sender & Recipient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Sender Information */}
            <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <span className="w-3.5 h-3.5 rounded-full bg-bayniks-orange ring-4 ring-orange-100" />
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">1. Sender Information</h2>
              </div>

              <div>
                <label htmlFor="senderNameInput" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name / Company
                </label>
                <input
                  id="senderNameInput"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Adeola Balogun"
                  required
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-bayniks-orange focus:border-bayniks-orange transition shadow-xs"
                />
              </div>

              <div>
                <label htmlFor="senderPhoneInput" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  id="senderPhoneInput"
                  type="tel"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="+234 812 345 6789"
                  required
                  className="w-full text-xs font-mono font-bold px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-bayniks-orange focus:border-bayniks-orange transition shadow-xs"
                />
              </div>

              <div>
                <label htmlFor="pickupAddressInput" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pickup Street Address
                </label>
                <div className="relative flex items-center">
                  <input
                    id="pickupAddressInput"
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Enter pickup address"
                    required
                    className="w-full text-xs font-semibold pl-4 pr-16 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-bayniks-orange focus:border-bayniks-orange transition shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenMapPicker?.('pickup')}
                    className="absolute right-2 px-2.5 py-1 rounded-xl bg-bayniks-orange text-white text-[10px] font-bold shadow-xs hover:bg-bayniks-orangeDark transition flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Map</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="pickupLandmarkInput" className="text-xs font-bold text-slate-700">
                    Nearest Landmark / Bus Stop
                  </label>
                  <span className="text-[10px] font-mono font-bold text-bayniks-orange uppercase">
                    Mandatory
                  </span>
                </div>
                <input
                  id="pickupLandmarkInput"
                  type="text"
                  value={pickupLandmark}
                  onChange={(e) => setPickupLandmark(e.target.value)}
                  placeholder="e.g. Opposite Ozone Cinema, Sabo Yaba"
                  required
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-bayniks-orange focus:border-bayniks-orange transition shadow-xs"
                />
              </div>
            </div>

            {/* 2. Recipient Information */}
            <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">2. Recipient Information</h2>
              </div>

              <div>
                <label htmlFor="recipientNameInput" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Recipient Name
                </label>
                <input
                  id="recipientNameInput"
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Chiamaka Okonjo"
                  required
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-bayniks-orange focus:border-bayniks-orange transition shadow-xs"
                />
              </div>

              <div>
                <label htmlFor="recipientPhoneInput" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Recipient Mobile Phone
                </label>
                <input
                  id="recipientPhoneInput"
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+234 901 882 1100"
                  required
                  className="w-full text-xs font-mono font-bold px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-bayniks-orange focus:border-bayniks-orange transition shadow-xs"
                />
              </div>

              <div>
                <label htmlFor="dropoffAddressInput" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Delivery Destination Address
                </label>
                <div className="relative flex items-center">
                  <input
                    id="dropoffAddressInput"
                    type="text"
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    placeholder="Enter delivery address"
                    required
                    className="w-full text-xs font-semibold pl-4 pr-16 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-bayniks-orange focus:border-bayniks-orange transition shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenMapPicker?.('dropoff')}
                    className="absolute right-2 px-2.5 py-1 rounded-xl bg-bayniks-orange text-white text-[10px] font-bold shadow-xs hover:bg-bayniks-orangeDark transition flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Map</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="dropoffLandmarkInput" className="text-xs font-bold text-slate-700">
                    Nearest Landmark / Gate Code
                  </label>
                  <span className="text-[10px] font-mono font-bold text-bayniks-orange uppercase">
                    Mandatory
                  </span>
                </div>
                <input
                  id="dropoffLandmarkInput"
                  type="text"
                  value={dropoffLandmark}
                  onChange={(e) => setDropoffLandmark(e.target.value)}
                  placeholder="e.g. Beside Zenith Bank, Adeola Odeku"
                  required
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-bayniks-orange focus:border-bayniks-orange transition shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Package Specifications & Size Cards */}
          <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Package className="w-4 h-4 text-bayniks-orange shrink-0" />
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">3. Package Specifications &amp; Weight Tier</h2>
            </div>

            <div>
              <label htmlFor="packageDescInput" className="block text-xs font-bold text-slate-700 mb-1.5">
                What are you sending?
              </label>
              <input
                id="packageDescInput"
                type="text"
                value={packageDescription}
                onChange={(e) => setPackageDescription(e.target.value)}
                placeholder="e.g. Legal documents, iPhone 15, fabrics"
                required
                className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-bayniks-orange focus:border-bayniks-orange transition shadow-xs"
              />
            </div>

            {/* Size Selector Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Select Package Tier</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setPackageSize('small')}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    packageSize === 'small'
                      ? 'border-bayniks-orange bg-orange-50/70 shadow-sm ring-1 ring-bayniks-orange'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="mb-1 text-slate-700"><Mail className="w-5 h-5" /></div>
                  <div className="text-xs font-bold text-slate-900">Small</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Pouch • up to 3kg</div>
                  <div className="text-[11px] font-mono font-bold text-bayniks-orange mt-1">+₦0</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPackageSize('medium')}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    packageSize === 'medium'
                      ? 'border-bayniks-orange bg-orange-50/70 shadow-sm ring-1 ring-bayniks-orange'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="mb-1 text-slate-700"><Package className="w-5 h-5" /></div>
                  <div className="text-xs font-bold text-slate-900">Medium</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Parcel box • up to 10kg</div>
                  <div className="text-[11px] font-mono font-bold text-bayniks-orange mt-1">+₦700</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPackageSize('large')}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    packageSize === 'large'
                      ? 'border-bayniks-orange bg-orange-50/70 shadow-sm ring-1 ring-bayniks-orange'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="mb-1 text-slate-700"><Box className="w-5 h-5" /></div>
                  <div className="text-xs font-bold text-slate-900">Large</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Bulky carton • up to 25kg</div>
                  <div className="text-[11px] font-mono font-bold text-bayniks-orange mt-1">+₦1,500</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPackageSize('freight')}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    packageSize === 'freight'
                      ? 'border-bayniks-orange bg-orange-50/70 shadow-sm ring-1 ring-bayniks-orange'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="mb-1 text-slate-700"><Truck className="w-5 h-5" /></div>
                  <div className="text-xs font-bold text-slate-900">Freight</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Van / Cargo dispatch</div>
                  <div className="text-[11px] font-mono font-bold text-bayniks-orange mt-1">+₦3,500</div>
                </button>
              </div>
            </div>

            {/* Add-on Toggles */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  className="w-4 h-4 rounded text-bayniks-orange focus:ring-bayniks-orange"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Fragile Handling</div>
                  <div className="text-[10px] text-slate-500">+₦300 cushion seal</div>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPriority}
                  onChange={(e) => setIsPriority(e.target.checked)}
                  className="w-4 h-4 rounded text-bayniks-orange focus:ring-bayniks-orange"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Express Priority</div>
                  <div className="text-[10px] text-slate-500">+₦500 sub-30m SLA</div>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasCargoCover}
                  onChange={(e) => setHasCargoCover(e.target.checked)}
                  className="w-4 h-4 rounded text-bayniks-orange focus:ring-bayniks-orange"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">₦500k Cargo Cover</div>
                  <div className="text-[10px] text-slate-500">+₦200 insurance fee</div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Live Itemized Fare Computation Card */}
          <div className="bg-orange-50/50 border border-orange-200 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  Estimated Total Transit Fare
                </span>
                <div className="text-2xl font-mono font-black text-slate-900 mt-0.5">
                  {formatNaira(fareBreakdown.totalKobo)}
                </div>
              </div>

              <div className="text-right text-[11px] font-mono text-slate-600 font-medium">
                <div>Base: {formatNaira(fareBreakdown.baseRateKobo)}</div>
                {fareBreakdown.sizeSurchargeKobo > 0 && (
                  <div>Tier: +{formatNaira(fareBreakdown.sizeSurchargeKobo)}</div>
                )}
                {(fareBreakdown.fragileKobo > 0 ||
                  fareBreakdown.priorityKobo > 0 ||
                  fareBreakdown.insuranceKobo > 0) && (
                  <div>
                    Add-ons: +
                    {formatNaira(
                      fareBreakdown.fragileKobo +
                        fareBreakdown.priorityKobo +
                        fareBreakdown.insuranceKobo
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              Computed based on Lagos Mainland to Island corridor, weight tier, and insurance coverage. Escrow hold locked upon confirmation.
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 px-6 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-sm rounded-2xl shadow-bolt-glow active:scale-[0.98] transition flex items-center justify-center space-x-2"
            >
              <span>Review &amp; Confirm Booking</span>
              <span className="text-base font-bold">→</span>
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] font-mono text-slate-500 shrink-0 border-t border-slate-200 bg-white">
        Bayniks Dynamic Distance Engine • Instant Courier Matching
      </footer>
    </div>
  );
}

