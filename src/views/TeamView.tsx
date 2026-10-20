import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS, SHOPS } from '../constants';
import { Role } from '../types';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const TeamView: React.FC = () => {
  const { me, appState, can, saveMember, toggleMember, inviteMember, deleteMember, refreshFromCloud } = useApp();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('attendant');
  const [inviteShop, setInviteShop] = useState<string>(SHOPS[0]);
  const [syncing, setSyncing] = useState(false);

  if (!can('team')) {
    return (
      <div className="c">
        <h2>🔒 Team Management</h2>
        <p style={{ color: 'var(--mu)', fontSize: '14px', margin: '0 0 4px' }}>
          Only the CEO can access this screen.
        </p>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    await inviteMember(inviteEmail, inviteRole, inviteRole === 'attendant' ? inviteShop : null, inviteName);
    setInviteEmail('');
    setInviteName('');
  };

  const handleCloudSync = async (wipeCache = false) => {
    setSyncing(true);
    await refreshFromCloud(wipeCache);
    setSyncing(false);
  };

  return (
    <>
      <Breadcrumbs currentTab="team" />

      <form className="c" onSubmit={handleInvite}>
        <h1>Staff Authorization &amp; Team Roles</h1>
        <label>
          Full Name
          <input
            placeholder="e.g. Kwabena Mensah"
            value={inviteName}
            onChange={e => setInviteName(e.target.value)}
          />
        </label>
        <label>
          Email Address
          <input
            type="email"
            required
            placeholder="e.g. staff@afafresheggs.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
          />
        </label>
        <div className="r">
          <label>
            Assigned Role
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}>
              <option value="attendant">Shop Attendant</option>
              <option value="data_entry">Data Entry</option>
              <option value="driver">Driver</option>
              <option value="ceo">CEO</option>
            </select>
          </label>
          {inviteRole === 'attendant' && (
            <label>
              Assigned Shop
              <select value={inviteShop} onChange={e => setInviteShop(e.target.value)}>
                {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}
        </div>
        <button type="submit">Send Invite / Add Staff</button>
      </form>

      <div className="c">
        <h2>Authorized Team ({appState.profiles.length})</h2>
        {appState.profiles.length > 0 ? (
          appState.profiles.map(m => (
            <div key={m.id} style={{ padding: '10px 0', borderTop: '1px solid var(--bd)' }}>
              <div className="l" style={{ border: 0, padding: 0 }}>
                <div>
                  <b>{m.name || m.email}</b>
                  <small>{m.email} · {ROLE_LABELS[m.role] || m.role} {m.shop ? `(${m.shop})` : ''}</small>
                </div>
                <span className="sync-pill" style={{ background: m.active ? 'rgba(37, 211, 102, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: m.active ? 'var(--g)' : 'var(--rd)', fontSize: '11px' }}>
                  {m.active ? 'Active' : 'Blocked'}
                </span>
              </div>

              {m.id !== me.id && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <select
                    value={m.role}
                    onChange={e => saveMember(m.id, e.target.value as Role, m.shop || SHOPS[0])}
                    style={{ margin: 0, fontSize: '12px', padding: '4px 8px', flex: '1 1 auto', minWidth: '130px' }}
                  >
                    <option value="attendant">Shop Attendant</option>
                    <option value="data_entry">Data Entry</option>
                    <option value="driver">Driver</option>
                    <option value="ceo">CEO</option>
                  </select>

                  <button
                    type="button"
                    className="s"
                    onClick={() => toggleMember(m.id, !m.active)}
                    style={{ fontSize: '11px', padding: '4px 10px', minHeight: 'auto' }}
                  >
                    {m.active ? 'Block Access' : 'Activate'}
                  </button>

                  <button
                    type="button"
                    className="s"
                    onClick={() => deleteMember(m.id)}
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      minHeight: 'auto',
                      color: 'var(--rd)',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      background: 'var(--bg)',
                      fontWeight: 600
                    }}
                    title={`Delete staff account ${m.name || m.email}`}
                  >
                    🗑️ Remove
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <small style={{ color: 'var(--mu)' }}>No team members listed yet.</small>
        )}
      </div>

      {/* Cloud Database & Sync Operations */}
      <div className="c">
        <h2>🗄️ Cloud Database &amp; Sync Control</h2>
        <p style={{ fontSize: '13px', color: 'var(--mu)', margin: '0 0 12px', lineHeight: 1.5 }}>
          If you delete or update records directly inside the Supabase table editor, use these controls to sync immediately with your cloud database:
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="s"
            disabled={syncing}
            onClick={() => handleCloudSync(false)}
            style={{ flex: 1, minHeight: 'auto', padding: '10px' }}
          >
            {syncing ? 'Syncing...' : '🔄 Sync from Cloud Database'}
          </button>

          <button
            type="button"
            className="s"
            disabled={syncing}
            onClick={() => handleCloudSync(true)}
            style={{
              flex: 1,
              minHeight: 'auto',
              padding: '10px',
              color: 'var(--tx)',
              borderColor: 'var(--bd)',
              background: 'var(--bg)'
            }}
            title="Purges local cache and downloads fresh tables from Supabase"
          >
            🧹 Reset Cache &amp; Re-sync
          </button>
        </div>
      </div>
    </>
  );
};
