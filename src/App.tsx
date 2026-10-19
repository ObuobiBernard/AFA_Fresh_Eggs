import React, { useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SplashScreen } from './components/SplashScreen';
import { CookieBanner } from './components/CookieBanner';
import { LegalCenterModal } from './components/LegalCenterModal';
import { usePageSEO } from './hooks/usePageSEO';

import { HomeView } from './views/HomeView';
import { CollectView } from './views/CollectView';
import { SellView } from './views/SellView';
import { CreditView } from './views/CreditView';
import { CostsView } from './views/CostsView';
import { PricesView } from './views/PricesView';
import { TeamView } from './views/TeamView';
import { DomainView } from './views/DomainView';
import { NotFoundView } from './views/NotFoundView';
import { PendingView } from './views/PendingView';
import { LoginView } from './views/LoginView';
import { TabKey } from './types';

const VALID_TABS: TabKey[] = ['home', 'sell', 'collect', 'credit', 'costs', 'prices', 'team', 'domain', '404'];

const AppContent: React.FC = () => {
  const { me, tab, setTab, showSplash, setShowSplash, toastMsg, legalTab, openLegal, closeLegal } = useApp();

  // Dynamic Page Title, Meta Description, OpenGraph, and Canonical URL
  usePageSEO(!me.id ? 'login' : tab);

  // Sync tab with URL query parameter on mount and state changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramTab = params.get('tab') as TabKey;
    if (paramTab && VALID_TABS.includes(paramTab)) {
      setTab(paramTab);
    }
  }, [setTab]);

  useEffect(() => {
    if (!me.id) return;
    const url = new URL(window.location.href);
    if (tab === 'home') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  }, [tab, me.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, [setShowSplash]);

  return (
    <div className="app-container">
      {/* Mandatory Blocking Cookie Banner */}
      <CookieBanner onOpenLegal={openLegal} />

      {/* Splash Screen */}
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}

      {/* Unauthenticated: Show Login */}
      {!me.id ? (
        <main className="main-content" style={{ paddingBottom: '30px' }}>
          <LoginView />
        </main>
      ) : !me.active ? (
        /* Account Pending / Blocked */
        <main className="main-content" style={{ paddingBottom: '30px' }}>
          <Header />
          <PendingView />
        </main>
      ) : (
        /* Authenticated & Authorized */
        <>
          <Header />
          <main className="main-content">
            {tab === 'home' && <HomeView />}
            {tab === 'sell' && <SellView />}
            {tab === 'collect' && <CollectView />}
            {tab === 'credit' && <CreditView />}
            {tab === 'costs' && <CostsView />}
            {tab === 'prices' && <PricesView />}
            {tab === 'team' && <TeamView />}
            {tab === 'domain' && <DomainView />}
            {tab === '404' && <NotFoundView />}
            {!VALID_TABS.includes(tab) && <NotFoundView />}
          </main>
          <BottomNav />
        </>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}

      {/* Legal & Compliance Hub Modal */}
      {legalTab && (
        <LegalCenterModal initialTab={legalTab} onClose={closeLegal} />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};
