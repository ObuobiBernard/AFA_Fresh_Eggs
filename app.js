/* ==========================================
   1. CONFIGURATION & APP STATE
   ========================================== */
var SB_URL = 'https://vitalucvobokjkdogwiq.supabase.co';
var SB_KEY = 'sb_publishable_H57950cizG2oEs2q602_FQ_gv7v8DgB';
var tab = 'home';
var SHOPS = ['Main Shop', 'Market Shop'];
var S = { prices: [], col: [], sales: [], pay: [], costs: [], customers: [] };
var snap = {};
var TB = { prices: 'prices', col: 'collections', sales: 'sales', pay: 'payments', costs: 'costs', customers: 'customers' };
var SB;
var isSaving = false;
var saveQueued = false;

/* ==========================================
   2. DATABASE SYNC & QUEUE HANDLERS
   ========================================== */
async function load() {
  setSyncStatus('saving', 'Loading...');
  var hadError = false;

  // Load cached data first as fallback
  try {
    var cached = localStorage.getItem('afa_cache');
    if (cached) S = Object.assign(S, JSON.parse(cached));
  } catch (e) {}

  for (var k in TB) {
    try {
      var r = await SB.from(TB[k]).select('*');
      if (r.error) throw r.error;
      S[k] = (r.data || []).map(function(x) {
        var clean = Object.assign({}, x);
        delete clean.created_at;
        return clean;
      });
      snap[k] = {};
      S[k].forEach(function(x) { snap[k][x.id] = JSON.stringify(x); });
    } catch (err) {
      hadError = true;
      console.error('Error loading table ' + k, err);
    }
  }

  try { localStorage.setItem('afa_cache', JSON.stringify(S)); } catch (e) {}

  if (hadError || !navigator.onLine) {
    setSyncStatus('offline', 'Offline Mode');
    toast('Operating in offline mode');
  } else {
    setSyncStatus('synced', 'Synced');
  }
}

async function save() {
  try { localStorage.setItem('afa_cache', JSON.stringify(S)); } catch (e) {}

  if (isSaving) {
    saveQueued = true;
    return;
  }
  isSaving = true;
  setSyncStatus('saving', 'Saving...');
  var failed = false;

  for (var k in TB) {
    var old = snap[k] || {}, ids = {}, up = [];
    S[k].forEach(function(x) {
      ids[x.id] = 1;
      if (old[x.id] !== JSON.stringify(x)) up.push(x);
    });
    var del = Object.keys(old).filter(function(i) { return !ids[i]; });
    try {
      if (up.length) {
        var r = await SB.from(TB[k]).upsert(up);
        if (r.error) throw r.error;
      }
      if (del.length) {
        var r2 = await SB.from(TB[k]).delete().in('id', del);
        if (r2.error) throw r2.error;
      }
      snap[k] = {};
      S[k].forEach(function(x) { snap[k][x.id] = JSON.stringify(x); });
    } catch (e) {
      console.error('Save error on ' + k, e);
      failed = true;
    }
  }

  isSaving = false;
  if (failed) {
    setSyncStatus('offline', 'Not Saved');
    toast('Save failed. Will retry when online.');
  } else {
    setSyncStatus('synced', 'Synced');
  }

  if (saveQueued) {
    saveQueued = false;
    save();
  }
}

window.addEventListener('online', function() {
  if (SB) save();
});

function setSyncStatus(st, txt) {
  var pill = $('#sync-pill');
  if (!pill) return;
  pill.hidden = !st;
  pill.className = 'sync-pill ' + st;
  pill.textContent = txt;
}

/* ==========================================
   3. UTILITIES & HELPERS
   ========================================== */
var $ = function(s) { return document.querySelector(s); };
var uid = function() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 9); };

function localDateStr(d) {
  var yr = d.getFullYear();
  var mo = String(d.getMonth() + 1).padStart(2, '0');
  var da = String(d.getDate()).padStart(2, '0');
  return yr + '-' + mo + '-' + da;
}
var td = function() { return localDateStr(new Date()); };
var plus = function(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  return localDateStr(d);
};
function wkStart() {
  var x = new Date();
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return localDateStr(x);
}

