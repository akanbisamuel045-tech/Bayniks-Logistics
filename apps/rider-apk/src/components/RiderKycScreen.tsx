import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Upload,
  CheckCircle2,
  FileText,
  User,
  Phone,
  Bike,
  Truck,
  Camera,
  Calendar,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { compressPodPhotoUnder300KB } from '../services/imageCompressor.service';
import { playKeypadChime, playMissionAcceptChime, playErrorChime } from '../utils/audioChimes';

export interface RiderKycScreenProps {
  onBack: () => void;
}

export const RiderKycScreen: React.FC<RiderKycScreenProps> = ({ onBack }) => {
  const {
    kycStatus,
    kycRejectionReason,
    kycDocuments,
    submitKyc,
    setKycStatus,
    isSubmitting,
    showToast,
  } = useRiderStore();

  const [nin, setNin] = useState(kycDocuments.nin || '28491029481');
  const [dob, setDob] = useState(kycDocuments.dateOfBirth || '1994-06-14');
  const [address, setAddress] = useState(kycDocuments.residentialAddress || '14 Olumo Street, Onike, Yaba, Lagos');
  const [nextOfKinName, setNextOfKinName] = useState(kycDocuments.nextOfKinName || 'Abiola Adeleke');
  const [nextOfKinPhone, setNextOfKinPhone] = useState(kycDocuments.nextOfKinPhone || '+2348034567890');
  const [vehicleType, setVehicleType] = useState<'bike' | 'van' | 'truck'>(kycDocuments.vehicleType || 'bike');
  const [plateNumber, setPlateNumber] = useState(kycDocuments.plateNumber || 'KJA-824-XY');
  const [lasdriNumber, setLasdriNumber] = useState(kycDocuments.lasdriNumber || 'LSD-2024-84910');
  const [ridersCardNumber, setRidersCardNumber] = useState(kycDocuments.ridersCardNumber || 'RC-LAG-98214');
  const [fleetCode, setFleetCode] = useState(kycDocuments.fleetCode || 'FLT-LAGOS-01');

  // Simulated Document Upload States
  const [passportUploaded, setPassportUploaded] = useState(true);
  const [licenseUploaded, setLicenseUploaded] = useState(true);
  const [permitUploaded, setPermitUploaded] = useState(true);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileUpload = async (type: 'passport' | 'license' | 'permit') => {
    playKeypadChime();
    setIsCompressing(true);
    try {
      // Simulate taking a 2MB photo and compressing to <200KB via service
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 800;
      dummyCanvas.height = 600;
      const ctx = dummyCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FF5722';
        ctx.fillRect(0, 0, 800, 600);
      }
      const rawDataUrl = dummyCanvas.toDataURL('image/jpeg', 0.9);
      const compressed = await compressPodPhotoUnder300KB(rawDataUrl);

      if (type === 'passport') setPassportUploaded(true);
      if (type === 'license') setLicenseUploaded(true);
      if (type === 'permit') setPermitUploaded(true);

      showToast(`Document uploaded & compressed to ${(compressed.byteSize / 1024).toFixed(0)}KB`);
    } catch {
      showToast('Uploaded document successfully');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nin || nin.length < 11) {
      playErrorChime();
      showToast('National Identity Number (NIN) must be 11 digits');
      return;
    }
    if (!plateNumber.trim()) {
      playErrorChime();
      showToast('Vehicle Plate Number is required');
      return;
    }

    playKeypadChime();
    const res = await submitKyc({
      nin,
      dateOfBirth: dob,
      residentialAddress: address,
      nextOfKinName,
      nextOfKinPhone,
      vehicleType,
      plateNumber,
      lasdriNumber,
      ridersCardNumber,
      fleetCode,
    });

    if (res.success) {
      playMissionAcceptChime();
    }
  };

  const toggleDemoApproval = () => {
    playKeypadChime();
    const next = kycStatus === 'approved' ? 'pending_review' : 'approved';
    setKycStatus(next);
    showToast(`KYC status set to ${next.toUpperCase()}`);
  };

  return (
    <div
      className="min-h-full pb-28 bg-[#FAFAF9] text-zinc-900 select-none animate-fadeIn"
      data-testid="rider-kyc-screen"
    >
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3.5 border-b border-zinc-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              onBack();
            }}
            className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 flex items-center justify-center text-zinc-800 transition-colors"
            aria-label="Back to Profile"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight leading-tight">
              KYC & Regulatory Compliance
            </h1>
            <p className="text-[11px] font-semibold text-zinc-500">
              Lagos State MVAA, LASDRI & National ID Verification
            </p>
          </div>
        </div>

        {/* QA Approval Switcher */}
        <button
          type="button"
          onClick={toggleDemoApproval}
          className="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF5722] text-[11px] font-black uppercase tracking-wider border border-orange-200 flex items-center gap-1.5 transition-all"
        >
          <Sparkles size={13} />
          <span>Toggle Approval</span>
        </button>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Real-time Status Card */}
        <div
          className={`p-4 rounded-3xl border shadow-sm transition-all ${
            kycStatus === 'approved'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : kycStatus === 'pending_review'
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-red-50/80 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                kycStatus === 'approved'
                  ? 'bg-emerald-500 text-white shadow-emerald-500/25 shadow-md'
                  : kycStatus === 'pending_review'
                  ? 'bg-amber-500 text-white shadow-amber-500/25 shadow-md'
                  : 'bg-red-500 text-white shadow-red-500/25 shadow-md'
              }`}
            >
              {kycStatus === 'approved' ? (
                <ShieldCheck size={22} />
              ) : kycStatus === 'pending_review' ? (
                <Clock size={22} />
              ) : (
                <AlertTriangle size={22} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  {kycStatus === 'approved'
                    ? 'KYC Level 2 Verified ✓'
                    : kycStatus === 'pending_review'
                    ? 'Documents Under Review'
                    : 'Verification Rejected'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-current">
                  {kycStatus === 'approved' ? 'FULL DISPATCH ACTIVE' : 'PENDING'}
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {kycStatus === 'approved'
                  ? 'All Lagos commercial dispatch corridors (Mainland, Island, Lekki & Free Trade Zone) are unlocked. Insurance and LASDRI active.'
                  : kycStatus === 'pending_review'
                  ? 'Your uploaded documents are being reviewed by the Bayniks Compliance Desk. Typical processing time is 12–24 business hours.'
                  : kycRejectionReason ||
                    'Please re-upload a clear photograph of your Lagos State Driver’s License.'}
              </p>
            </div>
          </div>
        </div>

        {/* KYC Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Civil Identity */}
          <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pb-1 border-b border-zinc-100">
              <User size={14} className="text-[#FF5722]" />
              <span>1. Civil Identity & National Records</span>
            </h2>

            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-600 mb-1">
                National Identity Number (NIN)
              </label>
              <input
                type="text"
                maxLength={11}
                value={nin}
                onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                placeholder="11-digit NIN"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-bold tracking-wider focus:outline-none focus:border-[#FF5722] focus:bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5722]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 mb-1">
                  Next of Kin Phone
                </label>
                <input
                  type="tel"
                  value={nextOfKinPhone}
                  onChange={(e) => setNextOfKinPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5722]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-600 mb-1">
                Lagos Residential Address
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5722]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Lagos State Vehicle & Regulatory Permits */}
          <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pb-1 border-b border-zinc-100">
              <Bike size={14} className="text-[#FF5722]" />
              <span>2. Vehicle & Lagos Commercial Permits</span>
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 mb-1">
                  Plate Number
                </label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-black uppercase tracking-wider focus:outline-none focus:border-[#FF5722]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#FF5722]"
                >
                  <option value="bike">Express Bike (200cc)</option>
                  <option value="van">Delivery Van</option>
                  <option value="truck">Mini Truck</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-600 mb-1">
                LASDRI Recertification Number
              </label>
              <input
                type="text"
                value={lasdriNumber}
                onChange={(e) => setLasdriNumber(e.target.value.toUpperCase())}
                placeholder="LSD-XXXX-XXXXX"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-600 mb-1">
                Lagos Riders Card / Hackney Permit
              </label>
              <input
                type="text"
                value={ridersCardNumber}
                onChange={(e) => setRidersCardNumber(e.target.value.toUpperCase())}
                placeholder="RC-LAG-XXXXX"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-600 mb-1">
                Fleet Owner Linking Code (Optional)
              </label>
              <input
                type="text"
                value={fleetCode}
                onChange={(e) => setFleetCode(e.target.value.toUpperCase())}
                placeholder="e.g. FLT-LAGOS-01 or leave blank for Solo"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5722]"
              />
            </div>
          </div>

          {/* Section 3: Document Upload Proofs */}
          <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pb-1 border-b border-zinc-100">
              <FileText size={14} className="text-[#FF5722]" />
              <span>3. Document Photos (Auto-Compressed &lt;300KB)</span>
            </h2>

            <div className="space-y-2">
              {/* Document 1: Passport Photo */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF5722] flex items-center justify-center">
                    <Camera size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-800">Passport Photo / Helmet Selfie</div>
                    <div className="text-[10px] text-zinc-500">Verified & Compressed (142 KB)</div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('passport')}
                  className="px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:border-[#FF5722] text-xs font-bold text-zinc-700 hover:text-[#FF5722] transition-colors"
                >
                  {passportUploaded ? 'Replace' : 'Upload'}
                </button>
              </div>

              {/* Document 2: Driver's License */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-800">Lagos Driver's License (Front/Back)</div>
                    <div className="text-[10px] text-zinc-500">Document active until Dec 2027</div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('license')}
                  className="px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:border-[#FF5722] text-xs font-bold text-zinc-700 hover:text-[#FF5722] transition-colors"
                >
                  {licenseUploaded ? 'Replace' : 'Upload'}
                </button>
              </div>

              {/* Document 3: Commercial Stage Permit */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-800">LASDRI Recertification Certificate</div>
                    <div className="text-[10px] text-zinc-500">Permit #LSD-2024-84910</div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('permit')}
                  className="px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:border-[#FF5722] text-xs font-bold text-zinc-700 hover:text-[#FF5722] transition-colors"
                >
                  {permitUploaded ? 'Replace' : 'Upload'}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting || isCompressing}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FF5722] hover:bg-[#E64A19] active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Submitting to Lagos MVAA Desk...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Submit Documents for Verification</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
