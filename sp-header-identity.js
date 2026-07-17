/**
 * SP header identity – shared across every sp-portal page.
 * Extracted from what 6 pages (vehicles.js, drivers.js, contracts.js,
 * sop-feed.js, dashboard.js, profile.js) each duplicated verbatim: reads
 * the current Service Provider from ?sp=/sessionStorage, appends it to
 * sidebar links so it survives navigation, and fills in the header pill
 * (#spHeaderName/#spHeaderAvatar/#spHeaderAvatarFallback) if present.
 * Safe to include on any page — every step is a no-op if its target
 * element/data isn't there.
 */
(function () {
  'use strict';

  var SP_STORAGE_KEY = 'dhl_sp_portal_current_sp';

  function getCurrentSp() {
    var params = new URLSearchParams(window.location.search);
    var sp = (params.get('sp') || '').trim();
    if (sp) {
      try { sessionStorage.setItem(SP_STORAGE_KEY, sp); } catch (e) {}
      return sp;
    }
    try { return sessionStorage.getItem(SP_STORAGE_KEY) || ''; } catch (e) { return ''; }
  }

  function appendSpToLinks(sp) {
    if (!sp) return;
    document.querySelectorAll('.beam-plate[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href && href.indexOf('?') === -1) a.setAttribute('href', href + '?sp=' + encodeURIComponent(sp));
    });
  }

  function populateHeaderPill(sp) {
    var nameEl = document.getElementById('spHeaderName');
    if (nameEl) nameEl.textContent = sp || '—';

    var avatar = document.getElementById('spHeaderAvatar');
    var fallback = document.getElementById('spHeaderAvatarFallback');
    if (!avatar && !fallback) return;

    var initials = (sp || '').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();

    if (fallback) {
      fallback.textContent = initials || '—';
      fallback.style.display = 'flex';
    }
    if (avatar) avatar.style.display = 'none';
  }

  function init() {
    var sp = getCurrentSp();
    appendSpToLinks(sp);
    populateHeaderPill(sp);
  }

  // Exposed so page-specific scripts (e.g. profile.js, which needs the SP
  // name to look up mock company data) don't have to re-implement it.
  window.SpHeaderIdentity = { getCurrentSp: getCurrentSp };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
