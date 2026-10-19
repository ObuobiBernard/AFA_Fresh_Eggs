import React from 'react';
import { useApp } from '../context/AppContext';

export const PendingView: React.FC = () => {
  const { me, logout, recheckAccess } = useApp();

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto', padding: '0 16px', textAlign: 'center' }}>
      <div className="c" style={{ padding: '32px 24px', borderRadius: '22px' }}>
        <div style={{ fontSize: '48px', marginBottom: '14px' }}>
          ⏳
        </div>
        <h1 style={{ fontSize: '20px', margin: '0 0 8px', fontWeight: 800 }}>
          Account Pending Approval
        </h1>
        <p style={{ color: 'var(--mu)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 20px' }}>
          Welcome, <b>{me.name || me.email}</b>. Your staff account has been created and is currently awaiting role authorization from enterprise management (CEO).
        </p>

        <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', textAlign: 'left' }}>
          <div><b>Account Email:</b> {me.email}</div>
          <div style={{ marginTop: '4px' }}><b>Enterprise:</b> AFA Fresh Eggs</div>
          <div style={{ marginTop: '4px' }}><b>Contact Admin:</b> <code>markbrownwane@gmail.com</code></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button type="button" onClick={recheckAccess}>
            🔄 Check Approval Status
          </button>
          <button
            type="button"
            className="s"
            onClick={logout}
            style={{ background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
