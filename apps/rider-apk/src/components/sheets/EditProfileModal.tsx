import React, { useState } from 'react';
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
  const { showToast, riderUser, riderName, simulationMode } = useRiderStore();
  const [phone, setPhone] = useState(riderUser?.phone || (simulationMode ? '+234 803 421 8900' : ''));
  const [email, setEmail] = useState(
    riderUser?.email ||
      (riderName
        ? `${riderName.toLowerCase().replace(/\s+/g, '.')}@bayniks.ng`
        : (simulationMode ? 'joseph.okon@bayniks.ng' : ''))
  );
  const [depot, setDepot] = useState('Yaba Central');
  const [bank, setBank] = useState('Guaranty Trust Bank');
  const [acct, setAcct] = useState(simulationMode ? '0148298291' : '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (acct.length !== 10) {
      showToast('Account number must be exactly 10 digits');
      return;
    }
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
                PAYOUT BANK
              </span>
              <select
                id="inpEditBank"
                className="field-input"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                data-testid="edit-bank-select"
              >
                <option value="Guaranty Trust Bank">Guaranty Trust Bank</option>
                <option value="Access Bank Plc">Access Bank Plc</option>
                <option value="Zenith Bank Plc">Zenith Bank Plc</option>
                <option value="First Bank of Nigeria">First Bank of Nigeria</option>
              </select>
            </div>

            <div>
              <span className="micro-label" style={{ marginBottom: '4px' }}>
                10-DIGIT ACCOUNT NUMBER
              </span>
              <input
                type="text"
                id="inpEditAcct"
                className="field-input tabular-num"
                maxLength={10}
                value={acct}
                onChange={(e) => setAcct(e.target.value.replace(/\D/g, ''))}
                data-testid="edit-acct-input"
              />
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

