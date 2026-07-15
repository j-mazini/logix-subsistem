/* =====================================================
   Route Balance — Operational dashboard
   Vanilla JS, modular class-based architecture
   ===================================================== */

class RouteBalanceApp {
  constructor() {
    // ---- State ----
    this.routes = [];
    this.stops = [];
    this.currentUser = 'João Silva';
    this.operationStatus = 'pending';
    this.filterPM = false;          // false = AM view (hide PM), true = PM view (show all)
    this.searchQuery = '';
    this.vendorFilter = '';
    this.statusFilter = '';
    this.sortKey = null;
    this.sortAsc = true;
    this.editingStopId = null;      // stop currently open in the Edit Postcode modal
    this.rebalanceMode = false;     // admin mode for transferring postcodes between routes
    this.dragPayload = null;        // { subpostcode, sourceRouteId } during a drag
    this.expandedSubpostcodes = new Set(); // `${routeId}:${subcode}` keys currently expanded
    this.transferContext = null;    // state for the Send Subpostcode/Postcode modal

    // ---- Static datasets for fake data generation ----
    this.VENDORS = ['FedEx', 'UPS', 'DPD', 'TNT', 'Logixsphere'];
    this.DRIVERS = ['Carlos Silva', 'Ana Costa', 'João Martins', 'Maria Santos', 'Pedro Oliveira',
                    'Lucas Pereira', 'Sofia Alves', 'Ricardo Dias', 'Juliana Ribeiro', 'Felipe Costa'];
    this.VEHICLES = ['Van-001', 'Van-002', 'Van-003', 'Truck-001', 'Truck-002', 'Truck-003', 'Bike-001', 'Car-001'];
    // Subpostcodes (outward area codes) each grouping several full postcodes.
    this.SUBPOSTCODES = Array.from({ length: 8 }, (_, i) => `ME${i + 1}`);
    this.POSTCODES = this.SUBPOSTCODES.flatMap(sub =>
      Array.from({ length: 5 }, (_, i) => `${sub} ${i + 1}AB`));
    this.STREETS = ['High Street', 'Station Road', 'Church Lane', 'Victoria Avenue', 'Mill Road',
                    'Park View', 'Queensway', 'Riverside Drive'];

    this.init();
  }

  /* ==================== INIT ==================== */

  init() {
    this.generateFakeData();
    this.loadRebalanceState();
    this.setupEventListeners();
    this.populateVendorFilter();
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);
    this.render();

