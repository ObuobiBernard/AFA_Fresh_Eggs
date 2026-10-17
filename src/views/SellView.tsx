import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SHOPS, td, gh, formatPhone, COUNTRY_DIAL_CODES } from '../constants';
import { SaleItem } from '../types';
import { vibrateSuccess } from '../utils/haptics';
import { ReceiptModal } from '../components/ReceiptModal';

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

  const [receiptSale, setReceiptSale] = useState<SaleItem | null>(null);

  useEffect(() => {
    if (attendantShop) {
      setShop(attendantShop);
    }
  }, [attendantShop]);

  useEffect(() => {
    const sel = prices.find(p => p.id === pid);
    if (sel) {
      setPrice(String(sel.sell));
    }
  }, [pid, prices]);

  if (!prices.length) {
    return <div className="c">Add your farms and prices first in the <b>Prices</b> tab.</div>;
  }

  if (!can('sell')) {
    return (
      <div className="c">
        <h2>🔒 New sale</h2>
        <p style={{ color: 'var(--mu)', fontSize: '14px', margin: '0 0 4px' }}>
          Your role does not include access to this screen.
        </p>
      </div>
    );
  }

  const numQty = parseFloat(qty) || 0;
  const numPrice = parseFloat(price) || 0;
  const total = numQty * numPrice;

  // Stock check
  const availStock = shopStockQty(shop, pid);
  const exceedsStock = numQty > 0 && numQty > availStock;
  const isLowStock = availStock > 0 && availStock <= 10;
  const isOutOfStock = availStock <= 0;

  // Customer existence check
  const trimmedCust = custName.trim();
  const existingCust = trimmedCust
    ? customers.find(c => c.name.toLowerCase() === trimmedCust.toLowerCase())
    : null;
  const isNewCustomer = !!trimmedCust && !existingCust;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

      // Find the created sale to prompt receipt modal
      const createdSale = {
        id: 'new',
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
  };

  const recentSales = scopeRows(appState.sales).slice(-8).reverse();

  return (
    <>
      <form className="c" onSubmit={handleSubmit}>
        <h2>New sale</h2>
        <datalist id="cl">
          {customers.map(c => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>

        <div className="r">
          <label>
            Date
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>

          {attendantShop ? (
            <label>
              Shop
              <input value={attendantShop} readOnly style={{ background: 'var(--bg)', color: 'var(--mu)' }} />
            </label>
          ) : (
            <label>
              Shop
              <select value={shop} onChange={e => setShop(e.target.value)}>
                {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}
        </div>

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

        <div
          style={{
            fontSize: '13px',
            margin: '-4px 0 10px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span className={exceedsStock ? 'n' : ''}>
            📦 Available in {shop}: <b>{availStock}</b> crates {exceedsStock && '(Exceeds current stock!)'}
          </span>
          {isLowStock && !exceedsStock && (
            <span style={{ color: '#F5A623', fontSize: '11px', fontWeight: 700 }}>
              ⚠️ Low Stock ({availStock} left)
            </span>
          )}
          {isOutOfStock && (
            <span style={{ color: '#D32F2F', fontSize: '11px', fontWeight: 700 }}>
              🚫 Out of Stock
            </span>
          )}
        </div>

        <div className="r">
          <label>
            Crates
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 10"
              value={qty}
              autoFocus
              onChange={e => setQty(e.target.value)}
            />
          </label>
          <label>
            Price / crate
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
              list="cl"
              placeholder="Name (or Walk-in)"
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
            <option value="c">On credit</option>
          </select>
        </label>

        {payStatus === 'p' && (
          <label>
            Amount paid now
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={paidAmt}
              onChange={e => setPaidAmt(e.target.value)}
            />
          </label>
        )}

        {payStatus !== 'f' && (
          <label>
            Due within
            <select value={dueDays} onChange={e => setDueDays(e.target.value)}>
              <option value="7">1 week</option>
              <option value="14">2 weeks</option>
              <option value="30">1 month</option>
            </select>
          </label>
        )}

        <div style={{ marginBottom: '10px', fontWeight: 600 }}>
          Total: {gh(total)}
        </div>

        <button type="submit">Save sale</button>
      </form>

      {/* Recent Sales & Receipts */}
      <div className="c">
        <h3>Recent Sales & Receipts</h3>
        {recentSales.length > 0 ? (
          recentSales.map(s => {
            const custObj = customers.find(c => c.id === s.cust_id);
            const phone = custObj ? custObj.phone : '';
            const totalAmt = s.qty * s.price;
            const dueAmt = totalAmt - s.paid;

            const msg = encodeURIComponent(
              `*AFA FRESH EGGS*\nDate: ${s.date}\nItem: ${s.lbl}\nQty: ${s.qty} crates\nTotal: ${gh(totalAmt)}\nPaid: ${gh(s.paid)}` +
              (dueAmt > 0 ? `\nBalance Due: ${gh(dueAmt)}` : '\nStatus: PAID')
            );
            const waLink = phone ? `https://wa.me/${formatPhone(phone)}?text=${msg}` : null;
            const canDelete = mayDel('sales', s);

            return (
              <div className="l" key={s.id}>
                <div>
                  <b>{s.lbl}</b> · {s.qty} × {gh(s.price)}
                  <small>
                    {s.date} · {s.shop} · {custObj ? custObj.name : 'Walk-in'}
                    {dueAmt > 0 && <span className="n"> · Due {gh(dueAmt)}</span>}
                  </small>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="s"
                      style={{ color: 'var(--tx)', border: '1px solid var(--bd)', background: 'var(--bg)', padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => setReceiptSale(s)}
                    >
                      🖨️ Receipt
                    </button>
                    {waLink && (
                      <a
                        className="btn-link btn-wa"
                        style={{ padding: '5px 10px', fontSize: '12px', width: 'auto' }}
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    className="s"
                    onClick={() => delItem('sales', s.id)}
                    title="Delete sale"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <small style={{ color: 'var(--mu)' }}>No sales yet.</small>
        )}
      </div>

      {/* Printable / POS Receipt Modal */}
      {receiptSale && (
        <ReceiptModal
          sale={receiptSale}
          customer={customers.find(c => c.id === receiptSale.cust_id) || null}
          onClose={() => setReceiptSale(null)}
        />
      )}
    </>
  );
};
