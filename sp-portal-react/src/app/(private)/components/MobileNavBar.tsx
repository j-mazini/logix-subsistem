import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useAuth } from "../mockAuth";
import { DRIVER_NAV_PAGES } from "./driverNavPages";

type Ripple = { id: string; x: number };

export function MobileNavBar() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const navRef = useRef<HTMLElement | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // Pointer-follow glow (motion values => no rerender on move)
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const glowOpacity = useMotionValue(0);
  const pointerXSpring = useSpring(pointerX, { stiffness: 420, damping: 42, mass: 0.55 });
  const pointerYSpring = useSpring(pointerY, { stiffness: 420, damping: 42, mass: 0.55 });
  const glowXSpring = useSpring(glowX, { stiffness: 380, damping: 38, mass: 0.6 });
  const glowYSpring = useSpring(glowY, { stiffness: 380, damping: 38, mass: 0.6 });
  const glowOpacitySpring = useSpring(glowOpacity, {
    stiffness: 260,
    damping: 30,
    mass: 0.5,
  });

  const { user } = useAuth();

  const pages = DRIVER_NAV_PAGES.filter((page) => page.allowedUserTypes.includes(user.userTypeId));

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Route transitions in this SPA are instant client renders (no server
  // round-trip), so unlike the Next.js source there is no navigation-pending
  // skeleton to trigger here — just navigate.
  const handleClick = (href: string) => {
    if (pathname === href || pathname.startsWith(href + "/")) return;
    navigate(href);
  };

  const spawnRipple = useCallback((x: number) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ripple: Ripple = { id, x };
    setRipples((prev) => [...prev, ripple].slice(-6));
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
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
    [glowOpacity, glowX, glowY, pointerX, pointerY, reduceMotion]
  );

  const handlePointerLeave = useCallback(() => {
    if (reduceMotion) return;
    glowOpacity.set(0);
  }, [glowOpacity, reduceMotion]);

  const liquidSpecular = useMotionTemplate`radial-gradient(180px circle at ${pointerXSpring}px ${pointerYSpring}px, rgba(255,255,255,0.34), rgba(255,255,255,0.12) 26%, rgba(255,255,255,0) 62%)`;
  const liquidChroma = useMotionTemplate`radial-gradient(260px circle at ${pointerXSpring}px ${pointerYSpring}px, rgba(59,130,246,0.18), rgba(236,72,153,0.12) 35%, rgba(14,165,233,0.08) 55%, rgba(0,0,0,0) 72%)`;

  // Driver mock persona: bar is always shown (mirrors the source's
  // `showMobileNav = user.userTypeId === DRIVER` branch — Admin/Supervisor
  // desktop-vs-mobile screen gating doesn't apply since this subsystem has
  // no multi-role login).
  if (pages.length === 0) return null;

  return (
    <motion.nav
      aria-label="Navigation"
      initial={reduceMotion ? false : { y: 18, opacity: 0 }}
      animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
      }
      className="pages-nav fixed inset-x-0 bottom-0 z-50 md:hidden pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]"
    >
      <div className="mx-auto w-full max-w-[560px] px-3">
        <div className="rounded-2xl bg-gradient-to-br from-white/55 via-primary/25 to-white/10 p-[1px] shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
          <div
            ref={(node) => {
              navRef.current = node;
            }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={(e) => {
              const el = navRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              spawnRipple(e.clientX - rect.left);
            }}
            className="relative overflow-hidden rounded-[1.15rem] bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 ring-1 ring-white/10"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-60" />

            {!reduceMotion && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: liquidSpecular,
                  opacity: glowOpacitySpring,
                  mixBlendMode: "overlay",
                }}
              />
            )}

            {!reduceMotion && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: liquidChroma,
                  opacity: glowOpacitySpring,
                  mixBlendMode: "color-dodge",
                }}
              />
            )}

            {!reduceMotion && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 h-[180px] w-[180px] rounded-full bg-primary/20 blur-2xl"
                style={{
                  x: glowXSpring,
                  y: glowYSpring,
                  opacity: glowOpacitySpring,
                }}
              />
            )}

            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {ripples.map((r) => (
                <motion.span
                  key={r.id}
                  className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary/25"
                  style={{ left: r.x }}
                  initial={{ opacity: 0.25, scale: 0 }}
                  animate={{ opacity: 0, scale: 40 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }
                  }
                  onAnimationComplete={() => {
                    setRipples((prev) => prev.filter((x) => x.id !== r.id));
                  }}
                />
              ))}
            </div>

            <div className="flex w-full items-stretch justify-between gap-1 p-1.5">
              {pages.map((page, index) => {
                const active = isActive(page.href);

                return (
                  <button
                    key={page.href}
                    type="button"
                    onClick={() => handleClick(page.href)}
                    aria-label={page.label}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "relative flex h-12 min-w-0 flex-1 select-none items-center justify-center",
                      "rounded-xl px-2",
                      "outline-none border-0 bg-transparent cursor-pointer",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      active ? "text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {active && (
                      <motion.span
                        layoutId="mobile-nav-active"
                        className={[
                          "absolute inset-0 rounded-xl",
                          "bg-gradient-to-b from-white/20 via-primary/10 to-primary/5",
                          "ring-1 ring-white/25",
                          "shadow-[0_10px_26px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.30),inset_0_-1px_0_rgba(0,0,0,0.06)]",
                          "backdrop-blur-[2px]",
                        ].join(" ")}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 520, damping: 36, mass: 0.55 }
                        }
                      >
                        {!reduceMotion && (
                          <motion.span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 rounded-xl"
                            style={{
                              background:
                                "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.30) 22%, rgba(255,255,255,0.06) 45%, transparent 70%)",
                              maskImage:
                                "radial-gradient(120px 60px at 50% 35%, black 0%, transparent 70%)",
                              WebkitMaskImage:
                                "radial-gradient(120px 60px at 50% 35%, black 0%, transparent 70%)",
                            }}
                            initial={{ opacity: 0, x: -18 }}
                            animate={{ opacity: 1, x: 18 }}
                            transition={{
                              duration: 1.2,
                              ease: [0.22, 1, 0.36, 1],
                              repeat: Infinity,
                              repeatType: "mirror",
                            }}
                          />
                        )}
                      </motion.span>
                    )}

                    {active && (
                      <motion.span
                        layoutId="mobile-nav-dot"
                        className={[
                          "absolute bottom-1 left-1/2 z-20",
                          "h-1.5 w-1.5 -translate-x-1/2 rounded-full",
                          "bg-primary",
                          "shadow-[0_0_0_4px_rgba(255,255,255,0.12),0_6px_16px_rgba(59,130,246,0.35)]",
                        ].join(" ")}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 520, damping: 34, mass: 0.6 }
                        }
                      />
                    )}

                    <motion.span
                      className="relative z-10 flex flex-col items-center justify-center"
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: index * 0.03 }
                      }
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    >
                      <motion.i
                        className={[
                          "bi",
                          page.icon,
                          "leading-none",
                          active ? "text-primary" : "text-muted-foreground",
                          "text-[22px]",
                        ].join(" ")}
                        aria-hidden="true"
                        animate={
                          reduceMotion
                            ? undefined
                            : {
                                y: active ? -1 : 0,
                                scale: active ? 1.1 : 1,
                              }
                        }
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 520, damping: 34, mass: 0.6 }
                        }
                      />
                      <span className="sr-only">{page.label}</span>
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
