/**
 * SP Portal – Vendors page (faithful copy of Next.js Vendor)
 * Metrics, filters (search + status buttons + New + Export), sortable table, 6-step modal, Delete & Info modals.
 */
(function () {
  'use strict';

  var SP_STORAGE_KEY = 'dhl_sp_portal_current_sp';
  var SORT_DAYS_EXPIRING = 30;
  var STEPS = ['personal', 'employment', 'training', 'compliance'];
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
    var params = new URLSearchParams(window.location.search);
    var sp = (params.get('sp') || '').trim();
    if (sp) {
      try { sessionStorage.setItem(SP_STORAGE_KEY, sp); } catch (e) {}
      return sp;
    }
    try { return sessionStorage.getItem(SP_STORAGE_KEY) || ''; } catch (e) { return ''; }
  }

  function appendSpToLinks() {
    var sp = getCurrentSp();
    if (!sp) return;
    document.querySelectorAll('.beam-plate[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href && href.indexOf('?') === -1) a.setAttribute('href', href + '?sp=' + encodeURIComponent(sp));
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /** Courier ID: máx. 7 caracteres do primeiro nome + iniciais do apelido, total 8. */
  function computeCourierId(firstName, lastName) {
    var first = (firstName || '').replace(/\s/g, '').toUpperCase().slice(0, 7);
    var need = 8 - first.length;
    var lastRaw = (lastName || '').trim();
    var initials = lastRaw.split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join('').toUpperCase();
    var rest = (lastRaw || '').replace(/\s/g, '').toUpperCase();
    var part2 = (initials + rest).slice(0, need);
    return (first + part2).slice(0, 8);
  }

  function updateCourierIdFromName() {
    var first = document.getElementById('vFirstName');
    var last = document.getElementById('vLastName');
    var out = document.getElementById('vCourierId');
    if (out) out.value = computeCourierId(first ? first.value : '', last ? last.value : '');
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

  /** Status para um único training (data + 2 anos = expiry). */
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

  /** Status para um documento (expiry dates: expired/expiring/ok; check dates: verified/pending). */
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

  function isVendorExpiring(v) {
    var t = getTrainingStatus(v);
    var d = getDocumentsStatus(v);
    return t.label === 'Expiring Soon' || t.label === 'Expired' || d.label === 'Expiring Soon' || d.label === 'Expired';
  }

  function isVendorPending(v) {
    return !v.criminalRecordDate || !v.dvlaCheckDate;
  }

  var data = window.DHL_MOCK_DATA || {};
  var contracts = data.contracts || [];
  var spName = getCurrentSp();
  var localVendors = [];
  var sortKey = 'name';
  var sortDir = 1;
  var editingVendorId = null;
  var currentModalStep = 'personal';

  function getDepotsForSp() {
    var out = [], seen = {};
    contracts.forEach(function (c) {
      if (c.serviceProvider !== spName) return;
      (c.depots || []).forEach(function (d) {
        if (d.name && !seen[d.name]) { seen[d.name] = true; out.push(d.name); }
      });
    });
    return out.sort();
  }

  function getRoutesForSp() {
    var out = [], seen = {};
    contracts.forEach(function (c) {
      if (c.serviceProvider !== spName) return;
      (c.depots || []).forEach(function (d) {
        (d.loops || []).forEach(function (l) {
          (l.routes || []).forEach(function (r) {
            if (r.name && !seen[r.name]) { seen[r.name] = true; out.push(r.name); }
          });
        });
      });
    });
    return out.sort();
  }

  function getAllVendorsForSp() {
    var mock = (data.vendors || []).filter(function (v) { return v.serviceProvider === spName; });
    var byId = {};
    mock.forEach(function (v) { byId[v.id] = v; });
    localVendors.forEach(function (v) { byId[v.id] = v; });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  }

  function getSearchQuery() {
    var el = document.getElementById('vendorSearch');
    return (el && el.value) ? el.value.trim().toLowerCase() : '';
  }

  function getStatusFilter() {
    var btn = document.querySelector('.vendor-filters-status-btn.active');
    return (btn && btn.getAttribute('data-status')) ? btn.getAttribute('data-status') : 'all';
  }

  function setStatusFilter(status) {
    document.querySelectorAll('.vendor-filters-status-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-status') === status);
    });
  }

  function filterAndSortVendors() {
    var all = getAllVendorsForSp();
    var q = getSearchQuery();
    var statusFilter = getStatusFilter();

    var list = all.filter(function (v) {
      var name = ((v.firstName || '') + ' ' + (v.lastName || '')).toLowerCase();
      var email = (v.email || '').toLowerCase();
      if (q && name.indexOf(q) === -1 && email.indexOf(q) === -1) return false;
      if (statusFilter === 'active') {
        if (v.status) { if (v.status !== 'Active') return false; }
        else if (v.finishDate && new Date(v.finishDate) <= new Date()) return false;
      }
      if (statusFilter === 'inactive') {
        if (v.status) { if (v.status !== 'Inactive') return false; }
        else if (!v.finishDate || new Date(v.finishDate) > new Date()) return false;
      }
      if (statusFilter === 'pending' && !isVendorPending(v)) return false;
      if (statusFilter === 'expiring' && (!isVendorExpiring(v) || (v.status && v.status !== 'Active'))) return false;
      return true;
    });

    list.sort(function (a, b) {
      var va, vb;
      switch (sortKey) {
        case 'name':
          va = ((a.firstName || '') + ' ' + (a.lastName || '')).toLowerCase();
          vb = ((b.firstName || '') + ' ' + (b.lastName || '')).toLowerCase();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'vendorType':
          va = (a.vendorType || '').toString();
          vb = (b.vendorType || '').toString();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'route':
          va = (a.route || '').toString().toLowerCase();
          vb = (b.route || '').toString().toLowerCase();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'status':
          va = (a.status || '').toLowerCase();
          vb = (b.status || '').toLowerCase();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'startDate':
          va = (a.startDate || '');
          vb = (b.startDate || '');
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        default:
          return 0;
      }
    });
    return list;
  }

  function updateMetrics() {
    var list = filterAndSortVendors();
    var total = list.length;
    var today = new Date();
    var active = list.filter(function (v) {
      if (v.status) return v.status === 'Active';
      return !v.finishDate || new Date(v.finishDate) > today;
    }).length;
    var inactive = list.filter(function (v) {
      if (v.status) return v.status === 'Inactive';
      return !!v.finishDate && new Date(v.finishDate) <= today;
    }).length;
    var pending = list.filter(isVendorPending).length;

    function set(id, n) {
      var el = document.getElementById(id);
      if (el) el.textContent = n;
    }
    set('metricTotal', total);
    set('metricActive', active);
    set('metricInactive', inactive);
    set('metricPending', pending);
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

  function renderTable() {
    var tbody = document.getElementById('vendorTableBody');
    var emptyEl = document.getElementById('vendorEmptyState');
    if (!tbody) return;

    var list = filterAndSortVendors();
    if (list.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      updateSortHeaders();
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    tbody.innerHTML = list.map(function (v) {
      var name = (v.firstName || '') + ' ' + (v.lastName || '');
      var email = v.email || '';
      var t = getTrainingStatus(v);
      var d = getDocumentsStatus(v);
      var isLocal = localVendors.some(function (lv) { return lv.id === v.id; });
      var status = v.status || (!v.finishDate || new Date(v.finishDate) > new Date() ? 'Active' : 'Inactive');

      var row = '<tr data-vendor-id="' + v.id + '">' +
        '<td class="vendor-td-name"><span class="vendor-cell-name-strong">' + escapeHtml(name.trim() || '—') + '</span><span class="vendor-cell-email">' + escapeHtml(email) + '</span></td>' +
        '<td>' + escapeHtml(vendorTypeLabel(v)) + '</td>' +
        '<td>' + escapeHtml(v.route || '—') + '</td>' +
        '<td><span class="status-badge ' + statusBadgeClass(v) + '">' + escapeHtml(status) + '</span></td>' +
        '<td>' + (formatDateOnly(v.startDate) || '—') + '</td>' +
        '<td><button type="button" class="vendor-badge-btn status-badge ' + t.class + '" data-vendor-id="' + v.id + '" data-info="training">' + escapeHtml(t.label) + '</button></td>' +
        '<td><button type="button" class="vendor-badge-btn status-badge ' + d.class + '" data-vendor-id="' + v.id + '" data-info="documents">' + escapeHtml(d.label) + '</button></td>' +
        '<td><div class="d-flex justify-content-center gap-1">' +
        '<button type="button" class="vendor-action-btn" data-vendor-id="' + v.id + '" data-action="edit" aria-label="Edit vendor"><i class="bi bi-pencil-fill"></i></button>' +
        (isLocal ? '<button type="button" class="vendor-action-btn vendor-action-delete" data-vendor-id="' + v.id + '" data-action="delete" aria-label="Delete vendor"><i class="bi bi-trash-fill"></i></button>' : '') +
        '</div></td></tr>';
      return row;
    }).join('');

    tbody.querySelectorAll('.vendor-badge-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openInfoModal(parseInt(btn.getAttribute('data-vendor-id'), 10), btn.getAttribute('data-info'));
      });
    });
    tbody.querySelectorAll('.vendor-action-btn[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); openEditModal(parseInt(btn.getAttribute('data-vendor-id'), 10)); });
    });
    tbody.querySelectorAll('.vendor-action-btn[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); openDeleteModal(parseInt(btn.getAttribute('data-vendor-id'), 10)); });
    });
    tbody.querySelectorAll('tr[data-vendor-id]').forEach(function (row) {
      row.style.cursor = 'pointer';
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.addEventListener('click', function (e) {
        if (e.target.closest('.vendor-action-btn') || e.target.closest('.vendor-badge-btn')) return;
        openDriverDetailModal(parseInt(row.getAttribute('data-vendor-id'), 10));
      });
    });

    updateSortHeaders();
  }

  function updateSortHeaders() {
    document.querySelectorAll('.vendor-th-sort').forEach(function (th) {
      var key = th.getAttribute('data-sort');
      th.classList.remove('asc', 'desc');
      if (key === sortKey) th.classList.add(sortDir === 1 ? 'asc' : 'desc');
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

  function showVendorModalStep(step) {
    currentModalStep = step;
    document.querySelectorAll('.vendor-modal-step').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-step') === step);
    });
    STEPS.forEach(function (s) {
      var pane = document.getElementById('vendorStep' + s.charAt(0).toUpperCase() + s.slice(1));
      if (pane) pane.classList.toggle('hidden', s !== step);
    });
    var prevBtn = document.getElementById('vendorModalPrev');
    var nextBtn = document.getElementById('vendorModalNext');
    var submitBtn = document.getElementById('vendorFormSubmit');
    var idx = STEPS.indexOf(step);
    if (prevBtn) prevBtn.classList.toggle('hidden', idx <= 0);
    if (nextBtn) nextBtn.classList.toggle('hidden', idx >= STEPS.length - 1);
    if (submitBtn) submitBtn.classList.toggle('hidden', idx < STEPS.length - 1);
  }

  function openEditModal(vendorId) {
    var all = getAllVendorsForSp();
    var v = all.filter(function (x) { return x.id === vendorId; })[0];
    if (!v) return;

    editingVendorId = vendorId;
    document.getElementById('vendorModalTitle').textContent = 'Edit vendor';

    document.getElementById('vFirstName').value = v.firstName || '';
    document.getElementById('vLastName').value = v.lastName || '';
    var courierIdEl = document.getElementById('vCourierId');
    if (courierIdEl) courierIdEl.value = v.courierId || computeCourierId(v.firstName || '', v.lastName || '');
    document.getElementById('vEmail').value = v.email || '';
    document.getElementById('vPhone').value = v.phone || '';
    document.getElementById('vDob').value = v.dob || '';
    document.getElementById('vDepot').value = v.depot || '';
    document.getElementById('vVendorType').value = (v.vendorType || '1').toString();
    fillRouteSelect();
    document.getElementById('vRoute').value = v.route || '';
    document.getElementById('vStartDate').value = v.startDate || '';
    document.getElementById('vFinishDate').value = v.finishDate || '';
    document.getElementById('vCargoDate').value = v.cargoTrainingDate || '';
    document.getElementById('vDangerousDate').value = v.dangerousGoodsTrainingDate || '';
    document.getElementById('vManualDate').value = v.manualHandlingTrainingDate || '';
    document.getElementById('vDhlTrainingNumber').value = v.dhlTrainingNumber || '';
    document.getElementById('vCriminalRecordDate').value = v.criminalRecordDate || '';
    document.getElementById('vDbsNumber').value = v.dbsNumber || '';
    document.getElementById('vDvlaCheckDate').value = v.dvlaCheckDate || '';
    document.getElementById('vVisaValidity').value = v.visaValidity || '';
    document.getElementById('vLicenceExpiring').value = v.licenceExpiringDate || '';
    document.getElementById('vPassportExpiring').value = v.passportExpiringDate || '';

    showVendorModalStep('personal');
    var modalEl = document.getElementById('vendorModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function openDeleteModal(vendorId) {
    var all = getAllVendorsForSp();
    var v = all.filter(function (x) { return x.id === vendorId; })[0];
    if (!v) return;

    document.getElementById('deleteVendorName').textContent = (v.firstName || '') + ' ' + (v.lastName || '');
    document.getElementById('deleteVendorEmail').textContent = v.email ? 'Email: ' + v.email : '';
    document.getElementById('deleteConfirmBtn').setAttribute('data-vendor-id', vendorId);

    var modalEl = document.getElementById('deleteModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function initSort() {
    document.querySelectorAll('.vendor-th-sort').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-sort');
        if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; }
        renderTable();
      });
    });
  }

  function fillDepotSelect() {
    var depotSel = document.getElementById('vDepot');
    if (!depotSel) return;
    var depots = getDepotsForSp();
    depotSel.innerHTML = depots.map(function (d) {
      return '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + '</option>';
    }).join('');
  }

  function fillRouteSelect() {
    var routeSel = document.getElementById('vRoute');
    if (!routeSel) return;
    var routes = getRoutesForSp();
    var base = '<option value="">— Select route —</option>';
    routeSel.innerHTML = base + routes.map(function (r) {
      return '<option value="' + escapeHtml(r) + '">' + escapeHtml(r) + '</option>';
    }).join('');
  }

  function collectFormData() {
    var first = document.getElementById('vFirstName').value.trim();
    var last = document.getElementById('vLastName').value.trim();
    var courierIdEl = document.getElementById('vCourierId');
    var courierId = (courierIdEl && courierIdEl.value) ? courierIdEl.value.trim() : computeCourierId(first, last);
    return {
      firstName: first,
      lastName: last,
      courierId: courierId || computeCourierId(first, last),
      email: document.getElementById('vEmail').value.trim(),
      phone: document.getElementById('vPhone').value.trim(),
      dob: document.getElementById('vDob').value || null,
      depot: document.getElementById('vDepot').value,
      vendorType: document.getElementById('vVendorType').value,
      route: document.getElementById('vRoute').value || null,
      startDate: document.getElementById('vStartDate').value,
      finishDate: document.getElementById('vFinishDate').value || null,
      cargoTrainingDate: document.getElementById('vCargoDate').value || null,
      dangerousGoodsTrainingDate: document.getElementById('vDangerousDate').value || null,
      manualHandlingTrainingDate: document.getElementById('vManualDate').value || null,
      dhlTrainingNumber: document.getElementById('vDhlTrainingNumber').value.trim() || null,
      criminalRecordDate: document.getElementById('vCriminalRecordDate').value || null,
      dbsNumber: document.getElementById('vDbsNumber').value.trim() || null,
      dvlaCheckDate: document.getElementById('vDvlaCheckDate').value || null,
      visaValidity: document.getElementById('vVisaValidity').value || null,
      licenceExpiringDate: document.getElementById('vLicenceExpiring').value || null,
      passportExpiringDate: document.getElementById('vPassportExpiring').value || null
    };
  }

  function init() {
    if (!spName) {
      document.getElementById('spNotFound').classList.remove('hidden');
      return;
    }
    document.getElementById('spNotFound').classList.add('hidden');
    document.getElementById('spVendorContent').classList.remove('hidden');

    var logoMap = { 'BA Express': 'ba-express-logo.png', 'Premier Logistics Ltd': 'premier-logistics-logo.png', 'Swift Haul Solutions': 'swift-haul-logo.png', 'Metro Freight Partners': 'metro-freight-logo.png', 'Atlas Transport Services': 'atlas-transport-logo.png' };
    document.getElementById('spHeaderName').textContent = spName;
    var avatar = document.getElementById('spHeaderAvatar');
    if (avatar) {
      var fallback = document.getElementById('spHeaderAvatarFallback');
      var showFallback = function (txt) {
        if (fallback) { fallback.textContent = (txt || spName || '').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); fallback.style.display = 'flex'; }
        if (avatar) avatar.style.display = 'none';
      };
      if (logoMap[spName]) {
        avatar.onerror = function () { showFallback(spName); };
        avatar.src = '../../assets/' + logoMap[spName];
        avatar.alt = spName;
        avatar.style.display = 'block';
      } else {
        showFallback(spName);
      }
    }

    fillDepotSelect();
    updateMetrics();
    renderTable();
    initSort();

    document.getElementById('vendorSearch').addEventListener('input', debounce(function () { updateMetrics(); renderTable(); }, SEARCH_DEBOUNCE_MS));

    document.querySelectorAll('.vendor-filters-status-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStatusFilter(btn.getAttribute('data-status'));
        updateMetrics();
        renderTable();
      });
    });

    document.querySelectorAll('.vendor-modal-step').forEach(function (btn) {
      btn.addEventListener('click', function () { showVendorModalStep(btn.getAttribute('data-step')); });
    });
    document.getElementById('vendorModalPrev').addEventListener('click', function () {
      var idx = STEPS.indexOf(currentModalStep);
      if (idx > 0) showVendorModalStep(STEPS[idx - 1]);
    });
    document.getElementById('vendorModalNext').addEventListener('click', function () {
      var idx = STEPS.indexOf(currentModalStep);
      if (idx < STEPS.length - 1) showVendorModalStep(STEPS[idx + 1]);
    });

    document.getElementById('addVendorBtn').addEventListener('click', function () {
      editingVendorId = null;
      document.getElementById('vendorModalTitle').textContent = 'New vendor';
      document.getElementById('vendorForm').reset();
      fillDepotSelect();
      fillRouteSelect();
      updateCourierIdFromName();
      showVendorModalStep('personal');
      var modalEl = document.getElementById('vendorModal');
      if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });

    document.getElementById('vFirstName').addEventListener('input', updateCourierIdFromName);
    document.getElementById('vLastName').addEventListener('input', updateCourierIdFromName);

    document.getElementById('vendorForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = collectFormData();
      if (!fd.firstName || !fd.lastName || !fd.depot || !fd.startDate) return;

      if (editingVendorId !== null) {
        var idx = localVendors.findIndex(function (x) { return x.id === editingVendorId; });
        if (idx !== -1) {
          localVendors[idx] = Object.assign({}, localVendors[idx], fd, { id: editingVendorId, serviceProvider: spName });
        } else {
          var existing = getAllVendorsForSp().filter(function (x) { return x.id === editingVendorId; })[0];
          if (existing) localVendors.push(Object.assign({}, existing, fd, { id: existing.id, serviceProvider: spName }));
        }
      } else {
        var maxId = 0;
        (data.vendors || []).concat(localVendors).forEach(function (v) { if (v.id > maxId) maxId = v.id; });
        localVendors.push(Object.assign({}, fd, {
          id: maxId + 1,
          serviceProvider: spName,
          status: 'Active',
          cargoTraining: !!fd.cargoTrainingDate,
          dangerousGoodsTraining: !!fd.dangerousGoodsTrainingDate,
          manualHandlingTraining: !!fd.manualHandlingTrainingDate
        }));
      }

      var modalEl = document.getElementById('vendorModal');
      if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      updateMetrics();
      renderTable();
    });

    document.getElementById('deleteConfirmBtn').addEventListener('click', function () {
      var id = parseInt(this.getAttribute('data-vendor-id'), 10);
      localVendors = localVendors.filter(function (v) { return v.id !== id; });
      var modalEl = document.getElementById('deleteModal');
      if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      updateMetrics();
      renderTable();
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

    document.getElementById('vendorExportExcel').addEventListener('click', function (e) {
      e.preventDefault();
      var list = filterAndSortVendors();
      var headers = ['Name', 'Email', 'Vendor Type', 'Route', 'Status', 'Start Date'];
      var rows = list.map(function (v) {
        return [
          (v.firstName || '') + ' ' + (v.lastName || ''),
          v.email || '',
          vendorTypeLabel(v),
          v.route || '',
          v.status || 'Active',
          v.startDate || ''
        ].map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',');
      });
      var csv = [headers.join(','), rows.join('\n')].join('\n');
      var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vendors-export-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    document.getElementById('vendorExportPdf').addEventListener('click', function (e) {
      e.preventDefault();
      window.print();
    });
  }


  appendSpToLinks();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
    });
  } else {
    init();
  }
})();
