import type { CSSProperties, ReactNode } from 'react';

interface GradientDotsBackgroundProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Port of logix-sphere-frontend-nextjs's GradientDotsBackground: a fixed
 * dotted-grid + slow-drifting liquid-glass blob background used behind every
 * mobile page in that app. Ported near-verbatim (own <style> tag, same
 * keyframes) but renamed to `.driver-gradient-dots-bg` to avoid colliding
 * with any other class in this much larger host app.
 */
export function GradientDotsBackground({ children, className = '', style }: GradientDotsBackgroundProps) {
  return (
    <>
      <style>{`
        .driver-gradient-dots-bg {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 25%, #e8f0f5 50%, #f1f5f9 75%, #f8fafc 100%);
          background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
          background-size: 24px 24px;
          background-attachment: fixed;
          background-position: 0 0;
          min-height: 100%;
          position: relative;
          isolation: isolate;
        }

        .driver-gradient-dots-bg > *:not(.fixed) {
          position: relative;
          z-index: 1;
        }

        .driver-gradient-dots-bg::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -1;
          background: radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.1), transparent 50%),
                      radial-gradient(circle at 80% 10%, rgba(99, 102, 241, 0.08), transparent 45%),
                      radial-gradient(circle at 75% 80%, rgba(14, 165, 233, 0.08), transparent 50%),
                      linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.02) 100%);
          mix-blend-mode: screen;
          filter: blur(14px) saturate(135%);
        }

        @keyframes driverLiquidGlassBgMove {
          0% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(1.2%, -1%, 0) scale(1.03); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }

        .driver-gradient-dots-bg::after {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -2;
          background:
            radial-gradient(900px 380px at 18% 12%, rgba(16, 185, 129, 0.1), transparent 60%),
            radial-gradient(880px 360px at 82% 18%, rgba(99, 102, 241, 0.08), transparent 58%),
            radial-gradient(920px 420px at 70% 86%, rgba(14, 165, 233, 0.08), transparent 62%);
          filter: blur(18px) saturate(125%);
          opacity: 0.95;
          mix-blend-mode: screen;
          animation: driverLiquidGlassBgMove 22s ease-in-out infinite alternate;
        }

        @media (prefers-reduced-motion: reduce) {
          .driver-gradient-dots-bg::after {
            animation: none !important;
          }
        }
      `}</style>
      <div className={`driver-gradient-dots-bg ${className}`} style={style}>
        {children}
      </div>
    </>
  );
}
