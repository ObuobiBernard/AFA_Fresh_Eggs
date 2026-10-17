import React, { useState, useEffect } from 'react';
import { LegalTab } from './LegalCenterModal';

interface CookieBannerProps {
  onOpenLegal: (tab: LegalTab) => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenLegal }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('afa_cookie_consent');
      if (!consent) {
        // Small delay so it animates in smoothly
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      setVisible(false);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('afa_cookie_consent', 'accepted');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Storage and privacy notification"
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '560px',
        zIndex: 1500,
        backgroundColor: 'var(--cd)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--bd)',
        borderRadius: '16px',
        padding: '14px 16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        animation: 'glassSlideUp 0.3s ease-out both'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }} aria-hidden="true">🍪</span>
          <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--tx)' }}>
            <b>Local Storage & Privacy Notice:</b> We use essential browser storage exclusively for offline PWA operation and login sessions. No third-party marketing or cross-site tracking cookies are used.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            type="button"
            onClick={() => onOpenLegal('cookies')}
            style={{
              width: 'auto',
              minHeight: 'auto',
              padding: '7px 12px',
              fontSize: '12px',
              background: 'transparent',
              color: 'var(--tx)',
              border: '1px solid var(--bd)'
            }}
          >
            Review Policy
          </button>
          <button
            type="button"
            onClick={handleAccept}
            style={{
              width: 'auto',
              minHeight: 'auto',
              padding: '7px 16px',
              fontSize: '12px',
              background: 'var(--g)',
              color: '#ffffff'
            }}
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </aside>
  );
};
