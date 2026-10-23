import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { td, gh, wkRange } from '../constants';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { WeekNavigator } from '../components/WeekNavigator';
import { PayDriverModal } from '../components/PayDriverModal';
import { CostItem } from '../types';

export const CostsView: React.FC = () => {
  const {
    appState,
    can,
    scopeRows,
    addCost,
    markCostPaid,
    toggleCostPaid,
    mayDel,
    delItem,
    refreshFromCloud,
    selDate
  } = useApp();

  const [date, setDate] = useState(td());
  const [amt, setAmt] = useState('');
  const [descr, setDescr] = useState('');
  const [isDriverExpense, setIsDriverExpense] = useState(false);
  const [driverName, setDriverName] = useState('Delivery Driver');
  const [reimbursementStatus, setReimbursementStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // History & Filters
  const [viewMode, setViewMode] = useState<'week' | 'all'>('week');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_driver' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [payingCost, setPayingCost] = useState<CostItem | null>(null);

  if (!can('cost')) {
    return (
      <div className="c">
        <h2>🔒 Expenses &amp; Transport</h2>
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

    const parsedAmt = parseFloat(amt) || 0;
    const ok = addCost(date, descr, parsedAmt, {
      driver_name: isDriverExpense ? driverName.trim() || 'Delivery Driver' : undefined,
      status: isDriverExpense ? reimbursementStatus : 'paid',
      payment_method: paymentMethod,
      paid_date: reimbursementStatus === 'paid' ? date : undefined
    });

    if (ok) {
      setAmt('');
      setDescr('');
      setIsDriverExpense(false);
      setReimbursementStatus('unpaid');
    }
    setTimeout(() => setSubmitting(false), 400);
  };

  const handleSync = async () => {
    setSyncing(true);
    await refreshFromCloud();
    setSyncing(false);
  };

  // Week and filtering calculations
  const activeDate = selDate || td();
  const week = wkRange(activeDate);
  const currentWeek = wkRange(td());
  const isCurrentWeek = week.start === currentWeek.start;

  const allScopedCosts = scopeRows(appState.costs);
  const weekScopedCosts = allScopedCosts.filter(c => c.date >= week.start && c.date <= week.end);

  const baseList = viewMode === 'week' ? weekScopedCosts : allScopedCosts;

  // Driver reimbursement summary metrics (computed across active view context)
  const pendingDriverItems = baseList.filter(c => c.status === 'unpaid');
  const pendingDriverAmt = pendingDriverItems.reduce((acc, c) => acc + c.amt, 0);
  const totalCostAmt = baseList.reduce((acc, c) => acc + c.amt, 0);
  const paidCostAmt = baseList.filter(c => c.status !== 'unpaid').reduce((acc, c) => acc + c.amt, 0);

  // Overall pending driver reimbursements across all records (for alert badge)
  const allPendingDriverItems = allScopedCosts.filter(c => c.status === 'unpaid');
  const allPendingDriverAmt = allPendingDriverItems.reduce((acc, c) => acc + c.amt, 0);

  // Apply status and search filters
  const filteredCosts = baseList
    .filter(c => {
      if (statusFilter === 'pending_driver' && c.status !== 'unpaid') return false;
      if (statusFilter === 'paid' && c.status === 'unpaid') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.descr.toLowerCase().includes(q) ||
        (c.driver_name || '').toLowerCase().includes(q) ||
        (c.payment_method || '').toLowerCase().includes(q) ||
        c.date.includes(q)
      );
    })
    .slice()
    .reverse();

  return (
    <>
      <Breadcrumbs currentTab="costs" />

      {/* Driver Reimbursements Pending Banner */}
      {allPendingDriverItems.length > 0 && (
        <div
          style={{
            background: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            borderRadius: '14px',
            padding: '12px 16px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <b style={{ fontSize: '14px', color: '#b45309', display: 'block' }}>
                {allPendingDriverItems.length} Driver Reimbursement{allPendingDriverItems.length > 1 ? 's' : ''} Pending
              </b>
              <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
                Drivers are owed <b>{gh(allPendingDriverAmt)}</b> for out-of-pocket transit, fuel, or collection expenses.
              </small>
            </div>
          </div>
          <button
            type="button"
            className="s"
            onClick={() => {
              setViewMode('all');
              setStatusFilter('pending_driver');
            }}
            style={{
              background: '#b45309',
              color: '#ffffff',
              fontSize: '12px',
              padding: '6px 12px',
              fontWeight: 700,
              minHeight: 'auto'
            }}
          >
            Review Pending Driver Payouts
          </button>
        </div>
      )}

      {/* Expense Entry Form */}
      <form className="c" onSubmit={handleSubmit}>
        <h1>Operating Expenses &amp; Driver Reimbursements</h1>
        <datalist id="cost-suggestions">
          <option value="Van Fuel / Diesel" />
          <option value="Farm Egg Collection Transport" />
          <option value="Driver Daily Transit Allowance" />
          <option value="Police & Highway Toll Barrier" />
          <option value="Van Tyre Repair & Vulcanizing" />
          <option value="Egg Crates Offloading & Loading" />
          <option value="Market Sanitation Levy" />
          <option value="Egg Paper Trays & Packaging" />
          <option value="Shop Electricity / Utility" />
        </datalist>

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
              required
              placeholder="e.g. 80"
              value={amt}
              onChange={e => setAmt(e.target.value)}
            />
          </label>
        </div>

        <label>
          Description
          <input
            list="cost-suggestions"
            required
            placeholder="e.g. Van Fuel, Collection Transport, Crates Offloading"
            value={descr}
            onChange={e => setDescr(e.target.value)}
          />
        </label>

        {/* Driver Expense & Reimbursement Toggle */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--bd)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '14px'
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              margin: 0,
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            <input
              type="checkbox"
              checked={isDriverExpense}
              onChange={e => setIsDriverExpense(e.target.checked)}
              style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer' }}
            />
            <span>🚗 Driver Expense / Transit Cash (Track if Driver is Paid)</span>
          </label>

          {isDriverExpense && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--bd)' }}>
              <div className="r">
                <label>
                  Driver Name
                  <input
                    placeholder="e.g. Delivery Driver or Kofi Mensah"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                  />
                </label>

                <label>
                  Reimbursement Status
                  <select
                    value={reimbursementStatus}
                    onChange={e => setReimbursementStatus(e.target.value as 'unpaid' | 'paid')}
                  >
                    <option value="unpaid">⏳ Unpaid (Driver Needs Reimbursement)</option>
                    <option value="paid">✅ Already Reimbursed / Paid to Driver</option>
                  </select>
                </label>
              </div>

              {reimbursementStatus === 'paid' && (
                <label style={{ marginTop: '6px' }}>
                  Settlement Method
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash Handover</option>
                    <option value="Mobile Money (MoMo)">Mobile Money (MoMo)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Petty Cash">Shop Petty Cash</option>
                  </select>
                </label>
              )}
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Expense'}
        </button>
      </form>

      {/* Expenses & Reimbursement History */}
      <details className="c" open>
        <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⛽ Operating Expenses &amp; Driver Payouts ({filteredCosts.length})</span>
            {pendingDriverItems.length > 0 && (
              <span
                className="sync-pill"
                style={{
                  background: 'rgba(234, 179, 8, 0.2)',
                  color: '#b45309',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                {pendingDriverItems.length} Unpaid
              </span>
            )}
          </div>
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

        {/* View mode toggle (Selected Week vs All Expenses) */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="s"
              onClick={() => setViewMode('week')}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                minHeight: 'auto',
                background: viewMode === 'week' ? 'var(--tx)' : 'var(--bg)',
                color: viewMode === 'week' ? 'var(--cd)' : 'var(--tx)',
                borderColor: viewMode === 'week' ? 'var(--tx)' : 'var(--bd)',
                fontWeight: 700
              }}
            >
              📅 Selected Week ({weekScopedCosts.length})
            </button>
            <button
              type="button"
              className="s"
              onClick={() => setViewMode('all')}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                minHeight: 'auto',
                background: viewMode === 'all' ? 'var(--tx)' : 'var(--bg)',
                color: viewMode === 'all' ? 'var(--cd)' : 'var(--tx)',
                borderColor: viewMode === 'all' ? 'var(--tx)' : 'var(--bd)',
                fontWeight: 700
              }}
            >
              📋 All Expenses ({allScopedCosts.length})
            </button>
          </div>

          <input
            type="search"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ margin: 0, padding: '4px 10px', fontSize: '12px', maxWidth: '180px', height: '32px' }}
          />
        </div>

        {/* Week Navigator when viewing by week */}
        {viewMode === 'week' && (
          <WeekNavigator label="Viewing Operating Costs for this Week" />
        )}

        {/* Summary Stat Cards */}
        <div className="g" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          <div className="card-stat" style={{ padding: '8px 10px' }}>
            <small>Total Expenses</small>
            <b style={{ fontSize: '16px' }}>{gh(totalCostAmt)}</b>
            <span style={{ fontSize: '10px', color: 'var(--mu)' }}>{baseList.length} items</span>
          </div>

          <div
            className="card-stat"
            style={{
              padding: '8px 10px',
              border: pendingDriverAmt > 0 ? '1px solid rgba(234, 179, 8, 0.4)' : undefined,
              background: pendingDriverAmt > 0 ? 'rgba(234, 179, 8, 0.06)' : undefined
            }}
          >
            <small style={{ color: pendingDriverAmt > 0 ? '#b45309' : 'var(--mu)' }}>
              Driver Pending
            </small>
            <b style={{ fontSize: '16px', color: pendingDriverAmt > 0 ? '#b45309' : 'var(--mu)' }}>
              {gh(pendingDriverAmt)}
            </b>
            <span style={{ fontSize: '10px', color: pendingDriverAmt > 0 ? '#b45309' : 'var(--mu)' }}>
              {pendingDriverItems.length} unpaid to driver
            </span>
          </div>

          <div className="card-stat" style={{ padding: '8px 10px' }}>
            <small>Paid / Settled</small>
            <b style={{ fontSize: '16px', color: 'var(--g)' }}>{gh(paidCostAmt)}</b>
            <span style={{ fontSize: '10px', color: 'var(--g)' }}>reimbursed</span>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="s"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              minHeight: 'auto',
              background: statusFilter === 'all' ? 'var(--tx)' : 'var(--bg)',
              color: statusFilter === 'all' ? 'var(--cd)' : 'var(--tx)',
              borderColor: statusFilter === 'all' ? 'var(--tx)' : 'var(--bd)',
              fontWeight: statusFilter === 'all' ? 700 : 500
            }}
          >
            All Statuses
          </button>
          <button
            type="button"
            className="s"
            onClick={() => setStatusFilter('pending_driver')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              minHeight: 'auto',
              background: statusFilter === 'pending_driver' ? '#b45309' : 'var(--bg)',
              color: statusFilter === 'pending_driver' ? '#ffffff' : '#b45309',
              borderColor: statusFilter === 'pending_driver' ? '#b45309' : 'rgba(234, 179, 8, 0.4)',
              fontWeight: 700
            }}
          >
            ⏳ Pending Driver ({pendingDriverItems.length})
          </button>
          <button
            type="button"
            className="s"
            onClick={() => setStatusFilter('paid')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              minHeight: 'auto',
              background: statusFilter === 'paid' ? 'var(--g)' : 'var(--bg)',
              color: statusFilter === 'paid' ? '#ffffff' : 'var(--g)',
              borderColor: statusFilter === 'paid' ? 'var(--g)' : 'rgba(37, 211, 102, 0.4)',
              fontWeight: statusFilter === 'paid' ? 700 : 500
            }}
          >
            ✅ Settled / Paid
          </button>
        </div>

        {/* Expenses List */}
        {filteredCosts.length > 0 ? (
          filteredCosts.map(c => {
            const isUnpaid = c.status === 'unpaid';
            const hasDriver = !!c.driver_name;

            return (
              <div
                key={c.id}
                className="l"
                style={{
                  alignItems: 'center',
                  background: isUnpaid ? 'rgba(234, 179, 8, 0.05)' : undefined,
                  borderLeft: isUnpaid ? '3px solid #b45309' : undefined
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <b>{c.descr}</b>
                    {hasDriver && (
                      <span
                        className="sync-pill"
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--bd)',
                          fontSize: '10px',
                          color: 'var(--tx)',
                          padding: '1px 6px'
                        }}
                      >
                        🚗 {c.driver_name}
                      </span>
                    )}
                  </div>
                  <small style={{ display: 'block', color: 'var(--mu)', marginTop: '2px' }}>
                    {c.date} · {c.shop || 'Company Wide'}
                    {isUnpaid ? (
                      <span style={{ color: '#b45309', fontWeight: 700, marginLeft: '6px' }}>
                        · ⏳ Driver NOT Paid (Reimbursement Pending)
                      </span>
                    ) : (
                      <span style={{ color: 'var(--g)', fontWeight: 600, marginLeft: '6px' }}>
                        · ✅ Paid via {c.payment_method || 'Cash'}{c.paid_date ? ` (${c.paid_date})` : ''}
                      </span>
                    )}
                  </small>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <b style={{ fontSize: '15px' }}>{gh(c.amt)}</b>
                  </div>

                  {/* Driver Pay Action or Toggle */}
                  {isUnpaid ? (
                    <button
                      type="button"
                      onClick={() => setPayingCost(c)}
                      style={{
                        padding: '5px 12px',
                        fontSize: '11px',
                        minHeight: 'auto',
                        background: '#b45309',
                        color: '#ffffff',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Mark expense as paid/reimbursed to driver"
                    >
                      <span>💳</span>
                      <span>Pay Driver</span>
                    </button>
                  ) : (
                    hasDriver && (
                      <button
                        type="button"
                        className="s"
                        onClick={() => toggleCostPaid(c.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          minHeight: 'auto',
                          background: 'var(--bg)',
                          color: 'var(--mu)'
                        }}
                        title="Toggle status back to unpaid"
                      >
                        Undo Paid
                      </button>
                    )
                  )}

                  {mayDel('costs', c) && (
                    <button
                      type="button"
                      className="s"
                      onClick={() => delItem('costs', c.id)}
                      title={`Delete expense: ${c.descr}`}
                      aria-label={`Delete expense ${c.descr}`}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: 'var(--rd)',
                        borderColor: 'rgba(239, 68, 68, 0.35)',
                        background: 'var(--bg)',
                        fontWeight: 600,
                        minHeight: 'auto'
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg)', borderRadius: '10px' }}>
            <p style={{ margin: 0, color: 'var(--mu)', fontSize: '13px' }}>
              {statusFilter === 'pending_driver'
                ? 'No pending driver reimbursements found! All driver expenses are settled.'
                : viewMode === 'week'
                ? `No operating expenses recorded for ${week.start} to ${week.end}.`
                : 'No expenses found matching your search.'}
            </p>
            {viewMode === 'week' && statusFilter === 'all' && (
              <button
                type="button"
                className="s"
                onClick={() => setViewMode('all')}
                style={{ marginTop: '8px', fontSize: '12px', padding: '4px 10px' }}
              >
                View All Expenses History
              </button>
            )}
          </div>
        )}
      </details>

      {/* Pay Driver Modal */}
      {payingCost && (
        <PayDriverModal
          cost={payingCost}
          onConfirm={(costId, method, paidDate) => {
            markCostPaid(costId, method, paidDate);
            setPayingCost(null);
          }}
          onClose={() => setPayingCost(null)}
        />
      )}
    </>
  );
};
