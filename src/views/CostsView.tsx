import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { td, gh } from '../constants';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const CostsView: React.FC = () => {
  const { appState, can, scopeRows, addCost, mayDel, delItem, refreshFromCloud } = useApp();

  const [date, setDate] = useState(td());
  const [amt, setAmt] = useState('');
  const [descr, setDescr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  if (!can('cost')) {
    return (
      <div className="c">
        <h2>🔒 Expenses & Transport</h2>
        <p style={{ color: 'var(--mu)', fontSize: '14px', margin: '0 0 4px' }}>
          Your role does not include access to this screen.
        </p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const ok = addCost(date, descr, parseFloat(amt) || 0);
    if (ok) {
      setAmt('');
      setDescr('');
    }
    setTimeout(() => setSubmitting(false), 400);
  };

  const handleSync = async () => {
    setSyncing(true);
    await refreshFromCloud();
    setSyncing(false);
  };

  const recentCosts = scopeRows(appState.costs).slice(-12).reverse();

  return (
    <>
      <Breadcrumbs currentTab="costs" />

      <form className="c" onSubmit={handleSubmit}>
        <h1>Operating Expenses &amp; Transport Costs</h1>
        <div className="r">
          <label>
            Date
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label>
            Amount
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 50"
              value={amt}
              onChange={e => setAmt(e.target.value)}
            />
          </label>
        </div>
        <label>
          Description
          <input
            placeholder="e.g. Fuel, Egg crates, Van maintenance"
            value={descr}
            onChange={e => setDescr(e.target.value)}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Expense'}
        </button>
      </form>

      {/* Recent expenses (Collapsible Dropdown) */}
      <details className="c" open>
        <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⛽ Recent Operating Expenses ({recentCosts.length})</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="s"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                handleSync();
              }}
              disabled={syncing}
              title="Refresh expenses from Supabase database"
              style={{ fontSize: '11px', padding: '3px 8px', minHeight: 'auto' }}
            >
              {syncing ? 'Syncing...' : '🔄 Sync DB'}
            </button>
            <span className="summary-chevron">▼</span>
          </div>
        </summary>
        {recentCosts.length > 0 ? (
          recentCosts.map(c => (
            <div className="l" key={c.id}>
              <div>
                <b>{c.descr}</b>
                <small>{c.date}</small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <b>{gh(c.amt)}</b>
                {mayDel('costs', c) && (
                  <button
                    type="button"
                    className="s"
                    onClick={() => delItem('costs', c.id)}
                    title={`Delete expense: ${c.descr}`}
                    aria-label={`Delete expense ${c.descr}`}
                    style={{
                      marginLeft: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: 'var(--rd)',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      background: 'var(--bg)',
                      fontWeight: 600
                    }}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <small style={{ color: 'var(--mu)' }}>No expenses recorded yet.</small>
        )}
      </details>
    </>
  );
};
