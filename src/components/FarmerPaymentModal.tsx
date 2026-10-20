import React, { useState, useEffect } from 'react';
import { FarmerItem } from '../types';
import { gh, formatPhone } from '../constants';
import { vibrateSuccess } from '../utils/haptics';

interface FarmerPaymentModalProps {
  farmName: string;
  farmer?: FarmerItem | null;
  balanceDue: number;
  onOpenEditProfile: () => void;
  onConfirmPayment: (farmName: string, amt: number, method: string) => boolean;
  onClose: () => void;
}

export const FarmerPaymentModal: React.FC<FarmerPaymentModalProps> = ({
  farmName,
  farmer,
  balanceDue,
  onOpenEditProfile,
  onConfirmPayment,
  onClose
}) => {
  const [payAmt, setPayAmt] = useState<string>(balanceDue > 0 ? String(balanceDue) : '');
  const [payMethod, setPayMethod] = useState<string>('GTBank Transfer');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const hasBankDetails = farmer && farmer.account_number && farmer.account_name;
  const isGTBank = farmer?.bank_name?.toLowerCase().includes('gtbank') || farmer?.bank_name?.toLowerCase().includes('guaranty');

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    vibrateSuccess();
    setCopiedNotice(`✓ Copied ${label}`);
    setTimeout(() => setCopiedNotice(null), 2500);
  };

  const handleOpenGTBank = () => {
    const amtNum = parseFloat(payAmt) || balanceDue;
    const accNum = farmer?.account_number || '';
    const accHolder = farmer?.account_name || '';

    // Pre-copy account number and details to clipboard so user can paste immediately in GTBank
    if (accNum) {
      navigator.clipboard.writeText(accNum);
      vibrateSuccess();
      setCopiedNotice(`✓ Account "${accNum}" (${accHolder}) copied! Opening GTBank...`);
    }

    // Try GTBank App deep link, with fallback to GTBank online portal
    const appUri = 'gtworld-gh://';
    const webFallback = 'https://ibank.gtbank.com/ghana/';

    try {
      window.location.href = appUri;
      // Set secondary timeout for web fallback if app doesn't open
      setTimeout(() => {
        window.open(webFallback, '_blank', 'noopener,noreferrer');
      }, 1500);
    } catch {
      window.open(webFallback, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(payAmt);
    if (!num || num <= 0) return;

    const ok = onConfirmPayment(farmName, num, payMethod);
    if (ok) {
      onClose();
    }
  };

  const waText = farmer?.phone
    ? encodeURIComponent(
        `*AFA FRESH EGGS ENTERPRISE*\n--------------------------------\n*FARMER PAYMENT REMITTANCE*\nFarm: ${farmName}\nDate: ${new Date().toLocaleDateString('en-GB')}\nAmount Paid: ${gh(parseFloat(payAmt) || balanceDue)}\nChannel: ${payMethod}\nBank: ${farmer.bank_name}\nAccount: ${farmer.account_number}\nName: ${farmer.account_name}\n--------------------------------\nPayment sent from AFA Fresh Eggs. Thank you for your partnership!`
      )
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="farmer-pay-title"
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
          maxWidth: '490px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          background: 'var(--cd)',
          borderRadius: '20px',
          padding: '22px'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 id="farmer-pay-title" style={{ margin: 0, fontSize: '18px' }}>
              💳 Pay Funds to Farmer
            </h2>
            <b style={{ color: 'var(--g)', fontSize: '15px' }}>{farmName}</b>
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

        {/* Balance Notice */}
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
            <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Outstanding Supply Balance</small>
            <b style={{ color: balanceDue > 0 ? 'var(--rd)' : 'var(--g)', fontSize: '16px' }}>
              {gh(balanceDue)}
            </b>
          </div>
          {balanceDue > 0 && (
            <button
              type="button"
              className="s"
              onClick={() => setPayAmt(String(balanceDue))}
              style={{ fontSize: '11px', padding: '4px 8px', minHeight: 'auto' }}
            >
              Fill Full Balance
            </button>
          )}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
          {/* Bank Account Details Card */}
          {hasBankDetails ? (
            <div
              style={{
                background: 'var(--bg)',
                border: '2px solid var(--g)',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <b style={{ fontSize: '12px', color: 'var(--g)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🏦 Verified Payout Account
                </b>
                <button
                  type="button"
                  className="s"
                  onClick={onOpenEditProfile}
                  style={{ fontSize: '11px', padding: '2px 8px', minHeight: 'auto' }}
                >
                  ✏️ Edit
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Bank:</span>
                  <b style={{ fontSize: '14px' }}>{farmer.bank_name}</b>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--cd)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--bd)' }}>
                  <div>
                    <span style={{ color: 'var(--mu)', fontSize: '10px', display: 'block' }}>Account / NUBAN:</span>
                    <b style={{ fontSize: '16px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                      {farmer.account_number}
                    </b>
                  </div>
                  <button
                    type="button"
                    className="s"
                    onClick={() => copyText(farmer.account_number, 'Account Number')}
                    style={{ fontSize: '11px', padding: '4px 8px', minHeight: 'auto' }}
                  >
                    📋 Copy
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Account Name:</span>
                    <b>{farmer.account_name}</b>
                  </div>
                  <button
                    type="button"
                    className="s"
                    onClick={() => copyText(farmer.account_name, 'Account Name')}
                    style={{ fontSize: '11px', padding: '2px 8px', minHeight: 'auto' }}
                  >
                    📋 Copy
                  </button>
                </div>

                {farmer.branch && (
                  <div>
                    <span style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Branch:</span>
                    <span>{farmer.branch}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px dashed #D97706',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>🏦</div>
              <b style={{ fontSize: '14px', display: 'block', color: 'var(--tx)' }}>No Bank Account Registered Yet</b>
              <p style={{ fontSize: '12px', color: 'var(--mu)', margin: '4px 0 10px' }}>
                Add {farmName}&apos;s GTBank or mobile banking details to enable direct 1-tap payouts.
              </p>
              <button
                type="button"
                onClick={onOpenEditProfile}
                style={{
                  background: 'var(--g)',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '6px 14px',
                  minHeight: 'auto'
                }}
              >
                + Set Farmer Bank Account
              </button>
            </div>
          )}

          {/* Copied Notice Banner */}
          {copiedNotice && (
            <div
              style={{
                background: 'var(--g)',
                color: '#ffffff',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: '12px'
              }}
            >
              {copiedNotice}
            </div>
          )}

          {/* Quick Bank Transfer App Buttons */}
          {hasBankDetails && (
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={handleOpenGTBank}
                style={{
                  width: '100%',
                  background: '#E05A10', // GTBank Official Orange brand color
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '46px',
                  borderRadius: '12px'
                }}
              >
                <span>🚀</span>
                <span>Open GTBank App &amp; Transfer</span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {isGTBank && (
                  <a
                    href={`tel:*737*1*${parseFloat(payAmt) || 0}*${farmer.account_number}%23`}
                    className="btn-link"
                    style={{
                      padding: '8px',
                      fontSize: '12px',
                      textAlign: 'center',
                      background: 'var(--bg)',
                      border: '1px solid var(--bd)',
                      color: 'var(--tx)'
                    }}
                  >
                    📞 Dial GTBank *737#
                  </a>
                )}

                {farmer.phone && waText && (
                  <a
                    href={`https://wa.me/${formatPhone(farmer.phone)}?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-link btn-wa"
                    style={{
                      padding: '8px',
                      fontSize: '12px',
                      textAlign: 'center',
                      gridColumn: isGTBank ? 'auto' : '1 / -1'
                    }}
                  >
                    💬 WhatsApp Slip
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Payment Form to Record in Ledger */}
          <form onSubmit={handleRecordSubmit} style={{ borderTop: '1px solid var(--bd)', paddingTop: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tx)', display: 'block', marginBottom: '8px' }}>
              📝 Record Payment in System
            </span>

            <div className="r">
              <label>
                Amount to Record (GH₵)
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0.01"
                  required
                  placeholder="e.g. 500"
                  value={payAmt}
                  onChange={e => setPayAmt(e.target.value)}
                />
              </label>

              <label>
                Payment Channel
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="GTBank Transfer">GTBank Transfer</option>
                  <option value="GTBank USSD">GTBank USSD (*737#)</option>
                  <option value="Other Bank Instant Pay">Other Bank Instant Pay</option>
                  <option value="Mobile Money">Mobile Money (MoMo)</option>
                  <option value="Cash">Cash at Farm</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                className="s"
                onClick={onClose}
                style={{ flex: 1, background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--bd)' }}
              >
                Cancel
              </button>
              <button type="submit" style={{ flex: 2 }}>
                Confirm Payment Recorded
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
