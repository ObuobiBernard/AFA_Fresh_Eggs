/* AFA Fresh Eggs Manager
   1 Config · 2 Helpers · 3 Data sync · 4 Views · 5 Actions · 6 Start-up */
'use strict';
(function () {

/* ==========================================
   1. CONFIG & STATE
   ========================================== */
// The publishable key is designed to be public. Your data is protected by
// Row Level Security in Supabase, not by hiding this key.
// If you change SB_URL, update connect-src in the CSP tag in index.html too.
const SB_URL = 'https://vitalucvobokjkdogwiq.supabase.co';
const SB_KEY = 'sb_publishable_H57950cizG2oEs2q6O2_fQ_gv7v8DgB';

const SHOPS = ['Main Shop', 'Market Shop'];
const TB = { prices: 'prices', col: 'collections', sales: 'sales', pay: 'payments', costs: 'costs', customers: 'customers' };
const NUMS = { prices: ['buy', 'sell'], col: ['qty', 'buy'], sales: ['qty', 'price', 'paid'], pay: ['amt'], costs: ['amt'], customers: [] };
const TABS = [['home', 'Home'], ['collect', 'Collect'], ['sell', 'Sell'], ['credit', 'Credit'], ['costs', 'Costs'], ['prices', 'Prices']];
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  collect: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  sell: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2-.5-2.5-1.5"/><path d="M12 6v2M12 16v2"/>',
  credit: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  costs: '<path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  prices: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>'
};
const PAGE = 5, MORE = 10;

const S = { prices: [], col: [], sales: [], pay: [], costs: [], customers: [] };
let snap = {};            // what the server last confirmed, per table and id
let SB = null;            // Supabase client
let tab = 'home';
let signedIn = false;
let typing = false;       // true while a form has unsaved input
let lastLoad = 0;
let loadErr = [];         // tables that failed to load
let syncState = 'ok';
let running = null;       // the save currently in flight
let again = false;        // another save was requested while one was running
const shown = {};         // how many rows each "recent" list shows
const last = { pid: '', shop: SHOPS[0] }; // remembers the last farm and shop picked

/* ==========================================
   2. HELPERS
   ========================================== */
const $ = (s, r) => (r || document).querySelector(s);
const toNum = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
const round2 = n => Math.round(n * 100) / 100;
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const nkey = s => String(s || '').trim().toLowerCase();
const uid = () => { const a = new Uint8Array(10); crypto.getRandomValues(a); return Array.from(a, b => (b % 36).toString(36)).join(''); };

// Dates are kept as local YYYY-MM-DD strings.
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const td = () => ymd(new Date());
const addDays = (iso, n) => { const p = iso.split('-').map(Number); return ymd(new Date(p[0], p[1] - 1, p[2] + n)); };
const wkStart = () => { const x = new Date(); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return ymd(x); };
const dmy = iso => {
  if (!iso) return '';
  const p = iso.split('-').map(Number), o = { day: 'numeric', month: 'short' };
  if (p[0] !== new Date().getFullYear()) o.year = 'numeric';
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-GB', o);
};

const gh = n => {
  const r = Math.abs(round2(n));
  return (n < -0.004 ? '−' : '') + 'GH₵ ' + r.toLocaleString('en-GH', { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 });
};

// Safe templating: every ${value} is HTML-escaped unless it came from html``.
class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ins = v => v instanceof Safe ? v.s : Array.isArray(v) ? v.map(ins).join('') : (v === false || v == null) ? '' : esc(v);
const html = (strs, ...vals) => new Safe(strs.reduce((o, s, i) => o + s + (i < vals.length ? ins(vals[i]) : ''), ''));

// Phones: digits only for WhatsApp (Ghana: 024... becomes 233 24...), cleaned for tel: links.
function waNumber(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.indexOf('00') === 0) d = d.slice(2);
  else if (d.charAt(0) === '0') d = '233' + d.slice(1);
  else if (d.length === 9) d = '233' + d;
  return d.length >= 11 && d.length <= 15 ? d : '';
}
const telHref = p => String(p || '').replace(/[^\d+]/g, '');

const prod = id => S.prices.find(p => p.id == id);
const phoneOf = name => { const c = S.customers.find(x => nkey(x.name) === nkey(name)); return c && c.phone ? c.phone : ''; };
const pickShop = s => (SHOPS.indexOf(s) >= 0 ? s : SHOPS[0]);
const farmOpts = sel => S.prices.map(p => html`<option value="${p.id}" ${p.id == sel ? 'selected' : ''}>${p.farm} · ${p.item}</option>`);
const shopOpts = sel => SHOPS.map(s => html`<option ${s === sel ? 'selected' : ''}>${s}</option>`);
const empty = msg => html`<p class="empty">${msg}</p>`;
const noPrices = () => html`<div class="card"><h2>Add a farm price first</h2><p class="empty">Collections and sales need a farm and egg size.</p><button class="btn" type="button" data-go="prices">Go to Prices</button></div>`;

