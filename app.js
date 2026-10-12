/* ==========================================
   1. CONFIGURATION & APP STATE
   ========================================== */
var SB_URL = 'https://vitalucvobokjkdogwiq.supabase.co';
var SB_KEY = 'sb_publishable_H57950cizG2oEs2q6O2_fQ_gv7v8DgB';
var tab = 'home';
var SHOPS = ['Main Shop', 'Market Shop'];
var S = { prices: [], col: [], sales: [], pay: [], costs: [], customers: [] };
var snap = {};
var TB = { prices: 'prices', col: 'collections', sales: 'sales', pay: 'payments', costs: 'costs', customers: 'customers' };
var SB;

/* ==========================================
   2. DATABASE SYNC & STORAGE HANDLERS
   ========================================== */
async function load() {
  for (var k in TB) {
    try {
      var r = await SB.from(TB[k]).select('*').order('created_at', { ascending: true });
      if (r.error) { r = await SB.from(TB[k]).select('*'); }
      if (r.error) throw r.error;
      S[k] = (r.data || []).map(function(x) { 
        var clean = Object.assign({}, x);
        delete clean.created_at; 
        return clean; 
      });
      snap[k] = {};
      S[k].forEach(function(x) { snap[k][x.id] = JSON.stringify(x); });
    } catch (err) {
      console.error('Error loading table ' + k, err);
      toast('Could not sync ' + k);
    }
  }
}

async function save() {
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
      toast('Not saved. Check your internet connection');
      return;
    }
  }
}

/* ==========================================
   3. HELPER & UTILITY FUNCTIONS
   ========================================== */
