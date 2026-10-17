import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS, wkRange, td, gh, sum } from '../constants';
import { WeeklySalesChart } from '../components/WeeklySalesChart';
import { StockReconciliationModal } from '../components/StockReconciliationModal';

export const HomeView: React.FC = () => {
  const {
    me,
    appState,
    selDate,
    setWeekDate,
    shiftWeek,
    setTab,
    can,
    myShop,
    shopsFor,
    scopeRows,
    stock,
    shopStockQty,
    debts,
    adjustStock,
    backupJSON,
    restoreBackupJSON,
    exportCSV,
    logout
  } = useApp();

  const [showAuditModal, setShowAuditModal] = useState(false);

  const rng = wkRange(selDate || td());
  const w = rng.start;
  const wEnd = rng.end;
  const isCurrentWk = w === wkRange(td()).start;

  const sa = scopeRows(appState.sales).filter(s => s.date >= w && s.date <= wEnd);
  const cols = scopeRows(appState.col).filter(c => c.date >= w && c.date <= wEnd && c.qty > 0);
  const pays = scopeRows(appState.pay).filter(p => p.date >= w && p.date <= wEnd);
  const csts = scopeRows(appState.costs).filter(c => c.date >= w && c.date <= wEnd);

  const rev = sum(sa, s => s.qty * s.price);
  const cratesSold = sum(sa, s => s.qty);
  const cratesPicked = sum(cols, c => c.qty);
  const cash = sum(sa, s => s.paid) + sum(pays, p => p.amt);
  const buy = sum(cols, c => c.qty * c.buy);
  const tr = sum(csts, c => c.amt);
  const pf = cash - buy - tr;

  const d = debts();
  const owed = sum(d, x => x.bal);
  const fo = sum(
    scopeRows(appState.col).filter(c => c.qty > 0 && (c.paid_amt || 0) < c.qty * c.buy),
    c => c.qty * c.buy - (c.paid_amt || 0)
  );

  const st = stock();
  const userShop = myShop();

  // Find any low-stock items (< 10 crates)
  const lowStockItems: { shop: string; item: string; qty: number; pid: string }[] = [];
  shopsFor().forEach(s => {
    appState.prices.forEach(p => {
      const q = shopStockQty(s, p.id);
      if (q <= 10) {
        lowStockItems.push({
          shop: s,
          item: `${p.farm} · ${p.item}`,
          qty: q,
          pid: p.id
        });
      }
    });
  });

  // Calculate top-selling sizes in selected week
  const productPerformance: Record<string, { lbl: string; crates: number; rev: number; profit: number }> = {};
  sa.forEach(s => {
    if (!productPerformance[s.pid]) {
      const pObj = appState.prices.find(pr => pr.id === s.pid);
      productPerformance[s.pid] = {
        lbl: s.lbl,
        crates: 0,
        rev: 0,
        profit: 0
      };
    }
    const unitBuy = appState.prices.find(pr => pr.id === s.pid)?.buy || 0;
    productPerformance[s.pid].crates += s.qty;
    productPerformance[s.pid].rev += s.qty * s.price;
    productPerformance[s.pid].profit += s.qty * (s.price - unitBuy);
  });

  const sortedPerformance = Object.values(productPerformance).sort((a, b) => b.crates - a.crates);

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      restoreBackupJSON(file);
      e.target.value = '';
    }
  };

  const handleApplyVariance = (shop: string, pid: string, diff: number) => {
    // If diff is negative (e.g. -2), record as loss of 2 crates
    if (diff < 0) {
      adjustStock({
        type: 'loss',
        pid,
        fromShop: shop,
        toShop: '',
        qty: Math.abs(diff)
      });
    } else if (diff > 0) {
      // Positive adjustment
      adjustStock({
        type: 'loss',
        pid,
        fromShop: shop,
        toShop: '',
        qty: -diff
      });
    }
  };

  return (
    <>
      {/* Who am I + role badge */}
      <div className="c" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <div>
          <b>{me.name || me.email || 'User'}</b>
          <small style={{ display: 'block', color: 'var(--mu)' }}>
            {ROLE_LABELS[me.role] || me.role}
            {userShop ? ` · ${userShop}` : ' · All shops'}
          </small>
        </div>
        {userShop && (
          <span className="sync-pill" style={{ background: 'var(--gb, #e5f4e8)', color: 'var(--g)', flex: 'none' }}>
            {userShop}
          </span>
        )}
      </div>

      {/* Low-stock warning banner if any item is <= 10 crates */}
      {lowStockItems.length > 0 && (
        <div
          className="c"
          style={{
            borderLeft: '4px solid #F5A623',
            background: 'rgba(245, 166, 35, 0.1)',
            padding: '12px 14px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                <span>⚠️</span> Low Stock Notice ({lowStockItems.length})
              </b>
              <small style={{ display: 'block', color: 'var(--tx)', marginTop: '2px', fontSize: '12px' }}>
                {lowStockItems.slice(0, 2).map(i => `${i.shop}: ${i.item} (${i.qty} left)`).join(' · ')}
                {lowStockItems.length > 2 && ` +${lowStockItems.length - 2} more`}
              </small>
            </div>
            <button
              type="button"
              className="s"
              onClick={() => setTab('collect')}
              style={{
                width: 'auto',
                padding: '4px 8px',
                fontSize: '12px',
                background: '#F5A623',
                color: '#111',
                fontWeight: 600
              }}
            >
              Order Pickup
            </button>
          </div>
        </div>
      )}

      {/* Week picker */}
      <div className="c">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <b>📅 Week: {w} to {wEnd}</b>
          {!isCurrentWk && (
            <button
              type="button"
              className="s"
              style={{ color: 'var(--g)', fontSize: '13px', padding: '2px 8px' }}
              onClick={() => setWeekDate('')}
            >
              This Week
            </button>
          )}
        </div>
        <div className="r" style={{ gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '8px' }}>
          <button type="button" onClick={() => shiftWeek(-7)} style={{ width: 'auto', padding: '10px 14px' }} title="Previous week">
            ◀
          </button>
          <input
            type="date"
            value={selDate || td()}
            onChange={e => setWeekDate(e.target.value)}
            style={{ margin: 0, textAlign: 'center' }}
          />
          <button type="button" onClick={() => shiftWeek(7)} style={{ width: 'auto', padding: '10px 14px' }} title="Next week">
            ▶
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="dash-grid">
        <div className="dash-tile">
          <span>Sales ({cratesSold} crates)</span>
          <b>{gh(rev)}</b>
        </div>
        <div className="dash-tile">
          <span>Cash Received</span>
          <b>{gh(cash)}</b>
        </div>
      </div>

      <div className="dash-tile highlight" style={{ marginBottom: '12px' }}>
        <span>Net Cash Profit ({isCurrentWk ? 'This Week' : w})</span>
        <b style={{ fontSize: '28px' }}>{gh(pf)}</b>
        <small style={{ display: 'block', marginTop: '4px', opacity: 0.85 }}>
          Cash received − farm purchases − transport
        </small>
      </div>

      <div className="dash-grid">
        <div className="dash-tile">
          <span>Pickups ({cratesPicked} crates)</span>
          <b>{gh(buy)}</b>
        </div>
        <div className="dash-tile">
          <span>Transport / Costs</span>
          <b>{gh(tr)}</b>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-tile" onClick={() => setTab('credit')} style={{ cursor: 'pointer' }}>
          <span>Customers Owe You</span>
          <b>{gh(owed)}</b>
        </div>
        <div className="dash-tile" onClick={() => setTab('collect')} style={{ cursor: 'pointer' }}>
          <span>You Owe Farmers</span>
          <b>{gh(fo)}</b>
        </div>
      </div>

      {/* Day-by-Day Sales Bar Chart */}
      <WeeklySalesChart startDate={w} sales={sa} />

      {/* Top-Selling Sizes & Margin Breakdown */}
      {sortedPerformance.length > 0 && (
        <div className="c">
          <h3>🏆 Top-Selling Egg Sizes in Week</h3>
          {sortedPerformance.map((item, idx) => (
            <div className="l" key={idx} style={{ fontSize: '13px' }}>
              <div>
                <b>{item.lbl}</b>
                <small>{item.crates} crates sold · Revenue {gh(item.rev)}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b style={{ color: 'var(--g)' }}>+{gh(item.profit)}</b>
                <small style={{ color: 'var(--mu)', display: 'block' }}>gross margin</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Itemized Sales in Selected Week */}
      <div className="c">
        <h2>🛒 Sales in Selected Week ({sa.length})</h2>
        {sa.length > 0 ? (
          sa.slice().reverse().map(s => {
            const custObj = appState.customers.find(c => c.id === s.cust_id);
            const total = s.qty * s.price;
            const dueAmt = total - s.paid;
            return (
              <div className="l" key={s.id}>
                <div>
                  <b>{s.lbl}</b> · {s.qty} crates × {gh(s.price)}
                  <small>
                    {s.date} · {s.shop} · {custObj ? custObj.name : 'Walk-in'}
                    {dueAmt > 0 ? (
                      <> · <span className="n">Unpaid: {gh(dueAmt)}</span></>
                    ) : (
                      ' · Paid'
                    )}
                  </small>
                </div>
                <b>{gh(total)}</b>
              </div>
            );
          })
        ) : (
          <small style={{ color: 'var(--mu)' }}>No sales recorded for {w} – {wEnd}.</small>
        )}
      </div>

      {/* Itemized Farm Pickups in Selected Week */}
      <div className="c">
        <h2>🚚 Farm Pickups in Selected Week ({cols.length})</h2>
        {cols.length > 0 ? (
          cols.slice().reverse().map(c => {
            const total = c.qty * c.buy;
            const owedAmt = total - (c.paid_amt || 0);
            return (
              <div className="l" key={c.id}>
                <div>
                  <b>{c.lbl}</b> · {c.qty} crates × {gh(c.buy)}
                  <small>
                    {c.date} · {c.shop}
                    {owedAmt > 0 ? (
                      <> · <span className="n">Owe: {gh(owedAmt)}</span></>
                    ) : (
                      ' · Paid'
                    )}
                  </small>
                </div>
                <b>{gh(total)}</b>
              </div>
            );
          })
        ) : (
          <small style={{ color: 'var(--mu)' }}>No farm pickups recorded for {w} – {wEnd}.</small>
        )}
      </div>

      {/* Live stock per shop with Stock Audit Shortcut */}
      {shopsFor().map(s => {
        const rows = Object.keys(st.m)
          .filter(k => k.split('|')[0] === s && Math.abs(st.m[k]) > 0.001)
          .map(k => {
            const q = Math.round(st.m[k] * 100) / 100;
            const pid = k.split('|')[1];
            return (
              <div className="l" key={k}>
                <span>{st.L[pid] || 'Unknown Item'}</span>
                <b className={q < 0 ? 'n' : ''}>{q} crates</b>
              </div>
            );
          });

        return (
          <div className="c" key={s}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0 }}>📦 {s} Current Stock</h2>
              {can('transfer') && (
                <button
                  type="button"
                  className="s"
                  onClick={() => setShowAuditModal(true)}
                  style={{ fontSize: '12px', padding: '3px 8px', width: 'auto' }}
                >
                  📋 Count / Audit
                </button>
              )}
            </div>
            {rows.length > 0 ? rows : <small style={{ color: 'var(--mu)' }}>No stock recorded.</small>}
          </div>
        );
      })}

      {/* System & Data */}
      <div className="c">
        {(can('backup') || can('export')) && (
          <>
            <h3>System & Data</h3>
            <div className="r" style={{ marginBottom: '10px' }}>
              <button type="button" onClick={backupJSON}>Download Backup</button>
              <button type="button" onClick={exportCSV}>Export CSV</button>
            </div>
            <a
              href="/afa-fresh-eggs-project.zip"
              download="afa-fresh-eggs-project.zip"
              className="btn-link"
              style={{ background: 'var(--gb, #e5f4e8)', color: 'var(--g)', border: '1px solid var(--bd)', marginBottom: '10px' }}
            >
              📦 Download Full Project Code (.zip)
            </a>
            <label className="pick" style={{ margin: 0 }}>
              <span className="btn-link" style={{ background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--bd)', marginBottom: '10px' }}>
                📂 Restore Backup (.json)
              </span>
              <input type="file" accept=".json" hidden onChange={handleRestoreFile} />
            </label>
          </>
        )}
        <button type="button" onClick={() => logout()} style={{ background: 'var(--bd)', color: 'var(--tx)' }}>
          Sign Out
        </button>
      </div>

      {/* Stock Reconciliation Modal */}
      {showAuditModal && (
        <StockReconciliationModal
          prices={appState.prices}
          shopStockQty={shopStockQty}
          onApplyVariance={handleApplyVariance}
          onClose={() => setShowAuditModal(false)}
          initialShop={userShop || shopsFor()[0]}
        />
      )}
    </>
  );
};
