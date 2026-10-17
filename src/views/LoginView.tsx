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
      {/* Ambient floating green leaves */}
      {[
        { x: '4%', y: '15px', size: 26, rot: 35, dur: '6s', delay: '0s' },
        { x: '88%', y: '10px', size: 30, rot: -45, dur: '7s', delay: '0.4s' },
        { x: '2%', y: '140px', size: 22, rot: 15, dur: '5.5s', delay: '0.8s' },
        { x: '86%', y: '160px', size: 28, rot: -20, dur: '6.5s', delay: '1.2s' }
      ].map((leaf, idx) => (
        <svg
          key={idx}
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            left: leaf.x,
            top: leaf.y,
            width: `${leaf.size}px`,
            height: `${leaf.size}px`,
            opacity: 0.85,
            filter: 'drop-shadow(0 3px 6px rgba(31, 94, 59, 0.18))',
            pointerEvents: 'none',
            zIndex: 1,
            animation: `floatLeaf ${leaf.dur} ease-in-out infinite alternate ${leaf.delay}`
          }}
        >
          <path d="M50 5 C75 25 85 65 50 95 C15 65 25 25 50 5 Z" fill="url(#loginLeafGrad)" />
          <path d="M50 15 Q50 50 50 85" stroke="#2b6b44" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
          <defs>
            <linearGradient id="loginLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#439A52" />
              <stop offset="100%" stopColor="#1F5E3B" />
            </linearGradient>
          </defs>
        </svg>
      ))}

      {/* Animated Brand Hero (from video) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 0 20px',
          width: '100%',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* Animated Badge & Egg Container */}
        <div
          style={{
            position: 'relative',
            width: '150px',
            height: '150px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Swirling Sparkle Ribbon Trail */}
          <svg
            viewBox="0 0 200 200"
            style={{
              position: 'absolute',
              inset: '-12px',
              width: 'calc(100% + 24px)',
              height: 'calc(100% + 24px)',
              animation: 'spinSparkleLoop 6s linear infinite',
              pointerEvents: 'none'
            }}
          >
            <circle
              cx="100"
              cy="100"
              r="84"
              fill="none"
              stroke="url(#loginSparkleGrad)"
              strokeWidth="4"
              strokeDasharray="180 340"
              strokeLinecap="round"
              filter="drop-shadow(0 0 8px #F5A623)"
            />
            <defs>
              <linearGradient id="loginSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="40%" stopColor="#F5D061" stopOpacity="0.95" />
                <stop offset="80%" stopColor="#7FC77A" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1F5E3B" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Golden Sunburst Glow */}
          <div
            style={{
              position: 'absolute',
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245, 166, 35, 0.35) 0%, rgba(255, 246, 224, 0) 70%)',
              animation: 'eggGlow 3s ease-in-out infinite alternate',
              pointerEvents: 'none'
            }}
          />

          {/* Leafy Wreath and Radiant Golden Egg SVG */}
          <svg
            viewBox="0 0 120 120"
            style={{
              width: '100%',
              height: '100%',
              filter: 'drop-shadow(0 10px 24px rgba(31, 94, 59, 0.25))',
              animation: 'wreathIntro 1.2s cubic-bezier(0.18, 0.89, 0.32, 1.2) forwards'
            }}
          >
            {/* Background disc */}
            <circle cx="60" cy="60" r="54" fill="#FBF7EC" />

            {/* Outer Laurel Leaf Wreath Border */}
            <circle cx="60" cy="60" r="51" fill="none" stroke="#1F5E3B" strokeWidth="3" opacity="0.4" />
            <circle cx="60" cy="60" r="48" fill="#1A4A30" />

            {/* Woven Laurel leaves around wreath perimeter */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
              <g key={i} transform={`rotate(${deg} 60 60)`}>
                <ellipse cx="60" cy="14" rx="5" ry="10" fill="#2E7D4E" transform="rotate(-20 60 14)" />
                <ellipse cx="60" cy="14" rx="4" ry="9" fill="#4CAF50" transform="rotate(20 60 14)" opacity="0.85" />
              </g>
            ))}

            {/* Inner Ring */}
            <circle cx="60" cy="60" r="38" fill="#133824" />

            {/* Inner woven bottom nest leaves */}
            <path d="M32 78 C42 86 78 86 88 78 C80 92 40 92 32 78 Z" fill="#2E7D4E" />
            <path d="M38 74 C48 82 72 82 82 74 C75 86 45 86 38 74 Z" fill="#7FC77A" opacity="0.8" />

            {/* Farm Fresh Egg Shell */}
            <path
              d="M60 26 C75 26 84 44 84 58 C84 73 73 82 60 82 C47 82 36 73 36 58 C36 44 45 26 60 26 Z"
              fill="url(#loginEggShellGrad)"
              filter="drop-shadow(0 4px 10px rgba(0, 0, 0, 0.15))"
            />

            {/* Inner Egg highlight ring */}
            <path
              d="M60 30 C72 30 79 45 79 58 C79 70 70 77 60 77 C50 77 41 70 41 58 C41 45 48 30 60 30 Z"
              fill="#FFFFFF"
              opacity="0.95"
            />

            {/* Radiant Golden Egg Yolk */}
            <circle
              cx="60"
              cy="62"
              r="12"
              fill="url(#loginYolkGrad)"
              filter="drop-shadow(0 2px 6px rgba(245, 166, 35, 0.6))"
            />
            <ellipse cx="57" cy="58" rx="3.5" ry="2" fill="#FFFFFF" opacity="0.75" />

            {/* Rooster Crest Badge at bottom of Wreath */}
            <g transform="translate(60, 102) scale(0.7)">
              <circle cx="0" cy="0" r="10" fill="#1F5E3B" stroke="#F5A623" strokeWidth="1.5" />
              <path d="M-4 -3 C-1 -6 3 -4 4 -2 C6 -1 5 3 2 4 C-1 5 -4 2 -4 -3 Z" fill="#F5A623" />
              <polygon points="4,-1 8,-2 5,1" fill="#D32F2F" />
              <circle cx="-1" cy="-6" r="1.5" fill="#D32F2F" />
              <circle cx="2" cy="-5" r="1.5" fill="#D32F2F" />
            </g>

            {/* Gradients */}
            <defs>
              <linearGradient id="loginEggShellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="70%" stopColor="#FFF7E6" />
                <stop offset="100%" stopColor="#F5E4C4" />
              </linearGradient>
              <radialGradient id="loginYolkGrad" cx="45%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#FFDE6A" />
                <stop offset="45%" stopColor="#F5A623" />
                <stop offset="100%" stopColor="#D97706" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Brand Typography */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '38px',
              fontWeight: 800,
              letterSpacing: '5px',
              color: 'var(--g)',
              lineHeight: 1,
              textShadow: '0 2px 8px rgba(31, 94, 59, 0.2)'
            }}
          >
            AFA
          </div>
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: 'var(--tx)',
              opacity: 0.9,
              marginTop: '2px'
            }}
          >
            Fresh Eggs
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: '11px',
              letterSpacing: '1.2px',
              color: 'var(--mu)',
              textTransform: 'uppercase'
            }}
          >
            From The Farm, Every Week
          </div>
        </div>
      </div>

      {/* Login Card Form shown directly below */}
      <div className="c" style={{ width: '100%', maxWidth: '420px', zIndex: 3 }}>
        <form onSubmit={handleSignIn}>
          <h2 style={{ marginBottom: '14px', fontSize: '18px' }}>Sign in to your account</h2>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="name@afafresheggs.com"
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

          <p style={{ fontSize: '11px', color: 'var(--mu)', margin: '10px 0 0', lineHeight: 1.5, textAlign: 'center' }}>
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
            </button>
            .
          </p>
        </form>
      </div>

      {/* Legal & Compliance Footer Links */}
      <footer
        style={{
          marginTop: '12px',
          paddingBottom: '20px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          fontSize: '11px',
          color: 'var(--mu)',
          zIndex: 3
        }}
      >
        <button
          type="button"
          onClick={() => openLegal('privacy')}
          style={{ background: 'none', border: 'none', padding: '2px 4px', minHeight: 'auto', width: 'auto', color: 'var(--mu)', font: 'inherit', cursor: 'pointer', boxShadow: 'none' }}
        >
          🔒 Privacy Policy
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => openLegal('terms')}
          style={{ background: 'none', border: 'none', padding: '2px 4px', minHeight: 'auto', width: 'auto', color: 'var(--mu)', font: 'inherit', cursor: 'pointer', boxShadow: 'none' }}
        >
          ⚖️ Terms & Conditions
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => openLegal('cookies')}
          style={{ background: 'none', border: 'none', padding: '2px 4px', minHeight: 'auto', width: 'auto', color: 'var(--mu)', font: 'inherit', cursor: 'pointer', boxShadow: 'none' }}
        >
          🍪 Cookie Policy
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => openLegal('refund')}
          style={{ background: 'none', border: 'none', padding: '2px 4px', minHeight: 'auto', width: 'auto', color: 'var(--mu)', font: 'inherit', cursor: 'pointer', boxShadow: 'none' }}
        >
          🔄 Freshness & Returns
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => openLegal('business')}
          style={{ background: 'none', border: 'none', padding: '2px 4px', minHeight: 'auto', width: 'auto', color: 'var(--mu)', font: 'inherit', cursor: 'pointer', boxShadow: 'none' }}
        >
          🏢 Business Details
        </button>
      </footer>

      {/* Animation keyframes */}
      <style>{`
        @keyframes floatLeaf {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-12px) rotate(10deg); }
        }
        @keyframes spinSparkleLoop {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes wreathIntro {
          0% { transform: scale(0.6) rotate(-10deg); opacity: 0; }
          70% { transform: scale(1.05) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes eggGlow {
          0% { transform: scale(0.9); opacity: 0.35; }
          100% { transform: scale(1.15); opacity: 0.75; }
        }
      `}</style>
    </div>
  );
};
