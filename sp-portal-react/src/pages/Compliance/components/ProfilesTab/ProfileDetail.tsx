import { createPortal } from 'react-dom';
import { UserProfile } from '../../types/compliance';

interface ProfileDetailProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdate: (profileId: string, updates: Partial<UserProfile>) => void;
}

/**
 * Modal with the full profile detail: personal info, documents,
 * trainings and timeline.
 */
export function ProfileDetail({ profile, onClose, onUpdate }: ProfileDetailProps) {
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return createPortal(
    <div className="compliance-page">
      <div className="profile-detail-modal sp-modal-anim" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title">{profile.name}</h5>
                <p className="modal-subtitle">
                  {profile.email} • {profile.vendor} • {profile.role}
                </p>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body">
              {/* Info section */}
              <div className="profile-detail-section">
                <h6>Personal information</h6>
                <div className="detail-grid">
                  <div>
                    <label>Email</label>
                    <p>{profile.email}</p>
                  </div>
                  <div>
                    <label>Phone</label>
                    <p>{profile.phone}</p>
                  </div>
                  <div>
                    <label>Vendor</label>
                    <p>{profile.vendor}</p>
                  </div>
                  <div>
                    <label>Role</label>
                    <p>{profile.role}</p>
                  </div>
                  <div>
                    <label>Compliance score</label>
                    <p>{profile.complianceScore}%</p>
                  </div>
                  <div>
                    <label>Status</label>
                    <p>{profile.vettingStatus}</p>
                  </div>
                </div>
              </div>

              {/* Documents section */}
              <div className="profile-detail-section">
                <h6>Documents</h6>
                {profile.documents.length === 0 ? (
                  <p className="text-muted">No documents uploaded</p>
                ) : (
                  <div className="documents-list">
                    {profile.documents.map((doc) => (
                      <div key={doc.id} className="document-item">
                        <div className="document-info">
                          <p className="document-name">{doc.name}</p>
                          <p className="document-type">{doc.type}</p>
                        </div>
                        <span className={`badge badge-${doc.status}`}>{doc.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Trainings section */}
              <div className="profile-detail-section">
                <h6>Trainings</h6>
                {profile.trainings.length === 0 ? (
                  <p className="text-muted">No trainings completed</p>
                ) : (
                  <div className="trainings-list">
                    {profile.trainings.map((training) => (
                      <div key={training.id} className="training-item">
                        <div className="training-info">
                          <p className="training-name">{training.name}</p>
                          <p className="training-type">{training.type}</p>
                        </div>
                        <span className={`badge badge-${training.status}`}>{training.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline section */}
              <div className="profile-detail-section">
                <h6>Timeline</h6>
                <div className="timeline">
                  <div className="timeline-item">
                    <p className="timeline-label">Created</p>
                    <p className="timeline-value">{formatDate(profile.createdAt)}</p>
                  </div>
                  <div className="timeline-item">
                    <p className="timeline-label">Last updated</p>
                    <p className="timeline-value">{formatDate(profile.lastUpdated)}</p>
                  </div>
                  {profile.vettingCompletedAt && (
                    <div className="timeline-item">
                      <p className="timeline-label">Vetting completed</p>
                      <p className="timeline-value">{formatDate(profile.vettingCompletedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onUpdate(profile.id, {
                    lastUpdated: new Date().toISOString(),
                  });
                  onClose();
                }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={onClose} />
    </div>,
    document.body,
  );
}
