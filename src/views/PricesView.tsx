import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const PricesView: React.FC = () => {
  const { appState, can, addPrice, updatePrice, delPrice } = useApp();

  const [farm, setFarm] = useState('');
  const [item, setItem] = useState('');
  const [buy, setBuy] = useState('');
  const [sell, setSell] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!can('prices')) {
    return (
      <div className="c">
        <h2>🔒 Farm Prices</h2>
        <p style={{ color: 'var(--mu)', fontSize: '14px', margin: '0 0 4px' }}>
          Your role does not include access to this screen.
        </p>
      </div>
    );
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const ok = addPrice(farm, item, parseFloat(buy) || 0, parseFloat(sell) || 0);
    if (ok) {
      setFarm('');
      setItem('');
      setBuy('');
      setSell('');
    }
    setTimeout(() => setSubmitting(false), 400);
  };

  return (
    <>
      <Breadcrumbs currentTab="prices" />

      <form className="c" onSubmit={handleAdd}>
        <h1>Farm Prices &amp; Selling Rates Configuration</h1>
        <label>
          Farm
          <input
            placeholder="e.g. Farm A, Golden Valley Farm"
            value={farm}
            onChange={e => setFarm(e.target.value)}
          />
        </label>
        <label>
          Egg size
          <input
            placeholder="e.g. Large, Medium, Super Jumbo"
            value={item}
            onChange={e => setItem(e.target.value)}
          />
        </label>
        <div className="r">
          <label>
            Farm price (buy)
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 48"
              value={buy}
              onChange={e => setBuy(e.target.value)}
            />
          </label>
          <label>
            Selling price
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 55"
              value={sell}
              onChange={e => setSell(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Price'}
        </button>
      </form>

      {/* Configured Price List (Collapsible Dropdown) */}
      <details className="c" open>
        <summary>
          <span>🏷️ Configured Price List ({appState.prices.length})</span>
          <span className="summary-chevron">▼</span>
        </summary>
        {appState.prices.length > 0 ? (
          appState.prices.map(p => (
            <div key={p.id} style={{ padding: '10px 0', borderTop: '1px solid var(--bd)' }}>
              <div className="l" style={{ border: 0, padding: 0 }}>
                <b>{p.farm} · {p.item}</b>
                <button
                  type="button"
                  className="s"
                  onClick={() => delPrice(p.id)}
                  title={`Delete rate for ${p.farm} ${p.item}`}
                  style={{
                    color: 'var(--rd)',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    background: 'var(--bg)',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
              <div className="r">
                <label>
                  Farm (Buy)
                  <input
                    type="number"
                    inputMode="decimal"
                    value={p.buy}
                    onChange={e => updatePrice(p.id, 'buy', parseFloat(e.target.value) || 0)}
                  />
                </label>
                <label>
                  Sell
                  <input
                    type="number"
                    inputMode="decimal"
                    value={p.sell}
                    onChange={e => updatePrice(p.id, 'sell', parseFloat(e.target.value) || 0)}
                  />
                </label>
              </div>
            </div>
          ))
        ) : (
          <small style={{ color: 'var(--mu)' }}>No prices configured yet.</small>
        )}
      </details>
    </>
  );
};
