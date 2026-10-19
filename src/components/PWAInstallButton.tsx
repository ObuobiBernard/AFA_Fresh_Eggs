import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, installApp } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <div
      style={{
        margin: '12px 0',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, rgba(31, 94, 59, 0.12), rgba(212, 160, 23, 0.12))',
        border: '1px solid var(--g)',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}
    >
      <div>
        <b style={{ fontSize: '13px', display: 'block', color: 'var(--tx)' }}>📲 Install AFA Eggs App</b>
        <small style={{ fontSize: '11px', color: 'var(--mu)' }}>Install on home screen for fast offline sales</small>
      </div>
      <button
        type="button"
        onClick={installApp}
        style={{
          flex: 'none',
          padding: '8px 14px',
          fontSize: '12px',
          fontWeight: 700,
          background: 'var(--g)',
          color: '#ffffff',
          borderRadius: '8px'
        }}
      >
        Install App
      </button>
    </div>
  );
};