var gh = function(n) { return 'GH₵ ' + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString(); };
var esc = function(s) { return String(s == null ? '' : s).replace(/[&<>'"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var sum = function(a, f) { return a.reduce(function(t, x) { return t + f(x); }, 0); };
var num = function(id) { var el = $(id); return el ? (parseFloat(el.value) || 0) : 0; };

function toast(t) {
  var e = $('#toast');
  if (!e) return;
  e.textContent = t;
  e.hidden = false;
  clearTimeout(toast.h);
  toast.h = setTimeout(function() { e.hidden = true; }, 3500);
}

function toggleTheme() {
  var root = document.documentElement;
  var isDark = root.getAttribute('data-theme') === 'dark' ||
    (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var next = isDark ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('afa_theme', next);
}

function prod(id) { return S.prices.find(function(p) { return p.id == id; }); }
function cust(id) { return S.customers.find(function(c) { return c.id == id; }); }
function pOpts() { return S.prices.map(function(p) { return '<option value="' + esc(p.id) + '">' + esc(p.farm) + ' · ' + esc(p.item) + '</option>'; }).join(''); }
function shopOpts() { return SHOPS.map(function(s) { return '<option>' + esc(s) + '</option>'; }).join(''); }
function noPrices() { return '<div class="c">Add your farms and prices first in the <b>Prices</b> tab.</div>'; }

function formatPhone(p) {
  if (!p) return '';
  var clean = String(p).replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '233' + clean.slice(1);
  return clean;
}

function debts() {
  var m = {};
  S.sales.slice().sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); }).forEach(function(s) {
    if (!s.cust_id) return;
    var o = s.qty * s.price - s.paid;
    var c = m[s.cust_id] = m[s.cust_id] || { id: s.cust_id, l: [], p: 0 };
    if (o > 0.005) c.l.push({ o: o, due: s.due || s.date });
  });
  S.pay.forEach(function(p) {
    if (!p.cust_id) return;
    var c = m[p.cust_id] = m[p.cust_id] || { id: p.cust_id, l: [], p: 0 };
    c.p += p.amt;
  });
  return Object.values(m).map(function(c) {
    var p = c.p;
    c.l.forEach(function(x) {
      var t = Math.min(x.o, p);
      x.o -= t;
      p -= t;
    });
    var o = c.l.filter(function(x) { return x.o > 0.005; });
    var custObj = cust(c.id);
    return {
      id: c.id,
      name: custObj ? custObj.name : 'Unknown',
      bal: sum(o, function(x) { return x.o; }),
      due: o.length ? o.map(function(x) { return x.due; }).sort()[0] : ''
    };
  }).filter(function(c) { return c.bal > 0.005; });
}

function stock() {
  var m = {}, L = {};
  S.col.forEach(function(c) { var k = c.shop + '|' + c.pid; m[k] = (m[k] || 0) + c.qty; L[c.pid] = c.lbl; });
  S.sales.forEach(function(s) { var k = s.shop + '|' + s.pid; m[k] = (m[k] || 0) - s.qty; L[s.pid] = s.lbl; });
  return { m: m, L: L };
}

function del(t, id) {
  if (!confirm('Delete this entry?')) return;
  S[t] = S[t].filter(function(x) { return x.id != id; });
  save();
  render();
  toast('Deleted entry');
}

function downloadFile(content, type, filename) {
  var blob = new Blob([content], { type: type });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

/* ==========================================
   4. VIEW TEMPLATES
   ========================================== */
var V = {
  home: function() {
    var w = wkStart(),
        sa = S.sales.filter(function(s) { return s.date >= w; }),
        rev = sum(sa, function(s) { return s.qty * s.price; }),
        cash = sum(sa, function(s) { return s.paid; }) + sum(S.pay.filter(function(p) { return p.date >= w; }), function(p) { return p.amt; }),
        buy = sum(S.col.filter(function(c) { return c.date >= w; }), function(c) { return c.qty * c.buy; }),
        tr = sum(S.costs.filter(function(c) { return c.date >= w; }), function(c) { return c.amt; }),
        pf = cash - buy - tr,
        d = debts(),
        owed = sum(d, function(x) { return x.bal; }),
        fo = sum(S.col.filter(function(c) { return (c.paid_amt || 0) < (c.qty * c.buy); }), function(c) { return (c.qty * c.buy) - (c.paid_amt || 0); }),
        st = stock(),
        h = '';

    h += '<div class="dash-grid">';
    h += '<div class="dash-tile"><span>Sales This Week</span><b>' + gh(rev) + '</b></div>';
    h += '<div class="dash-tile"><span>Cash Received</span><b>' + gh(cash) + '</b></div>';
    h += '</div>';

    h += '<div class="dash-tile highlight" style="margin-bottom:12px;">';
    h += '<span>Net Cash Profit This Week</span>';
    h += '<b style="font-size:28px;">' + gh(pf) + '</b>';
    h += '<small style="display:block;margin-top:4px;opacity:0.85;">Cash received − farm purchases − transport</small>';
    h += '</div>';

    h += '<div class="dash-grid">';
    h += '<div class="dash-tile"><span>Farm Purchases</span><b>' + gh(buy) + '</b></div>';
    h += '<div class="dash-tile"><span>Transport Cost</span><b>' + gh(tr) + '</b></div>';
    h += '</div>';

    h += '<div class="dash-grid">';
    h += '<div class="dash-tile"><span>Customers Owe You</span><b>' + gh(owed) + '</b></div>';
    h += '<div class="dash-tile"><span>You Owe Farmers</span><b>' + gh(fo) + '</b></div>';
    h += '</div>';

    SHOPS.forEach(function(s) {
      var rows = Object.keys(st.m).filter(function(k) { return k.split('|')[0] == s; }).map(function(k) {
        var q = st.m[k], pid = k.split('|')[1];
        return '<div class="l"><span>' + esc(st.L[pid]) + '</span><b class="' + (q < 0 ? 'n' : '') + '">' + q + ' crates</b></div>';
      }).join('');
      h += '<div class="c"><h2>📦 ' + esc(s) + ' Stock</h2>' + (rows || '<small style="color:var(--mu)">No stock recorded.</small>') + '</div>';
    });

    h += '<div class="c"><h3>System & Data</h3><div class="r"><button onclick="backup()">Download Backup</button><button onclick="exportCSV()">Export CSV</button></div><button onclick="logout()" style="background:var(--bd);color:var(--tx);margin-top:10px">Sign Out</button></div>';

    return h;
  },

  collect: function() {
    if (!S.prices.length) return noPrices();
    return '<div class="c"><h2>Farm collection</h2><label>Date<input type="date" id="c-d" value="' + td() + '"></label><label>Farm · egg size<select id="c-p" onchange="cp()">' + pOpts() + '</select></label><div class="r"><label>Crates<input id="c-q" type="number" inputmode="decimal" oninput="cp(1)"></label><label>Farm price / crate<input id="c-b" type="number" inputmode="decimal" oninput="cp(1)"></label></div><label>Goes to<select id="c-s">' + shopOpts() + '</select></label><label>Transport cost<input id="c-t" type="number" inputmode="decimal"></label><label><input type="checkbox" id="c-pd" checked style="width:auto;margin-right:8px" onchange="$(\'#c-paid-amt\').hidden = this.checked;">Paid in full</label><div id="c-paid-amt" hidden><label>Amount paid now<input id="c-pa" type="number" inputmode="decimal"></label></div><div id="c-tot" style="margin-bottom:10px;font-weight:600"></div><button onclick="addCol()">Save collection</button></div>' +
    '<div class="c"><h3>Recent collections</h3>' + (S.col.slice(-5).reverse().map(function(c) {
      var owed = c.qty * c.buy - (c.paid_amt || 0);
      return '<div class="l"><div><b>' + esc(c.lbl) + '</b> · ' + c.qty + ' crates<small>' + esc(c.date) + ' · ' + esc(c.shop) + ' · ' + gh(c.qty * c.buy) + (owed <= 0 ? ' · Paid' : ' · Owe ' + gh(owed)) + '</small></div><button class="s" onclick="del(\'col\',\'' + esc(c.id) + '\')">×</button></div>';
    }).join('') || '<small style="color:var(--mu)">No collections yet.</small>') + '</div>';
  },

  sell: function() {
    if (!S.prices.length) return noPrices();
    var cl = S.customers.map(function(c) { return '<option value="' + esc(c.name) + '"></option>'; }).join('');
    return '<div class="c"><h2>New sale</h2><datalist id="cl">' + cl + '</datalist><div class="r"><label>Date<input type="date" id="s-d" value="' + td() + '"></label><label>Shop<select id="s-s">' + shopOpts() + '</select></label></div><label>Farm · egg size<select id="s-p" onchange="sp()">' + pOpts() + '</select></label><div class="r"><label>Crates<input id="s-q" type="number" inputmode="decimal" oninput="sp(1)"></label><label>Price / crate<input id="s-pr" type="number" inputmode="decimal" oninput="sp(1)"></label></div><label>Customer<input id="s-c" list="cl" placeholder="Customer name (or Walk-in)"></label><label>Payment Method<select id="s-paym"><option>Cash</option><option>Mobile Money</option></select></label><label>Payment Status<select id="s-m" onchange="sp(1)"><option value="f">Paid in full</option><option value="p">Part paid</option><option value="c">On credit</option></select></label><div id="s-pt" hidden><label>Amount paid now<input id="s-a" type="number" inputmode="decimal"></label></div><div id="s-du" hidden><label>Due within<select id="s-dd"><option value="7">1 week</option><option value="14">2 weeks</option><option value="30">1 month</option></select></label></div><div id="s-tot" style="margin-bottom:10px;font-weight:600"></div><button onclick="addSale()">Save sale</button></div>' +
    '<div class="c"><h3>Recent Sales & Receipts</h3>' +
    (S.sales.slice(-5).reverse().map(function(s) {
      var custObj = cust(s.cust_id);
      var phone = custObj ? custObj.phone : '';
      var total = s.qty * s.price;
      var dueAmt = total - s.paid;
      var msg = encodeURIComponent('*AFA FRESH EGGS*\nDate: ' + s.date + '\nItem: ' + s.lbl + '\nQty: ' + s.qty + ' crates\nTotal: ' + gh(total) + '\nPaid: ' + gh(s.paid) + (dueAmt > 0 ? '\nBalance Due: ' + gh(dueAmt) : '\nStatus: PAID'));
      var waBtn = phone ? '<a class="btn-link btn-wa" style="padding:6px 12px;font-size:13px;width:auto;margin-top:6px" href="https://wa.me/' + formatPhone(phone) + '?text=' + msg + '" target="_blank" rel="noopener">💬 Receipt</a>' : '';
      return '<div class="l"><div><b>' + esc(s.lbl) + '</b> · ' + s.qty + ' × ' + gh(s.price) + '<small>' + esc(s.date) + ' · ' + esc(custObj ? custObj.name : 'Walk-in') + '</small>' + waBtn + '</div><button class="s" onclick="del(\'sales\',\'' + esc(s.id) + '\')">×</button></div>';
    }).join('') || '<small style="color:var(--mu)">No sales yet.</small>') + '</div>';
  },

  credit: function() {
    var d = debts(), h = '<div class="c"><h2>Customer Credit & Directory</h2>';
    h += '<div style="margin-bottom:14px"><input id="cu-n" placeholder="New customer name" style="margin-bottom:8px"><input id="cu-p" type="tel" placeholder="Phone number" style="margin-bottom:8px"><button onclick="addCustomer()">Add Customer</button></div>';
    h += d.map(function(x, i) {
      var custObj = cust(x.id);
      var phone = custObj ? custObj.phone : '';
      var waMsg = encodeURIComponent('Hello ' + x.name + ', friendly reminder from AFA Fresh Eggs for your balance of ' + gh(x.bal) + '. Thank you!');
      var waLink = phone ? '<a class="btn-link btn-wa" style="padding:6px 12px;font-size:13px;width:auto;margin-top:6px" href="https://wa.me/' + formatPhone(phone) + '?text=' + waMsg + '" target="_blank" rel="noopener">💬 WhatsApp Reminder</a>' : '';
      return '<div style="padding:10px 0;border-top:1px solid var(--bd)"><div class="l" style="border:0;padding:0"><div><b>' + esc(x.name) + '</b><small>📞 ' + esc(phone || 'None') + (x.due ? ' · Due ' + esc(x.due) : '') + '</small></div><div style="text-align:right"><b>' + gh(x.bal) + '</b></div></div>' + waLink + '<div class="r" style="margin-top:8px;grid-template-columns:1fr auto"><input id="pa' + i + '" type="number" inputmode="decimal" placeholder="Amount" style="margin:0"><button onclick="pay(\'' + esc(x.id) + '\', ' + i + ')" style="width:auto">Record Payment</button></div></div>';
    }).join('') || '<small style="color:var(--mu)">No outstanding debts.</small>';
    return h + '</div>';
  },

  costs: function() {
    return '<div class="c"><h2>Add expense / transport</h2><div class="r"><label>Date<input type="date" id="x-d" value="' + td() + '"></label><label>Amount<input id="x-a" type="number" inputmode="decimal"></label></div><label>Description<input id="x-n" placeholder="e.g. Fuel"></label><button onclick="addCost()">Save Expense</button></div>' +
    '<div class="c"><h3>Recent expenses</h3>' + (S.costs.slice(-5).reverse().map(function(c) {
      return '<div class="l"><div><b>' + esc(c.descr) + '</b><small>' + esc(c.date) + '</small></div><b>' + gh(c.amt) + '</b><button class="s" onclick="del(\'costs\',\'' + esc(c.id) + '\')">×</button></div>';
    }).join('') || '<small style="color:var(--mu)">No expenses yet.</small>') + '</div>';
  },

  prices: function() {
    return '<div class="c"><h2>Add farm price</h2><label>Farm<input id="n-f" placeholder="Farm A"></label><label>Egg size<input id="n-i" placeholder="Large"></label><div class="r"><label>Farm price<input id="n-b" type="number" inputmode="decimal"></label><label>Selling price<input id="n-s" type="number" inputmode="decimal"></label></div><button onclick="addPrice()">Add Price</button></div>' +
    '<div class="c"><h2>Price list</h2>' + (S.prices.map(function(p) {
      return '<div style="padding:10px 0;border-top:1px solid var(--bd)"><div class="l" style="border:0;padding:0"><b>' + esc(p.farm) + ' · ' + esc(p.item) + '</b><button class="s" onclick="delP(\'' + esc(p.id) + '\')">×</button></div><div class="r"><label>Farm<input type="number" inputmode="decimal" value="' + p.buy + '" onchange="upP(\'' + esc(p.id) + '\',\'buy\',this.value)"></label><label>Sell<input type="number" inputmode="decimal" value="' + p.sell + '" onchange="upP(\'' + esc(p.id) + '\',\'sell\',this.value)"></label></div></div>';
    }).join('') || '<small style="color:var(--mu)">No prices configured yet.</small>') + '</div>';
  }
};

/* ==========================================
   5. ACTIONS & HANDLERS
   ========================================== */
function cp(t) {
  var sel = $('#c-p');
  if (!sel) return;
  var p = prod(sel.value);
  if (!p) return;
  if (!t) $('#c-b').value = p.buy;
  $('#c-tot').textContent = 'Total: ' + gh(num('#c-q') * num('#c-b'));
}

function sp(t) {
  var sel = $('#s-p');
  if (!sel) return;
  var p = prod(sel.value);
  if (!p) return;
  if (!t) $('#s-pr').value = p.sell;
  var tot = num('#s-q') * num('#s-pr'), m = $('#s-m').value;
  $('#s-pt').hidden = m != 'p';
  $('#s-du').hidden = m == 'f';
  $('#s-tot').textContent = 'Total: ' + gh(tot);
}

function addCol() {
  var p = prod($('#c-p').value), q = num('#c-q'), b = num('#c-b');
  if (!p || q <= 0) return toast('Enter valid crates');
  var pd = $('#c-pd').checked;
  var paidAmt = pd ? q * b : Math.min(num('#c-pa'), q * b);
  var dateVal = $('#c-d').value || td();
  S.col.push({ id: uid(), date: dateVal, pid: p.id, lbl: p.farm + ' · ' + p.item, qty: q, buy: b, shop: $('#c-s').value, paid_amt: paidAmt });
  var t = num('#c-t');
  if (t > 0) S.costs.push({ id: uid(), date: dateVal, descr: 'Transport: ' + p.farm, amt: t });
  save(); toast('Saved collection'); render();
}

function addSale() {
  var p = prod($('#s-p').value), q = num('#s-q'), pr = num('#s-pr');
  if (!p || q <= 0 || pr <= 0) return toast('Enter crates and price');
  var m = $('#s-m').value, tot = q * pr;
  var paid = m == 'f' ? tot : m == 'c' ? 0 : Math.min(num('#s-a'), tot);
  var custInput = $('#s-c').value.trim();
  var custObj = S.customers.find(function(c) { return c.name.toLowerCase() === custInput.toLowerCase(); });
  if (m != 'f' && paid < tot && !custObj) return toast('Select an existing customer from the Credit tab first');

  S.sales.push({
    id: uid(),
    date: $('#s-d').value || td(),
    pid: p.id,
    lbl: p.farm + ' · ' + p.item,
    qty: q,
    price: pr,
    shop: $('#s-s').value,
    cust_id: custObj ? custObj.id : null,
    paid: paid,
    method: $('#s-paym').value,
    due: paid < tot ? plus(+$('#s-dd').value) : ''
  });
  save(); toast('Saved sale'); render();
}

function addCustomer() {
  var name = $('#cu-n').value.trim(), phone = $('#cu-p').value.trim();
  if (!name) return toast('Enter customer name');
  var exists = S.customers.some(function(c) { return c.name.toLowerCase() === name.toLowerCase(); });
  if (exists) return toast('Customer already exists');
  S.customers.push({ id: uid(), name: name, phone: phone });
  save(); toast('Saved customer'); render();
}

function pay(custId, i) {
  var a = num('#pa' + i);
  if (a <= 0) return toast('Enter valid amount');
  S.pay.push({ id: uid(), date: td(), cust_id: custId, amt: a });
  save(); toast('Recorded payment'); render();
}

function addCost() {
  var a = num('#x-a');
  if (a <= 0) return toast('Enter amount');
  S.costs.push({ id: uid(), date: $('#x-d').value || td(), descr: $('#x-n').value.trim() || 'Expense', amt: a });
  save(); toast('Saved expense'); render();
}

function addPrice() {
  var f = $('#n-f').value.trim(), i = $('#n-i').value.trim();
  if (!f || !i) return toast('Enter farm and egg size');
  S.prices.push({ id: uid(), farm: f, item: i, buy: num('#n-b'), sell: num('#n-s') });
  save(); toast('Added price'); render();
}

function upP(id, f, v) {
  var p = prod(id);
  if (!p) return;
  p[f] = parseFloat(v) || 0;
  save();
}

function delP(id) {
  if (!confirm('Delete price?')) return;
  S.prices = S.prices.filter(function(p) { return p.id != id; });
  save(); render();
}

/* ==========================================
   6. NAVIGATION & BOOT
   ========================================== */
var TABS = [
  ['home', '<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>', 'Home'],
  ['collect', '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>', 'Collect'],
  ['sell', '<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>', 'Sell'],
  ['credit', '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>', 'Credit'],
  ['costs', '<svg viewBox="0 0 24 24"><path d="M18 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM19.5 9.5H17V6h2.5v3.5zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13-1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2-3H3V6h14v4h3.5l1.5 2.05V14z"/></svg>', 'Costs'],
  ['prices', '<svg viewBox="0 0 24 24"><path d="M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z"/></svg>', 'Prices']
];

function go(t) {
  tab = t; render(); window.scrollTo(0, 0);
}

function render() {
  $('#nv').innerHTML = TABS.map(function(t) { return '<button class="' + (t[0] == tab ? 'a' : '') + '" onclick="go(\'' + t[0] + '\')">' + t[1] + t[2] + '</button>'; }).join('');
  $('#m').innerHTML = V[tab]();
  $('#wk').textContent = 'Week of ' + wkStart();
  if (tab == 'collect') cp();
  if (tab == 'sell') sp();
}

function backup() {
  downloadFile(JSON.stringify(S, null, 2), 'application/json', 'afa-backup-' + td() + '.json');
}

function exportCSV() {
  var csvCell = function(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
  var csv = 'Date,Type,Shop,Details,Qty,UnitPrice,Total,Paid\n';
  S.sales.forEach(function(s) {
    csv += [s.date, 'Sale', csvCell(s.shop), csvCell(s.lbl), s.qty, s.price, s.qty * s.price, s.paid].join(',') + '\n';
  });
  S.col.forEach(function(c) {
    csv += [c.date, 'Collection', csvCell(c.shop), csvCell(c.lbl), c.qty, c.buy, c.qty * c.buy, c.paid_amt || 0].join(',') + '\n';
  });
  S.costs.forEach(function(x) {
    csv += [x.date, 'Expense', '', csvCell(x.descr), 1, x.amt, x.amt, x.amt].join(',') + '\n';
  });
  downloadFile(csv, 'text/csv;charset=utf-8;', 'afa-records-' + td() + '.csv');
}

function loginView() {
  var nv = $('#nv');
  var m = $('#m');
  setSyncStatus('', '');
  $('#wk').textContent = 'Sign in to continue';
  if (nv) nv.innerHTML = '';
  if (m) {
    m.innerHTML = '<form class="c" onsubmit="event.preventDefault();login()"><h2>Sign in</h2><label>Email<input id="l-e" type="email" required autocomplete="username"></label><label>Password<input id="l-p" type="password" required autocomplete="current-password"></label><button id="l-btn" type="submit">Sign in</button></form>';
  }
}

async function login() {
  var email = $('#l-e').value.trim();
  var password = $('#l-p').value;
  if (!email || !password) return toast('Enter email and password');

  var btn = $('#l-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }

  try {
    var r = await SB.auth.signInWithPassword({ email: email, password: password });
    if (r.error) {
      console.error('Supabase Auth Error:', r.error);
      if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
      return toast(r.error.message || 'Wrong email or password');
    }
    await load();
    render();
  } catch (err) {
    console.error('Login exception:', err);
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
    toast(err.message || 'Network error while signing in');
  }
}

async function logout() {
  await SB.auth.signOut();
  localStorage.removeItem('afa_cache');
  loginView();
}

async function boot() {
  try {
    var savedTheme = localStorage.getItem('afa_theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

    if (typeof supabase === 'undefined') {
      throw new Error('Supabase library failed to load.');
    }

    SB = supabase.createClient(SB_URL, SB_KEY);
    var s = await SB.auth.getSession();

    if (s.data && s.data.session) {
      await load();
      render();
    } else {
      loginView();
    }
  } catch (err) {
    console.error('Boot error:', err);
    loginView();
    toast(err.message || 'Initialization error');
  }
}

boot();
