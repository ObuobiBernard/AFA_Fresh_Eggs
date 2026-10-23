-- ==============================================================================
-- AFA FRESH EGGS ENTERPRISE - SUPABASE PRODUCTION DATABASE SCHEMA
-- Run this script in your Supabase project's SQL Editor (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Farmers & Bank Accounts Table (NEW: GTBank & Payout Accounts)
CREATE TABLE IF NOT EXISTS public.farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    bank_name TEXT NOT NULL DEFAULT 'Guaranty Trust Bank (GTBank)',
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    branch TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on farmers
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

-- Farmers RLS Policy: Allow staff read & write
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'farmers' AND policyname = 'Allow staff all operations on farmers'
    ) THEN
        CREATE POLICY "Allow staff all operations on farmers" 
        ON public.farmers 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 2. Ensure Collections Table supports paid_amt for farmer supply settlements
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    pid UUID,
    lbl TEXT NOT NULL,
    qty NUMERIC NOT NULL DEFAULT 0,
    buy NUMERIC NOT NULL DEFAULT 0,
    shop TEXT NOT NULL,
    paid_amt NUMERIC NOT NULL DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add paid_amt column if collection table existed prior
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collections' AND column_name = 'paid_amt'
    ) THEN 
        ALTER TABLE public.collections ADD COLUMN paid_amt NUMERIC NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Enable RLS on collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'collections' AND policyname = 'Allow staff all operations on collections'
    ) THEN
        CREATE POLICY "Allow staff all operations on collections" 
        ON public.collections 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow staff all operations on customers'
    ) THEN
        CREATE POLICY "Allow staff all operations on customers" 
        ON public.customers 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 4. Sales Table (with customer reference & payment method)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    pid UUID,
    lbl TEXT NOT NULL,
    qty NUMERIC NOT NULL DEFAULT 0,
    price NUMERIC NOT NULL DEFAULT 0,
    shop TEXT NOT NULL,
    cust_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    paid NUMERIC NOT NULL DEFAULT 0,
    method TEXT NOT NULL DEFAULT 'Cash',
    due DATE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'Allow staff all operations on sales'
    ) THEN
        CREATE POLICY "Allow staff all operations on sales" 
        ON public.sales 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 5. Customer Debt Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    cust_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amt NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Allow staff all operations on payments'
    ) THEN
        CREATE POLICY "Allow staff all operations on payments" 
        ON public.payments 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 6. Operating Expenses / Farmer Payouts / Driver Reimbursements Table
CREATE TABLE IF NOT EXISTS public.costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    descr TEXT NOT NULL,
    amt NUMERIC NOT NULL DEFAULT 0,
    shop TEXT,
    created_by UUID,
    driver_name TEXT,
    status TEXT DEFAULT 'paid',
    paid_date DATE,
    payment_method TEXT DEFAULT 'Cash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add driver reimbursement tracking columns if table was created prior
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'costs' AND column_name = 'driver_name'
    ) THEN 
        ALTER TABLE public.costs ADD COLUMN driver_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'costs' AND column_name = 'status'
    ) THEN 
        ALTER TABLE public.costs ADD COLUMN status TEXT DEFAULT 'paid';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'costs' AND column_name = 'paid_date'
    ) THEN 
        ALTER TABLE public.costs ADD COLUMN paid_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'costs' AND column_name = 'payment_method'
    ) THEN 
        ALTER TABLE public.costs ADD COLUMN payment_method TEXT DEFAULT 'Cash';
    END IF;
END $$;

ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'costs' AND policyname = 'Allow staff all operations on costs'
    ) THEN
        CREATE POLICY "Allow staff all operations on costs" 
        ON public.costs 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 7. Prices & Egg Rates Card
CREATE TABLE IF NOT EXISTS public.prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm TEXT NOT NULL,
    item TEXT NOT NULL,
    buy NUMERIC NOT NULL DEFAULT 0,
    sell NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'prices' AND policyname = 'Allow staff all operations on prices'
    ) THEN
        CREATE POLICY "Allow staff all operations on prices" 
        ON public.prices 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 8. Staff Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'pending',
    shop TEXT,
    active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow authenticated users on profiles'
    ) THEN
        CREATE POLICY "Allow authenticated users on profiles" 
        ON public.profiles 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- Indexes for lightning-fast queries and multi-shop reporting
CREATE INDEX IF NOT EXISTS idx_farmers_name ON public.farmers(name);
CREATE INDEX IF NOT EXISTS idx_collections_pid ON public.collections(pid);
CREATE INDEX IF NOT EXISTS idx_collections_date ON public.collections(date);
CREATE INDEX IF NOT EXISTS idx_sales_cust_id ON public.sales(cust_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);
CREATE INDEX IF NOT EXISTS idx_payments_cust_id ON public.payments(cust_id);
CREATE INDEX IF NOT EXISTS idx_costs_date ON public.costs(date);
