import React, { useState } from 'react';
import {
  Car,
  Navigation,
  User,
  Settings as SettingsIcon,
  HelpCircle,
  ChevronRight,
  LogOut,
  FileText,
  Share2,
  Globe,
  Radio,
  Plus,
  Check,
  X,
  ExternalLink,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime } from '../utils/audioChimes';

export interface RiderSettingsScreenProps {
  onOpenKyc: () => void;
  onOpenSupport: () => void;
  onOpenDrawer?: () => void;
}

export const RiderSettingsScreen: React.FC<RiderSettingsScreenProps> = ({
  onOpenKyc,
  onOpenSupport,
  onOpenDrawer,
}) => {
  const { riderName, plateNumber, logoutRider, showToast, kycStatus, autoConfirm, setAutoConfirm } = useRiderStore();

  const [activeModal, setActiveModal] = useState<'vehicles' | 'navigation' | 'account' | 'app_settings' | 'auto_confirm' | 'theme' | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<'system' | 'dark' | 'light'>('light');

  // Settings State matching Bolt screen recording
  const [selectedVehicle, setSelectedVehicle] = useState('FST476FB - Toyota Corolla 2004, Silver');
  const [defaultNavApp, setDefaultNavApp] = useState<'google' | 'waze' | 'in_app'>('google');
  const [navAutoStart, setNavAutoStart] = useState(false);
  const [realtimeTraffic, setRealtimeTraffic] = useState(true);
  const [quickAccessWidget, setQuickAccessWidget] = useState(true);

  const handleLogout = () => {
    playKeypadChime();
    logoutRider();
    showToast('Signed out successfully');
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-[#F8FAFC] text-zinc-900 select-none overflow-hidden"
      data-testid="rider-settings-screen"
    >
      {/* Top Header */}
      <div className="shrink-0 bg-white border-b border-zinc-200 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-black text-zinc-900 tracking-tight">Settings</h2>
        <span className="text-xs font-bold text-zinc-400">Hub</span>
      </div>

      {/* Main Settings Menu Body (Frames #57 - #78) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile Card Header */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-13 h-13 rounded-full bg-emerald-600 text-white font-black text-xl flex items-center justify-center shrink-0">
            {riderName ? riderName.slice(0, 1).toUpperCase() : 'E'}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-zinc-900 truncate">
              {riderName || 'Evans King'}
            </h3>
            <div className="text-xs text-zinc-500 font-semibold truncate">+234 703 312 991</div>
            <div className="text-xs text-zinc-400 truncate font-medium">evanskings@gmail.com</div>
          </div>
        </div>

        {/* Settings Navigation List (Categorised like Bolt) */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs divide-y divide-zinc-100">
          {/* 1. Vehicles */}
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setActiveModal('vehicles');
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Car size={20} className="text-zinc-700 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-zinc-900">Vehicles</div>
                <div className="text-xs text-zinc-400 truncate">{selectedVehicle}</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400 shrink-0" />
          </button>

          {/* 2. Navigation Preferences */}
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setActiveModal('navigation');
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Navigation size={20} className="text-zinc-700 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-zinc-900">Navigation</div>
                <div className="text-xs text-zinc-400 truncate">
                  {defaultNavApp === 'google' ? 'Google Maps' : defaultNavApp === 'waze' ? 'Waze' : 'In-App Navigation'}
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400 shrink-0" />
          </button>

          {/* 3. Account & KYC Documents */}
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setActiveModal('account');
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <User size={20} className="text-zinc-700 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-zinc-900">Account</div>
                <div className="text-xs text-zinc-400 truncate">
                  Documents • Driver Portal • Invite
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400 shrink-0" />
          </button>

          {/* 4. App Settings */}
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setActiveModal('app_settings');
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <SettingsIcon size={20} className="text-zinc-700 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-zinc-900">App settings</div>
                <div className="text-xs text-zinc-400 truncate">
                  Auto-confirm • Theme • Language
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400 shrink-0" />
          </button>

          {/* 5. Support */}
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              onOpenSupport();
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <HelpCircle size={20} className="text-zinc-700 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-zinc-900">Support</div>
                <div className="text-xs text-zinc-400 truncate">
                  24/7 Hotline & Emergency SOS
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400 shrink-0" />
          </button>
        </div>

        {/* Cross-Sell Promotional Banner (Frame #58) */}
        <div className="bg-[#4338CA] text-white p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-indigo-200">Want to request a delivery?</div>
            <div className="text-sm font-black mt-0.5">Get Bayniks Customer App</div>
          </div>
          <ExternalLink size={18} className="text-indigo-200" />
        </div>

        {/* Version Footer */}
        <div className="text-center pt-2 text-[11px] text-zinc-400 font-semibold">
          App version DA.44.1 (Bayniks Lagos Build 2026)
        </div>
      </div>

      {/* =========================================================================
       * SUB-MODAL 1: VEHICLES MANAGEMENT (Frame #60)
       * ========================================================================= */}
      {activeModal === 'vehicles' && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85%] flex flex-col overflow-hidden animate-slideUp">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900">Vehicles</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {[
                'FST476FB - Toyota Corolla 2004, Silver',
                'KJA921BD - Bajaj Boxer 150cc, Red',
                'LSR304AP - TVS HLX Plus 125cc, Black',
              ].map((veh) => (
                <div
                  key={veh}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    playKeypadChime();
                    setSelectedVehicle(veh);
                    showToast(`Active vehicle switched to ${veh.split('-')[0]}`);
                  }}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                    selectedVehicle === veh
                      ? 'border-emerald-500 bg-emerald-50/40 text-zinc-950 font-bold'
                      : 'border-zinc-200 bg-white text-zinc-700'
                  }`}
                >
                  <span className="text-xs truncate">{veh}</span>
                  {selectedVehicle === veh && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check size={13} strokeWidth={2.8} />
                    </span>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  showToast('Redirecting to Vehicle Registration Inspection...');
                }}
                className="w-full py-3.5 border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-zinc-700 transition"
              >
                <Plus size={16} />
                <span>Add new vehicle</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 2: NAVIGATION SETTINGS (Frames #62 - #67)
       * ========================================================================= */}
      {activeModal === 'navigation' && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85%] flex flex-col overflow-hidden animate-slideUp">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900">Navigation Preferences</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs font-extrabold uppercase text-zinc-400 mb-2">Default App</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['google', 'waze', 'in_app'] as const).map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => {
                        playKeypadChime();
                        setDefaultNavApp(app);
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold capitalize transition ${
                        defaultNavApp === app
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-zinc-200 bg-white text-zinc-600'
                      }`}
                    >
                      {app === 'in_app' ? 'In-App' : app}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <div>
                  <div className="text-xs font-bold text-zinc-900">Navigation auto-start</div>
                  <div className="text-[11px] text-zinc-500">Launch navigation immediately on job accept</div>
                </div>
                <input
                  type="checkbox"
                  checked={navAutoStart}
                  onChange={(e) => setNavAutoStart(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <div>
                  <div className="text-xs font-bold text-zinc-900">Real-time traffic</div>
                  <div className="text-[11px] text-zinc-500">Live traffic congestion layer</div>
                </div>
                <input
                  type="checkbox"
                  checked={realtimeTraffic}
                  onChange={(e) => setRealtimeTraffic(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 3: ACCOUNT & DOCUMENTS (Frames #68 - #75)
       * ========================================================================= */}
      {activeModal === 'account' && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85%] flex flex-col overflow-hidden animate-slideUp">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900">Account & Regulatory Compliance</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  onOpenKyc();
                }}
                className="w-full p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 flex items-center justify-between text-xs font-bold text-zinc-800 transition"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-emerald-600" />
                  <div className="text-left">
                    <div>Documents & Regulatory Compliance</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      {kycStatus === 'approved' ? 'All Documents Verified' : 'KYC Verification In Progress'}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => showToast('Opening Web Driver Portal...')}
                className="w-full p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 flex items-center justify-between text-xs font-bold text-zinc-800 transition"
              >
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-zinc-700" />
                  <span>Driver Portal</span>
                </div>
                <ExternalLink size={16} className="text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => showToast('Referral code copied: BAYNIKS-2026')}
                className="w-full p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 flex items-center justify-between text-xs font-bold text-zinc-800 transition"
              >
                <div className="flex items-center gap-3">
                  <Share2 size={18} className="text-zinc-700" />
                  <div className="text-left">
                    <div>Invite friends to drive</div>
                    <div className="text-[10px] text-zinc-400 font-normal">Share your code BAYNIKS-2026</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full p-4 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200/80 flex items-center justify-between text-xs font-bold text-red-600 transition mt-4"
              >
                <div className="flex items-center gap-3">
                  <LogOut size={18} />
                  <span>Log out</span>
                </div>
                <ChevronRight size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 4: APP SETTINGS (Frames #77 - #78)
       * ========================================================================= */}
      {activeModal === 'app_settings' && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85%] flex flex-col overflow-hidden animate-slideUp">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900">App Settings</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* Quick access */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <div>
                  <div className="text-xs font-bold text-zinc-900">Quick access</div>
                  <div className="text-[11px] text-zinc-500">Lock On / Widget On</div>
                </div>
                <input
                  type="checkbox"
                  checked={quickAccessWidget}
                  onChange={(e) => setQuickAccessWidget(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Auto-Confirm row -> Opens dedicated Auto-Confirm sub-page */}
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  setActiveModal('auto_confirm');
                }}
                className="w-full p-3.5 bg-zinc-50 hover:bg-zinc-100 rounded-2xl border border-zinc-200/80 flex items-center justify-between text-left transition cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-zinc-900">Auto-Confirm</div>
                  <div className="text-[11px] text-zinc-500">
                    {autoConfirm ? 'On' : 'Off'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-400" />
              </button>

              {/* Theme Selector */}
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  setActiveModal('theme');
                }}
                className="w-full p-3.5 bg-zinc-50 hover:bg-zinc-100 rounded-2xl border border-zinc-200/80 flex items-center justify-between text-left transition cursor-pointer"
              >
                <span className="text-xs font-bold text-zinc-900">Theme</span>
                <div className="flex items-center gap-1 text-zinc-500 text-xs font-semibold">
                  <span className="capitalize">{selectedTheme}</span>
                  <ChevronRight size={16} className="text-zinc-400" />
                </div>
              </button>

              {/* Language */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 flex items-center justify-between text-xs font-bold text-zinc-900">
                <span>Language</span>
                <span className="text-zinc-500">English, United Kingdom, GB</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 5: DEDICATED AUTO-CONFIRM PAGE (Frames #2 - #11)
       * ========================================================================= */}
      {activeModal === 'auto_confirm' && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col animate-slideUp">
          <div className="p-4 border-b border-zinc-200 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveModal('app_settings')}
              className="w-9 h-9 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-700"
            >
              <ArrowLeft size={20} />
            </button>
            <h3 className="text-base font-black text-zinc-900">Auto-Confirm</h3>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-zinc-900">Auto-Confirm</span>
              <input
                type="checkbox"
                checked={autoConfirm}
                onChange={(e) => {
                  setAutoConfirm(e.target.checked);
                  showToast(`Auto-Confirm ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                }}
                className="w-6 h-6 accent-[#00A859] cursor-pointer"
              />
            </div>

            <div className="space-y-3 text-xs text-zinc-500 leading-relaxed">
              <p>Incoming trip requests will be confirmed automatically.</p>
              <p>Auto-Confirm will be disabled when you decline, cancel or miss a trip request.</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SUB-MODAL 6: THEME PICKER MODAL (Frame #18)
       * ========================================================================= */}
      {activeModal === 'theme' && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-5 space-y-4 animate-slideUp">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <h3 className="text-sm font-black text-zinc-900">Theme</h3>
              <button
                type="button"
                onClick={() => setActiveModal('app_settings')}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { id: 'system' as const, label: 'System default' },
                { id: 'dark' as const, label: 'Dark' },
                { id: 'light' as const, label: 'Light' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setSelectedTheme(t.id);
                    setActiveModal('app_settings');
                    showToast(`Theme updated to ${t.label}`);
                  }}
                  className={`w-full p-4 rounded-2xl flex items-center justify-between text-xs font-bold transition ${
                    selectedTheme === t.id
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border border-zinc-200'
                  }`}
                >
                  <span>{t.label}</span>
                  {selectedTheme === t.id && <Check size={18} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderSettingsScreen;

