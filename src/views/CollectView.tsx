import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SHOPS, td, gh } from '../constants';
import { vibrateSuccess } from '../utils/haptics';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const CollectView: React.FC = () => {
  const { appState, can, myShop, addCol, payFarmer, scopeRows, mayDel, delItem } = useApp();
  const prices = appState.prices;
  const attendantShop = myShop();

  const [date, setDate] = useState(td());
  const [pid, setPid] = useState(prices[0]?.id || '');
  const [qty, setQty] = useState('');
  const [shop, setShop] = useState(attendantShop || SHOPS[0]);
  const [paidAmt, setPaidAmt] = useState('');
  const [transport, setTransport] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!can('collect')) {
    return (
      <div className="c">
        <h2>🔒 Farm Collections</h2>
        <p style={{ color: 'var(--mu)', fontSize: '14px', margin: '0 0 4px' }}>
          Your role does not include access to this screen.
        </p>
      </div>
    );
  }

  const selectedPrice = prices.find(p => p.id === pid);
  const buyPrice = selectedPrice?.buy || 0;
  const numQty = parseInt(qty, 10) || 0;
  const totalCost = numQty * buyPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const ok = addCol({
      pid,
      qty: numQty,
      buy: buyPrice,
      shop,
      date,
      paidAmt: parseFloat(paidAmt) || 0,
      transport: parseFloat(transport) || 0
    });

    if (ok) {
      vibrateSuccess();
      setQty('');
      setPaidAmt('');
      setTransport('');
    }
    setTimeout(() => setSubmitting(false), 400);
  };

  const recentCols = scopeRows(appState.col).slice(-8).reverse();

  return (
    <>
      <Breadcrumbs currentTab="collect" />

      <form className="c" onSubmit={handleSubmit}>
        <h1>Farm Collections &amp; Egg Stock Inward</h1>

        <div className="r">
          <label>
            Date
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>

          <label>
            Destination Shop
            {attendantShop ? (
              <input value={attendantShop} readOnly style={{ background: 'var(--bg)', color: 'var(--mu)' }} />
            ) : (
              <select value={shop} onChange={e => setShop(e.target.value)}>
                {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </label>
        </div>

        <label>
          Farm & Egg Size
          <select value={pid} onChange={e => setPid(e.target.value)}>
            {prices.map(p => (
              <option key={p.id} value={p.id}>
                {p.farm} · {p.item} ({gh(p.buy)}/crate)
              </option>
            ))}
          </select>
        </label>

        <div className="r">
          <label>
            Crates Collected
            <input
              type="number"
              min="1"
              required
              placeholder="e.g. 50"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </label>

          <label>
            Farmer Payment Now
            <input
              type="number"
              inputMode="decimal"
              placeholder={`Max ${gh(totalCost)}`}
              value={paidAmt}
              onChange={e => setPaidAmt(e.target.value)}
            />
          </label>
        </div>

        <label>
          Transport / Fuel Cost (Optional)
          <input
            type="number"
            inputMode="decimal"
            placeholder="e.g. 80"
            value={transport}
            onChange={e => setTransport(e.target.value)}
          />
        </label>

        {totalCost > 0 && (
          <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: '10px', marginBottom: '12px', fontSize: '13px' }}>
            <span>Total Farm Cost: <b>{gh(totalCost)}</b></span>
          </div>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Record Collection'}
        </button>
      </form>

      <div className="c">
        <h3>Recent Collections</h3>
        {recentCols.length > 0 ? (
          recentCols.map(c => {
            const total = c.qty * c.buy;
            const remaining = Math.max(0, total - (c.paid_amt || 0));

            return (
              <div key={c.id} className="l">
                <div>
                  <b>{c.lbl} ({c.qty} crates)</b>
                  <small>{c.date} · {c.shop}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b>{gh(total)}</b>
                  {remaining > 0 ? (
                    <small style={{ color: 'var(--rd)' }}>Owed: {gh(remaining)}</small>
                  ) : (
                    <small style={{ color: 'var(--g)' }}>Paid in full</small>
                  )}
                  {mayDel('col', c) && (
                    <button
                      type="button"
                      className="s"
                      onClick={() => delItem('col', c.id)}
                      style={{ marginLeft: '6px', padding: '2px 6px', fontSize: '11px' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <small style={{ color: 'var(--mu)' }}>No collections recorded yet.</small>
        )}
      </div>
    </>
  );
};
