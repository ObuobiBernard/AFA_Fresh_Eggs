export type Role = 'ceo' | 'data_entry' | 'attendant' | 'driver' | 'pending';

export type TabKey = 'home' | 'collect' | 'sell' | 'credit' | 'costs' | 'prices' | 'team' | 'domain' | '404';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  shop: string;
  active: boolean;
}

export interface MemberProfile extends UserProfile {
  created_at?: string;
}

export interface PriceItem {
  id: string;
  farm: string;
  item: string;
  buy: number;
  sell: number;
}

export interface CollectionItem {
  id: string;
  date: string;
  pid: string;
  lbl: string;
  qty: number;
  buy: number;
  shop: string;
  paid_amt: number;
  created_by?: string;
}

export interface SaleItem {
  id: string;
  date: string;
  pid: string;
  lbl: string;
  qty: number;
  price: number;
  shop: string;
  cust_id: string | null;
  paid: number;
  method: string;
  due: string;
  created_by?: string;
}

export interface PaymentItem {
  id: string;
  date: string;
  cust_id: string;
  amt: number;
}

export interface CostItem {
  id: string;
  date: string;
  descr: string;
  amt: number;
  shop?: string;
  created_by?: string;
}

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  created_by?: string;
}

export interface FarmerItem {
  id: string;
  name: string;
  phone?: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  branch?: string;
  notes?: string;
}

export interface AppStateData {
  prices: PriceItem[];
  col: CollectionItem[];
  sales: SaleItem[];
  pay: PaymentItem[];
  costs: CostItem[];
  customers: CustomerItem[];
  farmers: FarmerItem[];
  profiles: MemberProfile[];
}

export type TableKey = 'prices' | 'col' | 'sales' | 'pay' | 'costs' | 'customers' | 'farmers';

export interface DeleteTarget {
  table: TableKey | 'profiles';
  id: string;
  name: string;
  typeLabel?: string;
  onSuccess?: () => void;
}
