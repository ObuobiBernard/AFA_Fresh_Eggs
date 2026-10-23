import React, { useState, useEffect } from 'react';
import { vibrateSuccess } from '../utils/haptics';

interface DatabaseSchemaModalProps {
  onClose: () => void;
}

const SUPABASE_SQL = `-- 1. Create farmers table (GTBank & Payout Accounts)
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow staff all operations on farmers" 
ON public.farmers FOR ALL USING (true) WITH CHECK (true);

-- 2. Ensure collections has paid_amt for farmer supply settlements
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collections' AND column_name = 'paid_amt'
    ) THEN 
        ALTER TABLE public.collections ADD COLUMN paid_amt NUMERIC NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 3. Ensure sales has method column
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'method'
    ) THEN 
        ALTER TABLE public.sales ADD COLUMN method TEXT NOT NULL DEFAULT 'Cash';
    END IF;
END $$;

-- 4. Ensure costs has driver reimbursement tracking columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'costs' AND column_name = 'driver_name') THEN 
        ALTER TABLE public.costs ADD COLUMN driver_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'costs' AND column_name = 'status') THEN 
        ALTER TABLE public.costs ADD COLUMN status TEXT DEFAULT 'paid';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'costs' AND column_name = 'paid_date') THEN 
        ALTER TABLE public.costs ADD COLUMN paid_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'costs' AND column_name = 'payment_method') THEN 
        ALTER TABLE public.costs ADD COLUMN payment_method TEXT DEFAULT 'Cash';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_farmers_name ON public.farmers(name);`;

export const DatabaseSchemaModal: React.FC<DatabaseSchemaModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL);
    vibrateSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-schema-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="c"
        style={{
          maxWidth: '540px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          background: 'var(--cd)',
          borderRadius: '20px',
          padding: '20px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 id="db-schema-title" style={{ margin: 0, fontSize: '18px' }}>
              🗄️ Database Table Schema
            </h2>
            <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
              Supabase SQL for Farmer Bank Details &amp; Payouts
            </small>
          </div>
          <button
            type="button"
            className="s"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ fontSize: '18px', padding: '4px 10px', minHeight: 'auto' }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--tx)', lineHeight: 1.5, margin: '0 0 12px' }}>
          <b>Should you update the database tables?</b> Yes! To enable real-time cloud sync across all phones and browsers for farmer bank details and payout records, run this SQL once in your Supabase SQL Editor:
        </p>

        <div style={{ position: 'relative', flex: 1, overflowY: 'auto', marginBottom: '14px' }}>
          <pre
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--bd)',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '11px',
              fontFamily: 'monospace',
              lineHeight: 1.45,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0
            }}
          >
            {SUPABASE_SQL}
          </pre>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="s"
            onClick={onClose}
            style={{ flex: 1, background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--bd)' }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            style={{ flex: 2, background: 'var(--g)', color: '#ffffff' }}
          >
            {copied ? '✓ SQL Copied to Clipboard!' : '📋 Copy SQL to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
