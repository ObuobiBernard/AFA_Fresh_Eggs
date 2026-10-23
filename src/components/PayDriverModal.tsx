import React, { useState, useEffect } from 'react';
import { CostItem } from '../types';
import { gh, td } from '../constants';
import { vibrateSuccess } from '../utils/haptics';

interface PayDriverModalProps {
  cost: CostItem;
  onConfirm: (costId: string, paymentMethod: string, paidDate: string) => void;
  onClose: () => void;
}

export const PayDriverModal: React.FC<PayDriverModalProps> = ({
  cost,
  onConfirm,
  onClose
}) => {
  const [method, setMethod] = useState(cost.payment_method || 'Cash');
  const [paidDate, setPaidDate] = useState(cost.paid_date || td());
  const [driverName, setDriverName] = useState(cost.driver_name || 'Driver');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    vibrateSuccess();
    onConfirm(cost.id, method, paidDate);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-driver-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1100,
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
          maxWidth: '440px',
          width: '100%',
          margin: 0,
          background: 'var(--cd)',
          borderRadius: '20px',
          padding: '20px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 id="pay-driver-title" style={{ margin: 0, fontSize: '18px' }}>
              💳 Reimburse Driver Expense
            </h2>
            <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
              Record settlement payment for operating / transit costs
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

        {/* Expense Detail summary */}
        <div
          style={{
            background: 'var(--bg)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--bd)',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b style={{ fontSize: '14px', color: 'var(--tx)', display: 'block' }}>{cost.descr}</b>
              <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
                Recorded on {cost.date} · {cost.shop || 'All Shops'}
              </small>
            </div>
            <b style={{ fontSize: '17px', color: 'var(--g)' }}>{gh(cost.amt)}</b>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Driver / Recipient Name
            <input
              required
              value={driverName}
              onChange={e => setDriverName(e.target.value)}
              placeholder="e.g. Kofi Mensah (Van Driver)"
            />
          </label>

          <div className="r">
            <label>
              Payment Method
              <select value={method} onChange={e => setMethod(e.target.value)}>
                <option value="Cash">Cash (Immediate Handover)</option>
                <option value="Mobile Money (MoMo)">Mobile Money (MoMo)</option>
                <option value="Bank Transfer">GTBank / Bank Transfer</option>
                <option value="Petty Cash">Shop Petty Cash</option>
              </select>
            </label>

            <label>
              Payment Date
              <input
                type="date"
                required
                value={paidDate}
                onChange={e => setPaidDate(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="s"
              onClick={onClose}
              style={{ flex: 1, background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--bd)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                background: 'var(--g)',
                color: '#ffffff',
                fontWeight: 700
              }}
            >
              ✅ Confirm Paid {gh(cost.amt)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
