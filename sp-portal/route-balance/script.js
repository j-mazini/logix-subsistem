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
    this.filterPM = false;          // false = AM view (hide PM), true = PM view (show all)
    this.searchQuery = '';
    this.sortKey = null;
    this.sortAsc = true;
    this.editingStopId = null;      // stop currently open in the Edit Postcode modal
    this.rebalanceMode = false;     // admin mode for transferring postcodes between routes
    this.dragPayload = null;        // { subpostcode, sourceRouteId } during a drag
    this.expandedSubpostcodes = new Set(); // `${routeId}:${subcode}` keys currently expanded
    this.transferContext = null;    // state for the Send Subpostcode/Postcode modal
    this.sentRoutes = new Set();    // route ids whose manifest was sent to the driver
    this.flippedRoutes = new Set(); // route ids currently showing the Special Deliveries face
    this.specialView = {};          // routeId -> 'all' | 'pre12' | 'asr' | 'dsr' (Special Deliveries filter)
    this.rebalanceExpanded = new Set(); // route ids currently expanded to show their deliveries (Rebalance mode)
    this.compareTarget = {};        // routeId -> routeId currently being compared against (mutual)
    this.comparePickerOpen = null;  // routeId whose "compare with…" route picker is open

    // ---- Static datasets for fake data generation ----
    this.DRIVERS = ['Carlos Silva', 'Ana Costa', 'João Martins', 'Maria Santos', 'Pedro Oliveira',
                    'Lucas Pereira', 'Sofia Alves', 'Ricardo Dias', 'Juliana Ribeiro', 'Felipe Costa'];
    this.VEHICLES = ['Van-001', 'Van-002', 'Van-003', 'Truck-001', 'Truck-002', 'Truck-003', 'Bike-001', 'Car-001'];
    // Subpostcodes (outward area codes) each grouping several full postcodes.
    this.SUBPOSTCODES = Array.from({ length: 8 }, (_, i) => `ME${i + 1}`);
    this.POSTCODES = this.SUBPOSTCODES.flatMap(sub =>
      Array.from({ length: 5 }, (_, i) => `${sub} ${i + 1}AB`));
    this.STREETS = ['High Street', 'Station Road', 'Church Lane', 'Victoria Avenue', 'Mill Road',
                    'Park View', 'Queensway', 'Riverside Drive'];

    this.intakeFile = null; // file staged in the dropzone, awaiting "Process manifest"

    this.init();
  }

  /* ==================== INIT ==================== */

  init() {
    this.generateFakeData();
    this.enterDashboard();

    // Loading screen: fade out
    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.remove('active');
    }, 500);
  }

  /** Called once real routes/stops data is ready (uploaded manifest or mock), initialize the dashboard. */
  enterDashboard() {
    this.loadRebalanceState();
    this.setupEventListeners();
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);
    this.render();
    this.showToast('Operation data loaded', 'success');
  }

  /* ==================== INTAKE (upload / mock) ==================== */

  setupIntakeListeners() {
    const dropzone = document.getElementById('intakeDropzone');
    const fileInput = document.getElementById('intakeFileInput');
    const btnProcess = document.getElementById('btnIntakeProcess');
    const btnMock = document.getElementById('btnIntakeMock');

    const openPicker = () => fileInput.click();
    dropzone.addEventListener('click', openPicker);
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) this.stageIntakeFile(fileInput.files[0]);
    });

    ['dragenter', 'dragover'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) this.stageIntakeFile(file);
    });

    btnProcess.addEventListener('click', () => this.processIntakeFile());
    btnMock.addEventListener('click', () => {
      this.generateFakeData();
      this.enterDashboard();
    });
  }

  stageIntakeFile(file) {
    const allowed = /\.(xlsx|xls|xlsm)$/i;
    const dropzone = document.getElementById('intakeDropzone');
    const primary = document.getElementById('intakeDropzonePrimary');
    const btnProcess = document.getElementById('btnIntakeProcess');

    if (!allowed.test(file.name)) {
      this.showIntakeStatus('Unsupported file type. Please choose a .xlsx, .xls or .xlsm file.', 'error');
      return;
    }

    this.intakeFile = file;
    dropzone.classList.add('has-file');
    primary.textContent = file.name;
    btnProcess.disabled = false;
    this.showIntakeStatus('', null, true);
  }

  showIntakeStatus(message, type, hide = false) {
    const status = document.getElementById('intakeStatus');
    if (hide) { status.hidden = true; status.textContent = ''; status.className = 'intake-status'; return; }
    status.hidden = false;
    status.textContent = message;
    status.className = `intake-status ${type === 'error' ? 'is-error' : 'is-success'}`;
  }

  async processIntakeFile() {
    if (!this.intakeFile) return;
    const btnProcess = document.getElementById('btnIntakeProcess');
    btnProcess.disabled = true;
    btnProcess.innerHTML = '<i class="bi bi-arrow-repeat"></i> Processing…';

    try {
      const data = await this.intakeFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const { routes, stops } = this.parseManifestWorkbook(workbook);

      if (!routes.length) {
        throw new Error('No recognizable route/postcode data found in this file.');
      }

      this.routes = routes;
      this.stops = stops;
      this.showIntakeStatus(`Loaded ${routes.length} routes / ${stops.length} stops from "${this.intakeFile.name}".`, 'success');
      this.enterDashboard();
    } catch (err) {
      this.showIntakeStatus(`Could not process this manifest: ${err.message}`, 'error');
      btnProcess.disabled = false;
      btnProcess.innerHTML = '<i class="bi bi-arrow-right-circle"></i> Process manifest';
    }
  }

  /** Reads the first sheet with recognizable columns and groups rows into routes/stops matching the app's data model. */
  parseManifestWorkbook(workbook) {
    const alias = {
      route: ['route', 'routename', 'route name', 'route id'],
      postcode: ['postcode', 'post code', 'postal code'],
      address: ['address', 'street', 'delivery address'],
      customer: ['customer', 'customer name', 'client'],
      type: ['type', 'stop type', 'delivery type'],
      driver: ['driver', 'driver name'],
      vehicle: ['vehicle', 'vehicle id'],
      target: ['target', 'target %', 'target percent'],
      pm: ['pm', 'pm flag', 'afternoon'],
      pre12: ['pre12', 'pre-12', 'pre 12'],
    };

    const matchKey = (header) => {
      const norm = String(header).trim().toLowerCase();
      for (const [key, names] of Object.entries(alias)) {
        if (names.includes(norm)) return key;
      }
      return null;
    };

    let rows = null;
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!json.length) continue;
      const headerKeys = Object.keys(json[0]).map(matchKey);
      if (headerKeys.includes('postcode') && headerKeys.includes('route')) {
        rows = json.map(row => {
          const mapped = {};
          for (const [header, value] of Object.entries(row)) {
            const key = matchKey(header);
            if (key) mapped[key] = value;
          }
          return mapped;
        });
        break;
      }
    }

    if (!rows) return { routes: [], stops: [] };

    const routesByName = new Map();
    let stopId = 1;
    const stops = [];

    rows.forEach((row, i) => {
      const routeName = String(row.route || '').trim() || 'UNASSIGNED';
      if (!routesByName.has(routeName)) {
        routesByName.set(routeName, {
          id: routesByName.size + 1,
          name: routeName,
          driver: String(row.driver || '').trim() || this.pick(this.DRIVERS),
          target: Number(row.target) || 85,
          totalStops: 0, completedStops: 0, completion: 0,
          deliveries: 0, pickups: 0,
          pre12: 0, asr: 0, dsr: 0,
          spr: 90 + this.rand(80),
          sortAttendance: 'yes',
          notes: '',
          stops: [],
        });
      }

      const route = routesByName.get(routeName);
      const type = /pick\s*-?up|pu/i.test(String(row.type || '')) ? 'PU' : 'DEL';
      const stop = {
        id: stopId++,
        routeName,
        stopNumber: route.stops.length + 1,
        postcode: String(row.postcode || '').trim() || '—',
        address: String(row.address || '').trim() || `Stop ${i + 1}`,
        customer: String(row.customer || '').trim() || `Customer ${i + 1}`,
        type,
        pm: /^(true|1|yes|y)$/i.test(String(row.pm || '')),
        pre12: /^(true|1|yes|y)$/i.test(String(row.pre12 || '')),
        asr: true,
        dsr: true,
        status: 'pending',
      };

      route.stops.push(stop);
      stops.push(stop);
    });

    const routes = Array.from(routesByName.values()).map(route => {
      route.totalStops = route.stops.length;
      route.deliveries = route.stops.filter(s => s.type === 'DEL').length;
      route.pickups = route.stops.filter(s => s.type === 'PU').length;
      route.pre12 = route.stops.filter(s => s.pre12).length;
      route.asr = route.stops.length;
      route.dsr = route.stops.length;
      route.completedStops = 0;
      route.completion = 0;
      return route;
    });

    return { routes, stops };
  }

  /* ==================== FAKE DATA ==================== */

  rand(n) { return Math.floor(Math.random() * n); }
  pick(arr) { return arr[this.rand(arr.length)]; }

  /** Delays fn until `wait` ms after the last call — avoids a full render per keystroke. */
  debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

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
        sortAttendance: this.pick(['yes', 'yes', 'yes', 'late', 'no']), // driver showed up to the sort: yes/no/late
        notes: '',
        stops: [],
      };

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

  /* ==================== EVENTS ==================== */

  setupEventListeners() {
    document.getElementById('btnRefresh').addEventListener('click', () => this.refresh());
    document.getElementById('btnAddRoute').addEventListener('click', () => this.showAddRouteModal());
    document.getElementById('btnSaveRoute').addEventListener('click', () => this.saveNewRoute());
    document.getElementById('btnSaveStop').addEventListener('click', () => this.saveStopEdit());
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
      document.body.classList.toggle('rebalance-mode-active', this.rebalanceMode);
      this.render();
      this.showToast(this.rebalanceMode ? '🔄 Rebalance mode: select postcodes to transfer' : 'Operations mode: standard view', 'info');
    });

    const debouncedSearchRender = this.debounce(() => this.render(), 200);
    document.getElementById('searchRoute').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      debouncedSearchRender();
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

    this.setupRouteBlocksDelegation();
  }

  /**
   * Route blocks are rebuilt (innerHTML) on every render(), which can fire
   * on every filter/sort/search. Rather than re-attaching a fresh set of
   * listeners to every row/button/select after each rebuild, we bind once
   * here at the container level and resolve the target route from the
   * clicked/changed element's closest `.route-block` at event time.
   */
  setupRouteBlocksDelegation() {
    const container = document.getElementById('routeBlocksContainer');

    container.addEventListener('change', (e) => {
      const select = e.target.closest('.info-box-select');
      if (select) {
        const route = this.routeFromEl(select);
        if (!route) return;
        const field = select.dataset.field;
        route[field] = select.value;
        this.render();

        if (field === 'sortAttendance') {
          const labels = { yes: 'Attended', late: 'Late', no: 'No-show' };
          this.showToast(`Route ${route.name}: sort attendance set to ${labels[select.value]}`, select.value === 'no' ? 'error' : 'success');
        } else {
          this.showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated to ${select.value}`, 'success');
        }
        return;
      }

      const notes = e.target.closest('.notes-textarea');
      if (notes) {
        const route = this.routeFromEl(notes);
        if (route) route.notes = notes.value;
      }
    });

    container.addEventListener('click', (e) => {
      const pcEditable = e.target.closest('.postcode-editable');
      if (pcEditable) {
        const stop = this.stops.find(s => s.id === Number(pcEditable.dataset.stopId));
        if (stop) this.showEditStopModal(stop);
        return;
      }

      // Expand/collapse a subpostcode directly in the DOM (no this.render())
      // so the rest of the dashboard doesn't flash/redraw on every click.
      const toggleBtn = e.target.closest('.subpostcode-toggle');
      if (toggleBtn) {
        e.stopPropagation();
        const key = `${toggleBtn.dataset.routeId}:${toggleBtn.dataset.subpostcode}`;
        const willExpand = !this.expandedSubpostcodes.has(key);

        if (willExpand) this.expandedSubpostcodes.add(key);
        else this.expandedSubpostcodes.delete(key);

        toggleBtn.classList.toggle('expanded', willExpand);
        const detailRow = toggleBtn.closest('tr.subpostcode-row')?.nextElementSibling;
        if (detailRow && detailRow.classList.contains('subpostcode-detail-row')) {
          detailRow.classList.toggle('collapsed', !willExpand);
        }
        return;
      }


      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const route = this.routeFromEl(actionBtn);
        if (!route) return;

        switch (actionBtn.dataset.action) {
          case 'see-all-stops': this.showAllStopsModal(route); break;
          case 'shipment-details': this.showShipmentDetailsModal(route); break;
          case 'add-postcode': this.showAddPostcodeModal(route); break;
          case 'export-route': this.exportRouteCsv(route); break;
          case 'collapse-route': this.collapseRoute(route.id); break;
          case 'flip-card': this.toggleFlipCard(route); break;
          case 'close-flip':
            this.flippedRoutes.delete(route.id);
            actionBtn.closest('.route-block')?.classList.remove('flipped');
            break;
          case 'special-filter':
            this.specialView[route.id] = actionBtn.dataset.cat;
            this.renderRouteBlocks();
            break;
          case 'toggle-expand':
            this.toggleRebalanceExpand(route.id);
            break;
          case 'toggle-compare':
            this.comparePickerOpen = this.comparePickerOpen === route.id ? null : route.id;
            this.renderRouteBlocks();
            break;
          case 'pick-compare-target': {
            const targetId = Number(actionBtn.dataset.targetId);
            const target = this.routes.find(r => r.id === targetId);
            if (!target) break;
            this.compareTarget[route.id] = targetId;
            this.compareTarget[targetId] = route.id;
            this.comparePickerOpen = null;
            this.rebalanceExpanded.add(route.id);
            this.rebalanceExpanded.add(targetId);
            this.renderRouteBlocks();
            this.showToast(`Comparing Route ${route.name} with Route ${target.name}`, 'info');
            break;
          }
          case 'swap-compare': this.swapCompareRoutes(route.id); break;
          case 'cancel-compare': {
            const otherId = this.compareTarget[route.id];
            delete this.compareTarget[route.id];
            if (otherId != null) delete this.compareTarget[otherId];
            this.renderRouteBlocks();
            break;
          }
        }
        return;
      }

      // Rebalance mode: clicking anywhere else on the card header expands/collapses it.
      if (this.rebalanceMode) {
        const header = e.target.closest('.route-block-header');
        const block = header?.closest('.route-block');
        if (block) this.toggleRebalanceExpand(Number(block.dataset.routeId));
      }
    });

    // Closes the "compare with…" picker when clicking anywhere outside of it.
    document.addEventListener('click', (e) => {
      if (this.comparePickerOpen !== null && !e.target.closest('.compare-wrap')) {
        this.comparePickerOpen = null;
        this.renderRouteBlocks();
      }
    });

    // Rebalance mode: drag a postcode row (or a whole subpostcode group) onto another route's block.
    container.addEventListener('dragstart', (e) => {
      if (!this.rebalanceMode) return;
      const pcRow = e.target.closest('.rebalance-postcode-row');
      if (pcRow) {
        e.dataTransfer.effectAllowed = 'move';
        this.dragPayload = { postcode: pcRow.dataset.postcode, sourceRouteId: Number(pcRow.dataset.routeId) };
        e.dataTransfer.setData('text/plain', pcRow.dataset.postcode);
        pcRow.classList.add('dragging');
        return;
      }
      const row = e.target.closest('tr.subpostcode-row.rebalance-row');
      if (row) {
        e.dataTransfer.effectAllowed = 'move';
        this.dragPayload = {
          subpostcode: row.dataset.subpostcode,
          sourceRouteId: Number(row.dataset.routeId),
        };
        e.dataTransfer.setData('text/plain', row.dataset.subpostcode);
        row.classList.add('dragging');
      }
    });

    container.addEventListener('dragend', (e) => {
      const row = e.target.closest('tr.subpostcode-row.rebalance-row, .rebalance-postcode-row');
      if (row) row.classList.remove('dragging');
      this.dragPayload = null;
      container.querySelectorAll('.route-block.drop-target')
        .forEach(b => b.classList.remove('drop-target'));
    });

    container.addEventListener('dragover', (e) => {
      if (!this.dragPayload) return;
      const block = e.target.closest('.route-block');
      if (!block) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (this.dragPayload.sourceRouteId !== Number(block.dataset.routeId)) {
        block.classList.add('drop-target');
      }
    });

    container.addEventListener('dragleave', (e) => {
      const block = e.target.closest('.route-block');
      if (!block) return;
      const rect = block.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top || e.clientY > rect.bottom) {
        block.classList.remove('drop-target');
      }
    });

    container.addEventListener('drop', (e) => {
      const block = e.target.closest('.route-block');
      if (!block) return;
      e.preventDefault();
      block.classList.remove('drop-target');
      const payload = this.dragPayload;
      if (!payload) return;
      const targetRouteId = Number(block.dataset.routeId);
      if (payload.sourceRouteId === targetRouteId) return;
      if (payload.postcode) {
        this.transferSinglePostcodeByCode(payload.sourceRouteId, targetRouteId, payload.postcode);
      } else {
        this.openTransferModal(payload.sourceRouteId, targetRouteId, payload.subpostcode);
      }
    });
  }

  /** Resolves the route object owning the `.route-block` an element sits in. */
  routeFromEl(el) {
    const block = el.closest('.route-block');
    return block ? this.routes.find(r => r.id === Number(block.dataset.routeId)) : null;
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
    let stops = route.stops;

    // Apply shift filter (AM/PM)
    if (this.filterPM) {
      // PM view: show only stops flagged as pm (meeting/afternoon deliveries)
      stops = stops.filter(s => s.pm);
    } else {
      // AM view: show only regular morning deliveries
      stops = stops.filter(s => !s.pm);
    }

    return stops;
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

  /** Routes that pass the search filter. */
  filteredRoutes() {
    let list = [...this.routes];

    if (this.searchQuery) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(this.searchQuery) ||
        r.driver.toLowerCase().includes(this.searchQuery));
    }

    if (this.sortKey) {
      const k = this.sortKey, dir = this.sortAsc ? 1 : -1;
      list.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir);
    }

    return list;
  }

  /** Get all Pre-12 stops grouped by route. */
  /* ==================== ACTIONS ==================== */

  refresh() {
    this.render();
    this.showToast('Data refreshed', 'info');
  }

  sendToDrivers() {
    const routes = this.filteredRoutes().filter(r => this.visibleStops(r).length > 0);
    if (!routes.length) { this.showToast('No routes to send', 'error'); return; }
    const resend = routes.every(r => this.sentRoutes.has(r.id));
    routes.forEach(r => this.sentRoutes.add(r.id));
    const drivers = new Set(routes.map(r => r.driver)).size;
    this.updateSendButton();
    this.showToast(
      `${routes.length} route manifest${routes.length === 1 ? '' : 's'} ${resend ? 're-sent' : 'sent'} to ${drivers} driver${drivers === 1 ? '' : 's'}`,
      'success');
  }

  updateSendButton() {
    const btn = document.getElementById('btnSendDrivers');
    if (!btn) return;
    const routes = this.filteredRoutes().filter(r => this.visibleStops(r).length > 0);
    const allSent = routes.length > 0 && routes.every(r => this.sentRoutes.has(r.id));
    btn.classList.toggle('styled-button--primary', !allSent);
    btn.classList.toggle('styled-button--sent', allSent);
    btn.innerHTML = allSent
      ? '<i class="bi bi-check2-circle"></i> Sent to Drivers'
      : '<i class="bi bi-send"></i> Send to Driver';
    btn.title = allSent ? 'All visible manifests sent — click to resend' : 'Send all visible route manifests to their drivers';
  }

  showAddRouteModal() {
    const fill = (id, arr) => {
      document.getElementById(id).innerHTML =
        arr.map(v => `<option value="${v}">${v}</option>`).join('');
    };
    fill('newDriver', this.DRIVERS);
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
      driver: document.getElementById('newDriver').value,
      target: isNaN(target) ? 85 : target,
      totalStops: 0, completedStops: 0, completion: 0,
      deliveries: 0, pickups: 0,
      pre12: 0, asr: 0, dsr: 0, spr: 0,
      sortAttendance: 'yes',
      notes: '', stops: [],
    });

    bootstrap.Modal.getInstance(document.getElementById('addRouteModal')).hide();
    document.getElementById('addRouteForm').reset();
    document.getElementById('newTarget').value = 85;
    this.render();
    this.showToast(`Route ${name} added`, 'success');
  }

  /**
   * Close a route and redistribute its postcodes/stops evenly across the
   * remaining routes (per-block "Close route" button).
   */
  collapseRoute(routeId) {
    if (this.routes.length <= 1) {
      this.showToast('At least two routes are required to collapse', 'error');
      return;
    }

    const removed = this.routes.find(r => r.id === Number(routeId));

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
  }

  /* ==================== CSV EXPORT (Demi8 Format) ==================== */

  exportRouteCsv(route) {
    const stops = this.visibleStops(route);
    if (!stops.length) { this.showToast('No stops to export on this route', 'error'); return; }

    const header = ['Route', 'Driver', 'Stop #', 'Address', 'Postcode', 'Customer', 'Type', 'Pre 12'];
    const rows = stops.map((s, i) =>
      [route.name, route.driver, i + 1, s.address, s.postcode, s.customer, s.type, s.pre12 ? 'Yes' : 'No']);

    const csv = [header, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `demi8-${route.name}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast(`✓ Demi8 export for route ${route.name} (${stops.length} stops)`, 'success');
  }

  /* ==================== RENDER ==================== */

  render() {
    this.updateDashboardCards();
    this.renderSummaryTable();
    this.renderRouteBlocks();
    this.updateSendButton();
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
    set('targetLoopCard', Math.round(avg(routes.map(r => r.target))) + '%');
    set('deliveriesCard', deliveries);
    set('pickupsCard', pickups);
    set('sprCard', Math.round(avg(routes.map(r => r.spr))));
    set('totalRoutesCard', routes.length);
  }

  renderSummaryTable() {
    const tableBody = document.getElementById('summaryTableBody');
    tableBody.innerHTML = this.filteredRoutes().map(route => `
          <tr>
            <td><strong>${route.name}</strong></td>
            <td>${route.driver}</td>
            <td>${route.target}%</td>
            <td>${this.visibleStops(route).length}</td>
          </tr>`).join('');
  }

  renderRouteBlocks() {
    const container = document.getElementById('routeBlocksContainer');
    container.classList.toggle('route-blocks--rebalance', this.rebalanceMode);
    const shiftBadge = this.filterPM
      ? '<span class="shift-badge shift-badge-pm">PM</span>'
      : '<span class="shift-badge shift-badge-am">AM</span>';

    container.innerHTML = this.filteredRoutes().map(route => {
      const stops = this.visibleStops(route);
      const groups = this.groupBySubpostcode(stops);
      const del = stops.filter(s => s.type === 'DEL').length;
      const pu = stops.length - del;
      const doneStops = stops.filter(s => s.status === 'completed').length;
      const progressPct = stops.length ? Math.round(doneStops / stops.length * 100) : 0;
      const rebalanceClass = this.rebalanceMode ? 'rebalance-mode' : '';
      const flippedClass = this.flippedRoutes.has(route.id) ? 'flipped' : '';

      // ---- Special Deliveries (back face) ----
      const cat = this.specialView[route.id] || 'all';
      const matches = {
        all:   (s) => s.pre12 || s.asr || s.dsr,
        pre12: (s) => s.pre12,
        asr:   (s) => s.asr,
        dsr:   (s) => s.dsr,
      };
      const counts = {
        all:   stops.filter(matches.all).length,
        pre12: stops.filter(matches.pre12).length,
        asr:   stops.filter(matches.asr).length,
        dsr:   stops.filter(matches.dsr).length,
      };
      const specialStops = stops.filter(matches[cat]);
      const specialGroups = this.groupBySubpostcode(specialStops);
      const chip = (key, label) => `
        <button type="button" class="special-chip ${cat === key ? 'active' : ''}"
                data-action="special-filter" data-cat="${key}">
          ${label} <span class="special-chip-count">${counts[key]}</span>
        </button>`;

      // ---- Rebalance mode: compact/expand + route-to-route comparison ----
      const rebalanceExpanded = this.rebalanceMode && this.rebalanceExpanded.has(route.id);
      const compareWithId = this.compareTarget[route.id];
      const compareWithRoute = compareWithId != null ? this.routes.find(r => r.id === compareWithId) : null;
      const comparePickerOpen = this.comparePickerOpen === route.id;

      const compareControlHtml = compareWithRoute ? `
        <div class="compare-bar">
          <span class="compare-bar-label"><i class="bi bi-arrow-left-right"></i> vs ${compareWithRoute.name}</span>
          <button class="compare-bar-btn compare-bar-btn--swap" data-action="swap-compare" title="Swap all postcodes between these two routes">
            <i class="bi bi-arrow-repeat"></i> Swap
          </button>
          <button class="compare-bar-btn compare-bar-btn--cancel" data-action="cancel-compare" title="Cancel comparison" aria-label="Cancel comparison">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      ` : `
        <div class="compare-wrap">
          <button class="route-icon-btn ${comparePickerOpen ? 'active' : ''}" data-action="toggle-compare" title="Compare with another route" aria-label="Compare with another route">
            <i class="bi bi-arrow-left-right"></i>
          </button>
          ${comparePickerOpen ? `
          <div class="compare-picker">
            <div class="compare-picker-title">Compare Route ${route.name} with…</div>
            ${this.routes.filter(r => r.id !== route.id).map(r => `
              <button type="button" class="compare-picker-item" data-action="pick-compare-target" data-target-id="${r.id}">
                <span class="compare-picker-route">${r.name}</span>
                <span class="compare-picker-driver">${r.driver}</span>
              </button>`).join('')}
          </div>
          ` : ''}
        </div>
      `;

      const headerRightHtml = this.rebalanceMode ? `
        ${shiftBadge}
        ${compareControlHtml}
        <button class="route-icon-btn route-icon-btn--danger" data-action="collapse-route" data-route-id="${route.id}"
                title="Close this route and redistribute its postcodes" aria-label="Close route">
          <i class="bi bi-box-arrow-in-down"></i>
        </button>
        <button class="route-expand-chevron" data-action="toggle-expand" title="${rebalanceExpanded ? 'Collapse' : 'Expand'} deliveries" aria-label="Toggle deliveries list">
          <i class="bi bi-chevron-${rebalanceExpanded ? 'up' : 'down'}"></i>
        </button>
      ` : `
        ${shiftBadge}
        <button class="flip-btn" data-action="flip-card" title="View Special Deliveries (Pre 12 / ASR / DSR)">
          <i class="bi bi-stars"></i> Special Deliveries
        </button>
        <button class="route-icon-btn" data-action="add-postcode" title="Add a postcode to this route" aria-label="Add postcode">
          <i class="bi bi-geo-alt-fill"></i>
        </button>
        <button class="route-icon-btn" data-action="export-route" title="Export this route's manifest (Demi8 format)" aria-label="Export manifest">
          <i class="bi bi-filetype-csv"></i>
        </button>
        <button class="route-icon-btn route-icon-btn--danger" data-action="collapse-route" data-route-id="${route.id}"
                title="Close this route and redistribute its postcodes" aria-label="Close route">
          <i class="bi bi-box-arrow-in-down"></i>
        </button>
      `;

      const rebalancePostcodeListHtml = `
        <div class="route-block-content">
          <div class="route-table-responsive rebalance-postcode-list">
            ${groups.flatMap(g => g.postcodes).map(p => `
              <div class="pre12-flip-item rebalance-postcode-row" draggable="true"
                   data-postcode="${p.postcode}" data-route-id="${route.id}">
                <i class="bi bi-grip-vertical drag-handle"></i>
                <span class="pre12-flip-pc">${p.postcode}</span>
                <span class="special-tags">
                  ${p.pre12 ? '<span class="status-badge status-badge-pre12">Pre 12</span>' : ''}
                  ${p.stops.some(s => s.asr) ? '<span class="status-badge special-tag-asr">ASR</span>' : ''}
                  ${p.stops.some(s => s.dsr) ? '<span class="status-badge special-tag-dsr">DSR</span>' : ''}
                </span>
                <span class="pre12-flip-count">DEL ${p.del} / PU ${p.pu}</span>
              </div>
            `).join('')}
          </div>
          <p class="rebalance-hint">
            <i class="bi bi-info-circle"></i>
            Drag a postcode onto another route to move it.
          </p>
        </div>`;

      return `
      <section class="route-block ${rebalanceClass} ${flippedClass}" data-route-id="${route.id}">
        <div class="route-block-flipper">
          <div class="route-block-face route-block-front">
            <div class="route-block-header">
              <div class="route-block-ident">
                <span class="route-eyebrow">Route ${route.name} · Manifest</span>
                <h3 class="route-driver-name">${route.driver}</h3>
              </div>
              <div class="route-block-header-right">
                ${headerRightHtml}
              </div>
            </div>

            <div class="route-progress" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100"
                 aria-label="Route progress: ${doneStops} of ${stops.length} stops completed">
              <div class="route-progress-track">
                <div class="route-progress-fill" style="width: ${progressPct}%"></div>
              </div>
              <span class="route-progress-label">${doneStops}/${stops.length} stops · ${progressPct}%</span>
            </div>

            ${this.rebalanceMode ? (rebalanceExpanded ? rebalancePostcodeListHtml : '') : `
            <div class="route-block-content">
              <div class="route-table-responsive">
                <table class="route-table">
                  <thead>
                    <tr>
                      <th>Subpostcode</th><th>DEL</th><th>PU</th><th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${groups.map(g => {
                      const key = `${route.id}:${g.code}`;
                      const expanded = this.expandedSubpostcodes.has(key);
                      return `
                      <tr class="subpostcode-row"
                          data-subpostcode="${g.code}" data-route-id="${route.id}">
                        <td class="pc-cell">
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
                      </tr>
                      <tr class="subpostcode-detail-row ${expanded ? '' : 'collapsed'}">
                        <td colspan="4">
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

              <div class="route-dash">
                <div class="dash-tile">
                  <span class="dash-label">Deliveries</span>
                  <span class="dash-value">${del}</span>
                </div>
                <div class="dash-tile">
                  <span class="dash-label">Pickups</span>
                  <span class="dash-value">${pu}</span>
                </div>
                <div class="dash-tile">
                  <span class="dash-label">Pre 12</span>
                  <span class="dash-value">${stops.filter(s => s.pre12).length}</span>
                </div>
                <div class="dash-tile">
                  <span class="dash-label">Total Stops</span>
                  <span class="dash-value">${stops.length}</span>
                </div>
                <div class="dash-tile">
                  <span class="dash-label">Target</span>
                  <span class="dash-value">${route.target}<span class="dash-unit">%</span></span>
                </div>
              </div>

              <div class="route-buttons">
                <button class="styled-button styled-button--outline" data-action="shipment-details">
                  <i class="bi bi-box2"></i> See Shipment Details
                </button>
                <button class="styled-button styled-button--outline" data-action="see-all-stops">
                  <i class="bi bi-geo-alt"></i> See All Stops
                </button>
              </div>

              <div class="notes-section">
                <label class="notes-label">Notes</label>
                <textarea class="notes-textarea" placeholder="Write observations…">${route.notes}</textarea>
              </div>
            </div>
            `}
          </div>

          <div class="route-block-face route-block-back">
            <button class="flip-close-btn" data-action="close-flip" title="Close Special Deliveries">
              <i class="bi bi-x-lg"></i>
            </button>
            <div class="pre12-flip-title">
              <i class="bi bi-stars"></i>
              Special Deliveries
            </div>
            <div class="special-chips">
              ${chip('all', 'All')}
              ${chip('pre12', 'Pre 12')}
              ${chip('asr', 'ASR')}
              ${chip('dsr', 'DSR')}
            </div>
            ${specialStops.length ? `
            <div class="pre12-flip-list">
              ${specialGroups.map(g => `
              <div class="pre12-flip-group">
                <div class="pre12-flip-group-name">${g.code}</div>
                <div class="pre12-flip-items">
                  ${g.postcodes.map(p => `
                  <div class="pre12-flip-item">
                    <span class="pre12-flip-pc">${p.postcode}</span>
                    <span class="pre12-flip-customer">${p.stops[0]?.customer || 'N/A'}</span>
                    <span class="special-tags">
                      ${p.stops.some(s => s.pre12) ? '<span class="status-badge status-badge-pre12">Pre 12</span>' : ''}
                      ${p.stops.some(s => s.asr) ? '<span class="status-badge special-tag-asr">ASR</span>' : ''}
                      ${p.stops.some(s => s.dsr) ? '<span class="status-badge special-tag-dsr">DSR</span>' : ''}
                    </span>
                    <span class="pre12-flip-count">DEL ${p.del} / PU ${p.pu}</span>
                  </div>
                  `).join('')}
                </div>
              </div>
              `).join('')}
            </div>
            ` : `
            <div class="pre12-empty-state">
              <i class="bi bi-check-circle-fill"></i>
              <p>No special deliveries in this view</p>
              <p style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.5rem;">No stops match the selected category</p>
            </div>
            `}
          </div>
        </div>
      </section>`;
    }).join('');

    this.syncFlipHeights();
  }

  /**
   * The back face is absolutely positioned over the front (so it never adds blank
   * space of its own to the card), which means it has no intrinsic height. Match it
   * to the front face's rendered height so the flip never clips or overlaps.
   *
   * Also watches for size changes on the front face — in Rebalance mode the card is
   * user-resizable (CSS `resize`), and dragging it changes the front's height without
   * triggering a re-render, so the back face would otherwise fall out of sync.
   */
  syncFlipHeights() {
    if (!this.flipResizeObserver) {
      this.flipResizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const front = entry.target;
          const back = front.closest('.route-block')?.querySelector('.route-block-back');
          if (back) back.style.height = `${front.offsetHeight}px`;
        }
      });
    } else {
      this.flipResizeObserver.disconnect();
    }

    document.querySelectorAll('.route-block').forEach(block => {
      const front = block.querySelector('.route-block-front');
      const back = block.querySelector('.route-block-back');
      if (!front || !back) return;
      back.style.height = `${front.offsetHeight}px`;
      this.flipResizeObserver.observe(front);
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

    const sortLabels = { yes: 'Sort: Attended', late: 'Sort: Late', no: 'Sort: No-show' };
    const sortColors = {
      yes: 'background:#d1fae5;color:#065f46;',
      late: 'background:#fef3c7;color:#92400e;',
      no: 'background:#fee2e2;color:#991b1b;',
    };
    document.getElementById('allStopsMetrics').innerHTML = `
      <span class="status-badge metric-badge--pre12" style="background:#e0f2fe;color:#075985;">Pre 12: ${route.pre12}</span>
      <span class="status-badge" style="background:#d1fae5;color:#065f46;">ASR: ${route.asr}</span>
      <span class="status-badge" style="background:#ede9fe;color:#5b21b6;">DSR: ${route.dsr}</span>
      <span class="status-badge" style="${sortColors[route.sortAttendance]}">${sortLabels[route.sortAttendance]}</span>`;

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

    new bootstrap.Modal(document.getElementById('shipmentModal')).show();
  }

  showAddPostcodeModal(route = null) {
    const select = document.getElementById('addPostcodeRoute');
    select.innerHTML = '<option value="">All routes</option>' +
      this.routes.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    if (route) select.value = String(route.id);

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

  /* ==================== FLIP CARD 3D ==================== */

  toggleFlipCard(route) {
    if (this.flippedRoutes.has(route.id)) this.flippedRoutes.delete(route.id);
    else this.flippedRoutes.add(route.id);
    const block = document.querySelector(`section.route-block[data-route-id="${route.id}"]`);
    if (block) block.classList.toggle('flipped', this.flippedRoutes.has(route.id));
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
    // completion, pre12, asr, dsr)
    this.recomputeRoute(sourceRoute);
    this.recomputeRoute(targetRoute);

    // Persist transfer to localStorage
    this.persistRebalance();
    this.render();
    this.showToast(`✓ Moved ${moved} postcode(s): ${sourceRoute.name} → ${targetRoute.name}`, 'success');
  }

  /** Instant single-postcode move, used when dragging a row in the Rebalance-mode flat list. */
  transferSinglePostcodeByCode(sourceRouteId, targetRouteId, postcode) {
    const sourceRoute = this.routes.find(r => r.id === sourceRouteId);
    if (!sourceRoute) return;
    const stopIds = sourceRoute.stops.filter(s => s.postcode === postcode).map(s => s.id);
    this.transferPostcodesToRoute(sourceRouteId, targetRouteId, stopIds);
  }

  toggleRebalanceExpand(routeId) {
    if (this.rebalanceExpanded.has(routeId)) this.rebalanceExpanded.delete(routeId);
    else this.rebalanceExpanded.add(routeId);
    this.renderRouteBlocks();
  }

  /** Swaps every stop between the two routes currently being compared — a full route substitution. */
  swapCompareRoutes(routeId) {
    const otherId = this.compareTarget[routeId];
    const a = this.routes.find(r => r.id === routeId);
    const b = this.routes.find(r => r.id === otherId);
    if (!a || !b) return;

    const aStops = a.stops;
    const bStops = b.stops;
    aStops.forEach(s => { s.routeName = b.name; });
    bStops.forEach(s => { s.routeName = a.name; });
    a.stops = bStops;
    b.stops = aStops;
    a.stops.forEach((s, i) => { s.stopNumber = i + 1; });
    b.stops.forEach((s, i) => { s.stopNumber = i + 1; });

    this.recomputeRoute(a);
    this.recomputeRoute(b);
    delete this.compareTarget[a.id];
    delete this.compareTarget[b.id];

    this.persistRebalance();
    this.render();
    this.showToast(`✓ Swapped Route ${a.name} ↔ Route ${b.name}`, 'success');
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
