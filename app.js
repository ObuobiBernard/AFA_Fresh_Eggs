/* ==========================================
   0. ROLES & PERMISSIONS
   ========================================== */
var ROLE_LABELS = {
  ceo: 'CEO',
  data_entry: 'Data Entry',
  attendant: 'Shop Attendant',
  driver: 'Driver',
  pending: 'Pending Approval'
};

// Single source of truth for what each role may do.
// RLS in supabase-rbac.sql is the hard boundary; this drives the UI.
var PERMS = {
  ceo:        { viewShops: ['Main Shop', 'Market Shop'], sell: 1, collect: 1, pay: 1, customer: 1, cost: 1, prices: 1, transfer: 1, del: 1, delOwn: 1, backup: 1, export: 1, team: 1, home: 1 },
  data_entry: { viewShops: ['Main Shop', 'Market Shop'], sell: 1, collect: 1, pay: 1, customer: 1, cost: 1, prices: 1, transfer: 1, del: 0, delOwn: 0, backup: 0, export: 0, team: 0, home: 1 },
  attendant:  { sell: 1, collect: 0, pay: 1, customer: 1, cost: 0, prices: 0, transfer: 0, del: 0, delOwn: 1, backup: 0, export: 0, team: 0, home: 1 },
  driver:     { viewShops: ['Main Shop', 'Market Shop'], sell: 0, collect: 1, pay: 0, customer: 0, cost: 1, prices: 0, transfer: 0, del: 0, delOwn: 0, backup: 0, export: 0, team: 0, home: 1 },
  pending:    { sell: 0, collect: 0, pay: 0, customer: 0, cost: 0, prices: 0, transfer: 0, del: 0, delOwn: 0, backup: 0, export: 0, team: 0, home: 0 }
};

// The signed-in user's own record
var ME = { id: '', email: '', name: '', phone: '', role: 'pending', shop: '', active: false };

function can(k) {
  return !!(PERMS[ME.role] && PERMS[ME.role][k]);
}
// Attendants are locked to their own shop; everyone else sees every shop
function myShop() {
  return (ME.role === 'attendant') ? ME.shop : '';
}
function shopsFor() {
  if (PERMS[ME.role] && PERMS[ME.role].viewShops) return PERMS[ME.role].viewShops;
  return ME.shop ? [ME.shop] : SHOPS;
}
// Narrows a record list to what this user is allowed to see
function scopeRows(rows) {
  var s = myShop();
  if (!s) return rows;
  return rows.filter(function(r) { return r.shop === s; });
}

// Can this user delete THIS specific row?
// CEO deletes anything; an attendant may delete only sales they recorded.
function mayDel(t, row) {
  if (can('del')) return true;
  return !!(can('delOwn') && t === 'sales' && row && row.created_by === ME.id);
}

// Friendly wall for a tab the signed-in role cannot use
function noAccess(what) {
  return '<div class="c"><h2>🔒 ' + esc(what || 'This section') + '</h2>' +
    '<p style="color:var(--mu);font-size:14px;margin:0 0 4px">Your role (<b>' + esc(ROLE_LABELS[ME.role] || ME.role) + '</b>) does not include access to this screen.</p>' +
    '<p style="color:var(--mu);font-size:14px;margin:0">Ask the CEO to adjust your permissions if you need it.</p></div>';
}

/* ==========================================
   1. CONFIGURATION & APP STATE
   ========================================== */
var SB_URL = 'https://vitalucvobokjkdogwiq.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdGFsdWN2b2Jva2prZG9nd2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MzMyMzUsImV4cCI6MjEwNzQwOTIzNX0.bGJt2h-SVqzNCBjwfZMkvkXxn8f0S1sFTTj9CkBO96g'; // <-- Keep your valid Supabase key here!
var tab = 'home';
var selDate = ''; // Selected date for viewing weekly dashboard history
var SHOPS = ['Main Shop', 'Market Shop'];
var S = { prices: [], col: [], sales: [], pay: [], costs: [], customers: [], profiles: [] };
var snap = {};
// profiles is intentionally NOT synced through save(): RLS only lets a user
// update their own name/phone, and role changes go through set_member().
var TB = { prices: 'prices', col: 'collections', sales: 'sales', pay: 'payments', costs: 'costs', customers: 'customers' };
var SB;
var isSaving = false;
var saveQueued = false;

/* ==========================================
   2. DATABASE SYNC & QUEUE HANDLERS
   ========================================== */

// Loads the signed-in user's own profile (role, shop, active flag)
async function loadMe() {
  ME = { id: '', email: '', name: '', phone: '', role: 'pending', shop: '', active: false };
  try {
    var u = await SB.auth.getUser();
    var usr = u && u.data && u.data.user;
    if (!usr) return ME;
    ME.id = usr.id;
    ME.email = usr.email || '';
    ME.name = (usr.user_metadata && usr.user_metadata.name) || '';
    ME.phone = (usr.user_metadata && usr.user_metadata.phone) || '';
    var r = await SB.from('profiles').select('*').eq('id', usr.id).maybeSingle();
    if (r.error) throw r.error;
    if (r.data) {
      ME.role = r.data.role || 'pending';
      ME.shop = r.data.shop || '';
      ME.active = !!r.data.active;
      ME.name = r.data.name || ME.name;
      ME.phone = r.data.phone || ME.phone;
    }
  } catch (err) {
    console.error('loadMe failed:', err);
  }
  return ME;
}

// Staff directory — CEO only (RLS hides it from everyone else, so this stays empty)
async function loadTeam() {
  S.profiles = [];
  if (ME.role !== 'ceo') return;
  try {
    var r = await SB.from('profiles').select('*').order('created_at', { ascending: true });
    if (!r.error && r.data) S.profiles = r.data;
  } catch (err) {
    console.error('loadTeam failed:', err);
  }
}

async function load() {
  setSyncStatus('saving', 'Loading...');
  var hadError = false;

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
    toast('Saved locally. Will sync when online.');
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
function parseDate(s) {
  var p = (s || td()).split('-');
  return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0);
}
var td = function() { return localDateStr(new Date()); };
var plus = function(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  return localDateStr(d);
};

