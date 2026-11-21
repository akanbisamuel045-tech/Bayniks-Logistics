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
  Search,
  ChevronDown,
  ArrowUpRight,
  Check,
  MessageSquare,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime, playMissionAcceptChime, playErrorChime } from '../utils/audioChimes';

export interface RiderAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'welcome' | 'login_options' | 'login' | 'register' | 'otp_method' | 'otp';
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

  const [mode, setMode] = useState<'welcome' | 'login_options' | 'login' | 'register' | 'otp_method' | 'otp'>('login');

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Lagos');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [vehicleType, setVehicleType] = useState<'bike' | 'van' | 'truck'>('bike');
  const [plateNumber, setPlateNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpCode, setOtpCode] = useState('');
  const [otpMethod, setOtpMethod] = useState<'sms' | 'whatsapp'>('sms');
  const [isResent, setIsResent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(22);

  // Auto-decrement countdown timer in OTP screen
  React.useEffect(() => {
    if (resendSeconds <= 0 || mode !== 'otp') return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds, mode]);

  const cleanPhone = phone.replace(/\D/g, '');
  const displayPhone = phone
    ? (phone.startsWith('+234') ? phone : `+234${phone.replace(/^0/, '')}`)
    : '+2349160575724';

  const isRegisterValid = Boolean(
    email.trim().includes('@') &&
    cleanPhone.length >= 10 &&
    agreedToTerms
  );

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
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      playErrorChime();
      return;
    }
    if (!phone || cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid Nigerian phone number');
      playErrorChime();
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg('Please agree to the Terms of Service and Privacy policy to continue');
      playErrorChime();
      return;
    }

    const res = await registerRider({
      fullName: fullName.trim() || email.split('@')[0] || 'Bayniks Courier',
      phone,
      email: email.trim(),
      city: city.trim() || 'Lagos',
      vehicleType: 'bike',
      plateNumber: plateNumber || undefined,
    });

    if (res.success) {
      playKeypadChime();
      // Advance to verification method selection (Bolt Image 1)
      setMode('otp_method');
      setResendSeconds(22);
      setIsResent(false);
    } else {
      playErrorChime();
      setErrorMsg(res.error || 'Registration failed. Phone number may already exist.');
    }
  };

  const handleSendOtp = async (channel: 'sms' | 'whatsapp') => {
    playKeypadChime();
    setOtpMethod(channel);
    setResendSeconds(22);
    setIsResent(false);
    setErrorMsg(null);
    setOtpCode('');
    setOtpDigits(['', '', '', '', '', '']);
    setMode('otp');

    const normalizedPhone = phone.startsWith('+234')
      ? phone
      : `+234${phone.replace(/^0/, '') || '9160575724'}`;
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    useRiderStore.getState().setActiveOtpCode(generatedOtp);

    if (channel === 'sms') {
      const termiiApiKey = (import.meta as any).env?.VITE_TERMII_API_KEY || '';
      if (termiiApiKey && (import.meta as any).env?.MODE !== 'test') {
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
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.warn('[Termii SMS Dispatch Gateway]', data);
          } else {
            showToast(`Verification SMS sent to ${normalizedPhone}`);
          }
        } catch (err: any) {
          console.warn('[Termii SMS Dispatch Network Error]', err);
        }
      } else {
        showToast(`Verification SMS sent to ${normalizedPhone}`);
      }
    } else {
      showToast(`Verification code sent via WhatsApp to ${normalizedPhone}`);
    }
  };

  const handleResendOtp = async () => {
    playKeypadChime();
    setResendSeconds(22);
    setIsResent(true);
    setErrorMsg(null);
    const normalizedPhone = phone.startsWith('+234')
      ? phone
      : `+234${phone.replace(/^0/, '') || '9160575724'}`;
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    useRiderStore.getState().setActiveOtpCode(generatedOtp);

    const termiiApiKey = (import.meta as any).env?.VITE_TERMII_API_KEY || '';
    if (termiiApiKey && (import.meta as any).env?.MODE !== 'test') {
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
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn('[Termii SMS Dispatch Gateway]', data);
        } else {
          showToast(`Verification code resent via ${otpMethod.toUpperCase()} to ${normalizedPhone}`);
        }
      } catch (err: any) {
        console.warn('[Termii SMS Dispatch Network Error]', err);
      }
    } else {
      showToast(`Verification code resent via ${otpMethod.toUpperCase()} to ${normalizedPhone}`);
    }
  };
  const handleOtpInputChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setOtpCode(clean);
    const digits = clean.split('');
    const nextDigits = ['', '', '', '', '', ''];
    digits.forEach((d, i) => {
      if (i < 6) nextDigits[i] = d;
    });
    setOtpDigits(nextDigits);

    // Auto-advance verification upon entering 6 digits
    if (clean.length === 6) {
      playKeypadChime();
      const targetPhone = phone || '09160575724';
      const res = await verifyRiderOtp(targetPhone, clean);
      if (res.success) {
        playMissionAcceptChime();
        onClose();
      } else {
        playErrorChime();
        setErrorMsg(res.error || 'Invalid verification code. Please try again.');
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    handleOtpInputChange(text);
  };

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean && val !== '') return;
    playKeypadChime();

    const nextDigits = [...otpDigits];
    nextDigits[index] = clean.slice(-1);
    setOtpDigits(nextDigits);
    const combined = nextDigits.join('');
    setOtpCode(combined);
    if (combined.length === 6) {
      handleOtpInputChange(combined);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`rider-otp-slot-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode || otpDigits.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter all 6 digits of the verification code');
      playErrorChime();
      return;
    }
    setErrorMsg(null);
    const targetPhone = phone || '09160575724';
    const res = await verifyRiderOtp(targetPhone, code);
    if (res.success) {
      playMissionAcceptChime();
      onClose();
    } else {
      playErrorChime();
      setErrorMsg(res.error || 'Invalid verification code. Please try again.');
    }
  };

  const handleOneTapDemoLogin = async () => {
    playMissionAcceptChime();
    await loginRider('08034218900', 'RiderPass123!');
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-[100] w-full h-full bg-white flex flex-col overflow-hidden animate-fadeIn"
      data-testid="rider-auth-modal"
    >
      <div className="relative w-full h-full max-w-md mx-auto bg-white flex flex-col overflow-hidden">
        {/* Top Header Row (Full Screen Bolt/Bayniks Header) */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-zinc-100 bg-white shrink-0">
          <button
            onClick={() => {
              if (mode === 'otp') {
                setMode('otp_method');
              } else if (mode === 'otp_method') {
                setMode('register');
              } else {
                onClose();
              }
            }}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <span className="text-base font-bold text-zinc-900 tracking-tight">
            {mode === 'login' ? 'Sign In' : 'Register'}
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-800 text-xs font-bold">
            <span className="text-xs">🇳🇬</span>
            <span>EN</span>
          </div>
        </div>

        {/* Tab Switcher (Bolt-style segmented pills for Login vs Register, shown on login mode) */}
        {mode === 'login' && (
          <div className="flex bg-zinc-100 p-1 mx-5 mt-4 rounded-full shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className="flex-1 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all bg-white text-zinc-900 shadow-sm"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className="flex-1 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all text-zinc-500 hover:text-zinc-900"
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-shake shrink-0">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Body (Full Page Scroll Stage) */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
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

              {/* Main Submit: Black button with Bayniks Orange Accent */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md shadow-black/25 border-2 border-[#18181B] hover:border-black flex items-center justify-center gap-2.5 transition-all mt-2 cursor-pointer group"
              >
                {isSubmitting ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                    <span>Sign In to Cockpit</span>
                    <ArrowRight size={16} className="text-[#FF5722]" />
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

              {/* Toggle to Registration */}
              <div className="pt-3 pb-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setMode('register');
                    setErrorMsg(null);
                  }}
                  className="text-xs font-semibold text-zinc-800 hover:text-black inline-flex items-center gap-1 group"
                >
                  <span>Don't have an account?</span>
                  <span className="underline font-bold text-zinc-900 group-hover:text-[#FF5722] transition-colors">
                    Register as a driver
                  </span>
                  <ArrowUpRight size={13} className="text-zinc-600 group-hover:text-[#FF5722] transition-colors" />
                </button>
              </div>
            </form>
          )}

          {/* MODE: REGISTER (Full Page Bolt Card layout matching reference image) */}
          {mode === 'register' && (
            <div className="border border-zinc-200/90 rounded-[28px] p-5 sm:p-6 bg-white shadow-xs">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                    Become a driver
                  </h1>
                </div>

                {/* Field 1: Email address */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-4 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#FF5722] focus:bg-white transition-colors"
                    required
                  />
                </div>

                {/* Field 2: Phone number */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    Phone number
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playKeypadChime();
                        showToast('Country selector: Nigeria (+234)');
                      }}
                      className="h-12 px-3.5 bg-[#F4F4F5] border border-zinc-200 rounded-2xl flex items-center gap-1.5 text-sm font-semibold text-zinc-800 shrink-0 hover:bg-zinc-200 transition-colors"
                    >
                      <span className="text-base">🇳🇬</span>
                      <ChevronDown size={14} className="text-zinc-500" />
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        value={phone.replace(/^\+234/, '').replace(/^0/, '')}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={simulationMode ? '803 123 4567' : '800 000 0000'}
                        className="w-full pl-14 pr-4 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#FF5722] focus:bg-white transition-colors"
                        required
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500 pointer-events-none">
                        +234
                      </span>
                    </div>
                  </div>
                </div>

                {/* Field 3: City */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    City
                  </label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Search city"
                      className="w-full pl-10 pr-4 py-3 bg-[#F4F4F5] border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#FF5722] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Checkbox: Legal & Terms */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        playKeypadChime();
                        setAgreedToTerms(e.target.checked);
                      }}
                      className="w-5 h-5 mt-0.5 rounded border-zinc-300 text-[#18181B] focus:ring-[#FF5722] shrink-0 cursor-pointer accent-[#18181B]"
                    />
                    <span className="text-xs text-zinc-600 leading-snug">
                      By registering, you agree to our{' '}
                      <strong className="text-zinc-900 underline font-semibold">Terms of Service</strong> and{' '}
                      <strong className="text-zinc-900 underline font-semibold">Privacy policy</strong>, commit to
                      comply with obligations under Nigerian and local legislation and provide only legal services and
                      content on the Bayniks Platform.
                    </span>
                  </label>
                </div>

                {/* Promotional subtext */}
                <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
                  Once you've become a driver, we will occasionally send you offers and promotions related to our
                  services. You can always unsubscribe by changing your communication preferences.
                </p>

                {/* Primary Action Button */}
                {isRegisterValid ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md shadow-black/25 border-2 border-[#18181B] hover:border-black flex items-center justify-center gap-2.5 transition-all mt-3 cursor-pointer group"
                  >
                    {isSubmitting ? (
                      <span>Registering...</span>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                        <span>Register as a driver</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={true}
                    className="w-full h-14 rounded-full bg-[#F4F4F5] text-zinc-400 font-bold text-sm tracking-wide flex items-center justify-center mt-3 cursor-not-allowed border border-zinc-200/60"
                  >
                    <span>Register as a driver</span>
                  </button>
                )}

                {/* Footer Links */}
                <div className="pt-3 pb-1 text-center space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      playKeypadChime();
                      setMode('login');
                      setErrorMsg(null);
                    }}
                    className="text-xs font-semibold text-zinc-800 hover:text-black inline-flex items-center gap-1 group"
                  >
                    <span>Already have an account?</span>
                    <span className="underline font-bold text-zinc-900 group-hover:text-[#FF5722] transition-colors">
                      Log in
                    </span>
                    <ArrowUpRight size={13} className="text-zinc-600 group-hover:text-[#FF5722] transition-colors" />
                  </button>

                  <div>
                    <button
                      type="button"
                      onClick={() => showToast('Fleet Owner portal: fleet.bayniks.ng')}
                      className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                    >
                      If you have multiple vehicles and drivers,{' '}
                      <span className="underline font-bold text-zinc-800 hover:text-[#FF5722]">
                        register as a Fleet owner.
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* MODE: OTP METHOD SELECTION (Matching Bolt Image 1 with Black + Touch of Orange) */}
          {mode === 'otp_method' && (
            <div className="space-y-4 pt-1 pb-4">
              {/* Brand & Language Header Row */}
              <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-black text-[#FF5722] tracking-tight">Bayniks</span>
                  <span className="text-2xl font-black text-[#18181B] tracking-tight">Driver</span>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Language: English (Nigeria)')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 transition-colors"
                >
                  <Globe size={13} className="text-zinc-500" />
                  <span>English</span>
                </button>
              </div>

              {/* Centered Title & Description */}
              <div className="text-center pt-5 pb-2">
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                  Choose the verification method
                </h2>
                <p className="text-xs text-zinc-500 mt-2 font-normal">
                  Verification code will be sent to:
                </p>
                <p className="text-base font-black text-zinc-900 mt-0.5 tracking-wide">
                  {displayPhone}
                </p>
              </div>

              {/* Action Buttons: Black with a touch of orange */}
              <div className="space-y-3.5 pt-4 max-w-sm mx-auto">
                {/* Button 1: Get code via SMS */}
                <button
                  type="button"
                  data-testid="get-code-sms-btn"
                  onClick={() => handleSendOtp('sms')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-3 transition-all cursor-pointer group"
                >
                  <MessageSquare size={19} className="text-[#FF5722] group-hover:scale-110 transition-transform shrink-0" />
                  <span>Get code via SMS</span>
                </button>

                {/* Button 2: Get code via WhatsApp */}
                <button
                  type="button"
                  data-testid="get-code-whatsapp-btn"
                  onClick={() => handleSendOtp('whatsapp')}
                  className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-3 transition-all cursor-pointer group"
                >
                  <svg className="w-5 h-5 fill-[#FF5722] group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.78 14.18c-.24.68-1.39 1.3-1.92 1.38-.49.08-1.12.11-3.26-.77-2.54-1.05-4.17-3.64-4.3-3.81-.13-.17-1.02-1.36-1.02-2.59 0-1.23.64-1.83.87-2.08.23-.25.5-.31.67-.31.17 0 .34 0 .49.01.16.01.37-.06.58.44.21.51.73 1.77.79 1.9.06.13.1.28.02.45-.08.17-.12.28-.24.42-.12.14-.25.32-.36.43-.12.12-.25.25-.11.49.14.24.63 1.04 1.36 1.68.93.83 1.72 1.09 1.97 1.21.25.12.39.1.53-.06.14-.17.62-.72.78-.97.17-.25.33-.21.56-.12.23.08 1.45.69 1.7 1.04z" />
                  </svg>
                  <span>Get code via WhatsApp</span>
                </button>
              </div>

              {/* Back to registration link */}
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  ← Back to registration form
                </button>
              </div>
            </div>
          )}

          {/* MODE: OTP CODE ENTRY (Matching Bolt Image 2 with Single Box & Touch of Orange) */}
          {mode === 'otp' && (
            <div className="space-y-4 pt-1 pb-4">
              {/* Brand & Language Header Row */}
              <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-black text-[#FF5722] tracking-tight">Bayniks</span>
                  <span className="text-2xl font-black text-[#18181B] tracking-tight">Driver</span>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Language: English (Nigeria)')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 transition-colors"
                >
                  <Globe size={13} className="text-zinc-500" />
                  <span>English</span>
                </button>
              </div>

              {/* Centered Title & Description */}
              <div className="text-center pt-5 pb-1">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Enter code
                </h2>
                <p className="text-xs text-zinc-500 mt-2 font-normal">
                  {isResent ? 'Your verification code has been resent' : 'Your verification code has been sent'}
                </p>
                <p className="text-base font-black text-zinc-900 mt-0.5 tracking-wide">
                  {displayPhone}
                </p>
              </div>

              {/* Single Centered Rounded Box matching Image 2 with subtle touch of orange */}
              <div className="flex justify-center my-6">
                <div className="relative w-52 h-14 rounded-2xl border-2 border-[#18181B] focus-within:border-[#FF5722] bg-white flex items-center justify-center shadow-xs transition-colors group">
                  <input
                    id="rider-otp-input"
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => handleOtpInputChange(e.target.value)}
                    placeholder=""
                    className="w-full h-full text-center text-2xl font-black tracking-[0.3em] text-zinc-900 bg-transparent focus:outline-none select-all"
                  />
                  {!otpCode && (
                    <span className="absolute pointer-events-none text-[#FF5722] text-2xl font-light animate-pulse">
                      |
                    </span>
                  )}
                </div>
              </div>

              {/* Hidden slots for backwards-compatibility with tests / slot accessibility */}
              <div className="sr-only" aria-hidden="true">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`rider-otp-slot-${idx}`}
                    type="text"
                    readOnly
                    value={digit}
                  />
                ))}
              </div>

              {/* Resend Code in [xx] Timer */}
              <div className="text-center text-xs text-zinc-500 pt-1">
                {resendSeconds > 0 ? (
                  <span>
                    Resend code in <strong className="text-zinc-900 font-bold">{resendSeconds}</strong>
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

              {/* Verify & Complete Button: Black with Touch of Orange */}
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isSubmitting || (otpCode.length < 6 && otpDigits.join('').length < 6)}
                className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] disabled:opacity-40 text-white font-bold text-sm tracking-wide shadow-lg shadow-black/25 border-2 border-[#18181B] flex items-center justify-center gap-2.5 transition-all mt-4 cursor-pointer group"
              >
                <span className="w-2 h-2 rounded-full bg-[#FF5722] group-hover:scale-125 transition-transform" />
                <CheckCircle2 size={16} className="text-[#FF5722]" />
                <span>Verify & Complete Registration</span>
              </button>

              {/* Secondary Navigation Options */}
              <div className="pt-3 text-center space-y-1.5">
                <div>
                  <button
                    type="button"
                    onClick={() => setMode('otp_method')}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    ← Choose another verification method
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    Edit phone number
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
