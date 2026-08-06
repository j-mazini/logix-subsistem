import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../mockAuth";
import { useModalBehavior } from "../../../hooks/useModalBehavior";
import { DRIVER_NAV_PAGES, type DriverNavPage } from "./driverNavPages";
import { ACCENT_TEXT } from "./accentColors";

/**
 * Flat bottom tab bar — 4 primary tabs (the daily-use driver screens) plus a
 * "More" tab opening a sheet with the remaining 7. All 11 pages don't fit
 * one screen width with visible labels; a horizontal-scroll bar was the
 * first cut, this is the app-store-style "primary tabs + More" alternative.
 *
 * Uses explicit slate/white colors rather than the shadcn-style
 * background/foreground/muted-foreground/border/ring tokens the old bar
 * used — those aren't defined in tailwind.config.cjs's theme (empty
 * `extend`), so utilities like `bg-background` and `text-muted-foreground`
 * silently compile to nothing (verified against the built CSS).
 */
const PRIMARY_HREFS = ["/my-deliveries", "/my-schedule", "/subcontractor", "/mobile-invoice"];

export function MobileNavBar() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  useModalBehavior(() => setMoreOpen(false), moreOpen);

  const pages = DRIVER_NAV_PAGES.filter((page) => page.allowedUserTypes.includes(user.userTypeId));
  const primaryPages = PRIMARY_HREFS.map((href) => pages.find((p) => p.href === href)).filter((p): p is DriverNavPage => p !== undefined);
  const morePages = pages.filter((p) => !PRIMARY_HREFS.includes(p.href));

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isMoreActive = morePages.some((p) => isActive(p.href));

  const handleClick = (href: string) => {
    setMoreOpen(false);
    if (isActive(href)) return;
    navigate(href);
  };

  if (pages.length === 0) return null;

  return (
    <>
      <nav
        aria-label="Navigation"
        className="fixed inset-x-0 bottom-0 z-50 md:hidden border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex w-full">
          {primaryPages.map((page) => {
            const active = isActive(page.href);
            return (
              <button
                key={page.href}
                type="button"
                onClick={() => handleClick(page.href)}
                aria-label={page.label}
                aria-current={active ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 px-1 outline-none border-0 bg-transparent cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <i
                  className={["bi", page.icon, "text-[20px] leading-none", active ? ACCENT_TEXT[page.accent] : "text-slate-400"].join(" ")}
                  aria-hidden="true"
                />
                <span className={["text-[10px] font-medium leading-none", active ? ACCENT_TEXT[page.accent] : "text-slate-400"].join(" ")}>
                  {page.label}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="More"
            aria-expanded={moreOpen}
            aria-current={isMoreActive ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 px-1 outline-none border-0 bg-transparent cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <i className={["bi", moreOpen ? "bi-x-lg" : "bi-grid-3x3-gap-fill", "text-[20px] leading-none", isMoreActive || moreOpen ? "text-slate-900" : "text-slate-400"].join(" ")} aria-hidden="true" />
            <span className={["text-[10px] font-medium leading-none", isMoreActive || moreOpen ? "text-slate-900" : "text-slate-400"].join(" ")}>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-semibold text-slate-900">More</span>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 outline-none border-0 bg-transparent cursor-pointer hover:bg-slate-100">
                <i className="bi bi-x-lg text-[16px]" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 px-3 pb-2">
              {morePages.map((page) => {
                const active = isActive(page.href);
                return (
                  <button
                    key={page.href}
                    type="button"
                    onClick={() => handleClick(page.href)}
                    aria-label={page.label}
                    aria-current={active ? "page" : undefined}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-1 outline-none border-0 bg-transparent cursor-pointer hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <i className={["bi", page.icon, "text-[22px] leading-none", active ? ACCENT_TEXT[page.accent] : "text-slate-500"].join(" ")} aria-hidden="true" />
                    <span className={["text-[11px] font-medium leading-none text-center", active ? ACCENT_TEXT[page.accent] : "text-slate-600"].join(" ")}>
                      {page.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
