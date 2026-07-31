import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../mockAuth";
import { DRIVER_NAV_PAGES } from "./driverNavPages";

/**
 * Desktop equivalent of MobileNavBar — same page list/order, hidden below
 * `md` (MobileNavBar takes over there via its own `md:hidden`). Without this,
 * driver pages had zero navigation on wide viewports.
 */
export function DesktopNavBar() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { user } = useAuth();

  const pages = DRIVER_NAV_PAGES.filter((page) => page.allowedUserTypes.includes(user.userTypeId));

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  if (pages.length === 0) return null;

  return (
    <nav aria-label="Navigation" className="hidden md:block mb-6">
      <div className="rounded-2xl bg-gradient-to-br from-white/55 via-primary/25 to-white/10 p-[1px] shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
        <div className="flex items-center gap-1 rounded-[1.15rem] bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 ring-1 ring-white/10 p-1.5">
          {pages.map((page) => {
            const active = isActive(page.href);
            return (
              <button
                key={page.href}
                type="button"
                onClick={() => {
                  if (!active) navigate(page.href);
                }}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex flex-1 items-center justify-center gap-2 h-11 rounded-xl px-3",
                  "outline-none border-0 cursor-pointer transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "bg-gradient-to-b from-white/20 via-primary/10 to-primary/5 ring-1 ring-white/25 text-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <i className={`bi ${page.icon} text-[16px] ${active ? "text-primary" : ""}`} aria-hidden="true" />
                <span className="text-sm font-medium">{page.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
