import React, { useState } from 'react';
import { CustomerItem, SaleItem, PaymentItem } from '../types';
import { gh, formatPhone } from '../constants';

interface CustomerStatementModalProps {
  customer: CustomerItem;
  sales: SaleItem[];
  payments: PaymentItem[];
  onClose: () => void;
  onRecordPayment?: (custId: string, amt: number) => void;
}

interface StatementEntry {
  id: string;
  date: string;
  type: 'sale' | 'payment';
  details: string;
  debit: number; // money owed (added to balance)
  credit: number; // money paid (subtracted from balance)
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  customer,
  sales,
  payments,
  onClose,
  onRecordPayment
}) => {
  const [payAmt, setPayAmt] = useState('');

  // Collect customer transactions
  const custSales = sales.filter(s => s.cust_id === customer.id);
  const custPays = payments.filter(p => p.cust_id === customer.id);

  const rawEntries: StatementEntry[] = [];

  custSales.forEach(s => {
    const total = s.qty * s.price;
    const due = total - s.paid;
    if (due > 0.005) {
      rawEntries.push({
        id: s.id,
        date: s.date,
        type: 'sale',
        details: `${s.lbl} (${s.qty} crates)`,
        debit: due,
        credit: 0
      });
    }
  });

  custPays.forEach(p => {
    rawEntries.push({
      id: p.id,
      date: p.date,
      type: 'payment',
      details: 'Debt Repayment',
      debit: 0,
      credit: p.amt
    });
  });

  // Sort by date ascending
  rawEntries.sort((a, b) => a.date.localeCompare(b.date));

  // Compute running balances
  let running = 0;
  const entriesWithBalance = rawEntries.map(e => {
    running += e.debit - e.credit;
    return { ...e, running: Math.max(0, running) };
  });

  const totalOwed = Math.max(0, running);

  const handleSendStatement = () => {
    let msg = `*AFA FRESH EGGS - STATEMENT OF ACCOUNT*\nCustomer: ${customer.name}\nTotal Balance Owed: ${gh(totalOwed)}\n\nRecent Activity:\n`;
    entriesWithBalance.slice(-5).forEach(e => {
      msg += `• ${e.date}: ${e.details} | ${e.debit ? `+${gh(e.debit)}` : `-${gh(e.credit)}`}\n`;
    });
    msg += `\nPlease arrange settlement. Thank you!`;
    const waUrl = `https://wa.me/${formatPhone(customer.phone)}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmt) || 0;
    if (amt > 0 && onRecordPayment) {
      onRecordPayment(customer.id, amt);
      setPayAmt('');
    }
  };

  return (
    <div
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
          maxWidth: '460px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          margin: 0,
          background: 'var(--cd)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Statement of Account</h2>
            <small style={{ color: 'var(--mu)', display: 'block', fontSize: '13px' }}>
              {customer.name} · 📞 {customer.phone || 'No phone'}
            </small>
          </div>
          <button type="button" className="s" onClick={onClose} style={{ fontSize: '18px', padding: '2px 8px' }}>
            ×
          </button>
        </div>

        <div className="dash-tile highlight" style={{ marginBottom: '16px', padding: '14px' }}>
          <span>Total Balance Due</span>
          <b style={{ fontSize: '24px' }}>{gh(totalOwed)}</b>
        </div>

        {/* Quick payment form */}
        {onRecordPayment && totalOwed > 0 && (
          <form onSubmit={handlePay} style={{ marginBottom: '14px' }}>
            <div className="r" style={{ gridTemplateColumns: '1fr auto', gap: '8px' }}>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Amount to pay"
                value={payAmt}
                onChange={e => setPayAmt(e.target.value)}
                style={{ margin: 0 }}
              />
              <button type="submit" style={{ width: 'auto', minHeight: 'auto', padding: '10px 14px' }}>
                Pay
              </button>
            </div>
          </form>
        )}

        {/* Itemized transaction list */}
        <h3>Transaction History ({entriesWithBalance.length})</h3>
        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '14px' }}>
          {entriesWithBalance.length > 0 ? (
            entriesWithBalance.slice().reverse().map(e => (
              <div className="l" key={e.id} style={{ fontSize: '13px' }}>
                <div>
                  <b>{e.details}</b>
                  <small>{e.date} · {e.type === 'sale' ? 'Credit Purchase' : 'Payment Received'}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b className={e.debit > 0 ? 'n' : ''}>
                    {e.debit > 0 ? `+${gh(e.debit)}` : `-${gh(e.credit)}`}
                  </b>
                  <small style={{ color: 'var(--mu)' }}>Bal: {gh(e.running)}</small>
                </div>
              </div>
            ))
          ) : (
            <small style={{ color: 'var(--mu)' }}>No transactions found for this customer.</small>
          )}
        </div>

        {/* WhatsApp Statement link */}
        {customer.phone && (
          <button
            type="button"
            className="btn-wa"
            onClick={handleSendStatement}
            style={{ width: '100%', marginBottom: '8px', fontSize: '13px', padding: '11px' }}
          >
            💬 Share Statement via WhatsApp
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{ width: '100%', background: 'var(--bd)', color: 'var(--tx)', fontSize: '13px', padding: '8px' }}
        >
          Close
        </button>
      </div>
    </div>
  );
};
