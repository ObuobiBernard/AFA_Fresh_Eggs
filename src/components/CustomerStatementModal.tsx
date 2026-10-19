import React, { useState, useEffect } from 'react';
import { CustomerItem, SaleItem, PaymentItem } from '../types';
import { gh, formatPhone } from '../constants';

interface CustomerStatementModalProps {
  customer: CustomerItem;
  sales: SaleItem[];
  payments: PaymentItem[];
  onClose: () => void;
  onRecordPayment?: (custId: string, amt: number) => void;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  customer,
  sales,
  payments,
  onClose,
  onRecordPayment
}) => {
  const [payAmt, setPayAmt] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const customerSales = sales.filter(s => s.cust_id === customer.id);
  const customerPayments = payments.filter(p => p.cust_id === customer.id);

  const totalBought = customerSales.reduce((acc, s) => acc + s.qty * s.price, 0);
  const paidAtSale = customerSales.reduce((acc, s) => acc + s.paid, 0);
  const paidLater = customerPayments.reduce((acc, p) => acc + p.amt, 0);
  const totalPaid = paidAtSale + paidLater;
  const currentBalance = Math.max(0, totalBought - totalPaid);

  const statementText = `*AFA FRESH EGGS ENTERPRISE*
--------------------------------
*STATEMENT OF ACCOUNT*
Customer: ${customer.name}
${customer.phone ? `Phone: ${customer.phone}\n` : ''}Date: ${new Date().toLocaleDateString('en-GB')}
--------------------------------
Total Purchased: ${gh(totalBought)}
Total Paid to Date: ${gh(totalPaid)}
*CURRENT BALANCE DUE: ${gh(currentBalance)}*
--------------------------------
Payment channels: Cash at Shop or Mobile Money.
Thank you for your valued partnership!
Inquiries: markbrownwane@gmail.com`;

  const waLink = customer.phone
    ? `https://wa.me/${formatPhone(customer.phone)}?text=${encodeURIComponent(statementText)}`
    : null;

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(payAmt);
    if (num > 0 && onRecordPayment) {
      onRecordPayment(customer.id, num);
      setPayAmt('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="statement-title"
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
          maxWidth: '520px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          background: 'var(--cd)',
          borderRadius: '20px',
          padding: '20px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 id="statement-title" style={{ margin: 0, fontSize: '18px' }}>
              📄 Customer Statement
            </h2>
            <b style={{ color: 'var(--g)', fontSize: '15px' }}>{customer.name}</b>
            {customer.phone && <small style={{ color: 'var(--mu)', marginLeft: '8px' }}>📞 {customer.phone}</small>}
          </div>
          <button
            type="button"
            className="s"
            onClick={onClose}
            aria-label="Close statement"
            style={{ fontSize: '18px', padding: '4px 10px', minHeight: 'auto' }}
          >
            ×
          </button>
        </div>

        {/* Balance summary cards */}
        <div className="g" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          <div className="card-stat">
            <small>Total Orders</small>
            <b style={{ fontSize: '13px' }}>{gh(totalBought)}</b>
          </div>
          <div className="card-stat">
            <small>Total Paid</small>
            <b style={{ fontSize: '13px', color: 'var(--g)' }}>{gh(totalPaid)}</b>
          </div>
          <div className="card-stat">
            <small>Balance Due</small>
            <b style={{ fontSize: '13px', color: currentBalance > 0 ? 'var(--rd)' : 'var(--g)' }}>
              {gh(currentBalance)}
            </b>
          </div>
        </div>

        {/* Record payment right in modal */}
        {onRecordPayment && currentBalance > 0 && (
          <form onSubmit={handlePay} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="number"
              inputMode="decimal"
              placeholder={`Pay debt (e.g. ${Math.min(currentBalance, 100)})`}
              value={payAmt}
              onChange={e => setPayAmt(e.target.value)}
              style={{ margin: 0 }}
            />
            <button type="submit" style={{ flex: 'none', padding: '0 16px', minHeight: 'auto' }}>
              Record
            </button>
          </form>
        )}

        {/* Transaction History list */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          <b style={{ fontSize: '12px', color: 'var(--mu)', textTransform: 'uppercase' }}>Recent History</b>
          {customerSales.length === 0 && customerPayments.length === 0 ? (
            <p style={{ color: 'var(--mu)', fontSize: '13px' }}>No transactions recorded for this customer.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {customerSales.map(s => (
                <div key={s.id} className="l" style={{ fontSize: '12px', padding: '6px 8px' }}>
                  <div>
                    <b>Sale: {s.lbl} ({s.qty} crates)</b>
                    <small>{s.date} · {s.shop}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b>{gh(s.qty * s.price)}</b>
                    <small style={{ color: 'var(--g)' }}>Paid: {gh(s.paid)}</small>
                  </div>
                </div>
              ))}
              {customerPayments.map(p => (
                <div key={p.id} className="l" style={{ fontSize: '12px', padding: '6px 8px', background: 'rgba(37, 211, 102, 0.08)' }}>
                  <div>
                    <b style={{ color: 'var(--g)' }}>💰 Debt Payment</b>
                    <small>{p.date}</small>
                  </div>
                  <b style={{ color: 'var(--g)' }}>-{gh(p.amt)}</b>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--bd)' }}>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-link btn-wa"
              style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}
            >
              💬 WhatsApp Statement
            </a>
          )}
          <button
            type="button"
            className="s"
            onClick={() => window.print()}
            style={{ padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
          >
            🖨️
          </button>
          <button type="button" onClick={onClose} style={{ padding: '10px 16px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
