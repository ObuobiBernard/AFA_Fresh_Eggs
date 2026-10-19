import React, { useState, useEffect } from 'react';

export type LegalTab = 'privacy' | 'terms' | 'cookies' | 'returns' | 'business';

interface LegalCenterModalProps {
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalCenterModal: React.FC<LegalCenterModalProps> = ({
  initialTab = 'privacy',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="c"
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          background: 'var(--cd)',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 id="legal-modal-title" style={{ margin: 0, fontSize: '18px' }}>
              📜 Legal & Compliance Center
            </h2>
            <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
              AFA Fresh Eggs Enterprise · Official Policies
            </small>
          </div>
          <button
            type="button"
            className="s"
            onClick={onClose}
            aria-label="Close legal modal"
            style={{ fontSize: '18px', padding: '4px 10px', minHeight: 'auto' }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '12px',
            borderBottom: '1px solid var(--bd)'
          }}
        >
          {[
            { id: 'privacy', label: '🔒 Privacy' },
            { id: 'terms', label: '📄 Terms' },
            { id: 'cookies', label: '🍪 Cookies' },
            { id: 'returns', label: '🥚 Quality & Returns' },
            { id: 'business', label: '🏢 Enterprise' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className="s"
              onClick={() => setActiveTab(tab.id as LegalTab)}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                minHeight: 'auto',
                whiteSpace: 'nowrap',
                background: activeTab === tab.id ? 'var(--g)' : 'var(--bg)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--tx)',
                fontWeight: activeTab === tab.id ? 700 : 500
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content body */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', fontSize: '13px', lineHeight: 1.6 }}>
          {activeTab === 'privacy' && (
            <div>
              <h3>Privacy Notice (Ghana Data Protection Act, 2012 / Act 843)</h3>
              <p>
                <b>Data Controller:</b> AFA Fresh Eggs Enterprise, Accra, Ghana.
              </p>
              <p>
                <b>What we collect:</b> Staff member name, business email, authorized phone numbers, customer names, and customer phone numbers strictly for generating digital order receipts and credit settlement statements.
              </p>
              <p>
                <b>Purpose of processing:</b> Inventory management, crated-egg distribution, wholesale sales records, and debt settlement tracking.
              </p>
              <p>
                <b>No Third-Party Sharing:</b> Customer records and wholesale transaction data are never sold, rented, or shared with third-party advertisers or data brokers.
              </p>
              <p>
                <b>Data Rights:</b> Customers and staff have the right to inspect, update, or request the deletion of their contact information by contacting enterprise management at <code>markbrownwane@gmail.com</code>.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div>
              <h3>Terms of Wholesale Egg Sales & Distribution</h3>
              <p>
                <b>1. Commercial Supply:</b> All sales transactions recorded in this application represent wholesale commercial deliveries or cash pickups of crated farm eggs.
              </p>
              <p>
                <b>2. Inspection upon Receipt:</b> Customers are required to inspect egg crate integrity and shell counts upon physical handover at our Adenta Main Shop, Madina Market Shop, or upon vehicle delivery.
              </p>
              <p>
                <b>3. Credit Terms:</b> Customers purchasing on credit agree to the agreed due period (standard 7 to 14 days). Settlements may be executed via Cash or registered Mobile Money.
              </p>
              <p>
                <b>4. Jurisdiction:</b> Commercial disputes shall be governed by the commercial laws of the Republic of Ghana.
              </p>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div>
              <h3>Storage & Cookie Policy</h3>
              <p>
                <b>Essential Local Storage:</b> This Progressive Web Application utilizes browser <code>localStorage</code> and service worker cache strictly for:
              </p>
              <ul>
                <li>Maintaining authenticated staff sessions across app restarts</li>
                <li>Caching stock tallies and recent transactions for instant offline accessibility</li>
                <li>Storing interface preferences (Light / Dark mode)</li>
                <li>Storing cookie consent acknowledgments</li>
              </ul>
              <p>
                <b>Zero Tracking Cookies:</b> We do not use third-party tracking cookies, marketing beacons, or cross-site fingerprinting technologies.
              </p>
            </div>
          )}

          {activeTab === 'returns' && (
            <div>
              <h3>Freshness Guarantee & Returns Policy</h3>
              <p>
                <b>Fresh Farm Source:</b> Eggs supplied by AFA Fresh Eggs are farm-collected weekly to guarantee peak freshness and shelf stability.
              </p>
              <p>
                <b>Breakage & Transit Claims:</b> In the event of cracked or broken eggs resulting from delivery transit, notifications must be submitted within 24 hours of delivery.
              </p>
              <p>
                <b>Remedy:</b> Validated claims are credited toward the customer balance or replaced on the subsequent delivery schedule.
              </p>
            </div>
          )}

          {activeTab === 'business' && (
            <div>
              <h3>Enterprise & Operational Identity</h3>
              <p>
                <b>Trade Name:</b> AFA Fresh Eggs Enterprise
              </p>
              <p>
                <b>Principal Hubs:</b>
                <br />• Main Shop (Adenta, Greater Accra, Ghana)
                <br />• Market Shop (Madina Market, Greater Accra, Ghana)
              </p>
              <p>
                <b>Founder & Managing Director:</b> Bernard Owusu Obuobi
              </p>
              <p>
                <b>Official Inquiries:</b> <code>markbrownwane@gmail.com</code>
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid var(--bd)', textAlign: 'right' }}>
          <button type="button" onClick={onClose} style={{ minHeight: 'auto', padding: '8px 16px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
