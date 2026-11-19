import React, { useState } from 'react';
import {
  X,
  Phone,
  Lock,
  User,
  Mail,
  Bike,
  Truck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime, playMissionAcceptChime, playErrorChime } from '../utils/audioChimes';

export interface RiderAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
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
    activeOtpCode,
    isSubmitting,
    showToast,
  } = useRiderStore();

  const [mode, setMode] = useState<'login' | 'register' | 'otp'>(initialMode);

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
  const [resendSeconds, setResendSeconds] = useState(30);

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
      setResendSeconds(30);
    } else {
      playErrorChime();
      setErrorMsg(res.error || 'Registration failed. Plate or phone may already exist.');
    }
  };

  const handleResendOtp = async () => {
    playKeypadChime();
    setResendSeconds(30);
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

    // If mobile auto-filled all 6 digits into this input
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

    // Auto-advance
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
      className="absolute inset-0 z-[100] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn"
      data-testid="rider-auth-modal"
    >
      <div className="relative w-full max-w-[390px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#1E1C1A] to-[#2B2724] px-6 pt-6 pb-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇳🇬</span>
              <span className="text-xs font-black tracking-widest uppercase bg-[#FF5722] text-white px-2.5 py-1 rounded-full">
                BAYNIKS DISPATCH
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Close Auth Modal"
            >
              <X size={18} />
            </button>
          </div>
          <h2 className="text-xl font-black tracking-tight">
            {mode === 'login'
              ? 'Rider Cockpit Sign-In'
              : mode === 'register'
              ? 'Join Bayniks Courier Fleet'
              : 'Verify Phone Number'}
          </h2>
          <p className="text-xs text-zinc-300 mt-1">
            {mode === 'login'
              ? 'Log in to start your shift and receive instant Lagos dispatch offers.'
              : mode === 'register'
              ? 'Sign up in 2 minutes. Express motorcycle, van & truck couriers welcome.'
              : `Enter the 6-digit SMS code sent to ${phone}`}
          </p>
        </div>

        {/* Tab Switcher (only for login & register) */}
        {mode !== 'otp' && (
          <div className="flex border-b border-zinc-100 bg-zinc-50 p-1.5 mx-4 mt-4 rounded-2xl">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#FF5722] shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                mode === 'register'
                  ? 'bg-white text-[#FF5722] shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
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
                    placeholder="803 123 4567"
                    className="w-full pl-24 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-11 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white transition-colors"
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

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-600">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-[#FF5722] focus:ring-[#FF5722]"
                  />
                  <span>Keep me logged in on this bike</span>
                </label>
                <button
                  type="button"
                  onClick={() => showToast('Password reset link sent to registered email')}
                  className="font-bold text-[#FF5722] hover:underline"
                >
                  Forgot?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FF5722] hover:bg-[#E64A19] active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Cockpit</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Instant One-Tap Demo Sign-In */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOneTapDemoLogin}
                  className="w-full py-2.5 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:scale-[0.98] text-zinc-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-300 transition-all"
                >
                  <Sparkles size={15} className="text-[#FF5722]" />
                  <span>One-Tap Demo Rider Sign-In</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Babajide Adeleke"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
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
                    placeholder="803 123 4567"
                    className="w-full pl-20 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rider@bayniks.ng"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                  />
                </div>
              </div>

              {/* Vehicle Type Choice */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
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
                            : 'border-zinc-200 bg-white text-zinc-600 font-medium'
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
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Plate Number
                </label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. KJA-824-XY"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold uppercase focus:outline-none focus:border-[#FF5722] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF5722] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FF5722] hover:bg-[#E64A19] active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all mt-2"
              >
                <span>Continue to OTP Verification</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {mode === 'otp' && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#FF5722] flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck size={26} />
                </div>
                <p className="text-xs text-zinc-600">
                  Please enter the 6-digit confirmation code sent via SMS to{' '}
                  <span className="font-bold text-zinc-900">{phone}</span>
                </p>
              </div>

              {/* 6 Digit Slot Boxes */}
              <div className="flex justify-center gap-2 py-1">
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
                    className="w-12 h-14 text-center text-xl font-black bg-zinc-50 border-2 border-zinc-200 rounded-2xl focus:outline-none focus:border-[#FF5722] focus:bg-white transition-all shadow-inner"
                  />
                ))}
              </div>

              <div className="text-center text-xs text-zinc-500">
                {resendSeconds > 0 ? (
                  <span>Resend SMS code in <strong className="text-zinc-800">{resendSeconds}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-bold text-[#FF5722] hover:underline"
                  >
                    Resend SMS Code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isSubmitting || otpDigits.join('').length < 6}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FF5722] hover:bg-[#E64A19] active:scale-[0.98] disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle2 size={18} />
                <span>Verify & Complete Registration</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('register')}
                className="w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-800"
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
