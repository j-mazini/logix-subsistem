import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { AnnouncementModal } from './AnnouncementModal';
import './AnnouncementBox.css';

interface AnnouncementBoxProps {
  /**
   * Render below the page header rather than as a flex child inside it —
   * used by the pages that supply their own `header` to PortalLayout.
   */
  standalone?: boolean;
}

/**
 * The Announcements card that used to live only in the Dashboard header.
 * PortalLayout now renders it on every portal page, inside the header row,
 * and it is the single global surface for both feeds:
 *
 * - the most urgent live DHL/SP broadcast (getActiveAvisos() sorts them),
 *   with a "+N more" pill, falling back to the original empty copy; clicking
 *   it opens AnnouncementModal with the full active list;
 * - a one-line roll-up of Compliance document-expiration alerts, shown only
 *   when there are drivers with expired or expiring documents.
 */
export function AnnouncementBox({ standalone = false }: AnnouncementBoxProps) {
  const { systemAnnouncements, complianceAlerts } = useAnnouncements();
  const [modalOpen, setModalOpen] = useState(false);
  const latest = systemAnnouncements[0];
  const extra = Math.max(0, systemAnnouncements.length - 1);

  const expiredCount = complianceAlerts.filter((a) =>
    a.documents.some((d) => d.status === 'expired'),
  ).length;
  const expiringCount = complianceAlerts.length - expiredCount;

  return (
    <div
      className={`sp-announcement-header-box${standalone ? ' sp-announcement-header-box--standalone' : ''}`}
    >
      <div className="sp-announcement-header-card">
        <div className="sp-announcement-header-head">
          <h3 className="sp-announcement-header-title">
            <i className="bi bi-megaphone-fill" aria-hidden="true" /> Announcements
          </h3>
          <p className="sp-announcement-header-desc small text-muted mb-0">
            Announcements from DHL appear here.
          </p>
        </div>
        <div className="sp-announcement-header-body">
          <button
            type="button"
            className="sp-announcement-box-trigger"
            aria-label="View active announcements"
            aria-haspopup="dialog"
            onClick={() => setModalOpen(true)}
          >
            <span className="sp-announcement-box-text">
              {latest ? latest.title || 'Untitled announcement' : 'No announcements yet.'}
            </span>
            {extra > 0 && <span className="sp-announcement-box-count">+{extra} more</span>}
          </button>

          {complianceAlerts.length > 0 && (
            <Link
              to="/compliance"
              className="sp-announcement-box-trigger sp-announcement-box-trigger--warning"
              aria-label="View compliance document expirations"
            >
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
              <span className="sp-announcement-box-text">
                {expiredCount > 0 && `${expiredCount} with expired documents`}
                {expiredCount > 0 && expiringCount > 0 && ', '}
                {expiringCount > 0 && `${expiringCount} expiring soon`}
              </span>
            </Link>
          )}
        </div>
      </div>

      {modalOpen && (
        <AnnouncementModal
          announcements={systemAnnouncements}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
