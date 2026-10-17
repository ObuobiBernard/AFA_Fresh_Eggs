import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserProfile,
  Role,
  AppStateData,
  TableKey,
  TabKey,
  PriceItem,
  CollectionItem,
  SaleItem,
  PaymentItem,
  CostItem,
  CustomerItem,
  MemberProfile
} from '../types';
import {
  PERMS,
  ROLE_LABELS,
  SHOPS,
  SB_URL,
  SB_KEY,
  TB_MAP,
  EMPTY_USER,
  EMPTY_APP_STATE,
  INACTIVITY_TIMEOUT_MS,
  td,
  plus,
  uid,
  wkRange,
  gh,
  sum,
  formatPhone,
  downloadFile
} from '../constants';

interface DebtRecord {
  id: string;
  name: string;
  bal: number;
  due: string;
}

interface AppContextValue {
  me: UserProfile;
  appState: AppStateData;
  tab: TabKey;
  setTab: (t: TabKey) => void;
  selDate: string;
  setWeekDate: (d: string) => void;
  shiftWeek: (days: number) => void;
  syncStatus: 'synced' | 'saving' | 'offline';
  syncText: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  toastMsg: string | null;
  toast: (msg: string) => void;
  showSplash: boolean;
  setShowSplash: (show: boolean) => void;
  // Permissions & helpers
  can: (k: string) => boolean;
  myShop: () => string;
  shopsFor: () => string[];
  scopeRows: <T extends Record<string, any>>(rows: T[]) => T[];
  mayDel: (table: TableKey, row: any) => boolean;
  stock: () => { m: Record<string, number>; L: Record<string, string> };
  shopStockQty: (shop: string, pid: string) => number;
  debts: () => DebtRecord[];
  // Actions
  addCol: (data: { pid: string; qty: number; buy: number; shop: string; date?: string; paidAmt: number; transport: number }) => boolean;
  payFarmer: (colId: string, amt: number) => void;
  adjustStock: (data: { type: 'move' | 'loss'; pid: string; fromShop: string; toShop: string; qty: number }) => boolean;
  addSale: (data: { date?: string; pid: string; qty: number; price: number; shop: string; custName: string; custPhone?: string; method: string; payStatus: 'f' | 'p' | 'c'; paidAmt: number; dueDays: number }) => boolean;
  addCustomer: (name: string, phone: string) => boolean;
  payDebt: (custId: string, amt: number) => void;
  addCost: (date: string, descr: string, amt: number) => boolean;
  addPrice: (farm: string, item: string, buy: number, sell: number) => boolean;
  updatePrice: (id: string, field: 'buy' | 'sell', val: number) => void;
  delPrice: (id: string) => void;
  delItem: (table: TableKey, id: string) => void;
  saveMember: (id: string, newRole: Role, newShop: string | null) => Promise<void>;
  toggleMember: (id: string, active: boolean) => Promise<void>;
  inviteMember: (email: string) => void;
  backupJSON: () => void;
  restoreBackupJSON: (file: File) => void;
  exportCSV: () => void;
  loginWithSupabase: (email: string, pass: string) => Promise<{ error?: string }>;
  logout: (dueToInactivity?: boolean) => Promise<void>;
  recheckAccess: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

let sbClient: SupabaseClient | null = null;
try {
  sbClient = createClient(SB_URL, SB_KEY);
} catch (e) {
  console.warn('Supabase client failed to initialize:', e);
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [me, setMe] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('afa_me');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && !String(parsed.id).startsWith('demo-')) {
          return parsed;
        }
      }
    } catch {}
    return EMPTY_USER;
  });

  const [appState, setAppState] = useState<AppStateData>(() => {
    try {
      const cached = localStorage.getItem('afa_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Clean out any legacy demo artifacts
        if (parsed && Array.isArray(parsed.prices) && parsed.prices.some((p: any) => p.id === 'p1')) {
          localStorage.removeItem('afa_cache');
          return EMPTY_APP_STATE;
        }
        return {
          prices: parsed.prices || [],
          col: parsed.col || [],
          sales: parsed.sales || [],
          pay: parsed.pay || [],
          costs: parsed.costs || [],
          customers: parsed.customers || [],
          profiles: parsed.profiles || []
        };
      }
    } catch {}
    return EMPTY_APP_STATE;
  });

  const [tab, setTab] = useState<TabKey>('home');
  const [selDate, setSelDate] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [syncText, setSyncText] = useState<string>('Synced');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [lastActivity, setLastActivity] = useState<number>(() => Date.now());

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('afa_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('afa_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Save to localStorage & Supabase
  const persistState = useCallback(async (newState: AppStateData) => {
    try {
      localStorage.setItem('afa_cache', JSON.stringify(newState));
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }

    if (!sbClient || !navigator.onLine) {
      setSyncStatus('offline');
      setSyncText('Offline Mode');
      return;
    }

    setSyncStatus('saving');
    setSyncText('Saving...');

    try {
      const promises = Object.entries(TB_MAP).map(async ([stateKey, tableName]) => {
        const rows = (newState as any)[stateKey];
        if (Array.isArray(rows) && rows.length > 0) {
          const { error } = await sbClient!.from(tableName).upsert(rows);
          if (error) console.warn(`Supabase upsert for ${tableName} had notice:`, error.message);
        }
      });
      await Promise.allSettled(promises);
      setSyncStatus('synced');
      setSyncText('Synced');
    } catch (e) {
      setSyncStatus('offline');
      setSyncText('Saved Locally');
    }
  }, []);

  // State mutation helper
  const updateState = useCallback((updater: (prev: AppStateData) => AppStateData) => {
    setAppState(prev => {
      const next = updater(prev);
      persistState(next);
      return next;
    });
  }, [persistState]);

  // Load data from Supabase
  const loadRemoteData = useCallback(async (forcedRole?: string) => {
    if (!sbClient || !navigator.onLine) return;
    try {
      setSyncStatus('saving');
      setSyncText('Loading...');
      const updated: Partial<AppStateData> = {};
      for (const [k, tbl] of Object.entries(TB_MAP)) {
        const { data, error } = await sbClient.from(tbl).select('*');
        if (!error && data) {
          (updated as any)[k] = data.map(item => {
            const clean = { ...item };
            delete clean.created_at;
            return clean;
          });
        }
      }

      // If user is CEO, also load profiles table
      const activeRole = forcedRole || me.role;
      if (activeRole === 'ceo') {
        const { data: teamData, error: teamErr } = await sbClient
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true });
        if (!teamErr && teamData) {
          updated.profiles = teamData;
        }
      }

      setAppState(prev => {
        const next = { ...prev, ...updated };
        try { localStorage.setItem('afa_cache', JSON.stringify(next)); } catch {}
        return next;
      });
      setSyncStatus('synced');
      setSyncText('Synced');
    } catch (err) {
      setSyncStatus('offline');
      setSyncText('Offline Mode');
    }
  }, [me.role]);

  // Check Supabase session and load remote data on mount
  useEffect(() => {
    async function initSessionAndData() {
      if (!sbClient) return;

      let detectedRole = me.role;
      try {
        const { data: sessionData } = await sbClient.auth.getSession();
        if (sessionData?.session?.user) {
          const usr = sessionData.session.user;
          const userProf: UserProfile = {
            id: usr.id,
            email: usr.email || '',
            name: usr.user_metadata?.name || usr.email?.split('@')[0] || 'User',
            phone: usr.user_metadata?.phone || '',
            role: 'pending',
            shop: '',
            active: false
          };

          const { data: prof } = await sbClient.from('profiles').select('*').eq('id', usr.id).maybeSingle();
          if (prof) {
            userProf.role = prof.role || 'pending';
            userProf.shop = prof.shop || '';
            userProf.active = !!prof.active;
            userProf.name = prof.name || userProf.name;
            userProf.phone = prof.phone || userProf.phone;
          }
          detectedRole = userProf.role;
          setMe(userProf);
          localStorage.setItem('afa_me', JSON.stringify(userProf));
        }
      } catch (err) {
        console.warn('Session verification notice:', err);
      }

      await loadRemoteData(detectedRole);
    }

    initSessionAndData();
  }, [loadRemoteData]);

  // Sync with Supabase when internet connectivity returns
  useEffect(() => {
    const handleOnline = () => {
      if (sbClient) {
        loadRemoteData();
        persistState(appState);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadRemoteData, persistState, appState]);

  // Logout handler
  const logout = useCallback(async (dueToInactivity: boolean = false) => {
    if (sbClient) {
      try { await sbClient.auth.signOut(); } catch {}
    }
    setMe(EMPTY_USER);
    localStorage.removeItem('afa_me');
    setTab('home');
    setShowSplash(true);
    if (dueToInactivity) {
      toast('Logged out due to inactivity.');
    } else {
      toast('Signed out');
    }
  }, [toast]);

  // Activity tracking for auto-logout
  const recordActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  useEffect(() => {
    if (!me.id || !me.active) return;

    let throttleTimer: any = null;
    const onUserAction = () => {
      if (!throttleTimer) {
        recordActivity();
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 3000);
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(ev => window.addEventListener(ev, onUserAction, { passive: true }));

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      events.forEach(ev => window.removeEventListener(ev, onUserAction));
    };
  }, [me.id, me.active, recordActivity]);

  // Periodic inactivity check and visibility/focus check
  useEffect(() => {
    if (!me.id || !me.active) return;

    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActivity >= INACTIVITY_TIMEOUT_MS) {
        logout(true);
      }
    };

    const interval = setInterval(checkInactivity, 10000); // Check every 10 seconds

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [me.id, me.active, lastActivity, logout]);

  // Permissions
  const can = useCallback((k: string) => {
    const rolePerms = PERMS[me.role];
    if (!rolePerms) return false;
    return !!(rolePerms as any)[k];
  }, [me.role]);

  const myShop = useCallback(() => {
    return me.role === 'attendant' ? me.shop : '';
  }, [me.role, me.shop]);

  const shopsFor = useCallback(() => {
    const rolePerms = PERMS[me.role];
    if (rolePerms && rolePerms.viewShops) return rolePerms.viewShops;
    return me.shop ? [me.shop] : [...SHOPS];
  }, [me.role, me.shop]);

  const scopeRows = useCallback(<T extends Record<string, any>>(rows: T[]): T[] => {
    const s = myShop();
    if (!s) return rows;
    return rows.filter(r => !r.shop || r.shop === s);
  }, [myShop]);

  const mayDel = useCallback((table: TableKey, row: any) => {
    if (can('del')) return true;
    return !!(can('delOwn') && table === 'sales' && row && row.created_by === me.id);
  }, [can, me.id]);

  // Calculations
  const stock = useCallback(() => {
    const m: Record<string, number> = {};
    const L: Record<string, string> = {};
    appState.prices.forEach(p => {
      L[p.id] = `${p.farm} · ${p.item}`;
    });
    scopeRows(appState.col).forEach(c => {
      const k = `${c.shop}|${c.pid}`;
      m[k] = (m[k] || 0) + c.qty;
      if (c.lbl) L[c.pid] = c.lbl;
    });
    scopeRows(appState.sales).forEach(s => {
      const k = `${s.shop}|${s.pid}`;
      m[k] = (m[k] || 0) - s.qty;
      if (s.lbl) L[s.pid] = s.lbl;
    });
    return { m, L };
  }, [appState.prices, appState.col, appState.sales, scopeRows]);

  const shopStockQty = useCallback((shop: string, pid: string) => {
    const st = stock();
    return Math.round((st.m[`${shop}|${pid}`] || 0) * 100) / 100;
  }, [stock]);

  const debts = useCallback((): DebtRecord[] => {
    const m: Record<string, { id: string; l: { o: number; due: string }[]; p: number }> = {};
    
    [...appState.sales]
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .forEach(s => {
        if (!s.cust_id) return;
        const o = s.qty * s.price - s.paid;
        if (!m[s.cust_id]) m[s.cust_id] = { id: s.cust_id, l: [], p: 0 };
        if (o > 0.005) {
          m[s.cust_id].l.push({ o, due: s.due || s.date });
        }
      });

    appState.pay.forEach(p => {
      if (!p.cust_id) return;
      if (!m[p.cust_id]) m[p.cust_id] = { id: p.cust_id, l: [], p: 0 };
      m[p.cust_id].p += p.amt;
    });

    return Object.values(m)
      .map(c => {
        let p = c.p;
        c.l.forEach(x => {
          const t = Math.min(x.o, p);
          x.o -= t;
          p -= t;
        });
        const o = c.l.filter(x => x.o > 0.005);
        const custObj = appState.customers.find(cu => cu.id === c.id);
        return {
          id: c.id,
          name: custObj ? custObj.name : 'Unknown',
          bal: sum(o, x => x.o),
          due: o.length ? o.map(x => x.due).sort()[0] : ''
        };
      })
      .filter(c => c.bal > 0.005);
  }, [appState.sales, appState.pay, appState.customers]);

  // Actions
  const addCol = useCallback((data: { pid: string; qty: number; buy: number; shop: string; date?: string; paidAmt: number; transport: number }) => {
    if (!can('collect')) {
      toast('You cannot record farm pickups');
      return false;
    }
    const p = appState.prices.find(pr => pr.id === data.pid);
    if (!p || data.qty <= 0) {
      toast('Enter valid crates');
      return false;
    }

    const dateVal = data.date || td();
    const newCol: CollectionItem = {
      id: uid(),
      date: dateVal,
      pid: p.id,
      lbl: `${p.farm} · ${p.item}`,
      qty: data.qty,
      buy: data.buy,
      shop: data.shop,
      paid_amt: data.paidAmt,
      created_by: me.id
    };

    updateState(prev => {
      const costs = [...prev.costs];
      if (data.transport > 0) {
        costs.push({
          id: uid(),
          date: dateVal,
          descr: `Transport: ${p.farm}`,
          amt: data.transport,
          created_by: me.id
        });
      }
      return {
        ...prev,
        col: [...prev.col, newCol],
        costs
      };
    });

    toast('Saved collection');
    return true;
  }, [can, appState.prices, me.id, updateState, toast]);

  const payFarmer = useCallback((colId: string, amt: number) => {
    if (amt <= 0) {
      toast('Enter valid payment amount');
      return;
    }
    updateState(prev => {
      const col = prev.col.map(c => {
        if (c.id !== colId) return c;
        const total = c.qty * c.buy;
        const newPaid = Math.min(total, (c.paid_amt || 0) + amt);
        return { ...c, paid_amt: newPaid };
      });
      return { ...prev, col };
    });
    toast('Farmer payment recorded');
  }, [updateState, toast]);

  const adjustStock = useCallback((data: { type: 'move' | 'loss'; pid: string; fromShop: string; toShop: string; qty: number }) => {
    if (!can('transfer')) {
      toast('You cannot adjust stock');
      return false;
    }
    const p = appState.prices.find(pr => pr.id === data.pid);
    if (!p || data.qty <= 0) {
      toast('Enter valid crates');
      return false;
    }
    if (data.type === 'move' && data.fromShop === data.toShop) {
      toast('Select different From and To shops');
      return false;
    }

    const dateVal = td();
    const label = `${p.farm} · ${p.item}`;
    const deductions: CollectionItem[] = [
      {
        id: uid(),
        date: dateVal,
        pid: p.id,
        lbl: label,
        qty: -data.qty,
        buy: 0,
        shop: data.fromShop,
        paid_amt: 0
      }
    ];

    if (data.type === 'move') {
      deductions.push({
        id: uid(),
        date: dateVal,
        pid: p.id,
        lbl: label,
        qty: data.qty,
        buy: 0,
        shop: data.toShop,
        paid_amt: 0
      });
    }

    updateState(prev => ({
      ...prev,
      col: [...prev.col, ...deductions]
    }));

    toast(data.type === 'move' ? `Transferred ${data.qty} crates to ${data.toShop}` : `Recorded ${data.qty} broken/spoiled crates`);
    return true;
  }, [can, appState.prices, updateState, toast]);

  const addSale = useCallback((data: {
    date?: string;
    pid: string;
    qty: number;
    price: number;
    shop: string;
    custName: string;
    custPhone?: string;
    method: string;
    payStatus: 'f' | 'p' | 'c';
    paidAmt: number;
    dueDays: number;
  }) => {
    if (!can('sell')) {
      toast('You cannot record sales');
      return false;
    }
    const p = appState.prices.find(pr => pr.id === data.pid);
    if (!p || data.qty <= 0 || data.price <= 0) {
      toast('Enter crates and price');
      return false;
    }

    const currentShop = data.shop;
    if (myShop() && currentShop !== me.shop) {
      toast(`You can only sell from ${me.shop}`);
      return false;
    }

    const total = data.qty * data.price;
    const paid = data.payStatus === 'f' ? total : data.payStatus === 'c' ? 0 : Math.min(data.paidAmt, total);

    const custInput = (data.custName || '').trim();
    if (data.payStatus !== 'f' && paid < total && !custInput) {
      toast('Enter customer name for credit sale');
      return false;
    }

    updateState(prev => {
      let custObj = prev.customers.find(c => c.name.toLowerCase() === custInput.toLowerCase());
      const customers = [...prev.customers];

      if (custInput && !custObj) {
        custObj = {
          id: uid(),
          name: custInput,
          phone: (data.custPhone || '').trim()
        };
        customers.push(custObj);
      }

      const newSale: SaleItem = {
        id: uid(),
        date: data.date || td(),
        pid: p.id,
        lbl: `${p.farm} · ${p.item}`,
        qty: data.qty,
        price: data.price,
        shop: currentShop,
        cust_id: custObj ? custObj.id : null,
        paid,
        method: data.method,
        due: paid < total ? plus(data.dueDays || 7) : '',
        created_by: me.id
      };

      return {
        ...prev,
        customers,
        sales: [...prev.sales, newSale]
      };
    });

    toast('Saved sale');
    return true;
  }, [can, appState.prices, myShop, me.shop, me.id, updateState, toast]);

  const addCustomer = useCallback((name: string, phone: string) => {
    if (!can('customer')) {
      toast('You cannot add customers');
      return false;
    }
    const cleanName = name.trim();
    if (!cleanName) {
      toast('Enter customer name');
      return false;
    }
    const exists = appState.customers.some(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      toast('Customer already exists');
      return false;
    }

    const newCust: CustomerItem = {
      id: uid(),
      name: cleanName,
      phone: phone.trim()
    };

    updateState(prev => ({
      ...prev,
      customers: [...prev.customers, newCust]
    }));

    toast('Saved customer');
    return true;
  }, [can, appState.customers, updateState, toast]);

  const payDebt = useCallback((custId: string, amt: number) => {
    if (!can('pay')) {
      toast('You cannot record payments');
      return;
    }
    if (amt <= 0) {
      toast('Enter valid amount');
      return;
    }
    const newPay: PaymentItem = {
      id: uid(),
      date: td(),
      cust_id: custId,
      amt
    };
    updateState(prev => ({
      ...prev,
      pay: [...prev.pay, newPay]
    }));
    toast('Recorded payment');
  }, [can, updateState, toast]);

  const addCost = useCallback((date: string, descr: string, amt: number) => {
    if (!can('cost')) {
      toast('You cannot record expenses');
      return false;
    }
    if (amt <= 0) {
      toast('Enter amount');
      return false;
    }
    const newCost: CostItem = {
      id: uid(),
      date: date || td(),
      descr: descr.trim() || 'Expense',
      amt,
      created_by: me.id
    };
    updateState(prev => ({
      ...prev,
      costs: [...prev.costs, newCost]
    }));
    toast('Saved expense');
    return true;
  }, [can, me.id, updateState, toast]);

  const addPrice = useCallback((farm: string, item: string, buy: number, sell: number) => {
    if (!can('prices')) {
      toast('You cannot change prices');
      return false;
    }
    const f = farm.trim();
    const i = item.trim();
    if (!f || !i) {
      toast('Enter farm and egg size');
      return false;
    }
    const newPrice: PriceItem = {
      id: uid(),
      farm: f,
      item: i,
      buy,
      sell
    };
    updateState(prev => ({
      ...prev,
      prices: [...prev.prices, newPrice]
    }));
    toast('Added price');
    return true;
  }, [can, updateState, toast]);

  const updatePrice = useCallback((id: string, field: 'buy' | 'sell', val: number) => {
    if (!can('prices')) {
      toast('You cannot change prices');
      return;
    }
    updateState(prev => ({
      ...prev,
      prices: prev.prices.map(p => (p.id === id ? { ...p, [field]: Number(val) || 0 } : p))
    }));
  }, [can, updateState, toast]);

  const delPrice = useCallback((id: string) => {
    if (!can('prices')) {
      toast('You cannot change prices');
      return;
    }
    if (!window.confirm('Delete price?')) return;
    updateState(prev => ({
      ...prev,
      prices: prev.prices.filter(p => p.id !== id)
    }));
    toast('Price removed');
  }, [can, updateState, toast]);

  const delItem = useCallback((table: TableKey, id: string) => {
    const row = (appState as any)[table]?.find((x: any) => x.id === id);
    if (!row) return;
    if (!mayDel(table, row)) {
      toast('You do not have permission to delete this');
      return;
    }
    if (!window.confirm('Delete this entry?')) return;

    updateState(prev => ({
      ...prev,
      [table]: (prev as any)[table].filter((x: any) => x.id !== id)
    }));

    if (sbClient && navigator.onLine) {
      const tblName = TB_MAP[table];
      if (tblName) {
        sbClient.from(tblName).delete().eq('id', id).then(undefined, console.warn);
      }
    }
    toast('Deleted entry');
  }, [appState, mayDel, updateState, toast]);

  const saveMember = useCallback(async (id: string, newRole: Role, newShop: string | null) => {
    if (!can('team')) {
      toast('Only the CEO can change roles');
      return;
    }
    if (newRole === 'attendant' && !newShop) {
      toast('Assign a shop to attendants');
      return;
    }
    if (id === me.id && newRole !== 'ceo') {
      toast('You cannot remove your own CEO role');
      return;
    }

    try {
      if (sbClient && navigator.onLine) {
        await sbClient.rpc('set_member', { target: id, new_role: newRole, new_shop: newShop, new_active: true });
      }
    } catch (e: any) {
      console.warn('Remote set_member notice:', e);
    }

    updateState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => (p.id === id ? { ...p, role: newRole, shop: newShop } : p))
    }));
    toast(`Saved ${ROLE_LABELS[newRole] || newRole}`);
  }, [can, me.id, updateState, toast]);

  const toggleMember = useCallback(async (id: string, active: boolean) => {
    if (!can('team')) {
      toast('Only the CEO can change roles');
      return;
    }
    if (id === me.id) {
      toast('You cannot block yourself');
      return;
    }

    try {
      if (sbClient && navigator.onLine) {
        const rec = appState.profiles.find(p => p.id === id);
        if (rec) {
          await sbClient.rpc('set_member', { target: id, new_role: rec.role, new_shop: rec.shop, new_active: active });
        }
      }
    } catch (e: any) {
      console.warn('Remote toggle notice:', e);
    }

    updateState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => (p.id === id ? { ...p, active } : p))
    }));
    toast(active ? 'Sign-in enabled' : 'Sign-in blocked');
  }, [can, me.id, appState.profiles, updateState, toast]);

  const inviteMember = useCallback((email: string) => {
    if (!can('team')) {
      toast('Only the CEO can invite staff');
      return;
    }
    const clean = email.trim();
    if (!clean) {
      toast('Enter an email address');
      return;
    }
    const newProf: MemberProfile = {
      id: uid(),
      email: clean,
      name: clean.split('@')[0],
      role: 'pending',
      shop: null,
      active: false
    };
    updateState(prev => ({
      ...prev,
      profiles: [...prev.profiles, newProf]
    }));
    toast('Added staff member. They can now be approved below.');
  }, [can, updateState, toast]);

  const backupJSON = useCallback(() => {
    downloadFile(JSON.stringify(appState, null, 2), 'application/json', `afa-backup-${td()}.json`);
    toast('Backup downloaded');
  }, [appState, toast]);

  const restoreBackupJSON = useCallback((file: File) => {
    if (!window.confirm('Restore data from backup? This will merge/update records in your database.')) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        updateState(prev => {
          const next = { ...prev };
          for (const k of ['prices', 'col', 'sales', 'pay', 'costs', 'customers'] as TableKey[]) {
            if (Array.isArray(data[k])) {
              (next as any)[k] = data[k];
            }
          }
          return next;
        });
        toast('Backup restored & syncing!');
      } catch (err) {
        toast('Invalid backup JSON file');
      }
    };
    reader.readAsText(file);
  }, [updateState, toast]);

  const exportCSV = useCallback(() => {
    const csvCell = (v: any) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    let csv = 'Date,Type,Shop,Details,Qty,UnitPrice,Total,Paid\n';
    appState.sales.forEach(s => {
      csv += [s.date, 'Sale', csvCell(s.shop), csvCell(s.lbl), s.qty, s.price, s.qty * s.price, s.paid].join(',') + '\n';
    });
    appState.col.forEach(c => {
      csv += [c.date, c.buy > 0 ? 'Collection' : 'Stock Adjustment', csvCell(c.shop), csvCell(c.lbl), c.qty, c.buy, c.qty * c.buy, c.paid_amt || 0].join(',') + '\n';
    });
    appState.costs.forEach(x => {
      csv += [x.date, 'Expense', '', csvCell(x.descr), 1, x.amt, x.amt, x.amt].join(',') + '\n';
    });
    downloadFile(csv, 'text/csv;charset=utf-8;', `afa-records-${td()}.csv`);
    toast('CSV exported');
  }, [appState, toast]);

  const loginWithSupabase = useCallback(async (email: string, pass: string) => {
    if (!sbClient) {
      return { error: 'Supabase client not initialized' };
    }
    try {
      const { data, error } = await sbClient.auth.signInWithPassword({ email, password: pass });
      if (error) return { error: error.message };
      if (data.user) {
        const userProf: UserProfile = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          phone: data.user.user_metadata?.phone || '',
          role: 'pending',
          shop: '',
          active: false
        };
        const { data: prof } = await sbClient.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
        if (prof) {
          userProf.role = prof.role || 'pending';
          userProf.shop = prof.shop || '';
          userProf.active = !!prof.active;
          userProf.name = prof.name || userProf.name;
          userProf.phone = prof.phone || userProf.phone;
        }
        setMe(userProf);
        localStorage.setItem('afa_me', JSON.stringify(userProf));
        await loadRemoteData(userProf.role);
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  }, [loadRemoteData]);

  const recheckAccess = useCallback(async () => {
    toast('Checking access...');
    if (sbClient && me.id) {
      try {
        const { data: prof } = await sbClient.from('profiles').select('*').eq('id', me.id).maybeSingle();
        if (prof && prof.active && prof.role !== 'pending') {
          const updated = {
            ...me,
            role: prof.role,
            shop: prof.shop || '',
            active: true
          };
          setMe(updated);
          localStorage.setItem('afa_me', JSON.stringify(updated));
          await loadRemoteData(prof.role);
          toast('Access granted!');
          return;
        }
      } catch {}
    }
    const prof = appState.profiles.find(p => p.id === me.id || p.email === me.email);
    if (prof && prof.active && prof.role !== 'pending') {
      const updated = {
        ...me,
        role: prof.role,
        shop: prof.shop || '',
        active: true
      };
      setMe(updated);
      localStorage.setItem('afa_me', JSON.stringify(updated));
      await loadRemoteData(prof.role);
      toast('Access granted!');
    } else {
      toast('Still awaiting approval from CEO');
    }
  }, [appState.profiles, me, loadRemoteData, toast]);

  const shiftWeek = useCallback((days: number) => {
    const d = new Date(selDate || td());
    d.setDate(d.getDate() + days);
    setSelDate(d.toISOString().split('T')[0]);
  }, [selDate]);

  const value = useMemo<AppContextValue>(() => ({
    me,
    appState,
    tab,
    setTab,
    selDate,
    setWeekDate: setSelDate,
    shiftWeek,
    syncStatus,
    syncText,
    theme,
    toggleTheme,
    toastMsg,
    toast,
    showSplash,
    setShowSplash,
    can,
    myShop,
    shopsFor,
    scopeRows,
    mayDel,
    stock,
    shopStockQty,
    debts,
    addCol,
    payFarmer,
    adjustStock,
    addSale,
    addCustomer,
    payDebt,
    addCost,
    addPrice,
    updatePrice,
    delPrice,
    delItem,
    saveMember,
    toggleMember,
    inviteMember,
    backupJSON,
    restoreBackupJSON,
    exportCSV,
    loginWithSupabase,
    logout,
    recheckAccess
  }), [
    me,
    appState,
    tab,
    selDate,
    shiftWeek,
    syncStatus,
    syncText,
    theme,
    toggleTheme,
    toastMsg,
    toast,
    showSplash,
    can,
    myShop,
    shopsFor,
    scopeRows,
    mayDel,
    stock,
    shopStockQty,
    debts,
    addCol,
    payFarmer,
    adjustStock,
    addSale,
    addCustomer,
    payDebt,
    addCost,
    addPrice,
    updatePrice,
    delPrice,
    delItem,
    saveMember,
    toggleMember,
    inviteMember,
    backupJSON,
    restoreBackupJSON,
    exportCSV,
    loginWithSupabase,
    logout,
    recheckAccess
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
