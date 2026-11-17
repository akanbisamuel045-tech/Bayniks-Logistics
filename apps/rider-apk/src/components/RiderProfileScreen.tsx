import React from 'react';
import {
  Pencil,
  User,
  CreditCard,
  Landmark,
  FileText,
  MessageSquareWarning,
  Bell,
  LogOut,
  Menu,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { DynamicDetailSheetType } from './sheets/DynamicDetailSheet';

export interface RiderProfileScreenProps {
  onOpenEditProfile: () => void;
  onOpenDetailSheet: (type: DynamicDetailSheetType) => void;
  onEndShift: () => void;
  onOpenDrawer?: () => void;
}

export const RiderProfileScreen: React.FC<RiderProfileScreenProps> = ({
  onOpenEditProfile,
  onOpenDetailSheet,
  onEndShift,
  onOpenDrawer,
}) => {
  const { tripsCompletedToday, showToast, riderName, plateNumber } = useRiderStore();

  const handleCopyId = () => {
    showToast('Rider ID #BN-8492 copied');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('#BN-8492');
    }
  };

  const careerDeliveries = 542 + tripsCompletedToday;

  return (
    <section id="screen-profile" className="tab-screen active" data-testid="screen-profile">
      <div className="stack-14">
        {/* Page Title Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 0 2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onOpenDrawer && (
              <button
                type="button"
                onClick={onOpenDrawer}
                aria-label="Open Navigation Drawer"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-neutral)',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                data-testid="profile-drawer-toggle-btn"
              >
                <Menu size={16} />
              </button>
            )}
            <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>Profile</h1>
          </div>
          <button
            type="button"
            className="pill-peach-btn"
            onClick={handleCopyId}
            data-testid="profile-copy-id-btn"
          >
            <span className="tabular-num">ID: #BN-8492</span>
            <span>📋</span>
          </button>
        </div>

        {/* Centered Regular Mobile Profile Header Card */}
        <div className="profile-top-card" data-testid="profile-top-card">
          <div
            className="profile-avatar-lg"
            onClick={onOpenEditProfile}
            style={{ cursor: 'pointer' }}
            title="Edit Profile"
            data-testid="profile-avatar-btn"
          >
            <div className="profile-avatar-inner">JO</div>
            <span className="profile-avatar-edit-badge">
              <Pencil size={12} strokeWidth={2.6} />
            </span>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {riderName || 'Joseph Okon'}
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
            Express Bike • <span className="tabular-num" style={{ color: 'var(--text-primary)' }}>{plateNumber || 'BLT-4912'}</span>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
            <span
              style={{
                padding: '3px 9px',
                borderRadius: '999px',
                background: 'var(--accent-emerald-bg)',
                color: 'var(--accent-emerald-text)',
                fontSize: '10.5px',
                fontWeight: 800,
              }}
            >
              KYC Level 2 Verified ✓
            </span>
            <span
              className="pro-badge"
              style={{
                background: 'var(--accent-peach)',
                color: 'var(--accent-orange)',
                borderColor: 'var(--accent-peach-border)',
              }}
            >
              PRO TIER
            </span>
          </div>

          {/* Clean 3-Column Career Stats Strip */}
          <div className="profile-stats-row">
            <div className="profile-stat-cell">
              <span className="tabular-num" style={{ fontSize: '15px' }}>
                4.95 ★
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Rating</span>
            </div>
            <div className="profile-stat-cell">
              <span id="profileCompletedStat" className="tabular-num" style={{ fontSize: '15px' }} data-testid="profile-completed-stat">
                {careerDeliveries}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Deliveries</span>
            </div>
            <div className="profile-stat-cell">
              <span className="tabular-num" style={{ fontSize: '15px' }}>
                98.2%
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Acceptance</span>
            </div>
          </div>
        </div>

        {/* Group 1: Account & Earnings */}
        <div>
          <span className="menu-section-heading">Account &amp; Earnings</span>
          <div className="menu-group-card">
            <button
              type="button"
              className="menu-row-btn"
              onClick={() => onOpenDetailSheet('personal')}
              data-testid="menu-btn-personal"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="menu-row-icon">
                  <User size={18} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="menu-row-title">Personal Information</div>
                  <div className="menu-row-sub">+234 803 421 8900 • Yaba Central</div>
                </div>
              </div>
              <span className="menu-chevron">›</span>
            </button>

            <button
              type="button"
              className="menu-row-btn"
              onClick={() => onOpenDetailSheet('earnings')}
              data-testid="menu-btn-earnings"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="menu-row-icon orange">
                  <CreditCard size={18} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="menu-row-title">Earnings &amp; Wallet</div>
                  <div className="menu-row-sub">Balance: ₦92,300.00 • Today: ₦18,450</div>
                </div>
              </div>
              <span className="menu-chevron">›</span>
            </button>

            <button
              type="button"
              className="menu-row-btn"
              onClick={() => onOpenDetailSheet('bank')}
              data-testid="menu-btn-bank"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="menu-row-icon emerald">
                  <Landmark size={18} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="menu-row-title">Payout Bank Account</div>
                  <div className="menu-row-sub">Guaranty Trust Bank •••• 8291</div>
                </div>
              </div>
              <span className="menu-chevron">›</span>
            </button>
          </div>
        </div>

        {/* Group 2: Vehicle, Safety & Support */}
        <div>
          <span className="menu-section-heading">Vehicle, Safety &amp; Support</span>
          <div className="menu-group-card">
            <button
              type="button"
              className="menu-row-btn"
              onClick={() => onOpenDetailSheet('vehicle')}
              data-testid="menu-btn-vehicle"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="menu-row-icon">
                  <FileText size={18} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="menu-row-title">Vehicle &amp; Documents</div>
                  <div className="menu-row-sub">Bajaj Boxer BM150 • 3 Verified Docs</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: 'var(--accent-emerald-text)',
                  background: 'var(--accent-emerald-bg)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                }}
              >
                Active
              </span>
              <span className="menu-chevron">›</span>
            </button>

            <button
              type="button"
              className="menu-row-btn"
              onClick={() => onOpenDetailSheet('support_sos')}
              data-testid="menu-btn-support-sos"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="menu-row-icon red">
                  <MessageSquareWarning size={18} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="menu-row-title">Help, Support &amp; Roadside SOS</div>
                  <div className="menu-row-sub">24/7 Live Dispatch Chat &amp; Emergency SOS</div>
                </div>
              </div>
              <span className="menu-chevron">›</span>
            </button>
          </div>
        </div>

        {/* Group 3: Preferences (Dark mode omitted permanently per instructions) */}
        <div>
          <span className="menu-section-heading">Preferences</span>
          <div className="menu-group-card">
            <button
              type="button"
              className="menu-row-btn"
              onClick={() => onOpenDetailSheet('notifications')}
              data-testid="menu-btn-notifications"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="menu-row-icon">
                  <Bell size={18} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="menu-row-title">Notifications &amp; Surge Alerts</div>
                  <div className="menu-row-sub">Audio dispatch chimes &amp; hub alerts enabled</div>
                </div>
              </div>
              <span className="menu-chevron">›</span>
            </button>
          </div>
        </div>

        {/* End Shift / Sign Out Row */}
        <div className="menu-group-card">
          <button
            type="button"
            className="menu-row-btn"
            onClick={onEndShift}
            data-testid="menu-btn-end-shift"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
              <div className="menu-row-icon red">
                <LogOut size={18} strokeWidth={2.2} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="menu-row-title" style={{ color: 'var(--accent-red-text)' }}>
                  End Shift &amp; Go Offline
                </div>
                <div className="menu-row-sub">Pause incoming delivery dispatches</div>
              </div>
            </div>
            <span className="menu-chevron">›</span>
          </button>
        </div>
      </div>
    </section>
  );
};

