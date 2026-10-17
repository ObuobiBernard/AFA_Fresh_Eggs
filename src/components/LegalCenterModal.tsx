import React, { useState, useEffect } from 'react';

export type LegalTab = 'privacy' | 'terms' | 'cookies' | 'refund' | 'business';

interface LegalCenterModalProps {
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalCenterModal: React.FC<LegalCenterModalProps> = ({
  initialTab = 'privacy',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  // Close modal on Escape key press
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
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 2000,
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
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          background: 'var(--cd)',
          borderRadius: '20px',
          padding: '20px'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--bd)', paddingBottom: '12px' }}>
          <div>
            <h2 id="legal-modal-title" style={{ margin: 0, fontSize: '18px' }}>
              Legal, Privacy & Compliance Hub
            </h2>
            <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
              AFA Fresh Eggs Enterprise · Last updated: October 2026
            </small>
          </div>
          <button
            type="button"
            className="s"
            onClick={onClose}
            aria-label="Close legal modal"
            style={{ fontSize: '18px', padding: '4px 10px', minWidth: '32px' }}
          >
            ×
          </button>
        </div>

        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Legal Sections"
          style={{
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '14px',
            borderBottom: '1px solid var(--bd)'
          }}
        >
          {[
            { id: 'privacy', label: '🔒 Privacy' },
            { id: 'terms', label: '⚖️ Terms' },
            { id: 'cookies', label: '🍪 Cookies' },
            { id: 'refund', label: '🔄 Returns' },
            { id: 'business', label: '🏢 Business' }
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as LegalTab)}
              style={{
                width: 'auto',
                minHeight: 'auto',
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: activeTab === tab.id ? 'var(--g)' : 'var(--bg)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--tx)',
                border: '1px solid var(--bd)',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', fontSize: '13px', lineHeight: 1.6 }}>
          {activeTab === 'privacy' && (
            <div>
              <h3 style={{ color: 'var(--tx)', fontSize: '15px' }}>Privacy Policy</h3>
              <p>
                <b>AFA Fresh Eggs</b> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Enterprise&rdquo;) is committed to protecting the privacy of our staff, farm partners, wholesale buyers, and retail customers. This Privacy Policy outlines our data handling practices in compliance with the <b>Ghana Data Protection Act, 2012 (Act 843)</b> and international fair information principles.
              </p>

              <b>1. Data We Collect</b>
              <p style={{ margin: '4px 0 10px' }}>
                We strictly collect only information necessary for wholesale egg distribution, order fulfillment, and financial accounting:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
                <li><b>Staff & Team:</b> Name, email address, contact phone number, and shop assignment.</li>
                <li><b>Customers:</b> Contact name and phone number for receipt delivery (via WhatsApp / SMS) and credit balance reminders.</li>
                <li><b>Operational Records:</b> Egg crate orders, transaction dates, pickup quantities, payments, and transport expenses.</li>
              </ul>

              <b>2. Purpose of Processing</b>
              <p style={{ margin: '4px 0 10px' }}>
                We process your data exclusively to:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
                <li>Record daily crate sales, farm collections, and current stock across our distribution shops.</li>
                <li>Generate and send transparent sales receipts and monthly statements of account.</li>
                <li>Prevent discrepancies and maintain auditable financial records for the enterprise.</li>
              </ul>

              <b>3. Data Minimization & No Third-Party Selling</b>
              <p style={{ margin: '4px 0 10px' }}>
                We never sell, rent, or lease personal customer or staff records to third-party marketing companies, data brokers, or advertising networks.
              </p>

              <b>4. Security & Storage</b>
              <p style={{ margin: '4px 0 10px' }}>
                Operational records are stored securely using encrypted cloud database infrastructure with strict row-level role access control. Local offline caching is stored exclusively in your device&apos;s browser storage.
              </p>

              <b>5. Your Rights</b>
              <p style={{ margin: '4px 0 10px' }}>
                Under the Data Protection Act (Act 843), you have the right to request access to, correction of, or deletion of your personal records. For inquiries, contact management at <b>markbrownwane@gmail.com</b>.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div>
              <h3 style={{ color: 'var(--tx)', fontSize: '15px' }}>Terms & Conditions of Service</h3>
              <p>
                Welcome to <b>AFA Fresh Eggs Manager</b>. By accessing this web application or conducting trade with AFA Fresh Eggs, you agree to be bound by these Terms and Conditions.
              </p>

              <b>1. Nature of Business</b>
              <p style={{ margin: '4px 0 10px' }}>
                AFA Fresh Eggs operates as a commercial distributor and wholesaler of farm-fresh crated poultry eggs within Greater Accra and across Ghana.
              </p>

              <b>2. Order Fulfillment & Inspection</b>
              <p style={{ margin: '4px 0 10px' }}>
                Crates must be physically inspected by the customer or recipient at the point of sale, shop collection, or direct vehicle delivery. Title and risk of loss pass to the buyer upon receipt and verification of crate counts.
              </p>

              <b>3. Credit Terms & Payment Due Dates</b>
              <p style={{ margin: '4px 0 10px' }}>
                Credit sales are extended solely to verified wholesale partners at management discretion:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
                <li>All credit purchases must be settled within the agreed timeframe (standard: 7 to 14 days).</li>
                <li>Payments may be executed via Cash or registered Mobile Money numbers.</li>
                <li>AFA Fresh Eggs reserves the right to suspend future crate deliveries to accounts with overdue balances.</li>
              </ul>

              <b>4. User Accounts & Authorized Access</b>
              <p style={{ margin: '4px 0 10px' }}>
                Staff login credentials are assigned by the Director/CEO. Attendants and drivers are responsible for keeping passwords confidential and recording truthful entries for egg counts, payments, and transport costs.
              </p>

              <b>5. Governing Law & Jurisdiction</b>
              <p style={{ margin: '4px 0 10px' }}>
                These terms are governed by and construed in accordance with the <b>Laws of the Republic of Ghana</b>. Any disputes shall be submitted to the competent courts of Greater Accra, Ghana.
              </p>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div>
              <h3 style={{ color: 'var(--tx)', fontSize: '15px' }}>Cookie & Local Storage Policy</h3>
              <p>
                This application does <b>not</b> use third-party marketing, behavioral advertising, or cross-site tracking cookies.
              </p>

              <b>1. What We Store on Your Device</b>
              <p style={{ margin: '4px 0 10px' }}>
                To enable Progressive Web App (PWA) offline capabilities and remember your session, we use your device&apos;s native <b>localStorage</b>:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
                <li><code>afa_me</code>: Securely retains your authenticated staff profile for uninterrupted access.</li>
                <li><code>afa_cache</code>: Enables offline recording so attendants can record sales and pickups without internet interruptions.</li>
                <li><code>afa_theme</code>: Remembers your preferred display theme (Light or Dark mode).</li>
                <li><code>afa_cookie_consent</code>: Stores your acknowledgment of this notice.</li>
              </ul>

              <b>2. Strictly Necessary Functional Storage</b>
              <p style={{ margin: '4px 0 10px' }}>
                Under standard international privacy regulations (ePrivacy Directive, GDPR, and Ghana DPA), storage mechanisms strictly necessary for the technical operation and security of a web service requested by the user are exempt from prior consent, but are documented here with full transparency.
              </p>

              <b>3. How to Clear Local Storage</b>
              <p style={{ margin: '4px 0 10px' }}>
                You can clear your local cached data at any time via your browser settings or by tapping &ldquo;Sign Out&rdquo; in the app.
              </p>
            </div>
          )}

          {activeTab === 'refund' && (
            <div>
              <h3 style={{ color: 'var(--tx)', fontSize: '15px' }}>Freshness Guarantee & Return Policy</h3>
              <p>
                At AFA Fresh Eggs, we take pride in delivering top-grade farm-fresh poultry eggs direct from vetted commercial farms every week.
              </p>

              <b>1. Inspection Upon Delivery</b>
              <p style={{ margin: '4px 0 10px' }}>
                Because poultry eggs are perishable agricultural goods:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
                <li>Buyers are advised to inspect crate integrity, shell quality, and size grading at the time of delivery or pickup.</li>
                <li>Documented transit breakages identified during delivery must be noted immediately with the driver or stall attendant.</li>
              </ul>

              <b>2. Quality Claims Window</b>
              <p style={{ margin: '4px 0 10px' }}>
                Any latent freshness or breakage concerns must be reported to AFA Fresh Eggs management within <b>24 hours</b> of receipt with photographic evidence or physical return of the affected crates.
              </p>

              <b>3. Resolution & Credit Notes</b>
              <p style={{ margin: '4px 0 10px' }}>
                For verified quality issues, AFA Fresh Eggs will promptly provide an immediate crate replacement or issue a credit deduction applied to your next delivery statement.
              </p>
            </div>
          )}

          {activeTab === 'business' && (
            <div>
              <h3 style={{ color: 'var(--tx)', fontSize: '15px' }}>Company Information & Legal Identity</h3>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px', background: 'var(--bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--bd)' }}>
                <img
                  src="/assets/bernard.jpg"
                  alt="Bernard Owusu Obuobi, Founder and Director of AFA Fresh Eggs Enterprise"
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--g)'
                  }}
                  onError={(e) => {
                    // Fallback to relative path if hosted on subpath
                    (e.target as HTMLImageElement).src = './assets/bernard.jpg';
                  }}
                />
                <div>
                  <b style={{ fontSize: '15px', color: 'var(--tx)', display: 'block' }}>Bernard Owusu Obuobi</b>
                  <small style={{ color: 'var(--g)', fontWeight: 600, display: 'block' }}>Founder & Managing Director</small>
                  <small style={{ color: 'var(--mu)', display: 'block' }}>AFA Fresh Eggs Enterprise</small>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', lineHeight: 1.8 }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ color: 'var(--mu)', width: '38%' }}><b>Enterprise:</b></td>
                    <td>AFA Fresh Eggs Enterprise</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ color: 'var(--mu)' }}><b>Industry:</b></td>
                    <td>Agricultural Wholesale & Retail Distribution (Poultry Eggs)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ color: 'var(--mu)' }}><b>Primary Hubs:</b></td>
                    <td>Main Shop (Adenta) · Market Shop (Madina Market, Accra)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ color: 'var(--mu)' }}><b>Official Email:</b></td>
                    <td><a href="mailto:markbrownwane@gmail.com" style={{ color: 'var(--g)' }}>markbrownwane@gmail.com</a></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ color: 'var(--mu)' }}><b>Applicable Laws:</b></td>
                    <td>Laws of the Republic of Ghana (Food and Agriculture / DPA Act 843)</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--mu)' }}><b>Distribution Motto:</b></td>
                    <td><i>From The Farm, Every Week</i></td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '14px', padding: '10px', background: 'rgba(31, 94, 59, 0.08)', borderRadius: '8px', border: '1px solid var(--gb)' }}>
                <small style={{ color: 'var(--tx)', display: 'block' }}>
                  <b>Consumer Protection Notice:</b> All claims on our platform relate strictly to commercial egg grading, freshness, and inventory distribution. No unsupported claims or artificial marketing reviews are published.
                </small>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--bd)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ width: '100%', padding: '10px', fontSize: '13px' }}
          >
            Close & Return to App
          </button>
        </div>
      </div>
    </div>
  );
};
