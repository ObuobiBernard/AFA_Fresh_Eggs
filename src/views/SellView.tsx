import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SHOPS, td, gh, formatPhone, COUNTRY_DIAL_CODES } from '../constants';
import { SaleItem } from '../types';
import { vibrateSuccess } from '../utils/haptics';
import { ReceiptModal } from '../components/ReceiptModal';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const SellView: React.FC = () => {
  const { appState, can, myShop, me, shopStockQty, scopeRows, addSale, mayDel, delItem } = useApp();

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

  const recentSales = scopeRows(appState.sales).slice(-8).reverse();

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

      {/* Recent Sales History (Collapsible Dropdown) */}
      <details className="c">
        <summary>
          <span>🧾 Recent Sales History ({recentSales.length})</span>
          <span className="summary-chevron">▼</span>
        </summary>
        {recentSales.length > 0 ? (
          recentSales.map(s => {
            const tot = s.qty * s.price;
            const bal = Math.max(0, tot - s.paid);
            const cObj = appState.customers.find(c => c.id === s.cust_id);

            return (
              <div key={s.id} className="l">
                <div>
                  <b>{s.lbl} ({s.qty} crates)</b>
                  <small>
                    {s.date} · {cObj ? cObj.name : 'Walk-in'} ({s.method})
                  </small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b>{gh(tot)}</b>
                  {bal > 0 ? (
                    <small style={{ color: 'var(--rd)', display: 'block' }}>Due: {gh(bal)}</small>
                  ) : (
                    <small style={{ color: 'var(--g)', display: 'block' }}>Paid</small>
                  )}
                  {mayDel('sales', s) && (
                    <button
                      type="button"
                      className="s"
                      onClick={() => delItem('sales', s.id)}
                      style={{
                        marginLeft: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        color: 'var(--rd)',
                        borderColor: 'rgba(239, 68, 68, 0.35)',
                        background: 'var(--bg)',
                        fontWeight: 600
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
          <small style={{ color: 'var(--mu)' }}>No sales recorded yet.</small>
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
