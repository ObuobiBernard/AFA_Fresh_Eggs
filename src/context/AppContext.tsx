import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserProfile,
  AppStateData,
  Role,
  TabKey,
  TableKey,
  MemberProfile,
  CustomerItem,
  SaleItem,
  CollectionItem,
  CostItem,
  PriceItem,
  PaymentItem
} from '../types';
import {
  PERMS,
  SHOPS,
  TB_MAP,
  SB_URL,
  SB_KEY,
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
  downloadFile,
  sanitizeText,
  parseDate,
  localDateStr
} from '../constants';
import { LegalTab } from '../components/LegalCenterModal';

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
  setSelDate: (d: string) => void;
  shiftWeek: (offsetDays: number) => void;
  syncStatus: 'synced' | 'saving' | 'offline';
  syncText: string;
  toastMsg: string | null;
  toast: (msg: string) => void;
  showSplash: boolean;
  setShowSplash: (s: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  legalTab: LegalTab | null;
  openLegal: (tab?: LegalTab) => void;
  closeLegal: () => void;
  // Permissions & Scoping
  can: (action: keyof typeof PERMS['ceo']) => boolean;
  myShop: () => string;
  shopsFor: () => string[];
  scopeRows: <T extends { shop?: string }>(rows: T[]) => T[];
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
  updateCustomer: (id: string, data: { name: string; phone: string }) => boolean;
  payDebt: (custId: string, amt: number) => void;
  addCost: (date: string, descr: string, amt: number) => boolean;
  addPrice: (farm: string, item: string, buy: number, sell: number) => boolean;
  updatePrice: (id: string, field: 'buy' | 'sell', val: number) => void;
  delPrice: (id: string) => void;
  delItem: (table: TableKey, id: string) => void;
  saveMember: (id: string, newRole: Role, newShop: string | null) => Promise<void>;
  toggleMember: (id: string, active: boolean) => Promise<void>;
  inviteMember: (email: string, role: Role, shop: string | null, name?: string) => Promise<void>;
  backupJSON: () => void;
  restoreBackupJSON: (jsonStr: string) => void;
  exportCSV: () => void;
  loginWithSupabase: (email: string, pass: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  recheckAccess: () => Promise<void>;
  forceSync: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

let sbClient: SupabaseClient | null = null;
try {
  sbClient = createClient(SB_URL, SB_KEY);
} catch (e) {
  console.warn('Supabase client failed to initialize:', e);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanUUID(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = String(val).trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export function deduplicateAppState(state: AppStateData): { cleaned: AppStateData; removedIdsByTable: Record<string, string[]> } {
  const removedIdsByTable: Record<string, string[]> = {
    customers: [],
    costs: [],
    prices: [],
    sales: [],
    col: [],
    pay: []
  };

  // 1. Deduplicate Customers by normalized Name AND normalized Phone
  const seenCustNames = new Map<string, string>();
  const seenCustPhones = new Map<string, string>();
  const idToCanonicalMap = new Map<string, string>();
  const uniqueCustomers: CustomerItem[] = [];

  for (const c of state.customers || []) {
    const normName = (c.name || '').trim().toLowerCase();
    const rawPhone = (c.phone || '').trim();
    const normPhone = rawPhone ? formatPhone(rawPhone) : '';

    const existingCanonicalId =
      (normName ? seenCustNames.get(normName) : undefined) ||
      (normPhone ? seenCustPhones.get(normPhone) : undefined);

    if (existingCanonicalId) {
      idToCanonicalMap.set(c.id, existingCanonicalId);
      removedIdsByTable.customers.push(c.id);
    } else {
      if (normName) seenCustNames.set(normName, c.id);
      if (normPhone) seenCustPhones.set(normPhone, c.id);
      idToCanonicalMap.set(c.id, c.id);
      uniqueCustomers.push(c);
    }
  }

  // Remap sales and payments pointing to merged customer IDs
  const remappedSales = (state.sales || []).map(s => {
    if (s.cust_id && idToCanonicalMap.has(s.cust_id)) {
      return { ...s, cust_id: idToCanonicalMap.get(s.cust_id)! };
    }
    return s;
  });

  const remappedPay = (state.pay || []).map(p => {
    if (p.cust_id && idToCanonicalMap.has(p.cust_id)) {
      return { ...p, cust_id: idToCanonicalMap.get(p.cust_id)! };
    }
    return p;
  });

  // 2. Deduplicate Costs by date + normalized description + amount
  const seenCostKeys = new Set<string>();
  const uniqueCosts: CostItem[] = [];
  for (const cost of state.costs || []) {
    const key = `${cost.date}::${(cost.descr || '').trim().toLowerCase()}::${Math.round(Number(cost.amt) * 100)}`;
    if (seenCostKeys.has(key)) {
      removedIdsByTable.costs.push(cost.id);
    } else {
      seenCostKeys.add(key);
      uniqueCosts.push(cost);
    }
  }

  // 3. Deduplicate Prices by farm + egg size
  const seenPriceKeys = new Set<string>();
  const uniquePrices: PriceItem[] = [];
  for (const pr of state.prices || []) {
    const key = `${(pr.farm || '').trim().toLowerCase()}::${(pr.item || '').trim().toLowerCase()}`;
    if (seenPriceKeys.has(key)) {
      removedIdsByTable.prices.push(pr.id);
    } else {
      seenPriceKeys.add(key);
      uniquePrices.push(pr);
    }
  }

  // 4. Deduplicate Collections if identical
  const seenColKeys = new Set<string>();
  const uniqueCol: CollectionItem[] = [];
  for (const c of state.col || []) {
    const key = `${c.date}::${c.pid}::${c.qty}::${(c.shop || '').trim().toLowerCase()}::${c.paid_amt}::${c.buy}`;
    if (seenColKeys.has(key)) {
      removedIdsByTable.col.push(c.id);
    } else {
      seenColKeys.add(key);
      uniqueCol.push(c);
    }
  }

  // 5. Deduplicate identical sales
  const seenSaleKeys = new Set<string>();
  const uniqueSales: SaleItem[] = [];
  for (const s of remappedSales) {
    const key = `${s.date}::${s.pid}::${s.qty}::${s.price}::${(s.shop || '').trim().toLowerCase()}::${s.cust_id || ''}::${s.paid}::${s.created_by}`;
    if (seenSaleKeys.has(key)) {
      removedIdsByTable.sales.push(s.id);
    } else {
      seenSaleKeys.add(key);
      uniqueSales.push(s);
    }
  }

  return {
    cleaned: {
      ...state,
      customers: uniqueCustomers,
      costs: uniqueCosts,
      prices: uniquePrices,
      col: uniqueCol,
      sales: uniqueSales,
      pay: remappedPay
    },
    removedIdsByTable
  };
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
        const { cleaned } = deduplicateAppState({
          prices: parsed.prices || [],
          col: parsed.col || [],
          sales: parsed.sales || [],
          pay: parsed.pay || [],
          costs: parsed.costs || [],
          customers: parsed.customers || [],
          profiles: parsed.profiles || []
        });
        return cleaned;
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
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('afa_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const openLegal = useCallback((targetTab: LegalTab = 'privacy') => {
    setLegalTab(targetTab);
  }, []);

  const closeLegal = useCallback(() => {
    setLegalTab(null);
  }, []);

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

  // Save to localStorage & Supabase with strict foreign key sequence and payload sanitization
  const persistState = useCallback(async (newState: AppStateData) => {
    try {
      localStorage.setItem('afa_cache', JSON.stringify(newState));
    } catch (e) {
      console.warn('localStorage save notice:', e);
    }

    if (!sbClient || !navigator.onLine) {
      setSyncStatus('offline');
      setSyncText('Offline Mode');
      return;
    }

    setSyncStatus('saving');
    setSyncText('Saving...');

    try {
      // Step 1: Upsert parent entities first (prices, customers)
      if (newState.prices.length > 0) {
        const { error } = await sbClient.from('prices').upsert(newState.prices);
        if (error) console.warn('Supabase prices upsert notice:', error.message);
      }

      if (newState.customers.length > 0) {
        const { error } = await sbClient.from('customers').upsert(newState.customers);
        if (error) console.warn('Supabase customers upsert notice:', error.message);
      }

      // Step 2: Upsert collections
      if (newState.col.length > 0) {
        const sanitizedCol = newState.col.map(c => ({
          ...c,
          created_by: cleanUUID(c.created_by)
        }));
        const { error } = await sbClient.from('collections').upsert(sanitizedCol);
        if (error) console.warn('Supabase collections upsert notice:', error.message);
      }

      // Step 3: Upsert sales with sanitized foreign key and created_by UUID
      if (newState.sales.length > 0) {
        const validCustomerIds = new Set(newState.customers.map(c => c.id));
        const sanitizedSales = newState.sales.map(s => {
          // If cust_id does not exist in customers or is invalid UUID, send null to prevent foreign key violation
          const safeCustId = s.cust_id && validCustomerIds.has(s.cust_id) && cleanUUID(s.cust_id)
            ? s.cust_id
            : null;

          return {
            id: s.id,
            date: s.date,
            pid: s.pid,
            lbl: s.lbl,
            qty: Number(s.qty) || 0,
            price: Number(s.price) || 0,
            shop: s.shop,
            cust_id: safeCustId,
            paid: Number(s.paid) || 0,
            method: s.method || 'Cash',
            due: s.due || '',
            created_by: cleanUUID(s.created_by)
          };
        });

        const { error } = await sbClient.from('sales').upsert(sanitizedSales);
        if (error) {
          console.warn('Supabase sales upsert notice:', error.message);
        }
      }

      // Step 4: Upsert payments with sanitized customer foreign key
      if (newState.pay.length > 0) {
        const validCustomerIds = new Set(newState.customers.map(c => c.id));
        const sanitizedPay = newState.pay
          .filter(p => validCustomerIds.has(p.cust_id))
          .map(p => ({
            id: p.id,
            date: p.date,
            cust_id: p.cust_id,
            amt: Number(p.amt) || 0
          }));

        if (sanitizedPay.length > 0) {
          const { error } = await sbClient.from('payments').upsert(sanitizedPay);
          if (error) console.warn('Supabase payments upsert notice:', error.message);
        }
      }

      // Step 5: Upsert costs
      if (newState.costs.length > 0) {
        const sanitizedCosts = newState.costs.map(c => ({
          ...c,
          created_by: cleanUUID(c.created_by)
        }));
        const { error } = await sbClient.from('costs').upsert(sanitizedCosts);
        if (error) console.warn('Supabase costs upsert notice:', error.message);
      }

      setSyncStatus('synced');
      setSyncText('Synced');
    } catch (e: any) {
      console.warn('Sync error:', e);
      setSyncStatus('offline');
      setSyncText('Saved Locally');
    }
  }, []);

  const updateState = useCallback((updater: (prev: AppStateData) => AppStateData) => {
    setAppState(prev => {
      const next = updater(prev);
      persistState(next);
      return next;
    });
  }, [persistState]);

  // Load data from Supabase with automatic deduplication
  const loadRemoteData = useCallback(async (forcedRole?: string) => {
    if (!sbClient || !navigator.onLine) return;
    try {
      setSyncStatus('saving');
      setSyncText('Loading...');

      const remoteDataMap: Record<string, any[]> = {};
      for (const [k, tbl] of Object.entries(TB_MAP)) {
        const { data, error } = await sbClient.from(tbl).select('*');
        if (!error && data) {
          remoteDataMap[k] = data.map(item => {
            const clean = { ...item };
            delete clean.created_at;
            return clean;
          });
        }
      }

      let teamProfiles: MemberProfile[] | null = null;
      const activeRole = forcedRole || me.role;
      if (activeRole === 'ceo') {
        const { data: teamData, error: teamErr } = await sbClient
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true });
        if (!teamErr && teamData) {
          teamProfiles = teamData;
        }
      }

      setAppState(prev => {
        const merged: AppStateData = {
          prices: remoteDataMap.prices || prev.prices,
          col: remoteDataMap.col || prev.col,
          sales: remoteDataMap.sales || prev.sales,
          pay: remoteDataMap.pay || prev.pay,
          costs: remoteDataMap.costs || prev.costs,
          customers: remoteDataMap.customers || prev.customers,
          profiles: teamProfiles || prev.profiles
        };

        // Merge any local rows not yet in remote
        for (const [k] of Object.entries(TB_MAP)) {
          const remoteList = remoteDataMap[k];
          if (remoteList) {
            const remoteIds = new Set(remoteList.map((r: any) => r.id));
            const unsynced = ((prev as any)[k] || []).filter((r: any) => !remoteIds.has(r.id));
            (merged as any)[k] = [...remoteList, ...unsynced];
          }
        }

        const { cleaned, removedIdsByTable } = deduplicateAppState(merged);

        // Permanently purge any removed duplicate IDs from Supabase
        if (sbClient && navigator.onLine) {
          Object.entries(removedIdsByTable).forEach(([tblKey, ids]) => {
            const actualTable = TB_MAP[tblKey];
            if (actualTable && ids.length > 0) {
              sbClient.from(actualTable).delete().in('id', ids).then(undefined, console.warn);
            }
          });
        }

        try {
          localStorage.setItem('afa_cache', JSON.stringify(cleaned));
        } catch {}

        return cleaned;
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

          // Fetch real profile from Supabase
          const { data: prof, error: profErr } = await sbClient
            .from('profiles')
            .select('*')
            .eq('id', usr.id)
            .single();

          if (!profErr && prof) {
            userProf.role = prof.role;
            userProf.shop = prof.shop || '';
            userProf.active = prof.active !== false;
            detectedRole = prof.role;
          } else {
            // First time or Bernard founder fallback
            if (usr.email === 'markbrownwane@gmail.com') {
              userProf.role = 'ceo';
              userProf.active = true;
              detectedRole = 'ceo';
            }
          }

          setMe(userProf);
          localStorage.setItem('afa_me', JSON.stringify(userProf));
        }
      } catch (e) {
        console.warn('Session init notice:', e);
      }

      await loadRemoteData(detectedRole);
    }

    initSessionAndData();
  }, []);

  // Inactivity timeout
  useEffect(() => {
    if (!me.id || !me.active) return;
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        toast('Session closed due to inactivity');
        setMe(EMPTY_USER);
        localStorage.removeItem('afa_me');
        if (sbClient) sbClient.auth.signOut().then(undefined, console.warn);
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [me.id, me.active, toast]);

  // Shift week date
  const shiftWeek = useCallback((offsetDays: number) => {
    setSelDate(prev => {
      const cur = parseDate(prev || td());
      cur.setDate(cur.getDate() + offsetDays);
      return localDateStr(cur);
    });
  }, []);

  // Permissions
  const can = useCallback((action: keyof typeof PERMS['ceo']): boolean => {
    if (!me.active) return false;
    const p = PERMS[me.role];
    if (!p) return false;
    return Boolean(p[action]);
  }, [me.role, me.active]);

  const myShop = useCallback((): string => {
    if (me.role === 'attendant') return me.shop || SHOPS[0];
    return '';
  }, [me.role, me.shop]);

  const shopsFor = useCallback((): string[] => {
    if (me.role === 'attendant') return [me.shop || SHOPS[0]];
    return [...SHOPS];
  }, [me.role, me.shop]);

  const scopeRows = useCallback(<T extends { shop?: string }>(rows: T[]): T[] => {
    const shop = myShop();
    if (!shop) return rows;
    return rows.filter(r => !r.shop || r.shop === shop);
  }, [myShop]);

  const mayDel = useCallback((table: TableKey, row: any): boolean => {
    if (!can('del')) {
      if (can('delOwn') && row.created_by && row.created_by === me.id) {
        return true;
      }
      return false;
    }
    return true;
  }, [can, me.id]);

  // Inventory calculation
  const stock = useCallback((): { m: Record<string, number>; L: Record<string, string> } => {
    const m: Record<string, number> = {};
    const L: Record<string, string> = {};

    appState.prices.forEach(p => {
      L[p.id] = `${p.farm} · ${p.item}`;
      SHOPS.forEach(s => {
        m[`${s}__${p.id}`] = 0;
      });
    });

    appState.col.forEach(c => {
      const k = `${c.shop}__${c.pid}`;
      m[k] = (m[k] || 0) + c.qty;
    });

    appState.sales.forEach(s => {
      const k = `${s.shop}__${s.pid}`;
      m[k] = (m[k] || 0) - s.qty;
    });

    return { m, L };
  }, [appState.prices, appState.col, appState.sales]);

  const shopStockQty = useCallback((shop: string, pid: string): number => {
    const s = stock();
    return s.m[`${shop}__${pid}`] || 0;
  }, [stock]);

  // Debts calculation
  const debts = useCallback((): DebtRecord[] => {
    const custMap: Record<string, { name: string; bal: number; due: string }> = {};

    appState.customers.forEach(c => {
      custMap[c.id] = { name: c.name, bal: 0, due: '' };
    });

    appState.sales.forEach(s => {
      if (s.cust_id && custMap[s.cust_id]) {
        const total = s.qty * s.price;
        const bal = total - s.paid;
        custMap[s.cust_id].bal += bal;
        if (s.due && (!custMap[s.cust_id].due || s.due < custMap[s.cust_id].due)) {
          custMap[s.cust_id].due = s.due;
        }
      }
    });

    appState.pay.forEach(p => {
      if (custMap[p.cust_id]) {
        custMap[p.cust_id].bal -= p.amt;
      }
    });

    return Object.entries(custMap)
      .map(([id, val]) => ({
        id,
        name: val.name,
        bal: Math.max(0, Math.round(val.bal * 100) / 100),
        due: val.due
      }))
      .filter(d => d.bal > 0)
      .sort((a, b) => b.bal - a.bal);
  }, [appState.customers, appState.sales, appState.pay]);

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
      qty: Number(data.qty) || 0,
      buy: Number(data.buy) || 0,
      shop: (data.shop || SHOPS[0]).trim(),
      paid_amt: Number(data.paidAmt) || 0,
      created_by: me.id
    };

    updateState(prev => {
      const costs = [...prev.costs];
      if (data.transport > 0) {
        costs.push({
          id: uid(),
          date: dateVal,
          descr: `Transport: ${p.farm} (${data.qty} crates)`,
          amt: Number(data.transport),
          created_by: me.id
        });
      }
      return {
        ...prev,
        col: [...prev.col, newCol],
        costs
      };
    });

    toast('Recorded collection');
    return true;
  }, [can, appState.prices, me.id, updateState, toast]);

  const payFarmer = useCallback((colId: string, amt: number) => {
    if (!can('pay')) {
      toast('You cannot record payments');
      return;
    }
    updateState(prev => ({
      ...prev,
      col: prev.col.map(c => {
        if (c.id === colId) {
          return {
            ...c,
            paid_amt: (c.paid_amt || 0) + amt
          };
        }
        return c;
      })
    }));
    toast('Recorded farmer payment');
  }, [can, updateState, toast]);

  const adjustStock = useCallback((data: { type: 'move' | 'loss'; pid: string; fromShop: string; toShop: string; qty: number }) => {
    const p = appState.prices.find(pr => pr.id === data.pid);
    if (!p || data.qty <= 0) {
      toast('Invalid adjustment');
      return false;
    }

    const deductions: CollectionItem[] = [];

    if (data.type === 'move') {
      deductions.push({
        id: uid(),
        date: td(),
        pid: p.id,
        lbl: `${p.farm} · ${p.item} (Out)`,
        qty: -data.qty,
        buy: 0,
        shop: data.fromShop,
        paid_amt: 0
      });
      deductions.push({
        id: uid(),
        date: td(),
        pid: p.id,
        lbl: `${p.farm} · ${p.item} (In)`,
        qty: data.qty,
        buy: 0,
        shop: data.toShop,
        paid_amt: 0
      });
    } else {
      deductions.push({
        id: uid(),
        date: td(),
        pid: p.id,
        lbl: `${p.farm} · ${p.item} (Breakage/Loss)`,
        qty: -data.qty,
        buy: 0,
        shop: data.fromShop,
        paid_amt: 0
      });
    }

    updateState(prev => ({
      ...prev,
      col: [...prev.col, ...deductions]
    }));

    toast(data.type === 'move' ? `Transferred ${data.qty} crates to ${data.toShop}` : `Recorded ${data.qty} broken/spoiled crates`);
    return true;
  }, [appState.prices, updateState, toast]);

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
      const normInputPhone = data.custPhone ? formatPhone(data.custPhone) : '';
      let custObj = prev.customers.find(c => {
        if (c.name.trim().toLowerCase() === custInput.toLowerCase()) return true;
        if (normInputPhone && c.phone && formatPhone(c.phone) === normInputPhone) return true;
        return false;
      });
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
        qty: Number(data.qty) || 0,
        price: Number(data.price) || 0,
        shop: (currentShop || SHOPS[0]).trim(),
        cust_id: custObj ? custObj.id : null,
        paid: Number(paid) || 0,
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
    const cleanName = sanitizeText(name, 100);
    const cleanPhone = sanitizeText(phone, 30);
    const normalizedPhone = cleanPhone ? formatPhone(cleanPhone) : '';

    if (!cleanName) {
      toast('Enter customer name');
      return false;
    }

    let duplicateNotice: string | null = null;

    updateState(prev => {
      const nameMatch = prev.customers.find(
        c => c.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (nameMatch) {
        duplicateNotice = `Customer "${nameMatch.name}" already exists`;
        return prev;
      }

      if (normalizedPhone) {
        const phoneMatch = prev.customers.find(
          c => c.phone && formatPhone(c.phone) === normalizedPhone
        );
        if (phoneMatch) {
          duplicateNotice = `Phone number already belongs to "${phoneMatch.name}"`;
          return prev;
        }
      }

      const newCust: CustomerItem = {
        id: uid(),
        name: cleanName,
        phone: cleanPhone
      };

      return {
        ...prev,
        customers: [...prev.customers, newCust]
      };
    });

    if (duplicateNotice) {
      toast(duplicateNotice);
      return false;
    }

    toast('Saved customer');
    return true;
  }, [can, updateState, toast]);

  const updateCustomer = useCallback((id: string, data: { name: string; phone: string }) => {
    if (!can('customer')) {
      toast('You cannot edit customers');
      return false;
    }
    const cleanName = sanitizeText(data.name, 100);
    const cleanPhone = sanitizeText(data.phone, 30);
    const normalizedPhone = cleanPhone ? formatPhone(cleanPhone) : '';

    if (!cleanName) {
      toast('Enter customer name');
      return false;
    }

    let duplicateNotice: string | null = null;

    updateState(prev => {
      const nameMatch = prev.customers.find(
        c => c.id !== id && c.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (nameMatch) {
        duplicateNotice = `Another customer is already named "${nameMatch.name}"`;
        return prev;
      }

      if (normalizedPhone) {
        const phoneMatch = prev.customers.find(
          c => c.id !== id && c.phone && formatPhone(c.phone) === normalizedPhone
        );
        if (phoneMatch) {
          duplicateNotice = `Phone already registered to "${phoneMatch.name}"`;
          return prev;
        }
      }

      const customers = prev.customers.map(c => {
        if (c.id === id) {
          return {
            ...c,
            name: cleanName,
            phone: cleanPhone
          };
        }
        return c;
      });

      return {
        ...prev,
        customers
      };
    });

    if (duplicateNotice) {
      toast(duplicateNotice);
      return false;
    }

    toast('Customer details updated');
    return true;
  }, [can, updateState, toast]);

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
    const cleanDate = date || td();
    const cleanDescr = sanitizeText(descr, 120) || 'Expense';
    const numAmt = Number(amt) || 0;

    if (numAmt <= 0) {
      toast('Enter valid expense amount');
      return false;
    }

    let isDuplicate = false;

    updateState(prev => {
      const exists = prev.costs.some(c =>
        c.date === cleanDate &&
        c.descr.trim().toLowerCase() === cleanDescr.toLowerCase() &&
        Math.abs(Number(c.amt) - numAmt) < 0.01
      );

      if (exists) {
        isDuplicate = true;
        return prev;
      }

      const newCost: CostItem = {
        id: uid(),
        date: cleanDate,
        descr: cleanDescr,
        amt: numAmt,
        created_by: me.id
      };
      return {
        ...prev,
        costs: [...prev.costs, newCost]
      };
    });

    if (isDuplicate) {
      toast(`An expense for "${cleanDescr}" (${gh(numAmt)}) is already saved for today`);
      return false;
    }

    toast('Saved expense');
    return true;
  }, [can, me.id, updateState, toast]);

  const addPrice = useCallback((farm: string, item: string, buy: number, sell: number) => {
    if (!can('prices')) {
      toast('You cannot change prices');
      return false;
    }
    const f = sanitizeText(farm, 100);
    const i = sanitizeText(item, 60);
    if (!f || !i) {
      toast('Enter farm and egg size');
      return false;
    }

    let isDuplicate = false;

    updateState(prev => {
      const exists = prev.prices.some(
        p => p.farm.trim().toLowerCase() === f.toLowerCase() &&
             p.item.trim().toLowerCase() === i.toLowerCase()
      );
      if (exists) {
        isDuplicate = true;
        return prev;
      }

      const newPrice: PriceItem = {
        id: uid(),
        farm: f,
        item: i,
        buy: Number(buy) || 0,
        sell: Number(sell) || 0
      };
      return {
        ...prev,
        prices: [...prev.prices, newPrice]
      };
    });

    if (isDuplicate) {
      toast(`Price configuration for "${f} · ${i}" already exists`);
      return false;
    }

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
    if (sbClient && navigator.onLine) {
      sbClient.from('prices').delete().eq('id', id).then(undefined, console.warn);
    }
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
        await sbClient.from('profiles').update({ role: newRole, shop: newShop, active: true }).eq('id', id);
      }
    } catch (e: any) {
      console.warn('Remote role update notice:', e);
    }

    updateState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => (p.id === id ? { ...p, role: newRole, shop: newShop || '' } : p))
    }));
    toast('Role updated');
  }, [can, me.id, updateState, toast]);

  const toggleMember = useCallback(async (id: string, active: boolean) => {
    if (!can('team')) {
      toast('Only the CEO can activate/block members');
      return;
    }
    try {
      if (sbClient && navigator.onLine) {
        await sbClient.from('profiles').update({ active }).eq('id', id);
      }
    } catch (e) {
      console.warn('Remote member toggle notice:', e);
    }

    updateState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => (p.id === id ? { ...p, active } : p))
    }));
    toast(active ? 'Member activated' : 'Member blocked');
  }, [can, updateState, toast]);

  const inviteMember = useCallback(async (email: string, role: Role, shop: string | null, name?: string) => {
    if (!can('team')) {
      toast('Only the CEO can invite members');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanStaffName = (name || '').trim();

    updateState(prev => {
      const exists = prev.profiles.some(p => p.email.toLowerCase() === cleanEmail);
      if (exists) return prev;

      const newProf: MemberProfile = {
        id: uid(),
        email: cleanEmail,
        name: cleanStaffName || cleanEmail.split('@')[0],
        phone: '',
        role,
        shop: shop || '',
        active: true,
        created_at: new Date().toISOString()
      };
      return {
        ...prev,
        profiles: [...prev.profiles, newProf]
      };
    });
    toast(`Added ${cleanEmail} to team`);
  }, [can, updateState, toast]);

  const backupJSON = useCallback(() => {
    const dataStr = JSON.stringify(appState, null, 2);
    downloadFile(dataStr, 'application/json', `afa-fresh-eggs-backup-${td()}.json`);
    toast('Downloaded backup');
  }, [appState, toast]);

  const restoreBackupJSON = useCallback((jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.sales)) {
        const { cleaned } = deduplicateAppState(parsed);
        updateState(() => cleaned);
        toast('Backup restored successfully');
      } else {
        toast('Invalid backup JSON format');
      }
    } catch {
      toast('Error reading backup file');
    }
  }, [updateState, toast]);

  const exportCSV = useCallback(() => {
    const lines = ['Date,Farm,Egg Size,Shop,Quantity,Price,Total,Customer,Paid,Status'];
    appState.sales.forEach(s => {
      const tot = s.qty * s.price;
      const c = appState.customers.find(cu => cu.id === s.cust_id);
      const status = s.paid >= tot ? 'Paid' : s.paid > 0 ? 'Part Paid' : 'Credit';
      lines.push(
        `"${s.date}","${s.lbl}","","${s.shop}",${s.qty},${s.price},${tot},"${c ? c.name : 'Walk-in'}",${s.paid},"${status}"`
      );
    });
    downloadFile(lines.join('\n'), 'text/csv', `afa-sales-${td()}.csv`);
    toast('Exported sales CSV');
  }, [appState.sales, appState.customers, toast]);

  const forceSync = useCallback(async () => {
    await persistState(appState);
    await loadRemoteData();
  }, [persistState, appState, loadRemoteData]);

  const loginWithSupabase = useCallback(async (email: string, pass: string): Promise<{ error?: string }> => {
    if (!sbClient) {
      return { error: 'Supabase client unavailable' };
    }
    try {
      const { data, error } = await sbClient.auth.signInWithPassword({ email, password: pass });
      if (error) {
        return { error: error.message };
      }
      if (!data.user) {
        return { error: 'No user returned from login' };
      }

      const usr = data.user;
      let userRole: Role = 'pending';
      let userShop = '';
      let userActive = false;

      const { data: prof, error: profErr } = await sbClient
        .from('profiles')
        .select('*')
        .eq('id', usr.id)
        .single();

      if (!profErr && prof) {
        userRole = prof.role;
        userShop = prof.shop || '';
        userActive = prof.active !== false;
      } else if (usr.email === 'markbrownwane@gmail.com') {
        userRole = 'ceo';
        userActive = true;
      }

      const newMe: UserProfile = {
        id: usr.id,
        email: usr.email || '',
        name: usr.user_metadata?.name || usr.email?.split('@')[0] || 'User',
        phone: usr.user_metadata?.phone || '',
        role: userRole,
        shop: userShop,
        active: userActive
      };

      setMe(newMe);
      localStorage.setItem('afa_me', JSON.stringify(newMe));
      await loadRemoteData(userRole);
      toast('Signed in successfully');
      return {};
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  }, [loadRemoteData, toast]);

  const logout = useCallback(async () => {
    setMe(EMPTY_USER);
    localStorage.removeItem('afa_me');
    if (sbClient) {
      try {
        await sbClient.auth.signOut();
      } catch {}
    }
    toast('Signed out');
  }, [toast]);

  const recheckAccess = useCallback(async () => {
    if (!sbClient || !me.id) return;
    try {
      const { data: prof, error } = await sbClient
        .from('profiles')
        .select('*')
        .eq('id', me.id)
        .single();

      if (!error && prof) {
        const updated: UserProfile = {
          ...me,
          role: prof.role,
          shop: prof.shop || '',
          active: prof.active !== false
        };
        setMe(updated);
        localStorage.setItem('afa_me', JSON.stringify(updated));
        if (prof.active) {
          toast(`Account activated as ${prof.role}!`);
          await loadRemoteData(prof.role);
        } else {
          toast('Account still awaiting approval');
        }
      }
    } catch {
      toast('Could not refresh status');
    }
  }, [me, loadRemoteData, toast]);

  const contextValue = useMemo(() => ({
    me,
    appState,
    tab,
    setTab,
    selDate,
    setSelDate,
    shiftWeek,
    syncStatus,
    syncText,
    toastMsg,
    toast,
    showSplash,
    setShowSplash,
    theme,
    toggleTheme,
    legalTab,
    openLegal,
    closeLegal,
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
    updateCustomer,
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
    recheckAccess,
    forceSync
  }), [
    me,
    appState,
    tab,
    selDate,
    shiftWeek,
    syncStatus,
    syncText,
    toastMsg,
    toast,
    showSplash,
    theme,
    toggleTheme,
    legalTab,
    openLegal,
    closeLegal,
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
    updateCustomer,
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
    recheckAccess,
    forceSync
  ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