// Returns { start: 'YYYY-MM-DD' (Monday), end: 'YYYY-MM-DD' (Sunday) } for any date string
function wkRange(dateStr) {
  var x = parseDate(dateStr || selDate || td());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  var start = localDateStr(x);
  var y = new Date(x);
  y.setDate(y.getDate() + 6); // Sunday
  var end = localDateStr(y);
  return { start: start, end: end };
}

function wkStart() {
  return wkRange(selDate || td()).start;
}

function setWeekDate(val) {
  selDate = val || td();
  render();
}

function shiftWeek(days) {
  var d = parseDate(selDate || td());
  d.setDate(d.getDate() + days);
  selDate = localDateStr(d);
  render();
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

// FIFO debt calc: oldest sale due dates are paid off first
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

// Live stock per shop|product. Negative-qty collection rows are adjustments/transfers.
function stock() {
  var m = {}, L = {};
  S.prices.forEach(function(p) { L[p.id] = p.farm + ' · ' + p.item; });
  scopeRows(S.col).forEach(function(c) { var k = c.shop + '|' + c.pid; m[k] = (m[k] || 0) + c.qty; if (c.lbl) L[c.pid] = c.lbl; });
  scopeRows(S.sales).forEach(function(s) { var k = s.shop + '|' + s.pid; m[k] = (m[k] || 0) - s.qty; if (s.lbl) L[s.pid] = s.lbl; });
  return { m: m, L: L };
}

function shopStockQty(shop, pid) {
  var st = stock();
  return Math.round((st.m[shop + '|' + pid] || 0) * 100) / 100;
}

function del(t, id) {
  var row = S[t].find(function(x) { return x.id == id; });
  if (!row) return;
  // single source of truth for delete rights (see mayDel)
  if (!mayDel(t, row)) return toast('You do not have permission to delete this');
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
    var rng = wkRange(selDate || td()),
        w = rng.start,
        wEnd = rng.end,
        isCurrentWk = (w === wkRange(td()).start),
        sa = scopeRows(S.sales).filter(function(s) { return s.date >= w && s.date <= wEnd; }),
        cols = scopeRows(S.col).filter(function(c) { return c.date >= w && c.date <= wEnd && c.qty > 0; }),
        pays = scopeRows(S.pay).filter(function(p) { return p.date >= w && p.date <= wEnd; }),
        csts = scopeRows(S.costs).filter(function(c) { return c.date >= w && c.date <= wEnd; }),
        rev = sum(sa, function(s) { return s.qty * s.price; }),
        cratesSold = sum(sa, function(s) { return s.qty; }),
        cratesPicked = sum(cols, function(c) { return c.qty; }),
        cash = sum(sa, function(s) { return s.paid; }) + sum(pays, function(p) { return p.amt; }),
        buy = sum(cols, function(c) { return c.qty * c.buy; }),
        tr = sum(csts, function(c) { return c.amt; }),
        pf = cash - buy - tr,
        d = debts(),
        owed = sum(d, function(x) { return x.bal; }),
        fo = sum(scopeRows(S.col).filter(function(c) { return c.qty > 0 && (c.paid_amt || 0) < (c.qty * c.buy); }), function(c) { return (c.qty * c.buy) - (c.paid_amt || 0); }),
        st = stock(),
        h = '';

    // Who am I + role badge
    h += '<div class="c" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">';
    h += '<div><b>' + esc(ME.name || ME.email || 'User') + '</b><small style="display:block;color:var(--mu)">' + esc(ROLE_LABELS[ME.role] || ME.role) + (myShop() ? ' · ' + esc(ME.shop) : ' · All shops') + '</small></div>';
    if (myShop()) h += '<span class="sync-pill" style="background:var(--gb,#e5f4e8);color:var(--g);flex:none">' + esc(ME.shop) + '</span>';
    h += '</div>';

    // Week picker — jump to any past or future week
    h += '<div class="c">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    h += '<b>📅 Week: ' + esc(w) + ' to ' + esc(wEnd) + '</b>';
    if (!isCurrentWk) {
      h += '<button class="s" style="color:var(--g);font-size:13px;padding:2px 8px;" onclick="setWeekDate(\'\')">This Week</button>';
    }
    h += '</div>';
    h += '<div class="r" style="grid-template-columns:auto 1fr auto;align-items:center;gap:8px;">';
    h += '<button onclick="shiftWeek(-7)" style="width:auto;padding:10px 14px;" title="Previous week">◀</button>';
    h += '<input type="date" value="' + esc(selDate || td()) + '" onchange="setWeekDate(this.value)" style="margin:0;text-align:center;">';
    h += '<button onclick="shiftWeek(7)" style="width:auto;padding:10px 14px;" title="Next week">▶</button>';
    h += '</div>';
    h += '</div>';

    h += '<div class="dash-grid">';
    h += '<div class="dash-tile"><span>Sales (' + cratesSold + ' crates)</span><b>' + gh(rev) + '</b></div>';
    h += '<div class="dash-tile"><span>Cash Received</span><b>' + gh(cash) + '</b></div>';
    h += '</div>';

    h += '<div class="dash-tile highlight" style="margin-bottom:12px;">';
    h += '<span>Net Cash Profit (' + (isCurrentWk ? 'This Week' : esc(w)) + ')</span>';
    h += '<b style="font-size:28px;">' + gh(pf) + '</b>';
    h += '<small style="display:block;margin-top:4px;opacity:0.85;">Cash received − farm purchases − transport</small>';
    h += '</div>';

    h += '<div class="dash-grid">';
    h += '<div class="dash-tile"><span>Pickups (' + cratesPicked + ' crates)</span><b>' + gh(buy) + '</b></div>';
    h += '<div class="dash-tile"><span>Transport / Costs</span><b>' + gh(tr) + '</b></div>';
    h += '</div>';

    h += '<div class="dash-grid">';
    h += '<div class="dash-tile" onclick="go(\'credit\')" style="cursor:pointer"><span>Customers Owe You</span><b>' + gh(owed) + '</b></div>';
    h += '<div class="dash-tile" onclick="go(\'collect\')" style="cursor:pointer"><span>You Owe Farmers</span><b>' + gh(fo) + '</b></div>';
    h += '</div>';


    // Sales recorded in the selected week
    var salesRows = sa.slice().reverse().map(function(s) {
      var custObj = cust(s.cust_id);
      var total = s.qty * s.price;
      var dueAmt = total - s.paid;
      return '<div class="l"><div><b>' + esc(s.lbl) + '</b> · ' + s.qty + ' crates × ' + gh(s.price) +
        '<small>' + esc(s.date) + ' · ' + esc(s.shop) + ' · ' + esc(custObj ? custObj.name : 'Walk-in') +
        (dueAmt > 0 ? ' · <span class="n">Unpaid: ' + gh(dueAmt) + '</span>' : ' · Paid') + '</small></div>' +
        '<b>' + gh(total) + '</b></div>';
    }).join('');
    h += '<div class="c"><h2>🛒 Sales in Selected Week (' + sa.length + ')</h2>' +
      (salesRows || '<small style="color:var(--mu)">No sales recorded for ' + esc(w) + ' – ' + esc(wEnd) + '.</small>') + '</div>';

    // Farm pickups recorded in the selected week
    var colRows = cols.slice().reverse().map(function(c) {
      var total = c.qty * c.buy;
      var owedAmt = total - (c.paid_amt || 0);
      return '<div class="l"><div><b>' + esc(c.lbl) + '</b> · ' + c.qty + ' crates × ' + gh(c.buy) +
        '<small>' + esc(c.date) + ' · ' + esc(c.shop) +
        (owedAmt > 0 ? ' · <span class="n">Owe: ' + gh(owedAmt) + '</span>' : ' · Paid') + '</small></div>' +
        '<b>' + gh(total) + '</b></div>';
    }).join('');
    h += '<div class="c"><h2>🚚 Farm Pickups in Selected Week (' + cols.length + ')</h2>' +
      (colRows || '<small style="color:var(--mu)">No farm pickups recorded for ' + esc(w) + ' – ' + esc(wEnd) + '.</small>') + '</div>';

    // Live stock per shop (only the shops this user may see)
    shopsFor().forEach(function(s) {
      var rows = Object.keys(st.m).filter(function(k) { return k.split('|')[0] == s && Math.abs(st.m[k]) > 0.001; }).map(function(k) {
        var q = Math.round(st.m[k] * 100) / 100, pid = k.split('|')[1];
        return '<div class="l"><span>' + esc(st.L[pid] || 'Unknown Item') + '</span><b class="' + (q < 0 ? 'n' : '') + '">' + q + ' crates</b></div>';
      }).join('');
      h += '<div class="c"><h2>📦 ' + esc(s) + ' Current Stock</h2>' + (rows || '<small style="color:var(--mu)">No stock recorded.</small>') + '</div>';
    });

    // System & Data — only for roles allowed to back up / export
    if (can('backup') || can('export')) {
      h += '<div class="c"><h3>System & Data</h3>' +
        (can('backup') ? '<div class="r" style="margin-bottom:10px;"><button onclick="backup()">Download Backup</button><button onclick="exportCSV()">Export CSV</button></div>' +
        '<label class="pick" style="margin:0"><span class="btn-link" style="background:var(--bg);color:var(--tx);border:1px solid var(--bd);margin-bottom:10px;">📂 Restore Backup (.json)</span><input type="file" accept=".json" hidden onchange="restoreBackup(this)"></label>' : '') +
        '<button onclick="logout()" style="background:var(--bd);color:var(--tx);">Sign Out</button></div>';
    } else {
      h += '<div class="c"><button onclick="logout()" style="background:var(--bd);color:var(--tx);">Sign Out</button></div>';
    }

    return h;
  },


  collect: function() {
    if (!S.prices.length) return noPrices();
    if (!can('collect')) return noAccess('Farm collection');

    // Unpaid farm pickups with a "Pay Farmer" action (#1)
    var unpaidCols = scopeRows(S.col).filter(function(c) { return c.qty > 0 && (c.qty * c.buy) - (c.paid_amt || 0) > 0.005; });
    var unpaidHtml = unpaidCols.length ? '<div class="c"><h2>🌾 Unpaid Farm Pickups (' + unpaidCols.length + ')</h2>' +
      unpaidCols.map(function(c, idx) {
        var owed = (c.qty * c.buy) - (c.paid_amt || 0);
        return '<div style="padding:10px 0;border-top:1px solid var(--bd)">' +
          '<div class="l" style="border:0;padding:0"><div><b>' + esc(c.lbl) + '</b> · ' + c.qty + ' crates<small>' + esc(c.date) + ' × ' + esc(c.shop) + ' · Paid ' + gh(c.paid_amt || 0) + ' of ' + gh(c.qty * c.buy) + '</small></div>' +
          '<b class="n">Owe ' + gh(owed) + '</b></div>' +
          '<div class="r" style="margin-top:8px;grid-template-columns:1fr auto">' +
          '<input id="fpa' + idx + '" type="number" inputmode="decimal" value="' + (Math.round(owed * 100) / 100) + '" placeholder="Amount" style="margin:0">' +
          '<button onclick="payFarmer(\'' + esc(c.id) + '\',' + idx + ')" style="width:auto">Pay Farmer</button>' +
          '</div></div>';
      }).join('') + '</div>' : '';

    // Stock transfer between shops / breakage (#3) · leadership only
    var transferHtml = can('transfer') ? '<details class="c"><summary>🔄 Transfer Stock or Record Breakage</summary><div>' +
      '<label>Action<select id="tr-type" onchange="$(\'#tr-to-wrap\').hidden = (this.value === \'loss\');"><option value="move">Transfer Between Shops</option><option value="loss">Record Broken / Spoiled Crates</option></select></label>' +
      '<label>Farm · egg size<select id="tr-p">' + pOpts() + '</select></label>' +
      '<div class="r"><label>From Shop<select id="tr-from">' + shopOpts() + '</select></label>' +
      '<div id="tr-to-wrap"><label>To Shop<select id="tr-to">' + SHOPS.slice().reverse().map(function(s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></label></div></div>' +
      '<label>Crates<input id="tr-q" type="number" inputmode="decimal" placeholder="e.g. 5"></label>' +
      '<button onclick="adjustStock()">Save Stock Adjustment</button>' +
      '</div></details>' : '';

    return '<div class="c"><h2>Farm collection</h2><label>Date<input type="date" id="c-d" value="' + td() + '"></label><label>Farm · egg size<select id="c-p" onchange="cp()">' + pOpts() + '</select></label><div class="r"><label>Crates<input id="c-q" type="number" inputmode="decimal" oninput="cp(1)"></label><label>Farm price / crate<input id="c-b" type="number" inputmode="decimal" oninput="cp(1)"></label></div><label>Goes to<select id="c-s">' + shopOpts() + '</select></label><label>Transport cost<input id="c-t" type="number" inputmode="decimal"></label><label><input type="checkbox" id="c-pd" checked style="width:auto;margin-right:8px" onchange="$(\'#c-paid-amt\').hidden = this.checked;">Paid in full</label><div id="c-paid-amt" hidden><label>Amount paid now<input id="c-pa" type="number" inputmode="decimal"></label></div><div id="c-tot" style="margin-bottom:10px;font-weight:600"></div><button onclick="addCol()">Save collection</button></div>' +
      unpaidHtml +
      transferHtml +
      '<div class="c"><h3>Recent collections & adjustments</h3>' + (scopeRows(S.col).slice(-8).reverse().map(function(c) {
        var owed = c.qty > 0 ? (c.qty * c.buy - (c.paid_amt || 0)) : 0;
        return '<div class="l"><div><b>' + esc(c.lbl) + '</b> · ' + (c.qty > 0 ? '+' : '') + c.qty + ' crates<small>' + esc(c.date) + ' × ' + esc(c.shop) + (c.buy > 0 ? ' · ' + gh(c.qty * c.buy) + (owed <= 0.005 ? ' × Paid' : ' · Owe ' + gh(owed)) : ' · Stock adjustment') + '</small></div><button class="s" onclick="del(\'col\',\'' + esc(c.id) + '\')">×</button></div>';
      }).join('') || '<small style="color:var(--mu)">No collections yet.</small>') + '</div>';
  },


  sell: function() {
    if (!S.prices.length) return noPrices();
    if (!can('sell')) return noAccess('New sale');
    var cl = S.customers.map(function(c) { return '<option value="' + esc(c.name) + '"></option>'; }).join('');

    // Attendants are pinned to their own shop; others may choose
    var shopField = myShop()
      ? '<label>Shop<input value="' + esc(ME.shop) + '" readonly style="background:var(--bg);color:var(--mu)"><input type="hidden" id="s-s" value="' + esc(ME.shop) + '"></label>'
      : '<label>Shop<select id="s-s" onchange="sp(1)">' + shopOpts() + '</select></label>';

    return '<div class="c"><h2>New sale</h2><datalist id="cl">' + cl + '</datalist>' +
      '<div class="r"><label>Date<input type="date" id="s-d" value="' + td() + '"></label>' + shopField + '</div>' +
      '<label>Farm · egg size<select id="s-p" onchange="sp()">' + pOpts() + '</select></label>' +
      '<div id="s-stk" style="font-size:13px;margin:-4px 0 10px;font-weight:600;"></div>' +
      '<div class="r"><label>Crates<input id="s-q" type="number" inputmode="decimal" oninput="sp(1)"></label><label>Price / crate<input id="s-pr" type="number" inputmode="decimal" oninput="sp(1)"></label></div>' +
      '<div class="r"><label>Customer<input id="s-c" list="cl" oninput="checkNewCust()" placeholder="Name (or Walk-in)"></label><label id="s-cp-wrap" hidden>New Customer Phone<input id="s-cp" type="tel" placeholder="024..."></label></div>' +
      '<label>Payment Method<select id="s-paym"><option>Cash</option><option>Mobile Money</option></select></label>' +
      '<label>Payment Status<select id="s-m" onchange="sp(1)"><option value="f">Paid in full</option><option value="p">Part paid</option><option value="c">On credit</option></select></label>' +
      '<div id="s-pt" hidden><label>Amount paid now<input id="s-a" type="number" inputmode="decimal"></label></div>' +
      '<div id="s-du" hidden><label>Due within<select id="s-dd"><option value="7">1 week</option><option value="14">2 weeks</option><option value="30">1 month</option></select></label></div>' +
      '<div id="s-tot" style="margin-bottom:10px;font-weight:600"></div><button onclick="addSale()">Save sale</button></div>' +
      '<div class="c"><h3>Recent Sales & Receipts</h3>' +
      (scopeRows(S.sales).slice(-8).reverse().map(function(s) {
        var custObj = cust(s.cust_id);
        var phone = custObj ? custObj.phone : '';
        var total = s.qty * s.price;
        var dueAmt = total - s.paid;
        var msg = encodeURIComponent('*AFA FRESH EGGS*\nDate: ' + s.date + '\nItem: ' + s.lbl + '\nQty: ' + s.qty + ' crates\nTotal: ' + gh(total) + '\nPaid: ' + gh(s.paid) + (dueAmt > 0 ? '\nBalance Due: ' + gh(dueAmt) : '\nStatus: PAID'));
        var waBtn = phone ? '<a class="btn-link btn-wa" style="padding:6px 12px;font-size:13px;width:auto;margin-top:6px" href="https://wa.me/' + formatPhone(phone) + '?text=' + msg + '" target="_blank" rel="noopener">💬 Receipt</a>' : '';
        var delBtn = mayDel('sales', s) ? '<button class="s" onclick="del(\'sales\',\'' + esc(s.id) + '\')">×</button>' : '';
        return '<div class="l"><div><b>' + esc(s.lbl) + '</b> · ' + s.qty + ' × ' + gh(s.price) + '<small>' + esc(s.date) + ' · ' + esc(s.shop) + ' · ' + esc(custObj ? custObj.name : 'Walk-in') + (dueAmt > 0 ? ' · <span class="n">Due ' + gh(dueAmt) + '</span>' : '') + '</small>' + waBtn + '</div>' + delBtn + '</div>';
      }).join('') || '<small style="color:var(--mu)">No sales yet.</small>') + '</div>';
  },


  credit: function() {
    if (!can('pay') && !can('customer')) return noAccess('Customer Credit');
    var d = debts(), h = '<div class="c"><h2>Customer Credit & Directory</h2>';
    h += can('customer') ? '<div style="margin-bottom:14px"><input id="cu-n" placeholder="New customer name" style="margin-bottom:8px"><input id="cu-p" type="tel" placeholder="Phone number" style="margin-bottom:8px"><button onclick="addCustomer()">Add Customer</button></div>' : '';
    h += '<h3>Outstanding Customer Balances (' + d.length + ')</h3>';
    h += d.map(function(x, i) {
      var custObj = cust(x.id);
      var phone = custObj ? custObj.phone : '';
      var waMsg = encodeURIComponent('Hello ' + x.name + ', friendly reminder from AFA Fresh Eggs for your balance of ' + gh(x.bal) + '. Thank you!');
      var waLink = phone ? '<a class="btn-link btn-wa" style="padding:6px 12px;font-size:13px;width:auto;margin-top:6px" href="https://wa.me/' + formatPhone(phone) + '?text=' + waMsg + '" target="_blank" rel="noopener">💬 WhatsApp Reminder</a>' : '';
      return '<div style="padding:10px 0;border-top:1px solid var(--bd)"><div class="l" style="border:0;padding:0"><div><b>' + esc(x.name) + '</b><small>📞 ' + esc(phone || 'None') + (x.due ? ' · Due ' + esc(x.due) : '') + '</small></div><div style="text-align:right"><b class="n">' + gh(x.bal) + '</b></div></div>' + waLink + (can('pay') ? '<div class="r" style="margin-top:8px;grid-template-columns:1fr auto"><input id="pa' + i + '" type="number" inputmode="decimal" placeholder="Amount" style="margin:0"><button onclick="pay(\'' + esc(x.id) + '\', ' + i + ')" style="width:auto">Record Payment</button></div>' : '') + '</div>';
    }).join('') || '<small style="color:var(--mu)">No outstanding debts.</small>';
    h += '</div>';

    // Debt payment history with undo/delete (#2) — leadership only
    if (can('del') || ME.role === 'data_entry') {
      h += '<div class="c"><h3>Recent Debt Payments</h3>' +
        (S.pay.slice(-8).reverse().map(function(p) {
          var cObj = cust(p.cust_id);
          return '<div class="l"><div><b>' + esc(cObj ? cObj.name : 'Customer') + '</b><small>' + esc(p.date) + '</small></div><b>' + gh(p.amt) + '</b>' + (mayDel('pay', p) ? '<button class="s" onclick="del(\'pay\',\'' + esc(p.id) + '\')">×</button>' : '') + '</div>';
        }).join('') || '<small style="color:var(--mu)">No debt payments recorded yet.</small>') + '</div>';
    }

    // Full customer directory (#2)
    h += '<details class="c"><summary>👥 All Customers Directory (' + S.customers.length + ')</summary><div>' +
      (S.customers.map(function(c) {
        var wa = c.phone ? '<a class="btn-link btn-wa" style="padding:4px 10px;font-size:12px;width:auto;min-height:auto;" href="https://wa.me/' + formatPhone(c.phone) + '" target="_blank" rel="noopener">💬 Chat</a>' : '';
        return '<div class="l"><div><b>' + esc(c.name) + '</b><small>📞 ' + esc(c.phone || 'No phone') + '</small></div><div style="display:flex;align-items:center;gap:6px;">' + wa + (mayDel('customers', c) ? '<button class="s" onclick="del(\'customers\',\'' + esc(c.id) + '\')">×</button>' : '') + '</div></div>';
      }).join('') || '<small style="color:var(--mu)">No customers saved yet.</small>') + '</div></details>';

    return h;
  },

  costs: function() {
    if (!can('cost')) return noAccess('Expenses & Transport');
    return '<div class="c"><h2>Add expense / transport</h2><div class="r"><label>Date<input type="date" id="x-d" value="' + td() + '"></label><label>Amount<input id="x-a" type="number" inputmode="decimal"></label></div><label>Description<input id="x-n" placeholder="e.g. Fuel"></label><button onclick="addCost()">Save Expense</button></div>' +
    '<div class="c"><h3>Recent expenses</h3>' + (scopeRows(S.costs).slice(-8).reverse().map(function(c) {
      return '<div class="l"><div><b>' + esc(c.descr) + '</b><small>' + esc(c.date) + '</small></div><b>' + gh(c.amt) + '</b>' + (mayDel('costs', c) ? '<button class="s" onclick="del(\'costs\',\'' + esc(c.id) + '\')">×</button>' : '') + '</div>';
    }).join('') || '<small style="color:var(--mu)">No expenses yet.</small>') + '</div>';
  },

  prices: function() {
    if (!can('prices')) return noAccess('Farm Prices');
    return '<div class="c"><h2>Add farm price</h2><label>Farm<input id="n-f" placeholder="Farm A"></label><label>Egg size<input id="n-i" placeholder="Large"></label><div class="r"><label>Farm price<input id="n-b" type="number" inputmode="decimal"></label><label>Selling price<input id="n-s" type="number" inputmode="decimal"></label></div><button onclick="addPrice()">Add Price</button></div>' +
    '<div class="c"><h2>Price list</h2>' + (S.prices.map(function(p) {
      return '<div style="padding:10px 0;border-top:1px solid var(--bd)"><div class="l" style="border:0;padding:0"><b>' + esc(p.farm) + ' · ' + esc(p.item) + '</b>' + (mayDel('prices', p) ? '<button class="s" onclick="delP(\'' + esc(p.id) + '\')">×</button>' : '') + '</div><div class="r"><label>Farm<input type="number" inputmode="decimal" value="' + p.buy + '" onchange="upP(\'' + esc(p.id) + '\',\'buy\',this.value)"></label><label>Sell<input type="number" inputmode="decimal" value="' + p.sell + '" onchange="upP(\'' + esc(p.id) + '\',\'sell\',this.value)"></label></div></div>';
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
  var shop = $('#s-s').value;
  var avail = shopStockQty(shop, p.id);
  var q = num('#s-q');
  var stkEl = $('#s-stk');
  if (stkEl) {
    var over = q > avail;
    stkEl.className = over ? 'n' : '';
    stkEl.textContent = '📦 Available in ' + shop + ': ' + avail + ' crates' + (over ? ' (Exceeds current stock!)' : '');
  }
  var tot = q * num('#s-pr'), m = $('#s-m').value;
  $('#s-pt').hidden = m != 'p';
  $('#s-du').hidden = m == 'f';
  $('#s-tot').textContent = 'Total: ' + gh(tot);
}

// Show a phone field only when the typed name is a brand-new customer (#4)
function checkNewCust() {
  var val = ($('#s-c').value || '').trim();
  var wrap = $('#s-cp-wrap');
  if (!wrap) return;
  if (!val) { wrap.hidden = true; return; }
  var exists = S.customers.some(function(c) { return c.name.toLowerCase() === val.toLowerCase(); });
  wrap.hidden = exists;
}

function addCol() {
  if (!can('collect')) return toast('You cannot record farm pickups');
  var p = prod($('#c-p').value), q = num('#c-q'), b = num('#c-b');
  if (!p || q <= 0) return toast('Enter valid crates');
  var pd = $('#c-pd').checked;
  var paidAmt = pd ? q * b : Math.min(num('#c-pa'), q * b);
  var dateVal = $('#c-d').value || td();
  S.col.push({ id: uid(), date: dateVal, pid: p.id, lbl: p.farm + ' · ' + p.item, qty: q, buy: b, shop: $('#c-s').value, paid_amt: paidAmt, created_by: ME.id });
  var t = num('#c-t');
  if (t > 0) S.costs.push({ id: uid(), date: dateVal, descr: 'Transport: ' + p.farm, amt: t, created_by: ME.id });
  save(); toast('Saved collection'); render();
}

// Pay off (or part-pay) a farmer for an earlier unpaid collection (#1)
function payFarmer(colId, idx) {
  var c = S.col.find(function(x) { return x.id == colId; });
  if (!c) return;
  var amt = num('#fpa' + idx);
  if (amt <= 0) return toast('Enter valid payment amount');
  var totalCost = c.qty * c.buy;
  c.paid_amt = Math.min(totalCost, (c.paid_amt || 0) + amt);
  save();
  toast('Farmer payment recorded');
  render();
}

// Move crates between shops, or record breakage (#3)
function adjustStock() {
  if (!can('transfer')) return toast('You cannot adjust stock');
  var type = $('#tr-type').value;
  var p = prod($('#tr-p').value);
  var fromShop = $('#tr-from').value;
  var toShop = $('#tr-to').value;
  var q = num('#tr-q');
  if (!p || q <= 0) return toast('Enter valid crates');
  if (type === 'move' && fromShop === toShop) return toast('Select different From and To shops');

  var dateVal = td();
  var label = p.farm + ' · ' + p.item;
  // buy: 0 keeps purchase totals and profit metrics unaffected
  S.col.push({ id: uid(), date: dateVal, pid: p.id, lbl: label, qty: -q, buy: 0, shop: fromShop, paid_amt: 0 });
  if (type === 'move') {
    S.col.push({ id: uid(), date: dateVal, pid: p.id, lbl: label, qty: q, buy: 0, shop: toShop, paid_amt: 0 });
    toast('Transferred ' + q + ' crates to ' + toShop);
  } else {
    toast('Recorded ' + q + ' broken/spoiled crates');
  }
  save();
  render();
}

function addSale() {
  if (!can('sell')) return toast('You cannot record sales');
  var p = prod($('#s-p').value), q = num('#s-q'), pr = num('#s-pr');
  if (!p || q <= 0 || pr <= 0) return toast('Enter crates and price');
  var shop = $('#s-s').value;
  // hard stop: an attendant can never book a sale into another shop
  if (myShop() && shop !== ME.shop) return toast('You can only sell from ' + ME.shop);
  var m = $('#s-m').value, tot = q * pr;
  var paid = m == 'f' ? tot : m == 'c' ? 0 : Math.min(num('#s-a'), tot);
  var custInput = $('#s-c').value.trim();
  var custObj = S.customers.find(function(c) { return c.name.toLowerCase() === custInput.toLowerCase(); });

  if (m != 'f' && paid < tot && !custInput) return toast('Enter customer name for credit sale');

  // Auto-create the customer on the fly (#4)
  if (custInput && !custObj) {
    var newPhone = ($('#s-cp') ? $('#s-cp').value : '').trim();
    custObj = { id: uid(), name: custInput, phone: newPhone };
    S.customers.push(custObj);
  }

  S.sales.push({
    id: uid(),
    date: $('#s-d').value || td(),
    pid: p.id,
    lbl: p.farm + ' · ' + p.item,
    qty: q,
    price: pr,
    shop: shop,
    cust_id: custObj ? custObj.id : null,
    paid: paid,
    method: $('#s-paym').value,
    due: paid < tot ? plus(+$('#s-dd').value) : '',
    created_by: ME.id
  });
  save(); toast('Saved sale'); render();
}

function addCustomer() {
  if (!can('customer')) return toast('You cannot add customers');
  var name = $('#cu-n').value.trim(), phone = $('#cu-p').value.trim();
  if (!name) return toast('Enter customer name');
  var exists = S.customers.some(function(c) { return c.name.toLowerCase() === name.toLowerCase(); });
  if (exists) return toast('Customer already exists');
  S.customers.push({ id: uid(), name: name, phone: phone });
  save(); toast('Saved customer'); render();
}

function pay(custId, i) {
  if (!can('pay')) return toast('You cannot record payments');
  var a = num('#pa' + i);
  if (a <= 0) return toast('Enter valid amount');
  S.pay.push({ id: uid(), date: td(), cust_id: custId, amt: a });
  save(); toast('Recorded payment'); render();
}

function addCost() {
  if (!can('cost')) return toast('You cannot record expenses');
  var a = num('#x-a');
  if (a <= 0) return toast('Enter amount');
  S.costs.push({ id: uid(), date: $('#x-d').value || td(), descr: $('#x-n').value.trim() || 'Expense', amt: a, created_by: ME.id });
  save(); toast('Saved expense'); render();
}

function addPrice() {
  if (!can('prices')) return toast('You cannot change prices');
  var f = $('#n-f').value.trim(), i = $('#n-i').value.trim();
  if (!f || !i) return toast('Enter farm and egg size');
  S.prices.push({ id: uid(), farm: f, item: i, buy: num('#n-b'), sell: num('#n-s') });
  save(); toast('Added price'); render();
}

function upP(id, f, v) {
  if (!can('prices')) return toast('You cannot change prices');
  var p = prod(id);
  if (!p) return;
  p[f] = parseFloat(v) || 0;
  save();
}

function delP(id) {
  if (!can('prices')) return toast('You cannot change prices');
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
  ['prices', '<svg viewBox="0 0 24 24"><path d="M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z"/></svg>', 'Prices'],
  ['team', '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>', 'Team']
];

// Which permission each tab needs to appear in the bottom nav
var TAB_PERM = { home: 'home', collect: 'collect', sell: 'sell', credit: 'pay', costs: 'cost', prices: 'prices', team: 'team' };

// Tabs the signed-in role is allowed to see
function visibleTabs() {
  return TABS.filter(function(t) {
    var need = TAB_PERM[t[0]];
    if (!need) return true;
    if (need === 'credit') return can('pay') || can('customer');
    return can(need);
  });
}

function go(t) {
  tab = t; render(); window.scrollTo(0, 0);
}
/* ==========================================
   6.5 TEAM MANAGEMENT (CEO only)
   ========================================== */
V.team = function() {
  if (!can('team')) return noAccess('Team Management');

  var team = S.profiles || [];
  var pend = team.filter(function(p) { return p.role === 'pending'; });
  var h = '<div class="c"><h2>👥 Team Management</h2>' +
    '<p style="font-size:13px;color:var(--mu);margin:0 0 12px">You are the CEO, so you control who may sign in and what each person can do. ' +
    'New accounts appear as <b>Pending Approval</b> until you activate them.</p>' +
    '<label>Invite a staff member<input id="tm-e" type="email" placeholder="staff@example.com" style="margin-bottom:8px"></label>' +
    '<button onclick="inviteMember()">Create Login</button>' +
    '<small style="display:block;margin-top:8px;color:var(--mu)">They will receive an email to set their password, then appear below for you to approve.</small></div>';

  if (pend.length) {
    h += '<div class="c"><h2>⏳ Awaiting Approval (' + pend.length + ')</h2>' + pend.map(teamRow).join('') + '</div>';
  }

  var active = team.filter(function(p) { return p.role !== 'pending'; });
  h += '<div class="c"><h2>✅ Active Staff (' + active.length + ')</h2>' +
    (active.map(teamRow).join('') || '<small style="color:var(--mu)">No approved staff yet.</small>') + '</div>';
  return h;
};

function teamRow(p) {
  var isMe = p.id === ME.id;
  var roleOpts = Object.keys(ROLE_LABELS).map(function(r) {
    return '<option value="' + r + '"' + (r === p.role ? ' selected' : '') + '>' + ROLE_LABELS[r] + '</option>';
  }).join('');
  var shopSel = '<select id="tm-shop-' + p.id + '"' + (p.role === 'attendant' ? '' : ' disabled') + '>' +
    '<option value="">— no shop —</option>' +
    SHOPS.map(function(s) { return '<option' + (s === p.shop ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>';

  return '<div style="padding:12px 0;border-top:1px solid var(--bd)">' +
    '<div class="l" style="border:0;padding:0"><div><b>' + esc(p.name || 'Unnamed') + (isMe ? ' <small>(you)</small>' : '') +
    '<small>' + esc(p.email || '') + (p.phone ? ' · 📞 ' + esc(p.phone) : '') + '</small></div>' +
    '<span class="sync-pill ' + (p.active ? 'synced' : 'offline') + '" style="flex:none">' + (p.active ? 'Active' : 'Blocked') + '</span></div>' +
    '<div class="r" style="margin-top:8px;grid-template-columns:1fr 1fr">' +
    '<label style="margin:0">Role<select id="tm-role-' + p.id + '" onchange="toggleShopField(\'' + p.id + '\')">' + roleOpts + '</select></label>' +
    '<label style="margin:0">Shop' + shopSel + '</label></div>' +
    '<div class="r" style="margin-top:8px;grid-template-columns:1fr 1fr">' +
    '<button onclick="saveMember(\'' + p.id + '\')" style="width:auto">Save</button>' +
    (isMe ? '<button disabled style="background:var(--bd);color:var(--mu)">Cannot disable self</button>'
          : '<button onclick="toggleMember(\'' + p.id + '\', ' + (p.active ? 'false' : 'true') + ')" style="width:auto;background:' + (p.active ? 'var(--rd)' : 'var(--gb,#e5f4e8)') + ';color:' + (p.active ? '#fff' : 'var(--g)') + '">' + (p.active ? 'Block Sign-in' : 'Activate') + '</button>') +
    '</div></div>';
}

// Shop field only makes sense for attendants
function toggleShopField(id) {
  var sel = $('#tm-role-' + id);
  var shop = $('#tm-shop-' + id);
  if (sel && shop) shop.disabled = sel.value !== 'attendant';
}

async function saveMember(id) {
  if (!can('team')) return toast('Only the CEO can change roles');
  var role = $('#tm-role-' + id);
  var shop = $('#tm-shop-' + id);
  if (!role) return;
  var newRole = role.value;
  var newShop = (shop && !shop.disabled && shop.value) ? shop.value : null;
  var wasActive = (S.profiles.find(function(p) { return p.id === id; }) || {}).active;

  if (newRole === 'attendant' && !newShop) return toast('Assign a shop to attendants');
  if (id === ME.id && newRole !== 'ceo') return toast('You cannot remove your own CEO role');

  try {
    var r = await SB.rpc('set_member', { target: id, new_role: newRole, new_shop: newShop, new_active: wasActive });
    if (r.error) throw r.error;
    var rec = S.profiles.find(function(p) { return p.id === id; });
    if (rec) { rec.role = newRole; rec.shop = newShop; }
    toast('Saved ' + (ROLE_LABELS[newRole] || newRole));
    render();
  } catch (e) {
    console.error('saveMember failed:', e);
    toast(e.message || 'Could not save member');
  }
}

async function toggleMember(id, active) {
  if (!can('team')) return toast('Only the CEO can change roles');
  if (id === ME.id) return toast('You cannot block yourself');
  var rec = S.profiles.find(function(p) { return p.id === id; });
  if (!rec) return;
  try {
    var r = await SB.rpc('set_member', { target: id, new_role: rec.role, new_shop: rec.shop, new_active: !!active });
    if (r.error) throw r.error;
    rec.active = !!active;
    toast(active ? 'Sign-in enabled' : 'Sign-in blocked');
    render();
  } catch (e) {
    console.error('toggleMember failed:', e);
    toast(e.message || 'Could not update member');
  }
}

// Creates a login and emails an invite. Requires the service_role key, which a
// browser app must NOT hold — so this is a documented, explicit CEO action
// that fails cleanly with instructions if the key is absent.
async function inviteMember() {
  if (!can('team')) return toast('Only the CEO can invite staff');
  var el = $('#tm-e');
  var email = el ? el.value.trim() : '';
  if (!email) return toast('Enter an email address');
  toast('Add this user in Supabase → Authentication → Add user, then approve them here.');
  if (el) el.value = '';
}

function render() {
  var rng = wkRange(selDate || td());
  var tabs = visibleTabs();
  // never land on a tab the role cannot open
  if (!tabs.some(function(t) { return t[0] == tab; })) tab = tabs.length ? tabs[0][0] : 'home';
  $('#nv').innerHTML = tabs.map(function(t) { return '<button class="' + (t[0] == tab ? 'a' : '') + '" onclick="go(\'' + t[0] + '\')">' + t[1] + t[2] + '</button>'; }).join('');
  $('#m').innerHTML = V[tab] ? V[tab]() : '';
  $('#wk').textContent = (ROLE_LABELS[ME.role] ? ROLE_LABELS[ME.role] + ' · ' : '') + 'Week: ' + rng.start + ' – ' + rng.end;
  if (tab == 'collect') cp();
  if (tab == 'sell') sp();
}

function backup() {
  downloadFile(JSON.stringify(S, null, 2), 'application/json', 'afa-backup-' + td() + '.json');
}

// Import a previously downloaded backup (#5)
function restoreBackup(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!confirm('Restore data from backup? This will merge/update records in your database.')) {
    input.value = '';
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      for (var k in TB) {
        if (Array.isArray(data[k])) S[k] = data[k];
      }
      save();
      render();
      toast('Backup restored & syncing!');
    } catch (err) {
      toast('Invalid backup JSON file');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function exportCSV() {
  var csvCell = function(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
  var csv = 'Date,Type,Shop,Details,Qty,UnitPrice,Total,Paid\n';
  S.sales.forEach(function(s) {
    csv += [s.date, 'Sale', csvCell(s.shop), csvCell(s.lbl), s.qty, s.price, s.qty * s.price, s.paid].join(',') + '\n';
  });
  S.col.forEach(function(c) {
    csv += [c.date, c.buy > 0 ? 'Collection' : 'Stock Adjustment', csvCell(c.shop), csvCell(c.lbl), c.qty, c.buy, c.qty * c.buy, c.paid_amt || 0].join(',') + '\n';
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
    m.innerHTML = '<form class="c" onsubmit="event.preventDefault();login()"><h2>Sign in</h2>' +
      '<label>Email<input id="l-e" type="email" required autocomplete="username"></label>' +
      '<label>Password<input id="l-p" type="password" required autocomplete="current-password"></label>' +
      '<button id="l-btn" type="submit">Sign in</button>' +
      '<p style="font-size:13px;color:var(--mu);margin:12px 0 0">Staff accounts are created by the CEO. Ask for your login if you do not have one.</p></form>';
  }
}

// Shown when a signed-in user has no active role yet
function pendingView() {
  var nv = $('#nv');
  var m = $('#m');
  setSyncStatus('', '');
  $('#wk').textContent = 'Awaiting approval';
  if (nv) nv.innerHTML = '';
  if (m) {
    m.innerHTML = '<div class="c"><h2>⏳ Awaiting Approval</h2>' +
      '<p style="font-size:14px;color:var(--mu);margin:0 0 6px">You are signed in as <b>' + esc(ME.email) + '</b>, but no role has been assigned to this account yet.</p>' +
      '<p style="font-size:14px;color:var(--mu);margin:0 0 16px">The CEO must approve your account from the <b>Team</b> screen before you can use the app.</p>' +
      '<button onclick="recheckAccess()">Check Again</button>' +
      '<button onclick="logout()" style="background:var(--bd);color:var(--tx);margin-top:10px">Sign Out</button></div>';
  }
}

async function recheckAccess() {
  toast('Checking access...');
  await enterApp();
}

// Loads the profile, then either opens the app or shows the waiting screen
async function enterApp() {
  await loadMe();
  if (!ME.id) { loginView(); return false; }
  if (!ME.active || !can('home')) {
    await loadTeam();
    pendingView();
    return false;
  }
  await load();
  await loadTeam();
  if (!visibleTabs().some(function(t) { return t[0] == tab; })) tab = 'home';
  render();
  return true;
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
    await enterApp();
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
  } catch (err) {
    console.error('Login exception:', err);
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
    toast(err.message || 'Network error while signing in');
  }
}

async function logout() {
  await SB.auth.signOut();
  localStorage.removeItem('afa_cache');
  ME = { id: '', email: '', name: '', phone: '', role: 'pending', shop: '', active: false };
  S.profiles = [];
  tab = 'home';
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
      await enterApp();
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

