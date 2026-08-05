import { useEffect, type ReactNode } from 'react';
import { BeamSidebar } from './BeamSidebar';
import { AdminHeaderPill, AdminHeaderMenu, useAdminHeaderPill } from './AdminHeaderUserPill';
import { AnnouncementBox } from './AnnouncementBox';
import { useCurrentSp } from '../hooks/useCurrentSp';

interface PortalLayoutProps {
  /** Extra class on the outermost wrapper — carries page-scoped selectors like .sp-profile-page (not body-qualified in the source CSS, so any ancestor of .page-inner works). */
  pageClassName?: string;
  /** Full class list for <main>, taken verbatim from the original page's <main> element — not every page uses "vendor-admin-main", so callers must include it themselves when the source markup does. */
  mainClassName: string;
  title?: string;
  /** Bootstrap icon class shown before the title, e.g. "bi-megaphone-fill". */
  titleIcon?: string;
  /** One-line description under the title. */
  subtitle?: string;
  /**
   * Page-specific header controls — search inputs, action buttons — rendered
   * in the right-hand column, before the user pill. This is how a page keeps
   * its own header affordances without replacing the standard header.
   */
  actions?: ReactNode;
  /** Extra class on the .admin-header row, e.g. "sp-profile-page-header". Ignored when `header` is passed. */
  headerClassName?: string;
  /**
   * Escape hatch that replaces the whole standard header row. Prefer
   * title/titleIcon/subtitle/actions: pages using this opt out of the shared
   * layout, so the announcements card falls below their markup instead of
   * sitting centred in the header, and they must render AdminHeaderPill/Menu
   * themselves via useAdminHeaderPill.
   */
  header?: ReactNode;
  /** Drop the Announcements card from this page's header. */
  hideAnnouncements?: boolean;
  children: ReactNode;
}

export function PortalLayout({
  pageClassName,
  mainClassName,
  title,
  titleIcon,
  subtitle,
  actions,
  headerClassName,
  header,
  hideAnnouncements = false,
  children,
}: PortalLayoutProps) {
  const sp = useCurrentSp();
  const menuControls = useAdminHeaderPill();

  // The original static site rendered every portal page with
  // <body class="has-beam-sidebar sp-portal">. Both classes gate large
  // blocks of already-authored responsive CSS (sidebar-beam.css's mobile
  // beam-trigger sizing, sp-portal.css's header column-stacking and page
  // padding below 768/576px) — without them here, that CSS never matched
  // anything and the mobile layout silently fell back to the unscoped,
  // non-stacking desktop rules.
  useEffect(() => {
    document.body.classList.add('has-beam-sidebar', 'sp-portal');
    return () => {
      document.body.classList.remove('has-beam-sidebar', 'sp-portal');
    };
  }, []);

  return (
    <div className={`sidebar-wrapper${pageClassName ? ` ${pageClassName}` : ''}`} id="sidebarWrapper">
      <div className="sidebar-gap" id="sidebarGap" aria-hidden="true" />
      <BeamSidebar sp={sp} />

      <div className="sidebar-inset" id="sidebarInset">
        <div className="liquid-glass-page-bg" aria-hidden="true" />
        <div className="page-container">
          <div className="page-inner">
            <main className={mainClassName}>
              {header !== undefined ? (
                // Pages with their own header markup can't take the box inline,
                // so it sits directly beneath it instead.
                <>
                  {header}
                  {!hideAnnouncements && <AnnouncementBox standalone />}
                </>
              ) : (
                <>
                  {/* Three columns: the side ones are equal width, which is
                      what puts the announcements card on the header's centre
                      line regardless of how long the title or actions are. */}
                  <div className={`admin-header admin-header--with-announcement d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3${headerClassName ? ` ${headerClassName}` : ''}`}>
                    <div className="admin-header-side admin-header-side--start">
                      <h1 className="admin-header-title">
                        {titleIcon && <i className={`bi ${titleIcon}`} aria-hidden="true" />}
                        {title}
                      </h1>
                      {subtitle && <p className="admin-header-subtitle">{subtitle}</p>}
                    </div>

                    {!hideAnnouncements && <AnnouncementBox />}

                    <div className="admin-header-side admin-header-side--end">
                      {actions}
                      <AdminHeaderPill sp={sp} controls={menuControls} />
                    </div>
                  </div>
                  <AdminHeaderMenu controls={menuControls} />
                </>
              )}

              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
