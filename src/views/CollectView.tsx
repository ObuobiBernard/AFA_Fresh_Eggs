import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SHOPS, td, gh, wkRange } from '../constants';
import { FarmerItem } from '../types';
import { vibrateSuccess } from '../utils/haptics';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { FarmerProfileModal } from '../components/FarmerProfileModal';
import { FarmerPaymentModal } from '../components/FarmerPaymentModal';
import { WeekNavigator } from '../components/WeekNavigator';

export const CollectView: React.FC = () => {
  const {
    appState,
    can,
    myShop,
    addCol,
    payFarmerDirect,
    farmerBalances,
    addFarmer,
    updateFarmer,
    scopeRows,
    mayDel,
    delItem,
    delFarmer,
    selDate
  } = useApp();

  const prices = appState.prices;
  const attendantShop = myShop();

  const [date, setDate] = useState(td());
  const [pid, setPid] = useState(prices[0]?.id || '');
  const [qty, setQty] = useState('');
  const [shop, setShop] = useState(attendantShop || SHOPS[0]);
  const [paidAmt, setPaidAmt] = useState('');
  const [transport, setTransport] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'all'>('week');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for farmer bank account & payouts
  const [payingFarm, setPayingFarm] = useState<{
    farmName: string;
    farmer?: FarmerItem | null;
    balanceDue: number;
  } | null>(null);

  const [editingFarmer, setEditingFarmer] = useState<{
    farmName: string;
    farmer?: FarmerItem | null;
    balanceDue: number;
  } | null>(null);

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

  const farmBalancesList = farmerBalances();

  const activeDate = selDate || td();
  const week = wkRange(activeDate);
  const currentWeek = wkRange(td());
  const isCurrentWeek = week.start === currentWeek.start;

  const allScopedCols = scopeRows(appState.col);
  const weekScopedCols = allScopedCols.filter(c => c.date >= week.start && c.date <= week.end);

  const sourceCols = viewMode === 'week' ? weekScopedCols : allScopedCols;
  const filteredCols = sourceCols
    .filter(c => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.lbl || '').toLowerCase().includes(q) ||
        (c.shop || '').toLowerCase().includes(q) ||
        c.date.includes(q)
      );
    })
    .slice()
    .reverse();

  // Weekly metrics
  const weekCrates = weekScopedCols.reduce((acc, c) => acc + c.qty, 0);
  const weekCost = weekScopedCols.reduce((acc, c) => acc + c.qty * c.buy, 0);
  const weekPaid = weekScopedCols.reduce((acc, c) => acc + (c.paid_amt || 0), 0);
  const weekOwed = Math.max(0, weekCost - weekPaid);

  return (
    <>
      <Breadcrumbs currentTab="collect" />

      {/* Record Collection Form */}
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
          Farm &amp; Egg Size
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

      {/* Farmer Accounts & Direct GTBank Payout Hub (Collapsible Dropdown) */}
      <details className="c" open={farmBalancesList.some(f => f.balanceDue > 0)}>
        <summary>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>🌾 Farmer Accounts &amp; Payouts ({farmBalancesList.length})</span>
            {farmBalancesList.filter(f => f.balanceDue > 0).length > 0 && (
              <span className="sync-pill" style={{ background: 'rgba(220, 38, 38, 0.15)', color: 'var(--rd)', fontSize: '11px' }}>
                {farmBalancesList.filter(f => f.balanceDue > 0).length} Owed
              </span>
            )}
          </div>
          <span className="summary-chevron">▼</span>
        </summary>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
            Bank account details, GTBank direct transfer &amp; supply settlements
          </small>
          <button
            type="button"
            className="s"
            onClick={e => {
              e.preventDefault();
              setEditingFarmer({ farmName: '', farmer: null, balanceDue: 0 });
            }}
            style={{ fontSize: '12px', padding: '5px 12px', minHeight: 'auto' }}
          >
            + Add Farmer Bank
          </button>
        </div>

        {farmBalancesList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {farmBalancesList.map(item => {
              const hasBank = !!(item.farmer && item.farmer.account_number);

              return (
                <div
                  key={item.farmName}
                  className="l"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '8px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--bd)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <b
                        style={{ fontSize: '15px', color: 'var(--tx)', cursor: 'pointer' }}
                        onClick={() => setEditingFarmer(item)}
                        title="Click to view bank details"
                      >
                        {item.farmName}
                      </b>
                      <small style={{ display: 'block', color: 'var(--mu)', marginTop: '2px' }}>
                        {item.farmer?.phone ? `📞 ${item.farmer.phone} · ` : ''}
                        {hasBank ? (
                          <span style={{ color: 'var(--g)', fontWeight: 600 }}>
                            🏦 {item.farmer?.bank_name} ({item.farmer?.account_number})
                          </span>
                        ) : (
                          <span style={{ color: '#D97706' }}>
                            ⚠️ Bank details not added
                          </span>
                        )}
                      </small>
                    </div>

                    <div style={{ textAlign: 'right', flex: 'none' }}>
                      {item.balanceDue > 0 ? (
                        <b style={{ color: 'var(--rd)', fontSize: '15px', display: 'block' }}>
                          Owed: {gh(item.balanceDue)}
                        </b>
                      ) : (
                        <span style={{ color: 'var(--g)', fontSize: '12px', fontWeight: 700, display: 'block' }}>
                          ✅ Fully Settled
                        </span>
                      )}
                      <small style={{ color: 'var(--mu)', fontSize: '11px' }}>
                        {item.totalCrates} crates total
                      </small>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--bd)', paddingTop: '8px' }}>
                    <button
                      type="button"
                      className="s"
                      onClick={() => setEditingFarmer(item)}
                      style={{ fontSize: '12px', padding: '5px 10px', minHeight: 'auto', background: 'var(--cd)' }}
                    >
                      {hasBank ? '👤 Bank Profile' : '+ Set Bank Details'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayingFarm(item)}
                      style={{
                        fontSize: '12px',
                        padding: '5px 14px',
                        minHeight: 'auto',
                        background: hasBank ? '#E05A10' : 'var(--g)',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>💳</span>
                      <span>Pay Funds</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <small style={{ color: 'var(--mu)' }}>No farms registered yet.</small>
        )}
      </details>

      {/* Collections History & Weekly Reports */}
      <details className="c" open>
        <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📦 Farm Collections History ({filteredCols.length})</span>
            {viewMode === 'week' && (
              <span className="sync-pill" style={{ background: 'rgba(37, 211, 102, 0.15)', color: 'var(--g)', fontSize: '11px' }}>
                {isCurrentWeek ? 'This Week' : `${week.start} – ${week.end}`}
              </span>
            )}
          </div>
          <span className="summary-chevron">▼</span>
        </summary>

        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
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
              📅 Selected Week ({weekScopedCols.length})
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
              📋 All Collections ({allScopedCols.length})
            </button>
          </div>

          <input
            type="search"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ margin: 0, padding: '4px 10px', fontSize: '12px', maxWidth: '200px', height: '32px' }}
          />
        </div>

        {/* Week Navigator when viewing by week */}
        {viewMode === 'week' && (
          <>
            <WeekNavigator label="Viewing Collections for this Week" />

            {/* Selected week summary cards */}
            <div className="g" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
              <div className="card-stat" style={{ padding: '8px 10px' }}>
                <small>Crates Collected</small>
                <b style={{ fontSize: '16px' }}>{weekCrates}</b>
                <span style={{ fontSize: '10px', color: 'var(--mu)' }}>in selected week</span>
              </div>
              <div className="card-stat" style={{ padding: '8px 10px' }}>
                <small>Farm Purchase Cost</small>
                <b style={{ fontSize: '16px', color: 'var(--tx)' }}>{gh(weekCost)}</b>
                <span style={{ fontSize: '10px', color: 'var(--mu)' }}>total supply value</span>
              </div>
              <div className="card-stat" style={{ padding: '8px 10px' }}>
                <small>Paid to Farmers</small>
                <b style={{ fontSize: '16px', color: 'var(--g)' }}>{gh(weekPaid)}</b>
                <span style={{ fontSize: '10px', color: 'var(--g)' }}>settled to suppliers</span>
              </div>
              <div className="card-stat" style={{ padding: '8px 10px' }}>
                <small>Farmer Balance Due</small>
                <b style={{ fontSize: '16px', color: weekOwed > 0 ? 'var(--rd)' : 'var(--mu)' }}>{gh(weekOwed)}</b>
                <span style={{ fontSize: '10px', color: 'var(--mu)' }}>owed to farmers</span>
              </div>
            </div>
          </>
        )}

        {/* Collections List */}
        {filteredCols.length > 0 ? (
          filteredCols.map(c => {
            const total = c.qty * c.buy;
            const remaining = Math.max(0, total - (c.paid_amt || 0));
            const farmName = c.lbl ? c.lbl.split(' · ')[0].trim() : '';

            return (
              <div key={c.id} className="l">
                <div>
                  <b>{c.lbl} ({c.qty} crates)</b>
                  <small style={{ display: 'block', color: 'var(--mu)' }}>
                    {c.date} · {c.shop} · Rate: {gh(c.buy)}/crate
                  </small>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div>
                    <b>{gh(total)}</b>
                    {remaining > 0 ? (
                      <small style={{ color: 'var(--rd)', display: 'block' }}>Owed: {gh(remaining)}</small>
                    ) : (
                      <small style={{ color: 'var(--g)', display: 'block' }}>Paid in full</small>
                    )}
                  </div>

                  {remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const matchingItem = farmBalancesList.find(
                          f => f.farmName.toLowerCase() === farmName.toLowerCase()
                        );
                        setPayingFarm({
                          farmName: farmName || 'Farm Supplier',
                          farmer: matchingItem?.farmer,
                          balanceDue: remaining
                        });
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        minHeight: 'auto',
                        background: '#E05A10',
                        color: '#ffffff'
                      }}
                    >
                      Pay
                    </button>
                  )}

                  {mayDel('col', c) && (
                    <button
                      type="button"
                      className="s"
                      onClick={() => delItem('col', c.id)}
                      style={{
                        marginLeft: '4px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        color: 'var(--rd)',
                        borderColor: 'rgba(239, 68, 68, 0.35)',
                        background: 'var(--bg)',
                        fontWeight: 600
                      }}
                      title="Delete collection permanently"
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
              {viewMode === 'week'
                ? `No collections recorded for ${week.start} to ${week.end}.`
                : 'No collections recorded match your search.'}
            </p>
            {viewMode === 'week' && (
              <button
                type="button"
                className="s"
                onClick={() => setViewMode('all')}
                style={{ marginTop: '8px', fontSize: '12px', padding: '4px 10px' }}
              >
                View All Collections History
              </button>
            )}
          </div>
        )}
      </details>

      {/* Farmer Profile Modal (Bank Details) */}
      {editingFarmer && (
        <FarmerProfileModal
          farmName={editingFarmer.farmName}
          farmer={editingFarmer.farmer}
          balanceDue={editingFarmer.balanceDue}
          onSave={(data, existingId) => {
            if (existingId) {
              updateFarmer(existingId, data);
            } else {
              addFarmer(data);
            }
          }}
          onOpenPay={() => setPayingFarm(editingFarmer)}
          onClose={() => setEditingFarmer(null)}
          onDelete={delFarmer}
        />
      )}

      {/* Farmer Payment Modal (GTBank Direct Payout) */}
      {payingFarm && (
        <FarmerPaymentModal
          farmName={payingFarm.farmName}
          farmer={payingFarm.farmer}
          balanceDue={payingFarm.balanceDue}
          onOpenEditProfile={() => {
            setEditingFarmer(payingFarm);
            setPayingFarm(null);
          }}
          onConfirmPayment={(fName, amt, method) => {
            return payFarmerDirect(fName, amt, method);
          }}
          onClose={() => setPayingFarm(null)}
        />
      )}
    </>
  );
};
