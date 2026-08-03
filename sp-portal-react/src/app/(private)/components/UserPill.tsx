import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_DRIVER_USER, getFullNameFromToken, removeToken } from "../mockAuth";
import "./UserPill.css";

/** Company logo shown in the pill; falls back to initials if it fails to load. */
const AVATAR_SRC = "/assets/atlas-transport-logo.png";

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * The driver portal's identity pill: avatar, company/driver name and a log-out
 * button. Rendered once by StandardPageLayout so it sits in the same place
 * (top-right of the content column) on every driver page, at every breakpoint —
 * pages must not render their own copy.
 */
export function UserPill() {
  const navigate = useNavigate();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const companyName = MOCK_DRIVER_USER.companyName;
  const fullName = getFullNameFromToken();

  function handleLogout() {
    removeToken();
    // Back to the portal picker (AccessSelect), not the SP re-login form.
    navigate("/");
  }

  return (
    <div className="user-pill">
      {avatarFailed ? (
        <span className="user-pill__avatar user-pill__avatar--fallback" aria-hidden="true">
          {initialsFor(companyName) || "—"}
        </span>
      ) : (
        <img
          src={AVATAR_SRC}
          alt={`${companyName} logo`}
          className="user-pill__avatar"
          onError={() => setAvatarFailed(true)}
        />
      )}

      <div className="user-pill__info">
        <span className="user-pill__company">{companyName}</span>
        <span className="user-pill__name">{fullName || "Driver"}</span>
      </div>

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