/* ---- business logic ---- */
function debts() {
  const m = Object.create(null);
  S.sales.slice().sort((a, b) => cmp(a.date, b.date)).forEach(s => {
    const o = s.qty * s.price - s.paid, name = (s.cust || '').trim();
    if (o > .005 && name) {
      const k = nkey(name), c = m[k] || (m[k] = { k: k, n: name, l: [], p: 0 });
      c.l.push({ o: o, due: s.due || s.date });
    }
  });
  S.pay.forEach(p => {
    const k = nkey(p.cust), c = m[k] || (m[k] = { k: k, n: p.cust, l: [], p: 0 });
    c.p += p.amt;
  });
  return Object.keys(m).map(k => {
    const c = m[k]; let p = c.p;
    c.l.forEach(x => { const t = Math.min(x.o, p); x.o -= t; p -= t; });   // payments clear the oldest debt first
    const open = c.l.filter(x => x.o > .005);
    return { k: c.k, n: c.n, bal: sum(open, x => x.o), due: open.length ? open.map(x => x.due).sort()[0] : '' };
  }).filter(c => c.bal > .005).sort((a, b) => cmp(a.due, b.due));
}

function stock() {
  const m = Object.create(null);
  SHOPS.forEach(s => { m[s] = Object.create(null); });
  const add = (r, sign) => {
    const sh = m[r.shop] || (m[r.shop] = Object.create(null));
    const e = sh[r.pid] || (sh[r.pid] = { lbl: r.lbl, qty: 0 });
    e.qty += sign * r.qty; e.lbl = r.lbl;
  };
  S.col.forEach(c => add(c, 1));
  S.sales.forEach(s => add(s, -1));
  return m;
}

function receipt(s) {
  const total = s.qty * s.price, owed = total - s.paid;
  return ['*AFA FRESH EGGS - RECEIPT*', 'Date: ' + dmy(s.date), 'Item: ' + s.lbl, 'Qty: ' + s.qty + ' crates',
    'Price/crate: ' + gh(s.price), 'Total: ' + gh(total), 'Paid: ' + gh(s.paid)]
    .concat(owed > .005 ? ['Balance due: ' + gh(owed), 'Due date: ' + (s.due ? dmy(s.due) : 'N/A')] : ['Status: PAID IN FULL'])
    .concat(['', 'Thank you for your patronage!']).join('\n');
}

const margin = p => 'Profit ' + gh(p.sell - p.buy) + ' per crate · margin ' + (p.sell ? Math.round((p.sell - p.buy) / p.sell * 100) : 0) + '%';

/* ---- toast ---- */
function hideToast() {
  const t = $('#toast');
  clearTimeout(toast.h);
  t.classList.remove('in'); t.classList.add('out');
  toast.h2 = setTimeout(() => { t.hidden = true; t.classList.remove('out'); }, 180);
}
function toast(msg, o) {
  o = o || {};
  const t = $('#toast');
  clearTimeout(toast.h); clearTimeout(toast.h2);
  t.textContent = '';
  const s = document.createElement('span');
  s.textContent = msg;
  t.appendChild(s);
  if (o.undo) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Undo';
    b.addEventListener('click', () => { hideToast(); o.undo(); render(); save(); });
    t.appendChild(b);
  }
  t.className = o.type === 'err' ? 'err' : '';
  t.hidden = false;
  void t.offsetWidth;
  t.classList.add('in');
  toast.h = setTimeout(hideToast, o.undo || o.type === 'err' ? 6000 : 2800);
}

/* ==========================================
   3. DATA SYNC
   ========================================== */
const keyOf = x => JSON.stringify(x);

function norm(k, x) {
  const o = Object.assign({}, x);
  delete o.created_at;
  NUMS[k].forEach(f => { o[f] = toNum(o[f]); });
  if (k === 'col') o.paid = !!o.paid;
  if (k === 'prices') o.hist = Array.isArray(o.hist) ? o.hist : [];
  return o;
}

async function loadAll() {
  loadErr = [];
  await Promise.all(Object.keys(TB).map(async k => {
    try {
      let r = await SB.from(TB[k]).select('*').order('created_at', { ascending: true });
      if (r.error) r = await SB.from(TB[k]).select('*');
      if (r.error) throw r.error;
      S[k] = (r.data || []).map(x => norm(k, x));
      snap[k] = {};
      S[k].forEach(x => { snap[k][x.id] = keyOf(x); });
    } catch (e) {
      console.error('Load failed: ' + TB[k], e);
      loadErr.push(k);
    }
  }));
  lastLoad = Date.now();
}

