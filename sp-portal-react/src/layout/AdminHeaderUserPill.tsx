import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { withSp, initialsFor } from '../hooks/useCurrentSp';

/**
 * Port of admin-header.js + the .admin-header-user-pill/-menu markup shared
 * by every sp-portal page. Split into two components (Pill / Menu) because
 * the original DOM deliberately keeps the menu OUTSIDE .admin-header: that
 * element has backdrop-filter for its glass skin, which makes it a
 * containing block for position:fixed descendants — nesting the menu inside
 * would trap it back within .admin-header's overflow:hidden bounds. Callers
 * must render <AdminHeaderMenu> as a sibling right after the .admin-header
 * div, same as sp-portal/profile/index.html.
 */
function useAdminHeaderMenu() {
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function position() {
      const pill = pillRef.current;
      const menu = menuRef.current;
      if (!pill || !menu) return;
      const rect = pill.getBoundingClientRect();
      const menuWidth = menu.offsetWidth || 192;
      const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
      setMenuPos({ top: rect.bottom + 8, left: Math.max(8, left) });
    }

    function onDocClick(e: MouseEvent) {
      const pill = pillRef.current;
      const menu = menuRef.current;
      if (!pill || !menu) return;
      if (!pill.contains(e.target as Node) && !menu.contains(e.target as Node)) setOpen(false);
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    if (open) {
      position();
      window.addEventListener('scroll', position, true);
      window.addEventListener('resize', position);
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeydown);
    return () => {
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeydown);
    };
  }, [open]);

  return { open, setOpen, pillRef, menuRef, menuPos };
}

export type AdminHeaderMenuControls = ReturnType<typeof useAdminHeaderMenu>;

export function useAdminHeaderPill(): AdminHeaderMenuControls {
  return useAdminHeaderMenu();
}

export function AdminHeaderPill({ sp, controls }: { sp: string; controls: AdminHeaderMenuControls }) {
  const { open, setOpen, pillRef } = controls;
  const initials = initialsFor(sp);

  return (
    <div
      ref={pillRef}
      className="admin-header-user-pill d-flex align-items-center"
      id="spHeaderPill"
      tabIndex={0}
      role="button"
      aria-haspopup="true"
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((prev) => !prev);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen((prev) => !prev);
        }
      }}
    >
      <span id="spHeaderAvatarFallback" className="admin-header-user-avatar admin-header-user-avatar-fallback">
        {initials || '—'}
      </span>
      <img id="spHeaderAvatar" alt="" className="admin-header-user-avatar admin-header-user-avatar--img" style={{ display: 'none' }} />
      <span className="admin-header-user-name" id="spHeaderName">
        {sp || '—'}
      </span>
      <i className="bi bi-chevron-down admin-header-user-caret" aria-hidden="true" />
    </div>
  );
}

export function AdminHeaderMenu({ sp, controls }: { sp: string; controls: AdminHeaderMenuControls }) {
  const { open, menuRef, menuPos } = controls;
  const navigate = useNavigate();

  function handleLogout(e: React.MouseEvent) {
    e.preventDefault();
    try {
      sessionStorage.removeItem('dhl_sp_portal_current_sp');
    } catch {
      /* ignore */
    }
    navigate('/select');
  }

  function handleSelectAccess(e: React.MouseEvent) {
    e.preventDefault();
    navigate(withSp('/select', sp));
  }

  return (
    <div ref={menuRef} className="admin-header-user-menu" hidden={!open} style={{ top: menuPos.top, left: menuPos.left }}>
      <a href="#" onClick={handleSelectAccess} className="admin-header-user-menu-item">
        <i className="bi bi-arrow-left-right" /> Select access
      </a>
      <div className="admin-header-user-menu-divider" />
      <a href="#" onClick={handleLogout} className="admin-header-user-menu-item admin-header-user-menu-item--danger">
        <i className="bi bi-box-arrow-right" /> Log out
      </a>
    </div>
  );
}
