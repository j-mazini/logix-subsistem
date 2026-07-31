import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { MOCK_DRIVER_USER, getFullNameFromToken, removeToken } from "../mockAuth";
import "./MobileHeader.css";

export function MobileHeader() {
  const [fullName, setFullName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setFullName(getFullNameFromToken());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const handleLogout = () => {
    removeToken();
    setOpen(false);
    navigate("/");
  };

  const userData = {
    name: MOCK_DRIVER_USER.companyName,
    avatar: "/assets/atlas-transport-logo.png",
  };

  return (
    <div className="mobile-header md:hidden" ref={rootRef}>
      <button type="button" className="user-profile" onClick={() => setOpen((v) => !v)}>
        <div className="user-info">
          <div className="company-name">{userData.name}</div>
          <div className="user-name">{fullName || "Loading..."}</div>
        </div>
        <img src={userData.avatar} alt={`${userData.name} Logo`} className="user-logo" />
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-label">
            <img src={userData.avatar} alt={userData.name} className="user-dropdown-logo" />
            <div style={{ minWidth: 0 }}>
              <div className="user-dropdown-name">{userData.name}</div>
              <div className="user-dropdown-sub">{fullName || "Loading..."}</div>
            </div>
          </div>
          <button type="button" className="user-dropdown-item" onClick={handleLogout}>
            <LogOut size={14} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
