import React from "react";

interface GradientDotsBackgroundProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  withAnimatedAura?: boolean;
}

export function GradientDotsBackground({
  children,
  className = "",
  style,
  withAnimatedAura = false,
}: GradientDotsBackgroundProps) {
  const animationStyle = withAnimatedAura ? `
    animation: neonAura 18s ease-in-out infinite alternate;
  ` : '';

  const keyframes = withAnimatedAura ? `
    @keyframes neonAura {
      0% { transform: scale(1); opacity: 1; filter: blur(0); }
      50% { transform: scale(1.05); opacity: 0.95; filter: blur(2px); }
      100% { transform: scale(1.02); opacity: 1; filter: blur(1px); }
    }
  ` : '';

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Remove o background do body para evitar duplicação */
        body:has(.gradient-dots-background) {
          background: transparent !important;
          background-image: none !important;
        }

        body:has(.gradient-dots-background)::before,
        body:has(.gradient-dots-background)::after {
          display: none !important;
        }

        [data-slot="sidebar-inset"]:has(.gradient-dots-background),
        [data-slot="sidebar-inset"]:has(.gradient-dots-background) > main {
          background: transparent !important;
        }

        .gradient-dots-background {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 25%, #e8f0f5 50%, #f1f5f9 75%, #f8fafc 100%);
          background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
          background-size: 24px 24px;
          background-attachment: fixed;
          background-position: 0 0;
          min-height: 100vh;
          position: relative;
          isolation: isolate;
        }

        .gradient-dots-background > *:not(.fixed) {
          position: relative;
          z-index: 1;
        }

        .gradient-dots-background::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          min-width: 100vw;
          height: 100%;
          min-height: 100vh;
          background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.08), transparent 50%),
                      radial-gradient(circle at 80% 10%, rgba(236, 72, 153, 0.08), transparent 45%),
                      radial-gradient(circle at 75% 80%, rgba(14, 165, 233, 0.08), transparent 50%),
                      linear-gradient(135deg, rgba(99, 102, 241, 0.02) 0%, rgba(139, 92, 246, 0.03) 50%, rgba(236, 72, 153, 0.02) 100%);
          pointer-events: none;
          mix-blend-mode: screen;
          z-index: -1;
          filter: blur(14px) saturate(135%);
          ${animationStyle}
        }

        @keyframes liquidGlassBgMove {
          0% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(1.2%, -1%, 0) scale(1.03); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }

        .gradient-dots-background::after {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -2;
          background:
            radial-gradient(900px 380px at 18% 12%, rgba(99, 102, 241, 0.10), transparent 60%),
            radial-gradient(880px 360px at 82% 18%, rgba(236, 72, 153, 0.08), transparent 58%),
            radial-gradient(920px 420px at 70% 86%, rgba(14, 165, 233, 0.08), transparent 62%),
            radial-gradient(740px 340px at 28% 78%, rgba(34, 197, 94, 0.06), transparent 62%);
          filter: blur(18px) saturate(125%);
          opacity: 0.95;
          mix-blend-mode: screen;
          animation: liquidGlassBgMove 22s ease-in-out infinite alternate;
        }

        @media (prefers-reduced-motion: reduce) {
          .gradient-dots-background::after {
            animation: none !important;
          }
          .gradient-dots-background::before {
            animation: none !important;
          }
        }

        ${keyframes}
      `}} />
      <div className={`gradient-dots-background ${className}`} style={style}>
        {children}
      </div>
    </>
  );
}
