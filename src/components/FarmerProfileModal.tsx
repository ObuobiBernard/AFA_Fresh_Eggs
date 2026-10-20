import React, { useState, useEffect } from 'react';
import { FarmerItem } from '../types';
import { GHANA_BANKS, sanitizeText } from '../constants';
import { vibrateSuccess } from '../utils/haptics';

interface FarmerProfileModalProps {
  farmName: string;
  farmer?: FarmerItem | null;
  balanceDue?: number;
  onSave: (data: Omit<FarmerItem, 'id'>, existingId?: string) => void;
  onOpenPay?: () => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export const FarmerProfileModal: React.FC<FarmerProfileModalProps> = ({
  farmName,
  farmer,
  balanceDue = 0,
  onSave,
  onOpenPay,
  onClose,
  onDelete
}) => {
  const [name, setName] = useState(farmer?.name || farmName);
  const [phone, setPhone] = useState(farmer?.phone || '');
  const [bankName, setBankName] = useState(farmer?.bank_name || 'Guaranty Trust Bank (GTBank)');
  const [accountNumber, setAccountNumber] = useState(farmer?.account_number || '');
  const [accountName, setAccountName] = useState(farmer?.account_name || '');
  const [branch, setBranch] = useState(farmer?.branch || '');
  const [notes, setNotes] = useState(farmer?.notes || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    vibrateSuccess();
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeText(name, 100);
    if (!cleanName) return;

    onSave(
      {
        name: cleanName,
        phone: sanitizeText(phone, 30),
        bank_name: bankName,
        account_number: sanitizeText(accountNumber, 40),
        account_name: sanitizeText(accountName, 100),
        branch: sanitizeText(branch, 60),
        notes: sanitizeText(notes, 200)
      },
      farmer?.id
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="farmer-profile-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="c"
        style={{
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          background: 'var(--cd)',
          borderRadius: '20px',
          padding: '20px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 id="farmer-profile-title" style={{ margin: 0, fontSize: '18px' }}>
              🌾 Farmer &amp; Bank Profile
            </h2>
            <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
              Bank account details for egg supply settlements
            </small>
          </div>
          <button
            type="button"
            className="s"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ fontSize: '18px', padding: '4px 10px', minHeight: 'auto' }}
          >
            ×
          </button>
        </div>

        {balanceDue > 0 && onOpenPay && (
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--bd)',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Unsettled Supply Balance</small>
              <b style={{ color: 'var(--rd)', fontSize: '15px' }}>GH₵ {balanceDue.toLocaleString()}</b>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPay();
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'var(--g)',
                color: '#ffffff',
                minHeight: 'auto'
              }}
            >
              💳 Pay Funds Now
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
          <label>
            Farm / Supplier Name
            <input
              required
              placeholder="e.g. Golden Valley Farm"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <label>
            Contact Phone Number
            <input
              type="tel"
              placeholder="e.g. 0244123456"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </label>

          <div style={{ borderTop: '1px solid var(--bd)', paddingTop: '12px', marginTop: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tx)', display: 'block', marginBottom: '8px' }}>
              🏦 Bank Account Details (Payout Destination)
            </span>

            <label>
              Bank Name
              <select value={bankName} onChange={e => setBankName(e.target.value)}>
                {GHANA_BANKS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>

            <label>
              Account Number / NUBAN / MoMo Number
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  required
                  placeholder="e.g. 0211567890"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
                />
                {accountNumber && (
                  <button
                    type="button"
                    className="s"
                    onClick={() => copyToClipboard(accountNumber, 'accNum')}
                    style={{ flex: 'none', padding: '0 10px', fontSize: '11px', minHeight: 'auto' }}
                  >
                    {copiedField === 'accNum' ? '✓' : 'Copy'}
                  </button>
                )}
              </div>
            </label>

            <label>
              Account Holder Name
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  required
                  placeholder="e.g. Kwabena Farms Enterprise"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                />
                {accountName && (
                  <button
                    type="button"
                    className="s"
                    onClick={() => copyToClipboard(accountName, 'accName')}
                    style={{ flex: 'none', padding: '0 10px', fontSize: '11px', minHeight: 'auto' }}
                  >
                    {copiedField === 'accName' ? '✓' : 'Copy'}
                  </button>
                )}
              </div>
            </label>

            <div className="r">
              <label>
                Branch (Optional)
                <input
                  placeholder="e.g. Madina / Adenta"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                />
              </label>

              <label>
                Notes (Optional)
                <input
                  placeholder="e.g. Weekly Friday payout"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', alignItems: 'center' }}>
            {farmer?.id && onDelete && (
              <button
                type="button"
                className="s"
                onClick={() => {
                  onClose();
                  onDelete(farmer.id);
                }}
                style={{
                  background: 'var(--bg)',
                  color: 'var(--rd)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  padding: '8px 12px'
                }}
                title="Delete farmer bank account profile"
              >
                🗑️ Delete
              </button>
            )}
            <button
              type="button"
              className="s"
              onClick={onClose}
              style={{ flex: 1, background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--bd)' }}
            >
              Cancel
            </button>
            <button type="submit" style={{ flex: 2 }}>
              Save Account Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
