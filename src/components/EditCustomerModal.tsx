import React, { useState, useEffect } from 'react';
import { CustomerItem } from '../types';
import { COUNTRY_DIAL_CODES, formatPhone, sanitizeText } from '../constants';

interface EditCustomerModalProps {
  customer: CustomerItem;
  onSave: (id: string, data: { name: string; phone: string }) => boolean;
  onClose: () => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  customer,
  onSave,
  onClose
}) => {
  const [name, setName] = useState(customer.name);

  const initialPhone = customer.phone || '';
  const matchedCountry = COUNTRY_DIAL_CODES.find(
    c => c.code !== '+' && initialPhone.startsWith(c.code)
  );
  const [dialCode, setDialCode] = useState(matchedCountry ? matchedCountry.code : '+233');
  const [localNumber, setLocalNumber] = useState(
    matchedCountry ? initialPhone.slice(matchedCountry.code.length).trim() : initialPhone.trim()
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fullPhone = dialCode === '+'
    ? localNumber.trim()
    : `${dialCode}${localNumber.trim().replace(/^0+/, '')}`;

  const previewFormatted = formatPhone(fullPhone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeText(name, 100);
    if (!cleanName) return;

    const ok = onSave(customer.id, {
      name: cleanName,
      phone: fullPhone
    });
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-cust-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
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
          borderRadius: '18px',
          padding: '20px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 id="edit-cust-title" style={{ margin: 0, fontSize: '18px' }}>
              ✏️ Edit Customer Details
            </h2>
            <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
              Update contact info for receipts and statements
            </small>
          </div>
          <button
            type="button"
            className="s"
            onClick={onClose}
            aria-label="Close edit customer dialog"
            style={{ fontSize: '18px', padding: '4px 10px', minHeight: 'auto' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Customer Name
            <input
              required
              maxLength={100}
              placeholder="e.g. Ama Serwaa"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </label>

          <label>
            Country & Phone Number
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', marginTop: '4px' }}>
              <select
                value={dialCode}
                onChange={e => setDialCode(e.target.value)}
                aria-label="Country Dial Code"
                style={{ margin: 0 }}
              >
                {COUNTRY_DIAL_CODES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.country} ({c.code})
                  </option>
                ))}
              </select>

              <input
                type="tel"
                placeholder="e.g. 241234567"
                value={localNumber}
                onChange={e => setLocalNumber(e.target.value)}
                style={{ margin: 0 }}
              />
            </div>
          </label>

          {previewFormatted && (
            <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '-4px', marginBottom: '14px', background: 'var(--bg)', padding: '6px 10px', borderRadius: '8px' }}>
              📲 WhatsApp / Call preview: <b>+{previewFormatted}</b>
            </div>
          )}

          <div className="r" style={{ marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--bd)' }}
            >
              Cancel
            </button>
            <button type="submit">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