function diff(k) {
  const old = snap[k] || {}, seen = {}, up = [], keys = {};
  S[k].forEach(x => { seen[x.id] = 1; const key = keyOf(x); if (old[x.id] !== key) { up.push(x); keys[x.id] = key; } });
  return { up: up, keys: keys, del: Object.keys(old).filter(id => !seen[id]) };
}
const dirty = () => Object.keys(TB).some(k => { const d = diff(k); return d.up.length || d.del.length; });

function setSync(s) {
  syncState = s;
  const b = $('#sync');
  b.dataset.state = s;
  b.querySelector('span').textContent = { ok: 'Synced', saving: 'Saving…', error: 'Not saved · tap to retry' }[s];
}

async function pushTable(k) {
  const d = diff(k);
  if (!d.up.length && !d.del.length) return true;
  snap[k] = snap[k] || {};
  try {
    if (d.up.length) { const r = await SB.from(TB[k]).upsert(d.up); if (r.error) throw r.error; }
    if (d.del.length) { const r2 = await SB.from(TB[k]).delete().in('id', d.del); if (r2.error) throw r2.error; }
    d.up.forEach(x => { snap[k][x.id] = d.keys[x.id]; });   // only mark what was actually sent
    d.del.forEach(id => { delete snap[k][id]; });
    return true;
  } catch (e) {
    console.error('Save failed: ' + TB[k], e);
    return false;
  }
}

// Saves never overlap. A save requested mid-flight runs right after the current one.
function save() {
  if (!signedIn) return Promise.resolve(false);
  if (running) { again = true; return running; }
  running = (async () => {
    let ok = true;
    do {
      again = false;
      setSync('saving');
      ok = (await Promise.all(Object.keys(TB).map(pushTable))).every(Boolean);
    } while (again && ok);
    running = null;
    setSync(ok ? 'ok' : 'error');
    if (!ok) toast('Not saved yet. Check your connection; it will retry when you are back online.', { type: 'err' });
    return ok;
  })();
  return running;
}

/* ==========================================
   4. VIEWS
   ========================================== */
function recent(t, rows, fn) {
  const n = shown[t] || PAGE, list = rows.slice(-n).reverse();
  if (!list.length) return empty('Nothing yet');
  return html`${list.map(x => html`<div class="line"><div class="grow">${fn(x)}</div><button class="x" type="button" data-act="del" data-t="${t}" data-id="${x.id}" aria-label="Delete this entry">×</button></div>`)}${rows.length > n ? html`<button class="btn ghost sm more" type="button" data-act="more" data-t="${t}">Show more</button>` : ''}`;
}

const banner = () => loadErr.length
  ? html`<div class="banner" role="alert"><span>Couldn’t load: ${loadErr.map(k => TB[k]).join(', ')}. What you see may be incomplete.</span><button class="btn ghost sm" type="button" data-act="reload">Retry</button></div>`
  : '';

