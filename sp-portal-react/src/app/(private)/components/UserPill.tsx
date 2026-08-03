import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_DRIVER_USER, removeToken } from "../mockAuth";
import {
  DRIVER_PROFILE_UPDATED_EVENT,
  initialsFromName,
  loadDriverProfile,
} from "../driverProfileStorage";
import "./UserPill.css";

/** Company logo, used while the driver hasn't set a photo of their own. */
const COMPANY_LOGO_SRC = "/assets/tbx-logo.png";

/**
 * The driver portal's identity pill: avatar, company/driver name and a log-out
 * button. Rendered once by StandardPageLayout so it sits in the same place
 * (top-right of the content column) on every driver page, at every breakpoint —
 * pages must not render their own copy.
 *
 * The avatar and name come from the driver's own profile page when they have
 * been set there; the pill re-reads them on DRIVER_PROFILE_UPDATED_EVENT, so a
 * save is reflected without a reload.
 */
export function UserPill() {
  const navigate = useNavigate();
  const [logoFailed, setLogoFailed] = useState(false);
  const [profile, setProfile] = useState(() => loadDriverProfile());

  useEffect(() => {
    const refresh = () => setProfile(loadDriverProfile());
    window.addEventListener(DRIVER_PROFILE_UPDATED_EVENT, refresh);
    // 'storage' covers the profile being edited in another tab.
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DRIVER_PROFILE_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const companyName = MOCK_DRIVER_USER.companyName;
  const displayName = profile.preferredName.trim() || profile.fullName || "Driver";
  const photo = profile.avatar || (logoFailed ? null : COMPANY_LOGO_SRC);

  function handleLogout() {
    removeToken();
    // Back to the portal picker (AccessSelect), not the SP re-login form.
    navigate("/");
  }

  return (
    <div className="user-pill">
      <button
        type="button"
        className="user-pill__identity"
        onClick={() => navigate("/my-profile")}
        title="Open my profile"
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            className="user-pill__avatar"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="user-pill__avatar user-pill__avatar--fallback" aria-hidden="true">
            {initialsFromName(profile.fullName) || initialsFromName(companyName) || "—"}
          </span>
        )}

        <span className="user-pill__info">
          <span className="user-pill__company">{companyName}</span>
          <span className="user-pill__name">{displayName}</span>
        </span>
      </button>

      <button
        type="button"
        className="user-pill__logout"
        onClick={handleLogout}
        title="Log out"
        aria-label="Log out"
      >
        <i className="bi bi-box-arrow-right" aria-hidden="true" />
      </button>
    </div>
  );
}
