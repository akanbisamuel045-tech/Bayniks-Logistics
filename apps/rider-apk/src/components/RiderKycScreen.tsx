import React, { useState } from 'react';
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
import { playKeypadChime, playMissionAcceptChime, playErrorChime } from '../utils/audioChimes';

export interface RiderKycScreenProps {
  onBack: () => void;
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

export const RiderKycScreen: React.FC<RiderKycScreenProps> = ({ onBack }) => {
  const {
    kycStatus,
    kycRejectionReason,
    kycDocuments,
    submitKyc,
    setKycStatus,
    isSubmitting,
    showToast,
    simulationMode,
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

  // Document Upload simulator/handler
  const handleFileUpload = async (docType: string) => {
    playKeypadChime();
    setIsCompressing(true);
    try {
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

      if (docType === 'nin') setNinUploaded(true);
      if (docType === 'photo') setPhotoUploaded(true);
      if (docType === 'riders_card') setRidersCardUploaded(true);
      if (docType === 'exterior') setExteriorUploaded(true);
      if (docType === 'autogenius') setAutogeniusUploaded(true);
      if (docType === 'lasdri') setLasdriUploaded(true);
      if (docType === 'hackney') setHackneyUploaded(true);

      showToast(`Document uploaded & verified (${(compressed.byteSize / 1024).toFixed(0)}KB)`);
      setActiveModal(null);
    } catch {
      showToast('Document uploaded successfully ✓');
      setActiveModal(null);
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
    const res = await submitKyc({
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

    if (res.success) {
      playMissionAcceptChime();
      showToast('Registration submitted for verification ✓');
    }
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
          disabled={isSubmitting || !isFormComplete}
          className={`w-full h-14 rounded-full font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all ${
            isFormComplete
              ? 'bg-[#18181B] hover:bg-black text-white shadow-lg shadow-black/20 active:scale-[0.98]'
              : 'bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed'
          }`}
        >
          {isFormComplete && (
            <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
          )}
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
       * SUB-MODAL 1: Personal Details (Image 10)
       * ========================================================================= */}
      {activeModal === 'personal_info' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-zinc-900">Personal details</h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="space-y-1">
                <a
                  href="#support"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast('Document assistance desk active');
                  }}
                  className="text-xs font-bold text-[#FF5722] block hover:underline"
                >
                  Need help getting documents? Click here!
                </a>
                <a
                  href="#fleet"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast('Fleet onboarding portal active');
                  }}
                  className="text-xs font-bold text-[#FF5722] block hover:underline"
                >
                  Have multiple vehicles? Sign up as a fleet owner →
                </a>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">First name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-4 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Last name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-4 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Prefer not to say</option>
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">
                  If you select your gender as Female, then we may send you communications specific to women drivers
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Referral code</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Optional referral code"
                  className="w-full px-4 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Your referrer will be able to see your name, phone number, and completed rides
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">National Identification Number (NIN) *</label>
                <input
                  type="text"
                  maxLength={11}
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Add your National Identification Number (NIN)"
                  className="w-full px-4 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white font-mono"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Add your National Identification Number (NIN)
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSaveModal('Personal details saved')}
                className="w-full h-13 py-3.5 px-4 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2 mt-4 cursor-pointer group"
              >
                <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 2: Vehicle Details (Image 6)
       * ========================================================================= */}
      {activeModal === 'vehicle_info' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl max-h-[95vh] h-full sm:h-auto flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            {/* Top Bar with Close X on top right */}
            <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-end bg-white">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Vehicle details</h2>

              {/* Vehicle manufacturer and model */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Vehicle manufacturer and model <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 appearance-none transition-all"
                  >
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Bajaj Boxer 150cc">Bajaj Boxer 150cc</option>
                    <option value="TVS HLX 125">TVS HLX 125</option>
                    <option value="Honda Ace 125">Honda Ace 125</option>
                    <option value="Yamaha Crux">Yamaha Crux</option>
                    <option value="Suzuki Hayate">Suzuki Hayate</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  If you don't find your vehicle model from the list then let us know at support@bayniks.com.
                </p>
              </div>

              {/* Vehicle year */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Vehicle year <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 appearance-none transition-all"
                  >
                    <option value="">Select year</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              {/* Licence plate */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Licence plate <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="717 TTP"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-bold uppercase text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                />
              </div>

              {/* Vehicle colour */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Vehicle colour <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={vehicleColour}
                    onChange={(e) => setVehicleColour(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 appearance-none transition-all"
                  >
                    <option value="">Select colour</option>
                    <option value="Black">Black</option>
                    <option value="Red">Red</option>
                    <option value="Blue">Blue</option>
                    <option value="White">White</option>
                    <option value="Silver">Silver</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div className="pt-4 pb-2">
                <button
                  type="button"
                  onClick={() => handleSaveModal('Vehicle details updated')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2 cursor-pointer group transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 3: Payment Details (Image 4)
       * ========================================================================= */}
      {activeModal === 'payment_info' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl max-h-[95vh] h-full sm:h-auto flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            {/* Top Bar with Close X */}
            <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-end bg-white">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Payment details</h2>

              {/* Billing type */}
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-1.5">
                  Billing type <span className="text-red-500">*</span>
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
                  Bank account holder name <span className="text-red-500">*</span>
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
                  Bank account number <span className="text-red-500">*</span>
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
                  Bank Name or BIC/SWIFT <span className="text-red-500">*</span>
                </label>
                <div className="relative">
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
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 118, Block 25 Salem St"
                  className="w-full h-12 px-4 bg-[#F4F4F6] border border-transparent rounded-xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all"
                />
              </div>

              <div className="pt-4 pb-2">
                <button
                  type="button"
                  onClick={() => handleSaveModal('Settlement bank details saved')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2 cursor-pointer group transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 4: NIN Slip Upload (Image 9)
       * ========================================================================= */}
      {activeModal === 'nin_slip' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 text-center space-y-4 overflow-y-auto">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight text-left">
                NIN Slip
              </h2>
              <p className="text-xs text-zinc-600 text-left leading-relaxed">
                Kindly upload a picture of your NIN slip (make sure all details are readable)
              </p>
              <p className="text-xs font-bold text-zinc-700 text-center py-1">
                Use the FRONT side of the document
              </p>

              {/* Graphic Illustration of NIN Slip (from Image 9) */}
              <div className="border border-zinc-300 rounded-2xl p-4 bg-zinc-50 shadow-inner max-w-xs mx-auto">
                <div className="border border-zinc-300 bg-white rounded-lg p-2.5 space-y-2 text-left">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-1">
                    <span className="text-[9px] font-black tracking-tight text-zinc-800">
                      National Identity Management System
                    </span>
                    <span className="text-[8px] font-bold text-emerald-700">NIMC</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <div className="h-2 bg-zinc-200 rounded w-16"></div>
                      <div className="h-2 bg-zinc-200 rounded w-24"></div>
                      <div className="h-2 bg-zinc-200 rounded w-20"></div>
                      <div className="h-2 bg-zinc-300 rounded w-28 mt-2"></div>
                    </div>
                    <div className="w-12 h-14 bg-zinc-200 rounded flex items-center justify-center text-zinc-400">
                      <Camera size={14} />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isCompressing}
                onClick={() => handleFileUpload('nin')}
                className="w-full h-13 py-3.5 px-4 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2 mt-6 cursor-pointer group"
              >
                <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                <span>{ninUploaded ? 'Replace' : 'Add document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 5: Driver's Profile Photo (Image 8)
       * ========================================================================= */}
      {activeModal === 'profile_photo' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 text-center space-y-4 overflow-y-auto">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight text-left">
                Driver's profile photo
              </h2>
              <p className="text-xs text-zinc-600 text-left leading-relaxed">
                Please provide a clear portrait picture (not a full body picture) of yourself. It should show your full face, front view, with eyes open (Do not wear a cap, earphones, or glasses)
              </p>

              {/* Graphic Illustration of portrait guidelines (Image 8) */}
              <div className="relative w-48 h-48 mx-auto rounded-3xl bg-amber-50 border-2 border-dashed border-amber-300 flex flex-col items-center justify-center p-4">
                <Camera size={40} className="text-[#FF5722] mb-2" />
                <span className="text-xs font-bold text-zinc-700">Clear Portrait Guide</span>
                <span className="text-[10px] text-zinc-400 text-center mt-1">
                  Eyes open • No sunglasses • Front facing
                </span>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('photo')}
                  className="w-full h-13 py-3.5 px-4 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                  <span>{photoUploaded ? 'Replace' : 'Add photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full text-center text-xs font-bold text-zinc-800 hover:text-[#FF5722] py-2 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 6: Rider's Card (Image 7)
       * ========================================================================= */}
      {activeModal === 'riders_card' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 text-center space-y-4 overflow-y-auto">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight text-left">
                Rider's Card (for motorbike couriers only)
              </h2>
              <p className="text-xs text-zinc-600 text-left leading-relaxed">
                Upload your government-issued rider's card here
              </p>
              <p className="text-xs font-bold text-zinc-700 text-center py-1">
                Use the FRONT side of the document
              </p>

              <div className="border border-zinc-200 rounded-2xl p-6 bg-zinc-50 max-w-xs mx-auto flex flex-col items-center justify-center">
                <FileText size={36} className="text-[#FF5722] mb-2" />
                <span className="text-xs font-bold text-zinc-700">Lagos State Riders Card</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Commercial Dispatch Permit</span>
              </div>

              <button
                type="button"
                disabled={isCompressing}
                onClick={() => handleFileUpload('riders_card')}
                className="w-full h-13 py-3.5 px-4 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2 mt-6 cursor-pointer group"
              >
                <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                <span>{ridersCardUploaded ? 'Replace' : 'Add document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 7: Exterior Photo of your Vehicle (Image 5)
       * ========================================================================= */}
      {activeModal === 'exterior_photo' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl max-h-[95vh] h-full sm:h-auto flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            {/* Header: Back arrow left, Close X right */}
            <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between bg-white">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Back"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Exterior Photo of your Vehicle
                </h2>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Upload a clear picture of your vehicle's exterior, ensuring that the plate number is fully visible from either the front or back view. Visit{' '}
                  <span className="text-[#FF5722] font-semibold cursor-pointer hover:underline">
                    Sample Exterior Photo
                  </span>
                </p>
              </div>

              {/* Clean whitespace middle area */}
              <div className="flex-1 min-h-[160px]" />

              {/* Bottom Actions */}
              <div className="space-y-3 pt-4 pb-2">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('exterior')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2 cursor-pointer group transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                  <span>{exteriorUploaded ? 'Replace' : 'Add photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full text-center text-xs font-bold text-zinc-700 hover:text-[#FF5722] py-2 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 8: Autogenius Inspection (Image 3)
       * ========================================================================= */}
      {activeModal === 'autogenius' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl max-h-[95vh] h-full sm:h-auto flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            {/* Header: Back arrow left, Close X right */}
            <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between bg-white">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Back"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Autogenius Vehicle Inspection Report
                </h2>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Upload a clear inspection report (make sure all details are readable). Visit{' '}
                  <span className="text-[#FF5722] font-semibold cursor-pointer hover:underline">
                    Inspection Portal
                  </span>
                </p>
                <p className="text-xs font-semibold text-zinc-700 text-center pt-3">
                  Use the FRONT side of the document
                </p>
              </div>

              {/* Clean whitespace middle area */}
              <div className="flex-1 min-h-[160px]" />

              {/* Bottom Action */}
              <div className="pt-4 pb-2">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('autogenius')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2 cursor-pointer group transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                  <span>{autogeniusUploaded ? 'Replace' : 'Add document'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 9: LASDRI Card (Image 2)
       * ========================================================================= */}
      {activeModal === 'lasdri' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl max-h-[95vh] h-full sm:h-auto flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            {/* Header: Back arrow left, Close X right */}
            <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between bg-white">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Back"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                  LASDRI Card
                </h2>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Lagos Drivers Institute ReCertification Card Visit{' '}
                  <span className="text-[#FF5722] font-semibold cursor-pointer hover:underline">
                    Lagos State Drivers Institute
                  </span>{' '}
                  Visit{' '}
                  <span className="text-[#FF5722] font-semibold cursor-pointer hover:underline">
                    Sample LASDRI Card Photo
                  </span>
                </p>
                <p className="text-xs font-semibold text-zinc-700 text-center pt-3">
                  Use the FRONT side of the document
                </p>
              </div>

              {/* Clean whitespace middle area */}
              <div className="flex-1 min-h-[160px]" />

              {/* Bottom Action */}
              <div className="pt-4 pb-2">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('lasdri')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2 cursor-pointer group transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                  <span>{lasdriUploaded ? 'Replace' : 'Add document'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 10: Hackney Permit (Image 1)
       * ========================================================================= */}
      {activeModal === 'hackney' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl max-h-[95vh] h-full sm:h-auto flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            {/* Header: Back arrow left, Close X right */}
            <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between bg-white">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Back"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Hackney Permit
                </h2>
                <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                  Hackney Permit issued by the Motor Vehicle Administration Agency Visit{' '}
                  <span className="text-[#FF5722] font-semibold cursor-pointer hover:underline">
                    Motor Vehicle Administration Agency
                  </span>
                </p>
                <p className="text-xs font-semibold text-zinc-700 text-center pt-3">
                  Use the FRONT side of the document
                </p>
              </div>

              {/* Clean whitespace middle area */}
              <div className="flex-1 min-h-[160px]" />

              {/* Bottom Action */}
              <div className="pt-4 pb-2">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => handleFileUpload('hackney')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2 cursor-pointer group transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
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
