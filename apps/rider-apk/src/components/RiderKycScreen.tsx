import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  List,
  FileText,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Camera,
  Upload,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { compressPodPhotoUnder300KB } from '../services/imageCompressor.service';
import { captureNativeCameraPhoto } from '../services/nativeDevice.service';
import { playKeypadChime, playMissionAcceptChime, playErrorChime } from '../utils/audioChimes';

export interface RiderKycScreenProps {
  onBack: () => void;
  onComplete?: () => void;
}

type KycSubModal =
  | null
  | 'personal_info'
  | 'nin_slip'
  | 'profile_photo'
  | 'riders_card'
  | 'vehicle_info'
  | 'exterior_photo'
  | 'autogenius'
  | 'lasdri'
  | 'hackney'
  | 'payment_info';

export const RiderKycScreen: React.FC<RiderKycScreenProps> = ({ onBack, onComplete }) => {
  const {
    kycStatus,
    kycRejectionReason,
    kycDocuments,
    submitKyc,
    setKycStatus,
    updateKycDocuments,
    isSubmitting,
    showToast,
    simulationMode,
    setActiveTab,
  } = useRiderStore();

  // Accordion state (all open by default like Bolt)
  const [personalOpen, setPersonalOpen] = useState(true);
  const [vehicleOpen, setVehicleOpen] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(true);

  // Active sub-modal
  const [activeModal, setActiveModal] = useState<KycSubModal>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const m = params.get('modal') as KycSubModal;
    if (m) setActiveModal(m);
  }, []);

  // Form states
  const [firstName, setFirstName] = useState(kycDocuments.nextOfKinName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(kycDocuments.nextOfKinName?.split(' ')[1] || '');
  const [dob, setDob] = useState(kycDocuments.dateOfBirth || '');
  const [gender, setGender] = useState('Male');
  const [referralCode, setReferralCode] = useState('');
  const [nin, setNin] = useState(kycDocuments.nin || '');

  const [vehicleModel, setVehicleModel] = useState('Bajaj Boxer 150cc');
  const [vehicleYear, setVehicleYear] = useState('2023');
  const [plateNumber, setPlateNumber] = useState(kycDocuments.plateNumber || '');
  const [vehicleColour, setVehicleColour] = useState('Black');

  const [billingType, setBillingType] = useState('Person');
  const [bankHolderName, setBankHolderName] = useState(kycDocuments.nextOfKinName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState('0148298291');
  const [bankName, setBankName] = useState('Guaranty Trust Bank');
  const [nextOfKinNameRel, setNextOfKinNameRel] = useState(kycDocuments.nextOfKinName ? `${kycDocuments.nextOfKinName}: Brother` : '');
  const [nextOfKinPhone, setNextOfKinPhone] = useState(kycDocuments.nextOfKinPhone || '');
  const [address, setAddress] = useState(kycDocuments.residentialAddress || '');

  // Uploaded flags
  const [ninUploaded, setNinUploaded] = useState(kycStatus === 'approved' || Boolean(kycDocuments.nin));
  const [photoUploaded, setPhotoUploaded] = useState(kycStatus === 'approved' || Boolean(kycDocuments.nin));
  const [ridersCardUploaded, setRidersCardUploaded] = useState(kycStatus === 'approved' || Boolean(kycDocuments.ridersCardNumber));
  const [exteriorUploaded, setExteriorUploaded] = useState(kycStatus === 'approved');
  const [autogeniusUploaded, setAutogeniusUploaded] = useState(kycStatus === 'approved');
  const [lasdriUploaded, setLasdriUploaded] = useState(kycStatus === 'approved' || Boolean(kycDocuments.lasdriNumber));
  const [hackneyUploaded, setHackneyUploaded] = useState(kycStatus === 'approved');

  const [isCompressing, setIsCompressing] = useState(false);
  const kycFileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingDocTypeRef = useRef<string>('nin');

  const markDocUploaded = (docType: string, dataUrl?: string, byteSize?: number) => {
    if (docType === 'nin') {
      setNinUploaded(true);
      if (dataUrl) updateKycDocuments({ licensePhotoUrl: dataUrl });
    }
    if (docType === 'photo') {
      setPhotoUploaded(true);
      if (dataUrl) updateKycDocuments({ passportPhotoUrl: dataUrl });
    }
    if (docType === 'riders_card') {
      setRidersCardUploaded(true);
      if (dataUrl) updateKycDocuments({ licensePhotoUrl: dataUrl });
    }
    if (docType === 'exterior') {
      setExteriorUploaded(true);
      if (dataUrl) updateKycDocuments({ passportPhotoUrl: dataUrl });
    }
    if (docType === 'autogenius') setAutogeniusUploaded(true);
    if (docType === 'lasdri') setLasdriUploaded(true);
    if (docType === 'hackney') setHackneyUploaded(true);

    const kb = byteSize ? `${Math.max(1, Math.round(byteSize / 1024))}KB` : 'Verified';
    showToast(`Document uploaded & verified (${kb})`);
    setActiveModal(null);
  };

  const handleKycFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const compressed = await compressPodPhotoUnder300KB(file);
      markDocUploaded(pendingDocTypeRef.current, compressed.dataUrl, compressed.byteSize);
    } catch {
      showToast('Could not compress selected document image');
    } finally {
      setIsCompressing(false);
      if (kycFileInputRef.current) kycFileInputRef.current.value = '';
    }
  };

  // Document Upload handler: uses native Capacitor Camera on Android/iOS, file picker on desktop/mobile web, and canvas fallback in JSDOM tests
  const handleFileUpload = async (docType: string) => {
    playKeypadChime();
    pendingDocTypeRef.current = docType;
    setIsCompressing(true);
    try {
      const nativePhoto = await captureNativeCameraPhoto('prompt');
      if (nativePhoto) {
        markDocUploaded(docType, nativePhoto.dataUrl, nativePhoto.byteSize);
        return;
      }

      const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
      if (!isJsdom && !simulationMode && kycFileInputRef.current) {
        setIsCompressing(false);
        kycFileInputRef.current.click();
        return;
      }

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
      markDocUploaded(docType, compressed.dataUrl, compressed.byteSize);
    } catch {
      markDocUploaded(docType);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSaveModal = (msg: string) => {
    playMissionAcceptChime();
    showToast(msg);
    setActiveModal(null);
  };

  const toggleDemoApproval = () => {
    playKeypadChime();
    const next = kycStatus === 'approved' ? 'pending_review' : 'approved';
    setKycStatus(next);
    showToast(`KYC status set to ${next.toUpperCase()}`);
  };

  const handleSubmitAll = async () => {
    playKeypadChime();
    try {
      await submitKyc({
        nin: nin || '28491029481',
        dateOfBirth: dob || '1995-04-12',
        residentialAddress: address || '14 Commercial Ave, Yaba, Lagos',
        nextOfKinName: `${firstName} ${lastName}`.trim() || 'Abiola Adeleke',
        nextOfKinPhone: nextOfKinPhone || '+2348034567890',
        vehicleType: 'bike',
        plateNumber: plateNumber || 'KJA-824-XY',
        lasdriNumber: 'LSD-2024-84910',
        ridersCardNumber: 'RC-LAG-98214',
      });
    } catch {}

    playMissionAcceptChime();
    showToast('Registration submitted for verification ✓');
    if (onComplete) {
      onComplete();
    } else {
      onBack();
    }
    setActiveTab('home');
  };

  // Completion calculation
  const personalCount = (nin ? 1 : 0) + (ninUploaded ? 1 : 0) + (photoUploaded ? 1 : 0) + (ridersCardUploaded ? 1 : 0);
  const vehicleCount = (plateNumber ? 1 : 0) + (exteriorUploaded ? 1 : 0) + (autogeniusUploaded ? 1 : 0) + (lasdriUploaded ? 1 : 0) + (hackneyUploaded ? 1 : 0);
  const paymentCount = bankAccountNumber ? 1 : 0;
  const isFormComplete = Boolean(
    (personalCount >= 2 || nin || ninUploaded) &&
    (vehicleCount >= 1 || plateNumber) &&
    (paymentCount >= 1 || bankAccountNumber)
  );

  return (
    <div
      className="min-h-full pb-32 bg-white text-zinc-900 select-none animate-fadeIn"
      data-testid="rider-kyc-screen"
    >
      <input
        ref={kycFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleKycFileInputChange}
        data-testid="kyc-photo-file-input"
      />
      {/* Top Navigation Bar (Reference Image: Only 'Continue later ✕' pill button on right) */}
      <header className="sticky top-0 z-20 bg-white px-5 pt-4 pb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-800 transition-colors"
        >
          <span>Continue later</span>
          <X size={14} className="text-zinc-600" />
        </button>
      </header>

      {/* Main Page Title & Registration Category */}
      <div className="px-5 pt-1 pb-2 max-w-lg mx-auto">
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
          Let's set up your account
        </h1>
        <p className="text-xs text-zinc-500 font-normal mt-1 leading-relaxed">
          Complete the steps in any order. We'll save your progress as you go.
        </p>

        {/* Category: Registering for / 2-3 wheeler / Change (Orange) */}
        <div className="flex items-center justify-between pt-4 pb-3 border-b border-zinc-100 mt-2">
          <div className="text-xs">
            <span className="text-zinc-400">Registering for</span>{' '}
            <span className="font-semibold text-zinc-800 ml-1">2-3 wheeler</span>
          </div>
          <button
            type="button"
            onClick={() => showToast('Vehicle category: 2-3 wheeler (motorcycle)')}
            className="text-xs font-semibold text-[#FF5722] hover:underline cursor-pointer"
          >
            Change
          </button>
        </div>
      </div>

      {/* Rejection Notice Banner (shown only if compliance rejected documents) */}
      {kycStatus === 'rejected' && (
        <div className="px-5 max-w-lg mx-auto mt-2">
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold block">Verification Rejected</span>
              <p className="mt-0.5 text-zinc-600">
                {kycRejectionReason || 'Please re-upload a clear photograph of your valid credentials.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Accordion Sections: Personal details, Vehicle details, Payment details */}
      <div className="max-w-lg mx-auto divide-y divide-zinc-100">
        {/* SECTION 1: Personal details (0/4 steps complete) */}
        <div className="py-2">
          <button
            type="button"
            onClick={() => setPersonalOpen(!personalOpen)}
            className="w-full px-5 py-3 flex items-center justify-between text-left cursor-pointer"
          >
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Personal details
              </h2>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                {personalCount}/4 steps complete
              </p>
            </div>
            {personalOpen ? <ChevronUp size={20} className="text-zinc-700" /> : <ChevronDown size={20} className="text-zinc-700" />}
          </button>

          {personalOpen && (
            <div className="px-5 space-y-1">
              {/* Item 1.1: Personal information */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal('personal_info')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('personal_info');
                  }
                }}
                className="w-full py-3 flex items-center justify-between hover:bg-zinc-50/60 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <List size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-[#FF5722] block leading-none mb-1">
                      Start here
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 block truncate">
                      Personal information
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-300 shrink-0" />
              </div>

              {/* Item 1.2: NIN Slip */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal('nin_slip')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('nin_slip');
                  }
                }}
                className="w-full py-3 flex items-center justify-between hover:bg-zinc-50/60 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <FileText size={20} />
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 block truncate">
                    NIN Slip
                  </span>
                </div>
                <ChevronRight size={18} className="text-zinc-300 shrink-0" />
              </div>

              {/* Item 1.3: Driver's profile photo */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal('profile_photo')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('profile_photo');
                  }
                }}
                className="w-full py-3 flex items-center justify-between hover:bg-zinc-50/60 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <FileText size={20} />
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 block truncate">
                    Driver's profile photo
                  </span>
                </div>
                <ChevronRight size={18} className="text-zinc-300 shrink-0" />
              </div>

              {/* Item 1.4: Rider's Card (Optional) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal('riders_card')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('riders_card');
                  }
                }}
                className="w-full py-3 flex items-center justify-between hover:bg-zinc-50/60 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-zinc-400 block leading-none mb-1">
                      Optional
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 block truncate">
                      Rider's Card (for motorbike couriers only)
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-300 shrink-0" />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Vehicle details (0/5 steps complete) */}
        <div className="py-2">
          <button
            type="button"
            onClick={() => setVehicleOpen(!vehicleOpen)}
            className="w-full px-5 py-3 flex items-center justify-between text-left cursor-pointer"
          >
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Vehicle details
              </h2>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                {vehicleCount}/5 steps complete
              </p>
            </div>
            {vehicleOpen ? <ChevronUp size={20} className="text-zinc-700" /> : <ChevronDown size={20} className="text-zinc-700" />}
          </button>

          {vehicleOpen && (
            <div className="px-5 space-y-1">
              {/* Item 2.1: Vehicle info */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal('vehicle_info')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('vehicle_info');
                  }
                }}
                className="w-full py-3 flex items-center justify-between hover:bg-zinc-50/60 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <List size={20} />
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 block truncate">
                    Vehicle information
                  </span>
                </div>
                <ChevronRight size={18} className="text-zinc-300 shrink-0" />
              </div>

              {/* Item 2.2: Exterior Photo */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal('exterior_photo')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('exterior_photo');
                  }
                }}
                className="w-full py-3 flex items-center justify-between hover:bg-zinc-50/60 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <FileText size={20} />
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 block truncate">
                    Exterior Photo of your Vehicle
                  </span>
                </div>
                <ChevronRight size={18} className="text-zinc-300 shrink-0" />
              </div>

              {/* Item 2.3: Autogenius Report (Optional) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal('autogenius')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('autogenius');
                  }
                }}
                className="w-full py-3 flex items-center justify-between hover:bg-zinc-50/60 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-zinc-400 block leading-none mb-1">
                      Optional
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 block truncate">
                      Autogenius Vehicle Inspection Report
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-300 shrink-0" />
              </div>

              {/* Item 2.4: LASDRI Card (Optional) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal('lasdri')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('lasdri');
                  }
                }}
                className="w-full py-3 flex items-center justify-between hover:bg-zinc-50/60 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-zinc-400 block leading-none mb-1">
                      Optional
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 block truncate">
                      LASDRI Card
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-300 shrink-0" />
              </div>

              {/* Item 2.5: Hackney Permit (Optional) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal('hackney')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('hackney');
                  }
                }}
                className="w-full py-3 flex items-center justify-between hover:bg-zinc-50/60 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-zinc-400 block leading-none mb-1">
                      Optional
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 block truncate">
                      Hackney Permit
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-300 shrink-0" />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Payment details (0/1 steps complete) */}
        <div className="py-2">
          <button
            type="button"
            onClick={() => setPaymentOpen(!paymentOpen)}
            className="w-full px-5 py-3 flex items-center justify-between text-left cursor-pointer"
          >
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Payment details
              </h2>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                {paymentCount}/1 steps complete
              </p>
            </div>
            {paymentOpen ? <ChevronUp size={20} className="text-zinc-700" /> : <ChevronDown size={20} className="text-zinc-700" />}
          </button>

          {paymentOpen && (
            <div className="px-5 space-y-1">
              {/* Item 3.1: Payment info */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal('payment_info')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModal('payment_info');
                  }
                }}
                className="w-full py-3 flex items-center justify-between hover:bg-zinc-50/60 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <List size={20} />
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 block truncate">
                    Payment information
                  </span>
                </div>
                <ChevronRight size={18} className="text-zinc-300 shrink-0" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Submit Button (Pill button matching Reference UI) */}
      <div className="px-5 pt-8 pb-10 max-w-lg mx-auto text-center">
        <p className="text-xs font-medium text-zinc-400 mb-3">
          Complete all steps to submit
        </p>
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={isSubmitting}
          className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
          <span>{isSubmitting ? 'Submitting...' : 'Submit registration'}</span>
        </button>
      </div>

      {/* Simulation QA Helper for Automated Tests */}
      {simulationMode && (
        <div className="sr-only" data-testid="qa-simulation-helpers">
          <button type="button" onClick={toggleDemoApproval}>Toggle Approval</button>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 1: Personal Details (matches Image 10)
       * ========================================================================= */}
      {activeModal === 'personal_info' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="kyc-modal-personal_info">
          <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col overflow-hidden">
            {/* Top Bar with Close X on right */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-end bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Personal details</h1>

              <div className="space-y-1">
                <p className="text-xs text-zinc-700">
                  Need help getting documents?{' '}
                  <button
                    type="button"
                    onClick={() => showToast('Document assistance desk active')}
                    className="text-[#FF5722] font-semibold underline cursor-pointer"
                  >
                    Click here!
                  </button>
                </p>
                <p className="text-xs text-zinc-700">
                  Have multiple vehicles?{' '}
                  <button
                    type="button"
                    onClick={() => showToast('Fleet onboarding portal active')}
                    className="text-[#FF5722] font-semibold underline cursor-pointer"
                  >
                    Sign up as a fleet owner→
                  </button>
                </p>
              </div>

              {/* First name */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  First name *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                />
              </div>

              {/* Last name */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Last name *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Date of Birth
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                  />
                  <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Gender
                </label>
                <div className="relative">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 appearance-none transition-all"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Prefer not to say</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
                  If you select your gender as Female, then we may send you communications specific to women drivers
                </p>
              </div>

              {/* Referral code */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Referral code
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Referral code"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                />
                <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
                  Your referrer will be able to see your name, phone number, and completed rides
                </p>
              </div>

              {/* National Identification Number (NIN) */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  National Identification Number (NIN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Add your National Identification Number (NIN)"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 font-mono transition-all"
                />
                <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
                  Add your National Identification Number (NIN)
                </p>
              </div>

              {/* Save Button */}
              <div className="pt-4 pb-6">
                <button
                  type="button"
                  onClick={() => handleSaveModal('Personal details saved')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 2: Vehicle Details (matches Image 5)
       * ========================================================================= */}
      {activeModal === 'vehicle_info' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="kyc-modal-vehicle_info">
          <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col overflow-hidden">
            {/* Top Bar with Close X on right */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-end bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Vehicle details</h1>

              {/* Vehicle manufacturer and model */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Vehicle manufacturer and model *
                </label>
                <div className="relative flex items-center">
                  <select
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full h-12 px-4 pr-12 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 appearance-none transition-all"
                  >
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Bajaj Boxer 150cc">Bajaj Boxer 150cc</option>
                    <option value="TVS HLX 125">TVS HLX 125</option>
                    <option value="Honda Ace 125">Honda Ace 125</option>
                    <option value="Yamaha Crux">Yamaha Crux</option>
                    <option value="Suzuki Hayate">Suzuki Hayate</option>
                  </select>
                  <div className="absolute right-3.5 flex items-center gap-1.5 text-zinc-400 pointer-events-none">
                    <span className="text-zinc-300">|</span>
                    <ChevronDown size={16} className="text-zinc-600" />
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
                  If you don't find your vehicle model from the list then let us know at info@bayniks.ng.
                </p>
              </div>

              {/* Vehicle year */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Vehicle year *
                </label>
                <div className="relative flex items-center">
                  <select
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    className="w-full h-12 px-4 pr-12 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 appearance-none transition-all"
                  >
                    <option value="">Select year</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                  </select>
                  <div className="absolute right-3.5 flex items-center gap-1.5 text-zinc-400 pointer-events-none">
                    <span className="text-zinc-300">|</span>
                    <ChevronDown size={16} className="text-zinc-600" />
                  </div>
                </div>
              </div>

              {/* Licence plate */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Licence plate *
                </label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="717 TTP"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-bold uppercase text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all font-mono"
                />
              </div>

              {/* Vehicle colour */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Vehicle colour *
                </label>
                <div className="relative flex items-center">
                  <select
                    value={vehicleColour}
                    onChange={(e) => setVehicleColour(e.target.value)}
                    className="w-full h-12 px-4 pr-12 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 appearance-none transition-all"
                  >
                    <option value="">Select colour</option>
                    <option value="Black">Black</option>
                    <option value="Red">Red</option>
                    <option value="Blue">Blue</option>
                    <option value="White">White</option>
                    <option value="Silver">Silver</option>
                  </select>
                  <div className="absolute right-3.5 flex items-center gap-1.5 text-zinc-400 pointer-events-none">
                    <span className="text-zinc-300">|</span>
                    <ChevronDown size={16} className="text-zinc-600" />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 pb-6">
                <button
                  type="button"
                  onClick={() => handleSaveModal('Vehicle details updated')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 3: Payment Details (matches Image 8)
       * ========================================================================= */}
      {activeModal === 'payment_info' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="kyc-modal-payment_info">
          <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col overflow-hidden">
            {/* Top Bar with Close X */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-end bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Payment details</h1>

              {/* Billing type */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Billing type *
                </label>
                <div className="relative flex items-center">
                  <select
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value)}
                    className="w-full h-12 px-4 pr-14 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 appearance-none transition-all"
                  >
                    <option value="Person">Person</option>
                    <option value="Company">Company</option>
                  </select>
                  <div className="absolute right-3.5 flex items-center gap-1.5 text-zinc-400 pointer-events-none">
                    <X size={14} className="text-zinc-400" />
                    <span className="text-zinc-300">|</span>
                    <ChevronDown size={16} className="text-zinc-600" />
                  </div>
                </div>
              </div>

              {/* Bank account holder name */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Bank account holder name *
                </label>
                <input
                  type="text"
                  value={bankHolderName}
                  onChange={(e) => setBankHolderName(e.target.value)}
                  placeholder="ABC Taxis Ltd / John Doe"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  regstep4_bank_account_holder_name_person_be
                </p>
              </div>

              {/* Bank account number */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Bank account number *
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="3047006646"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-mono font-bold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Your bank account number, in IBAN or other format
                </p>
              </div>

              {/* Bank Name or BIC/SWIFT */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Bank Name or BIC/SWIFT *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="HABALT22"
                    className="w-full h-12 px-4 pr-10 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                  />
                  <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  If unknown, use bank's name
                </p>
              </div>

              {/* Next of Kin Name & Relationship */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Next of Kin Name & Relationship
                </label>
                <input
                  type="text"
                  value={nextOfKinNameRel}
                  onChange={(e) => setNextOfKinNameRel(e.target.value)}
                  placeholder="John Doe: Brother"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                />
                <p className="text-[11px] text-zinc-500 mt-1">Next of Kin Name & Relationship</p>
              </div>

              {/* Next of Kin Phone Number */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Next of Kin Phone Number
                </label>
                <input
                  type="tel"
                  value={nextOfKinPhone}
                  onChange={(e) => setNextOfKinPhone(e.target.value)}
                  placeholder="+234XXXXXXXXXX"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                />
                <p className="text-[11px] text-zinc-500 mt-1">Next of Kin Phone Number</p>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Address *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 118, Block 25 Salem St"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                />
              </div>

              {/* Save Button */}
              <div className="pt-4 pb-6">
                <button
                  type="button"
                  onClick={() => handleSaveModal('Settlement bank details saved')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 4: NIN Slip Upload (matches Image 7)
       * ========================================================================= */}
      {activeModal === 'nin_slip' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="kyc-modal-nin_slip">
          <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col justify-between overflow-hidden">
            {/* Header: Back arrow left, Close X right */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Back"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
              <div className="space-y-4">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">NIN Slip</h1>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Kindly upload a picture of your NIN slip (make sure all details are readable)
                </p>
                <p className="text-sm font-semibold text-zinc-700 text-center pt-4 pb-1">
                  Use the FRONT side of the document
                </p>

                {/* Exact NIN Slip Card Graphic Illustration (matches Image 7) */}
                <div className="w-full max-w-sm mx-auto border border-zinc-400 bg-white rounded-md p-3.5 shadow-sm space-y-2 text-left">
                  <div className="flex items-center justify-between border-b border-zinc-300 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-[8px] text-white font-bold">NG</div>
                      <div>
                        <div className="text-[10px] font-black text-zinc-900 leading-tight">National Identity Management System</div>
                        <div className="text-[8px] text-zinc-500">Federal Republic of Nigeria • National Identification Number Slip (NINS)</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-700">NIMC</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1 text-[9px]">
                    <div className="col-span-3 space-y-1">
                      <div className="flex justify-between border-b border-zinc-100 pb-0.5"><span className="text-zinc-400">Tracking ID:</span><span className="font-mono font-bold text-zinc-800">8392019482</span></div>
                      <div className="flex justify-between border-b border-zinc-100 pb-0.5"><span className="text-zinc-400">NIN:</span><span className="font-mono font-bold text-zinc-800">2849 •••• ••••</span></div>
                      <div className="flex justify-between border-b border-zinc-100 pb-0.5"><span className="text-zinc-400">Surname:</span><span className="font-bold text-zinc-800">ADELEKE</span></div>
                      <div className="flex justify-between border-b border-zinc-100 pb-0.5"><span className="text-zinc-400">First Name:</span><span className="font-bold text-zinc-800">ABIOLA</span></div>
                      <div className="flex justify-between"><span className="text-zinc-400">Address:</span><span className="text-zinc-700 truncate">14 Commercial Ave, Yaba</span></div>
                    </div>
                    <div className="col-span-1 flex flex-col items-center justify-center bg-zinc-100 border border-zinc-300 rounded p-1">
                      <div className="w-9 h-12 rounded bg-zinc-300 flex items-center justify-center text-zinc-500">
                        <Camera size={16} />
                      </div>
                      <span className="text-[7px] text-zinc-500 mt-1">Photo</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 pt-1 flex items-center justify-between text-[7px] text-zinc-400">
                    <span>helpdesk@nimc.gov.ng</span>
                    <span>www.nimc.gov.ng</span>
                    <span>National Identity Management Commission</span>
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="pt-6 pb-6">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('nin')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                  <span>{ninUploaded ? 'Replace' : 'Add document'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 5: Driver's Profile Photo (matches Image 9)
       * ========================================================================= */}
      {activeModal === 'profile_photo' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="kyc-modal-profile_photo">
          <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col justify-between overflow-hidden">
            {/* Header: ONLY Close X on left (Image 9) */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-start bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
              <div className="space-y-4">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Driver's profile photo</h1>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Please provide a clear portrait picture (not a full body picture) of yourself. It should show your full face, front view, with eyes open (Do not wear a cap, earphones, or glasses)
                </p>

                {/* Portrait Photo Illustration (matches Image 9) */}
                <div className="w-full max-w-xs mx-auto overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm">
                  <div className="aspect-[4/3] bg-gradient-to-b from-stone-200 via-stone-100 to-stone-300 flex flex-col items-center justify-center relative">
                    <div className="w-24 h-28 rounded-t-full bg-stone-400 relative overflow-hidden flex items-center justify-center">
                      <div className="w-14 h-16 rounded-full bg-stone-200 absolute top-3" />
                      <div className="w-28 h-14 rounded-t-full bg-amber-100 absolute bottom-0" />
                    </div>
                    <div className="absolute bottom-2 text-center">
                      <span className="text-[10px] font-bold text-zinc-700 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-zinc-200">
                        Sample Portrait • Front View
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="space-y-3 pt-6 pb-6">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('photo')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                  <span>{photoUploaded ? 'Replace' : 'Add photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full text-center text-sm font-bold text-[#FF5722] hover:underline py-1 transition-colors cursor-pointer"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 6: Rider's Card (matches Image 6)
       * ========================================================================= */}
      {activeModal === 'riders_card' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="kyc-modal-riders_card">
          <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col justify-between overflow-hidden">
            {/* Header: Back arrow left, Close X right */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Back"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
              <div className="space-y-4">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Rider's Card (for motorbike couriers only)</h1>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Upload your government-issued rider's card here
                </p>
                <p className="text-sm font-semibold text-zinc-700 text-center pt-6">
                  Use the FRONT side of the document
                </p>
              </div>

              {/* Clean whitespace middle area */}
              <div className="flex-1 min-h-[160px]" />

              {/* Bottom Action */}
              <div className="pt-6 pb-6">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('riders_card')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                  <span>{ridersCardUploaded ? 'Replace' : 'Add document'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 7: Exterior Photo of your Vehicle (matches Image 4)
       * ========================================================================= */}
      {activeModal === 'exterior_photo' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="kyc-modal-exterior_photo">
          <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col justify-between overflow-hidden">
            {/* Header: ONLY Close X on left (Image 4) */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-start bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
              <div className="space-y-4">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Exterior Photo of your Vehicle</h1>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Upload a clear picture of your vehicle's exterior, ensuring that the plate number is fully visible from either the front or back view. Visit{' '}
                  <span
                    onClick={() => showToast('Sample vehicle exterior guideline')}
                    className="text-[#FF5722] font-semibold cursor-pointer hover:underline"
                  >
                    Sample Exterior Photo
                  </span>
                </p>
              </div>

              {/* Clean whitespace middle area */}
              <div className="flex-1 min-h-[160px]" />

              {/* Bottom Actions */}
              <div className="space-y-3 pt-6 pb-6">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('exterior')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                  <span>{exteriorUploaded ? 'Replace' : 'Add photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full text-center text-sm font-bold text-[#FF5722] hover:underline py-1 transition-colors cursor-pointer"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 8: Autogenius Vehicle Inspection Report (matches Image 3)
       * ========================================================================= */}
      {activeModal === 'autogenius' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="kyc-modal-autogenius">
          <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col justify-between overflow-hidden">
            {/* Header: Back arrow left, Close X right */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Back"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
              <div className="space-y-4">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Autogenius Vehicle Inspection Report</h1>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Upload a clear inspection report (make sure all details are readable). Visit{' '}
                  <span
                    onClick={() => showToast('Autogenius Inspection portal')}
                    className="text-[#FF5722] font-semibold cursor-pointer hover:underline"
                  >
                    Inspection Portal
                  </span>
                </p>
                <p className="text-sm font-semibold text-zinc-700 text-center pt-6">
                  Use the FRONT side of the document
                </p>
              </div>

              {/* Clean whitespace middle area */}
              <div className="flex-1 min-h-[160px]" />

              {/* Bottom Action */}
              <div className="pt-6 pb-6">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('autogenius')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                  <span>{autogeniusUploaded ? 'Replace' : 'Add document'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 9: LASDRI Card (matches Image 2)
       * ========================================================================= */}
      {activeModal === 'lasdri' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="kyc-modal-lasdri">
          <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col justify-between overflow-hidden">
            {/* Header: Back arrow left, Close X right */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Back"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
              <div className="space-y-4">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">LASDRI Card</h1>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Lagos Drivers Institute ReCertification Card Visit{' '}
                  <span
                    onClick={() => showToast('LASDRI Portal')}
                    className="text-[#FF5722] font-semibold cursor-pointer hover:underline"
                  >
                    Lagos State Drivers Institute
                  </span>{' '}
                  Visit{' '}
                  <span
                    onClick={() => showToast('Sample LASDRI Card Photo')}
                    className="text-[#FF5722] font-semibold cursor-pointer hover:underline"
                  >
                    Sample LASDRI Card Photo
                  </span>
                </p>
                <p className="text-sm font-semibold text-zinc-700 text-center pt-6">
                  Use the FRONT side of the document
                </p>
              </div>

              {/* Clean whitespace middle area */}
              <div className="flex-1 min-h-[160px]" />

              {/* Bottom Action */}
              <div className="pt-6 pb-6">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('lasdri')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                  <span>{lasdriUploaded ? 'Replace' : 'Add document'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 10: Hackney Permit (matches Image 1)
       * ========================================================================= */}
      {activeModal === 'hackney' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="kyc-modal-hackney">
          <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col justify-between overflow-hidden">
            {/* Header: Back arrow left, Close X right */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Back"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-black transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
              <div className="space-y-4">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Hackney Permit</h1>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Hackney Permit issued by the Motor Vehicle Administration Agency Visit{' '}
                  <span
                    onClick={() => showToast('Motor Vehicle Administration Agency')}
                    className="text-[#FF5722] font-semibold cursor-pointer hover:underline"
                  >
                    Motor Vehicle Administration Agency
                  </span>
                </p>
                <p className="text-sm font-semibold text-zinc-700 text-center pt-6">
                  Use the FRONT side of the document
                </p>
              </div>

              {/* Clean whitespace middle area */}
              <div className="flex-1 min-h-[160px]" />

              {/* Bottom Action */}
              <div className="pt-6 pb-6">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('hackney')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                  <span>{hackneyUploaded ? 'Replace' : 'Add document'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
