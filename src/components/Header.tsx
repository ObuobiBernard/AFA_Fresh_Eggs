import React from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS, wkRange, td } from '../constants';

import { PWAInstallButton } from './PWAInstallButton';

export const Header: React.FC = () => {
  const { me, selDate, syncStatus, syncText, toggleTheme } = useApp();
  const rng = wkRange(selDate || td());

  let subtitle = '';
  if (!me.id) {
    subtitle = 'Sign in to continue';
  } else if (!me.active || me.role === 'pending') {
    subtitle = 'Awaiting approval';
  } else {
    subtitle = `${ROLE_LABELS[me.role] ? ROLE_LABELS[me.role] + ' · ' : ''}Week: ${rng.start} – ${rng.end}`;
  }

  return (
    <header>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <svg width="38" height="38" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" fill="#FFF6E0" />
          <circle cx="50" cy="50" r="42" fill="#1F5E3B" />
          <path d="M50 22C64 22 72 38 72 50C72 63 62 71 50 71C38 71 28 63 28 50C28 38 36 22 50 22Z" fill="#FFF6E0" />
          <circle cx="50" cy="55" r="9" fill="#F5A623" />
          <path d="M50 72C42 74 34 71 31 65C39 64 47 66 50 72ZM50 72C58 74 66 71 69 65C61 64 53 66 50 72Z" fill="#7FC77A" />
        </svg>
        <div>
          <b>AFA FRESH EGGS</b>
          <small>{subtitle}</small>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <PWAInstallButton />
        {me.id && me.active && (
          <span className={`sync-pill ${syncStatus}`} title="Connection status">
            {syncText}
          </span>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="icon-btn"
          aria-label="Toggle theme"
        >
          🌓
        </button>
      </div>
    </header>
  );
};