var $ = function(s) { return document.querySelector(s); };
var uid = function() { return Math.random().toString(36).slice(2, 9); };
var td = function() { return new Date().toISOString().slice(0, 10); };
var plus = function(d) { return new Date(Date.now() + d * 864e5).toISOString().slice(0, 10); };
var gh = function(n) { return 'GH₵ ' + (Math.round(n * 100) / 100).toLocaleString(); };
var esc = function(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var sum = function(a, f) { return a.reduce(function(t, x) { return t + f(x); }, 0); };
var num = function(id) { return parseFloat($(id).value) || 0; };

function wkStart() {
  var x = new Date();
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

function toast(t) {
  var e = $('#toast');
  e.textContent = t;
  e.hidden = false;
  clearTimeout(toast.h);
  toast.h = setTimeout(function() { e.hidden = true; }, 3000);
}

function prod(id) { return S.prices.find(function(p) { return p.id == id; }); }
function pOpts() { return S.prices.map(function(p) { return '<option value="' + p.id + '">' + esc(p.farm) + ' · ' + esc(p.item) + '</option>'; }).join(''); }
function shopOpts() { return SHOPS.map(function(s) { return '<option>' + s + '</option>'; }).join(''); }
function noPrices() { return '<div class="c">Add your farms and prices first in the <b>Prices</b> tab.</div>'; }

function debts() {
  var m = {};
  S.sales.slice().sort(function(a, b) { return a.date < b.date ? -1 : 1; }).forEach(function(s) {
    var o = s.qty * s.price - s.paid;
    if (o > .005 && s.cust) {
      var c = m[s.cust] = m[s.cust] || { n: s.cust, l: [], p: 0 };
      c.l.push({ o: o, due: s.due || s.date });
    }
  });
  S.pay.forEach(function(p) {
    var c = m[p.cust] = m[p.cust] || { n: p.cust, l: [], p: 0 };
    c.p += p.amt;
  });
  return Object.values(m).map(function(c) {
    var p = c.p;
    c.l.forEach(function(x) {
      var t = Math.min(x.o, p);
      x.o -= t;
      p -= t;
    });
    var o = c.l.filter(function(x) { return x.o > .005; });
    return { n: c.n, bal: sum(o, function(x) { return x.o; }), due: o.length ? o.map(function(x) { return x.due; }).sort()[0] : '' };
  }).filter(function(c) { return c.bal > .005; }).sort(function(a, b) { return a.due < b.due ? -1 : 1; });
}

function stock() {
  var m = {}, L = {};
  S.col.forEach(function(c) { var k = c.shop + '|' + c.pid; m[k] = (m[k] || 0) + c.qty; L[c.pid] = c.lbl; });
  S.sales.forEach(function(s) { var k = s.shop + '|' + s.pid; m[k] = (m[k] || 0) - s.qty; L[s.pid] = s.lbl; });
  return { m: m, L: L };
}

function recent(arr, type, fn) {
  return arr.slice(-5).reverse().map(function(x) {
    return '<div class="l"><div>' + fn(x) + '</div><button class="s" aria-label="Delete" onclick="del(\'' + type + '\',\'' + x.id + '\')">×</button></div>';
  }).join('') || '<small style="color:var(--mu)">Nothing yet</small>';
}

function del(t, id) {
  if (!confirm('Delete this entry?')) return;
  S[t] = S[t].filter(function(x) { return x.id != id; });
  save();
  render();
}

/* ==========================================
   4. VIEW TEMPLATES (UI SCREENS)
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
        od = d.filter(function(x) { return x.due < td(); }).length,
        fo = sum(S.col.filter(function(c) { return !c.paid; }), function(c) { return c.qty * c.buy; }),
        st = stock(),
        h = '';

    /* Row 1: Sales & Cash Tiles */
    h += '<div class="dash-grid">';
    h += '<div class="dash-tile"><span>Sales This Week</span><b>' + gh(rev) + '</b></div>';
    h += '<div class="dash-tile"><span>Cash Received</span><b>' + gh(cash) + '</b></div>';
    h += '</div>';

    /* Row 2: Profit Highlight Tile */
    h += '<div class="dash-tile highlight" style="margin-bottom:12px;">';
    h += '<span>Net Cash Profit This Week</span>';
    h += '<b style="font-size:28px;">' + gh(pf) + '</b>';
    h += '<small style="display:block;margin-top:4px;opacity:0.85;">Cash received − farm purchases − transport</small>';
    h += '</div>';

    /* Row 3: Purchases & Transport */
    h += '<div class="dash-grid">';
    h += '<div class="dash-tile"><span>Farm Purchases</span><b>' + gh(buy) + '</b></div>';
    h += '<div class="dash-tile"><span>Transport Cost</span><b>' + gh(tr) + '</b></div>';
    h += '</div>';

    /* Row 4: Liabilities & Debts */
    h += '<div class="dash-grid">';
    h += '<div class="dash-tile"><span>Customers Owe You</span><b class="' + (od ? 'n' : '') + '">' + gh(owed) + '</b>' + (od ? '<small class="n" style="display:block;margin-top:2px;">' + od + ' overdue</small>' : '') + '</div>';
    h += '<div class="dash-tile"><span>You Owe Farmers</span><b>' + gh(fo) + '</b></div>';
    h += '</div>';

    /* Row 5: Live Shop Stock Tiles */
    SHOPS.forEach(function(s) {
      var rows = Object.keys(st.m).filter(function(k) { return k.split('|')[0] == s; }).map(function(k) {
        var q = st.m[k], pid = k.split('|')[1];
        return '<div class="l"><span>' + esc(st.L[pid]) + '</span><b class="' + (q <= 0 ? 'n' : '') + '">' + q + ' crates</b></div>';
      }).join('');
      h += '<div class="c"><h2>📦 ' + s + ' Stock</h2>' + (rows || '<small style="color:var(--mu)">No stock recorded yet.</small>') + '</div>';
    });

    /* Row 6: Quick Data & System Controls */
    h += '<div class="c"><h3>System & Data</h3><div class="r"><button onclick="backup()">Download Backup</button><button onclick="logout()" style="background:var(--bd);color:var(--tx)">Sign Out</button></div></div>';

    return h;
  },

  collect: function() {
    if (!S.prices.length) return noPrices();
    return '<div class="c"><h2>Farm collection</h2><label>Date<input type="date" id="c-d" value="' + td() + '"></label><label>Farm · egg size<select id="c-p" onchange="cp()">' + pOpts() + '</select></label><div class="r"><label>Crates<input id="c-q" type="number" inputmode="decimal" oninput="cp(1)"></label><label>Farm price / crate<input id="c-b" type="number" inputmode="decimal" oninput="cp(1)"></label></div><label>Goes to<select id="c-s">' + shopOpts() + '</select></label><label>Transport cost for this trip (optional)<input id="c-t" type="number" inputmode="decimal"></label><label><input type="checkbox" id="c-pd" style="width:auto;margin-right:8px">Already paid the farmer</label><div id="c-tot" style="margin-bottom:10px;font-weight:600"></div><button onclick="addCol()">Save collection</button></div><div class="c"><h3>Recent collections</h3>' + recent(S.col, 'col', function(c) { return esc(c.lbl) + ' · ' + c.qty + ' crates<small>' + c.date + ' · ' + c.shop + ' · ' + gh(c.qty * c.buy) + (c.paid ? ' · paid' : ' · unpaid') + '</small>'; }) + '</div>';
  },

  sell: function() {
    if (!S.prices.length) return noPrices();
    var cl = S.customers.map(function(c) { return '<option value="' + esc(c.name) + '">' + (c.phone ? '(' + esc(c.phone) + ')' : '') + '</option>'; }).join('');
    return '<div class="c"><h2>New sale</h2><datalist id="cl">' + cl + '</datalist><div class="r"><label>Date<input type="date" id="s-d" value="' + td() + '"></label><label>Shop<select id="s-s">' + shopOpts() + '</select></label></div><label>Farm · egg size<select id="s-p" onchange="sp()">' + pOpts() + '</select></label><div class="r"><label>Crates<input id="s-q" type="number" inputmode="decimal" oninput="sp(1)"></label><label>Price / crate<input id="s-pr" type="number" inputmode="decimal" oninput="this.dataset.t=1;sp(1)"></label></div><label>Customer (blank = walk-in)<input id="s-c" list="cl" placeholder="Type or select customer"></label><label>Payment<select id="s-m" onchange="sp(1)"><option value="f">Paid in full</option><option value="p">Part paid</option><option value="c">On credit</option></select></label><div id="s-pt" hidden><label>Amount paid now<input id="s-a" type="number" inputmode="decimal"></label></div><div id="s-du" hidden><label>Must pay back within<select id="s-dd"><option value="7">1 week</option><option value="14">2 weeks</option><option value="21">3 weeks</option><option value="30">1 month</option></select></label></div><div id="s-tot" style="margin-bottom:10px;font-weight:600"></div><button onclick="addSale()">Save sale</button></div><div class="c"><h3>Recent sales</h3>' + recent(S.sales, 'sales', function(s) { return esc(s.lbl) + ' · ' + s.qty + ' × ' + gh(s.price) + '<small>' + s.date + ' · ' + s.shop + ' · ' + esc(s.cust || 'Walk-in') + (s.paid < s.qty * s.price - .005 ? ' · owes ' + gh(s.qty * s.price - s.paid) : '') + '</small>'; }) + '</div>';
  },

  credit: function() {
    var d = debts(), h = '<div class="c"><h2>Who owes you</h2>';
    h += d.map(function(x, i) {
      var o = x.due < td();
      var custObj = S.customers.find(function(c){ return c.name.toLowerCase() === x.n.toLowerCase(); });
      var phoneHtml = custObj && custObj.phone ? '<br><a href="tel:'+esc(custObj.phone)+'" style="color:var(--g);text-decoration:none">📞 '+esc(custObj.phone)+'</a>' : '';
      return '<div style="padding:10px 0;border-top:1px solid var(--bd)"><div class="l" style="border:0;padding:0"><div><b>'+esc(x.n)+'</b>'+phoneHtml+'<small>Due '+x.due+'</small></div><div style="text-align:right"><b>'+gh(x.bal)+'</b><br><span class="t'+(o?'':' o')+'">'+(o?'Overdue':'On time')+'</span></div></div><div class="r" style="margin-top:8px;grid-template-columns:1fr auto"><input id="pa'+i+'" type="number" inputmode="decimal" placeholder="Amount paid" style="margin:0"><button onclick="pay('+i+')" style="width:auto">Record</button></div></div>';
    }).join('') || '<small style="color:var(--mu)">Nobody owes you. Credit sales appear here.</small>';
    return h + '</div><div class="c"><h3>Recent payments</h3>' + recent(S.pay, 'pay', function(p) { return esc(p.cust) + ' paid ' + gh(p.amt) + '<small>' + p.date + '</small>'; }) + '</div>';
  },

  customers: function() {
    var h = '<div class="c"><h2>Add Credit Customer</h2><label>Customer Name<input id="cu-n" placeholder="e.g. John Doe"></label><label>Phone Number<input id="cu-p" type="tel" placeholder="e.g. 0241234567"></label><button onclick="addCustomer()">Save Customer</button></div>';
    h += '<div class="c"><h2>Customer Directory</h2>';
    h += S.customers.map(function(c) {
      return '<div class="l"><div><b>'+esc(c.name)+'</b><small>📞 '+esc(c.phone || 'No phone')+'</small></div><div style="display:flex;gap:6px">' + (c.phone ? '<a class="btn-link" style="padding:6px 12px;font-size:13px;width:auto" href="tel:'+esc(c.phone)+'">Call</a>' : '') + '<button class="s" onclick="del(\'customers\',\''+c.id+'\')">×</button></div></div>';
    }).join('') || '<small style="color:var(--mu)">No customers saved yet.</small>';
    return h + '</div>';
  },

  costs: function() {
    var w = wkStart(),
        tr = sum(S.costs.filter(function(c) { return c.date >= w; }), function(c) { return c.amt; }),
        cr = sum(S.col.filter(function(c) { return c.date >= w; }), function(c) { return c.qty; });
    return '<div class="dash-grid"><div class="dash-tile"><span>Transport this week</span><b>' + gh(tr) + '</b></div><div class="dash-tile"><span>Per crate collected</span><b>' + (cr ? gh(tr / cr) : '–') + '</b></div></div><div class="c"><h2>Add transport / expense</h2><div class="r"><label>Date<input type="date" id="x-d" value="' + td() + '"></label><label>Amount<input id="x-a" type="number" inputmode="decimal"></label></div><label>What for<input id="x-n" placeholder="e.g. Fuel to Farm A"></label><button onclick="addCost()">Save expense</button></div><div class="c"><h3>Recent expenses</h3>' + recent(S.costs, 'costs', function(c) { return esc(c.descr) + ' · ' + gh(c.amt) + '<small>' + c.date + '</small>'; }) + '</div>';
  },

  prices: function() {
    var fl = Array.from(new Set(S.prices.map(function(p) { return p.farm; }))).map(function(f) { return '<option value="' + esc(f) + '">'; }).join('');
    return '<div class="c"><h2>Add farm price</h2><datalist id="fl">' + fl + '</datalist><label>Farm<input id="n-f" list="fl" placeholder="e.g. Farm A"></label><label>Egg size / type<input id="n-i" placeholder="e.g. Large"></label><div class="r"><label>Farm price / crate<input id="n-b" type="number" inputmode="decimal"></label><label>Selling price / crate<input id="n-s" type="number" inputmode="decimal"></label></div><button onclick="addPrice()">Add</button></div><div class="c"><h2>Price list</h2>' + (S.prices.map(function(p) {
      var pf = p.sell - p.buy;
      return '<div style="padding:10px 0;border-top:1px solid var(--bd)"><div class="l" style="border:0;padding:0"><b>' + esc(p.farm) + ' · ' + esc(p.item) + '</b><button class="s" aria-label="Delete" onclick="delP(\'' + p.id + '\')">×</button></div><div class="pr"><label>Farm price<input type="number" inputmode="decimal" value="' + p.buy + '" onchange="upP(\'' + p.id + '\',\'buy\',this.value)"></label><label>Selling price<input type="number" inputmode="decimal" value="' + p.sell + '" onchange="upP(\'' + p.id + '\',\'sell\',this.value)"></label></div><small style="color:var(--mu)">Profit ' + gh(pf) + ' per crate · margin ' + (p.sell ? Math.round(pf / p.sell * 100) : 0) + '%</small></div>';
    }).join('') || '<small style="color:var(--mu)">No prices yet</small>') + '</div>';
  }
};

