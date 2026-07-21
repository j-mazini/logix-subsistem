import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { withSp } from '../hooks/useCurrentSp';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  /** Internal SPA route already migrated; rendered as a <Link> instead of <a>. */
  route?: string;
  switchItem?: boolean;
}

// Only "My Profile" is migrated into this SPA so far; every other entry keeps
// its original relative href pointing at the legacy static site, unchanged,
// so the nav is identical in content/order to sp-portal/profile/index.html
// while migration proceeds page by page.
const NAV_ITEMS: NavItem[] = [
  { href: '../dashboard/index.html', icon: 'bi-house-door-fill', label: 'Home' },
  { href: '/', icon: 'bi-building', label: 'My Profile', route: '/' },
  { href: '../drivers/index.html', icon: 'bi-people-fill', label: 'Drivers' },
  { href: '../vetting-admin/index.html', icon: 'bi-check-circle', label: 'Driver Vetting' },
  { href: '../vehicles/index.html', icon: 'bi-truck', label: 'Vehicles' },
  { href: '../contracts/index.html', icon: 'bi-file-earmark-text', label: 'Contracts' },
  { href: '../sop-feed/index.html', icon: 'bi-journal-bookmark-fill', label: 'SOP Feed' },
  { href: '../route-balance/index.html', icon: 'bi-shuffle', label: 'Route Balance' },
  { href: '../route-balancer/index.html', icon: 'bi-diagram-3-fill', label: 'Route Balancer' },
  { href: '../daily-operations-management/index.html', icon: 'bi-clock-history', label: 'Daily Operations Management' },
  { href: '../week-planner/index.html', icon: 'bi-calendar-week', label: 'Week Planner' },
  { href: '../assets/index.html', icon: 'bi-phone', label: 'Assets' },
  { href: '../invoices/index.html', icon: 'bi-receipt', label: 'Invoices' },
  { href: '../adhoc-invoice-management/index.html', icon: 'bi-file-plus', label: 'Ad-hoc Invoice System' },
  { href: '../daily-financial-insights/index.html', icon: 'bi-graph-up', label: 'Daily Financial Insights' },
  { href: '../daily-operations-reports/index.html', icon: 'bi-bar-chart', label: 'Daily Operation Insights' },
  { href: '../vendor-performance/index.html', icon: 'bi-speedometer', label: 'Vendor Performance' },
  { href: '../requests-admin/index.html', icon: 'bi-inbox', label: 'Vendor Requests' },
  { href: '../announcements/index.html', icon: 'bi-megaphone-fill', label: 'Announcements' },
  { href: '../../dhl/access-select/index.html', icon: 'bi-arrow-left-right', label: 'Select access', switchItem: true },
];

export function BeamSidebar({ sp }: { sp: string }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const beamRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [open]);

  return (
    <>
      <div
        className={`beam-overlay${open ? ' visible' : ''}`}
        id="beamOverlay"
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />
      <nav
        ref={beamRef}
        className="beam-sidebar"
        id="beamSidebar"
        data-state={open ? 'open' : 'closed'}
        role="navigation"
        aria-label="Service Provider menu"
      >
        <button
          type="button"
          className="beam-trigger"
          id="beamTrigger"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
        >
          <i className="bi bi-list beam-icon-menu" />
          <i className="bi bi-x-lg beam-icon-close" />
        </button>
        <div className="beam-rail" aria-hidden="true" />
        <div className="beam-plates">
          {NAV_ITEMS.map((item) => {
            const isActive = item.route !== undefined && location.pathname === item.route;
            const className = `beam-plate${isActive ? ' active' : ''}${item.switchItem ? ' beam-plate--switch' : ''}`;
            if (item.route !== undefined) {
              return (
                <Link key={item.label} to={withSp(item.route, sp)} className={className}>
                  <i className={`bi ${item.icon} beam-plate-icon`} />
                  <span>{item.label}</span>
                </Link>
              );
            }
            return (
              <a key={item.label} href={withSp(item.href, sp)} className={className}>
                <i className={`bi ${item.icon} beam-plate-icon`} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
