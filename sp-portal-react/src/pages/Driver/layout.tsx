import { useCallback, useRef, useState } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DriverRequestsProvider } from './context/DriverRequestsContext';
import { DriverSessionProvider, useDriverSession } from './context/DriverSessionContext';

type Ripple = { id: string; x: number };

interface NavPage {
  href: string;
  label: string;
  icon: string;
}

const PAGES: NavPage[] = [
  { href: '/driver/insights', label: 'Insights', icon: 'bi-speedometer' },
  { href: '/driver/profile', label: 'Profile', icon: 'bi-person' },
  { href: '/driver/deductions', label: 'Deductions', icon: 'bi-graph-down-arrow' },
  { href: '/driver/month', label: 'Month', icon: 'bi-calendar-event' },
  { href: '/driver/performance', label: 'Performance', icon: 'bi-bar-chart-line' },
  { href: '/driver/invoice', label: 'Invoice', icon: 'bi-file-earmark-text' },
  { href: '/driver/requests', label: 'Requests', icon: 'bi-inbox' },
];

/**
 * Faithful (simplified) port of the reference app's MobileNavBar
 * (app/(private)/components/MobileNavBar.tsx): a floating liquid-glass dock
 * with a pointer-follow glow, chromatic tint, ripple-on-tap, and a
 * layoutId-animated active pill that glides between tabs.
 *
 * Dropped vs. the original: multi-role (admin/supervisor/vendor) tab
 * filtering and the desktop-viewport show/hide branching — this Driver
 * Portal only ever renders as the driver role, on mobile.
 */
function MobileNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const navRef = useRef<HTMLDivElement | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const glowOpacity = useMotionValue(0);
  const pointerXSpring = useSpring(pointerX, { stiffness: 420, damping: 42, mass: 0.55 });
  const pointerYSpring = useSpring(pointerY, { stiffness: 420, damping: 42, mass: 0.55 });
  const glowXSpring = useSpring(glowX, { stiffness: 380, damping: 38, mass: 0.6 });
  const glowYSpring = useSpring(glowY, { stiffness: 380, damping: 38, mass: 0.6 });
  const glowOpacitySpring = useSpring(glowOpacity, { stiffness: 260, damping: 30, mass: 0.5 });

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(`${href}/`);

  const spawnRipple = useCallback((x: number) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setRipples((prev) => [...prev, { id, x }].slice(-6));
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      const el = navRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointerX.set(x);
      pointerY.set(y);
      glowX.set(x - 90);
      glowY.set(y - 90);
      glowOpacity.set(1);
    },
    [glowOpacity, glowX, glowY, pointerX, pointerY, reduceMotion],
  );

  const handlePointerLeave = useCallback(() => {
    if (reduceMotion) return;
    glowOpacity.set(0);
  }, [glowOpacity, reduceMotion]);

  const liquidSpecular = useMotionTemplate`radial-gradient(180px circle at ${pointerXSpring}px ${pointerYSpring}px, rgba(255,255,255,0.34), rgba(255,255,255,0.12) 26%, rgba(255,255,255,0) 62%)`;
  const liquidChroma = useMotionTemplate`radial-gradient(260px circle at ${pointerXSpring}px ${pointerYSpring}px, rgba(16,185,129,0.18), rgba(59,130,246,0.12) 35%, rgba(14,165,233,0.08) 55%, rgba(0,0,0,0) 72%)`;

  return (
    <motion.nav
      aria-label="Navigation"
      initial={reduceMotion ? false : { y: 18, opacity: 0 }}
      animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="driver-tw-scope fixed inset-x-0 bottom-0 z-50 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]"
    >
      <div className="mx-auto w-full max-w-[560px] px-3">
        <div className="rounded-2xl bg-gradient-to-br from-white/55 via-emerald-400/25 to-white/10 p-[1px] shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
          <div
            ref={navRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={(e) => {
              const el = navRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              spawnRipple(e.clientX - rect.left);
            }}
            className="relative overflow-hidden rounded-[1.15rem] bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/55 ring-1 ring-white/40"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-60" />

            {!reduceMotion && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: liquidSpecular, opacity: glowOpacitySpring, mixBlendMode: 'overlay' }}
              />
            )}
            {!reduceMotion && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: liquidChroma, opacity: glowOpacitySpring, mixBlendMode: 'color-dodge' }}
              />
            )}
            {!reduceMotion && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 h-[180px] w-[180px] rounded-full bg-emerald-500/20 blur-2xl"
                style={{ x: glowXSpring, y: glowYSpring, opacity: glowOpacitySpring }}
              />
            )}

            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {ripples.map((r) => (
                <motion.span
                  key={r.id}
                  className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-500/25"
                  style={{ left: r.x }}
                  initial={{ opacity: 0.25, scale: 0 }}
                  animate={{ opacity: 0, scale: 40 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  onAnimationComplete={() => setRipples((prev) => prev.filter((x) => x.id !== r.id))}
                />
              ))}
            </div>

            <div className="flex w-full items-stretch justify-between gap-1 p-1.5">
              {PAGES.map((page, index) => {
                const active = isActive(page.href);
                return (
                  <button
                    key={page.href}
                    type="button"
                    onClick={() => !active && navigate(page.href)}
                    aria-label={page.label}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex h-12 min-w-0 flex-1 select-none items-center justify-center rounded-xl px-1 outline-none border-0 bg-transparent cursor-pointer ${
                      active ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="driver-mobile-nav-active"
                        className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 via-emerald-400/10 to-emerald-500/5 ring-1 ring-white/25 shadow-[0_10px_26px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.30),inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-[2px]"
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 36, mass: 0.55 }}
                      />
                    )}
                    {active && (
                      <motion.span
                        layoutId="driver-mobile-nav-dot"
                        className="absolute bottom-1 left-1/2 z-20 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-600 shadow-[0_0_0_4px_rgba(255,255,255,0.12),0_6px_16px_rgba(16,185,129,0.35)]"
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }}
                      />
                    )}
                    <motion.span
                      className="relative z-10 flex flex-col items-center justify-center"
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: index * 0.03 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    >
                      <motion.i
                        className={`bi ${page.icon} leading-none text-[20px] ${active ? 'text-emerald-700' : 'text-slate-500'}`}
                        aria-hidden="true"
                        animate={reduceMotion ? undefined : { y: active ? -1 : 0, scale: active ? 1.08 : 1 }}
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }}
                      />
                      <span className="text-[0.6rem] font-semibold leading-none mt-1">{page.label}</span>
                    </motion.span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

function DriverShell() {
  const { isAuthenticated } = useDriverSession();
  if (!isAuthenticated) return <Navigate to="/driver-login" replace />;

  return (
    <div className="driver-tw-scope min-h-screen flex flex-col bg-slate-50">
      <main className="flex-1 overflow-y-auto px-3 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto w-full max-w-[640px]">
          <Outlet />
        </div>
      </main>
      <MobileNavBar />
    </div>
  );
}

/** Shared layout route for the Driver Portal's 7 tabs — mirrors
 *  Vetting/layout.tsx's shape (a domain-scoped Provider + Outlet). */
export function DriverLayout() {
  return (
    <DriverSessionProvider>
      <DriverRequestsProvider>
        <DriverShell />
      </DriverRequestsProvider>
    </DriverSessionProvider>
  );
}
