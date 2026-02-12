/**
 * SP Portal – Vehicles page (exact copy of Next.js Vehicles)
 * Header metrics, filters, table (VRN plate, Electric icon, status badges), VehicleModal (full form), DeleteVehicleModal.
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

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    var parts = String(dateStr).trim().split('-');
    if (parts.length < 3) return dateStr;
    var day = parts[2].split('T')[0].split(' ')[0];
    return (day || parts[2]) + '/' + parts[1] + '/' + parts[0];
  }

  var data = window.DHL_MOCK_DATA || {};
  var contracts = data.contracts || [];
  var spName = getCurrentSp();
  var localVehicles = [];
  var sortKey = 'vrn';
  var sortDir = 1;
  var editingVehicleId = null;

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

  function getAllVehiclesForSp() {
    var mock = (data.vehicles || []).filter(function (v) { return v.serviceProvider === spName; });
    var byId = {};
    mock.forEach(function (v) {
      var copy = Object.assign({}, v);
      if (copy.status === undefined) copy.status = 'Active';
      byId[copy.id] = copy;
    });
    localVehicles.forEach(function (v) { byId[v.id] = v; });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  }

  function getSearchQuery() {
    var el = document.getElementById('vehicleSearch');
    return (el && el.value) ? el.value.trim().toLowerCase() : '';
  }

  function getStatusFilter() {
    var el = document.getElementById('vehicleStatusFilter');
    return (el && el.value) ? el.value : 'all';
  }

  function getFuelFilter() {
    var el = document.getElementById('vehicleFuelFilter');
    return (el && el.value) ? el.value : 'all';
  }

  function filterAndSortVehicles() {
    var all = getAllVehiclesForSp();
    var q = getSearchQuery();
    var statusFilter = getStatusFilter();
    var fuelFilter = getFuelFilter();

    var list = all.filter(function (v) {
      var vrn = (v.vrn || '').toLowerCase();
      var brand = (v.brand || '').toLowerCase();
      var model = (v.model || '').toLowerCase();
      if (q && vrn.indexOf(q) === -1 && brand.indexOf(q) === -1 && model.indexOf(q) === -1) return false;
      if (statusFilter !== 'all' && (v.status || 'Active') !== statusFilter) return false;
      if (fuelFilter !== 'all' && (v.fuelType || '') !== fuelFilter) return false;
      return true;
    });

    list.sort(function (a, b) {
      var va, vb;
      switch (sortKey) {
        case 'vrn':
          va = (a.vrn || '').toLowerCase();
          vb = (b.vrn || '').toLowerCase();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'brand':
          va = (a.brand || '').toLowerCase();
          vb = (b.brand || '').toLowerCase();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'model':
          va = (a.model || '').toLowerCase();
          vb = (b.model || '').toLowerCase();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'registrationDate':
          va = (a.registrationDate || '');
          vb = (b.registrationDate || '');
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'fuelType':
          va = (a.fuelType || '').toLowerCase();
          vb = (b.fuelType || '').toLowerCase();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'status':
          va = (a.status || 'Active').toLowerCase();
          vb = (b.status || 'Active').toLowerCase();
          return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
        default:
          return 0;
      }
    });
    return list;
  }

  function updateMetrics() {
    var all = getAllVehiclesForSp();
    var total = all.length;
    var active = all.filter(function (v) { return (v.status || 'Active') === 'Active'; }).length;
    var inactive = all.filter(function (v) { return (v.status || '') === 'Inactive'; }).length;
    var available = all.filter(function (v) { return (v.status || '') === 'Available'; }).length;

    function set(id, n) {
      var el = document.getElementById(id);
      if (el) el.textContent = n;
    }
    set('metricTotal', total);
    set('metricActive', active);
    set('metricInactive', inactive);
    set('metricAvailable', available);
  }

  function statusBadgeClass(s) {
    if (s === 'Active') return 'status-badge-active';
    if (s === 'Inactive') return 'status-badge-inactive';
    if (s === 'Maintenance') return 'status-badge-maintenance';
    return 'status-badge-default';
  }

  function updateSortHeaders() {
    document.querySelectorAll('.vehicles-th-sort').forEach(function (th) {
      var key = th.getAttribute('data-sort');
      th.classList.remove('asc', 'desc');
      if (key === sortKey) th.classList.add(sortDir === 1 ? 'asc' : 'desc');
    });
  }

  function renderTable() {
    var tbody = document.getElementById('vehicleTableBody');
    var emptyEl = document.getElementById('vehicleEmptyState');
    if (!tbody) return;

    var list = filterAndSortVehicles();
    if (list.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      updateSortHeaders();
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    tbody.innerHTML = list.map(function (v, index) {
      var status = v.status || 'Active';
      var isLocal = localVehicles.some(function (lv) { return lv.id === v.id; });
      var vrnClass = 'vehicles-vrn-plate' + (v.fuelType === 'Electric' ? ' vehicles-vrn-electric' : '');
      var fuelHtml = v.fuelType === 'Electric'
        ? '<span class="d-inline-flex align-items-center justify-content-center gap-1"><i class="bi bi-lightning-charge-fill text-success" title="Electric"></i> Electric</span>'
        : escapeHtml(v.fuelType || '—');

      return '<tr data-vehicle-id="' + v.id + '">' +
        '<td><span class="' + vrnClass + '">' + escapeHtml(v.vrn || '—') + '</span></td>' +
        '<td>' + escapeHtml(v.brand || '—') + '</td>' +
        '<td>' + escapeHtml(v.model || '—') + '</td>' +
        '<td>' + formatDateDisplay(v.registrationDate) + '</td>' +
        '<td>' + fuelHtml + '</td>' +
        '<td><span class="status-badge ' + statusBadgeClass(status) + '">' + escapeHtml(status) + '</span></td>' +
        '<td><div class="d-flex justify-content-center gap-1">' +
        '<button type="button" class="vehicles-action-btn" data-vehicle-id="' + v.id + '" data-action="edit" aria-label="Edit vehicle"><i class="bi bi-pencil-fill"></i></button>' +
        (isLocal ? '<button type="button" class="vehicles-action-btn vehicles-action-delete" data-vehicle-id="' + v.id + '" data-action="delete" aria-label="Delete vehicle"><i class="bi bi-trash-fill"></i></button>' : '') +
        '</div></td></tr>';
    }).join('');

    tbody.querySelectorAll('.vehicles-action-btn[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openEditModal(parseInt(btn.getAttribute('data-vehicle-id'), 10)); });
    });
    tbody.querySelectorAll('.vehicles-action-btn[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDeleteModal(parseInt(btn.getAttribute('data-vehicle-id'), 10)); });
    });

    updateSortHeaders();
  }

  function fillDepotSelect() {
    var sel = document.getElementById('depot');
    if (!sel) return;
    var depots = getDepotsForSp();
    sel.innerHTML = depots.map(function (d) {
      return '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + '</option>';
    }).join('');
  }

  function getCurrentDateYMD() {
    var t = new Date();
    var y = t.getFullYear();
    var m = String(t.getMonth() + 1).padStart(2, '0');
    var d = String(t.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function openEditModal(vehicleId) {
    var all = getAllVehiclesForSp();
    var v = all.filter(function (x) { return x.id === vehicleId; })[0];
    if (!v) return;

    editingVehicleId = vehicleId;
    document.getElementById('vehicleModalTitle').textContent = 'Edit Vehicle';

    document.getElementById('vrn').value = v.vrn || '';
    document.getElementById('brand').value = v.brand || '';
    document.getElementById('model').value = v.model || '';
    document.getElementById('registrationDate').value = v.registrationDate || '';
    document.getElementById('color').value = v.color || '';
    document.getElementById('fuelType').value = (v.fuelType || 'Diesel') === 'Electric' ? 'Electric' : 'Diesel';
    document.getElementById('vehicleType').value = v.vehicleType || '';
    document.getElementById('depot').value = v.depot || '';
    document.getElementById('status').value = v.status || 'Active';
    document.getElementById('wrappedVehicle').checked = !!v.wrappedVehicle;
    document.getElementById('slamLock').checked = !!v.slamLock;
    document.getElementById('camera').checked = !!v.camera;
    document.getElementById('gps').checked = !!v.gps;
    document.getElementById('bulkhead').checked = !!v.bulkhead;
    document.getElementById('doors270').checked = !!v.doors270;
    document.getElementById('additionalNotes').value = v.additionalNotes || '';

    var modalEl = document.getElementById('vehicleModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function openDeleteModal(vehicleId) {
    var all = getAllVehiclesForSp();
    var v = all.filter(function (x) { return x.id === vehicleId; })[0];
    if (!v) return;

    document.getElementById('deleteVehicleVrn').textContent = v.vrn || '—';
    document.getElementById('deleteVehicleVrn').className = 'vehicles-vrn-plate' + (v.fuelType === 'Electric' ? ' vehicles-vrn-electric' : '');
    document.getElementById('deleteVehicleConfirmBtn').setAttribute('data-vehicle-id', vehicleId);

    var modalEl = document.getElementById('deleteVehicleModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function collectFormData() {
    return {
      vrn: document.getElementById('vrn').value.trim(),
      brand: document.getElementById('brand').value.trim(),
      model: document.getElementById('model').value.trim(),
      registrationDate: document.getElementById('registrationDate').value,
      color: document.getElementById('color').value.trim(),
      fuelType: document.getElementById('fuelType').value,
      vehicleType: document.getElementById('vehicleType').value || undefined,
      depot: document.getElementById('depot').value,
      status: document.getElementById('status').value,
      wrappedVehicle: document.getElementById('wrappedVehicle').checked,
      slamLock: document.getElementById('slamLock').checked,
      camera: document.getElementById('camera').checked,
      gps: document.getElementById('gps').checked,
      bulkhead: document.getElementById('bulkhead').checked,
      doors270: document.getElementById('doors270').checked,
      additionalNotes: document.getElementById('additionalNotes').value.trim() || undefined
    };
  }

  function initSort() {
    document.querySelectorAll('.vehicles-th-sort').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-sort');
        if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; }
        renderTable();
      });
    });
  }

  function init() {
    if (!spName) {
      document.getElementById('spNotFound').classList.remove('hidden');
      return;
    }
    document.getElementById('spNotFound').classList.add('hidden');
    document.getElementById('spVehicleContent').classList.remove('hidden');

    var logoMap = { 'BA Express': 'ba-express-logo.png', 'Premier Logistics Ltd': 'premier-logistics-logo.png', 'Swift Haul Solutions': 'swift-haul-logo.png', 'Metro Freight Partners': 'metro-freight-logo.png', 'Atlas Transport Services': 'atlas-transport-logo.png' };
    document.getElementById('spHeaderName').textContent = spName;
    var avatar = document.getElementById('spHeaderAvatar');
    if (avatar && logoMap[spName]) {
      avatar.src = '../assets/' + logoMap[spName];
      avatar.alt = spName;
      avatar.style.display = 'block';
    }

    fillDepotSelect();
    updateMetrics();
    renderTable();
    initSort();

    document.getElementById('vehicleSearch').addEventListener('input', function () { updateMetrics(); renderTable(); });
    document.getElementById('vehicleStatusFilter').addEventListener('change', function () { updateMetrics(); renderTable(); });
    document.getElementById('vehicleFuelFilter').addEventListener('change', function () { updateMetrics(); renderTable(); });

    document.getElementById('addVehicleBtn').addEventListener('click', function () {
      editingVehicleId = null;
      document.getElementById('vehicleModalTitle').textContent = 'Add New Vehicle';
      document.getElementById('vehicleForm').reset();
      document.getElementById('registrationDate').value = getCurrentDateYMD();
      fillDepotSelect();
      var modalEl = document.getElementById('vehicleModal');
      if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });

    document.getElementById('vehicleForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = collectFormData();
      if (!fd.vrn || !fd.brand || !fd.model || !fd.registrationDate || !fd.color || !fd.depot) return;

      if (editingVehicleId !== null) {
        var idx = localVehicles.findIndex(function (x) { return x.id === editingVehicleId; });
        if (idx !== -1) {
          localVehicles[idx] = Object.assign({}, localVehicles[idx], fd, { id: editingVehicleId, serviceProvider: spName });
        } else {
          var existing = getAllVehiclesForSp().filter(function (x) { return x.id === editingVehicleId; })[0];
          if (existing) {
            localVehicles.push(Object.assign({}, existing, fd, { id: existing.id, serviceProvider: spName }));
          }
        }
      } else {
        var maxId = 0;
        (data.vehicles || []).concat(localVehicles).forEach(function (v) { if (v.id > maxId) maxId = v.id; });
        localVehicles.push(Object.assign({}, fd, {
          id: maxId + 1,
          serviceProvider: spName,
          vin: null
        }));
      }

      var modalEl = document.getElementById('vehicleModal');
      if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      updateMetrics();
      renderTable();
    });

    document.getElementById('deleteVehicleConfirmBtn').addEventListener('click', function () {
      var id = parseInt(this.getAttribute('data-vehicle-id'), 10);
      localVehicles = localVehicles.filter(function (v) { return v.id !== id; });
      var modalEl = document.getElementById('deleteVehicleModal');
      if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      updateMetrics();
      renderTable();
    });

    document.getElementById('vehicleExportExcel').addEventListener('click', function (e) {
      e.preventDefault();
      var list = filterAndSortVehicles();
      var headers = ['VRN', 'Manufacturer', 'Model', 'Registration Date', 'Fuel Type', 'Status'];
      var rows = list.map(function (v) {
        return [v.vrn || '', v.brand || '', v.model || '', formatDateDisplay(v.registrationDate), v.fuelType || '', v.status || 'Active']
          .map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',');
      });
      var csv = [headers.join(','), rows.join('\n')].join('\n');
      var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vehicles-report-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    document.getElementById('vehicleExportPdf').addEventListener('click', function (e) {
      e.preventDefault();
      window.print();
    });
  }

  function initBeamSidebar() {
    var beam = document.getElementById('beamSidebar');
    var trigger = document.getElementById('beamTrigger');
    var overlay = document.getElementById('beamOverlay');
    if (!beam || !trigger) return;
    function toggleBeam() {
      var isOpen = beam.getAttribute('data-state') === 'open';
      beam.setAttribute('data-state', isOpen ? 'closed' : 'open');
      trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      if (overlay) overlay.classList.toggle('visible', !isOpen);
    }
    trigger.addEventListener('click', toggleBeam);
    if (overlay) overlay.addEventListener('click', function () {
      beam.setAttribute('data-state', 'closed');
      trigger.setAttribute('aria-expanded', 'false');
      overlay.classList.remove('visible');
    });
  }

  appendSpToLinks();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
      initBeamSidebar();
    });
  } else {
    init();
    initBeamSidebar();
  }
})();
