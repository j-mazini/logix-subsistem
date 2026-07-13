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
    this.selectedPostcodes = {};    // { routeId: [postcode, ...] } for rebalance transfers
    this.dragPayload = null;        // { stopId, postcode, sourceRouteId } during a drag

    // ---- Static datasets for fake data generation ----
    this.VENDORS = ['FedEx', 'UPS', 'DPD', 'TNT', 'Logixsphere'];
    this.DRIVERS = ['Carlos Silva', 'Ana Costa', 'João Martins', 'Maria Santos', 'Pedro Oliveira',
                    'Lucas Pereira', 'Sofia Alves', 'Ricardo Dias', 'Juliana Ribeiro', 'Felipe Costa'];
    this.VEHICLES = ['Van-001', 'Van-002', 'Van-003', 'Truck-001', 'Truck-002', 'Truck-003', 'Bike-001', 'Car-001'];
    this.POSTCODES = Array.from({ length: 30 }, (_, i) => `ME${String(i + 1).padStart(2, '0')} ${1 + (i % 9)}AB`);
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

    document.getElementById('ampmToggle').addEventListener('change', (e) => {
      this.filterPM = e.target.checked;
      this.render();
      this.showToast(this.filterPM ? 'PM view: showing all stops' : 'AM view: PM stops hidden', 'info');
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

  /** Stops visible under the current AM/PM shift filter. */
  visibleStops(route) {
    return this.filterPM ? route.stops : route.stops.filter(s => !s.pm);
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

  /* ==================== CSV EXPORT ==================== */

  exportCsv() {
    const header = ['Route', 'Vendor', 'Vehicle', 'Target (%)', 'Total Stops', 'Completed Stops', 'Completion %', 'Status'];
    const rows = this.filteredRoutes().map(r =>
      [r.name, r.vendor, r.vehicle, r.target, r.totalStops, r.completedStops, r.completion, r.status]);

    const csv = [header, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `route-balance-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('CSV exported', 'success');
  }

  /* ==================== RENDER ==================== */

  render() {
    this.updateDashboardCards();
    this.renderSummaryTable();
    this.renderRouteBlocks();
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
    document.getElementById('summaryTableBody').innerHTML =
      this.filteredRoutes().map(route => `
        <tr>
          <td><strong>${route.name}</strong></td>
          <td>${route.vendor}</td>
          <td>${route.vehicle}</td>
          <td>${route.target}%</td>
          <td>${this.visibleStops(route).length}</td>
          <td>${route.completedStops}</td>
          <td>${route.completion}%</td>
          <td>${this.statusBadge(route.status)}</td>
        </tr>`).join('');
  }

  renderRouteBlocks() {
    const container = document.getElementById('routeBlocksContainer');
    const routes = this.filteredRoutes();

    container.innerHTML = routes.map(route => {
      // Copy before sorting so we never mutate route.stops; Pre 12 first.
      const stops = [...this.visibleStops(route)]
        .sort((a, b) => (b.pre12 === true) - (a.pre12 === true));
      const del = stops.filter(s => s.type === 'DEL').length;
      const pu = stops.length - del;
      const rebalanceClass = this.rebalanceMode ? 'rebalance-mode' : '';

      return `
      <section class="route-block ${rebalanceClass}" data-route-id="${route.id}">
        <div class="route-block-header">
          <h3 class="route-block-title">Route ${route.name}</h3>
          <div class="route-block-header-right">
            <div class="route-block-completion">${route.completion}%</div>
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
              <span class="info-box-label">Vendor</span>
              <select class="info-box-select" data-field="vendor" title="Change vendor">
                ${this.VENDORS.map(v => `<option value="${v}" ${v === route.vendor ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
            <div class="info-box">
              <span class="info-box-label">Driver</span>
              <span class="info-box-value">${route.driver}</span>
            </div>
            <div class="info-box">
              <span class="info-box-label">Vehicle</span>
              <select class="info-box-select" data-field="vehicle" title="Change vehicle">
                ${this.VEHICLES.map(v => `<option value="${v}" ${v === route.vehicle ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="route-table-responsive">
            <table class="route-table">
              <thead>
                <tr>
                  <th>Postcode</th><th>DEL</th><th>PU</th><th>Total</th><th>Completion %</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${stops.map(s => `
                  <tr class="${this.rebalanceMode ? 'rebalance-row' : ''}"
                      ${this.rebalanceMode ? 'draggable="true"' : ''}
                      data-stop-id="${s.id}" data-postcode="${s.postcode}" data-route-id="${route.id}">
                    <td class="pc-cell">
                      ${this.rebalanceMode ? '<i class="bi bi-grip-vertical drag-handle"></i>' : ''}
                      <span class="editable" data-stop-id="${s.id}" title="Click to edit / substitute">${s.postcode}</span>
                      ${s.pre12 ? '<span class="status-badge status-badge-pre12">Pre 12</span>' : ''}
                    </td>
                    <td>${s.type === 'DEL' ? 1 : 0}</td>
                    <td>${s.type === 'PU' ? 1 : 0}</td>
                    <td>1</td>
                    <td>${s.status === 'completed' ? '100%' : '0%'}</td>
                    <td>${this.statusBadge(s.status)}</td>
                  </tr>`).join('')}
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
            Drag a postcode row onto another route to move it.
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

      // Editable postcodes → open Edit Postcode modal
      block.querySelectorAll('.pc-cell .editable').forEach(el => {
        el.addEventListener('click', () => {
          const stop = this.stops.find(s => s.id === Number(el.dataset.stopId));
          if (stop) this.showEditStopModal(stop);
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

      // Rebalance mode: drag a postcode row onto another route to move it
      if (this.rebalanceMode) {
        // Each table row is a drag source
        block.querySelectorAll('tr.rebalance-row').forEach(row => {
          row.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            // stash the payload on the app so drop always has it (dataTransfer
            // can be unreliable across some browsers / re-renders)
            this.dragPayload = {
              stopId: Number(row.dataset.stopId),
              postcode: row.dataset.postcode,
              sourceRouteId: Number(row.dataset.routeId),
            };
            e.dataTransfer.setData('text/plain', row.dataset.stopId);
            row.classList.add('dragging');
          });

          row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            this.dragPayload = null;
            document.querySelectorAll('.route-block.drop-target')
              .forEach(b => b.classList.remove('drop-target'));
          });
        });

        // The whole route block is a drop zone — drop a postcode onto another
        // route's block to move it there.
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
            this.transferPostcodesToRoute(payload.sourceRouteId, targetRouteId, [payload.stopId]);
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
    const w = 40 + this.rand(60), h = 30 + this.rand(50), l = 40 + this.rand(60);

    set('shipmentId', `SHP-${route.name}-${1000 + this.rand(9000)}`);
    set('shipmentWeight', `${(Math.random() * 45 + 5).toFixed(2)} kg`);
    set('shipmentHeight', `${h} cm`);
    set('shipmentWidth', `${w} cm`);
    set('shipmentLength', `${l} cm`);
    set('shipmentVolume', `${((w * h * l) / 1000).toFixed(1)} L`);
    set('shipmentPieces', 1 + this.rand(20));
    set('shipmentDriver', route.driver);
    set('shipmentVehicle', route.vehicle);
    set('shipmentVendor', route.vendor);

    document.getElementById('shipmentStatus').innerHTML = this.statusBadge(route.status);

    new bootstrap.Modal(document.getElementById('shipmentModal')).show();
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

  togglePostcodeSelection(stopId, routeId) {
    if (!this.rebalanceMode) return;

    if (!this.selectedPostcodes[routeId]) {
      this.selectedPostcodes[routeId] = [];
    }

    const idx = this.selectedPostcodes[routeId].indexOf(stopId);
    if (idx > -1) {
      this.selectedPostcodes[routeId].splice(idx, 1);
    } else {
      this.selectedPostcodes[routeId].push(stopId);
    }

    this.render();
  }

  transferPostcodesToRoute(sourceRouteId, targetRouteId, stopIds = null) {
    const stops = stopIds || (this.selectedPostcodes[sourceRouteId] || []);

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

    // Clear selection and refresh
    this.selectedPostcodes[sourceRouteId] = [];
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
