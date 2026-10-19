import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SHOPS } from '../constants';

interface StockReconciliationModalProps {
  onClose: () => void;
}

export const StockReconciliationModal: React.FC<StockReconciliationModalProps> = ({ onClose }) => {
  const { appState, adjustStock, can, myShop } = useApp();
  const prices = appState.prices;
  const attendantShop = myShop();

  const [type, setType] = useState<'move' | 'loss'>('move');
  const [pid, setPid] = useState(prices[0]?.id || '');
  const [fromShop, setFromShop] = useState<string>(attendantShop || SHOPS[0]);
  const [toShop, setToShop] = useState<string>(SHOPS[1] || SHOPS[0]);
  const [qty, setQty] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = parseInt(qty, 10);
    if (!numQty || numQty <= 0) return;

    const ok = adjustStock({
      type,
      pid,
      fromShop,
      toShop,
      qty: numQty
    });

    if (ok) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-modal-title"
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
            <h2 id="stock-modal-title" style={{ margin: 0, fontSize: '18px' }}>
              📦 Stock Adjustment
            </h2>
            <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
              Transfer between shops or record breakage
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

        <form onSubmit={handleSubmit}>
          <label>
            Action Type
            <select value={type} onChange={e => setType(e.target.value as any)}>
              <option value="move">🚚 Shop-to-Shop Transfer</option>
              <option value="loss">💔 Breakage / Spoilage</option>
            </select>
          </label>

          <label>
            Egg Size / Batch
            <select value={pid} onChange={e => setPid(e.target.value)}>
              {prices.map(p => (
                <option key={p.id} value={p.id}>
                  {p.farm} · {p.item}
                </option>
              ))}
            </select>
          </label>

          <div className="r">
            <label>
              From Shop
              {attendantShop ? (
                <input value={attendantShop} readOnly style={{ background: 'var(--bg)', color: 'var(--mu)' }} />
              ) : (
                <select value={fromShop} onChange={e => setFromShop(e.target.value)}>
                  {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </label>

            {type === 'move' && (
              <label>
                To Shop
                <select value={toShop} onChange={e => setToShop(e.target.value)}>
                  {SHOPS.filter(s => s !== fromShop).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <label>
            Quantity (Crates)
            <input
              type="number"
              min="1"
              required
              placeholder="e.g. 10"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </label>

          <div className="r" style={{ marginTop: '14px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--bd)' }}
            >
              Cancel
            </button>
            <button type="submit">
              Save Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
