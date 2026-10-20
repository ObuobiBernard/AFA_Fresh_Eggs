import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { td, wkRange, gh, SHOPS } from '../constants';
import { WeeklySalesChart } from '../components/WeeklySalesChart';
import { StockReconciliationModal } from '../components/StockReconciliationModal';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { DatabaseSchemaModal } from '../components/DatabaseSchemaModal';

export const HomeView: React.FC = () => {
  const { appState, myShop, scopeRows, stock, openLegal, backupJSON, restoreBackupJSON, exportCSV, setTab } = useApp();
  const [showReconcile, setShowReconcile] = useState(false);
  const [showDbSchema, setShowDbSchema] = useState(false);

  const attendantShop = myShop();
  const week = wkRange(td());
  const scopedSales = scopeRows(appState.sales).filter(s => s.date >= week.start && s.date <= week.end);
  const scopedCol = scopeRows(appState.col).filter(c => c.date >= week.start && c.date <= week.end);
  const scopedCosts = scopeRows(appState.costs).filter(c => c.date >= week.start && c.date <= week.end);

  const cratesSold = scopedSales.reduce((acc, s) => acc + s.qty, 0);
  const revenue = scopedSales.reduce((acc, s) => acc + s.qty * s.price, 0);
  const cratesCollected = scopedCol.reduce((acc, c) => acc + c.qty, 0);
  const expenses = scopedCosts.reduce((acc, c) => acc + c.amt, 0);

  const stockInfo = stock();
  const totalStockCrates = Object.values(stockInfo.m).reduce((a, b) => a + b, 0);

  return (
    <>
      <Breadcrumbs currentTab="home" />

      {/* Primary Page Heading */}
      <div style={{ marginBottom: '14px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', color: 'var(--tx)' }}>
          Daily Operations &amp; Inventory Dashboard
        </h1>
        <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
          Real-time wholesale sales, egg crates inventory, collections &amp; balances.
        </small>
      </div>

      <PWAInstallButton />

      {/* Week overview stats */}
      <div className="c">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2>📊 This Week's Performance</h2>
          <small style={{ color: 'var(--mu)', fontSize: '11px' }}>
            {week.start} to {week.end}
          </small>
        </div>

        <div className="g" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div className="card-stat">
            <small>Crates Sold</small>
            <b>{cratesSold}</b>
            <span style={{ fontSize: '11px', color: 'var(--g)' }}>{gh(revenue)}</span>
          </div>

          <div className="card-stat">
            <small>Farm Collections</small>
            <b>{cratesCollected}</b>
            <span style={{ fontSize: '11px', color: 'var(--mu)' }}>Crates In</span>
          </div>

          <div className="card-stat">
            <small>Current Stock</small>
            <b style={{ color: totalStockCrates <= 15 ? 'var(--rd)' : 'var(--tx)' }}>
              {totalStockCrates}
            </b>
            <span style={{ fontSize: '11px', color: 'var(--mu)' }}>Crates on Hand</span>
          </div>

          <div className="card-stat">
            <small>Total Expenses</small>
            <b>{gh(expenses)}</b>
            <span style={{ fontSize: '11px', color: 'var(--mu)' }}>Fuel, crates & transit</span>
          </div>
        </div>

        {/* Weekly sales chart */}
        <WeeklySalesChart sales={scopedSales} startDate={week.start} />
      </div>

      {/* Real-time Shop Inventory */}
      <div className="c">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2>📦 Current Stock by Size</h2>
          <button
            type="button"
            className="s"
            onClick={() => setShowReconcile(true)}
            style={{ fontSize: '12px', padding: '6px 10px', minHeight: 'auto' }}
          >
            Transfer / Loss
          </button>
        </div>

        {Object.keys(stockInfo.m).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(stockInfo.m).map(([k, qty]) => {
              const [shopName, pid] = k.split('__');
              if (attendantShop && shopName !== attendantShop) return null;

              const label = stockInfo.L[pid] || 'Egg Size';
              const isLow = qty > 0 && qty <= 10;
              const isOut = qty <= 0;

              return (
                <div key={k} className="l">
                  <div>
                    <b>{label}</b>
                    <small>📍 {shopName}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b style={{ color: isOut ? 'var(--rd)' : isLow ? '#b45309' : 'var(--tx)' }}>
                      {qty} crates
                    </b>
                    {isOut && <small style={{ color: 'var(--rd)', display: 'block' }}>Out of stock</small>}
                    {isLow && <small style={{ color: '#b45309', display: 'block' }}>Low stock</small>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <small style={{ color: 'var(--mu)' }}>No stock recorded yet.</small>
        )}
      </div>

      {/* System & Data (Collapsible Dropdown) */}
      <details className="c">
        <summary>
          <span>⚙️ System, Backup &amp; Legal Tools</span>
          <span className="summary-chevron">▼</span>
        </summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <button type="button" className="s" onClick={backupJSON} style={{ flex: 1, minHeight: 'auto', padding: '8px' }}>
            💾 Backup Data
          </button>
          <label className="btn-link" style={{ flex: 1, minHeight: 'auto', padding: '8px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--tx)' }}>
            📥 Restore
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const text = ev.target?.result as string;
                    if (text) restoreBackupJSON(text);
                  };
                  reader.readAsText(file);
                }
              }}
            />
          </label>
          <button type="button" className="s" onClick={exportCSV} style={{ flex: 1, minHeight: 'auto', padding: '8px' }}>
            📊 Export CSV
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bd)', paddingTop: '10px', gap: '8px', flexWrap: 'wrap' }}>
          <small style={{ color: 'var(--mu)' }}>
            AFA Fresh Eggs Enterprise · v1.0.0
          </small>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="s"
              onClick={() => setShowDbSchema(true)}
              style={{ fontSize: '11px', padding: '4px 8px', minHeight: 'auto' }}
            >
              🗄️ Database SQL
            </button>
            <button
              type="button"
              className="s"
              onClick={() => setTab('domain' as any)}
              style={{ fontSize: '11px', padding: '4px 8px', minHeight: 'auto' }}
            >
              🌐 Custom Domain
            </button>
            <button
              type="button"
              className="s"
              onClick={() => openLegal('privacy')}
              style={{ fontSize: '11px', padding: '4px 8px', minHeight: 'auto' }}
            >
              Legal &amp; Privacy
            </button>
          </div>
        </div>
      </details>

      {showReconcile && (
        <StockReconciliationModal onClose={() => setShowReconcile(false)} />
      )}

      {showDbSchema && (
        <DatabaseSchemaModal onClose={() => setShowDbSchema(false)} />
      )}
    </>
  );
};
