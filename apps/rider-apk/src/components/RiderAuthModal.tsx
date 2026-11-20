import React, { useState } from 'react';
import {
  X,
  User,
  Lock,
  Mail,
  Bike,
  Truck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Globe,
  Phone,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime, playMissionAcceptChime, playErrorChime } from '../utils/audioChimes';

export interface RiderAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'welcome' | 'login_options' | 'login' | 'register' | 'otp';
}

export const RiderAuthModal: React.FC<RiderAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const {
    loginRider,
    registerRider,
    verifyRiderOtp,
    isSubmitting,
    showToast,
    simulationMode,
  } = useRiderStore();

  const [mode, setMode] = useState<'welcome' | 'login_options' | 'login' | 'register' | 'otp'>('login');

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleType, setVehicleType] = useState<'bike' | 'van' | 'truck'>('bike');
  const [plateNumber, setPlateNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(22);

  if (!isOpen) return null;

  const handleTabChange = (newMode: 'login' | 'register') => {
    playKeypadChime();
    setMode(newMode);
    setErrorMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!phone || phone.length < 10) {
      setErrorMsg('Please enter a valid 10 or 11-digit Nigerian phone number');
      playErrorChime();
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your rider password');
      playErrorChime();
      return;
    }

    const res = await loginRider(phone, password);
    if (res.success) {
      playMissionAcceptChime();
      onClose();
    } else {
      playErrorChime();
      setErrorMsg(res.error || 'Failed to sign in. Please verify your phone and password.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fullName.trim()) {
      setErrorMsg('Full name as stated on driver license / NIN is required');
      playErrorChime();
      return;
    }
    if (!phone || phone.length < 10) {
      setErrorMsg('Please enter a valid Nigerian phone number');
      playErrorChime();
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      playErrorChime();
      return;
    }
    if (!plateNumber.trim()) {
      setErrorMsg('Vehicle plate number is required');
      playErrorChime();
      return;
    }

    const res = await registerRider({
      fullName,
      phone,
      password,
      vehicleType,
      plateNumber,
      email: email || undefined,
    });

    if (res.success) {
      playKeypadChime();
      setMode('otp');
      setResendSeconds(22);
    } else {
      playErrorChime();
      setErrorMsg(res.error || 'Registration failed. Plate or phone may already exist.');
    }
  };

  const handleResendOtp = async () => {
    playKeypadChime();
    setResendSeconds(22);
    setErrorMsg(null);
    const normalizedPhone = phone.startsWith('+234') ? phone : `+234${phone.replace(/^0/, '')}`;
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    useRiderStore.getState().setActiveOtpCode(generatedOtp);

    const termiiApiKey = (import.meta as any).env?.VITE_TERMII_API_KEY || '';
    if (termiiApiKey) {
      const termiiTo = normalizedPhone.replace(/^\+/, '');
      const senderId = (import.meta as any).env?.VITE_TERMII_SENDER_ID || 'BAYNIKS';
      const baseUrl = (import.meta as any).env?.VITE_TERMII_BASE_URL || 'https://api.ng.termii.com';

      try {
        const res = await fetch(`${baseUrl}/api/sms/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: termiiTo,
            from: senderId,
            sms: `Your Bayniks verification code is: ${generatedOtp}. Valid for 5 minutes. Do not share.`,
            type: 'plain',
            channel: 'dnd',
            api_key: termiiApiKey,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(`Termii Error: ${data.message || 'SMS dispatch failed'}`);
        } else {
          showToast(`Verification SMS resent to ${normalizedPhone}`);
        }
      } catch (err: any) {
        setErrorMsg(`SMS Dispatch network error: ${err.message || 'Network error'}`);
      }
    } else {
      showToast(`Verification code resent via SMS to ${normalizedPhone}`);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    playKeypadChime();
    const digits = text.split('');
    const nextDigits = ['', '', '', '', '', ''];
    digits.forEach((d, i) => {
      if (i < 6) nextDigits[i] = d;
    });
    setOtpDigits(nextDigits);
    const lastFilled = Math.min(digits.length, 5);
    document.getElementById(`rider-otp-slot-${lastFilled}`)?.focus();
  };

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean && val !== '') return;
    playKeypadChime();

    if (clean.length > 1) {
      const digits = clean.slice(0, 6).split('');
      const nextDigits = [...otpDigits];
      digits.forEach((d, i) => {
        if (index + i < 6) nextDigits[index + i] = d;
      });
      setOtpDigits(nextDigits);
      const targetFocus = Math.min(index + digits.length, 5);
      document.getElementById(`rider-otp-slot-${targetFocus}`)?.focus();
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = clean.slice(-1);
    setOtpDigits(nextDigits);

    if (clean && index < 5) {
      const nextInput = document.getElementById(`rider-otp-slot-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`rider-otp-slot-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter all 6 digits of the OTP SMS');
      playErrorChime();
      return;
    }
    setErrorMsg(null);
    const res = await verifyRiderOtp(phone, code);
    if (res.success) {
      playMissionAcceptChime();
      onClose();
    } else {
      playErrorChime();
      setErrorMsg(res.error || 'Invalid OTP code. Please try again.');
    }
  };

  const handleOneTapDemoLogin = async () => {
    playMissionAcceptChime();
    await loginRider('08034218900', 'RiderPass123!');
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-3 bg-black/60 backdrop-blur-sm animate-fadeIn"
      data-testid="rider-auth-modal"
    >
      <div className="relative w-full sm:max-w-[420px] bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 max-h-[95vh] flex flex-col">
        {/* Top Header Row */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-zinc-100 bg-white">
          <div className="flex items-center gap-2">
            {mode === 'otp' && (
              <button
                type="button"
                onClick={() => setMode('register')}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 transition-colors mr-1"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="flex items-center gap-1">
              <span className="text-xl font-black text-zinc-900 tracking-tight">Bayniks</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722] mt-0.5 inline-block"></span>
              <span className="text-xl font-black text-zinc-900 tracking-tight ml-0.5">Driver</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'otp' && (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold">
                <Globe size={13} className="text-zinc-500" />
                <span>English</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Switcher (Bolt-style segmented pills for Login vs Register) */}
        {mode !== 'otp' && (
          <div className="flex bg-zinc-100 p-1 mx-5 mt-4 rounded-full">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all ${
                mode === 'login'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all ${
                mode === 'register'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto max-h-[78vh]">
          {/* MODE: SIGN IN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  Rider Cockpit Sign-In
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Deliver with Bayniks. Earn extra money on your schedule.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Nigerian Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500 flex items-center gap-1.5">
                    <span>🇳🇬</span> +234
                  </span>
                  <input
                    type="tel"
                    value={phone.replace(/^\+234/, '').replace(/^0/, '')}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={simulationMode ? '803 123 4567' : '800 000 0000'}
                    className="w-full pl-24 pr-4 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-900 focus:outline-none focus:border-[#FF5722] focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-zinc-700">Password</label>
                  <button
                    type="button"
                    onClick={() => showToast('Password reset link sent to registered email')}
                    className="text-xs font-bold text-[#FF5722] hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-11 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-900 focus:outline-none focus:border-[#FF5722] focus:bg-white transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Main Submit: Bolt Green transformed to Bayniks Orange Pill */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-13 py-3.5 px-4 rounded-full bg-[#FF5722] hover:bg-[#E64A19] active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all mt-2"
              >
                {isSubmitting ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Cockpit</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Alternate Social Sign-ins (Bolt image 13 styling) */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => showToast('Google sign-in initialized')}
                  className="w-full h-12 px-4 rounded-full bg-white border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] text-zinc-800 font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => showToast('Email verification route active')}
                  className="w-full h-12 px-4 rounded-full bg-white border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] text-zinc-800 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Mail size={15} className="text-zinc-500" />
                  <span>Continue with email/username</span>
                </button>
              </div>

              {/* Instant One-Tap Demo Sign-In (Simulation only) */}
              {simulationMode && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOneTapDemoLogin}
                    className="w-full py-2.5 px-4 rounded-full bg-zinc-100 hover:bg-zinc-200 active:scale-[0.98] text-zinc-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-200 transition-all"
                  >
                    <Sparkles size={14} className="text-[#FF5722]" />
                    <span>One-Tap Demo Rider Sign-In</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* MODE: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  Join Bayniks Courier Fleet
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Register in 2 minutes. Deliver parcels across Lagos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={simulationMode ? 'e.g. Babajide Adeleke' : 'Enter your full legal name'}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4F4F5] border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                    🇳🇬 +234
                  </span>
                  <input
                    type="tel"
                    value={phone.replace(/^\+234/, '').replace(/^0/, '')}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={simulationMode ? '803 123 4567' : '800 000 0000'}
                    className="w-full pl-20 pr-4 py-2.5 bg-[#F4F4F5] border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rider@bayniks.ng"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4F4F5] border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                  />
                </div>
              </div>

              {/* Vehicle Type Choice */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Dispatch Vehicle Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bike' as const, label: 'Motorcycle', icon: Bike },
                    { id: 'van' as const, label: 'Van', icon: Truck },
                    { id: 'truck' as const, label: 'Mini Truck', icon: Truck },
                  ].map((v) => {
                    const Icon = v.icon;
                    const selected = vehicleType === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          playKeypadChime();
                          setVehicleType(v.id);
                        }}
                        className={`py-2 px-2 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all ${
                          selected
                            ? 'border-[#FF5722] bg-orange-50 text-[#FF5722] font-black'
                            : 'border-zinc-200 bg-[#F4F4F5] text-zinc-600 font-medium'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-[11px]">{v.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Plate Number
                </label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder={simulationMode ? 'e.g. KJA-824-XY' : 'e.g. LAG-123-AA'}
                  className="w-full px-4 py-2.5 bg-[#F4F4F5] border border-zinc-200 rounded-2xl text-sm font-bold uppercase focus:outline-none focus:border-[#FF5722] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4F4F5] border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                    required
                  />
                </div>
              </div>

              {/* Main Submit: Bolt Green transformed to Bayniks Orange Pill */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-13 py-3.5 px-4 rounded-full bg-[#FF5722] hover:bg-[#E64A19] active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all mt-3"
              >
                <span>Continue to OTP Verification</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* MODE: OTP VERIFICATION (Bolt Image 12 layout) */}
          {mode === 'otp' && (
            <div className="space-y-4 py-2">
              <div className="text-center pt-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#FF5722] block mb-1">
                  Verify Phone Number
                </span>
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Enter code
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Your verification code has been resent to
                </p>
                <div className="font-mono text-sm font-black text-zinc-900 mt-0.5">
                  {phone.startsWith('+234') ? phone : `+234${phone.replace(/^0/, '')}`}
                </div>
              </div>

              {/* 6 Digit Slot Boxes (Clean minimalist Bolt style) */}
              <div className="flex justify-center gap-2 py-3">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`rider-otp-slot-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onPaste={handleOtpPaste}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-14 text-center text-xl font-black bg-[#F4F4F5] border-2 border-zinc-200 rounded-2xl focus:outline-none focus:border-[#FF5722] focus:bg-white transition-all shadow-inner"
                  />
                ))}
              </div>

              {/* Resend Code in [xx] Timer */}
              <div className="text-center text-xs text-zinc-500">
                {resendSeconds > 0 ? (
                  <span>
                    Resend code in <strong className="text-zinc-800">{resendSeconds}</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-bold text-[#FF5722] hover:underline"
                  >
                    Resend code now
                  </button>
                )}
              </div>

              {/* Verify Button (Green transformed to Orange Pill) */}
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isSubmitting || otpDigits.join('').length < 6}
                className="w-full h-13 py-3.5 px-4 rounded-full bg-[#FF5722] hover:bg-[#E64A19] active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all mt-4"
              >
                <CheckCircle2 size={16} />
                <span>Verify & Complete Registration</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('register')}
                className="w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-900 pt-1"
              >
                ← Back to registration form
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
