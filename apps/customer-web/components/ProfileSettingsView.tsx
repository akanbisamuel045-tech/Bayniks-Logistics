'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@logistics/shared-types';
import { useTheme } from './ThemeProvider';
import {
  ArrowLeft,
  Settings,
  Check,
  Edit3,
  Bike,
  Repeat,
  Calendar,
  MapPin,
  CreditCard,
  Package,
  MessageSquare,
  Headphones,
  Bell,
  Lock,
  LogOut,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type ProfileViewTab = 'profile' | 'edit' | 'settings';

export interface UserProfileData {
  displayName: string;
  senderTag: string;
  phone: string;
  email: string;
  company: string;
  avatarUrl: string;
  isPro: boolean;
  walletBalanceKobo: number;
}

export interface SecuritySettingsData {
  handoverOtpRequired: boolean;
  cargoInsuranceEnabled: boolean;
  biometricsEnabled: boolean;
}

export interface ProfileSettingsViewProps {
  initialTab?: ProfileViewTab;
  initialProfile?: Partial<UserProfileData>;
  initialSettings?: Partial<SecuritySettingsData>;
  onBackClick?: () => void;
  onSignOut?: () => void;
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
];

const DEFAULT_PROFILE: UserProfileData = {
  displayName: 'Kainul Stevano',
  senderTag: 'kainul_stevano',
  phone: '812 345 6789',
  email: 'kainul.designs@boltmail.com',
  company: 'Kainul Studios & Logistics LTD',
  avatarUrl: DEFAULT_AVATARS[0]!,
  isPro: true,
  walletBalanceKobo: 4520000, // ₦45,200.00
};

const DEFAULT_SETTINGS: SecuritySettingsData = {
  handoverOtpRequired: true,
  cargoInsuranceEnabled: true,
  biometricsEnabled: true,
};

export function ProfileSettingsView({
  initialTab = 'profile',
  initialProfile,
  initialSettings,
  onBackClick,
  onSignOut,
}: ProfileSettingsViewProps) {
  const router = useRouter();
  const { theme, setTheme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<ProfileViewTab>(initialTab);
  const [profile, setProfile] = useState<UserProfileData>({
    ...DEFAULT_PROFILE,
    ...initialProfile,
  });

  const [settings, setSettings] = useState<SecuritySettingsData>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });

  // Edit form state
  const [editName, setEditName] = useState(profile.displayName);
  const [editTag, setEditTag] = useState(profile.senderTag);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editCompany, setEditCompany] = useState(profile.company);
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile.avatarUrl);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editName.trim()) {
      showToast('Please provide your full legal or business name');
      return;
    }
    setProfile((prev) => ({
      ...prev,
      displayName: editName.trim(),
      senderTag: editTag.trim().replace(/^@/, ''),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      company: editCompany.trim(),
      avatarUrl: editAvatarUrl,
    }));
    showToast('Profile credentials successfully updated');
    setActiveTab('profile');
  };

  const handleResetAvatar = () => {
    setEditAvatarUrl(DEFAULT_AVATARS[0]!);
    showToast('Avatar reset to default profile photo');
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    showToast('App settings reset to factory defaults');
  };

  const handleClearCache = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('bayniks_recent_searches');
        localStorage.removeItem('bayniks_map_tile_cache');
      } catch {
        // Safe fallback
      }
    }
    showToast('Route & map cache successfully purged (14.2 MB freed)');
  };

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      showToast('Signed out of Bayniks Logistics session');
      router.push('/auth/signin');
    }
  };

  return (
    <div className="min-h-full w-full flex flex-col justify-between bg-neutral-50/60 text-neutral-900 pb-16">
      {/* ========================================================================= */}
      {/* 1. PROFILE OVERVIEW TAB                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-6 flex flex-col space-y-5">
          {/* Top Header Matching bayniks.edition screenProfile */}
          <header className="flex items-center justify-between pb-3 border-b border-neutral-200/90 shrink-0">
            <button
              type="button"
              onClick={onBackClick || (() => router.push('/'))}
              aria-label="Back to dashboard"
              className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 bg-white text-neutral-800 hover:bg-neutral-100 border border-neutral-200 shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-900" />
            </button>
            <h2 className="text-sm md:text-base font-extrabold tracking-tight text-neutral-900">
              Account & Profile
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              aria-label="Open settings"
              className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 bg-white text-neutral-800 hover:bg-neutral-100 border border-neutral-200 shadow-2xs cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-neutral-900" />
            </button>
          </header>

          {/* User Identity Hero Card (Pure dark card matching bayniks.edition) */}
          <div className="rounded-[28px] p-5 md:p-6 relative overflow-hidden border shadow-xl bg-neutral-900 text-white border-neutral-800">
            <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-[#FF6D1F]/15 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center space-x-4 relative z-10">
              <div
                className="relative cursor-pointer group"
                onClick={() => setActiveTab('edit')}
                title="Click to edit avatar"
              >
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#FF6D1F] shadow-md group-hover:scale-105 transition"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-extrabold">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-base md:text-lg font-extrabold truncate text-white">
                      {profile.displayName}
                    </h3>
                    {profile.isPro && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FF6D1F] text-white text-[9px] font-extrabold uppercase shrink-0 shadow-xs">
                        PRO
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition active:scale-95 shrink-0 flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>
                <p className="text-xs text-neutral-300 mt-0.5 font-mono">
                  +234 {profile.phone}
                </p>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {profile.email}
                </p>
                <p className="text-[10px] text-[#FB923C] font-semibold truncate mt-0.5">
                  @{profile.senderTag} • {profile.company}
                </p>
              </div>
            </div>

            {/* Quick Balance Bar inside Identity Card */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                  Delivery Balance
                </span>
                <div className="text-lg md:text-xl font-black text-white font-mono mt-0.5">
                  {formatNaira(profile.walletBalanceKobo)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/wallet')}
                className="px-4 py-2 rounded-xl bg-[#FF6D1F] hover:bg-[#EA580C] text-white text-xs font-extrabold shadow-bolt-glow transition active:scale-95 cursor-pointer"
              >
                + Top Up
              </button>
            </div>
          </div>

          {/* Group 1: Logistics & Fleet Workstation */}
          <div className="rounded-3xl p-2 md:p-3 border space-y-1 bg-white border-neutral-200/90 shadow-card-soft">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 px-3 py-1 block">
              Logistics & Fleet Workstation
            </span>

            {/* Active Deliveries */}
            <div
              onClick={() => router.push('/deliveries')}
              className="p-3 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-neutral-900">Active Deliveries</span>
                  <span className="text-[10px] text-neutral-400">Live courier telemetry & OTPs</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                2 Live
              </span>
            </div>

            {/* Repeat Delivery Templates */}
            <div
              onClick={() => router.push('/repeat')}
              className="p-3 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-neutral-100 text-neutral-800 border-neutral-200">
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-neutral-900">Repeat Delivery Templates</span>
                  <span className="text-[10px] text-neutral-400">1-tap re-order for frequent corridors (4)</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>

            {/* Schedule Delivery */}
            <div
              onClick={() => router.push('/schedule')}
              className="p-3 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-neutral-100 text-neutral-800 border-neutral-200">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-neutral-900">Schedule a Delivery</span>
                  <span className="text-[10px] text-neutral-400">Reserve pickup & drop-off time slots</span>
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                94% Open
              </span>
            </div>

            {/* Saved Addresses */}
            <div
              onClick={() => router.push('/addresses')}
              className="p-3 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF6D1F] flex items-center justify-center border border-[#FF6D1F]/20">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-neutral-900">Saved Addresses</span>
                  <span className="text-[10px] text-neutral-400">Home, Studio & Lagos Depot (3)</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>

            {/* Payment Methods & Wallet */}
            <div
              onClick={() => router.push('/wallet')}
              className="p-3 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-neutral-100 text-neutral-800 border-neutral-200">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-neutral-900">Payment Methods & Cards</span>
                  <span className="text-[10px] text-neutral-400">Mastercard •••• 4022 (Default)</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>

            {/* Past Delivery History */}
            <div
              onClick={() => router.push('/history')}
              className="p-3 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-neutral-100 text-neutral-800 border-neutral-200">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-neutral-900">Delivery Waybill Archive</span>
                  <span className="text-[10px] text-neutral-400">14 completed & past dispatches</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </div>

          {/* Group 2: App Settings & Security */}
          <div className="rounded-3xl p-2 md:p-3 border space-y-1 bg-white border-neutral-200/90 shadow-card-soft">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 px-3 py-1 block">
              Workspace & Support
            </span>

            {/* Live Chat with Rider */}
            <div
              onClick={() => router.push('/chat')}
              className="p-3 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF6D1F] flex items-center justify-center border border-[#FF6D1F]/20">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-neutral-900">Chat with Courier (Tariq)</span>
                  <span className="text-[10px] text-neutral-400">Bajaj Boxer • LND-4912 • OTP 4829</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-orange-50 text-[#FF6D1F] border border-orange-200 flex items-center gap-1">
                <span>Live</span>
                <Bike className="w-3 h-3" />
              </span>
            </div>

            {/* 24/7 Support Desk */}
            <div
              onClick={() => router.push('/support')}
              className="p-3 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-neutral-900">24/7 Support & Help Center</span>
                  <span className="text-[10px] text-neutral-400">Live agent chat & WhatsApp desk</span>
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Online
              </span>
            </div>

            {/* Notifications */}
            <div
              onClick={() => router.push('/notifications')}
              className="p-3 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-neutral-100 text-neutral-800 border-neutral-200">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-neutral-900">Notifications</span>
                  <span className="text-[10px] text-neutral-400">Activity, dispatch & security alerts</span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-[#FF6D1F] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                3 New
              </span>
            </div>

            {/* App Settings */}
            <div
              onClick={() => setActiveTab('settings')}
              className="p-3 rounded-2xl flex items-center justify-between cursor-pointer transition hover:bg-neutral-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-neutral-100 text-neutral-800 border-neutral-200">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-neutral-900">App Settings & Security</span>
                  <span className="text-[10px] text-neutral-400">OTP release, insurance & biometrics</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3.5 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-2 transition active:scale-[0.98] bg-white border-neutral-200 text-rose-600 hover:bg-rose-50 shadow-2xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT PROFILE SUBVIEW                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'edit' && (
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-6 flex flex-col space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200/90 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              aria-label="Back to profile"
              className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 bg-white text-neutral-800 hover:bg-neutral-100 border border-neutral-200 shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-900" />
            </button>
            <h2 className="text-sm md:text-base font-extrabold tracking-tight text-neutral-900">
              Edit Profile
            </h2>
            <button
              type="button"
              onClick={() => handleSaveProfile()}
              className="text-xs font-extrabold text-[#FF6D1F] hover:underline px-2 py-1 cursor-pointer"
            >
              Save
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar Photo Row */}
            <div className="flex items-center space-x-4 p-5 rounded-3xl border bg-white border-neutral-200/90 shadow-card-soft">
              <img
                src={editAvatarUrl}
                alt="Avatar Preview"
                className="w-16 h-16 rounded-full object-cover border-2 border-[#FF6D1F] shadow-md"
              />
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold text-neutral-900">Profile Picture</h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-extrabold shadow-2xs transition active:scale-95 bg-neutral-50 border-neutral-300 text-neutral-800 hover:border-[#FF6D1F] cursor-pointer"
                  >
                    Choose Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className="px-2.5 py-1.5 text-xs font-bold text-neutral-400 hover:text-neutral-900 transition cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3 bg-white p-5 rounded-3xl border border-neutral-200/90 shadow-card-soft">
              <div>
                <label htmlFor="editProfileNameInput" className="block text-xs font-bold mb-1 text-neutral-800">
                  Full Name
                </label>
                <input
                  id="editProfileNameInput"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  placeholder="Kainul Stevano"
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border transition focus:outline-none focus:border-[#FF6D1F] bg-neutral-50 text-neutral-900 border-neutral-200 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="editProfileTagInput" className="block text-xs font-bold mb-1 text-neutral-800">
                  Username / Sender Tag
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-xs text-neutral-400 font-mono">@</span>
                  <input
                    id="editProfileTagInput"
                    type="text"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    placeholder="kainul_stevano"
                    className="w-full text-xs font-semibold pl-8 pr-4 py-3 rounded-2xl border transition focus:outline-none focus:border-[#FF6D1F] bg-neutral-50 text-neutral-900 border-neutral-200 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="editProfilePhoneInput" className="block text-xs font-bold mb-1 text-neutral-800">
                  Phone Number
                </label>
                <div className="flex items-center space-x-2">
                  <div className="border rounded-2xl px-3 py-3 flex items-center space-x-1 shrink-0 bg-white border-neutral-200 text-neutral-900">
                    <span className="font-mono text-xs font-bold text-neutral-600">NG</span>
                    <span className="text-xs font-mono font-bold">+234</span>
                  </div>
                  <input
                    id="editProfilePhoneInput"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="812 345 6789"
                    className="w-full text-xs font-mono font-bold px-4 py-3 rounded-2xl border transition focus:outline-none focus:border-[#FF6D1F] bg-neutral-50 text-neutral-900 border-neutral-200 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="editProfileEmailInput" className="block text-xs font-bold mb-1 text-neutral-800">
                  Email Address
                </label>
                <input
                  id="editProfileEmailInput"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="kainul.designs@boltmail.com"
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border transition focus:outline-none focus:border-[#FF6D1F] bg-neutral-50 text-neutral-900 border-neutral-200 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="editProfileCompanyInput" className="block text-xs font-bold mb-1 text-neutral-800">
                  Company / Organization
                </label>
                <input
                  id="editProfileCompanyInput"
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  placeholder="Kainul Studios & Logistics LTD"
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border transition focus:outline-none focus:border-[#FF6D1F] bg-neutral-50 text-neutral-900 border-neutral-200 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 px-5 bg-[#FF6D1F] hover:bg-[#EA580C] text-white font-extrabold text-sm rounded-2xl shadow-bolt-glow transition active:scale-[0.98] cursor-pointer"
            >
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SETTINGS & PREFERENCES SUBVIEW                                         */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-6 flex flex-col space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200/90 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              aria-label="Back to profile"
              className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 bg-white text-neutral-800 hover:bg-neutral-100 border border-neutral-200 shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-900" />
            </button>
            <h2 className="text-sm md:text-base font-extrabold tracking-tight text-neutral-900">
              App Settings
            </h2>
            <button
              type="button"
              onClick={handleResetSettings}
              className="text-xs font-extrabold text-neutral-400 hover:text-neutral-900 px-2 py-1 transition cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Security & Preferences */}
          <div className="rounded-3xl p-5 border space-y-3 bg-white border-neutral-200/90 text-neutral-900 shadow-card-soft">
            <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 block mb-2">
              Dispatch & Safety
            </span>

            {/* OTP Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div>
                <h5 className="text-xs font-bold text-neutral-900">Handover OTP Release</h5>
                <p className="text-[10px] text-neutral-400">Require 4-digit code for physical handoff</p>
              </div>
              <input
                id="settingOtpToggle"
                type="checkbox"
                checked={settings.handoverOtpRequired}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, handoverOtpRequired: e.target.checked }))
                }
                className="w-4 h-4 accent-[#FF6D1F] cursor-pointer"
              />
            </div>

            {/* Insurance Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div>
                <h5 className="text-xs font-bold text-neutral-900">₦500k Cargo Insurance</h5>
                <p className="text-[10px] text-neutral-400">Auto-include extended parcel liability</p>
              </div>
              <input
                id="settingInsuranceToggle"
                type="checkbox"
                checked={settings.cargoInsuranceEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, cargoInsuranceEnabled: e.target.checked }))
                }
                className="w-4 h-4 accent-[#FF6D1F] cursor-pointer"
              />
            </div>

            {/* Biometrics Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <h5 className="text-xs font-bold text-neutral-900">Biometric Login / Face ID</h5>
                <p className="text-[10px] text-neutral-400">Authenticate with device biometrics</p>
              </div>
              <input
                id="settingBioToggle"
                type="checkbox"
                checked={settings.biometricsEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, biometricsEnabled: e.target.checked }))
                }
                className="w-4 h-4 accent-[#FF6D1F] cursor-pointer"
              />
            </div>
          </div>

          {/* Clear Cache Button */}
          <button
            type="button"
            onClick={handleClearCache}
            className="w-full py-4 px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center space-x-2 transition active:scale-[0.98] bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-2xs cursor-pointer"
          >
            <span>Clear Route & Map Cache</span>
          </button>

          {/* App Version Info */}
          <div className="text-center pt-2">
            <span className="text-[11px] font-mono text-neutral-400">
              Bayniks Web v2.4.0 (Build 2026.11) • Lagos, NG
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AVATAR PICKER MODAL                                                       */}
      {/* ========================================================================= */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-3xl p-6 max-w-sm w-full space-y-4 border shadow-2xl bg-white border-neutral-200 text-neutral-900 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-neutral-900">Select Profile Photo</h3>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2">
              {DEFAULT_AVATARS.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    setEditAvatarUrl(url);
                    setIsAvatarModalOpen(false);
                    showToast(`Avatar preset #${index + 1} chosen`);
                  }}
                  className={`p-1.5 rounded-2xl border-2 transition cursor-pointer ${
                    editAvatarUrl === url ? 'border-[#FF6D1F] scale-95' : 'border-transparent hover:border-neutral-300'
                  }`}
                >
                  <img
                    src={url}
                    alt={`Preset ${index + 1}`}
                    className="w-full h-24 rounded-xl object-cover"
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#FF6D1F] text-white text-xs font-extrabold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-neutral-700 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
