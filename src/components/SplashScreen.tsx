import React from 'react';

interface SplashScreenProps {
  onDismiss: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#1F5E3B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#ffffff',
        textAlign: 'center',
        animation: 'fadeOut 0.4s ease 2.2s forwards'
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          width: '88px',
          height: '88px',
          borderRadius: '24px',
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          marginBottom: '20px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
          animation: 'pulseEgg 2s infinite ease-in-out'
        }}
      >
        🥚
      </div>

      <h1 style={{ fontSize: '26px', margin: '0 0 6px', fontWeight: 800, letterSpacing: '-0.5px' }}>
        AFA Fresh Eggs
      </h1>

      <p style={{ fontSize: '14px', margin: '0 0 24px', opacity: 0.85, maxWidth: '280px', lineHeight: 1.4 }}>
        Daily Sales, Collections, Stock & Customer Credit
      </p>

      <div
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(255,255,255,0.25)',
          borderTopColor: '#ffffff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
    </div>
  );
};
