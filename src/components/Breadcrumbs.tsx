import React from 'react';
import { TabKey } from '../types';
import { useApp } from '../context/AppContext';

interface BreadcrumbsProps {
  currentTab: TabKey | 'domain' | '404';
  onNavigate?: (tab: TabKey) => void;
  subItem?: string;
}

const TAB_TITLES: Record<string, string> = {
  home: 'Dashboard Overview',
  sell: 'Record Egg Sale',
  collect: 'Farm Collections',
  credit: 'Customer Credit & Directory',
  costs: 'Operating Expenses',
  prices: 'Farm & Selling Prices',
  team: 'Team & Staff Roles',
  domain: 'Custom Domain & DNS',
  '404': '404 Not Found'
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentTab, onNavigate, subItem }) => {
  const { setTab } = useApp();

  const handleNav = (target: TabKey) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      setTab(target);
    }
  };

  if (currentTab === 'home' && !subItem) {
    return (
      <nav aria-label="Breadcrumbs" style={{ marginBottom: '12px' }}>
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--mu)'
          }}
        >
          <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🏠</span>
            <span style={{ fontWeight: 600, color: 'var(--tx)' }}>Home Overview</span>
          </li>
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumbs" style={{ marginBottom: '12px' }}>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: 'var(--mu)',
          flexWrap: 'wrap'
        }}
      >
        <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => handleNav('home')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              minHeight: 'auto',
              color: 'var(--g)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🏠</span> Home
          </button>
          <span>/</span>
        </li>

        <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {subItem ? (
            <>
              <button
                type="button"
                onClick={() => handleNav(currentTab as TabKey)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  minHeight: 'auto',
                  color: 'var(--g)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {TAB_TITLES[currentTab] || currentTab}
              </button>
              <span>/</span>
            </>
          ) : (
            <span style={{ fontWeight: 700, color: 'var(--tx)' }}>
              {TAB_TITLES[currentTab] || currentTab}
            </span>
          )}
        </li>

        {subItem && (
          <li>
            <span style={{ fontWeight: 700, color: 'var(--tx)' }}>
              {subItem}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
};
