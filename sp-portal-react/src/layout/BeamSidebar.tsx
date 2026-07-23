import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { withSp } from '../hooks/useCurrentSp';

interface NavItem {
  icon: string;
  label: string;
  /** Internal SPA route; absent means the page is not built yet ("Soon"). */
  route?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Planning & Operations',
    items: [
      { icon: 'bi-calendar-week', label: 'Week Planner', route: '/week-planner' },
      { icon: 'bi-shuffle', label: 'Route Balance', route: '/route-balance' },
      { icon: 'bi-clock-history', label: 'Daily Operations Management', route: '/daily-operations-management' },
    ],
  },
  {
    label: 'Setup',
    items: [
      { icon: 'bi-people-fill', label: 'Vendor', route: '/drivers' },
      { icon: 'bi-truck', label: 'Vehicles', route: '/vehicles' },
      { icon: 'bi-phone', label: 'Assets', route: '/assets' },
      { icon: 'bi-file-earmark-text', label: 'Contract Management', route: '/contracts' },
    ],
  },
  {
    label: 'Feed & Announcements',
    items: [
      { icon: 'bi-journal-bookmark-fill', label: 'Feed', route: '/sop-feed' },
      { icon: 'bi-megaphone-fill', label: 'Announcements', route: '/announcements' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { icon: 'bi-building', label: 'Service Provider Profile', route: '/profile' },
      { icon: 'bi-shield-check', label: 'Compliance' },
      { icon: 'bi-check-circle', label: 'Vetting', route: '/vetting-dashboard' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { icon: 'bi-receipt', label: 'Invoices', route: '/invoices' },
      { icon: 'bi-dash-circle', label: 'Deductions' },
      { icon: 'bi-file-plus', label: 'Ad-hoc Invoice System', route: '/adhoc-invoice-management' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { icon: 'bi-graph-up', label: 'Financial Insights', route: '/daily-financial-insights' },
      { icon: 'bi-bar-chart', label: 'Operation Insights', route: '/daily-operations-reports' },
      { icon: 'bi-speedometer', label: 'Vendor Performance', route: '/vendor-performance' },
    ],
  },
  {
    label: 'Vendor Requests',
    items: [{ icon: 'bi-inbox', label: 'Vendor Requests', route: '/requests-admin' }],
  },
  {
    label: 'Trace & Queries',
    items: [{ icon: 'bi-search', label: 'Trace & Queries' }],
  },
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
          <div className="beam-panel-title">Service Provider Pages</div>
          <Link
            to={withSp('/dashboard', sp)}
            className={`beam-plate beam-plate--root${location.pathname === '/dashboard' ? ' active' : ''}`}
          >
            <i className="bi bi-house-door-fill beam-plate-icon" />
            <span>Home</span>
          </Link>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="beam-group">
              <div className="beam-group-label">{group.label}</div>
              <div className="beam-group-items">
                {group.items.map((item) => {
                  if (item.route === undefined) {
                    return (
                      <div key={item.label} className="beam-branch">
                        <div className="beam-plate beam-plate--soon">
                          <i className={`bi ${item.icon} beam-plate-icon`} />
                          <span>{item.label}</span>
                          <span className="beam-plate-soon-badge">Soon</span>
                        </div>
                      </div>
                    );
                  }
                  const isActive = location.pathname === item.route;
                  return (
                    <div key={item.label} className="beam-branch">
                      <Link to={withSp(item.route, sp)} className={`beam-plate${isActive ? ' active' : ''}`}>
                        <i className={`bi ${item.icon} beam-plate-icon`} />
                        <span>{item.label}</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <Link
            to={withSp('/select', sp)}
            className={`beam-plate beam-plate--root beam-plate--switch${location.pathname === '/select' ? ' active' : ''}`}
          >
            <i className="bi bi-arrow-left-right beam-plate-icon" />
            <span>Select access</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
