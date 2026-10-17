import React from 'react';
import { SaleItem, CustomerItem } from '../types';
import { gh, formatPhone } from '../constants';

interface ReceiptModalProps {
  sale: SaleItem;
  customer?: CustomerItem | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, customer, onClose }) => {
  const total = sale.qty * sale.price;
  const due = total - sale.paid;
  const receiptNo = sale.id.slice(-6).toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `*AFA FRESH EGGS - SALE RECEIPT*\nReceipt: #${receiptNo}\nDate: ${sale.date}\nShop: ${sale.shop}\nItem: ${sale.lbl}\nQuantity: ${sale.qty} crates\nPrice: ${gh(sale.price)}/crate\nTotal: ${gh(total)}\nPaid: ${gh(sale.paid)} (${sale.method})\n${due > 0 ? `Balance Due: ${gh(due)} (Due: ${sale.due})` : 'Status: PAID IN FULL'}\nCustomer: ${customer ? customer.name : 'Walk-in'}\nThank you for choosing AFA Fresh Eggs!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${receiptNo} - AFA Fresh Eggs`,
          text
        });
        return;
      } catch {}
    }
    navigator.clipboard?.writeText(text);
    alert('Receipt text copied to clipboard!');
  };

  const waMsg = encodeURIComponent(
    `*AFA FRESH EGGS - RECEIPT #${receiptNo}*\nDate: ${sale.date}\nShop: ${sale.shop}\nItem: ${sale.lbl}\nQty: ${sale.qty} crates\nTotal: ${gh(total)}\nPaid: ${gh(sale.paid)} (${sale.method})\n${due > 0 ? `Balance Due: ${gh(due)}` : 'Status: PAID'}`
  );
  const waLink = customer?.phone ? `https://wa.me/${formatPhone(customer.phone)}?text=${waMsg}` : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sale receipt slip"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
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
          maxWidth: '380px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          color: '#142219',
          padding: '24px 20px',
          margin: 0,
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          fontFamily: 'monospace'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Printable thermal receipt layout */}
        <div id="printable-receipt" style={{ textAlign: 'center', borderBottom: '1px dashed #bbb', paddingBottom: '14px', marginBottom: '14px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '1px' }}>AFA FRESH EGGS</div>
          <div style={{ fontSize: '12px', color: '#555' }}>From The Farm, Every Week</div>
          <div style={{ fontSize: '12px', color: '#555' }}>Shop: {sale.shop}</div>
          <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>
            Receipt #{receiptNo} · {sale.date}
          </div>
        </div>

        <div style={{ fontSize: '13px', lineHeight: 1.6, marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Customer:</span>
            <b>{customer ? customer.name : 'Walk-in'}</b>
          </div>
          {customer?.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
              <span>Phone:</span>
              <span>{customer.phone}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span>Item:</span>
            <span>{sale.lbl}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Qty:</span>
            <span>{sale.qty} crates × {gh(sale.price)}</span>
          </div>
          <div style={{ borderTop: '1px dashed #ddd', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold' }}>
            <span>TOTAL:</span>
            <span>{gh(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1F5E3B' }}>
            <span>Paid ({sale.method}):</span>
            <b>{gh(sale.paid)}</b>
          </div>
          {due > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D32F2F', fontWeight: 'bold' }}>
              <span>Balance Due:</span>
              <span>{gh(due)}</span>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#777', borderTop: '1px dashed #bbb', paddingTop: '10px', marginBottom: '16px' }}>
          Thank you for your business!<br />Fresh crates guaranteed.
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{ fontSize: '13px', padding: '10px 4px', minHeight: 'auto' }}
          >
            🖨️ Print Slip
          </button>
          <button
            type="button"
            onClick={handleShare}
            style={{ fontSize: '13px', padding: '10px 4px', minHeight: 'auto', background: '#345241' }}
          >
            📲 Share Slip
          </button>
        </div>

        {waLink && (
          <a
            className="btn-link btn-wa"
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: '100%', marginBottom: '8px', fontSize: '13px', padding: '10px' }}
          >
            💬 WhatsApp Receipt
          </a>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{ width: '100%', background: '#e0e0e0', color: '#333', fontSize: '13px', padding: '8px', minHeight: 'auto' }}
        >
          Close
        </button>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-receipt, #printable-receipt * { visibility: visible !important; }
          #printable-receipt {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
};
