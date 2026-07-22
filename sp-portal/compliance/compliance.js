/**
 * SP Portal – Compliance page
 * Centralized profile compliance overview: metrics, search + filters, profile card grid, detail modal.
 */
(function () {
  'use strict';

  var SORT_DAYS_EXPIRING = 30;
  var SEARCH_DEBOUNCE_MS = 200;

  function debounce(fn, ms) {
    var t;
    return function () {
      var self = this, args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  function getCurrentSp() {
    return window.SpHeaderIdentity.getCurrentSp();
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function computeCourierId(firstName, lastName) {
    var first = (firstName || '').replace(/\s/g, '').toUpperCase().slice(0, 7);
    var need = 8 - first.length;
    var lastRaw = (lastName || '').trim();
    var initials = lastRaw.split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join('').toUpperCase();
    var rest = (lastRaw || '').replace(/\s/g, '').toUpperCase();
    var part2 = (initials + rest).slice(0, need);
    return (first + part2).slice(0, 8);
  }

  function formatDateOnly(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    return day + '/' + month + '/' + year;
  }

  function parseYMD(s) {
    if (!s) return null;
    var parts = String(s).split('-');
    if (parts.length < 3) return null;
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  function getTrainingExpiryDate(v) {
    var dates = [];
    if (v.cargoTrainingDate) dates.push(parseYMD(v.cargoTrainingDate));
    if (v.dangerousGoodsTrainingDate) dates.push(parseYMD(v.dangerousGoodsTrainingDate));
    if (v.manualHandlingTrainingDate) dates.push(parseYMD(v.manualHandlingTrainingDate));
    dates = dates.filter(Boolean);
    if (dates.length === 0) return null;
    var latest = new Date(Math.max.apply(null, dates.map(function (d) { return d.getTime(); })));
    latest.setFullYear(latest.getFullYear() + 2);
    return latest;
  }

  function isExpired(expiryDate) {
    if (!expiryDate) return false;
    var d = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
    return d.getTime() < Date.now();
  }

  function isExpiringSoon(expiryDate, days) {
    if (!expiryDate) return false;
    var d = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
    var limit = new Date();
    limit.setDate(limit.getDate() + (days || SORT_DAYS_EXPIRING));
    return d.getTime() <= limit.getTime() && d.getTime() >= Date.now();
  }

  function getTrainingStatus(v) {
    var expiry = getTrainingExpiryDate(v);
    if (!expiry) return { label: 'Incomplete', class: 'status-badge-incomplete' };
    if (isExpired(expiry)) return { label: 'Expired', class: 'status-badge-expiring' };
    if (isExpiringSoon(expiry)) return { label: 'Expiring Soon', class: 'status-badge-warning' };
    return { label: 'Complete', class: 'status-badge-active' };
  }

  function getSingleTrainingStatus(trainingDate) {
    if (!trainingDate) return 'pending';
    var d = parseYMD(trainingDate);
    if (!d) return 'pending';
    var expiry = new Date(d);
    expiry.setFullYear(expiry.getFullYear() + 2);
    if (isExpired(expiry)) return 'expiring';
    if (isExpiringSoon(expiry)) return 'warning';
    return 'active';
  }

  function getDocumentItemStatus(key, v) {
    if (key === 'criminalRecord' || key === 'dvlaCheck') {
      var date = key === 'criminalRecord' ? v.criminalRecordDate : v.dvlaCheckDate;
      return date ? 'verified' : 'pending';
    }
    var dateStr = (key === 'visa' && v.visaValidity) || (key === 'licence' && v.licenceExpiringDate) || (key === 'passport' && v.passportExpiringDate) ? (v.visaValidity || v.licenceExpiringDate || v.passportExpiringDate) : null;
    if (!dateStr) return null;
    var d = parseYMD(dateStr);
    if (!d) return null;
    if (isExpired(d)) return 'expiring';
    if (isExpiringSoon(d)) return 'warning';
    return 'active';
  }

  function getDocumentsStatus(v) {
    if (!v.criminalRecordDate || !v.dvlaCheckDate) return { label: 'Pending', class: 'status-badge-pending' };
    var items = [];
    if (v.dvlaCheckDate) {
      var dvlaExp = new Date(v.dvlaCheckDate);
      dvlaExp.setMonth(dvlaExp.getMonth() + 6);
      items.push(dvlaExp);
    }
    if (v.licenceExpiringDate) items.push(new Date(v.licenceExpiringDate));
    if (v.passportExpiringDate) items.push(new Date(v.passportExpiringDate));
    if (v.visaValidity) items.push(new Date(v.visaValidity));
    if (items.length === 0) return { label: 'Verified', class: 'status-badge-active' };
    var minExp = new Date(Math.min.apply(null, items.map(function (d) { return d.getTime(); })));
    if (isExpired(minExp)) return { label: 'Expired', class: 'status-badge-expiring' };
    if (isExpiringSoon(minExp)) return { label: 'Expiring Soon', class: 'status-badge-warning' };
    return { label: 'Verified', class: 'status-badge-active' };
  }

  function vendorTypeLabel(v) {
    return (v.vendorType === '2') ? 'Subcontractor' : 'Driver';
  }

  function statusBadgeClass(v) {
    if (v.status === 'Active') return 'status-badge-active';
    if (v.status === 'Inactive') return 'status-badge-inactive';
    if (v.status === 'Pending') return 'status-badge-pending';
    return 'status-badge-default';
  }

  function getInitials(v) {
    var first = (v.firstName || '').trim();
    var last = (v.lastName || '').trim();
    var initials = (first[0] || '') + (last[0] || '');
    return initials.toUpperCase() || '—';
  }

  /** Overall compliance accent for a profile: ok/warning/danger, based on documents + training status. */
  function complianceAccent(v) {
    var d = getDocumentsStatus(v);
    var t = getTrainingStatus(v);
    if (d.label === 'Expired' || t.label === 'Expired') return 'danger';
    if (d.label === 'Pending' || t.label === 'Incomplete') return 'danger';
    if (d.label === 'Expiring Soon' || t.label === 'Expiring Soon') return 'warning';
    return 'ok';
  }

  var data = window.DHL_MOCK_DATA || {};
  var spName = getCurrentSp();
  var complianceFilter = 'all';

  function getAllVendorsForSp() {
    return (data.vendors || []).filter(function (v) { return v.serviceProvider === spName; });
  }

  function getSearchQuery() {
    var el = document.getElementById('complianceSearch');
    return (el && el.value) ? el.value.trim().toLowerCase() : '';
  }

  function setComplianceFilter(filter) {
    complianceFilter = filter;
    document.querySelectorAll('.vendor-filters-status-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-compliance') === filter);
    });
  }

  function filterVendors() {
    var all = getAllVendorsForSp();
    var q = getSearchQuery();

    return all.filter(function (v) {
      var name = ((v.firstName || '') + ' ' + (v.lastName || '')).toLowerCase();
      var email = (v.email || '').toLowerCase();
      if (q && name.indexOf(q) === -1 && email.indexOf(q) === -1) return false;
      if (complianceFilter !== 'all' && complianceAccent(v) !== complianceFilter) return false;
      return true;
    }).sort(function (a, b) {
      var na = ((a.firstName || '') + ' ' + (a.lastName || '')).toLowerCase();
      var nb = ((b.firstName || '') + ' ' + (b.lastName || '')).toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : 0;
    });
  }

  function updateMetrics() {
    var all = getAllVendorsForSp();
    var total = all.length;
    var verified = all.filter(function (v) { return complianceAccent(v) === 'ok'; }).length;
    var expiring = all.filter(function (v) { return complianceAccent(v) === 'warning'; }).length;
    var pending = all.filter(function (v) { return complianceAccent(v) === 'danger'; }).length;
    var compliancePct = total === 0 ? 0 : Math.round((verified / total) * 100);

    function set(id, n) {
      var el = document.getElementById(id);
      if (el) el.textContent = n;
    }
    set('metricTotal', total);
    set('metricVerified', verified);
    set('metricExpiring', expiring);
    set('metricPending', pending);
    set('metricComplianceOk', compliancePct + '%');
  }

  function renderCards() {
    var grid = document.getElementById('complianceCardsGrid');
    var emptyEl = document.getElementById('complianceEmptyState');
    if (!grid) return;

    var list = filterVendors();
    if (list.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    grid.innerHTML = list.map(function (v) {
      var name = ((v.firstName || '') + ' ' + (v.lastName || '')).trim() || '—';
      var t = getTrainingStatus(v);
      var d = getDocumentsStatus(v);
      var status = v.status || (!v.finishDate || new Date(v.finishDate) > new Date() ? 'Active' : 'Inactive');
      var accent = complianceAccent(v);

      var pendingItems = [];
      if (!v.criminalRecordDate) pendingItems.push('Criminal Record Check');
      if (!v.dvlaCheckDate) pendingItems.push('DVLA Check');
      var pendingHtml = pendingItems.length ? (
        '<div class="vendor-card-pending-box">' +
        '<div class="vendor-card-pending-title"><i class="bi bi-exclamation-triangle-fill"></i> Missing Documentation:</div>' +
        '<ul class="vendor-card-pending-list">' + pendingItems.map(function (p) { return '<li>' + escapeHtml(p) + '</li>'; }).join('') + '</ul>' +
        '</div>'
      ) : '';

      return '<div class="vendor-card vendor-card--' + accent + '" data-vendor-id="' + v.id + '">' +
        '<div>' +
        '<div class="vendor-card-header">' +
        '<div class="vendor-card-profile">' +
        '<div class="vendor-card-avatar">' + escapeHtml(getInitials(v)) + '</div>' +
        '<div class="text-truncate"><div class="vendor-card-name">' + escapeHtml(name) + '</div>' +
        '<div class="vendor-card-role">' + escapeHtml(vendorTypeLabel(v)) + '</div></div>' +
        '</div>' +
        '<span class="status-badge ' + statusBadgeClass(v) + '">' + escapeHtml(status) + '</span>' +
        '</div>' +
        '<div class="vendor-card-body">' +
        '<div class="vendor-card-route">Route: <strong>' + escapeHtml(v.route || '—') + '</strong></div>' +
        '<div class="vendor-card-badges">' +
        '<button type="button" class="vendor-badge-btn status-badge ' + t.class + '" data-vendor-id="' + v.id + '" data-info="training">' + escapeHtml(t.label) + '</button>' +
        '<button type="button" class="vendor-badge-btn status-badge ' + d.class + '" data-vendor-id="' + v.id + '" data-info="documents">' + escapeHtml(d.label) + '</button>' +
        '</div>' +
        pendingHtml +
        '</div>' +
        '</div>' +
        '<div class="vendor-card-actions">' +
        '<button type="button" class="btn-action btn-action--primary" data-vendor-id="' + v.id + '" data-action="view">View Profile</button>' +
        '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.vendor-badge-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openInfoModal(parseInt(btn.getAttribute('data-vendor-id'), 10), btn.getAttribute('data-info'));
      });
    });
    grid.querySelectorAll('.btn-action[data-action="view"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDriverDetailModal(parseInt(btn.getAttribute('data-vendor-id'), 10)); });
    });
  }

  function openInfoModal(vendorId, type) {
    var all = getAllVendorsForSp();
    var v = all.filter(function (x) { return x.id === vendorId; })[0];
    if (!v) return;

    var nameEl = document.getElementById('infoModalVendorName');
    var emailEl = document.getElementById('infoModalVendorEmail');
    var badgeEl = document.getElementById('infoModalBadge');
    var bodyEl = document.getElementById('infoModalBody');
    if (!nameEl || !bodyEl) return;

    nameEl.textContent = (v.firstName || '') + ' ' + (v.lastName || '');
    emailEl.textContent = v.email || '';
    badgeEl.textContent = type === 'training' ? 'Training Details' : 'Documents Details';

    if (type === 'training') {
      var cargoStatus = getSingleTrainingStatus(v.cargoTrainingDate);
      var cargoExpiry = v.cargoTrainingDate ? (function () { var d = parseYMD(v.cargoTrainingDate); if (!d) return null; d = new Date(d); d.setFullYear(d.getFullYear() + 2); return formatDateOnly(d.toISOString().slice(0, 10)); })() : null;
      var items = [
        { label: 'Cargo Training', value: v.cargoTrainingDate ? formatDateOnly(v.cargoTrainingDate) : 'Pending', detail: cargoExpiry ? 'Expires: ' + cargoExpiry : null, badge: cargoStatus, status: cargoStatus },
        { label: 'Dangerous Goods Training', value: v.dangerousGoodsTrainingDate ? formatDateOnly(v.dangerousGoodsTrainingDate) : 'Pending', detail: null, badge: getSingleTrainingStatus(v.dangerousGoodsTrainingDate), status: getSingleTrainingStatus(v.dangerousGoodsTrainingDate) },
        { label: 'Manual Handling Training', value: v.manualHandlingTrainingDate ? formatDateOnly(v.manualHandlingTrainingDate) : 'Pending', detail: null, badge: getSingleTrainingStatus(v.manualHandlingTrainingDate), status: getSingleTrainingStatus(v.manualHandlingTrainingDate) },
        { label: 'DHL Training Number', value: v.dhlTrainingNumber || 'N/A', detail: null, badge: null, status: null }
      ];
      bodyEl.innerHTML = items.map(function (item) {
        var flagHtml = item.status ? '<span class="vendor-info-modal-flag vendor-info-modal-flag--' + item.status + '" title="' + (item.status === 'active' ? 'Complete' : item.status === 'warning' ? 'Expiring Soon' : item.status === 'expiring' ? 'Expired' : 'Pending') + '"></span>' : '';
        var badgeHtml = item.badge ? '<span class="status-badge status-badge-' + item.badge + '">' + escapeHtml(item.value) + '</span>' : '<span class="vendor-info-modal-item-value">' + escapeHtml(item.value) + '</span>';
        var detailHtml = item.detail ? '<span class="vendor-info-modal-item-detail">' + escapeHtml(item.detail) + '</span>' : '';
        return '<div class="vendor-info-modal-item vendor-info-modal-item--has-flag"><div class="vendor-info-modal-item-label-wrap">' + flagHtml + '<div class="vendor-info-modal-item-head">' + '<span class="vendor-info-modal-item-label">' + escapeHtml(item.label) + '</span>' + detailHtml + '</div></div><div>' + badgeHtml + '</div></div>';
      }).join('');
    } else {
      var docItems = [
        { label: 'Criminal Record Check', value: v.criminalRecordDate ? formatDateOnly(v.criminalRecordDate) : 'Pending', status: getDocumentItemStatus('criminalRecord', v) },
        { label: 'DVLA Check', value: v.dvlaCheckDate ? formatDateOnly(v.dvlaCheckDate) : 'Pending', status: getDocumentItemStatus('dvlaCheck', v) },
        { label: 'Visa Validity', value: v.visaValidity ? formatDateOnly(v.visaValidity) : 'N/A', status: getDocumentItemStatus('visa', v) },
        { label: 'Driving Licence Expiry', value: v.licenceExpiringDate ? formatDateOnly(v.licenceExpiringDate) : 'N/A', status: getDocumentItemStatus('licence', v) },
        { label: 'Passport Expiry', value: v.passportExpiringDate ? formatDateOnly(v.passportExpiringDate) : 'N/A', status: getDocumentItemStatus('passport', v) }
      ];
      bodyEl.innerHTML = docItems.map(function (item) {
        var flagHtml = item.status ? '<span class="vendor-info-modal-flag vendor-info-modal-flag--' + item.status + '" title="' + (item.status === 'active' || item.status === 'verified' ? 'OK' : item.status === 'warning' ? 'Expiring Soon' : item.status === 'expiring' ? 'Expired' : 'Pending') + '"></span>' : '';
        var badgeHtml = item.status ? '<span class="status-badge status-badge-' + (item.status === 'verified' ? 'verified' : item.status) + '">' + escapeHtml(item.value) + '</span>' : '<span class="vendor-info-modal-item-value">' + escapeHtml(item.value) + '</span>';
        return '<div class="vendor-info-modal-item vendor-info-modal-item--has-flag"><div class="vendor-info-modal-item-label-wrap">' + flagHtml + '<span class="vendor-info-modal-item-label">' + escapeHtml(item.label) + '</span></div><div>' + badgeHtml + '</div></div>';
      }).join('');
    }

    var modalEl = document.getElementById('infoModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function openDriverDetailModal(vendorId) {
    var all = getAllVendorsForSp();
    var v = all.filter(function (x) { return x.id === vendorId; })[0];
    if (!v) return;

    var name = (v.firstName || '') + ' ' + (v.lastName || '');
    var courierId = v.courierId || computeCourierId(v.firstName || '', v.lastName || '');
    var route = v.route || '—';

    document.getElementById('driverDetailModalTitle').textContent = name.trim() || '—';

    var sections = [
      {
        title: 'Personal',
        rows: [
          { label: 'Courier ID', value: courierId },
          { label: 'First name', value: v.firstName || '—' },
          { label: 'Last name', value: v.lastName || '—' },
          { label: 'Email', value: v.email || '—' },
          { label: 'Phone', value: v.phone || '—' },
          { label: 'Date of birth', value: v.dob ? formatDateOnly(v.dob) : '—' }
        ]
      },
      {
        title: 'Contract',
        rows: [
          { label: 'Depot', value: v.depot || '—' },
          { label: 'Vendor Type', value: vendorTypeLabel(v) },
          { label: 'Route', value: route },
          { label: 'Start date', value: formatDateOnly(v.startDate) || '—' },
          { label: 'Finish date', value: formatDateOnly(v.finishDate) || '—' },
          { label: 'Status', value: v.status || '—' }
        ]
      },
      {
        title: 'Training',
        rows: [
          { label: 'Cargo training date', value: v.cargoTrainingDate ? formatDateOnly(v.cargoTrainingDate) : '—' },
          { label: 'Dangerous goods training date', value: v.dangerousGoodsTrainingDate ? formatDateOnly(v.dangerousGoodsTrainingDate) : '—' },
          { label: 'Manual handling training date', value: v.manualHandlingTrainingDate ? formatDateOnly(v.manualHandlingTrainingDate) : '—' },
          { label: 'DHL Training Number', value: v.dhlTrainingNumber || '—' }
        ]
      },
      {
        title: 'Compliance',
        rows: [
          { label: 'Criminal record check date', value: v.criminalRecordDate ? formatDateOnly(v.criminalRecordDate) : '—' },
          { label: 'DBS Number', value: v.dbsNumber || '—' },
          { label: 'DVLA check date', value: v.dvlaCheckDate ? formatDateOnly(v.dvlaCheckDate) : '—' },
          { label: 'Visa validity', value: v.visaValidity ? formatDateOnly(v.visaValidity) : '—' },
          { label: 'Licence expiring date', value: v.licenceExpiringDate ? formatDateOnly(v.licenceExpiringDate) : '—' },
          { label: 'Passport expiring date', value: v.passportExpiringDate ? formatDateOnly(v.passportExpiringDate) : '—' }
        ]
      }
    ];

    var gridHtml = sections.map(function (sec) {
      return '<section class="driver-detail-section"><h3 class="driver-detail-section-title">' + escapeHtml(sec.title) + '</h3>' +
        sec.rows.map(function (r) {
          return '<div class="driver-detail-row"><span class="driver-detail-row-label">' + escapeHtml(r.label) + '</span><span class="driver-detail-row-value">' + escapeHtml(r.value) + '</span></div>';
        }).join('') + '</section>';
    }).join('');

    var gridEl = document.getElementById('driverDetailGrid');
    if (gridEl) gridEl.innerHTML = gridHtml;

    var qrText = 'Courier ID: ' + courierId + '\nRoute: ' + route;
    var qrEl = document.getElementById('driverDetailQr');
    if (qrEl) {
      qrEl.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        try {
          new QRCode(qrEl, { text: qrText, width: 180, height: 180 });
        } catch (err) {
          qrEl.textContent = 'QR unavailable';
        }
      } else {
        qrEl.textContent = 'QR library not loaded';
      }
    }

    document.getElementById('driverDetailModalBackdrop').classList.remove('hidden');
    document.getElementById('driverDetailModalWrap').classList.remove('hidden');
  }

  function closeDriverDetailModal() {
    document.getElementById('driverDetailModalBackdrop').classList.add('hidden');
    document.getElementById('driverDetailModalWrap').classList.add('hidden');
  }

  function init() {
    if (!spName) {
      document.getElementById('spNotFound').classList.remove('hidden');
      return;
    }
    document.getElementById('spNotFound').classList.add('hidden');
    document.getElementById('spComplianceContent').classList.remove('hidden');

    updateMetrics();
    renderCards();

    document.getElementById('complianceSearch').addEventListener('input', debounce(function () { renderCards(); }, SEARCH_DEBOUNCE_MS));

    document.querySelectorAll('.vendor-filters-status-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setComplianceFilter(btn.getAttribute('data-compliance'));
        renderCards();
      });
    });

    document.getElementById('driverDetailModalClose').addEventListener('click', closeDriverDetailModal);
    document.getElementById('driverDetailModalBackdrop').addEventListener('click', closeDriverDetailModal);
    document.getElementById('driverDetailModalWrap').addEventListener('click', function (e) {
      if (e.target === document.getElementById('driverDetailModalWrap')) closeDriverDetailModal();
    });
    var driverDetailDialog = document.querySelector('.driver-detail-modal');
    if (driverDetailDialog) driverDetailDialog.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('keydown', function driverDetailKeydown(e) {
      if (e.key === 'Escape' && !document.getElementById('driverDetailModalWrap').classList.contains('hidden')) {
        closeDriverDetailModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
    });
  } else {
    init();
  }
})();
