import React, { useEffect, useState } from 'react';
import { useRiderStore } from '../../store/riderStore';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: { phone: string; email: string; depot: string; bank: string; acct: string }) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const {
    showToast,
    riderUser,
    riderName,
    simulationMode,
    bankDetails,
    homeDepot,
    paystackBanks,
    fetchPaystackBanks,
    resolveBankAccount,
    saveRiderPreferences,
  } = useRiderStore();

  const [phone, setPhone] = useState(riderUser?.phone || (simulationMode ? '+234 803 421 8900' : ''));
  const [email, setEmail] = useState(
    riderUser?.email ||
      (riderName
        ? `${riderName.toLowerCase().replace(/\s+/g, '.')}@bayniks.ng`
        : simulationMode
        ? 'joseph.okon@bayniks.ng'
        : '')
  );
  const [depot, setDepot] = useState(homeDepot || 'Yaba Central');
  const [bank, setBank] = useState(bankDetails.bankName || 'Guaranty Trust Bank');
  const [acct, setAcct] = useState(
    bankDetails.accountNumber || (simulationMode ? '0148298291' : '')
  );
  const [resolvedName, setResolvedName] = useState<string>(bankDetails.accountName || '');
  const [isVerifyingAcct, setIsVerifyingAcct] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPaystackBanks().catch(() => {});
    }
  }, [isOpen, fetchPaystackBanks]);

  if (!isOpen) return null;

  const selectedBankObj =
    paystackBanks.find((b) => b.name === bank) ||
    paystackBanks[0] || { name: bank, code: bankDetails.bankCode || '058' };

  const handleVerifyAccount = async () => {
    if (acct.length !== 10) {
      showToast('Enter 10 digits before verifying NUBAN account');
      return;
    }
    setIsVerifyingAcct(true);
    try {
      const res = await resolveBankAccount(acct, selectedBankObj.code);
      if (res.success && res.accountName) {
        setResolvedName(res.accountName);
        showToast(`Verified: ${res.accountName}`);
      } else {
        showToast(res.error || 'Could not resolve NUBAN account');
      }
    } finally {
      setIsVerifyingAcct(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (acct.length !== 10) {
      showToast('Account number must be exactly 10 digits');
      return;
    }

    const finalAccountName =
      resolvedName || bankDetails.accountName || riderName || 'VERIFIED COURIER';

    void saveRiderPreferences({
      email,
      homeDepot: depot,
      bankDetails: {
        bankCode: selectedBankObj.code,
        bankName: bank,
        accountNumber: acct,
        accountName: finalAccountName,
      },
    });

    showToast('Profile and settlement account updated ✓');
    if (onSave) {
      onSave({ phone, email, depot, bank, acct });
    }
    onClose();
  };

  return (
    <div
      id="sheetEditProfile"
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      data-testid="sheet-edit-profile"
    >
      <div className="bottom-sheet-panel">
        <div className="sheet-drag-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <span className="micro-label">RIDER SETTINGS</span>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Edit Account Details</h3>
          </div>
          <button
            type="button"
            className="close-circle-btn"
            onClick={onClose}
            aria-label="Close"
            data-testid="edit-profile-close-btn"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="stack-10" style={{ marginBottom: '14px' }}>
            <div>
              <span className="micro-label" style={{ marginBottom: '4px' }}>
                PHONE NUMBER
              </span>
              <input
                type="tel"
                id="inpEditPhone"
                className="field-input tabular-num"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="edit-phone-input"
              />
            </div>

            <div>
              <span className="micro-label" style={{ marginBottom: '4px' }}>
                EMAIL ADDRESS
              </span>
              <input
                type="email"
                id="inpEditEmail"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="edit-email-input"
              />
            </div>

            <div>
              <span className="micro-label" style={{ marginBottom: '4px' }}>
                HOME DEPOT
              </span>
              <select
                id="inpEditDepot"
                className="field-input"
                value={depot}
                onChange={(e) => setDepot(e.target.value)}
                data-testid="edit-depot-select"
              >
                <option value="Yaba Central">Yaba Central</option>
                <option value="Ikeja Commercial Hub">Ikeja Commercial Hub</option>
                <option value="Victoria Island Station">Victoria Island Station</option>
              </select>
            </div>

            <div>
              <span className="micro-label" style={{ marginBottom: '4px' }}>
                PAYOUT BANK (PAYSTACK NIP)
              </span>
              <select
                id="inpEditBank"
                className="field-input"
                value={bank}
                onChange={(e) => {
                  setBank(e.target.value);
                  setResolvedName('');
                }}
                data-testid="edit-bank-select"
              >
                {paystackBanks.map((b) => (
                  <option key={b.code + b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span className="micro-label">10-DIGIT ACCOUNT NUMBER</span>
                <button
                  type="button"
                  onClick={handleVerifyAccount}
                  disabled={isVerifyingAcct || acct.length !== 10}
                  data-testid="verify-nuban-btn"
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#FF5722',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {isVerifyingAcct ? 'Verifying...' : 'Verify NUBAN'}
                </button>
              </div>
              <input
                type="text"
                id="inpEditAcct"
                className="field-input tabular-num"
                maxLength={10}
                value={acct}
                onChange={(e) => {
                  setAcct(e.target.value.replace(/\D/g, ''));
                  setResolvedName('');
                }}
                data-testid="edit-acct-input"
              />
              {resolvedName && (
                <div
                  data-testid="resolved-nuban-name"
                  style={{ fontSize: '11px', fontWeight: 700, color: '#18181B', marginTop: '4px' }}
                >
                  ✓ Account Name: {resolvedName}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn-orange-xl"
            data-testid="edit-profile-submit-btn"
          >
            <span>Save Changes ✓</span>
          </button>
        </form>
      </div>
    </div>
  );
};
