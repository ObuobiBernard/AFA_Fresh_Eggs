import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const LoginView: React.FC = () => {
  const { loginWithSupabase, toast, openLegal } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  React.useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) {
      toast(`Rate limit: Please wait ${lockoutRemaining}s before retrying`);
      return;
    }
    if (!email || !password) {
      toast('Enter email and password');
      return;
    }
    setLoading(true);
    const res = await loginWithSupabase(email.trim(), password);
    setLoading(false);
    if (res.error) {
      const next = failCount + 1;
      setFailCount(next);
      if (next >= 5) {
        setLockoutRemaining(60);
        setFailCount(0);
        toast('Rate limit: 5 failed attempts. Locked for 60 seconds.');
      } else {
        toast(`${res.error} (${5 - next} attempts remaining)`);
      }
    } else {
      setFailCount(0);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
      <div
        className="c"
        style={{
          maxWidth: '400px',
          width: '100%',
          marginTop: '20px',
          padding: '28px 24px',
          borderRadius: '24px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'var(--g)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              boxShadow: '0 8px 20px rgba(31, 94, 59, 0.3)',
              marginBottom: '12px'
            }}
          >
            🥚
          </div>
          <h1 style={{ fontSize: '21px', margin: '0 0 4px', fontWeight: 800 }}>
            Staff Operations Portal Sign In
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--mu)', margin: 0 }}>
            AFA Fresh Eggs Enterprise · Greater Accra, Ghana
          </p>
        </div>

        <form onSubmit={handleSignIn}>
          <label>
            Staff Email
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="e.g. markbrownwane@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" disabled={loading || lockoutRemaining > 0} style={{ marginTop: '6px' }}>
            {loading ? 'Signing in...' : lockoutRemaining > 0 ? `Rate Limit Lock (${lockoutRemaining}s)` : 'Sign in'}
          </button>

          <p style={{ fontSize: '11px', color: 'var(--mu)', margin: '14px 0 0', lineHeight: 1.5, textAlign: 'center' }}>
            By signing in, you confirm your authorized staff credentials and agree to our{' '}
            <button
              type="button"
              onClick={() => openLegal('terms')}
              style={{ background: 'none', border: 'none', padding: 0, minHeight: 'auto', width: 'auto', color: 'var(--g)', textDecoration: 'underline', font: 'inherit', cursor: 'pointer', display: 'inline', boxShadow: 'none' }}
            >
              Terms
            </button>
            {' & '}
            <button
              type="button"
              onClick={() => openLegal('privacy')}
              style={{ background: 'none', border: 'none', padding: 0, minHeight: 'auto', width: 'auto', color: 'var(--g)', textDecoration: 'underline', font: 'inherit', cursor: 'pointer', display: 'inline', boxShadow: 'none' }}
            >
              Privacy Policy
            </button>.
          </p>
        </form>
      </div>
    </div>
  );
};
