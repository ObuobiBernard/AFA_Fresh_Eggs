import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Automatically transition to login after animation completes
    const timer = setTimeout(() => {
      setFadingOut(true);
      setTimeout(onFinish, 600); // Allow fade-out transition
    }, 4200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  const handleSkip = () => {
    setFadingOut(true);
    setTimeout(onFinish, 200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9F5EA',
        backgroundImage: `
          radial-gradient(circle at 12% 10%, rgba(255, 255, 230, 0.9) 0%, rgba(249, 245, 234, 0.4) 45%),
          linear-gradient(135deg, #FFF9ED 0%, #F5EFE0 50%, #EFE8D6 100%)
        `,
        overflow: 'hidden',
        opacity: fadingOut ? 0 : 1,
        transform: fadingOut ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        userSelect: 'none'
      }}
    >
      {/* Sunbeams radiating from upper left */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '-15%',
          width: '90vw',
          height: '90vw',
          maxWidth: '800px',
          maxHeight: '800px',
          background: 'conic-gradient(from 120deg at 10% 10%, rgba(255, 255, 215, 0.45) 0deg, transparent 20deg, rgba(255, 255, 220, 0.35) 45deg, transparent 65deg, rgba(255, 255, 220, 0.4) 85deg, transparent 110deg)',
          filter: 'blur(16px)',
          pointerEvents: 'none',
          animation: 'sunbeamPulse 5s ease-in-out infinite alternate'
        }}
      />

      {/* Floating ambient green leaves */}
      {[
        { x: '10%', y: '25%', size: 28, rot: 35, delay: '0s', dur: '6s' },
        { x: '82%', y: '18%', size: 34, rot: -45, delay: '0.4s', dur: '7s' },
        { x: '15%', y: '78%', size: 32, rot: 15, delay: '0.8s', dur: '5.5s' },
        { x: '78%', y: '72%', size: 36, rot: -20, delay: '1.2s', dur: '6.5s' },
        { x: '35%', y: '85%', size: 24, rot: 55, delay: '0.2s', dur: '8s' },
        { x: '68%', y: '30%', size: 26, rot: 75, delay: '1.5s', dur: '6.2s' },
        { x: '22%', y: '45%', size: 22, rot: -15, delay: '0.6s', dur: '7.5s' },
        { x: '88%', y: '50%', size: 30, rot: 40, delay: '1.0s', dur: '5.8s' }
      ].map((leaf, idx) => (
        <svg
          key={idx}
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            left: leaf.x,
            top: leaf.y,
            width: `${leaf.size}px`,
            height: `${leaf.size}px`,
            opacity: 0.82,
            filter: 'drop-shadow(0 4px 6px rgba(31, 94, 59, 0.15))',
            pointerEvents: 'none',
            animation: `floatLeaf ${leaf.dur} ease-in-out infinite alternate ${leaf.delay}`
          }}
        >
          <path
            d="M50 5 C75 25 85 65 50 95 C15 65 25 25 50 5 Z"
            fill="url(#leafGrad)"
          />
          <path
            d="M50 15 Q50 50 50 85"
            stroke="#2b6b44"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
          <defs>
            <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#439A52" />
              <stop offset="100%" stopColor="#1F5E3B" />
            </linearGradient>
          </defs>
        </svg>
      ))}

      {/* Main Animated Branding Stage */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '560px',
          width: '90%',
          padding: '24px',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* Animated Badge & Egg Container */}
        <div
          style={{
            position: 'relative',
            width: '210px',
            height: '210px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Swirling Sparkle Ribbon Trail */}
          <svg
            viewBox="0 0 200 200"
            style={{
              position: 'absolute',
              inset: '-15px',
              width: 'calc(100% + 30px)',
              height: 'calc(100% + 30px)',
              animation: 'spinSparkle 3.5s cubic-bezier(0.2, 0.8, 0.4, 1) forwards',
              pointerEvents: 'none'
            }}
          >
            <circle
              cx="100"
              cy="100"
              r="84"
              fill="none"
              stroke="url(#sparkleGrad)"
              strokeWidth="4"
              strokeDasharray="220 300"
              strokeLinecap="round"
              filter="drop-shadow(0 0 10px #F5A623)"
            />
            <defs>
              <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="40%" stopColor="#F5D061" stopOpacity="0.9" />
                <stop offset="80%" stopColor="#7FC77A" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1F5E3B" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Golden Sunburst Rays behind wreath */}
          <div
            style={{
              position: 'absolute',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245, 166, 35, 0.3) 0%, rgba(255, 246, 224, 0) 70%)',
              animation: 'eggGlow 2.5s ease-in-out infinite alternate',
              pointerEvents: 'none'
            }}
          />

          {/* Leafy Wreath and Radiant Golden Egg SVG */}
          <svg
            viewBox="0 0 120 120"
            style={{
              width: '100%',
              height: '100%',
              filter: 'drop-shadow(0 12px 28px rgba(31, 94, 59, 0.22))',
              animation: 'wreathZoom 1.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards'
            }}
          >
            {/* Background disc */}
            <circle cx="60" cy="60" r="54" fill="#FBF7EC" />

            {/* Outer Laurel Leaf Wreath Border */}
            <circle cx="60" cy="60" r="51" fill="none" stroke="#1F5E3B" strokeWidth="3" opacity="0.4" />
            <circle cx="60" cy="60" r="48" fill="#1A4A30" />

            {/* Woven Laurel leaves around wreath perimeter */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
              <g key={i} transform={`rotate(${deg} 60 60)`}>
                <ellipse cx="60" cy="14" rx="5" ry="10" fill="#2E7D4E" transform="rotate(-20 60 14)" />
                <ellipse cx="60" cy="14" rx="4" ry="9" fill="#4CAF50" transform="rotate(20 60 14)" opacity="0.85" />
              </g>
            ))}

            {/* Inner Ring */}
            <circle cx="60" cy="60" r="38" fill="#133824" />

            {/* Inner woven bottom nest leaves */}
            <path
              d="M32 78 C42 86 78 86 88 78 C80 92 40 92 32 78 Z"
              fill="#2E7D4E"
            />
            <path
              d="M38 74 C48 82 72 82 82 74 C75 86 45 86 38 74 Z"
              fill="#7FC77A"
              opacity="0.8"
            />

            {/* The Farm Fresh Egg Shell */}
            <path
              d="M60 26 C75 26 84 44 84 58 C84 73 73 82 60 82 C47 82 36 73 36 58 C36 44 45 26 60 26 Z"
              fill="url(#eggShellGrad)"
              filter="drop-shadow(0 4px 10px rgba(0, 0, 0, 0.15))"
            />

            {/* Inner Egg highlight ring */}
            <path
              d="M60 30 C72 30 79 45 79 58 C79 70 70 77 60 77 C50 77 41 70 41 58 C41 45 48 30 60 30 Z"
              fill="#FFFFFF"
              opacity="0.95"
            />

            {/* Radiant Golden Egg Yolk */}
            <circle
              cx="60"
              cy="62"
              r="12"
              fill="url(#yolkGrad)"
              filter="drop-shadow(0 2px 6px rgba(245, 166, 35, 0.55))"
            />
            <ellipse cx="57" cy="58" rx="3.5" ry="2" fill="#FFFFFF" opacity="0.75" />

            {/* Rooster Crest Badge at bottom of Wreath */}
            <g transform="translate(60, 102) scale(0.7)">
              <circle cx="0" cy="0" r="10" fill="#1F5E3B" stroke="#F5A623" strokeWidth="1.5" />
              <path
                d="M-4 -3 C-1 -6 3 -4 4 -2 C6 -1 5 3 2 4 C-1 5 -4 2 -4 -3 Z"
                fill="#F5A623"
              />
              <polygon points="4,-1 8,-2 5,1" fill="#D32F2F" />
              <circle cx="-1" cy="-6" r="1.5" fill="#D32F2F" />
              <circle cx="2" cy="-5" r="1.5" fill="#D32F2F" />
            </g>

            {/* Gradients */}
            <defs>
              <linearGradient id="eggShellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="70%" stopColor="#FFF7E6" />
                <stop offset="100%" stopColor="#F5E4C4" />
              </linearGradient>
              <radialGradient id="yolkGrad" cx="45%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#FFDE6A" />
                <stop offset="45%" stopColor="#F5A623" />
                <stop offset="100%" stopColor="#D97706" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Brand Typography with Staggered Fade & Slide */}
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            animation: 'textReveal 1.2s ease-out 0.8s both'
          }}
        >
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '44px',
              fontWeight: 800,
              letterSpacing: '5px',
              color: '#1F5E3B',
              lineHeight: 1,
              textShadow: '0 2px 10px rgba(31, 94, 59, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <span>A</span>
            <span>F</span>
            <span>A</span>
          </div>

          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '5px',
              textTransform: 'uppercase',
              color: '#345241',
              marginTop: '4px'
            }}
          >
            Fresh Eggs
          </div>

          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: '12px',
              letterSpacing: '1.5px',
              color: '#708375',
              marginTop: '2px',
              textTransform: 'uppercase'
            }}
          >
            From The Farm, Every Week
          </div>
        </div>

        {/* Pulsing loading progress line */}
        <div
          style={{
            width: '120px',
            height: '3px',
            background: 'rgba(31, 94, 59, 0.15)',
            borderRadius: '99px',
            marginTop: '24px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '100%',
              background: 'linear-gradient(90deg, #7FC77A, #1F5E3B, #F5A623)',
              animation: 'progressFill 3.8s ease-in-out forwards'
            }}
          />
        </div>
      </div>

      {/* Skip Button */}
      <button
        type="button"
        onClick={handleSkip}
        className="icon-btn"
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '20px',
          background: 'rgba(31, 94, 59, 0.12)',
          color: '#1F5E3B',
          fontSize: '12px',
          fontWeight: 600,
          padding: '6px 14px',
          borderRadius: '99px',
          border: '1px solid rgba(31, 94, 59, 0.25)',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        Skip ➔
      </button>

      {/* Embedded Animation Keyframes */}
      <style>{`
        @keyframes sunbeamPulse {
          0% { transform: scale(1) rotate(0deg); opacity: 0.7; }
          100% { transform: scale(1.08) rotate(4deg); opacity: 0.95; }
        }
        @keyframes floatLeaf {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-16px) rotate(14deg); }
        }
        @keyframes spinSparkle {
          0% { transform: rotate(0deg) scale(0.6); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.85; }
        }
        @keyframes wreathZoom {
          0% { transform: scale(0.4) rotate(-15deg); opacity: 0; }
          65% { transform: scale(1.06) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes eggGlow {
          0% { transform: scale(0.85); opacity: 0.3; }
          100% { transform: scale(1.2); opacity: 0.75; }
        }
        @keyframes textReveal {
          0% { transform: translateY(16px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes progressFill {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
      `}</style>
    </div>
  );
};
