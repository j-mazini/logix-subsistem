import { useEffect, useMemo, useRef, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import { getServiceProvider, type DepotManager } from '../../data/dhlMockData';

const COVER_STORAGE_KEY = 'dhl_sp_profile_cover';
const AVATAR_STORAGE_KEY = 'dhl_sp_profile_avatar';

function getStoredImage(key: string, sp: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data[sp] || null;
  } catch {
    return null;
  }
}

function setStoredImage(key: string, sp: string, dataUrl: string) {
  try {
    const raw = localStorage.getItem(key);
    const all = raw ? JSON.parse(raw) : {};
    all[sp] = dataUrl;
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Profile() {
  const sp = useCurrentSp();
  const meta = useMemo(() => getServiceProvider(sp), [sp]);

  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [depotManagers, setDepotManagers] = useState<Record<string, DepotManager>>({});
  const [cover, setCover] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!meta) return;
    setOwner(meta.owner || '');
    setDescription(meta.description || '');
    setEmail(meta.email || '');
    setPhone(meta.phone || '');
    setDepotManagers(meta.depotManagers || {});
    setCover(getStoredImage(COVER_STORAGE_KEY, sp));
    setAvatar(getStoredImage(AVATAR_STORAGE_KEY, sp));
  }, [meta, sp]);

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  if (!sp) {
    return (
      <PortalLayout mainClassName="sp-profile-main" headerClassName="sp-profile-page-header" title="My Profile">
        <div id="spNotFound" className="alert alert-warning">
          <strong>Service Provider not set.</strong> Open the portal with <code>?sp=YourCompany</code>.
        </div>
      </PortalLayout>
    );
  }

  const displayName = meta?.name || sp;
  const tagline = meta?.owner
    ? `Director: ${meta.owner}`
    : meta?.description
      ? meta.description.slice(0, 80) + (meta.description.length > 80 ? '…' : '')
      : '—';
  const initials = (sp || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '—';
  const depotNames = Object.keys(depotManagers).sort();

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.match(/^image\//)) return;
    const dataUrl = await readAsDataUrl(file);
    setCover(dataUrl);
    setStoredImage(COVER_STORAGE_KEY, sp, dataUrl);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.match(/^image\//)) return;
    const dataUrl = await readAsDataUrl(file);
    setAvatar(dataUrl);
    setStoredImage(AVATAR_STORAGE_KEY, sp, dataUrl);
  }

  function updateDepotField(depot: string, field: keyof DepotManager, value: string) {
    setDepotManagers((prev) => ({ ...prev, [depot]: { ...prev[depot], [field]: value } }));
  }

  function handleSave() {
    setToastVisible(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 3000);
  }

  return (
    <PortalLayout pageClassName="sp-profile-page" mainClassName="sp-profile-main" headerClassName="sp-profile-page-header" title="My Profile">
      <div id="profileForm" className="sp-profile-fb-wrap">
        <div className="sp-profile-fb-card sp-profile-glass-card">
          <div className={`sp-profile-cover-wrap${cover ? ' has-image' : ''}`}>
            <div
              className="sp-profile-cover"
              id="profileCoverPreview"
              style={cover ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              <div className="sp-profile-cover-placeholder">
                <i className="bi bi-image" />
                <span>Add cover photo</span>
              </div>
            </div>
            <label className="sp-profile-cover-upload" htmlFor="profileCoverInput">
              <i className="bi bi-camera-fill" />
              <span>Add cover photo</span>
            </label>
            <input type="file" id="profileCoverInput" accept="image/*" className="d-none" onChange={handleCoverChange} />
          </div>

          <div className="sp-profile-avatar-wrap">
            <div className="sp-profile-avatar" id="profileAvatarPreview">
              {!avatar && <span className="sp-profile-avatar-initials" id="profileAvatarInitials">{initials}</span>}
              {avatar && <img id="profileAvatarImg" src={avatar} alt="" className="sp-profile-avatar-img" />}
            </div>
            <label className="sp-profile-avatar-upload" htmlFor="profileAvatarInput">
              <i className="bi bi-camera-fill" />
              <span>Add photo</span>
            </label>
            <input type="file" id="profileAvatarInput" accept="image/*" className="d-none" onChange={handleAvatarChange} />
          </div>

          <div className="sp-profile-fb-body">
            <h2 className="sp-profile-fb-name" id="profileDisplayName">{displayName}</h2>
            <p className="sp-profile-fb-tagline text-muted small mb-0" id="profileTagline">{tagline}</p>
          </div>
        </div>

        <div className="sp-profile-section sp-profile-glass-card">
          <div className="sp-profile-section-header">
            <i className="bi bi-info-circle" />
            <h3 className="sp-profile-section-title">Company info</h3>
          </div>
          <div className="sp-profile-section-body">
            <div className="mb-3">
              <label htmlFor="profileName" className="form-label">Company name</label>
              <input type="text" id="profileName" className="form-control" readOnly value={meta?.name || ''} />
            </div>
            <div className="mb-3">
              <label htmlFor="profileOwner" className="form-label">Director / Owner</label>
              <input type="text" id="profileOwner" className="form-control" value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
            <div className="mb-3">
              <label htmlFor="profileDescription" className="form-label">Description</label>
              <textarea id="profileDescription" className="form-control" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="row g-2">
              <div className="col-md-6">
                <label htmlFor="profileEmail" className="form-label">Email</label>
                <input type="email" id="profileEmail" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label htmlFor="profilePhone" className="form-label">Phone</label>
                <input type="text" id="profilePhone" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="sp-profile-section sp-profile-glass-card">
          <div className="sp-profile-section-header">
            <i className="bi bi-building" />
            <h3 className="sp-profile-section-title">Depot managers</h3>
          </div>
          <div className="sp-profile-section-body" id="depotManagersContainer">
            {depotNames.length === 0 ? (
              <p className="text-muted mb-0">No depot managers configured.</p>
            ) : (
              depotNames.map((depot) => {
                const m = depotManagers[depot] || {};
                return (
                  <div className="depot-manager-row border rounded p-2 mb-2" key={depot}>
                    <label className="form-label small text-muted">{depot}</label>
                    <div className="row g-2">
                      <div className="col-12">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Manager name"
                          value={m.name || ''}
                          onChange={(e) => updateDepotField(depot, 'name', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          placeholder="Email"
                          value={m.email || ''}
                          onChange={(e) => updateDepotField(depot, 'email', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Phone"
                          value={m.phone || ''}
                          onChange={(e) => updateDepotField(depot, 'phone', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button type="button" id="profileSaveBtn" className="btn btn-primary sp-profile-save-btn" onClick={handleSave}>
          <i className="bi bi-check-lg" /> Save changes
        </button>
      </div>

      <div id="profileToast" className="alert-toast" role="status" hidden={!toastVisible}>
        <i className="bi bi-check-circle-fill" />
        <span id="profileToastText">Profile saved successfully.</span>
      </div>
    </PortalLayout>
  );
}
