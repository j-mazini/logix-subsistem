import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useModalBehavior } from '../hooks/useModalBehavior';
import {
  formatExpiryDate,
  type DocumentExpiryEntry,
} from '../pages/Compliance/utils/expirationUtils';
import { documentTypeLabel } from '../pages/Compliance/utils/documentLabels';
import './ComplianceAlertsModal.css';

interface ComplianceAlertsModalProps {
  /** Já ordenadas do pior para o melhor por getDocumentExpiryEntries. */
  entries: DocumentExpiryEntry[];
  onClose: () => void;
}

/**
 * Texto da contagem, do ponto de vista de quem tem de agir: o que interessa
 * é quanto tempo resta (ou há quanto tempo se falhou), não a data em si —
 * essa aparece à parte.
 */
function countdownLabel(days: number): string {
  if (days < 0) {
    const overdue = Math.abs(days);
    return overdue === 1 ? 'Expired yesterday' : `Expired ${overdue} days ago`;
  }
  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

/** Vermelho para vencido, âmbar a menos de duas semanas, neutro acima. */
function countdownTone(days: number): string {
  if (days < 0) return 'cxa-countdown--expired';
  if (days <= 14) return 'cxa-countdown--urgent';
  return 'cxa-countdown--soon';
}

/**
 * Lista os vendors com documentos vencidos ou a vencer, aberta a partir da
 * linha de aviso do cartão de Announcements.
 *
 * Portaled para document.body pela mesma razão que AnnouncementModal: o
 * cartão vive dentro de .admin-header, que tem backdrop-filter e por isso é
 * bloco contentor de descendentes position:fixed.
 */
export function ComplianceAlertsModal({ entries, onClose }: ComplianceAlertsModalProps) {
  useModalBehavior(onClose);

  const expiredCount = entries.filter((e) => e.daysRemaining < 0).length;

  return createPortal(
    <div
      className="annc-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Document expirations"
    >
      <div className="annc-modal-backdrop" onClick={onClose} />

      <div className="annc-modal-dialog cxa-dialog">
        <div className="annc-modal-header">
          <h2 className="annc-modal-title">
            <i className="bi bi-exclamation-triangle-fill cxa-title-icon" aria-hidden="true" />
            Document expirations
            {entries.length > 0 && ` (${entries.length})`}
          </h2>
          <button type="button" className="annc-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="annc-modal-body">
          {entries.length === 0 ? (
            <p className="annc-modal-empty">No documents are expired or expiring soon.</p>
          ) : (
            <>
              <p className="cxa-summary">
                {expiredCount > 0 && (
                  <>
                    <strong>{expiredCount}</strong>
                    {expiredCount === 1 ? ' document has' : ' documents have'} already expired.{' '}
                  </>
                )}
                {entries.length - expiredCount > 0 && (
                  <>
                    <strong>{entries.length - expiredCount}</strong> approaching expiry.
                  </>
                )}
              </p>

              <ul className="cxa-list">
                {entries.map((entry) => (
                  <li
                    key={`${entry.profileId}-${entry.documentName}`}
                    className={`cxa-item${entry.daysRemaining < 0 ? ' cxa-item--expired' : ''}`}
                  >
                    <div className="cxa-item-main">
                      <p className="cxa-vendor">{entry.profileName}</p>
                      {entry.email && <p className="cxa-email">{entry.email}</p>}
                      <p className="cxa-doc">
                        <span className="cxa-doc-type">{documentTypeLabel(entry.type)}</span>
                        {entry.documentName}
                      </p>
                    </div>

                    <div className="cxa-item-side">
                      <span className={`cxa-countdown ${countdownTone(entry.daysRemaining)}`}>
                        {countdownLabel(entry.daysRemaining)}
                      </span>
                      <span className="cxa-date">{formatExpiryDate(entry.expiresAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="annc-modal-footer">
          <Link to="/compliance" className="annc-modal-cta" onClick={onClose}>
            Go to Compliance <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
