import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS, SHOPS } from '../constants';
import { Role, MemberProfile } from '../types';

export const TeamView: React.FC = () => {
  const { appState, can, me, saveMember, toggleMember, inviteMember } = useApp();

  const [inviteEmail, setInviteEmail] = useState('');
  const [memberEdits, setMemberEdits] = useState<Record<string, { role: Role; shop: string }>>({});

  if (!can('team')) {
    return (
      <div className="c">
        <h2>🔒 Team Management</h2>
        <p style={{ color: 'var(--mu)', fontSize: '14px', margin: '0 0 4px' }}>
          Only the CEO can access Team Management.
        </p>
      </div>
    );
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMember(inviteEmail);
    setInviteEmail('');
  };

  const team = appState.profiles || [];
  const pending = team.filter(p => p.role === 'pending' || !p.active);
  const active = team.filter(p => p.role !== 'pending' && p.active);

  const renderMemberRow = (p: MemberProfile) => {
    const isMe = p.id === me.id;
    const edit = memberEdits[p.id] || { role: p.role, shop: p.shop || '' };

    return (
      <div key={p.id} style={{ padding: '12px 0', borderTop: '1px solid var(--bd)' }}>
        <div className="l" style={{ border: 0, padding: 0 }}>
          <div>
            <b>{p.name || 'Unnamed'}{isMe && <small> (you)</small>}</b>
            <small>
              {p.email}
              {p.phone && ` · 📞 ${p.phone}`}
            </small>
          </div>
          <span className={`sync-pill ${p.active ? 'synced' : 'offline'}`} style={{ flex: 'none' }}>
            {p.active ? 'Active' : 'Blocked'}
          </span>
        </div>

        <div className="r" style={{ marginTop: '8px', gridTemplateColumns: '1fr 1fr' }}>
          <label style={{ margin: 0 }}>
            Role
            <select
              value={edit.role}
              onChange={e => {
                const nextRole = e.target.value as Role;
                setMemberEdits({
                  ...memberEdits,
                  [p.id]: { ...edit, role: nextRole }
                });
              }}
            >
              {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>

          <label style={{ margin: 0 }}>
            Shop
            <select
              disabled={edit.role !== 'attendant'}
              value={edit.shop}
              onChange={e => {
                setMemberEdits({
                  ...memberEdits,
                  [p.id]: { ...edit, shop: e.target.value }
                });
              }}
            >
              <option value="">— no shop —</option>
              {SHOPS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="r" style={{ marginTop: '8px', gridTemplateColumns: '1fr 1fr' }}>
          <button
            type="button"
            style={{ width: 'auto' }}
            onClick={() => saveMember(p.id, edit.role, edit.shop || null)}
          >
            Save
          </button>

          {isMe ? (
            <button type="button" disabled style={{ background: 'var(--bd)', color: 'var(--mu)' }}>
              Cannot disable self
            </button>
          ) : (
            <button
              type="button"
              style={{
                width: 'auto',
                background: p.active ? 'var(--rd)' : 'var(--gb, #e5f4e8)',
                color: p.active ? '#fff' : 'var(--g)'
              }}
              onClick={() => toggleMember(p.id, !p.active)}
            >
              {p.active ? 'Block Sign-in' : 'Activate'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="c">
        <h2>👥 Team Management</h2>
        <p style={{ fontSize: '13px', color: 'var(--mu)', margin: '0 0 12px' }}>
          You are the CEO, so you control who may sign in and what each person can do.
          New accounts appear as <b>Pending Approval</b> until you activate them.
        </p>

        <form onSubmit={handleInvite}>
          <label>
            Invite a staff member
            <input
              type="email"
              placeholder="staff@example.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{ marginBottom: '8px' }}
            />
          </label>
          <button type="submit">Create Login</button>
        </form>
        <small style={{ display: 'block', marginTop: '8px', color: 'var(--mu)' }}>
          They will receive an email to set their password, then appear below for you to approve.
        </small>
      </div>

      {pending.length > 0 && (
        <div className="c">
          <h2>⏳ Awaiting Approval ({pending.length})</h2>
          {pending.map(renderMemberRow)}
        </div>
      )}

      <div className="c">
        <h2>✅ Active Staff ({active.length})</h2>
        {active.length > 0 ? (
          active.map(renderMemberRow)
        ) : (
          <small style={{ color: 'var(--mu)' }}>No approved staff yet.</small>
        )}
      </div>
    </>
  );
};
