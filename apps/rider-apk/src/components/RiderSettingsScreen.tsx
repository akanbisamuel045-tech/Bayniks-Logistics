import React, { useState } from 'react';
import {
  ArrowLeft,
  Car,
  Check,
  ChevronRight,
  Gift,
  HelpCircle,
  LogOut,
  Navigation,
  Plus,
  Settings as SettingsIcon,
  User,
  X,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime } from '../utils/audioChimes';

export interface RiderSettingsScreenProps {
  onOpenKyc: () => void;
  onOpenSupport: () => void;
  onOpenDrawer?: () => void;
}

type SettingsView =
  | 'main'
  | 'vehicles'
  | 'add_vehicle'
  | 'navigation'
  | 'default_navigator'
  | 'account'
  | 'documents_portal'
  | 'driver_portal'
  | 'app_settings'
  | 'quick_access'
  | 'auto_confirm'
  | 'theme'
  | 'language';

interface VehicleOption {
  id: string;
  plate: string;
  description: string;
}

const INITIAL_VEHICLES: VehicleOption[] = [
  { id: 'veh-1', plate: 'FST476FB', description: 'Toyota Corolla 2004, Silver' },
  { id: 'veh-2', plate: 'KJA921BD', description: 'Bajaj Boxer 150cc, Red' },
  { id: 'veh-3', plate: 'LSR304AP', description: 'TVS HLX Plus 125cc, Black' },
];

const LANGUAGE_OPTIONS = [
  'English, United Kingdom, GB',
  'English, Nigeria, NG',
  'Nigerian Pidgin',
];

/** Clean toggle switch rendered in Black (#18181B) and Atomic Orange (#FF5722). */
const SettingsToggle: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  testId?: string;
}> = ({ checked, onChange, label, testId }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    data-testid={testId}
    onClick={() => {
      playKeypadChime();
      onChange(!checked);
    }}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${
      checked ? 'bg-[#18181B]' : 'bg-zinc-300'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-xs transition duration-200 mt-0.5 ${
        checked ? 'translate-x-[22px] bg-[#FF5722]' : 'translate-x-0.5 bg-white'
      }`}
    />
  </button>
);

/** Selection radio ring styled in Black & Atomic Orange. */
const RadioIndicator: React.FC<{ selected: boolean }> = ({ selected }) => (
  <span
    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
      selected ? 'border-[5px] border-[#18181B] bg-[#FF5722]' : 'border-2 border-zinc-300 bg-white'
    }`}
    aria-hidden="true"
  />
);

