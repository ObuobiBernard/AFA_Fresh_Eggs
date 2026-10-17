import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { td, gh } from '../constants';

export const CostsView: React.FC = () => {
  const { appState, can, scopeRows, addCost, mayDel, delItem } = useApp();

  const [date, setDate] = useState(td());
  const [amt, setAmt] = useState('');
  const [descr, setDescr] = useState('');

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
    const ok = addCost(date, descr, parseFloat(amt) || 0);
    if (ok) {
      setAmt('');
      setDescr('');
    }
  };

  const recentCosts = scopeRows(appState.costs).slice(-8).reverse();

  return (
    <>
      <form className="c" onSubmit={handleSubmit}>
        <h2>Add expense / transport</h2>
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
        <button type="submit">Save Expense</button>
      </form>

      <div className="c">
        <h3>Recent expenses</h3>
        {recentCosts.length > 0 ? (
          recentCosts.map(c => (
            <div className="l" key={c.id}>
              <div>
                <b>{c.descr}</b>
                <small>{c.date}</small>
              </div>
              <b>{gh(c.amt)}</b>
              {mayDel('costs', c) && (
                <button
                  type="button"
                  className="s"
                  onClick={() => delItem('costs', c.id)}
                  title="Delete cost"
                >
                  ×
                </button>
              )}
            </div>
          ))
        ) : (
          <small style={{ color: 'var(--mu)' }}>No expenses yet.</small>
        )}
      </div>
    </>
  );
};