/* ==========================================
   5. INTERACTION & ACTION HANDLERS
   ========================================== */
function cp(t) {
  var p = prod($('#c-p').value);
  if (!p) return;
  if (!t) $('#c-b').value = p.buy;
  $('#c-tot').textContent = 'Total owed to farmer: ' + gh(num('#c-q') * num('#c-b'));
}

function sp(t) {
  var p = prod($('#s-p').value);
  if (!p) return;
  var pr = $('#s-pr');
  if (!t) { pr.dataset.t = ''; pr.value = p.sell; }
  var tot = num('#s-q') * num('#s-pr'), m = $('#s-m').value;
  $('#s-pt').hidden = m != 'p';
  $('#s-du').hidden = m == 'f';
  $('#s-tot').textContent = 'Total: ' + gh(tot);
}

function addCol() {
  var p = prod($('#c-p').value), q = num('#c-q');
  if (!p || q <= 0) return toast('Enter the number of crates');
  var t = num('#c-t'), d = $('#c-d').value || td();
  S.col.push({ id: uid(), date: d, pid: p.id, lbl: p.farm + ' · ' + p.item, qty: q, buy: num('#c-b'), shop: $('#c-s').value, paid: $('#c-pd').checked });
  if (t > 0) S.costs.push({ id: uid(), date: d, descr: 'Transport: ' + p.farm, amt: t });
  save();
  toast('Collection saved');
  render();
}

