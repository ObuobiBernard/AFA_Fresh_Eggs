import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const NotFoundView: React.FC = () => {
  const { setTab } = useApp();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setTab('credit');
  };

  return (
    <>
      <Breadcrumbs currentTab="404" />

      <div className="c" style={{ textAlign: 'center', padding: '36px 20px', borderRadius: '22px' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'rgba(31, 94, 59, 0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            marginBottom: '16px'
          }}
        >
          🥚
        </div>

        <h1 style={{ fontSize: '24px', margin: '0 0 8px', fontWeight: 800 }}>
          Page Not Found (404)
        </h1>

        <p style={{ color: 'var(--mu)', fontSize: '14px', maxWidth: '380px', margin: '0 auto 24px', lineHeight: 1.5 }}>
          The requested screen or resource is not available. Please verify the URL or navigate to one of the main operational sections below:
        </p>

        {/* Quick search */}
        <form onSubmit={handleSearch} style={{ maxWidth: '340px', margin: '0 auto 24px', display: 'flex', gap: '6px' }}>
          <input
            type="search"
            placeholder="Search customers or inventory..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ margin: 0 }}
          />
          <button type="submit" style={{ flex: 'none', padding: '0 16px', minHeight: 'auto' }}>
            Go
          </button>
        </form>

        {/* Direct Internal Links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', maxWidth: '440px', margin: '0 auto 20px' }}>
          <button
            type="button"
            className="s"
            onClick={() => setTab('home')}
            style={{ padding: '10px', fontSize: '13px' }}
          >
            🏠 Dashboard
          </button>
          <button
            type="button"
            className="s"
            onClick={() => setTab('sell')}
            style={{ padding: '10px', fontSize: '13px' }}
          >
            💰 Record Sale
          </button>
          <button
            type="button"
            className="s"
            onClick={() => setTab('credit')}
            style={{ padding: '10px', fontSize: '13px' }}
          >
            👥 Credit Ledgers
          </button>
          <button
            type="button"
            className="s"
            onClick={() => setTab('collect')}
            style={{ padding: '10px', fontSize: '13px' }}
          >
            🚜 Farm Inward
          </button>
        </div>

        <small style={{ color: 'var(--mu)', display: 'block' }}>
          AFA Fresh Eggs Enterprise · Need assistance? Contact <code>markbrownwane@gmail.com</code>
        </small>
      </div>
    </>
  );
};
