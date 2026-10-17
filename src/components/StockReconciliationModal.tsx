import React, { useState } from 'react';
import { PriceItem } from '../types';
import { SHOPS } from '../constants';

interface StockReconciliationModalProps {
  prices: PriceItem[];
  shopStockQty: (shop: string, pid: string) => number;
  onApplyVariance: (shop: string, pid: string, diff: number) => void;
  onClose: () => void;
  initialShop?: string;
}

export const StockReconciliationModal: React.FC<StockReconciliationModalProps> = ({
  prices,
  shopStockQty,
  onApplyVariance,
  onClose,
  initialShop
}) => {
  const [selectedShop, setSelectedShop] = useState(initialShop || SHOPS[0]);
  const [actualCounts, setActualCounts] = useState<Record<string, string>>({});

  const handleApplyAll = () => {
    let appliedCount = 0;
    prices.forEach(p => {
      const actualStr = actualCounts[p.id];
      if (actualStr !== undefined && actualStr.trim() !== '') {
        const actual = parseFloat(actualStr) || 0;
        const system = shopStockQty(selectedShop, p.id);
        const diff = actual - system;
        if (Math.abs(diff) > 0.001) {
          onApplyVariance(selectedShop, p.id, diff);
          appliedCount++;
        }
      }
    });

    if (appliedCount > 0) {
      alert(`Applied reconciliation for ${appliedCount} item(s) in ${selectedShop}.`);
      onClose();
    } else {
      alert('No differences found to reconcile.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="End of day stock audit modal"
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
            <h2 style={{ margin: 0 }}>📋 End-of-Day Stock Audit</h2>
            <small style={{ color: 'var(--mu)', display: 'block', fontSize: '13px' }}>
              Reconcile physical crates counted on the floor
            </small>
          </div>
          <button type="button" className="s" onClick={onClose} style={{ fontSize: '18px', padding: '2px 8px' }}>
            ×
          </button>
        </div>

        <label style={{ marginBottom: '14px' }}>
          Audit for Shop
          <select value={selectedShop} onChange={e => setSelectedShop(e.target.value)}>
            {SHOPS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '16px' }}>
          {prices.map(p => {
            const system = shopStockQty(selectedShop, p.id);
            const actualInput = actualCounts[p.id] ?? '';
            const actual = actualInput !== '' ? parseFloat(actualInput) || 0 : system;
            const diff = actual - system;

            return (
              <div key={p.id} style={{ padding: '10px 0', borderTop: '1px solid var(--bd)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <b>{p.farm} · {p.item}</b>
                  <span>System: <b>{system}</b></span>
                </div>
                <div className="r" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={`Physical count (current: ${system})`}
                    value={actualInput}
                    onChange={e => setActualCounts({ ...actualCounts, [p.id]: e.target.value })}
                    style={{ margin: 0 }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: diff < 0 ? '#D32F2F' : diff > 0 ? '#1F5E3B' : 'var(--mu)',
                      minWidth: '65px',
                      textAlign: 'right'
                    }}
                  >
                    {diff === 0 ? 'Match' : `${diff > 0 ? '+' : ''}${Math.round(diff * 100) / 100} crates`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={handleApplyAll} style={{ width: '100%', marginBottom: '8px' }}>
          Confirm & Reconcile Discrepancies
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ width: '100%', background: 'var(--bd)', color: 'var(--tx)', fontSize: '13px', padding: '8px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