function addSale() {
  var p = prod($('#s-p').value), q = num('#s-q'), pr = num('#s-pr');
  if (!p || q <= 0 || pr <= 0) return toast('Enter crates and price');
  var m = $('#s-m').value, cust = $('#s-c').value.trim(), tot = q * pr, paid = m == 'f' ? tot : m == 'c' ? 0 : Math.min(num('#s-a'), tot);
  if (m != 'f' && paid < tot && !cust) return toast('Enter the customer name for credit');
  var d = $('#s-d').value || td();
  S.sales.push({ id: uid(), date: d, pid: p.id, lbl: p.farm + ' · ' + p.item, qty: q, price: pr, shop: $('#s-s').value, cust: cust, paid: paid, due: paid < tot ? plus(+$('#s-dd').value) : '' });
  save();
  toast('Sale saved');
  render();
}

function addCustomer() {
  var name = $('#cu-n').value.trim(), phone = $('#cu-p').value.trim();
  if (!name) return toast('Enter customer name');
  S.customers.push({ id: uid(), name: name, phone: phone });
  save();
  toast('Customer saved');
  render();
}

function pay(i) {
  var d = debts()[i], a = num('#pa' + i);
  if (!d || a <= 0) return toast('Enter the amount paid');
  S.pay.push({ id: uid(), date: td(), cust: d.n, amt: a });
  save();
  toast('Payment recorded');
  render();
}

