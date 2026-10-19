import React, { useEffect } from 'react';
import { SaleItem, CustomerItem } from '../types';
import { gh, formatPhone } from '../constants';

interface ReceiptModalProps {
  sale: SaleItem;
  customer?: CustomerItem | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, customer, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const total = sale.qty * sale.price;
  const balance = Math.max(0, total - sale.paid);
  const custName = customer?.name || 'Walk-in Customer';
  const custPhone = customer?.phone || '';

  const receiptText = `*AFA FRESH EGGS ENTERPRISE*
--------------------------------
*OFFICIAL SALES RECEIPT*
Receipt No: #${sale.id.slice(-6).toUpperCase()}
Date: ${sale.date}
Shop: ${sale.shop}
Customer: ${custName}
${custPhone ? `Phone: ${custPhone}\n` : ''}--------------------------------
Item: ${sale.lbl}
Quantity: ${sale.qty} crates
Unit Price: ${gh(sale.price)}
*Total Amount: ${gh(total)}*
*Amount Paid: ${gh(sale.paid)} (${sale.method})*
${balance > 0 ? `*Balance Due: ${gh(balance)}*\nDue Date: ${sale.due || 'Within 7 days'}\n` : '*Status: Fully Paid ✅*\n'}--------------------------------
Thank you for doing business with AFA Fresh Eggs!
From The Farm, Every Week.
Contact: markbrownwane@gmail.com`;

  const waLink = custPhone
    ? `https://wa.me/${formatPhone(custPhone)}?text=${encodeURIComponent(receiptText)}`
    : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
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
            <h2 id="receipt-title" style={{ margin: 0, fontSize: '18px' }}>
              🧾 Sales Receipt
            </h2>
            <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
              #{sale.id.slice(-6).toUpperCase()} · {sale.date}
            </small>
          </div>
          <button
            type="button"
            className="s"
            onClick={onClose}
            aria-label="Close receipt dialog"
            style={{ fontSize: '18px', padding: '4px 10px', minHeight: 'auto' }}
          >
            ×
          </button>
        </div>

        {/* Paper receipt view */}
        <div
          style={{
            background: 'var(--bg)',
            borderRadius: '12px',
            border: '1px dashed var(--bd)',
            padding: '14px',
            fontSize: '13px',
            lineHeight: 1.6,
            marginBottom: '16px',
            fontFamily: 'monospace'
          }}
        >
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
            AFA FRESH EGGS ENTERPRISE
          </div>
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--mu)', marginBottom: '10px' }}>
            {sale.shop} · {sale.date}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Customer:</span>
            <b>{custName}</b>
          </div>
          {custPhone && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Phone:</span>
              <span>{custPhone}</span>
            </div>
          )}

          <div style={{ borderTop: '1px dashed var(--bd)', margin: '8px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{sale.lbl}:</span>
            <span>{sale.qty} crates @ {gh(sale.price)}</span>
          </div>

          <div style={{ borderTop: '1px dashed var(--bd)', margin: '8px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <b>Total:</b>
            <b>{gh(total)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--g)' }}>
            <span>Paid ({sale.method}):</span>
            <b>{gh(sale.paid)}</b>
          </div>
          {balance > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--rd)' }}>
              <b>Balance Due:</b>
              <b>{gh(balance)}</b>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--g)', fontWeight: 'bold', marginTop: '4px' }}>
              ✅ Fully Paid
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-link btn-wa"
              style={{
                width: '100%',
                padding: '10px',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '10px'
              }}
            >
              💬 Send Receipt via WhatsApp
            </a>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="s"
              onClick={handlePrint}
              style={{ flex: 1, padding: '10px', background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
            >
              🖨️ Print
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '10px' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
