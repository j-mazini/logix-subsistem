/**
 * Admin header user menu – shared across every page using .admin-header.
 * Mirrors beam-sidebar.js's init pattern, but is class-based (not
 * id-based) since every page names its pill/avatar ids differently.
 */
(function () {
  'use strict';

  function initPill(pill) {
    // The menu lives as .admin-header's next sibling, not the pill's —
    // see the HTML comment next to .admin-header-user-menu for why it
    // can't be nested inside .admin-header.
    var header = pill.closest('.admin-header');
    var menu = header ? header.nextElementSibling : pill.nextElementSibling;
    if (!menu || !menu.classList.contains('admin-header-user-menu')) return;

    // `.admin-header-user-menu` is `position: fixed` (see
    // admin-header-standard.css for why) so its screen position has to be
    // computed from the pill each time it opens, rather than living in
    // static CSS relative to a parent that might clip it.
    function position() {
      var rect = pill.getBoundingClientRect();
      var menuWidth = menu.offsetWidth || 192;
      var left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
      menu.style.top = (rect.bottom + 8) + 'px';
      menu.style.left = Math.max(8, left) + 'px';
    }

    function reposition() {
      if (!menu.hidden) position();
    }

    function open() {
      menu.hidden = false;
      position();
      pill.setAttribute('aria-expanded', 'true');
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
    }

    function close() {
      menu.hidden = true;
      pill.setAttribute('aria-expanded', 'false');
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    }

    function toggle() {
      if (menu.hidden) open();
      else close();
    }

    pill.setAttribute('tabindex', pill.getAttribute('tabindex') || '0');
    pill.setAttribute('role', pill.getAttribute('role') || 'button');
    pill.setAttribute('aria-haspopup', 'true');
    pill.setAttribute('aria-expanded', 'false');

    pill.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });

    pill.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape') {
        close();
      }
    });

    document.addEventListener('click', function (e) {
      if (!menu.hidden && !pill.contains(e.target) && !menu.contains(e.target)) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) close();
    });
  }

  function initLogoutLinks() {
    var links = document.querySelectorAll('[data-action="logout"]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        try {
          sessionStorage.removeItem('dhl_sp_portal_current_sp');
        } catch (e) {}
        // Navigation continues via the link's own href — this only clears
        // the mock "current SP" so the next login starts from a clean slate.
      });
    }
  }

  function initAdminHeaderMenus() {
    var pills = document.querySelectorAll('.admin-header-user-pill');
    for (var i = 0; i < pills.length; i++) initPill(pills[i]);
    initLogoutLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminHeaderMenus);
  } else {
    initAdminHeaderMenus();
  }
})();