function addCost() {
  var a = num('#x-a');
  if (a <= 0) return toast('Enter an amount');
  S.costs.push({ id: uid(), date: $('#x-d').value || td(), descr: $('#x-n').value.trim() || 'Transport', amt: a });
  save();
  toast('Expense saved');
  render();
}

function addPrice() {
  var f = $('#n-f').value.trim(), i = $('#n-i').value.trim();
  if (!f || !i) return toast('Enter farm and egg size');
  S.prices.push({ id: uid(), farm: f, item: i, buy: num('#n-b'), sell: num('#n-s'), hist: [] });
  save();
  toast('Price added');
  render();
}

function upP(id, f, v) {
  var p = prod(id);
  p.hist.push({ date: td(), buy: p.buy, sell: p.sell });
  p[f] = parseFloat(v) || 0;
  save();
  render();
}

function delP(id) {
  if (!confirm('Delete this price? Past records are kept.')) return;
  S.prices = S.prices.filter(function(p) { return p.id != id; });
  save();
  render();
}

/* ==========================================
   6. NAVIGATION & INITIALIZATION
   ========================================== */
var TABS = [['home', '⌂', 'Home'], ['collect', '↓', 'Collect'], ['sell', '$', 'Sell'], ['credit', '◔', 'Credit'], ['customers', '👥', 'Customers'], ['costs', '⛟', 'Costs'], ['prices', '≡', 'Prices']];

function go(t) {
  tab = t;
  render();
  window.scrollTo(0, 0);
}

function render() {
  $('#nv').innerHTML = TABS.map(function(t) { return '<button class="' + (t[0] == tab ? 'a' : '') + '" onclick="go(\'' + t[0] + '\')"><i>' + t[1] + '</i>' + t[2] + '</button>'; }).join('');
  $('#m').innerHTML = V[tab]();
  $('#wk').textContent = 'Week of ' + wkStart();
  if (tab == 'collect') cp();
  if (tab == 'sell') sp();
}

function backup() {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
  a.download = 'afa-backup-' + td() + '.json';
  a.click();
}

function loginView() {
  $('#nv').innerHTML = '';
  $('#m').innerHTML = '<div class="c"><h2>Sign in</h2><label>Email<input id="l-e" type="email" autocomplete="username"></label><label>Password<input id="l-p" type="password" autocomplete="current-password"></label><button onclick="login()">Sign in</button></div>';
}

async function login() {
  var r = await SB.auth.signInWithPassword({ email: $('#l-e').value.trim(), password: $('#l-p').value });
  if (r.error) return toast('Wrong email or password');
  await load();
  render();
}

async function logout() {
  await SB.auth.signOut();
  loginView();
}

async function boot() {
  if (SB_URL.indexOf('PASTE') == 0) {
    $('#m').innerHTML = '<div class="c">Setup needed: paste your Supabase URL and anon key at the top of the script in index.html.</div>';
    return;
  }
  SB = supabase.createClient(SB_URL, SB_KEY);
  var s = await SB.auth.getSession();
  if (s.data.session) {
    await load();
    render();
  } else {
    loginView();
  }
}

boot();
