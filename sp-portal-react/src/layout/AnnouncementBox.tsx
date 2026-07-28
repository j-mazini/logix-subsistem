import { useState } from 'react';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { AnnouncementModal } from './AnnouncementModal';
import { ComplianceAlertsModal } from './ComplianceAlertsModal';
import './AnnouncementBox.css';

/**
 * Tom da contagem regressiva no título. O limiar de 14 dias é o ponto a
 * partir do qual já não dá para renovar um documento com folga — antes
 * disso é informação, a partir daí é urgência.
 */
function countdownTone(days: number): string {
  if (days <= 7) return 'sp-announcement-countdown--critical';
  if (days <= 14) return 'sp-announcement-countdown--urgent';
  return 'sp-announcement-countdown--calm';
}

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
  const { systemAnnouncements, complianceAlerts, expiryEntries, nextExpiry } = useAnnouncements();
  const [modalOpen, setModalOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const latest = systemAnnouncements[0];
  const extra = Math.max(0, systemAnnouncements.length - 1);

  /*
   * Conta documentos, não vendors.
   *
   * `expiringCount` era `complianceAlerts.length - expiredCount`, o que
   * atribuía um único estado a cada vendor: quem tivesse um documento vencido
   * entrava só em `expiredCount` e os seus documentos a vencer desapareciam
   * da contagem — precisamente o vendor sobre quem há mais a fazer.
   *
   * Por documento os dois números são independentes (nenhum documento está
   * nos dois estados) e reconciliam com a lista, que também conta documentos.
   */
  const alertDocuments = complianceAlerts.flatMap((alert) => alert.documents);
  const expiredCount = alertDocuments.filter((d) => d.status === 'expired').length;
  const expiringCount = alertDocuments.filter((d) => d.status === 'expiring-soon').length;

  return (
    <div
      className={`sp-announcement-header-box${standalone ? ' sp-announcement-header-box--standalone' : ''}`}
    >
      <div className="sp-announcement-header-card">
        <div className="sp-announcement-header-head">
          <h3 className="sp-announcement-header-title">
            <i className="bi bi-megaphone-fill" aria-hidden="true" />
            <span className="sp-announcement-header-title-text">Announcements</span>

            {/* Contagem regressiva para o próximo documento a vencer. Vive no
                título porque é o aviso preventivo: aparece em todas as páginas
                e antes de o documento entrar em incumprimento. */}
            {nextExpiry && (
              <button
                type="button"
                className={`sp-announcement-countdown ${countdownTone(nextExpiry.daysRemaining)}`}
                onClick={() => setAlertsOpen(true)}
                title={`${nextExpiry.documentName} — ${nextExpiry.profileName}`}
              >
                <i className="bi bi-hourglass-split" aria-hidden="true" />
                {nextExpiry.daysRemaining === 0
                  ? 'Expires today'
                  : `${nextExpiry.daysRemaining}d to next expiry`}
              </button>
            )}
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
            <button
              type="button"
              className="sp-announcement-box-trigger sp-announcement-box-trigger--warning"
              aria-label="View vendors with expired or expiring documents"
              aria-haspopup="dialog"
              onClick={() => setAlertsOpen(true)}
            >
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
              {/* A unidade é dita para os números baterem certo com a lista
                  que a linha abre, que também conta documentos. */}
              <span className="sp-announcement-box-text">
                {expiredCount > 0 &&
                  `${expiredCount} expired ${expiredCount === 1 ? 'document' : 'documents'}`}
                {expiredCount > 0 && expiringCount > 0 && ', '}
                {expiringCount > 0 && `${expiringCount} expiring soon`}
              </span>
              <i className="bi bi-chevron-right sp-announcement-box-chevron" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <AnnouncementModal
          announcements={systemAnnouncements}
          onClose={() => setModalOpen(false)}
        />
      )}

      {alertsOpen && (
        <ComplianceAlertsModal entries={expiryEntries} onClose={() => setAlertsOpen(false)} />
      )}
    </div>
  );
}
