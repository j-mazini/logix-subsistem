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

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: 'bi-house-door-fill', label: 'Home', route: '/dashboard' },
  { href: '/profile', icon: 'bi-building', label: 'My Profile', route: '/profile' },
  { href: '/drivers', icon: 'bi-people-fill', label: 'Drivers', route: '/drivers' },
  { href: '/vetting-admin', icon: 'bi-check-circle', label: 'Driver Vetting', route: '/vetting-admin' },
  { href: '/vehicles', icon: 'bi-truck', label: 'Vehicles', route: '/vehicles' },
  { href: '/contracts', icon: 'bi-file-earmark-text', label: 'Contracts', route: '/contracts' },
  { href: '/sop-feed', icon: 'bi-journal-bookmark-fill', label: 'SOP Feed', route: '/sop-feed' },
  { href: '/route-balance', icon: 'bi-shuffle', label: 'Route Balance', route: '/route-balance' },
  { href: '/route-balancer', icon: 'bi-diagram-3-fill', label: 'Route Balancer', route: '/route-balancer' },
  { href: '/daily-operations-management', icon: 'bi-clock-history', label: 'Daily Operations Management', route: '/daily-operations-management' },
  { href: '/week-planner', icon: 'bi-calendar-week', label: 'Week Planner', route: '/week-planner' },
  { href: '/assets', icon: 'bi-phone', label: 'Assets', route: '/assets' },
  { href: '/invoices', icon: 'bi-receipt', label: 'Invoices', route: '/invoices' },
  { href: '/adhoc-invoice-management', icon: 'bi-file-plus', label: 'Ad-hoc Invoice System', route: '/adhoc-invoice-management' },
  { href: '/daily-financial-insights', icon: 'bi-graph-up', label: 'Daily Financial Insights', route: '/daily-financial-insights' },
  { href: '/daily-operations-reports', icon: 'bi-bar-chart', label: 'Daily Operation Insights', route: '/daily-operations-reports' },
  { href: '/vendor-performance', icon: 'bi-speedometer', label: 'Vendor Performance', route: '/vendor-performance' },
  { href: '/requests-admin', icon: 'bi-inbox', label: 'Vendor Requests', route: '/requests-admin' },
  { href: '/announcements', icon: 'bi-megaphone-fill', label: 'Announcements', route: '/announcements' },
  { href: '/select', icon: 'bi-arrow-left-right', label: 'Select access', route: '/select', switchItem: true },
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
