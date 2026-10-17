import React from 'react';
import { useApp } from '../context/AppContext';
import { TabKey } from '../types';

interface TabItem {
  id: TabKey;
  label: string;
  svg: React.ReactNode;
  permCheck: (can: (k: string) => boolean) => boolean;
}

const TAB_DEFS: TabItem[] = [
  {
    id: 'home',
    label: 'Home',
    svg: <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>,
    permCheck: (can) => can('home')
  },
  {
    id: 'collect',
    label: 'Collect',
    svg: <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>,
    permCheck: (can) => can('collect')
  },
  {
    id: 'sell',
    label: 'Sell',
    svg: <svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" /></svg>,
    permCheck: (can) => can('sell')
  },
  {
    id: 'credit',
    label: 'Credit',
    svg: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>,
    permCheck: (can) => can('pay') || can('customer')
  },
  {
    id: 'costs',
    label: 'Costs',
    svg: <svg viewBox="0 0 24 24"><path d="M18 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM19.5 9.5H17V6h2.5v3.5zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13-1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2-3H3V6h14v4h3.5l1.5 2.05V14z" /></svg>,
    permCheck: (can) => can('cost')
  },
  {
    id: 'prices',
    label: 'Prices',
    svg: <svg viewBox="0 0 24 24"><path d="M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z" /></svg>,
    permCheck: (can) => can('prices')
  },
  {
    id: 'team',
    label: 'Team',
    svg: <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>,
    permCheck: (can) => can('team')
  }
];

export const BottomNav: React.FC = () => {
  const { tab, setTab, can, me } = useApp();

  if (!me.id || !me.active) return null;

  const visible = TAB_DEFS.filter(t => t.permCheck(can));
  if (!visible.length) return null;

  return (
    <nav id="nv">
      {visible.map(t => {
        const isActive = t.id === tab;
        return (
          <button
            key={t.id}
            type="button"
            className={isActive ? 'a' : ''}
            aria-label={t.label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              setTab(t.id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            {t.svg}
            {t.label}
          </button>
        );
      })}
    </nav>
  );
};
