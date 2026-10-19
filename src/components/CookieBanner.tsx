import React, { useState, useEffect } from 'react';

interface CookieBannerProps {
  onOpenLegal: (tab?: 'privacy' | 'terms' | 'cookies' | 'returns' | 'business') => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenLegal }) => {
  const [accepted, setAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('afa_cookie_consent') === 'accepted';
    } catch {
      return false;
    }
  });

  // Lock body scroll while cookie banner is active
  useEffect(() => {
    if (!accepted) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [accepted]);

  if (accepted) return null;

  const handleAccept = () => {
    try {
      localStorage.setItem('afa_cookie_consent', 'accepted');
    } catch {}
    setAccepted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-heading"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(10, 20, 14, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
        pointerEvents: 'auto',
        touchAction: 'none'
      }}
      onClick={e => e.stopPropagation()}
    >
      <div
        className="c"
        style={{
          width: '100%',
          maxWidth: '430px',
          margin: '0 auto',
          background: 'var(--cd)',
          borderRadius: '22px',
          padding: '24px 20px',
          border: '2px solid var(--g)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          textAlign: 'center',
          pointerEvents: 'auto',
          animation: 'cookieSlideUp 0.35s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: '38px', marginBottom: '8px' }}>
          🍪
        </div>

        <h2 id="cookie-heading" style={{ margin: '0 0 8px', fontSize: '19px', color: 'var(--tx)', fontWeight: 700 }}>
          Consent & Operational Storage
        </h2>

        <p style={{ margin: '0 0 16px', fontSize: '13px', lineHeight: 1.55, color: 'var(--tx)', opacity: 0.9 }}>
          AFA Fresh Eggs Manager uses essential local device storage to keep you signed in, persist egg inventory, and enable offline calculations. We never sell your data or use advertising tracking cookies.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={handleAccept}
            style={{
              width: '100%',
              minHeight: '48px',
              fontSize: '15px',
              fontWeight: 700,
              background: 'var(--g)',
              color: '#ffffff',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(31, 94, 59, 0.4)'
            }}
          >
            Accept & Continue
          </button>

          <button
            type="button"
            onClick={() => onOpenLegal('cookies')}
            style={{
              width: '100%',
              minHeight: '40px',
              fontSize: '12px',
              background: 'transparent',
              color: 'var(--mu)',
              border: '1px solid var(--bd)',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Review Cookie & Privacy Policy
          </button>
        </div>

        <small style={{ display: 'block', marginTop: '12px', fontSize: '11px', color: 'var(--mu)' }}>
          Mandatory operational consent required under Ghana Data Protection Act 2012 (Act 843).
        </small>
      </div>
    </div>
  );
};
