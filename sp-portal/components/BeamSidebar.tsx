'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
import './beam-sidebar.css';

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'bi-house-door-fill', label: 'Home' },
  { href: '/sp-portal/profile', icon: 'bi-building', label: 'My Profile' },
  { href: '/sp-portal/drivers', icon: 'bi-people-fill', label: 'Drivers' },
  { href: '/sp-portal/vetting-admin', icon: 'bi-check-circle', label: 'Driver Vetting' },
  { href: '/sp-portal/vehicles', icon: 'bi-truck', label: 'Vehicles' },
  { href: '/sp-portal/contracts', icon: 'bi-file-earmark-text', label: 'Contracts' },
  { href: '/sp-portal/sop-feed', icon: 'bi-journal-bookmark-fill', label: 'SOP Feed' },
  { href: '/sp-portal/route-balance', icon: 'bi-shuffle', label: 'Route Balance' },
  { href: '/sp-portal/daily-operations-management', icon: 'bi-clock-history', label: 'Daily Operations Management' },
  { href: '/sp-portal/week-planner', icon: 'bi-calendar-week', label: 'Week Planner' },
  { href: '/sp-portal/assets', icon: 'bi-phone', label: 'Assets' },
  { href: '/sp-portal/adhoc-invoice-management', icon: 'bi-file-plus', label: 'Ad-hoc Invoice System' },
  { href: '/sp-portal/daily-financial-insights', icon: 'bi-graph-up', label: 'Daily Financial Insights' },
  { href: '/sp-portal/daily-operations-reports', icon: 'bi-bar-chart', label: 'Daily Operation Insights' },
  { href: '/sp-portal/vendor-performance', icon: 'bi-speedometer', label: 'Vendor Performance' },
  { href: '/sp-portal/requests-admin', icon: 'bi-inbox', label: 'Vendor Requests' },
] as const;

const SWITCH_ITEM = { href: '/access-select', icon: 'bi-arrow-left-right', label: 'Select access' };

export function BeamSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((o) => !o);
  const close = () => setOpen(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        close();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <div
        className={`beam-overlay${open ? ' visible' : ''}`}
        id="beamOverlay"
        aria-hidden={!open}
        onClick={close}
      />
      <nav
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
          onClick={toggle}
        >
          <i className="bi bi-list beam-icon-menu" />
          <i className="bi bi-x-lg beam-icon-close" />
        </button>
        <div className="beam-rail" aria-hidden="true" />
        <div className="beam-plates">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`beam-plate${pathname === item.href ? ' active' : ''}`}
            >
              <i className={`bi ${item.icon} beam-plate-icon`} />
              <span>{item.label}</span>
            </Link>
          ))}
          <Link href={SWITCH_ITEM.href} className="beam-plate beam-plate--switch">
            <i className={`bi ${SWITCH_ITEM.icon} beam-plate-icon`} />
            <span>{SWITCH_ITEM.label}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
