import React from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS, td } from '../constants';

export const Header: React.FC = () => {
  const { me, theme, toggleTheme, syncStatus, syncText, logout, selDate, setSelDate } = useApp();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--cd)',
        borderBottom: '1px solid var(--bd)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--g), #144027)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flex: 'none',
            boxShadow: '0 2px 8px rgba(31, 94, 59, 0.3)'
          }}
        >
          🥚
        </div>
        <div style={{ minWidth: 0 }}>
          <b style={{ fontSize: '15px', color: 'var(--tx)', display: 'block', lineHeight: 1.2 }}>
            AFA Fresh Eggs
          </b>
          <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{ROLE_LABELS[me.role] || me.role}</span>
            {me.shop && <span>· {me.shop}</span>}
          </small>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 'none' }}>
        {/* Sync status pill */}
        <span
          className="sync-pill"
          style={{
            background:
              syncStatus === 'synced'
                ? 'rgba(37, 211, 102, 0.15)'
                : syncStatus === 'saving'
                ? 'rgba(234, 179, 8, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            color:
              syncStatus === 'synced'
                ? 'var(--g)'
                : syncStatus === 'saving'
                ? '#b45309'
                : 'var(--rd)',
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '12px'
          }}
        >
          {syncStatus === 'saving' ? '⏳ ' : syncStatus === 'synced' ? '● ' : '○ '}
          {syncText}
        </span>

        {/* Theme Toggle */}
        <button
          type="button"
          className="s"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle light/dark mode"
          style={{ padding: '6px 10px', fontSize: '14px', minHeight: 'auto', background: 'var(--bg)', border: '1px solid var(--bd)' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Logout */}
        <button
          type="button"
          className="s"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
          style={{ padding: '6px 10px', fontSize: '13px', minHeight: 'auto', background: 'var(--bg)', border: '1px solid var(--bd)' }}
        >
          🚪
        </button>
      </div>
    </header>
  );
};
