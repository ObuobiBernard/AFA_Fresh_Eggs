import React from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './views/HomeView';
import { CollectView } from './views/CollectView';
import { SellView } from './views/SellView';
import { CreditView } from './views/CreditView';
import { CostsView } from './views/CostsView';
import { PricesView } from './views/PricesView';
import { TeamView } from './views/TeamView';
import { LoginView } from './views/LoginView';
import { PendingView } from './views/PendingView';
import { SplashScreen } from './components/SplashScreen';

export const AppContent: React.FC = () => {
  const { me, can, tab, toastMsg } = useApp();

  let currentView: React.ReactNode = null;

  if (!me.id) {
    currentView = <LoginView />;
  } else if (!me.active || !can('home')) {
    currentView = <PendingView />;
  } else {
    switch (tab) {
      case 'home':
        currentView = <HomeView />;
        break;
      case 'collect':
        currentView = <CollectView />;
        break;
      case 'sell':
        currentView = <SellView />;
        break;
      case 'credit':
        currentView = <CreditView />;
        break;
      case 'costs':
        currentView = <CostsView />;
        break;
      case 'prices':
        currentView = <PricesView />;
        break;
      case 'team':
        currentView = <TeamView />;
        break;
      default:
        currentView = <HomeView />;
        break;
    }
  }

  return (
    <>
      <Header />
      <main id="m">{currentView}</main>
      <BottomNav />
      {toastMsg && <div id="toast">{toastMsg}</div>}
    </>
  );
};
