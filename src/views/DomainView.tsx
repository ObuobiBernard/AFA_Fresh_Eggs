import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const DomainView: React.FC = () => {
  const { setTab, toast } = useApp();
  const [customDomain, setCustomDomain] = useState(() => {
    try {
      return localStorage.getItem('afa_custom_domain') || 'afafresheggs.com';
    } catch {
      return 'afafresheggs.com';
    }
  });
  const [copied, setCopied] = useState<string | null>(null);

  const currentHost = window.location.hostname;
  const cloudRunOrigin = 'ais-pre-fog77d2b7zaa27zgfoahen-957175851061.europe-west2.run.app';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast(`Copied ${label} to clipboard`);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    localStorage.setItem('afa_custom_domain', clean);
    setCustomDomain(clean);
    toast(`Custom domain saved: ${clean}`);
  };

  return (
    <>
      <Breadcrumbs currentTab="domain" />

      <div className="c">
        <h1>🌐 Custom Domain & DNS Settings</h1>
        <p style={{ color: 'var(--mu)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 16px' }}>
          Connect your custom domain (e.g. <b>afafresheggs.com</b> or <b>app.afafresheggs.com</b>) to this AFA Fresh Eggs management portal.
        </p>

        {/* Current status */}
        <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <small style={{ color: 'var(--mu)', display: 'block' }}>Active Host</small>
            <b style={{ fontSize: '14px', fontFamily: 'monospace' }}>{currentHost}</b>
          </div>
          <span className="sync-pill" style={{ background: 'rgba(37, 211, 102, 0.15)', color: 'var(--g)', fontSize: '11px' }}>
            🔒 HTTPS Active
          </span>
        </div>

        {/* Domain form */}
        <form onSubmit={handleSaveDomain} style={{ marginBottom: '20px' }}>
          <label>
            Primary Custom Domain
            <input
              placeholder="e.g. afafresheggs.com or app.afafresheggs.com"
              value={customDomain}
              onChange={e => setCustomDomain(e.target.value)}
            />
          </label>
          <button type="submit" style={{ width: '100%' }}>
            Save Custom Domain Configuration
          </button>
        </form>

        {/* DNS Table */}
        <h3>Required DNS Records (Your Domain Registrar)</h3>
        <p style={{ fontSize: '13px', color: 'var(--mu)', margin: '0 0 10px' }}>
          Add these DNS records in your domain provider (e.g. Namecheap, GoDaddy, Cloudflare, Google Domains):
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {/* CNAME */}
          <div className="l" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>Subdomain (CNAME)</span>
              <button
                type="button"
                className="s"
                onClick={() => copyToClipboard(cloudRunOrigin, 'CNAME target')}
                style={{ fontSize: '11px', padding: '3px 8px', minHeight: 'auto' }}
              >
                {copied === 'CNAME target' ? '✓ Copied' : 'Copy Target'}
              </button>
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--mu)', width: '100%', wordBreak: 'break-all' }}>
              Host: <b>app</b> or <b>portal</b> ➔ Value: <b>{cloudRunOrigin}</b>
            </div>
          </div>

          {/* Apex A record */}
          <div className="l" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>Root Apex (@) Redirect</span>
              <button
                type="button"
                className="s"
                onClick={() => copyToClipboard(`https://${customDomain}`, 'Domain URL')}
                style={{ fontSize: '11px', padding: '3px 8px', minHeight: 'auto' }}
              >
                {copied === 'Domain URL' ? '✓ Copied' : 'Copy URL'}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--mu)' }}>
              Forward <b>{customDomain}</b> to <b>https://{customDomain}/</b> with Automatic SSL
            </div>
          </div>
        </div>

        {/* Useful quick links */}
        <div style={{ borderTop: '1px solid var(--bd)', paddingTop: '14px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="s"
            onClick={() => setTab('home')}
            style={{ flex: 1, minHeight: 'auto', padding: '8px' }}
          >
            ← Back to Dashboard
          </button>
          <a
            href="mailto:markbrownwane@gmail.com?subject=AFA%20Eggs%20Custom%20Domain%20Setup"
            className="btn-link"
            style={{ flex: 1, minHeight: 'auto', padding: '8px', textAlign: 'center', background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--tx)', fontSize: '13px' }}
          >
            Contact IT Support
          </a>
        </div>
      </div>
    </>
  );
};
