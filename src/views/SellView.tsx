import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SHOPS, td, gh, formatPhone, COUNTRY_DIAL_CODES, wkRange } from '../constants';
import { SaleItem } from '../types';
import { vibrateSuccess } from '../utils/haptics';
import { ReceiptModal } from '../components/ReceiptModal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { WeekNavigator } from '../components/WeekNavigator';

export const SellView: React.FC = () => {
  const { appState, can, myShop, me, shopStockQty, scopeRows, addSale, mayDel, delItem, selDate } = useApp();

  const prices = appState.prices;
  const customers = appState.customers;
  const attendantShop = myShop();

  const [date, setDate] = useState(td());
  const [shop, setShop] = useState(attendantShop || SHOPS[0]);
  const [pid, setPid] = useState(prices[0]?.id || '');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState(prices[0]?.sell ? String(prices[0].sell) : '');
  const [custName, setCustName] = useState('');
  const [custDialCode, setCustDialCode] = useState('+233');
  const [custPhone, setCustPhone] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payStatus, setPayStatus] = useState<'f' | 'p' | 'c'>('f');
  const [paidAmt, setPaidAmt] = useState('');
  const [dueDays, setDueDays] = useState('7');
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'all'>('week');
  const [searchQuery, setSearchQuery] = useState('');

  const [receiptSale, setReceiptSale] = useState<SaleItem | null>(null);

  useEffect(() => {
    if (attendantShop) {
      setShop(attendantShop);
    }
  }, [attendantShop]);

  useEffect(() => {
    const selP = prices.find(p => p.id === pid);
    if (selP) {
      setPrice(String(selP.sell));
    }
  }, [pid, prices]);

  if (!can('sell')) {
    return (
      <div className="c">
        <h2>🔒 Record Sale</h2>
        <p style={{ color: 'var(--mu)', fontSize: '14px', margin: '0 0 4px' }}>
          Your role does not include access to this screen.
        </p>
      </div>
    );
  }

  const numQty = parseInt(qty, 10) || 0;
  const numPrice = parseFloat(price) || 0;
  const total = numQty * numPrice;
  const availStock = shopStockQty(shop, pid);

  const trimmedCust = custName.trim();
  const existingCust = trimmedCust
    ? customers.find(c => c.name.toLowerCase() === trimmedCust.toLowerCase())
    : null;
  const isNewCustomer = !!trimmedCust && !existingCust;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const finalCustPhone = custPhone.trim()
      ? (custDialCode === '+' ? custPhone.trim() : `${custDialCode}${custPhone.trim().replace(/^0+/, '')}`)
      : undefined;

    const ok = addSale({
      date,
      pid,
      qty: numQty,
      price: numPrice,
      shop,
      custName,
      custPhone: isNewCustomer ? finalCustPhone : undefined,
      method: payMethod,
      payStatus,
      paidAmt: parseFloat(paidAmt) || 0,
      dueDays: parseInt(dueDays, 10) || 7
    });

    if (ok) {
      vibrateSuccess();

      const createdSale: SaleItem = {
        id: 'sale-' + Date.now(),
        date,
        pid,
        lbl: prices.find(p => p.id === pid)?.farm + ' · ' + prices.find(p => p.id === pid)?.item,
        qty: numQty,
        price: numPrice,
        shop,
        cust_id: existingCust?.id || null,
        paid: payStatus === 'f' ? total : payStatus === 'c' ? 0 : Math.min(parseFloat(paidAmt) || 0, total),
        method: payMethod,
        due: payStatus !== 'f' ? td() : ''
      };
      setReceiptSale(createdSale);

      setQty('');
      setCustName('');
      setCustPhone('');
      setPayStatus('f');
      setPaidAmt('');
    }
    setTimeout(() => setSubmitting(false), 400);
  };

  const activeDate = selDate || td();
  const week = wkRange(activeDate);
  const currentWeek = wkRange(td());
  const isCurrentWeek = week.start === currentWeek.start;

  const allScopedSales = scopeRows(appState.sales);
  const weekScopedSales = allScopedSales.filter(s => s.date >= week.start && s.date <= week.end);

  const sourceSales = viewMode === 'week' ? weekScopedSales : allScopedSales;
  const filteredSales = sourceSales
    .filter(s => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const cObj = appState.customers.find(c => c.id === s.cust_id);
      const custNameStr = cObj ? cObj.name.toLowerCase() : 'walk-in';
      return (
        s.lbl.toLowerCase().includes(q) ||
        (s.shop || '').toLowerCase().includes(q) ||
        s.date.includes(q) ||
        s.method.toLowerCase().includes(q) ||
        custNameStr.includes(q)
      );
    })
    .slice()
    .reverse();

  // Selected week totals
  const weekCrates = weekScopedSales.reduce((acc, s) => acc + s.qty, 0);
  const weekRevenue = weekScopedSales.reduce((acc, s) => acc + s.qty * s.price, 0);
  const weekPaid = weekScopedSales.reduce((acc, s) => acc + s.paid, 0);
  const weekDue = Math.max(0, weekRevenue - weekPaid);

  return (
    <>
      <Breadcrumbs currentTab="sell" />

      <form className="c" onSubmit={handleSubmit}>
        <h1>Record Egg Sale &amp; Mobile Receipts</h1>
        <datalist id="customer-list">
          {customers.map(c => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>

        <div className="r">
          <label>
            Date
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>

          <label>
            Shop
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
          Egg Size / Farm
          <select value={pid} onChange={e => setPid(e.target.value)}>
            {prices.map(p => (
              <option key={p.id} value={p.id}>
                {p.farm} · {p.item} ({gh(p.sell)}/crate)
              </option>
            ))}
          </select>
        </label>

        <div className="r">
          <label>
            Quantity (Crates)
            <input
              type="number"
              min="1"
              required
              placeholder="e.g. 5"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </label>

          <label>
            Price per Crate
            <input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </label>
        </div>

        <div className="r">
          <label>
            Customer
            <input
              list="customer-list"
              placeholder="Customer Name or Walk-in"
              value={custName}
              onChange={e => setCustName(e.target.value)}
            />
          </label>

          {isNewCustomer && (
            <label>
              New Customer Phone
              <div style={{ display: 'grid', gridTemplateColumns: '125px 1fr', gap: '6px', marginTop: '4px' }}>
                <select
                  value={custDialCode}
                  onChange={e => setCustDialCode(e.target.value)}
                  aria-label="Country Code"
                  style={{ margin: 0, fontSize: '13px', padding: '10px 4px' }}
                >
                  {COUNTRY_DIAL_CODES.map(cd => (
                    <option key={cd.code} value={cd.code}>
                      {cd.flag} {cd.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  style={{ margin: 0 }}
                />
              </div>
            </label>
          )}
        </div>

        <label>
          Payment Method
          <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
            <option>Cash</option>
            <option>Mobile Money</option>
          </select>
        </label>

        <label>
          Payment Status
          <select value={payStatus} onChange={e => setPayStatus(e.target.value as any)}>
            <option value="f">Paid in full</option>
            <option value="p">Part paid</option>
            <option value="c">On credit (Owed)</option>
          </select>
        </label>

        {payStatus === 'p' && (
          <label>
            Amount Paid Now
            <input
              type="number"
              inputMode="decimal"
              placeholder={`Max ${gh(total)}`}
              value={paidAmt}
              onChange={e => setPaidAmt(e.target.value)}
            />
          </label>
        )}

        {total > 0 && (
          <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: '10px', marginBottom: '12px', fontSize: '13px' }}>
            <span>Total: <b>{gh(total)}</b></span>
            {availStock < numQty && (
              <span style={{ color: 'var(--rd)', display: 'block', fontSize: '12px', marginTop: '2px' }}>
                ⚠️ Warning: Only {availStock} crates currently in shop inventory.
              </span>
            )}
          </div>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Recording...' : 'Record Sale'}
        </button>
      </form>

      {/* Sales History & Weekly Reports */}
      <details className="c" open>
        <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧾 Sales Records &amp; History ({filteredSales.length})</span>
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
              📅 Selected Week ({weekScopedSales.length})
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
              📋 All Sales ({allScopedSales.length})
            </button>
          </div>

          <input
            type="search"
            placeholder="Search sales..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ margin: 0, padding: '4px 10px', fontSize: '12px', maxWidth: '200px', height: '32px' }}
          />
        </div>

        {/* Week Navigator when viewing by week */}
        {viewMode === 'week' && (
          <>
            <WeekNavigator label="Viewing Sales for this Week" />

            {/* Selected week summary cards */}
            <div className="g" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
              <div className="card-stat" style={{ padding: '8px 10px' }}>
                <small>Crates Sold</small>
                <b style={{ fontSize: '16px' }}>{weekCrates}</b>
                <span style={{ fontSize: '10px', color: 'var(--mu)' }}>in selected week</span>
              </div>
              <div className="card-stat" style={{ padding: '8px 10px' }}>
                <small>Sales Revenue</small>
                <b style={{ fontSize: '16px', color: 'var(--g)' }}>{gh(weekRevenue)}</b>
                <span style={{ fontSize: '10px', color: 'var(--mu)' }}>total value</span>
              </div>
              <div className="card-stat" style={{ padding: '8px 10px' }}>
                <small>Cash Received</small>
                <b style={{ fontSize: '16px' }}>{gh(weekPaid)}</b>
                <span style={{ fontSize: '10px', color: 'var(--g)' }}>settled in cash/momo</span>
              </div>
              <div className="card-stat" style={{ padding: '8px 10px' }}>
                <small>Credit / Balance Due</small>
                <b style={{ fontSize: '16px', color: weekDue > 0 ? 'var(--rd)' : 'var(--mu)' }}>{gh(weekDue)}</b>
                <span style={{ fontSize: '10px', color: 'var(--mu)' }}>owed by customers</span>
              </div>
            </div>
          </>
        )}

        {/* Sales List */}
        {filteredSales.length > 0 ? (
          filteredSales.map(s => {
            const tot = s.qty * s.price;
            const bal = Math.max(0, tot - s.paid);
            const cObj = appState.customers.find(c => c.id === s.cust_id);
            const customerDisplayName = cObj ? cObj.name : 'Walk-in';

            return (
              <div key={s.id} className="l" style={{ alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b>{s.lbl} ({s.qty} crates)</b>
                  <small style={{ display: 'block', color: 'var(--mu)' }}>
                    {s.date} · {customerDisplayName} ({s.method}) · {s.shop}
                  </small>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div>
                    <b>{gh(tot)}</b>
                    {bal > 0 ? (
                      <small style={{ color: 'var(--rd)', display: 'block' }}>Due: {gh(bal)}</small>
                    ) : (
                      <small style={{ color: 'var(--g)', display: 'block' }}>Paid</small>
                    )}
                  </div>

                  {/* Receipt Trigger */}
                  <button
                    type="button"
                    className="s"
                    onClick={() => {
                      setReceiptSale(s);
                    }}
                    title="Print or share receipt"
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      minHeight: 'auto',
                      background: 'var(--bg)',
                      border: '1px solid var(--bd)'
                    }}
                  >
                    🧾
                  </button>

                  {mayDel('sales', s) && (
                    <button
                      type="button"
                      className="s"
                      onClick={() => delItem('sales', s.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: 'var(--rd)',
                        borderColor: 'rgba(239, 68, 68, 0.35)',
                        background: 'var(--bg)',
                        fontWeight: 600,
                        minHeight: 'auto'
                      }}
                      title="Delete sale permanently"
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
                ? `No sales recorded for ${week.start} to ${week.end}.`
                : 'No sales recorded match your search.'}
            </p>
            {viewMode === 'week' && (
              <button
                type="button"
                className="s"
                onClick={() => setViewMode('all')}
                style={{ marginTop: '8px', fontSize: '12px', padding: '4px 10px' }}
              >
                View All Sales History
              </button>
            )}
          </div>
        )}
      </details>

      {receiptSale && (
        <ReceiptModal
          sale={receiptSale}
          customer={existingCust || (custName ? { id: '', name: custName, phone: custPhone } : null)}
          onClose={() => setReceiptSale(null)}
        />
      )}
    </>
  );
};