const V = {
  home() {
    const w = wkStart(), t = td();
    const sa = S.sales.filter(s => s.date >= w);
    const rev = sum(sa, s => s.qty * s.price);
    const cash = sum(sa, s => s.paid) + sum(S.pay.filter(p => p.date >= w), p => p.amt);
    const buy = sum(S.col.filter(c => c.date >= w), c => c.qty * c.buy);
    const tr = sum(S.costs.filter(c => c.date >= w), c => c.amt);
    const profit = cash - buy - tr;
    const d = debts(), owed = sum(d, x => x.bal), late = d.filter(x => x.due < t).length;
    const fo = sum(S.col.filter(c => !c.paid), c => c.qty * c.buy);
    const st = stock();
    return html`
      <div class="stats">
        <div class="stat hero"><span>Net cash profit this week</span><b data-count="${round2(profit)}">${gh(profit)}</b><small>Cash received − farm purchases − transport</small></div>
        <div class="stat"><span>Sales this week</span><b>${gh(rev)}</b></div>
        <div class="stat"><span>Cash received</span><b>${gh(cash)}</b></div>
        <div class="stat"><span>Farm purchases</span><b>${gh(buy)}</b></div>
        <div class="stat"><span>Transport</span><b>${gh(tr)}</b></div>
        <button class="stat" type="button" data-go="credit"><span>Customers owe you</span><b class="${late ? 'neg' : ''}">${gh(owed)}</b>${late ? html`<small class="neg">${late} overdue</small>` : ''}</button>
        <button class="stat" type="button" data-go="collect"><span>You owe farmers</span><b>${gh(fo)}</b></button>
      </div>
      ${Object.keys(st).map(shop => {
        const items = Object.keys(st[shop]).map(pid => st[shop][pid]);
        return html`<div class="card"><h2>${shop} stock</h2>${items.length
          ? items.map(e => html`<div class="line"><span class="grow">${e.lbl}</span><b class="${e.qty < 0 ? 'neg' : e.qty === 0 ? 'muted' : ''}">${e.qty} ${e.qty === 1 ? 'crate' : 'crates'}</b></div>`)
          : empty('No stock recorded yet.')}</div>`;
      })}
      <div class="foot"><button class="btn ghost" type="button" data-act="backup">Download backup</button><button class="btn ghost" type="button" data-act="logout">Sign out</button></div>`;
  },

  collect() {
    if (!S.prices.length) return noPrices();
    const unpaid = S.col.filter(c => !c.paid);
    return html`
      <form class="card" data-form="addCol" novalidate>
        <h2>Farm collection</h2>
        <label>Date<input type="date" name="date" value="${td()}"></label>
        <label>Farm · egg size<select name="pid">${farmOpts(last.pid)}</select></label>
        <div class="row2">
          <label>Crates<input name="qty" type="number" inputmode="decimal" step="any" min="0" autocomplete="off"></label>
          <label>Farm price / crate<input name="buy" type="number" inputmode="decimal" step="any" min="0" autocomplete="off"></label>
        </div>
        <label>Goes to<select name="shop">${shopOpts(last.shop)}</select></label>
        <label>Transport cost for this trip (optional)<input name="transport" type="number" inputmode="decimal" step="any" min="0" autocomplete="off"></label>
        <label class="chk"><input type="checkbox" name="paid">Already paid the farmer</label>
        <p class="total" data-total></p>
        <button class="btn" type="submit">Save collection</button>
      </form>
      ${unpaid.length ? html`<div class="card"><h2>You owe farmers</h2>${unpaid.map(c => html`<div class="line"><div class="grow"><b>${c.lbl}</b><small>${dmy(c.date)} · ${c.qty} crates · ${gh(c.qty * c.buy)}</small></div><button class="btn ghost sm" type="button" data-act="farmPaid" data-id="${c.id}">Mark paid</button></div>`)}</div>` : ''}
      <div class="card"><h3>Recent collections</h3>${recent('col', S.col, c => html`<b>${c.lbl}</b> · ${c.qty} crates<small>${dmy(c.date)} · ${c.shop} · ${gh(c.qty * c.buy)} · ${c.paid ? 'paid' : 'unpaid'}</small>`)}</div>`;
  },

  sell() {
    if (!S.prices.length) return noPrices();
    return html`
      <form class="card" data-form="addSale" novalidate>
        <h2>New sale</h2>
        <datalist id="cl">${S.customers.map(c => html`<option value="${c.name}" label="${c.phone}"></option>`)}</datalist>
        <div class="row2">
          <label>Date<input type="date" name="date" value="${td()}"></label>
          <label>Shop<select name="shop">${shopOpts(last.shop)}</select></label>
        </div>
        <label>Farm · egg size<select name="pid">${farmOpts(last.pid)}</select></label>
        <div class="row2">
          <label>Crates<input name="qty" type="number" inputmode="decimal" step="any" min="0" autocomplete="off"></label>
          <label>Price / crate<input name="price" type="number" inputmode="decimal" step="any" min="0" autocomplete="off"></label>
        </div>
        <label>Customer (blank = walk-in)<input name="cust" list="cl" autocomplete="off" placeholder="Type or pick a customer"></label>
        <label>Payment<select name="mode"><option value="f">Paid in full</option><option value="p">Part paid</option><option value="c">On credit</option></select></label>
        <div data-show="p" hidden><label>Amount paid now<input name="paid" type="number" inputmode="decimal" step="any" min="0" autocomplete="off"></label></div>
        <div data-show="due" hidden><label>Must pay back within<select name="days"><option value="7">1 week</option><option value="14">2 weeks</option><option value="21">3 weeks</option><option value="30">1 month</option></select></label></div>
        <p class="total" data-total></p>
        <p class="warn" data-warn hidden></p>
        <button class="btn" type="submit">Save sale</button>
      </form>
      <div class="card"><h3>Recent sales and receipts</h3>${recent('sales', S.sales, s => {
        const ph = waNumber(phoneOf(s.cust)), owed = s.qty * s.price - s.paid;
        return html`<b>${s.lbl}</b> · ${s.qty} × ${gh(s.price)}<small>${dmy(s.date)} · ${s.cust || 'Walk-in'}${owed > .005 ? ' · owes ' + gh(owed) : ''}</small>${ph ? html`<a class="btn wa sm" href="https://wa.me/${ph}?text=${encodeURIComponent(receipt(s))}" target="_blank" rel="noopener noreferrer">Send receipt on WhatsApp</a>` : ''}`;
      })}</div>`;
  },

  credit() {
    const d = debts(), t = td();
    const custs = S.customers.slice().sort((a, b) => cmp(nkey(a.name), nkey(b.name)));
    return html`
      <div class="card"><h2>Who owes you</h2>${d.length ? d.map(x => {
        const ph = phoneOf(x.n), wa = waNumber(ph), late = x.due < t;
        const msg = 'Hello ' + x.n + ', this is a friendly reminder from AFA Fresh Eggs about your balance of ' + gh(x.bal) + ', due by ' + dmy(x.due) + '. Thank you!';
        return html`<form class="debt" data-form="pay" data-key="${x.k}" novalidate>
          <div class="line">
            <div class="grow"><b>${x.n}</b>${ph ? html`<small><a href="tel:${telHref(ph)}">${ph}</a></small>` : html`<small class="neg">No phone saved. Add it under Customers below.</small>`}<small>Due ${dmy(x.due)}</small></div>
            <div class="amt"><b>${gh(x.bal)}</b><br><span class="tag ${late ? '' : 'ok'}">${late ? 'Overdue' : 'Not due yet'}</span></div>
          </div>
          ${wa ? html`<a class="btn wa sm" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer">Send WhatsApp reminder</a>` : ''}
          <div class="payrow"><input name="amt" type="number" inputmode="decimal" step="any" min="0" placeholder="Amount paid" autocomplete="off" aria-label="Amount paid by ${x.n}"><button class="btn ghost sm" type="button" data-act="fill" data-v="${round2(x.bal)}">Full</button><button class="btn sm" type="submit">Record</button></div>
        </form>`;
      }) : empty('Nobody owes you. Credit sales will appear here.')}</div>
      <div class="card"><h3>Recent payments</h3>${recent('pay', S.pay, p => html`<b>${p.cust}</b> paid ${gh(p.amt)}<small>${dmy(p.date)}</small>`)}</div>
      <form class="card" data-form="addCustomer" novalidate>
        <h2>Add customer</h2>
        <label>Name<input name="cname" placeholder="e.g. John Doe" autocomplete="off"></label>
        <label>Phone number<input name="phone" type="tel" placeholder="e.g. 0241234567" autocomplete="off"></label>
        <button class="btn" type="submit">Save customer</button>
      </form>
      <div class="card"><h2>Customers</h2>${custs.length ? custs.map(c => html`<div class="line"><div class="grow"><b>${c.name}</b><small>${c.phone || 'No phone'}</small></div>${c.phone ? html`<a class="btn ghost sm" href="tel:${telHref(c.phone)}">Call</a>` : ''}<button class="x" type="button" data-act="del" data-t="customers" data-id="${c.id}" aria-label="Delete ${c.name}">×</button></div>`) : empty('No customers saved yet.')}</div>`;
  },

  costs() {
    const w = wkStart();
    const tr = sum(S.costs.filter(c => c.date >= w), c => c.amt);
    const cr = sum(S.col.filter(c => c.date >= w), c => c.qty);
    return html`
      <div class="stats">
        <div class="stat"><span>Transport this week</span><b>${gh(tr)}</b></div>
        <div class="stat"><span>Per crate collected</span><b>${cr ? gh(tr / cr) : '–'}</b></div>
      </div>
      <form class="card" data-form="addCost" novalidate>
        <h2>Add transport or expense</h2>
        <div class="row2">
          <label>Date<input type="date" name="date" value="${td()}"></label>
          <label>Amount<input name="amt" type="number" inputmode="decimal" step="any" min="0" autocomplete="off"></label>
        </div>
        <label>What for<input name="descr" placeholder="e.g. Fuel to Farm A" autocomplete="off"></label>
        <button class="btn" type="submit">Save expense</button>
      </form>
      <div class="card"><h3>Recent expenses</h3>${recent('costs', S.costs, c => html`<b>${c.descr}</b> · ${gh(c.amt)}<small>${dmy(c.date)}</small>`)}</div>`;
  },

  prices() {
    const farms = Array.from(new Set(S.prices.map(p => p.farm)));
    return html`
      <form class="card" data-form="addPrice" novalidate>
        <h2>Add farm price</h2>
        <datalist id="fl">${farms.map(f => html`<option value="${f}"></option>`)}</datalist>
        <label>Farm<input name="farm" list="fl" placeholder="e.g. Farm A" autocomplete="off"></label>
        <label>Egg size / type<input name="item" placeholder="e.g. Large" autocomplete="off"></label>
        <div class="row2">
          <label>Farm price / crate<input name="buy" type="number" inputmode="decimal" step="any" min="0" autocomplete="off"></label>
          <label>Selling price / crate<input name="sell" type="number" inputmode="decimal" step="any" min="0" autocomplete="off"></label>
        </div>
        <button class="btn" type="submit">Add price</button>
      </form>
      <div class="card"><h2>Price list</h2>${S.prices.length ? S.prices.map(p => html`<div class="price">
        <div class="line"><b class="grow">${p.farm} · ${p.item}</b><button class="x" type="button" data-act="del" data-t="prices" data-id="${p.id}" aria-label="Delete ${p.farm} ${p.item}">×</button></div>
        <div class="row2">
          <label>Farm price<input type="number" inputmode="decimal" step="any" min="0" value="${p.buy}" data-price="buy" data-id="${p.id}"></label>
          <label>Selling price<input type="number" inputmode="decimal" step="any" min="0" value="${p.sell}" data-price="sell" data-id="${p.id}"></label>
        </div>
        <small class="margin" data-profit="${p.id}">${margin(p)}</small>
      </div>`) : empty('No prices yet')}</div>`;
  }
};

