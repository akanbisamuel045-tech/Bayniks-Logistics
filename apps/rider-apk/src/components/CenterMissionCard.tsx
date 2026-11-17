import React from 'react';
import { Power, Phone, Navigation, QrCode } from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { MissionProgressBar } from './MissionProgressBar';
import { playMissionAcceptChime, playKeypadChime } from '../utils/audioChimes';

export interface CenterMissionCardProps {
  onOpenVerification?: (mode?: 'qr' | 'otp') => void;
  onOpenFullMap?: () => void;
}

function formatKoboToNaira(kobo: number): string {
  const naira = Math.floor(kobo / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

export const CenterMissionCard: React.FC<CenterMissionCardProps> = ({
  onOpenVerification,
  onOpenFullMap,
}) => {
  const {
    riderStatus,
    tripPhase,
    activeOrder,
    toggleOnlineStatus,
    triggerDemoOffer,
    advanceTripPhase,
    setQuickQrOpen,
    showToast,
  } = useRiderStore();

  const isOnline = riderStatus === 'available';
  const hasActiveMission = Boolean(activeOrder && tripPhase !== 'idle');

  // Step calculations for State 3 (Active Mission)
  let stepNumber: 1 | 2 | 3 | 4 = 1;
  let stepTitle = 'Step 1 of 4: En Route to Pickup';
  let etaText = 'ETA 6 min';
  let stepChipLabel = 'To Pickup';
  let callPartyLabel = 'Call Sender';
  let advanceBtnLabel = 'Arrived at Pickup Location →';

  if (tripPhase === 'at_pickup') {
    stepNumber = 2;
    stepTitle = 'Step 2 of 4: Parcel Collection';
    etaText = 'At Pickup Depot';
    stepChipLabel = 'At Pickup';
    callPartyLabel = 'Call Sender';
    advanceBtnLabel = 'Confirm Package Collected →';
  } else if (tripPhase === 'in_transit') {
    stepNumber = 3;
    stepTitle = 'Step 3 of 4: In Transit to Drop-Off';
    etaText = 'ETA 12 min';
    stepChipLabel = 'In Transit';
    callPartyLabel = 'Call Recipient';
    advanceBtnLabel = 'Arrived at Destination →';
  } else if (tripPhase === 'at_dropoff') {
    stepNumber = 4;
    stepTitle = 'Step 4 of 4: Handover Verification';
    etaText = 'At Destination';
    stepChipLabel = 'At Drop-off';
    callPartyLabel = 'Call Recipient';
    advanceBtnLabel = 'Verify Delivery Handover →';
  }

  const activeStop = activeOrder?.stops?.[0];

  const handleAdvanceStep = async () => {
    playMissionAcceptChime();
    await advanceTripPhase();
    if (stepNumber === 1) {
      showToast('Arrived at Pickup • Inspect parcel & seal');
    } else if (stepNumber === 2) {
      showToast('Parcel collected! In transit to destination');
    } else if (stepNumber === 3) {
      showToast('Arrived at Drop-off • Verify QR or 4-digit OTP');
    }
  };

  const handleCallParty = () => {
    playKeypadChime();
    if (stepNumber <= 2) {
      const sender = activeOrder?.pickup?.contactName || 'Kuchi Empire';
      const phone = activeOrder?.pickup?.contactPhone || '+234 802 555 0192';
      showToast(`Calling Sender: ${sender} (${phone})...`);
    } else {
      const recipient = activeStop?.recipientName || 'Sarah Jenkins';
      const phone = activeStop?.recipientPhone || '+234 809 334 8821';
      showToast(`Calling Recipient: ${recipient} (${phone})...`);
    }
  };

  const handleOpenFullMap = () => {
    playKeypadChime();
    if (onOpenFullMap) {
      onOpenFullMap();
    } else {
      showToast('Full Lagos Tactical Map view opened');
    }
  };

  const handleOpenVerification = () => {
    playKeypadChime();
    setQuickQrOpen(true);
    if (onOpenVerification) {
      onOpenVerification('qr');
    }
  };

  const handleSendCannedSms = (msg: string) => {
    playKeypadChime();
    const recipient = activeStop?.recipientName || 'Sarah Jenkins';
    showToast(`Sent SMS to ${recipient}: "${msg}"`);
  };

  // --------------------------------------------------------------------------
  // STATE 1: Offline Standby Prompt
  // --------------------------------------------------------------------------
  if (!isOnline && !hasActiveMission) {
    return (
      <div id="cardStateOffline" className="surface-card orange-frame" data-testid="card-state-offline">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="micro-label">SHIFT DISPATCH STANDBY</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Capacity 0/1</span>
        </div>
        <h2 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em' }}>Go Online to start earning</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '14px' }}>
          Switch online to receive instant delivery assignments in Yaba & Victoria Island. Strict 1-delivery capacity lock active.
        </p>
        <button
          type="button"
          className="btn-orange-xl"
          onClick={() => toggleOnlineStatus()}
          data-testid="btn-go-online"
        >
          <Power size={18} strokeWidth={2.5} />
          <span>Go Online & Find Deliveries</span>
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 2: Online Radar Scanning / Idle
  // --------------------------------------------------------------------------
  if (isOnline && !hasActiveMission) {
    return (
      <div id="cardStateScanning" className="surface-card orange-frame" data-testid="card-state-scanning">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="live-chip"><span className="live-chip-dot" /> ONLINE • SCANNING</span>
          <span className="tabular-num" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Capacity: 0/1</span>
        </div>
        <h2 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em' }}>Scanning Yaba & VI corridor...</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '14px' }}>
          High demand detected (+₦1,250 surge). Incoming requests require acceptance within 30 seconds.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '8px' }}>
          <button
            type="button"
            className="btn-orange-xl"
            style={{ height: '48px', fontSize: '13px' }}
            onClick={triggerDemoOffer}
            data-testid="btn-simulate-dispatch"
          >
            <span>Simulate Dispatch ⚡</span>
          </button>
          <button
            type="button"
            className="btn-neutral-xl"
            style={{ height: '48px', fontSize: '13px' }}
            onClick={() => toggleOnlineStatus()}
            data-testid="btn-go-offline"
          >
            <span>Go Offline</span>
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 3: Active Mission Card (N=1 Locked)
  // --------------------------------------------------------------------------
  return (
    <div id="cardStateActiveMission" className="surface-card orange-frame" data-testid="card-state-active-mission">
      {/* Header: Tracking Code + Guaranteed Pay */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <span className="micro-label">ACTIVE MISSION (1/1 LOCKED)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '2px' }}>
            <span className="tabular-num" style={{ fontSize: '16px', fontWeight: 800 }} data-testid="mission-tracking-code">
              {activeOrder?.trackingCode || '#BF-48291'}
            </span>
            <span id="missionStatusChip" className="live-chip" data-testid="mission-status-chip">
              <span className="live-chip-dot" /> {stepChipLabel}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="micro-label">GUARANTEED PAY</span>
          <span className="tabular-num" style={{ fontSize: '16px', color: 'var(--accent-orange)' }} data-testid="mission-pay">
            {formatKoboToNaira(activeOrder?.riderEarningKobo || 320000)}
          </span>
        </div>
      </div>

      {/* 4-Step Progress Bar */}
      <MissionProgressBar
        currentStep={stepNumber}
        stepTitle={stepTitle}
        etaText={etaText}
      />

      {/* Dual-Column Pickup & Destination Breakdown */}
      <div className="dual-route-boxes" data-testid="dual-route-boxes">
        <div className="sub-card">
          <span className="micro-label">PICKUP</span>
          <div className="node-title">{activeOrder?.pickup?.contactName || 'Kuchi Empire'}</div>
          <span className="micro-label" style={{ marginTop: '6px' }}>FROM</span>
          <div className="node-sub">{activeOrder?.pickup?.address || '14 Commercial Ave, Yaba'}</div>
        </div>
        <div className="sub-card">
          <span className="micro-label">RECIPIENT</span>
          <div className="node-title">{activeStop?.recipientName || 'Sarah Jenkins'}</div>
          <span className="micro-label" style={{ marginTop: '6px' }}>TO</span>
          <div className="node-sub">{activeStop?.dropoffAddress || 'Victoria Island Towers, Plot 4'}</div>
        </div>
      </div>

      {/* Package, Fragility & Goods Weight Summary */}
      <div className="sub-card" style={{ marginBottom: '12px' }} data-testid="package-summary-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className="micro-label">GOODS TO DELIVER</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', background: 'var(--accent-red-bg)', color: 'var(--accent-red-text)', border: '1px solid rgba(239,68,68,0.35)', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em' }}>
                ⚠️ FRAGILE
              </span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, marginTop: '4px' }}>
              {activeStop?.packageDescription || 'Sealed Electronics & Glassware (Medium Box)'}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span className="micro-label">WEIGHT</span>
            <span className="tabular-num" style={{ fontSize: '13px', color: 'var(--accent-orange)' }}>
              4.5 kg
            </span>
          </div>
        </div>
        <div style={{ marginTop: '8px', paddingTop: '7px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', fontWeight: 700, color: 'var(--accent-red-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Handle with Care • Keep upright & cushion inside 60L box</span>
        </div>
      </div>

      {/* Step 2 Parcel Inspection Checklist (Only visible in Step 2) */}
      {stepNumber === 2 && (
        <div id="step2ChecklistBox" className="stack-10" style={{ marginBottom: '12px' }} data-testid="step2-checklist">
          <label className="check-item-row">
            <input type="checkbox" defaultChecked />
            <span>Verify Waybill {activeOrder?.trackingCode || '#BF-48291'} & Sender Seal</span>
          </label>
          <label className="check-item-row">
            <input type="checkbox" defaultChecked />
            <span>Confirm Fragile label & upright cushioning in 60L box</span>
          </label>
        </div>
      )}

      {/* Step 3 Canned SMS Updates (Only visible in Step 3) */}
      {stepNumber === 3 && (
        <div id="step3SmsBox" style={{ marginBottom: '12px' }} data-testid="step3-sms-box">
          <span className="micro-label" style={{ marginBottom: '6px' }}>QUICK RECIPIENT SMS</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="pill-peach-btn"
              onClick={() => handleSendCannedSms('I am 5 minutes away from your location')}
            >
              🛵 5 mins away
            </button>
            <button
              type="button"
              className="pill-peach-btn"
              onClick={() => handleSendCannedSms('I have arrived at the security gate')}
            >
              🏢 At security gate
            </button>
            <button
              type="button"
              className="pill-peach-btn"
              onClick={() => handleSendCannedSms('Please come down with your 4-digit OTP')}
            >
              🔢 Ready for OTP
            </button>
          </div>
        </div>
      )}

      {/* Call Contact & Full Map Action Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <button
          type="button"
          className="btn-neutral-xl"
          style={{ height: '46px', fontSize: '12px' }}
          onClick={handleCallParty}
          data-testid="btn-call-party"
        >
          <Phone size={15} strokeWidth={2.3} />
          <span id="callPartyLabel">{callPartyLabel}</span>
        </button>
        <button
          type="button"
          className="btn-neutral-xl"
          style={{ height: '46px', fontSize: '12px' }}
          onClick={handleOpenFullMap}
          data-testid="btn-full-map"
        >
          <Navigation size={15} strokeWidth={2.3} />
          <span>Full Map</span>
        </button>
      </div>

      {/* Step Progression CTA (Steps 1 to 3) */}
      {stepNumber < 4 && (
        <div id="stepAdvanceWrap">
          <button
            type="button"
            className="btn-orange-xl"
            onClick={handleAdvanceStep}
            data-testid="btn-advance-step"
          >
            <span id="stepAdvanceBtnLabel" data-testid="step-advance-btn-label">
              {advanceBtnLabel}
            </span>
          </button>
        </div>
      )}

      {/* Step 4 Dual Handover Verification Triggers */}
      {stepNumber === 4 && (
        <div id="step4VerifyButtons" className="stack-10" data-testid="step4-verify-buttons">
          <button
            type="button"
            className="btn-orange-xl"
            onClick={handleOpenVerification}
            data-testid="btn-verify-handover"
          >
            <QrCode size={18} strokeWidth={2.4} />
            <span>Scan QR / OTP Handover →</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CenterMissionCard;
