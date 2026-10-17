import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SHOPS, td, gh } from '../constants';
import { vibrateSuccess } from '../utils/haptics';

export const CollectView: React.FC = () => {
  const { appState, can, scopeRows, addCol, payFarmer, adjustStock, delItem } = useApp();

  const prices = appState.prices;

  const [date, setDate] = useState(td());
  const [pid, setPid] = useState(prices[0]?.id || '');
  const [qty, setQty] = useState('');
  const [buyPrice, setBuyPrice] = useState(prices[0]?.buy ? String(prices[0].buy) : '');
  const [shop, setShop] = useState<string>(SHOPS[0]);
  const [transport, setTransport] = useState('');
  const [paidFull, setPaidFull] = useState(true);
  const [paidNow, setPaidNow] = useState('');

  // Unpaid pickup inputs
  const [unpaidPayInputs, setUnpaidPayInputs] = useState<Record<string, string>>({});

  // Transfer / Breakage state
  const [trType, setTrType] = useState<'move' | 'loss'>('move');
  const [trPid, setTrPid] = useState(prices[0]?.id || '');
  const [trFrom, setTrFrom] = useState<string>(SHOPS[0]);
  const [trTo, setTrTo] = useState<string>(SHOPS[1] || SHOPS[0]);
  const [trQty, setTrQty] = useState('');

  // Update buy price when selected product changes
  useEffect(() => {
    const sel = prices.find(p => p.id === pid);
    if (sel) {
      setBuyPrice(String(sel.buy));
    }
  }, [pid, prices]);

  if (!prices.length) {
    return <div className="c">Add your farms and prices first in the <b>Prices</b> tab.</div>;
  }

  if (!can('collect')) {
    return (
      <div className="c">
        <h2>🔒 Farm collection</h2>
        <p style={{ color: 'var(--mu)', fontSize: '14px', margin: '0 0 4px' }}>
          Your role does not include access to this screen.
        </p>
      </div>
    );
  }

  const numQty = parseFloat(qty) || 0;
  const numBuy = parseFloat(buyPrice) || 0;
  const total = numQty * numBuy;

  const handleSubmitCol = (e: React.FormEvent) => {
    e.preventDefault();
    const paidAmt = paidFull ? total : Math.min(parseFloat(paidNow) || 0, total);
    const ok = addCol({
      pid,
      qty: numQty,
      buy: numBuy,
      shop,
      date,
      paidAmt,
      transport: parseFloat(transport) || 0
    });
    if (ok) {
      vibrateSuccess();
      setQty('');
      setTransport('');
      setPaidNow('');
      setPaidFull(true);
    }
  };

  const handleAdjustStock = () => {
    const ok = adjustStock({
      type: trType,
      pid: trPid,
      fromShop: trFrom,
      toShop: trTo,
      qty: parseFloat(trQty) || 0
    });
    if (ok) {
      setTrQty('');
    }
  };

  const unpaidCols = scopeRows(appState.col).filter(
    c => c.qty > 0 && c.qty * c.buy - (c.paid_amt || 0) > 0.005
  );

  const recentCols = scopeRows(appState.col).slice(-8).reverse();

  return (
    <>
      <form className="c" onSubmit={handleSubmitCol}>
        <h2>Farm collection</h2>
        <label>
          Date
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>

        <label>
          Farm · egg size
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
            Crates
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 50"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </label>
          <label>
            Farm price / crate
            <input
              type="number"
              inputMode="decimal"
              value={buyPrice}
              onChange={e => setBuyPrice(e.target.value)}
            />
          </label>
        </div>

        <label>
          Goes to
          <select value={shop} onChange={e => setShop(e.target.value)}>
            {SHOPS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label>
          Transport cost
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={transport}
            onChange={e => setTransport(e.target.value)}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={paidFull}
            onChange={e => setPaidFull(e.target.checked)}
            style={{ width: 'auto', marginRight: '8px' }}
          />
          Paid in full
        </label>

        {!paidFull && (
          <label>
            Amount paid now
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={paidNow}
              onChange={e => setPaidNow(e.target.value)}
            />
          </label>
        )}

        <div style={{ marginBottom: '10px', fontWeight: 600 }}>
          Total: {gh(total)}
        </div>

        <button type="submit">Save collection</button>
      </form>

      {/* Unpaid farm pickups with Pay Farmer action */}
      {unpaidCols.length > 0 && (
        <div className="c">
          <h2>🌾 Unpaid Farm Pickups ({unpaidCols.length})</h2>
          {unpaidCols.map(c => {
            const owed = c.qty * c.buy - (c.paid_amt || 0);
            const inputVal = unpaidPayInputs[c.id] ?? String(Math.round(owed * 100) / 100);
            return (
              <div key={c.id} style={{ padding: '10px 0', borderTop: '1px solid var(--bd)' }}>
                <div className="l" style={{ border: 0, padding: 0 }}>
                  <div>
                    <b>{c.lbl}</b> · {c.qty} crates
                    <small>
                      {c.date} × {c.shop} · Paid {gh(c.paid_amt || 0)} of {gh(c.qty * c.buy)}
                    </small>
                  </div>
                  <b className="n">Owe {gh(owed)}</b>
                </div>
                <div className="r" style={{ marginTop: '8px', gridTemplateColumns: '1fr auto' }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={inputVal}
                    placeholder="Amount"
                    onChange={e => setUnpaidPayInputs({ ...unpaidPayInputs, [c.id]: e.target.value })}
                    style={{ margin: 0 }}
                  />
                  <button
                    type="button"
                    style={{ width: 'auto' }}
                    onClick={() => {
                      payFarmer(c.id, parseFloat(inputVal) || 0);
                    }}
                  >
                    Pay Farmer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock transfer between shops / breakage */}
      {can('transfer') && (
        <details className="c">
          <summary>🔄 Transfer Stock or Record Breakage</summary>
          <div>
            <label>
              Action
              <select value={trType} onChange={e => setTrType(e.target.value as any)}>
                <option value="move">Transfer Between Shops</option>
                <option value="loss">Record Broken / Spoiled Crates</option>
              </select>
            </label>

            <label>
              Farm · egg size
              <select value={trPid} onChange={e => setTrPid(e.target.value)}>
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
                <select value={trFrom} onChange={e => setTrFrom(e.target.value)}>
                  {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              {trType === 'move' && (
                <label>
                  To Shop
                  <select value={trTo} onChange={e => setTrTo(e.target.value)}>
                    {[...SHOPS].reverse().map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              )}
            </div>

            <label>
              Crates
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 5"
                value={trQty}
                onChange={e => setTrQty(e.target.value)}
              />
            </label>

            <button type="button" onClick={handleAdjustStock}>
              Save Stock Adjustment
            </button>
          </div>
        </details>
      )}

      {/* Recent collections */}
      <div className="c">
        <h3>Recent collections & adjustments</h3>
        {recentCols.length > 0 ? (
          recentCols.map(c => {
            const owed = c.qty > 0 ? c.qty * c.buy - (c.paid_amt || 0) : 0;
            return (
              <div className="l" key={c.id}>
                <div>
                  <b>{c.lbl}</b> · {c.qty > 0 ? '+' : ''}{c.qty} crates
                  <small>
                    {c.date} × {c.shop}
                    {c.buy > 0 ? (
                      ` · ${gh(c.qty * c.buy)}` + (owed <= 0.005 ? ' × Paid' : ` · Owe ${gh(owed)}`)
                    ) : (
                      ' · Stock adjustment'
                    )}
                  </small>
                </div>
                <button
                  type="button"
                  className="s"
                  onClick={() => delItem('col', c.id)}
                  title="Delete collection"
                >
                  ×
                </button>
              </div>
            );
          })
        ) : (
          <small style={{ color: 'var(--mu)' }}>No collections yet.</small>
        )}
      </div>
    </>
  );
};