/* ==========================================
   5. RENDER, LIVE CALCULATIONS & ACTIONS
   ========================================== */
function countUp(root) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = toNum(el.dataset.count), t0 = performance.now(), dur = 650;
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = gh(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  });
}

function buildNav() {
  const nv = $('#nv');
  nv.innerHTML = '<div class="nav-in">' + TABS.map(t =>
    '<button type="button" data-go="' + t[0] + '"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[t[0]] + '</svg>' + t[1] + '</button>'
  ).join('') + '</div>';
  nv.hidden = false;
}

function setNav() {
  const i = TABS.findIndex(t => t[0] === tab);
  $('#nv .nav-in').style.setProperty('--tab', i);
  $('#nv').querySelectorAll('button').forEach((b, j) => {
    b.classList.toggle('on', j === i);
    if (j === i) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
}

function render(anim) {
  const m = $('#m');
  let out;
  try { out = V[tab](); } catch (e) {
    console.error(e);
    out = html`<div class="card"><h2>Something went wrong</h2><p class="empty">This screen could not be shown. Your data is safe.</p><button class="btn" type="button" data-act="reload">Reload</button></div>`;
  }
  typing = false;
  m.innerHTML = String(html`${banner()}${out}`);
  $('#wk').textContent = 'Week of ' + dmy(wkStart());
  setNav();
  const fc = $('form[data-form="addCol"]', m); if (fc) liveCol(fc);
  const fs = $('form[data-form="addSale"]', m); if (fs) liveSale(fs);
  m.classList.remove('enter');
  if (anim) {
    Array.prototype.forEach.call(m.children, (c, i) => c.style.setProperty('--i', Math.min(i, 6)));
    void m.offsetWidth;
    m.classList.add('enter');
    if (tab === 'home') countUp(m);
  }
}

function go(t) {
  tab = t;
  render(true);
  window.scrollTo(0, 0);
  $('#m').focus({ preventScroll: true });
}

// Show the result right away, then sync in the background. Undo is offered for deletes and edits.
function commit(msg, undo) { render(); toast(msg, { undo: undo }); save(); }

function bad(f, name, msg) {
  const el = f.elements[name];
  if (el) { el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); el.focus(); }
  toast(msg, { type: 'err' });
}

function liveCol(f, t) {
  const e = f.elements;
  if (!t || t.name === 'pid') { const p = prod(e.pid.value); if (p) e.buy.value = p.buy; }
  const tot = toNum(e.qty.value) * toNum(e.buy.value);
  $('[data-total]', f).textContent = tot > 0 ? 'Total owed to farmer: ' + gh(tot) : '';
}

function liveSale(f, t) {
  const e = f.elements, mode = e.mode.value;
  if (!t || t.name === 'pid') { const p = prod(e.pid.value); if (p) e.price.value = p.sell; }
  $('[data-show="p"]', f).hidden = mode !== 'p';
  $('[data-show="due"]', f).hidden = mode === 'f';
  const q = toNum(e.qty.value), tot = q * toNum(e.price.value);
  let line = tot > 0 ? 'Total: ' + gh(tot) : '';
  if (tot > 0 && mode === 'p') line += ' · Balance: ' + gh(Math.max(0, tot - toNum(e.paid.value)));
  $('[data-total]', f).textContent = line;
  const have = (stock()[pickShop(e.shop.value)] || {})[e.pid.value], w = $('[data-warn]', f);
  const short = q > 0 && q > (have ? have.qty : 0);
  w.hidden = !short;
  if (short) w.textContent = 'Only ' + (have ? have.qty : 0) + ' crates recorded in stock here.';
}

function setPrice(el) {
  const p = prod(el.dataset.id), field = el.dataset.price, v = toNum(el.value);
  if (!p || (field !== 'buy' && field !== 'sell')) return;
  if (el.value === '' || v < 0) { el.value = p[field]; return toast('Enter a price of 0 or more', { type: 'err' }); }
  if (v === p[field]) return;
  p.hist = (p.hist || []).concat([{ date: td(), buy: p.buy, sell: p.sell }]).slice(-50);
  p[field] = v;
  document.querySelectorAll('[data-profit]').forEach(n => { if (n.dataset.profit === String(p.id)) n.textContent = margin(p); });
  toast('Price updated');
  save();
}

const FORMS = {
  addCol(f, v) {
    const p = prod(v.pid), q = toNum(v.qty), b = toNum(v.buy), t = toNum(v.transport);
    if (!p) return bad(f, 'pid', 'Pick a farm first');
    if (!(q > 0)) return bad(f, 'qty', 'Enter the number of crates');
    if (!(b > 0)) return bad(f, 'buy', 'Enter the farm price per crate');
    const d = v.date || td(), shop = pickShop(v.shop);
    S.col.push({ id: uid(), date: d, pid: p.id, lbl: p.farm + ' · ' + p.item, qty: q, buy: b, shop: shop, paid: v.paid === 'on' });
    if (t > 0) S.costs.push({ id: uid(), date: d, descr: 'Transport: ' + p.farm, amt: t });
    last.pid = p.id; last.shop = shop;
    commit('Collection saved');
  },

  addSale(f, v) {
    const p = prod(v.pid), q = toNum(v.qty), pr = toNum(v.price), cust = (v.cust || '').trim(), mode = v.mode;
    if (!p) return bad(f, 'pid', 'Pick a farm first');
    if (!(q > 0)) return bad(f, 'qty', 'Enter the number of crates');
    if (!(pr > 0)) return bad(f, 'price', 'Enter the price per crate');
    const tot = round2(q * pr);
    const paid = mode === 'f' ? tot : mode === 'c' ? 0 : Math.min(round2(toNum(v.paid)), tot);
    if (mode === 'p' && !(paid > 0)) return bad(f, 'paid', 'Enter the amount paid now');
    if (paid < tot && !cust) return bad(f, 'cust', 'Enter the customer name for credit');
    const d = v.date || td(), shop = pickShop(v.shop);
    S.sales.push({ id: uid(), date: d, pid: p.id, lbl: p.farm + ' · ' + p.item, qty: q, price: pr, shop: shop, cust: cust, paid: paid, due: paid < tot ? addDays(d, toNum(v.days) || 7) : '' });
    last.pid = p.id; last.shop = shop;
    commit('Sale saved');
  },

  pay(f, v) {
    const x = debts().find(d => d.k === f.dataset.key), a = toNum(v.amt);
    if (!x) return commit('That balance is already cleared');
    if (!(a > 0)) return bad(f, 'amt', 'Enter the amount paid');
    if (a > x.bal + .005) return bad(f, 'amt', 'That is more than the ' + gh(x.bal) + ' owed');
    S.pay.push({ id: uid(), date: td(), cust: x.n, amt: round2(a) });
    commit('Payment recorded');
  },

  addCost(f, v) {
    const a = toNum(v.amt);
    if (!(a > 0)) return bad(f, 'amt', 'Enter an amount');
    S.costs.push({ id: uid(), date: v.date || td(), descr: (v.descr || '').trim() || 'Transport', amt: a });
    commit('Expense saved');
  },

  addPrice(f, v) {
    const farm = (v.farm || '').trim(), item = (v.item || '').trim(), b = toNum(v.buy), s = toNum(v.sell);
    if (!farm) return bad(f, 'farm', 'Enter the farm name');
    if (!item) return bad(f, 'item', 'Enter the egg size');
    if (S.prices.some(p => nkey(p.farm) === nkey(farm) && nkey(p.item) === nkey(item))) return bad(f, 'item', 'That farm and egg size already exist');
    if (!(b > 0)) return bad(f, 'buy', 'Enter the farm price per crate');
    if (!(s > 0)) return bad(f, 'sell', 'Enter your selling price per crate');
    S.prices.push({ id: uid(), farm: farm, item: item, buy: b, sell: s, hist: [] });
    commit('Price added');
  },

  addCustomer(f, v) {
    const name = (v.cname || '').trim(), phone = (v.phone || '').trim();
    if (!name) return bad(f, 'cname', 'Enter the customer name');
    if (phone && !waNumber(phone)) return bad(f, 'phone', 'Enter a valid phone number, e.g. 0241234567');
    if (S.customers.some(c => nkey(c.name) === nkey(name))) return bad(f, 'cname', 'That customer is already saved');
    S.customers.push({ id: uid(), name: name, phone: phone });
    commit('Customer saved');
  },

  async login(f, v) {
    const email = (v.email || '').trim();
    if (!email) return bad(f, 'email', 'Enter your email');
    if (!v.password) return bad(f, 'password', 'Enter your password');
    const b = $('button[type="submit"]', f);
    f.dataset.busy = '1'; b.disabled = true; b.textContent = 'Signing in…';
    try {
      const r = await SB.auth.signInWithPassword({ email: email, password: v.password });
      if (r.error) throw r.error;
      await start();
    } catch (e) {
      console.error('Sign-in failed', e);
      delete f.dataset.busy; b.disabled = false; b.textContent = 'Sign in';
      f.elements.password.value = '';
      const net = !e.status || e.status >= 500;
      toast(net ? 'Can’t reach the server. Check your connection.' : 'Wrong email or password', { type: 'err' });
    }
  }
};

const ACT = {
  del(el) {
    const t = el.dataset.t;
    const i = Object.prototype.hasOwnProperty.call(TB, t) ? S[t].findIndex(x => x.id == el.dataset.id) : -1;
    if (i < 0) return;
    const item = S[t].splice(i, 1)[0];
    commit('Deleted', () => { S[t].splice(Math.min(i, S[t].length), 0, item); });
  },
  more(el) { shown[el.dataset.t] = (shown[el.dataset.t] || PAGE) + MORE; render(); },
  fill(el) { const i = el.closest('form').elements.amt; i.value = el.dataset.v; i.focus(); },
  farmPaid(el) {
    const c = S.col.find(x => x.id == el.dataset.id);
    if (!c) return;
    c.paid = true;
    commit('Marked as paid', () => { c.paid = false; });
  },
  sync() { if (syncState === 'error') save(); },
  theme() {
    const root = document.documentElement;
    const dark = (root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('afa-theme', root.dataset.theme); } catch (e) { /* storage unavailable */ }
  },
  backup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'afa-backup-' + td() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup downloaded');
  },
  async logout() {
    if (dirty()) {
      const ok = await save();
      if (!ok && !confirm('Some changes are not saved yet and will be lost if you sign out. Sign out anyway?')) return;
    }
    signedIn = false;
    try { await SB.auth.signOut(); } catch (e) { console.error(e); }
    resetState();
    loginView();
  },
  async reload() {
    if (!signedIn) return location.reload();
    if (dirty()) await save();
    await loadAll();
    render();
  }
};

