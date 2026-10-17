import React from 'react';
import { useApp } from '../context/AppContext';

export const PendingView: React.FC = () => {
  const { me, recheckAccess, logout } = useApp();

  return (
    <div className="c">
      <h2>⏳ Awaiting Approval</h2>
      <p style={{ fontSize: '14px', color: 'var(--mu)', margin: '0 0 6px' }}>
        You are signed in as <b>{me.email || 'your account'}</b>, but no role has been assigned to this account yet.
      </p>
      <p style={{ fontSize: '14px', color: 'var(--mu)', margin: '0 0 16px' }}>
        The CEO must approve your account from the <b>Team</b> screen before you can use the app.
      </p>
      <button type="button" onClick={recheckAccess}>
        Check Again
      </button>
      <button
        type="button"
        onClick={() => logout()}
        style={{ background: 'var(--bd)', color: 'var(--tx)', marginTop: '10px' }}
      >
        Sign Out
      </button>
    </div>
  );
};
