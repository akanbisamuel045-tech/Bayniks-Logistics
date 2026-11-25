import React, { useState } from 'react';
import { useRiderStore } from '../../store/riderStore';
import { playMissionAcceptChime, playErrorChime } from '../../utils/audioChimes';
import { VirtualDebtMeter } from '../VirtualDebtMeter';

export type DynamicDetailSheetType =
  | 'personal'
  | 'earnings'
  | 'bank'
  | 'vehicle'
  | 'support_sos'
  | 'cashout'
  | 'notifications';

export interface DynamicDetailSheetProps {
  isOpen: boolean;
  viewType: DynamicDetailSheetType;
  onClose: () => void;
  onOpenEditProfile?: () => void;
  onOpenCashout?: () => void;
  onOpenDebtTopUp?: () => void;
}

export const DynamicDetailSheet: React.FC<DynamicDetailSheetProps> = ({
  isOpen,
  viewType,
  onClose,
  onOpenEditProfile,
  onOpenCashout,
  onOpenDebtTopUp,
}) => {
  const {
    todayEarningsKobo,
    tripsCompletedToday,
    chatMessages,
    sendChatMessage,
    showToast,
    walletBalanceKobo,
    isDebtLocked,
    riderName,
    plateNumber,
    riderUser,
    simulationMode,
  } = useRiderStore();

  const displayName = riderName || riderUser?.fullName || (simulationMode ? 'Joseph Okon' : 'Courier Rider');
  const displayPlate = plateNumber || riderUser?.plateNumber || (simulationMode ? 'BLT-4912' : 'No Plate Linked');
  const displayEmail = riderUser?.email || (riderName ? `${riderName.toLowerCase().replace(/\s+/g, '.')}@bayniks.ng` : (simulationMode ? 'joseph.okon@bayniks.ng' : 'rider@bayniks.ng'));

  const [walletBalance, setWalletBalance] = useState(92300);
  const [cashoutAmount, setCashoutAmount] = useState('25000');
  const [chatInput, setChatInput] = useState('');
  const [selectedChartDay, setSelectedChartDay] = useState(5); // Saturday
  const [payouts, setPayouts] = useState<{ bank: string; date: string; amount: number }[]>(
    simulationMode
      ? [
          { bank: 'Guaranty Trust Bank •••• 8291', date: 'Yesterday • 18:40', amount: 24500 },
          { bank: 'Guaranty Trust Bank •••• 8291', date: '12 Nov • 19:15', amount: 31200 },
        ]
      : []
  );

  if (!isOpen) return null;

  const currentWalletKobo = walletBalanceKobo !== undefined ? walletBalanceKobo : walletBalance * 100;
  const isWalletNegative = currentWalletKobo < 0;
  const todayFormatted = `₦${(todayEarningsKobo / 100).toLocaleString()}`;
  const walletFormatted = isWalletNegative
    ? `-₦${Math.floor(Math.abs(currentWalletKobo) / 100).toLocaleString('en-NG')}.00`
    : `₦${Math.floor(currentWalletKobo / 100).toLocaleString('en-NG')}.00`;

  const weekChart = [
    { day: 'Mon', pct: 45, val: 14200 },
    { day: 'Tue', pct: 60, val: 19500 },
    { day: 'Wed', pct: 35, val: 11000 },
    { day: 'Thu', pct: 70, val: 22400 },
    { day: 'Fri', pct: 85, val: 26800 },
    { day: 'Sat', pct: 65, val: todayEarningsKobo / 100 || 18450 },
    { day: 'Sun', pct: 20, val: 6200 },
  ];

  const handleProcessCashout = () => {
    const amt = Number(cashoutAmount);
    if (!amt || amt < 1000) {
      playErrorChime();
      showToast('Minimum cash-out amount is ₦1,000');
      return;
    }
    if (amt > walletBalance) {
      playErrorChime();
      showToast('Amount exceeds available wallet balance');
      return;
    }

    setWalletBalance((prev) => prev - amt);
    setPayouts((prev) => [
      {
        bank: 'Guaranty Trust Bank •••• 8291',
        date: 'Just now • Instant Settlement',
        amount: amt,
      },
      ...prev,
    ]);
    playMissionAcceptChime();
    showToast(`₦${amt.toLocaleString()} transferred to GTBank 0148298291 ⚡`);
    onClose();
  };

  const handleSendChat = (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;
    sendChatMessage(text);
    setChatInput('');
  };

  let kicker = 'DETAILS';
  let title = 'Details';

  if (viewType === 'personal') {
    kicker = 'PERSONAL & HUB PROFILE';
    title = 'Personal Information';
  } else if (viewType === 'earnings') {
    kicker = 'RIDER WALLET & LEDGER';
    title = 'Earnings & Wallet';
  } else if (viewType === 'bank') {
    kicker = 'SETTLEMENT ACCOUNT';
    title = 'Payout Bank Account';
  } else if (viewType === 'vehicle') {
    kicker = 'FLEET & COMPLIANCE';
    title = 'Vehicle & Documents';
  } else if (viewType === 'support_sos') {
    kicker = '24/7 RIDER ASSISTANCE';
    title = 'Support & Roadside SOS';
  } else if (viewType === 'cashout') {
    kicker = 'INSTANT BANK SETTLEMENT';
    title = 'Cash Out Wallet';
  } else if (viewType === 'notifications') {
    kicker = 'COURIER ALERTS';
    title = 'Notifications';
  }

  return (
    <div
      id="sheetDynamicDetail"
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      data-testid="sheet-dynamic-detail"
    >
      <div className="bottom-sheet-panel">
        <div className="sheet-drag-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <span id="dynSheetKicker" className="micro-label">
              {kicker}
            </span>
            <h3 id="dynSheetTitle" style={{ fontSize: '16px', fontWeight: 800 }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            className="close-circle-btn"
            onClick={onClose}
            aria-label="Close"
            data-testid="dynamic-sheet-close-btn"
          >
            ✕
          </button>
        </div>

        {/* View 1: Personal Information */}
        {viewType === 'personal' && (
          <div className="stack-10" data-testid="view-personal-info">
            <div className="sub-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Full Name</span>
              <span style={{ fontSize: '12px', fontWeight: 800 }}>{displayName}</span>
            </div>
            <div className="sub-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Courier ID</span>
              <button
                type="button"
                className="pill-peach-btn"
                style={{ height: '26px', fontSize: '11px' }}
                onClick={() => showToast(`Courier ID #${riderUser?.id ? `BN-${riderUser.id.slice(-4)}` : (simulationMode ? 'BN-8492' : 'BN-0001')} copied`)}
              >
                <span className="tabular-num">#{riderUser?.id ? `BN-${riderUser.id.slice(-4)}` : (simulationMode ? 'BN-8492' : 'BN-0001')}</span> <span>📋</span>
              </button>
            </div>
            <div className="sub-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Phone</span>
              <span className="tabular-num" style={{ fontSize: '12px' }}>
                {riderUser?.phone || (simulationMode ? '+234 803 421 8900' : 'No phone linked')}
              </span>
            </div>
            <div className="sub-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Email</span>
              <span style={{ fontSize: '12px', fontWeight: 700 }}>{displayEmail}</span>
            </div>
            <div className="sub-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Home Depot</span>
              <span style={{ fontSize: '12px', fontWeight: 700 }}>Yaba Central</span>
            </div>
            <button
              type="button"
              className="btn-orange-xl"
              style={{ height: '48px' }}
              onClick={() => {
                onClose();
                if (onOpenEditProfile) onOpenEditProfile();
              }}
              data-testid="btn-open-edit-profile"
            >
              <span>Edit Personal Details</span>
            </button>
          </div>
        )}

        {/* View 2: Earnings & Wallet */}
        {viewType === 'earnings' && (
          <div className="stack-10" data-testid="view-earnings">
            {/* Feature 2: Cash Debt Circuit Breaker Meter */}
            <VirtualDebtMeter
              walletBalanceKobo={currentWalletKobo}
              isDebtLocked={isDebtLocked}
              onOpenTopUp={() => {
                if (onOpenDebtTopUp) onOpenDebtTopUp();
              }}
            />

            <div
              className="sub-card"
              style={{
                border: isDebtLocked
                  ? '1.5px solid #EF4444'
                  : isWalletNegative
                  ? '1.5px solid #F59E0B'
                  : '1.5px solid var(--accent-orange)',
                background: isDebtLocked
                  ? '#FEF2F2'
                  : isWalletNegative
                  ? '#FFFBEB'
                  : 'var(--accent-peach)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  className="micro-label"
                  style={{
                    color: isDebtLocked
                      ? '#DC2626'
                      : isWalletNegative
                      ? '#D97706'
                      : 'var(--accent-orange)',
                  }}
                >
                  {isWalletNegative ? 'COMMISSION DEBT BALANCE' : 'AVAILABLE WALLET BALANCE'}
                </span>
                <span className="live-chip">{isDebtLocked ? 'LOCKED' : 'Pro +5%'}</span>
              </div>
              <div
                id="walletTotalDisplay"
                className="tabular-num"
                style={{
                  fontSize: '25px',
                  marginTop: '3px',
                  color: isDebtLocked ? '#DC2626' : undefined,
                }}
              >
                {walletFormatted}
              </div>
              <div
                id="walletTodaySub"
                style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}
              >
                Today&apos;s net earnings: {todayFormatted} ({tripsCompletedToday} drops)
              </div>
              <div style={{ marginTop: '10px' }}>
                {isWalletNegative ? (
                  <button
                    type="button"
                    className="btn-orange-xl"
                    style={{ height: '46px', fontSize: '13px', background: '#DC2626' }}
                    onClick={() => {
                      if (onOpenDebtTopUp) onOpenDebtTopUp();
                    }}
                    data-testid="btn-trigger-debt-topup"
                  >
                    <span>Clear Debt via Paystack ⚡</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-orange-xl"
                    style={{ height: '46px', fontSize: '13px' }}
                    onClick={() => {
                      if (onOpenCashout) onOpenCashout();
                    }}
                    data-testid="btn-trigger-cashout"
                  >
                    <span>Instant GTBank Cash-Out ⚡</span>
                  </button>
                )}
              </div>
            </div>

            <div className="sub-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="micro-label">WEEKLY EARNINGS VELOCITY</span>
                <span className="tabular-num" style={{ fontSize: '11px', color: 'var(--accent-orange)' }}>
                  ₦92,300/wk
                </span>
              </div>
              <div className="chart-7-grid">
                {weekChart.map((item, idx) => (
                  <div
                    key={item.day}
                    className={`chart-bar-col ${selectedChartDay === idx ? 'active' : ''}`}
                    onClick={() => setSelectedChartDay(idx)}
                  >
                    <div className="chart-bar-pill" style={{ height: `${item.pct}%` }} />
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        color: selectedChartDay === idx ? 'var(--accent-orange)' : 'var(--text-secondary)',
                      }}
                    >
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginTop: '6px',
                }}
              >
                Tap a day bar • {weekChart[selectedChartDay]?.day}: ₦{weekChart[selectedChartDay]?.val.toLocaleString()}
              </div>
            </div>

            <div className="sub-card">
              <span className="micro-label" style={{ marginBottom: '6px' }}>
                TODAY&apos;S ITEMIZED BREAKDOWN
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Base Delivery Fares</span>
                  <span className="tabular-num">₦11,200</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Distance Pay (38.4 km)</span>
                  <span className="tabular-num">₦4,250</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-orange)' }}>
                  <span>Peak Surge Multipliers</span>
                  <span className="tabular-num">+₦2,200</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-emerald-text)' }}>
                  <span>Customer Tips</span>
                  <span className="tabular-num">+₦800</span>
                </div>
              </div>
            </div>

            <div className="sub-card">
              <span className="micro-label" style={{ marginBottom: '6px' }}>
                RECENT PAYOUTS
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payouts.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 0' }}>
                    No recent bank settlements yet.
                  </div>
                ) : (
                  payouts.map((p, idx) => (
                    <div
                      key={idx}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 800 }}>{p.bank}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{p.date}</div>
                      </div>
                      <span className="tabular-num" style={{ fontSize: '13px', color: 'var(--accent-emerald-text)' }}>
                        ₦{p.amount.toLocaleString()} ✓
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* View 3: Payout Bank Account */}
        {viewType === 'bank' && (
          <div className="stack-10" data-testid="view-bank-account">
            <div className="sub-card" style={{ border: '1.5px solid var(--accent-orange)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="micro-label">VERIFIED BANK</span>
                <span className="live-chip">Instant ⚡</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800 }}>Guaranty Trust Bank</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Account Name: {displayName.toUpperCase()}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <span className="tabular-num" style={{ fontSize: '18px', letterSpacing: '0.06em' }}>
                  0148298291
                </span>
                <button
                  type="button"
                  className="pill-peach-btn"
                  onClick={() => showToast('Account number copied')}
                >
                  <span>📋 Copy</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn-orange-xl"
                style={{ height: '48px', fontSize: '13px' }}
                onClick={() => {
                  if (onOpenCashout) onOpenCashout();
                }}
              >
                <span>Cash Out ⚡</span>
              </button>
              <button
                type="button"
                className="btn-neutral-xl"
                style={{ height: '48px', fontSize: '12px' }}
                onClick={() => {
                  onClose();
                  if (onOpenEditProfile) onOpenEditProfile();
                }}
              >
                <span>Change Bank</span>
              </button>
            </div>
          </div>
        )}

        {/* View 4: Vehicle & Documents */}
        {viewType === 'vehicle' && (
          <div className="stack-10" data-testid="view-vehicle-docs">
            <div className="sub-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="micro-label">ASSIGNED VEHICLE</span>
                <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>Bajaj Boxer BM150</div>
              </div>
              <span
                className="tabular-num"
                style={{
                  padding: '4px 9px',
                  borderRadius: '10px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                }}
              >
                {displayPlate}
              </span>
            </div>

            <div className="sub-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="micro-label">CARGO INSURANCE</span>
                <div style={{ fontSize: '12.5px', fontWeight: 800, marginTop: '2px' }}>
                  ₦500,000 Goods-In-Transit
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-emerald-text)' }}>
                Active ✓
              </span>
            </div>

            <button
              type="button"
              className="sub-card"
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
              onClick={() => showToast("Driver's License (Class A) valid till Nov 2028")}
            >
              <span style={{ fontSize: '12.5px', fontWeight: 700 }}>🪪 Driver&apos;s License</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-emerald-text)' }}>
                Verified ›
              </span>
            </button>

            <button
              type="button"
              className="sub-card"
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
              onClick={() => showToast('AXA Mansard Comprehensive Policy valid till Aug 2027')}
            >
              <span style={{ fontSize: '12.5px', fontWeight: 700 }}>🛡️ Vehicle Insurance</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-emerald-text)' }}>
                Verified ›
              </span>
            </button>

            <button
              type="button"
              className="sub-card"
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
              onClick={() => showToast('LASRRA Commercial Permit active')}
            >
              <span style={{ fontSize: '12.5px', fontWeight: 700 }}>📋 LASRRA Permit</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-emerald-text)' }}>
                Verified ›
              </span>
            </button>
          </div>
        )}

        {/* View 5: Support & Roadside SOS */}
        {viewType === 'support_sos' && (
          <div className="stack-10" data-testid="view-support-sos">
            <div className="sub-card" style={{ border: '1.5px solid var(--accent-red)', background: 'var(--accent-red-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-red-text)', letterSpacing: '0.06em' }}>
                  🚨 RAPID RESPONSE
                </span>
                <span className="tabular-num" style={{ fontSize: '10px', color: 'var(--accent-red-text)' }}>
                  6.5165° N, 3.3855° E
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>Roadside Emergency SOS</div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '3px 0 10px 0' }}>
                Broadcasts live GPS, plate {displayPlate}, and ₦500k GIT cargo status to BAYNIKS Safety Dispatch.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-orange-xl"
                  style={{
                    height: '44px',
                    fontSize: '12px',
                    backgroundColor: 'var(--accent-red)',
                    boxShadow: '0 6px 14px rgba(239,68,68,0.32)',
                  }}
                  onClick={() => {
                    playErrorChime();
                    showToast('🚨 SOS broadcasted to BAYNIKS Emergency Rapid Response Unit');
                  }}
                  data-testid="btn-broadcast-sos"
                >
                  <span>🚨 Broadcast SOS</span>
                </button>
                <button
                  type="button"
                  className="btn-neutral-xl"
                  style={{ height: '44px', fontSize: '12px' }}
                  onClick={() => showToast('Dialing 0800-BAYNIKS Toll-Free Dispatch...')}
                  data-testid="btn-dial-sos"
                >
                  <span>📞 0800-BAYNIKS</span>
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="micro-label">LIVE DISPATCH CHAT</span>
                <span className="live-chip">
                  <span className="live-chip-dot" /> Online
                </span>
              </div>
              <div id="dispatchChatFeed" className="chat-box-feed" style={{ maxHeight: '170px' }} data-testid="chat-feed">
                {chatMessages.length === 0 ? (
                  <div className="msg-bubble in">
                    <strong>BAYNIKS Dispatch:</strong> Dispatch monitoring live. All corridors clear.
                  </div>
                ) : (
                  chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`msg-bubble ${m.sender === 'rider' ? 'out' : 'in'}`}
                    >
                      {m.sender !== 'rider' && <strong>BAYNIKS Dispatch: </strong>}
                      {m.text}
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                <button
                  type="button"
                  className="pill-peach-btn"
                  onClick={() => handleSendChat('Recipient unreachable at gate')}
                >
                  📵 Unreachable
                </button>
                <button
                  type="button"
                  className="pill-peach-btn"
                  onClick={() => handleSendChat('Bridge traffic delay (+8 mins)')}
                >
                  🚦 Traffic delay
                </button>
                <button
                  type="button"
                  className="pill-peach-btn"
                  onClick={() => handleSendChat('Need OTP verification assistance')}
                >
                  🔑 OTP help
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  id="dispatchChatInput"
                  className="field-input"
                  placeholder="Message dispatch..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChat();
                  }}
                  data-testid="dispatch-chat-input"
                />
                <button
                  type="button"
                  className="btn-orange-xl"
                  style={{ width: '74px', height: '46px', fontSize: '12px', flexShrink: 0 }}
                  onClick={() => handleSendChat()}
                  data-testid="dispatch-chat-send-btn"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View 6: Instant GTBank Cash-out */}
        {viewType === 'cashout' && (
          <div className="stack-10" data-testid="view-cashout">
            <div className="sub-card">
              <span className="micro-label">AVAILABLE TO WITHDRAW</span>
              <div className="tabular-num" style={{ fontSize: '22px', color: 'var(--accent-orange)', marginTop: '2px' }}>
                {walletFormatted}
              </div>
            </div>

            <div className="sub-card">
              <span className="micro-label">DESTINATION ACCOUNT</span>
              <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px' }}>
                Guaranty Trust Bank • 0148298291
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {displayName} • Zero Transfer Fee
              </div>
            </div>

            <div>
              <span className="micro-label" style={{ marginBottom: '4px' }}>
                AMOUNT TO WITHDRAW (₦)
              </span>
              <input
                type="number"
                id="inpCashoutAmt"
                className="field-input tabular-num"
                value={cashoutAmount}
                min={1000}
                max={walletBalance}
                onChange={(e) => setCashoutAmount(e.target.value)}
                data-testid="cashout-amount-input"
              />
            </div>

            <button
              type="button"
              className="btn-orange-xl"
              onClick={handleProcessCashout}
              data-testid="btn-cashout-submit"
            >
              <span>Transfer Now ⚡</span>
            </button>
          </div>
        )}

        {/* View 7: Notifications & Surge Alerts */}
        {viewType === 'notifications' && (
          <div className="stack-10" data-testid="view-notifications">
            <div className="sub-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="micro-label" style={{ color: 'var(--accent-orange)' }}>
                  SURGE ALERT
                </span>
                <span className="tabular-num" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  10m ago
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px' }}>
                1.4x Surge in Yaba Tech Hub
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                High demand rate active across Yaba Corridor (1.4x Surge).
              </div>
            </div>

            <div className="sub-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="micro-label">SYSTEM NOTICE</span>
                <span className="tabular-num" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  1h ago
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px' }}>
                KYC Level 2 Verified
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Your documents and settlement bank account have been verified.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