/* ---- one set of listeners for the whole app (no inline handlers) ---- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act],[data-go]');
  if (!el) return;
  if (el.dataset.go) return go(el.dataset.go);
  if (ACT[el.dataset.act]) ACT[el.dataset.act](el, e);
});

document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  if (f.dataset.busy || !FORMS[f.dataset.form]) return;
  FORMS[f.dataset.form](f, Object.fromEntries(new FormData(f)));
});

function live(e) {
  const f = e.target.form;
  if (!f) return;
  if (f.dataset.form === 'addCol') liveCol(f, e.target);
  else if (f.dataset.form === 'addSale') liveSale(f, e.target);
}
document.addEventListener('input', e => { typing = true; e.target.classList.remove('bad'); live(e); });
document.addEventListener('change', e => {
  live(e);
  if (e.target.dataset && e.target.dataset.price) setPrice(e.target);
});

/* ==========================================
   6. START-UP & SESSION
   ========================================== */
function resetState() {
  Object.keys(TB).forEach(k => { S[k] = []; });
  snap = {}; loadErr = []; typing = false;
  $('#nv').hidden = true;
  $('#sync').hidden = true;
}

function loginView() {
  signedIn = false;
  $('#nv').hidden = true;
  $('#sync').hidden = true;
  $('#wk').textContent = 'Sign in to continue';
  const m = $('#m');
  m.innerHTML = String(html`<form class="card" data-form="login" novalidate>
    <h2>Sign in</h2>
    <label>Email<input name="email" type="email" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
    <label>Password<input name="password" type="password" autocomplete="current-password"></label>
    <button class="btn" type="submit">Sign in</button>
  </form>`);
  m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter');
}

