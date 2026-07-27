import { UserProfile } from '../../types/compliance';

interface ProfileCardProps {
  profile: UserProfile;
  isVettingPending: boolean;
  vettingProgress?: any;
  onClick: () => void;
}

/**
 * Card individual de um perfil na lista
 *
 * Mostra:
 * - Nome e email
 * - Vendor
 * - Status de compliance
 * - Score de compliance
 * - Indicador de Vetting pendente
 */
export function ProfileCard({
  profile,
  isVettingPending,
  vettingProgress,
  onClick,
}: ProfileCardProps) {
  const getStatusBadge = () => {
    switch (profile.vettingStatus) {
      case 'completed':
        return { label: '✓ Completed', className: 'badge-success' };
      case 'in-progress':
        return { label: '⏳ In progress', className: 'badge-warning' };
      case 'pending':
        return { label: '○ Pending', className: 'badge-info' };
      case 'rejected':
        return { label: '✕ Rejected', className: 'badge-danger' };
    }
  };

  const statusBadge = getStatusBadge();
  const initials = profile.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="profile-card" onClick={onClick} role="button" tabIndex={0}>
      {/* Header com avatar e name */}
      <div className="profile-card-header">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-info">
          <p className="profile-name">{profile.name}</p>
          <p className="profile-email">{profile.email}</p>
        </div>
        {isVettingPending && (
          <div className="vetting-pending-indicator" title="Vetting pending — click to complete">
            <i className="bi bi-exclamation-circle" />
          </div>
        )}
      </div>

      {/* Vendor info */}
      <div className="profile-card-vendor">
        <span className="badge badge-outline">{profile.vendor}</span>
        <span className="badge badge-outline">{profile.role}</span>
      </div>

      {/* Status and compliance */}
      <div className="profile-card-status">
        <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
      </div>

      {/* Compliance score bar */}
      <div className="profile-card-compliance">
        <div className="compliance-score">
          <span className="score-label">Compliance score:</span>
          <span className="score-value">{profile.complianceScore}%</span>
        </div>
        <div className="compliance-bar">
          <div
            className="compliance-fill"
            style={{
              width: `${profile.complianceScore}%`,
              backgroundColor:
                profile.complianceScore >= 80
                  ? '#10b981'
                  : profile.complianceScore >= 60
                    ? '#f59e0b'
                    : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Vetting progress if available */}
      {vettingProgress?.progress && (
        <div className="profile-card-vetting-progress">
          <p className="progress-label">
            Vetting checklist: {vettingProgress.progress.completed}/{vettingProgress.progress.total}
          </p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${vettingProgress.progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer with actions */}
      <div className="profile-card-footer">
        <button className="btn-action btn-primary" onClick={(e) => e.stopPropagation()}>
          <i className="bi bi-eye" /> View
        </button>
      </div>
    </div>
  );
}
