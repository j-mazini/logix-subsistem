import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { avisoExpirationDate, type AvisoRecord } from '../data/announcementsData';
import './AnnouncementModal.css';

interface AnnouncementModalProps {
  announcements: AvisoRecord[];
  onClose: () => void;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB');
}

/**
 * Lists every announcement that is live right now, opened from the
 * Announcements card.
 *
 * Portaled to document.body on purpose: the card is a child of
 * .admin-header, which has backdrop-filter and therefore acts as a
 * containing block for position:fixed descendants — rendering in place
 * would trap the overlay inside the header.
 */
export function AnnouncementModal({ announcements, onClose }: AnnouncementModalProps) {
  useModalBehavior(onClose);

  return createPortal(
    <div className="annc-modal" role="dialog" aria-modal="true" aria-label="Active announcements">
      <div className="annc-modal-backdrop" onClick={onClose} />

      <div className="annc-modal-dialog">
        <div className="annc-modal-header">
          <h2 className="annc-modal-title">
            <i className="bi bi-megaphone-fill" aria-hidden="true" />
            Active announcements
            {announcements.length > 0 && ` (${announcements.length})`}
          </h2>
          <button
            type="button"
            className="annc-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="annc-modal-body">
          {announcements.length === 0 ? (
            <p className="annc-modal-empty">No announcements are active right now.</p>
          ) : (
            announcements.map((aviso) => (
              <div key={aviso.id} className="annc-modal-item">
                <h3 className="annc-modal-page-title">
                  <span
                    className={`annc-modal-urgency-dot annc-modal-urgency-${aviso.urgency || 'Normal'}`}
                    aria-hidden="true"
                  />
                  {aviso.title || 'Untitled announcement'}
                </h3>
                {aviso.message && <p className="annc-modal-page-msg">{aviso.message}</p>}
                <p className="annc-modal-page-expire">
                  Expires {formatDate(avisoExpirationDate(aviso))}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="annc-modal-footer">
          <Link to="/announcements" className="annc-modal-cta" onClick={onClose}>
            Go to Announcements <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