function fatal(msg) {
  $('#m').innerHTML = String(html`<div class="card"><h2>Can’t start the app</h2><p class="empty">${msg}</p><button class="btn" type="button" data-act="reload">Try again</button></div>`);
}

async function start() {
  signedIn = true;
  $('#m').innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel short"></div>';
  $('#sync').hidden = false;
  setSync('ok');
  buildNav();
  tab = 'home';
  await loadAll();
  render(true);
}

// Pick up changes made on another phone when the app comes back to the foreground.
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !signedIn || running || typing || Date.now() - lastLoad < 30000) return;
  const a = document.activeElement;
  if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
  if (dirty()) return save();
  await loadAll();
  if (!typing) render();
});

window.addEventListener('online', () => { if (signedIn && dirty()) save(); });
window.addEventListener('beforeunload', e => { if (signedIn && (running || dirty())) { e.preventDefault(); e.returnValue = ''; } });

async function boot() {
  try {
    const t = localStorage.getItem('afa-theme');
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  } catch (e) { /* storage unavailable */ }

  if (!SB_URL || SB_URL.indexOf('PASTE') === 0) return fatal('Setup needed: set SB_URL and SB_KEY at the top of app.js.');
  if (!window.supabase) return fatal('The data library could not load. Check your internet connection and try again.');

  SB = window.supabase.createClient(SB_URL, SB_KEY);
  SB.auth.onAuthStateChange(ev => {
    if (ev === 'SIGNED_OUT' && signedIn) { resetState(); loginView(); toast('You were signed out. Please sign in again.'); }
  });

  let session = null;
  try { session = (await SB.auth.getSession()).data.session; } catch (e) { console.error(e); }
  if (session) await start(); else loginView();
}

boot();
})();