/** Reusable centered top bar for Settings sub-screens. */
const SubScreenHeader: React.FC<{
  title: string;
  onBack: () => void;
  closeIcon?: 'arrow' | 'x';
  backTestId?: string;
}> = ({ title, onBack, closeIcon = 'arrow', backTestId }) => (
  <header className="px-4 py-3.5 bg-white border-b border-zinc-100 flex items-center justify-between shrink-0">
    <button
      type="button"
      onClick={onBack}
      aria-label={closeIcon === 'x' ? 'Close' : 'Back'}
      data-testid={backTestId}
      className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center text-[#18181B] hover:bg-zinc-100 active:scale-95 transition-all"
    >
      {closeIcon === 'x' ? <X size={20} /> : <ArrowLeft size={20} />}
    </button>
    <h2 className="text-[16.5px] font-bold text-[#18181B] tracking-tight">{title}</h2>
    <div className="w-9" />
  </header>
);

export const RiderSettingsScreen: React.FC<RiderSettingsScreenProps> = ({
  onOpenKyc,
  onOpenSupport,
}) => {
  const {
    riderName,
    riderUser,
    plateNumber,
    logoutRider,
    showToast,
    kycStatus,
    autoConfirm,
    setAutoConfirm,
    preferredMapEngine,
    setPreferredMapEngine,
    vehicles,
    selectedVehicleId,
    selectActiveVehicle,
    addRiderVehicle,
    defaultNavApp,
    setDefaultNavApp,
    saveRiderPreferences,
  } = useRiderStore();

  const [view, setView] = useState<SettingsView>('main');
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');

  const [navDraft, setNavDraft] = useState<'google' | 'waze'>(defaultNavApp);
  const [navAutoStart, setNavAutoStart] = useState(false);
  const [realtimeTraffic, setRealtimeTraffic] = useState(true);

  const [quickIconOn, setQuickIconOn] = useState(true);
  const [quickWidgetOn, setQuickWidgetOn] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<'System default' | 'Dark' | 'Light'>('Light');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English, United Kingdom, GB');

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || INITIAL_VEHICLES[0]!;
  const displayName = riderName || riderUser?.fullName || 'Evans King';
  const displayPhone = riderUser?.phone || '+2347033129971';
  const displayEmail = riderUser?.email || 'evans@bayniks.ng';
  const inviteCode = 'EVANSK1043';

  const handleLogout = () => {
    playKeypadChime();
    setView('main');
    logoutRider();
    showToast('Signed out successfully');
  };

  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const plate = newPlate.trim().toUpperCase();
    const desc = newModel.trim();
    if (!plate || !desc) {
      showToast('Enter both plate number and vehicle details');
      return;
    }
    void addRiderVehicle(plate, desc);
    setNewPlate('');
    setNewModel('');
    setView('vehicles');
    showToast(`Added and selected ${plate}`);
  };

  /* ------------------------------------------------------------------
   * FULL-SCREEN SUB-VIEWS MATCHING REFERENCE VIDEO
   * ---------------------------------------------------------------- */
  if (view === 'vehicles') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-vehicles-view"
      >
        <SubScreenHeader
          title="Vehicles"
          onBack={() => setView('main')}
          backTestId="vehicles-back-btn"
        />

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="bg-white divide-y divide-zinc-100">
            {vehicles.map((veh) => {
              const isSelected = veh.id === activeVehicle.id;
              return (
                <button
                  key={veh.id}
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    selectActiveVehicle(veh.id);
                    showToast(`Active vehicle: ${veh.plate}`);
                  }}
                  data-testid={`vehicle-option-${veh.plate}`}
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[#18181B]">{veh.plate}</p>
                    <p className="text-[13px] text-zinc-500 mt-0.5 truncate">{veh.description}</p>
                  </div>
                  <RadioIndicator selected={isSelected} />
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            setView('add_vehicle');
          }}
          data-testid="add-new-vehicle-btn"
          className="absolute bottom-6 right-5 bg-[#18181B] text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 text-[14px] font-semibold active:scale-95 transition-transform"
        >
          <Plus size={17} className="text-[#FF5722]" />
          <span>Add new vehicle</span>
        </button>
      </div>
    );
  }

  if (view === 'add_vehicle') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-add-vehicle-view"
      >
        <SubScreenHeader
          title="Add new vehicle"
          onBack={() => setView('vehicles')}
          closeIcon="x"
        />
        <form onSubmit={handleAddVehicleSubmit} className="p-5 space-y-4 bg-white">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
              Plate number
            </label>
            <input
              type="text"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="e.g. LSR908KY"
              className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-[14px] focus:outline-none focus:border-[#18181B]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
              Make, model, year & colour
            </label>
            <input
              type="text"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder="e.g. Bajaj Boxer 2024, Black"
              className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 text-[14px] focus:outline-none focus:border-[#18181B]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 rounded-full bg-[#18181B] text-white text-[14.5px] font-semibold hover:bg-zinc-800 active:scale-[0.99] transition-all"
          >
            Save vehicle
          </button>
        </form>
      </div>
    );
  }

  if (view === 'navigation') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-navigation-view"
      >
        <SubScreenHeader
          title="Navigation"
          onBack={() => setView('main')}
          backTestId="navigation-back-btn"
        />
        <div className="bg-white divide-y divide-zinc-100">
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setNavDraft(defaultNavApp);
              setView('default_navigator');
            }}
            data-testid="default-navigation-row"
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <p className="text-[15px] font-medium text-[#18181B]">Default navigation</p>
              <p className="text-[13px] text-zinc-400 mt-0.5">
                {defaultNavApp === 'google' ? 'Google maps' : 'Waze'}
              </p>
            </div>
            <ChevronRight size={17} className="text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              const nextEngine = preferredMapEngine === 'google' ? 'maplibre' : 'google';
              setPreferredMapEngine(nextEngine);
              saveRiderPreferences({ preferences: { preferredMapEngine: nextEngine } });
              showToast(
                nextEngine === 'google'
                  ? 'In-app map engine: #1 Google Maps (with MapLibre auto-fallback)'
                  : 'In-app map engine: #2 Bayniks Vector (MapLibre GL)'
              );
            }}
            data-testid="settings-map-engine-row"
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <p className="text-[15px] font-medium text-[#18181B]">In-app map engine</p>
              <p className="text-[13px] text-zinc-400 mt-0.5">
                {preferredMapEngine === 'google'
                  ? 'Google Maps (#1 Primary)'
                  : 'MapLibre Vector (#2 Open-Source)'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#18181B] text-[#FF5722] text-[11px] font-bold">
              Switch
            </span>
          </button>

          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-[15px] font-medium text-[#18181B]">
              Navigation auto-start
            </span>
            <SettingsToggle
              checked={navAutoStart}
              onChange={(next) => {
                setNavAutoStart(next);
                showToast(`Navigation auto-start ${next ? 'enabled' : 'disabled'}`);
              }}
              label="Navigation auto-start"
              testId="nav-autostart-switch"
            />
          </div>

          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-[15px] font-medium text-[#18181B]">
              Real-time traffic
            </span>
            <SettingsToggle
              checked={realtimeTraffic}
              onChange={(next) => {
                setRealtimeTraffic(next);
                showToast(`Real-time traffic ${next ? 'enabled' : 'disabled'}`);
              }}
              label="Real-time traffic"
              testId="realtime-traffic-switch"
            />
          </div>
        </div>
      </div>
    );
  }

  if (view === 'default_navigator') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-default-navigator-view"
      >
        <SubScreenHeader
          title="Default navigator"
          onBack={() => setView('navigation')}
          closeIcon="x"
        />
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <p className="bg-white px-6 py-4 text-[13px] text-zinc-500 text-center leading-relaxed">
              Please select your default navigation to reach it faster while driving with Bayniks
            </p>
            <div className="bg-white divide-y divide-zinc-100 mt-1">
              {[
                { id: 'google' as const, label: 'Google maps' },
                { id: 'waze' as const, label: 'Waze' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setNavDraft(option.id);
                  }}
                  data-testid={`navigator-option-${option.id}`}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-[15px] font-medium text-[#18181B]">
                    {option.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-zinc-100 text-[#FF5722] text-[11px] font-semibold">
                      Recommended
                    </span>
                    <RadioIndicator selected={navDraft === option.id} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 bg-white border-t border-zinc-100">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setDefaultNavApp(navDraft);
                setView('navigation');
                showToast(`Default navigation: ${navDraft === 'google' ? 'Google maps' : 'Waze'}`);
              }}
              data-testid="default-navigator-done-btn"
              className="w-full py-3.5 rounded-full bg-[#18181B] text-white text-[15px] font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Done</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'account') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-account-view"
      >
        <SubScreenHeader
          title="Account"
          onBack={() => setView('main')}
          backTestId="account-back-btn"
        />
        <div className="flex-1 overflow-y-auto space-y-2.5">
          <div className="bg-white divide-y divide-zinc-100">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setView('documents_portal');
              }}
              data-testid="account-documents-row"
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
            >
              <span className="text-[15px] font-medium text-[#18181B]">Documents</span>
              <ChevronRight size={17} className="text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setView('driver_portal');
              }}
              data-testid="account-driver-portal-row"
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
            >
              <span className="text-[15px] font-medium text-[#18181B]">Driver Portal</span>
              <ChevronRight size={17} className="text-zinc-400" />
            </button>
          </div>

          <div className="bg-white">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                showToast(`Referral code copied: ${inviteCode}`);
              }}
              data-testid="account-invite-row"
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <span className="w-8 h-8 rounded-full bg-[#18181B] text-[#FF5722] flex items-center justify-center shrink-0">
                  <Gift size={16} />
                </span>
                <div>
                  <p className="text-[15px] font-medium text-[#18181B]">
                    Invite friends to drive
                  </p>
                  <p className="text-[12.5px] text-zinc-400 mt-0.5">
                    Share your code {inviteCode}
                  </p>
                </div>
              </div>
              <ChevronRight size={17} className="text-zinc-400 shrink-0" />
            </button>
          </div>

          <div className="bg-white">
            <button
              type="button"
              onClick={handleLogout}
              data-testid="account-logout-row"
              className="w-full px-5 py-4 text-left text-[15px] font-semibold text-[#FF5722] hover:bg-zinc-50 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'documents_portal') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-documents-portal-view"
      >
        <header className="px-4 py-3 bg-[#18181B] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setView('account')}
              aria-label="Close documents"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
            >
              <X size={18} />
            </button>
            <span className="text-[13px] font-medium text-zinc-300">
              partners.bayniks.ng
            </span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FF5722] text-white">
            Bayniks Driver
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-zinc-200/70 space-y-1">
            <h3 className="text-[18px] font-bold text-[#18181B]">My Documents</h3>
            <p className="text-[12.5px] text-zinc-500">
              Here are documents associated with your driver profile.
            </p>
          </div>

          {[
            {
              title: "Driver's License",
              desc: 'Provide a clear driver license showing license number, full name, and birth date.',
              file: 'DL-VERIFIED-EFR10537AA03.jpg',
              uploaded: '08/12/2020',
            },
            {
              title: "Driver's profile photo",
              desc: 'Clear portrait picture of yourself looking forward with good lighting.',
              file: 'SELFIE-PORTRAIT-2026.jpg',
              uploaded: '02/08/2022',
            },
            {
              title: 'Exterior Photo of your Vehicle',
              desc: 'Clear exterior photo showing front and plate number.',
              file: `${activeVehicle.plate}-EXTERIOR.jpg`,
              uploaded: '02/08/2022',
            },
          ].map((doc) => (
            <div
              key={doc.title}
              className="bg-white rounded-2xl p-4 border border-zinc-200/70 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-[15px] font-bold text-[#18181B]">{doc.title}</h4>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#18181B] text-[#FF5722]">
                  {kycStatus === 'approved' ? 'Verified' : 'Uploaded'}
                </span>
              </div>
              <p className="text-[12.5px] text-zinc-500">{doc.desc}</p>
              <p className="text-[12px] font-medium text-zinc-700">{doc.file}</p>
              <p className="text-[11px] text-zinc-400">Uploaded: {doc.uploaded}</p>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              setView('main');
              onOpenKyc();
            }}
            data-testid="open-full-kyc-btn"
            className="w-full py-3.5 rounded-full bg-[#18181B] text-white text-[14px] font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={16} className="text-[#FF5722]" />
            <span>Upload or verify document</span>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'driver_portal') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-driver-portal-view"
      >
        <header className="px-4 py-3 bg-[#18181B] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setView('account')}
              aria-label="Close portal"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
            >
              <X size={18} />
            </button>
            <span className="text-[13px] font-medium text-zinc-300">
              partners.bayniks.ng/profile
            </span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FF5722] text-white">
            Bayniks Driver
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-zinc-200/70 space-y-3">
            <div>
              <h3 className="text-[18px] font-bold text-[#18181B]">Profile</h3>
              <p className="text-[12.5px] text-zinc-500">
                Check your driver profile details associated with Bayniks.
              </p>
            </div>
            {[
              { label: 'Full name', value: displayName },
              { label: 'Email', value: displayEmail },
              { label: 'Phone', value: displayPhone },
              { label: 'Active vehicle', value: `${plateNumber || activeVehicle.plate} • ${activeVehicle.description}` },
              { label: 'Billing address', value: 'Sixth Street, Warri / Lagos Dispatch Zone' },
            ].map((field) => (
              <div key={field.label} className="space-y-1">
                <p className="text-[12px] font-semibold text-zinc-500">{field.label}</p>
                <div className="px-3.5 py-2.5 rounded-xl bg-[#F4F4F5] text-[13.5px] font-medium text-[#18181B]">
                  {field.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'app_settings') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-app-settings-view"
      >
        <SubScreenHeader
          title="App settings"
          onBack={() => setView('main')}
          backTestId="app-settings-back-btn"
        />

        <div className="flex-1 overflow-y-auto space-y-2.5">
          <div className="bg-white divide-y divide-zinc-100">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setView('quick_access');
              }}
              data-testid="app-settings-quick-access-row"
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
            >
              <div>
                <p className="text-[15px] font-medium text-[#18181B]">Quick access</p>
                <p className="text-[13px] text-zinc-400 mt-0.5">
                  Icon {quickIconOn ? 'On' : 'Off'} / Widget {quickWidgetOn ? 'On' : 'Off'}
                </p>
              </div>
              <ChevronRight size={17} className="text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setView('auto_confirm');
              }}
              data-testid="app-settings-autoconfirm-row"
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
            >
              <div>
                <p className="text-[15px] font-medium text-[#18181B]">Auto-Confirm</p>
                <p className="text-[13px] text-zinc-400 mt-0.5">
                  {autoConfirm ? 'On' : 'Off'}
                </p>
              </div>
              <ChevronRight size={17} className="text-zinc-400" />
            </button>
          </div>

          <div className="bg-white divide-y divide-zinc-100">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setView('theme');
              }}
              data-testid="app-settings-theme-row"
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
            >
              <div>
                <p className="text-[15px] font-medium text-[#18181B]">Theme</p>
                <p className="text-[13px] text-zinc-400 mt-0.5">{selectedTheme}</p>
              </div>
              <ChevronRight size={17} className="text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setView('language');
              }}
              data-testid="app-settings-language-row"
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
            >
              <div>
                <p className="text-[15px] font-medium text-[#18181B]">Language</p>
                <p className="text-[13px] text-zinc-400 mt-0.5">{selectedLanguage}</p>
              </div>
              <ChevronRight size={17} className="text-zinc-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'quick_access') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-quick-access-view"
      >
        <SubScreenHeader
          title="Quick access"
          onBack={() => setView('app_settings')}
        />
        <div className="bg-white divide-y divide-zinc-100">
          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-[15px] font-medium text-[#18181B]">Floating icon</span>
            <SettingsToggle
              checked={quickIconOn}
              onChange={setQuickIconOn}
              label="Floating icon"
            />
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-[15px] font-medium text-[#18181B]">Widget</span>
            <SettingsToggle
              checked={quickWidgetOn}
              onChange={setQuickWidgetOn}
              label="Widget"
            />
          </div>
        </div>
      </div>
    );
  }

  if (view === 'auto_confirm') {
    return (
      <div
        className="absolute inset-0 z-50 bg-white flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-autoconfirm-view"
      >
        <SubScreenHeader
          title="Auto-Confirm"
          onBack={() => setView('app_settings')}
        />
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[15.5px] font-medium text-[#18181B]">Auto-Confirm</span>
            <SettingsToggle
              checked={autoConfirm}
              onChange={(next) => {
                setAutoConfirm(next);
                showToast(`Auto-Confirm ${next ? 'On' : 'Off'}`);
              }}
              label="Auto-Confirm"
              testId="autoconfirm-switch"
            />
          </div>
          <div className="space-y-3 text-[13.5px] text-zinc-500 leading-relaxed">
            <p>Incoming trip requests will be confirmed automatically.</p>
            <p>Auto-Confirm will be disabled when you decline, cancel or miss a trip request.</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'theme') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-theme-view"
      >
        <SubScreenHeader
          title="Theme"
          onBack={() => setView('app_settings')}
        />
        <div className="bg-white divide-y divide-zinc-100">
          {(['System default', 'Dark', 'Light'] as const).map((themeOption) => (
            <button
              key={themeOption}
              type="button"
              onClick={() => {
                playKeypadChime();
                setSelectedTheme(themeOption);
                setView('app_settings');
                showToast(`Theme set to ${themeOption}`);
              }}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
            >
              <span className="text-[15px] font-medium text-[#18181B]">{themeOption}</span>
              <RadioIndicator selected={selectedTheme === themeOption} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'language') {
    return (
      <div
        className="absolute inset-0 z-50 bg-[#F4F4F5] flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="settings-language-view"
      >
        <SubScreenHeader
          title="Language"
          onBack={() => setView('app_settings')}
        />
        <div className="bg-white divide-y divide-zinc-100">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                playKeypadChime();
                setSelectedLanguage(lang);
                setView('app_settings');
                showToast(`Language updated to ${lang}`);
              }}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
            >
              <span className="text-[15px] font-medium text-[#18181B]">{lang}</span>
              {selectedLanguage === lang && (
                <Check size={17} className="text-[#FF5722]" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------
   * MAIN SETTINGS ROOT PAGE (MATCHING FRAME #10 IN REFERENCE VIDEO)
   * ---------------------------------------------------------------- */
  return (
    <div
      className="min-h-full pb-28 bg-[#F4F4F5] text-[#18181B] flex flex-col justify-between select-none animate-fadeIn"
      data-testid="rider-settings-screen"
    >
      <div>
        {/* Centered Rider Identity Header */}
        <header className="bg-white px-5 pt-6 pb-4 text-center">
          <h1 className="text-[18px] font-bold text-[#18181B] tracking-tight">
            {displayName}
          </h1>
          <p className="text-[12.5px] text-zinc-500 mt-1">{displayPhone}</p>
          <p className="text-[12.5px] text-zinc-500">{displayEmail}</p>
        </header>

        {/* Clean 5-Item Edge-to-Edge List */}
        <div className="bg-white divide-y divide-zinc-100 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setView('vehicles');
            }}
            data-testid="settings-vehicles-row"
            className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 active:bg-zinc-100/70 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <Car size={20} className="text-[#18181B] shrink-0" />
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-[#18181B]">Vehicles</p>
                <p className="text-[12.5px] text-zinc-400 truncate mt-0.5">
                  {activeVehicle.plate} {activeVehicle.description.split(',')[0]}
                </p>
              </div>
            </div>
            <ChevronRight size={17} className="text-zinc-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setView('navigation');
            }}
            data-testid="settings-navigation-row"
            className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 active:bg-zinc-100/70 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <Navigation size={20} className="text-[#18181B] shrink-0" />
              <p className="text-[15px] font-medium text-[#18181B]">Navigation</p>
            </div>
            <ChevronRight size={17} className="text-zinc-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setView('account');
            }}
            data-testid="settings-account-row"
            className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 active:bg-zinc-100/70 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <User size={20} className="text-[#18181B] shrink-0" />
              <p className="text-[15px] font-medium text-[#18181B]">Account</p>
            </div>
            <ChevronRight size={17} className="text-zinc-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setView('app_settings');
            }}
            data-testid="settings-app-settings-row"
            className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 active:bg-zinc-100/70 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <SettingsIcon size={20} className="text-[#18181B] shrink-0" />
              <p className="text-[15px] font-medium text-[#18181B]">App settings</p>
            </div>
            <ChevronRight size={17} className="text-zinc-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              onOpenSupport();
            }}
            data-testid="settings-support-row"
            className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 active:bg-zinc-100/70 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <HelpCircle size={20} className="text-[#18181B] shrink-0" />
              <p className="text-[15px] font-medium text-[#18181B]">Support</p>
            </div>
            <ChevronRight size={17} className="text-zinc-400 shrink-0" />
          </button>
        </div>

        {/* Centered App Version */}
        <p className="text-center text-[12px] text-zinc-400 font-medium pt-6 pb-4">
          App version DA.44.1
        </p>

        {/* Direct Logout Button Preserved on Settings Page */}
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={handleLogout}
            data-testid="settings-logout-btn"
            className="w-full py-3 px-4 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-[#FF5722] font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Bottom Black & Atomic Orange Passenger Promo Banner */}
      <div className="px-4 pt-2 pb-4">
        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            showToast('Opening Bayniks Customer App...');
          }}
          data-testid="settings-passenger-banner"
          className="w-full bg-[#18181B] text-white px-4 py-3.5 rounded-xl flex items-center justify-between text-left hover:bg-zinc-800 active:scale-[0.99] transition-all"
        >
          <div>
            <p className="text-[14.5px] font-bold text-white leading-snug">
              Want to request a trip?
            </p>
            <p className="text-[12.5px] font-medium text-[#FF5722] mt-0.5">
              Get passenger app
            </p>
          </div>
          <ChevronRight size={18} className="text-[#FF5722] shrink-0" />
        </button>
      </div>
    </div>
  );
};

export default RiderSettingsScreen;
