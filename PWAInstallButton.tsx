import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed as standalone PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="icon-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          padding: '6px 10px',
          background: 'rgba(255, 255, 255, 0.22)',
          color: '#ffffff',
          fontWeight: 600
        }}
        title="Install AFA Fresh Eggs app to your home screen"
      >
        <span>📲</span>
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="icon-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            padding: '6px 10px',
            background: 'rgba(255, 255, 255, 0.22)',
            color: '#ffffff',
            fontWeight: 600
          }}
          title="Install on iPhone / iPad"
        >
          <span>📲</span>
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="c"
              style={{
                maxWidth: '360px',
                width: '100%',
                margin: 0,
                background: 'var(--cd)',
                textAlign: 'left'
              }}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px' }}>
                <span>📲</span> Install on iPhone / iPad
              </h2>
              <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px', color: 'var(--tx)' }}>
                1. Tap the <b>Share</b> icon in Safari's bottom toolbar (<span style={{ fontSize: '16px' }}>⎋</span> or square with arrow).<br />
                2. Scroll down and tap <b>Add to Home Screen</b> (+).<br />
                3. Tap <b>Add</b> in the top right to launch full-screen with offline support.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                style={{ width: '100%' }}
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
