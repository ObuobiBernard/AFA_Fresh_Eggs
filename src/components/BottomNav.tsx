import React from 'react';
import { useApp } from '../context/AppContext';
import { TabKey } from '../types';

interface NavItem {
  key: TabKey;
  label: string;
  icon: string;
  perm?: 'sell' | 'collect' | 'pay' | 'cost' | 'prices' | 'team';
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'sell', label: 'Sell', icon: '💰', perm: 'sell' },
  { key: 'collect', label: 'Collect', icon: '🚜', perm: 'collect' },
  { key: 'credit', label: 'Credit', icon: '👥', perm: 'pay' },
  { key: 'costs', label: 'Costs', icon: '⛽', perm: 'cost' },
  { key: 'prices', label: 'Prices', icon: '🏷️', perm: 'prices' },
  { key: 'team', label: 'Team', icon: '🛡️', perm: 'team' }
];

export const BottomNav: React.FC = () => {
  const { tab, setTab, can } = useApp();

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.perm) return true;
    return can(item.perm);
  });

  return (
    <nav
      role="navigation"
      aria-label="Main Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'var(--cd)',
        borderTop: '1px solid var(--bd)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)'
      }}
    >
      {visibleItems.map(item => {
        const isActive = tab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              minHeight: '52px',
              padding: '6px 2px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActive ? 'var(--g)' : 'var(--mu)',
              transition: 'color 0.15s ease',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                marginTop: '3px'
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
