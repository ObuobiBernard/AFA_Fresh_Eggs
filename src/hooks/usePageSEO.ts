import { useEffect } from 'react';
import { TabKey } from '../types';

interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
}

const TAB_METADATA: Record<string, PageMetadata> = {
  home: {
    title: 'Dashboard Overview · AFA Fresh Eggs Enterprise',
    description: 'Real-time egg crate sales, farm collections, stock across Adenta and Madina Market, and customer balance totals.',
    canonical: 'https://afafresheggs.com/'
  },
  sell: {
    title: 'Record Egg Sale & Receipts · AFA Fresh Eggs',
    description: 'Record retail and wholesale egg crate sales, track customer payments, print digital receipts, and share WhatsApp invoices.',
    canonical: 'https://afafresheggs.com/?tab=sell'
  },
  collect: {
    title: 'Farm Collections & Stock Inward · AFA Fresh Eggs',
    description: 'Log weekly farm pickups, egg size batches, farmer cash settlements, and inter-shop delivery transit expenses.',
    canonical: 'https://afafresheggs.com/?tab=collect'
  },
  credit: {
    title: 'Customer Credit & Statement Ledgers · AFA Fresh Eggs',
    description: 'Manage wholesale customer accounts, track outstanding debt balances, and send instant WhatsApp debt settlement statements.',
    canonical: 'https://afafresheggs.com/?tab=credit'
  },
  costs: {
    title: 'Operating Expenses & Transport Costs · AFA Fresh Eggs',
    description: 'Record vehicle fuel, driver allowances, egg crate purchases, and daily operating expenses with instant tally totals.',
    canonical: 'https://afafresheggs.com/?tab=costs'
  },
  prices: {
    title: 'Farm Prices & Egg Size Rate Card · AFA Fresh Eggs',
    description: 'Configure farm buy prices and wholesale selling rates across Small, Medium, Large, and Jumbo egg crate batches.',
    canonical: 'https://afafresheggs.com/?tab=prices'
  },
  team: {
    title: 'Authorized Staff & Role Management · AFA Fresh Eggs',
    description: 'CEO staff authorization portal, attendant shop assignments, role security, and team account activations.',
    canonical: 'https://afafresheggs.com/?tab=team'
  },
  domain: {
    title: 'Custom Domain & Production DNS Settings · AFA Fresh Eggs',
    description: 'Configure custom domains, SSL certificates, CNAME records, and apex DNS routing for AFA Fresh Eggs Enterprise.',
    canonical: 'https://afafresheggs.com/?tab=domain'
  },
  login: {
    title: 'Staff Operations Portal Sign In · AFA Fresh Eggs',
    description: 'Secure staff authentication portal for AFA Fresh Eggs Enterprise attendants, drivers, data entry, and management.',
    canonical: 'https://afafresheggs.com/?tab=login'
  },
  '404': {
    title: 'Page Not Found (404) · AFA Fresh Eggs',
    description: 'The requested egg inventory page or screen could not be located. Return to the dashboard overview.',
    canonical: 'https://afafresheggs.com/404'
  }
};

export function usePageSEO(tab: TabKey | 'domain' | 'login' | '404') {
  useEffect(() => {
    const meta = TAB_METADATA[tab] || TAB_METADATA.home;

    // Update document title
    document.title = meta.title;

    // Update meta description
    let descEl = document.querySelector('meta[name="description"]');
    if (descEl) {
      descEl.setAttribute('content', meta.description);
    } else {
      descEl = document.createElement('meta');
      descEl.setAttribute('name', 'description');
      descEl.setAttribute('content', meta.description);
      document.head.appendChild(descEl);
    }

    // Update OpenGraph Title & Description
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', meta.description);

    // Update Canonical URL
    let canEl = document.querySelector('link[rel="canonical"]');
    if (canEl) {
      canEl.setAttribute('href', meta.canonical);
    } else {
      canEl = document.createElement('link');
      canEl.setAttribute('rel', 'canonical');
      canEl.setAttribute('href', meta.canonical);
      document.head.appendChild(canEl);
    }
  }, [tab]);
}