    // Loading screen: fade out once first render is done
    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.remove('active');
      this.showToast('Operation data loaded', 'success');
    }, 700);
  }

  /* ==================== FAKE DATA ==================== */

  rand(n) { return Math.floor(Math.random() * n); }
  pick(arr) { return arr[this.rand(arr.length)]; }

  generateFakeData() {
    let stopId = 1;

    for (let i = 1; i <= 8; i++) {
      const totalStops = 22 + this.rand(8);          // ~25 stops x 8 routes ≈ 200
      const deliveries = Math.floor(totalStops * 0.72);
      const completion = this.rand(101);
      const completedStops = Math.round(totalStops * completion / 100);

      const route = {
        id: i,
        name: `A-${String(i).padStart(2, '0')}`,
        vendor: this.pick(this.VENDORS),
        driver: this.DRIVERS[(i - 1) % this.DRIVERS.length],
        vehicle: this.pick(this.VEHICLES),
        target: 80 + this.rand(16),
        totalStops, completedStops, completion,
        deliveries,
        pickups: totalStops - deliveries,
        pre12: 0,                                    // computed from stops below
        asr: 0,                                      // Achieved Service Rate (count)
        dsr: 0,                                      // Delayed Service Rate (count)
        spr: 90 + this.rand(80),
        notes: '',
        status: 'pending',
        stops: [],
      };

      route.status = this.deriveStatus(route);

      for (let j = 0; j < totalStops; j++) {
        route.stops.push({
          id: stopId++,
          routeName: route.name,
          stopNumber: j + 1,
          postcode: this.pick(this.POSTCODES),
          address: `${1 + this.rand(200)} ${this.pick(this.STREETS)}`,
          customer: `Customer ${100 + this.rand(900)}`,
          type: j < deliveries ? 'DEL' : 'PU',
          pm: Math.random() > 0.68,                  // flag PM = true → hidden in AM view
          pre12: Math.random() > 0.78,               // flag Pre 12 = must deliver before 12:00
          asr: Math.random() > 0.15,                 // Achieved Service Rate
          dsr: Math.random() > 0.12,                 // Delayed Service Rate
          status: j < completedStops ? 'completed' : 'pending',
        });
      }

      route.pre12 = route.stops.filter(s => s.pre12).length;
      route.asr = route.stops.filter(s => s.asr).length;
      route.dsr = route.stops.filter(s => s.dsr).length;
      this.routes.push(route);
      this.stops.push(...route.stops);
    }
  }

  deriveStatus(route) {
    if (route.completion >= 100) return 'finished';
    if (route.completion === 0) return 'pending';
    if (route.completion < route.target - 30) return 'delayed';
    return 'running';
  }

  /* ==================== EVENTS ==================== */

  setupEventListeners() {
    document.getElementById('btnRefresh').addEventListener('click', () => this.refresh());
    document.getElementById('btnStart').addEventListener('click', () => this.startOperation());
    document.getElementById('btnFinish').addEventListener('click', () => this.finishOperation());
    document.getElementById('btnAddRoute').addEventListener('click', () => this.showAddRouteModal());
    document.getElementById('btnCollapseRoutes').addEventListener('click', () => this.collapseRoute());
    document.getElementById('btnExportCsv').addEventListener('click', () => this.exportCsv());
    document.getElementById('btnSaveRoute').addEventListener('click', () => this.saveNewRoute());
    document.getElementById('btnSaveStop').addEventListener('click', () => this.saveStopEdit());
    document.getElementById('btnViewAllPre12').addEventListener('click', () => this.showPre12Modal());
    document.getElementById('btnAddPostcode').addEventListener('click', () => this.showAddPostcodeModal());
    document.getElementById('btnConfirmAddPostcode').addEventListener('click', () => this.confirmAddPostcode());

    document.getElementById('sendSubpostcodeBtn').addEventListener('click', () => {
      if (this.transferContext) { this.transferContext.mode = 'subpostcode'; this.renderTransferModalBody(); }
    });
    document.getElementById('sendPostcodeBtn').addEventListener('click', () => {
      if (this.transferContext) { this.transferContext.mode = 'postcode'; this.renderTransferModalBody(); }
    });
    document.getElementById('btnConfirmTransfer').addEventListener('click', () => this.confirmTransfer());
    document.getElementById('transferModal').addEventListener('hidden.bs.modal', () => {
      this.transferContext = null;
    });

    document.getElementById('ampmToggle').addEventListener('change', (e) => {
      this.filterPM = e.target.checked;
      this.render();
      this.showToast(this.filterPM ? '📅 PM View: Meeting Mode' : '🚚 AM View: Regular Deliveries', 'info');
    });

    document.getElementById('rebalanceToggle').addEventListener('change', (e) => {
      this.rebalanceMode = e.target.checked;
      this.render();
      this.showToast(this.rebalanceMode ? '🔄 Rebalance mode: select postcodes to transfer' : 'Operations mode: standard view', 'info');
    });

    document.getElementById('searchRoute').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.render();
    });

    document.getElementById('filterVendor').addEventListener('change', (e) => {
      this.vendorFilter = e.target.value;
      this.render();
    });

    document.getElementById('filterStatus').addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.render();
    });

    // Table sorting on summary table headers
    document.querySelectorAll('#summaryTable th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (this.sortKey === key) this.sortAsc = !this.sortAsc;
        else { this.sortKey = key; this.sortAsc = true; }
        this.render();
      });
    });
  }

  /* ==================== HEADER CLOCK ==================== */

  updateDateTime() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('operationDate').textContent = `${dd}/${mm}/${now.getFullYear()}`;
    document.getElementById('operationTime').textContent =
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('currentUser').textContent = this.currentUser;
  }

  /* ==================== FILTERING ==================== */

  /**
   * Stops visible under the current AM/PM shift filter.
   * AM (filterPM=false): Regular morning deliveries (pm=false)
   * PM (filterPM=true): Only meeting-type stops (special PM view)
   */
  visibleStops(route) {
    if (this.filterPM) {
      // PM view: show only stops flagged as pm (meeting/afternoon deliveries)
      return route.stops.filter(s => s.pm);
    } else {
      // AM view: show only regular morning deliveries
      return route.stops.filter(s => !s.pm);
    }
  }

  /** The outward area code a full postcode belongs to, e.g. "ME3 2AB" → "ME3". */
  subpostcodeOf(postcode) {
    return postcode.split(' ')[0];
  }

  /**
   * Groups a flat stop list into subpostcode → postcode → stops[] for
   * the route table. Groups containing a Pre 12 stop sort first.
   */
  groupBySubpostcode(stops) {
    const bySub = new Map();
    stops.forEach(s => {
      const sub = this.subpostcodeOf(s.postcode);
      if (!bySub.has(sub)) bySub.set(sub, new Map());
      const byPc = bySub.get(sub);
      if (!byPc.has(s.postcode)) byPc.set(s.postcode, []);
      byPc.get(s.postcode).push(s);
    });

    const groups = [...bySub.entries()].map(([code, byPc]) => {
      const groupStops = [...byPc.values()].flat();
      const del = groupStops.filter(s => s.type === 'DEL').length;
      const completed = groupStops.filter(s => s.status === 'completed').length;
      return {
        code,
        postcodes: [...byPc.entries()].map(([postcode, pcStops]) => ({
          postcode,
          stops: pcStops,
          del: pcStops.filter(s => s.type === 'DEL').length,
          pu: pcStops.filter(s => s.type === 'PU').length,
          pre12: pcStops.some(s => s.pre12),
        })),
        del,
        pu: groupStops.length - del,
        total: groupStops.length,
        completion: groupStops.length ? Math.round(completed / groupStops.length * 100) : 0,
        allCompleted: completed === groupStops.length,
        pre12: groupStops.some(s => s.pre12),
      };
    });

    groups.sort((a, b) => (b.pre12 === true) - (a.pre12 === true));
    return groups;
  }

  /** Routes that pass search + vendor + status filters. */
  filteredRoutes() {
    let list = [...this.routes];

    if (this.searchQuery) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(this.searchQuery) ||
        r.driver.toLowerCase().includes(this.searchQuery));
    }
    if (this.vendorFilter) list = list.filter(r => r.vendor === this.vendorFilter);
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);

    if (this.sortKey) {
      const k = this.sortKey, dir = this.sortAsc ? 1 : -1;
      list.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir);
    }

    return list;
  }

  /** Get all Pre-12 stops grouped by route. */
  getPre12Stops() {
    const stops = [];
    this.routes.forEach(route => {
      const pre12Stops = route.stops.filter(s => s.pre12 && !s.pm);
      pre12Stops.forEach(s => stops.push({ ...s, routeName: route.name, vendor: route.vendor }));
    });
    return stops;
  }

  /* ==================== ACTIONS ==================== */

  refresh() {
    this.render();
    this.showToast('Data refreshed', 'info');
  }

  startOperation() {
    this.operationStatus = 'running';
    this.routes.forEach(r => { if (r.status === 'pending') r.status = 'running'; });
    this.render();
    this.showToast('Operation started — routes set to Running', 'success');
  }

  finishOperation() {
    if (!confirm('Are you sure?')) return;
    this.operationStatus = 'finished';
    this.routes.forEach(r => {
      r.status = 'finished';
      r.completion = 100;
      r.completedStops = r.totalStops;
      r.stops.forEach(s => s.status = 'completed');
    });
    this.render();
    this.showToast('Operation finished', 'success');
  }

  showAddRouteModal() {
    const fill = (id, arr) => {
      document.getElementById(id).innerHTML =
        arr.map(v => `<option value="${v}">${v}</option>`).join('');
    };
    fill('newVendor', this.VENDORS);
    fill('newDriver', this.DRIVERS);
    fill('newVehicle', this.VEHICLES);
    new bootstrap.Modal(document.getElementById('addRouteModal')).show();
  }

  saveNewRoute() {
    const name = document.getElementById('newRouteName').value.trim();
    const target = parseInt(document.getElementById('newTarget').value, 10);

    if (!name) { this.showToast('Route name is required', 'error'); return; }
    if (this.routes.some(r => r.name === name)) {
      this.showToast('A route with this name already exists', 'error'); return;
    }

    this.routes.push({
      id: Date.now(),
      name,
      vendor: document.getElementById('newVendor').value,
      driver: document.getElementById('newDriver').value,
      vehicle: document.getElementById('newVehicle').value,
      target: isNaN(target) ? 85 : target,
      totalStops: 0, completedStops: 0, completion: 0,
      deliveries: 0, pickups: 0,
      pre12: 0, asr: 0, dsr: 0, spr: 0,
      notes: '', status: 'pending', stops: [],
    });

    bootstrap.Modal.getInstance(document.getElementById('addRouteModal')).hide();
    document.getElementById('addRouteForm').reset();
    document.getElementById('newTarget').value = 85;
    this.render();
    this.showToast(`Route ${name} added`, 'success');
  }

  /**
   * Close a route and redistribute its postcodes/stops evenly across the
   * remaining routes. Pass a routeId to close that specific route (from the
   * per-block "Close route" button); with no id, closes the route with the
   * fewest stops (from the toolbar "Collapse Routes" button).
   */
  collapseRoute(routeId = null) {
    if (this.routes.length <= 1) {
      this.showToast('At least two routes are required to collapse', 'error');
      return;
    }

    const removed = routeId != null
      ? this.routes.find(r => r.id === Number(routeId))
      : this.routes.reduce((min, r) => r.totalStops < min.totalStops ? r : min);

    if (!removed) {
      this.showToast('Route not found', 'error');
      return;
    }
    if (!confirm(`Close route ${removed.name}? Its ${removed.totalStops} postcodes will be redistributed across the other routes.`)) return;

    this.routes = this.routes.filter(r => r !== removed);

    // Round-robin redistribution of the removed route's stops
    removed.stops.forEach((stop, i) => {
      const dest = this.routes[i % this.routes.length];
      stop.routeName = dest.name;
      stop.stopNumber = dest.stops.length + 1;
      dest.stops.push(stop);
    });

    // Recompute per-route aggregates
    this.routes.forEach(r => this.recomputeRoute(r));
    this.persistRebalance();
    this.render();
    this.showToast(`Route ${removed.name} closed — postcodes redistributed`, 'success');
  }

  recomputeRoute(route) {
    route.totalStops = route.stops.length;
    route.deliveries = route.stops.filter(s => s.type === 'DEL').length;
    route.pickups = route.totalStops - route.deliveries;
    route.completedStops = route.stops.filter(s => s.status === 'completed').length;
    route.pre12 = route.stops.filter(s => s.pre12).length;
    route.asr = route.stops.filter(s => s.asr).length;
    route.dsr = route.stops.filter(s => s.dsr).length;
    route.completion = route.totalStops
      ? Math.round(route.completedStops / route.totalStops * 100) : 0;
    route.status = this.deriveStatus(route);
  }

  /* ==================== CSV EXPORT (Demi8 Format) ==================== */

  exportCsv() {
    const header = ['Route', 'Vendor', 'Target (%)', 'Total Stops', 'Status'];
    const rows = this.filteredRoutes().map(r =>
      [r.name, r.vendor, r.target, r.totalStops, r.status]);

    const csv = [header, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `demi8-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('✓ Demi8 report exported', 'success');
  }

  /* ==================== RENDER ==================== */

  render() {
    this.updateDashboardCards();
    this.renderPre12Section();
    this.renderSummaryTable();
    this.renderRouteBlocks();
  }

  renderPre12Section() {
    const pre12Stops = this.getPre12Stops();
    const section = document.getElementById('pre12Section');
    const grid = document.getElementById('pre12CardsGrid');

    if (pre12Stops.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';

    // Group by route
    const byRoute = new Map();
    pre12Stops.forEach(s => {
      if (!byRoute.has(s.routeName)) byRoute.set(s.routeName, []);
      byRoute.get(s.routeName).push(s);
    });

    grid.innerHTML = [...byRoute.entries()].map(([routeName, stops]) => `
      <div class="pre12-card">
        <div class="pre12-card-header">
          <h4>${routeName}</h4>
          <span class="pre12-card-count">${stops.length}</span>
        </div>
        <div class="pre12-card-list">
          ${stops.slice(0, 3).map(s => `
            <div class="pre12-item">
              <span class="pre12-postcode">${s.postcode}</span>
              <span class="pre12-customer">${s.customer}</span>
            </div>`).join('')}
          ${stops.length > 3 ? `<div class="pre12-more">+${stops.length - 3} more</div>` : ''}
        </div>
      </div>`).join('');
  }

  populateVendorFilter() {
    document.getElementById('filterVendor').innerHTML =
      '<option value="">All vendors</option>' +
      this.VENDORS.map(v => `<option value="${v}">${v}</option>`).join('');
  }

  updateDashboardCards() {
    const routes = this.routes;
    const stops = routes.flatMap(r => this.visibleStops(r));

    const totalStops = stops.length;
    const deliveries = stops.filter(s => s.type === 'DEL').length;
    const pickups = totalStops - deliveries;
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const set = (id, v) => { document.getElementById(id).textContent = v; };
    set('totalStopsCard', totalStops);
    set('deliveriesCard', deliveries);
    set('pickupsCard', pickups);
    set('sprCard', Math.round(avg(routes.map(r => r.spr))));
    set('targetLoopCard', Math.round(avg(routes.map(r => r.target))) + '%');
    set('completionCard', Math.round(avg(routes.map(r => r.completion))) + '%');
    set('totalRoutesCard', routes.length);
    set('driversOnlineCard', new Set(routes.filter(r => r.status === 'running').map(r => r.driver)).size);
  }

  statusBadge(status) {
    return `<span class="status-badge status-badge-${status}">${status}</span>`;
  }

  renderSummaryTable() {
    const tableBody = document.getElementById('summaryTableBody');

    // Update table header based on shift
    const thead = document.querySelector('#summaryTable thead tr');
    if (this.filterPM) {
      // PM view: simpler headers
      thead.innerHTML = `
        <th>Route</th>
        <th>Driver</th>
        <th>Meeting Stops</th>
        <th>Status</th>
      `;
    } else {
      // AM view: headers without Vehicle and Completion %
      thead.innerHTML = `
        <th data-sort="name">Route <i class="bi bi-arrow-down-up"></i></th>
        <th data-sort="vendor">Vendor <i class="bi bi-arrow-down-up"></i></th>
        <th data-sort="target">Target (%)</th>
        <th data-sort="totalStops">Total Stops</th>
        <th data-sort="status">Status</th>
      `;
    }

    tableBody.innerHTML = this.filteredRoutes().map(route => {
      if (this.filterPM) {
        const pmStops = this.visibleStops(route).length;
        return `
          <tr>
            <td><strong>${route.name}</strong></td>
            <td>${route.driver}</td>
            <td>${pmStops}</td>
            <td>${this.statusBadge(route.status)}</td>
          </tr>`;
      } else {
        return `
          <tr>
            <td><strong>${route.name}</strong></td>
            <td>${route.vendor}</td>
            <td>${route.target}%</td>
            <td>${this.visibleStops(route).length}</td>
            <td>${this.statusBadge(route.status)}</td>
          </tr>`;
      }
    }).join('');
  }

  renderRouteBlocks() {
    const container = document.getElementById('routeBlocksContainer');
    const routes = this.filteredRoutes();

    if (this.filterPM) {
      // PM (Meeting) View
      container.innerHTML = routes.map(route => {
        const stops = this.visibleStops(route);
        if (stops.length === 0) return '';

        return `
        <section class="route-block pm-meeting-view" data-route-id="${route.id}">
          <div class="route-block-header">
            <h3 class="route-block-title">📅 Route ${route.name} — Meeting View</h3>
            <div class="route-block-header-right">
              <span class="shift-badge shift-badge-pm">PM</span>
            </div>
          </div>

          <div class="route-block-content">
            <div class="route-info-grid">
              <div class="info-box">
                <span class="info-box-label">Driver</span>
                <span class="info-box-value">${route.driver}</span>
              </div>
              <div class="info-box">
                <span class="info-box-label">Vendor</span>
                <span class="info-box-value">${route.vendor}</span>
              </div>
            </div>

            <div class="route-table-responsive">
              <table class="route-table">
                <thead>
                  <tr>
                    <th>Stop #</th><th>Address</th><th>Postcode</th><th>Customer</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${stops.map((s, idx) => `
                  <tr>
                    <td>#${idx + 1}</td>
                    <td>${s.address}</td>
                    <td>${s.postcode}</td>
                    <td>${s.customer}</td>
                    <td>${this.statusBadge(s.status)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="route-totals">
              <div class="total-item">
                <div class="total-label">Meeting Stops</div>
                <div class="total-value">${stops.length}</div>
              </div>
            </div>

            <div class="route-buttons">
              <button class="styled-button styled-button--outline" data-action="see-all-stops">
                <i class="bi bi-geo-alt"></i> See All Stops
              </button>
            </div>
          </div>
        </section>`;
      }).join('');
    } else {
      // AM (Regular Delivery) View
      container.innerHTML = routes.map(route => {
        const stops = this.visibleStops(route);
        const groups = this.groupBySubpostcode(stops);
        const del = stops.filter(s => s.type === 'DEL').length;
        const pu = stops.length - del;
        const rebalanceClass = this.rebalanceMode ? 'rebalance-mode' : '';

        return `
        <section class="route-block ${rebalanceClass}" data-route-id="${route.id}">
          <div class="route-block-header">
            <h3 class="route-block-title">Route ${route.name}</h3>
            <div class="route-block-header-right">
              <button class="route-collapse-btn" data-action="collapse-route" data-route-id="${route.id}"
                      title="Close this route and redistribute its postcodes">
                <i class="bi bi-box-arrow-in-down"></i> Close route
              </button>
            </div>
          </div>

        <div class="progress-bar-container">
          <div class="progress-bar-wrapper">
            <div class="progress-bar-fill" style="width:${route.completion}%"></div>
          </div>
        </div>

        <div class="route-block-content">
          <div class="route-info-grid">
            <div class="info-box">
              <span class="info-box-label">Vendor (Driver)</span>
              <select class="info-box-select" data-field="vendor" title="Change vendor/driver">
                ${this.VENDORS.map(v => `<option value="${v}" ${v === route.vendor ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
            <div class="info-box">
              <span class="info-box-label">Driver</span>
              <span class="info-box-value">${route.driver}</span>
            </div>
          </div>

          <div class="route-table-responsive">
            <table class="route-table">
              <thead>
                <tr>
                  <th>Subpostcode</th><th>DEL</th><th>PU</th><th>Total</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${groups.map(g => {
                  const key = `${route.id}:${g.code}`;
                  const expanded = this.expandedSubpostcodes.has(key);
                  return `
                  <tr class="subpostcode-row ${this.rebalanceMode ? 'rebalance-row' : ''}"
                      ${this.rebalanceMode ? 'draggable="true"' : ''}
                      data-subpostcode="${g.code}" data-route-id="${route.id}">
                    <td class="pc-cell">
                      ${this.rebalanceMode ? '<i class="bi bi-grip-vertical drag-handle"></i>' : ''}
                      <button type="button" class="subpostcode-toggle ${expanded ? 'expanded' : ''}"
                              data-action="toggle-subpostcode" data-subpostcode="${g.code}" data-route-id="${route.id}">
                        <i class="bi bi-chevron-right"></i> ${g.code}
                      </button>
                      <span class="postcode-count-badge">${g.postcodes.length} postcode${g.postcodes.length === 1 ? '' : 's'}</span>
                      ${g.pre12 ? '<span class="status-badge status-badge-pre12">Pre 12</span>' : ''}
                    </td>
                    <td>${g.del}</td>
                    <td>${g.pu}</td>
                    <td>${g.total}</td>
                    <td>${this.statusBadge(g.allCompleted ? 'completed' : 'pending')}</td>
                  </tr>
                  <tr class="subpostcode-detail-row ${expanded ? '' : 'collapsed'}">
                    <td colspan="6">
                      <div class="postcode-dropdown">
                        ${g.postcodes.map(p => `
                          <div class="postcode-dropdown-item">
                            <span class="postcode-editable" data-stop-id="${p.stops[0].id}" title="Click to edit / substitute">${p.postcode}</span>
                            ${p.pre12 ? '<span class="status-badge status-badge-pre12">Pre 12</span>' : ''}
                            <span class="pc-mini-stat">DEL ${p.del}</span>
                            <span class="pc-mini-stat">PU ${p.pu}</span>
                          </div>`).join('')}
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="route-totals">
            <div class="total-item">
              <div class="total-label">Total Deliveries</div>
              <div class="total-value">${del}</div>
            </div>
            <div class="total-item">
              <div class="total-label">Total Pickups</div>
              <div class="total-value">${pu}</div>
            </div>
            <div class="total-item">
              <div class="total-label">Total Geral</div>
              <div class="total-value">${stops.length}</div>
            </div>
          </div>

          <div class="metrics-row">
            <div class="metric-badge metric-badge--pre12">
              <div class="metric-label">Pre 12</div>
              <div class="metric-value">${route.pre12}</div>
            </div>
            <div class="metric-badge metric-badge--asr">
              <div class="metric-label">ASR</div>
              <div class="metric-value">${route.asr}</div>
            </div>
            <div class="metric-badge metric-badge--dsr">
              <div class="metric-label">DSR</div>
              <div class="metric-value">${route.dsr}</div>
            </div>
          </div>

          <div class="notes-section">
            <label class="notes-label">Notes</label>
            <textarea class="notes-textarea" placeholder="Write observations…">${route.notes}</textarea>
          </div>

          ${this.rebalanceMode ? `
          <p class="rebalance-hint">
            <i class="bi bi-info-circle"></i>
            Drag a subpostcode onto another route to send it whole or split specific postcodes into it.
          </p>
          ` : ''}

          <div class="route-buttons">
            <button class="styled-button styled-button--outline" data-action="see-all-stops">
              <i class="bi bi-geo-alt"></i> See All Stops
            </button>
            <button class="styled-button styled-button--outline" data-action="shipment-details">
              <i class="bi bi-box2"></i> Shipment Details
            </button>
          </div>
        </div>
      </section>`;
      }).join('');
    }

    this.bindRouteBlockEvents(container);
  }

  bindRouteBlockEvents(container) {
    container.querySelectorAll('.route-block').forEach(block => {
      const route = this.routes.find(r => r.id === Number(block.dataset.routeId));
      if (!route) return;

      // Editable vendor / vehicle via dropdown
      block.querySelectorAll('.info-box-select').forEach(el => {
        el.addEventListener('change', () => {
          const field = el.dataset.field;
          route[field] = el.value;
          this.render();
          this.showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated to ${el.value}`, 'success');
        });
      });

      // Editable postcodes (inside an expanded subpostcode dropdown) → Edit Postcode modal
      block.querySelectorAll('.postcode-editable').forEach(el => {
        el.addEventListener('click', () => {
          const stop = this.stops.find(s => s.id === Number(el.dataset.stopId));
          if (stop) this.showEditStopModal(stop);
        });
      });

      // Expand/collapse a subpostcode to reveal its individual postcodes.
      // Toggled directly in the DOM (no this.render()) so the rest of the
      // dashboard doesn't flash/redraw on every expand/collapse click.
      block.querySelectorAll('.subpostcode-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const key = `${btn.dataset.routeId}:${btn.dataset.subpostcode}`;
          const expanded = this.expandedSubpostcodes.has(key);
          const willExpand = !expanded;

          if (willExpand) this.expandedSubpostcodes.add(key);
          else this.expandedSubpostcodes.delete(key);

          btn.classList.toggle('expanded', willExpand);
          const detailRow = btn.closest('tr.subpostcode-row')?.nextElementSibling;
          if (detailRow && detailRow.classList.contains('subpostcode-detail-row')) {
            detailRow.classList.toggle('collapsed', !willExpand);
          }
        });
      });

      // Notes persistence
      block.querySelector('.notes-textarea').addEventListener('change', (e) => {
        route.notes = e.target.value;
      });

      // Modals
      block.querySelector('[data-action="see-all-stops"]')
        .addEventListener('click', () => this.showAllStopsModal(route));
      block.querySelector('[data-action="shipment-details"]')
        .addEventListener('click', () => this.showShipmentDetailsModal(route));

      // Close route: redistribute this route's postcodes across the others
      const collapseBtn = block.querySelector('[data-action="collapse-route"]');
      if (collapseBtn) {
        collapseBtn.addEventListener('click', () => this.collapseRoute(route.id));
      }

      // Rebalance mode: drag a subpostcode group onto another route
      if (this.rebalanceMode) {
        // Each subpostcode row (not its expanded detail rows) is a drag source
        block.querySelectorAll('tr.subpostcode-row.rebalance-row').forEach(row => {
          row.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            // stash the payload on the app so drop always has it (dataTransfer
            // can be unreliable across some browsers / re-renders)
            this.dragPayload = {
              subpostcode: row.dataset.subpostcode,
              sourceRouteId: Number(row.dataset.routeId),
            };
            e.dataTransfer.setData('text/plain', row.dataset.subpostcode);
            row.classList.add('dragging');
          });

          row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            this.dragPayload = null;
            document.querySelectorAll('.route-block.drop-target')
              .forEach(b => b.classList.remove('drop-target'));
          });
        });

        // The whole route block is a drop zone — drop a subpostcode onto
        // another route's block to open the transfer modal.
        block.addEventListener('dragover', (e) => {
          if (!this.dragPayload) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (this.dragPayload.sourceRouteId !== route.id) {
            block.classList.add('drop-target');
          }
        });

        block.addEventListener('dragleave', (e) => {
          const rect = block.getBoundingClientRect();
          if (e.clientX < rect.left || e.clientX > rect.right ||
              e.clientY < rect.top || e.clientY > rect.bottom) {
            block.classList.remove('drop-target');
          }
        });

        block.addEventListener('drop', (e) => {
          e.preventDefault();
          block.classList.remove('drop-target');
          const payload = this.dragPayload;
          if (!payload) return;
          const targetRouteId = route.id;
          if (payload.sourceRouteId !== targetRouteId) {
            this.openTransferModal(payload.sourceRouteId, targetRouteId, payload.subpostcode);
          }
        });
      }
    });
  }

  /* ==================== MODALS ==================== */

  /**
   * Edit Postcode modal: edit a single stop's postcode (and Pre 12 flag),
   * or substitute the postcode across every stop of the route that shares it.
   */
  showEditStopModal(stop) {
    this.editingStopId = stop.id;

    // Datalist with all postcodes currently in use (for substitution)
    const unique = [...new Set(this.stops.map(s => s.postcode))].sort();
    document.getElementById('postcodeList').innerHTML =
      unique.map(pc => `<option value="${pc}"></option>`).join('');

    document.getElementById('editPostcode').value = stop.postcode;
    document.getElementById('editPre12').checked = stop.pre12;
    document.getElementById('scopeSingle').checked = true;
    document.getElementById('scopeAllPostcode').textContent = stop.postcode;

    new bootstrap.Modal(document.getElementById('editStopModal')).show();
  }

  saveStopEdit() {
    const stop = this.stops.find(s => s.id === this.editingStopId);
    if (!stop) return;

    const newPostcode = document.getElementById('editPostcode').value.trim().toUpperCase();
    if (!newPostcode) { this.showToast('Postcode is required', 'error'); return; }

    const scopeAll = document.getElementById('scopeAll').checked;
    const pre12 = document.getElementById('editPre12').checked;
    const route = this.routes.find(r => r.name === stop.routeName);
    const oldPostcode = stop.postcode;

    if (scopeAll && route) {
      // Substitution: every stop in this route sharing the old postcode
      const affected = route.stops.filter(s => s.postcode === oldPostcode);
      affected.forEach(s => { s.postcode = newPostcode; });
      stop.pre12 = pre12;
      this.showToast(`${oldPostcode} → ${newPostcode} on ${affected.length} stop(s) of route ${route.name}`, 'success');
    } else {
      stop.postcode = newPostcode;
      stop.pre12 = pre12;
      this.showToast('Stop updated', 'success');
    }

    if (route) this.recomputeRoute(route);
    bootstrap.Modal.getInstance(document.getElementById('editStopModal')).hide();
    this.editingStopId = null;
    this.render();
  }

  showAllStopsModal(route) {
    document.getElementById('allStopsModalTitle').innerHTML =
      `<i class="bi bi-geo-alt me-2"></i>All Stops — Route ${route.name}`;

    document.getElementById('allStopsMetrics').innerHTML = `
      <span class="status-badge metric-badge--pre12" style="background:#e0f2fe;color:#075985;">Pre 12: ${route.pre12}</span>
      <span class="status-badge" style="background:#d1fae5;color:#065f46;">ASR: ${route.asr}</span>
      <span class="status-badge" style="background:#ede9fe;color:#5b21b6;">DSR: ${route.dsr}</span>`;

    const sorted = [...this.visibleStops(route)]
      .sort((a, b) => a.routeName.localeCompare(b.routeName) || a.stopNumber - b.stopNumber);

    document.getElementById('allStopsTableBody').innerHTML = sorted.map(s => `
      <tr>
        <td>${s.stopNumber}</td>
        <td>${s.address}</td>
        <td>${s.postcode}</td>
        <td>${s.customer}</td>
        <td>
          <span class="status-badge status-badge-${s.pm ? 'pm' : 'am'}">${s.pm ? 'PM' : 'AM'}</span>
          ${s.pre12 ? '<span class="status-badge status-badge-pre12">Pre 12</span>' : ''}
        </td>
        <td>${this.statusBadge(s.status)}</td>
        <td>${s.routeName}</td>
      </tr>`).join('');

    new bootstrap.Modal(document.getElementById('allStopsModal')).show();
  }

  showShipmentDetailsModal(route) {
    const set = (id, v) => { document.getElementById(id).textContent = v; };
    const stops = this.visibleStops(route);

    set('shipmentId', `ROUTE-${route.name}`);
    set('shipmentWeight', `Total Stops: ${stops.length}`);
    set('shipmentHeight', `Deliveries: ${stops.filter(s => s.type === 'DEL').length}`);
    set('shipmentWidth', `Pickups: ${stops.filter(s => s.type === 'PU').length}`);
    set('shipmentLength', `Pre-12: ${route.pre12}`);
    set('shipmentVolume', `ASR: ${route.asr}`);
    set('shipmentPieces', `DSR: ${route.dsr}`);
    set('shipmentDriver', route.driver);
    set('shipmentVehicle', route.vendor);
    set('shipmentVendor', route.target + '%');

    document.getElementById('shipmentStatus').innerHTML = this.statusBadge(route.status);

    new bootstrap.Modal(document.getElementById('shipmentModal')).show();
  }

  showPre12Modal() {
    const pre12Stops = this.getPre12Stops();

    if (pre12Stops.length === 0) {
      this.showToast('No Pre-12 deliveries today', 'info');
      return;
    }

    document.getElementById('pre12Stats').innerHTML = `
      <div class="pre12-stats-row">
        <span class="stat-item"><i class="bi bi-box2"></i> Total: ${pre12Stops.length}</span>
        <span class="stat-item"><i class="bi bi-check-circle"></i> Completed: ${pre12Stops.filter(s => s.status === 'completed').length}</span>
        <span class="stat-item"><i class="bi bi-hourglass"></i> Pending: ${pre12Stops.filter(s => s.status !== 'completed').length}</span>
      </div>`;

    // Group by route
    const byRoute = new Map();
    pre12Stops.forEach(s => {
      if (!byRoute.has(s.routeName)) byRoute.set(s.routeName, []);
      byRoute.get(s.routeName).push(s);
    });

    document.getElementById('pre12ModalContent').innerHTML = `
      <div class="pre12-modal-list">
        ${[...byRoute.entries()].map(([routeName, stops]) => `
          <div class="pre12-route-group">
            <h6 class="pre12-route-name">Route ${routeName}</h6>
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Stop</th>
                  <th>Postcode</th>
                  <th>Customer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${stops.map((s, idx) => `
                  <tr>
                    <td>#${idx + 1}</td>
                    <td><strong>${s.postcode}</strong></td>
                    <td>${s.customer}</td>
                    <td>${this.statusBadge(s.status)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`).join('')}
      </div>`;

    new bootstrap.Modal(document.getElementById('pre12Modal')).show();
  }

  showAddPostcodeModal() {
    const select = document.getElementById('addPostcodeRoute');
    select.innerHTML = '<option value="">All routes</option>' +
      this.routes.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

    document.getElementById('postcodeInput').value = '';
    document.getElementById('typePostcode').checked = true;

    new bootstrap.Modal(document.getElementById('addPostcodeModal')).show();
  }

  confirmAddPostcode() {
    const code = document.getElementById('postcodeInput').value.trim().toUpperCase();
    const type = document.querySelector('input[name="postcodeType"]:checked').value;
    const routeId = document.getElementById('addPostcodeRoute').value;

    if (!code) {
      this.showToast('Please enter a postcode or subpostcode', 'error');
      return;
    }

    // Find affected routes
    let affectedRoutes = [];
    if (routeId) {
      affectedRoutes = this.routes.filter(r => r.id === Number(routeId));
    } else {
      affectedRoutes = this.routes;
    }

    if (affectedRoutes.length === 0) {
      this.showToast('Route not found', 'error');
      return;
    }

    // Validate code format
    if (type === 'postcode') {
      if (!/^[A-Z]{2}\d{1,2} \d[A-Z]{2}$/.test(code)) {
        this.showToast('Invalid postcode format (e.g. ME15 6AB)', 'error');
        return;
      }
    } else {
      if (!/^[A-Z]{2}\d{1,2}$/.test(code)) {
        this.showToast('Invalid subpostcode format (e.g. ME15)', 'error');
        return;
      }
    }

    this.showToast(`✓ ${type === 'postcode' ? 'Postcode' : 'Subpostcode'} ${code} added to ${affectedRoutes.length} route(s)`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('addPostcodeModal')).hide();
  }

  /* ==================== TOASTS ==================== */

  showToast(message, type = 'info') {
    const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
    const toast = document.createElement('div');
    toast.className = `app-toast ${type}`;
    toast.innerHTML = `<i class="bi ${icons[type]}"></i><span>${message}</span>`;
    document.getElementById('toastContainer').appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /* ==================== REBALANCE MODE ==================== */

  /**
   * Opens the "Send Subpostcode / Send Postcode" modal for a subpostcode
   * dragged from sourceRouteId onto targetRouteId. Defaults to the
   * "Send Subpostcode" (whole-group) mode.
   */
  openTransferModal(sourceRouteId, targetRouteId, subcode) {
    const sourceRoute = this.routes.find(r => r.id === sourceRouteId);
    const targetRoute = this.routes.find(r => r.id === targetRouteId);
    if (!sourceRoute || !targetRoute) return;

    const groupStops = sourceRoute.stops.filter(s => this.subpostcodeOf(s.postcode) === subcode);
    if (groupStops.length === 0) {
      this.showToast('Nothing to transfer', 'error');
      return;
    }

    const byPostcode = new Map();
    groupStops.forEach(s => {
      if (!byPostcode.has(s.postcode)) byPostcode.set(s.postcode, []);
      byPostcode.get(s.postcode).push(s);
    });

    this.transferContext = {
      sourceRouteId, targetRouteId, subcode,
      postcodes: [...byPostcode.entries()].map(([postcode, stops]) => ({ postcode, stops })),
      mode: 'subpostcode',
    };

    document.getElementById('transferModalTitle').innerHTML =
      `<i class="bi bi-arrow-left-right me-2"></i>Transfer ${subcode} → Route ${targetRoute.name}`;

    this.renderTransferModalBody();
    new bootstrap.Modal(document.getElementById('transferModal')).show();
  }

  renderTransferModalBody() {
    const ctx = this.transferContext;
    if (!ctx) return;
    const isSub = ctx.mode === 'subpostcode';

    document.getElementById('sendSubpostcodeBtn').classList.toggle('active', isSub);
    document.getElementById('sendPostcodeBtn').classList.toggle('active', !isSub);

    const body = document.getElementById('transferModalBody');
    if (isSub) {
      const total = ctx.postcodes.reduce((n, p) => n + p.stops.length, 0);
      body.innerHTML = `
        <p class="transfer-mode-info">
          All <strong>${ctx.postcodes.length}</strong> postcode(s)
          (<strong>${total}</strong> stop(s)) under <strong>${ctx.subcode}</strong>
          will move to the destination route.
        </p>`;
    } else {
      body.innerHTML = `
        <p class="form-hint">Select which postcodes to send. Unselected postcodes stay on the source route — this splits ${ctx.subcode} across both routes.</p>
        <div class="transfer-postcode-list">
          ${ctx.postcodes.map((p, i) => `
            <label class="transfer-postcode-item">
              <input type="checkbox" class="transfer-postcode-check" data-index="${i}">
              <span class="transfer-postcode-code">${p.postcode}</span>
              <span class="pc-mini-stat">${p.stops.length} stop(s)</span>
            </label>`).join('')}
        </div>`;
    }
  }

  confirmTransfer() {
    const ctx = this.transferContext;
    if (!ctx) return;

    let stopIds;
    if (ctx.mode === 'subpostcode') {
      stopIds = ctx.postcodes.flatMap(p => p.stops.map(s => s.id));
    } else {
      const checked = [...document.querySelectorAll('.transfer-postcode-check:checked')]
        .map(cb => Number(cb.dataset.index));
      if (checked.length === 0) {
        this.showToast('Select at least one postcode', 'error');
        return;
      }
      stopIds = checked.flatMap(i => ctx.postcodes[i].stops.map(s => s.id));
    }

    this.transferPostcodesToRoute(ctx.sourceRouteId, ctx.targetRouteId, stopIds);
    bootstrap.Modal.getInstance(document.getElementById('transferModal'))?.hide();
    this.transferContext = null;
  }

  transferPostcodesToRoute(sourceRouteId, targetRouteId, stopIds) {
    const stops = stopIds || [];

    if (stops.length === 0) {
      this.showToast('No postcodes selected to transfer', 'error');
      return;
    }
    const sourceRoute = this.routes.find(r => r.id === sourceRouteId);
    const targetRoute = this.routes.find(r => r.id === targetRouteId);

    if (!sourceRoute || !targetRoute) {
      this.showToast('Invalid route selection', 'error');
      return;
    }

    // Move stops from source to target route
    let moved = 0;
    stops.forEach(stopId => {
      const stop = sourceRoute.stops.find(s => s.id === stopId);
      if (stop) {
        sourceRoute.stops = sourceRoute.stops.filter(s => s.id !== stopId);
        stop.routeName = targetRoute.name;
        stop.stopNumber = targetRoute.stops.length + 1;
        targetRoute.stops.push(stop);
        moved++;
      }
    });

    if (moved === 0) {
      this.showToast('Nothing to transfer', 'error');
      return;
    }

    // Recompute every aggregate for both routes (stops, deliveries, pickups,
    // completion, pre12, asr, dsr, status)
    this.recomputeRoute(sourceRoute);
    this.recomputeRoute(targetRoute);

    // Persist transfer to localStorage
    this.persistRebalance();
    this.render();
    this.showToast(`✓ Moved ${moved} postcode(s): ${sourceRoute.name} → ${targetRoute.name}`, 'success');
  }

  persistRebalance() {
    localStorage.setItem('dhl_route_balance_transfers', JSON.stringify(this.routes.map(r => ({
      id: r.id,
      name: r.name,
      stops: r.stops.map(s => ({ id: s.id, routeName: s.routeName }))
    }))));
  }

  loadRebalanceState() {
    const saved = localStorage.getItem('dhl_route_balance_transfers');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Merge saved state with current routes
        data.forEach(savedRoute => {
          const route = this.routes.find(r => r.id === savedRoute.id);
          if (route) {
            savedRoute.stops.forEach(savedStop => {
              const stop = this.stops.find(s => s.id === savedStop.id);
              if (stop) stop.routeName = savedStop.routeName;
            });
          }
        });
      } catch (e) {
        console.warn('Could not load saved rebalance state:', e);
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new RouteBalanceApp());
