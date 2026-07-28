import { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile } from '../../types/compliance';
import { getExpirationStatus, getExpirationBadge, parsePortalDate } from '../../utils/expirationUtils';
import { documentTypeLabel } from '../../utils/documentLabels';

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
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    email: profile.email,
    phone: profile.phone,
    address: profile.address || '',
    driverType: profile.driverType || '',
    rota: profile.rota || '',
    bankAccountNumber: profile.bankAccountNumber || '',
    bankSortCode: profile.bankSortCode || '',
  });

  const formatDate = (iso: string) => {
    return parsePortalDate(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdate(profile.id, {
      ...formData,
      lastUpdated: new Date().toISOString(),
    });
    setIsEditing(false);
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
                  {profile.profilePhoto && (
                    <div className="profile-photo-container">
                      <img src={profile.profilePhoto} alt="Profile" className="profile-photo" />
                    </div>
                  )}
                  <div>
                    <label>Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <p>{profile.email}</p>
                    )}
                  </div>
                  <div>
                    <label>Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <p>{profile.phone}</p>
                    )}
                  </div>
                  <div>
                    <label>Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <p>{profile.address || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label>Driver Type</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.driverType || ''}
                        onChange={(e) => handleInputChange('driverType', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <p>{profile.driverType || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label>Rota</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.rota || ''}
                        onChange={(e) => handleInputChange('rota', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <p>{profile.rota || '—'}</p>
                    )}
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
                    {profile.documents.map((doc) => {
                      const expirationStatus = getExpirationStatus(doc.expiresAt);
                      const expirationBadge = getExpirationBadge(expirationStatus);
                      return (
                        <div key={doc.id} className="document-item">
                          <div className="document-info">
                            <p className="document-name">{doc.name}</p>
                            <p className="document-type">{documentTypeLabel(doc.type)}</p>

                            <dl className="document-meta">
                              {doc.type === 'dbs' && (
                                <>
                                  {doc.dbsNumber && (
                                    <div className="document-meta-item">
                                      <dt>Certificate number</dt>
                                      <dd className="document-meta-value--code">{doc.dbsNumber}</dd>
                                    </div>
                                  )}
                                  {doc.dbsCheckDate && (
                                    <div className="document-meta-item">
                                      <dt>Check date</dt>
                                      <dd>{formatDate(doc.dbsCheckDate)}</dd>
                                    </div>
                                  )}
                                </>
                              )}

                              {doc.type === 'dvla' && doc.dvlaExpiry && (
                                <div className="document-meta-item">
                                  <dt>Expiry date</dt>
                                  <dd>{formatDate(doc.dvlaExpiry)}</dd>
                                </div>
                              )}

                              {doc.type === 'passport' && (
                                <>
                                  {doc.passportNumber && (
                                    <div className="document-meta-item">
                                      <dt>Passport number</dt>
                                      <dd className="document-meta-value--code">{doc.passportNumber}</dd>
                                    </div>
                                  )}
                                  {doc.passportExpiry && (
                                    <div className="document-meta-item">
                                      <dt>Expiry date</dt>
                                      <dd>{formatDate(doc.passportExpiry)}</dd>
                                    </div>
                                  )}
                                </>
                              )}
                            </dl>

                            {doc.expiresAt && (
                              <p className="document-expiration">
                                Status: <span className={`expiration-${expirationStatus}`}>{expirationBadge.label}</span>
                              </p>
                            )}
                          </div>
                          <span className={`badge badge-${doc.status}`}>{doc.status}</span>
                        </div>
                      );
                    })}
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

                          {training.cargoHandlingDate && (
                            <p className="training-detail">Cargo Handling: {formatDate(training.cargoHandlingDate)}</p>
                          )}
                          {training.dangerousGoodDate && (
                            <p className="training-detail">Dangerous Good: {formatDate(training.dangerousGoodDate)}</p>
                          )}
                          {training.manualHandlingDate && (
                            <p className="training-detail">Manual Handling: {formatDate(training.manualHandlingDate)}</p>
                          )}
                          {training.completedAt && (
                            <p className="training-detail">Completed: {formatDate(training.completedAt)}</p>
                          )}
                        </div>
                        <span className={`badge badge-${training.status}`}>{training.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bank Account section */}
              <div className="profile-detail-section">
                <h6>Bank Account</h6>
                <div className="detail-grid">
                  <div>
                    <label>Account Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.bankAccountNumber || ''}
                        onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <p>{profile.bankAccountNumber || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label>Sort Code</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.bankSortCode || ''}
                        onChange={(e) => handleInputChange('bankSortCode', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <p>{profile.bankSortCode || '—'}</p>
                    )}
                  </div>
                </div>
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
              <button type="button" className="btn btn-outline" onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                  setFormData({
                    email: profile.email,
                    phone: profile.phone,
                    address: profile.address || '',
                    driverType: profile.driverType || '',
                    rota: profile.rota || '',
                    bankAccountNumber: profile.bankAccountNumber || '',
                    bankSortCode: profile.bankSortCode || '',
                  });
                } else {
                  onClose();
                }
              }}>
                {isEditing ? 'Cancel' : 'Close'}
              </button>
              {!isEditing && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  <i className="bi bi-pencil" /> Edit
                </button>
              )}
              {isEditing && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                >
                  <i className="bi bi-check" /> Save changes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={onClose} />
    </div>,
    document.body,
  );
}
