import type { ReactNode } from 'react';
import { BeamSidebar } from './BeamSidebar';
import { AdminHeaderPill, AdminHeaderMenu, useAdminHeaderPill } from './AdminHeaderUserPill';
import { useCurrentSp } from '../hooks/useCurrentSp';

interface PortalLayoutProps {
  /** Extra class on the outermost wrapper — carries page-scoped selectors like .sp-profile-page (not body-qualified in the source CSS, so any ancestor of .page-inner works). */
  pageClassName?: string;
  /** Class on <main>, e.g. "sp-profile-main" — mirrors vendor-admin-main + <page>-main from the static markup. */
  mainClassName: string;
  title: string;
  /** Extra class on the .admin-header row, e.g. "sp-profile-page-header". */
  headerClassName?: string;
  children: ReactNode;
}

export function PortalLayout({ pageClassName, mainClassName, title, headerClassName, children }: PortalLayoutProps) {
  const sp = useCurrentSp();
  const menuControls = useAdminHeaderPill();

  return (
    <div className={`sidebar-wrapper${pageClassName ? ` ${pageClassName}` : ''}`} id="sidebarWrapper">
      <div className="sidebar-gap" id="sidebarGap" aria-hidden="true" />
      <BeamSidebar sp={sp} />

      <div className="sidebar-inset" id="sidebarInset">
        <div className="liquid-glass-page-bg" aria-hidden="true" />
        <div className="page-container">
          <div className="page-inner">
            <main className={`vendor-admin-main ${mainClassName}`}>
              <div className={`admin-header d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3${headerClassName ? ` ${headerClassName}` : ''}`}>
                <h1 className="admin-header-title">{title}</h1>
                <AdminHeaderPill sp={sp} controls={menuControls} />
              </div>
              <AdminHeaderMenu sp={sp} controls={menuControls} />

              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
