/* =====================================================
   Daily Operations Management — Logixsphere portal
   Vanilla JS, class-based, mock/simulated data (no backend)
   ===================================================== */

/* ---------- small deterministic PRNG helpers (so switching
   dates back and forth keeps the same mock data per day) ---------- */
function hashStringToSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForSeed(seedStr) {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

const BUSINESS_RULES = {
  WORKING_STATUS: { OFF: 'Off', NOT_ALLOCATED: 'NotAllocated' },
  BAOP_DEPOSIT_ID: 7,
};

const TABLE_HEADERS = ['Route', 'Name', 'Payment Mode', 'Vehicle', 'Rate', 'Sort', 'Sort Value', 'Extras', 'Notes', 'Vendor type'];
const TABLE_HEADERS_SUBMITTED = [...TABLE_HEADERS, 'AD-HOC Service'];
const TABLE_HEADERS_NOT_ALLOCATED = ['Route', 'Name', 'Vendor type'];
const TABLE_HEADERS_ADHOC = ['Route', 'Vendor', 'Vehicle', 'AD-HOC Service', 'AD-HOC Sort', 'Extra', 'Notes'];

const FORM_FIELDS_WORKING = ['Name', 'Status', 'Route', 'Payment Mode', 'Rate', 'Sort', 'Extras', 'Notes', 'Vehicle', 'Vendor type'];
const ADHOC_MODAL_FIELD_ORDER = ['Name', 'Route', 'Deposit Name', 'AD-HOC Service', 'AD-HOC Sort', 'Extras', 'Notes', 'Vehicle'];
const DAYOFF_MODAL_FIELD_ORDER = ['Name'];

function getHeaderLabel(header) {
  if (header === 'Extras') return 'Extras - Qty Hour';
  if (header === 'Extra') return 'Extra';
  if (header === 'Name' || header === 'Vendor') return 'Vendor';
  if (header === 'AD-HOC Service') return 'adhoc-service';
  return header;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function renderCellValue(value) {
  if (value === null || value === undefined) return '-';
  const str = String(value);
  return str.trim() === '' ? '-' : escapeHtml(str);
}

function decimalHoursToTimeString(value) {
  if (value === undefined || value === null || value === '') return '';
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) return '';
  let h = Math.floor(n);
  let m = Math.min(59, Math.max(0, Math.round((n - h) * 60)));
  if (h >= 24) { h = 23; m = 59; }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function timeStringToDecimalHours(s) {
  if (!s || typeof s !== 'string') return undefined;
  const m = s.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return undefined;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes >= 60) return undefined;
  return Math.round((hours + minutes / 60) * 100) / 100;
}

class DailyOperationsManagementApp {
  constructor() {
    // ---- State ----
    this.selectedDate = new Date().toISOString().slice(0, 10);
    this.searchTerm = '';
    this.filterStatus = 'all';
    this.filterVendorType = 'all';
    this.filterServicePartnerId = '';

    this.submittedSearchTerm = '';
    this.submittedKindFilter = 'all';
    this.submittedVendorTypeFilter = 'all';

    this.sortConfig = { key: 'Route', direction: 'asc' };
    this.validatedKeys = new Set();
    this.collapsedBlocks = new Set();

    this.recordsByDate = new Map(); // date -> records[]

    this.editingId = null;
    this.modalMode = 'record'; // 'record' | 'adhoc' | 'dayoff'
    this.itemToDelete = null;
    this.notesPopoverTarget = null;

    this.buildMasterData();
    this.init();
  }

  /* ==================== INIT ==================== */
  init() {
    this.setupStaticListeners();
    this.populateFilterOptions();
    document.getElementById('selectedDateInput').value = this.selectedDate;
    this.loadDataForDate(this.selectedDate);
    this.render();

    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.remove('active');
    }, 400);
  }

  /* ==================== MASTER (mock) DATA ==================== */
  buildMasterData() {
    const rng = rngForSeed('dom-master-data-v1');

    this.deposits = [
      { depositId: 1, depositName: 'Maidstone' },
      { depositId: 2, depositName: 'Chatham' },
      { depositId: 3, depositName: 'Dartford' },
      { depositId: 4, depositName: 'Ashford' },
      { depositId: 7, depositName: 'BAOP' },
    ];

    this.vendorTypes = [
      { vendorTypeId: 1, nameType: 'Owner Driver' },
      { vendorTypeId: 2, nameType: 'Multi Drop' },
      { vendorTypeId: 3, nameType: 'Courier Company' },
      { vendorTypeId: 4, nameType: 'Van Owner' },
    ];

    this.costModels = [
      { costModelId: 1, name: 'DAF' },
      { costModelId: 2, name: 'DR' },
      { costModelId: 3, name: 'FSR' },
      { costModelId: 4, name: 'VSR' },
      { costModelId: 5, name: 'Hourly Rate' },
      { costModelId: 6, name: 'Per Stop' },
      { costModelId: 7, name: 'Extra Hours' },
      { costModelId: 12, name: 'SP_VSR' },
    ];
    this.BANDED_COST_MODEL_IDS = [1, 4, 12];

    this.adhocServices = [
      { adhocServiceId: 1, adhocName: 'Additional Collection', adhocVendorPayment: 15 },
      { adhocServiceId: 2, adhocName: 'Redelivery', adhocVendorPayment: 8 },
      { adhocServiceId: 3, adhocName: 'Bulky Item Handling', adhocVendorPayment: 20 },
      { adhocServiceId: 4, adhocName: 'Out of Hours Run', adhocVendorPayment: 35 },
      { adhocServiceId: 5, adhocName: 'Return to Depot', adhocVendorPayment: 10 },
    ];

    this.servicePartners = [
      { servicePartnerId: 1, partnerName: 'Swift Logistics' },
      { servicePartnerId: 2, partnerName: 'Kent Express' },
    ];

    // Routes: 4 per real depot + 1 NALC placeholder for BAOP/not-allocated
    this.routes = [];
    let rid = 1;
    for (const dep of this.deposits.filter((d) => d.depositId !== 7)) {
      const prefix = dep.depositName.slice(0, 3).toUpperCase();
      for (let i = 1; i <= 4; i++) {
        this.routes.push({ routeId: rid++, routeName: `${prefix}-${String(i).padStart(2, '0')}`, depositId: dep.depositId });
      }
    }
    this.routes.push({ routeId: rid++, routeName: 'NALC', depositId: 7 });
    this.routes.push({ routeId: rid++, routeName: 'DHOC', depositId: 7 });

    // Vehicles
    const fuelTypes = ['Diesel', 'Diesel', 'Diesel', 'Petrol', 'EV'];
    this.vehicles = Array.from({ length: 26 }, (_, i) => {
      const letter = String.fromCharCode(65 + (i % 26));
      const plate = `V${letter}${String(10 + i).padStart(2, '0')} ${['ABC', 'DEF', 'GHJ', 'KLM', 'NPQ'][i % 5]}`;
      return {
        vehicleId: i + 1,
        registrationPlates: plate,
        model: ['Transit', 'Sprinter', 'Crafter', 'Vivaro', 'Boxer'][i % 5],
        fuel_type: fuelTypes[i % fuelTypes.length],
      };
    });

    // Vendors
    const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Jack', 'Amelia', 'Olivia', 'Isla', 'Ava', 'Sophia', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Diego', 'Marta', 'Tomasz', 'Anna', 'Piotr', 'Elena', 'Marcus', 'Chloe', 'Ethan', 'Grace'];
    const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Ferreira', 'Kowalski', 'Nowak', 'Popescu', 'Ionescu', 'Murphy', 'Walsh'];
    this.vendors = Array.from({ length: 26 }, (_, i) => {
      const fullName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
      const vendorTypeId = this.vendorTypes[i % this.vendorTypes.length].vendorTypeId;
      const isBAOP = i >= 24; // reserve last couple for BAOP block
      const dep = isBAOP ? this.deposits.find((d) => d.depositId === 7) : this.deposits[i % 4];
      const routesForDep = this.routes.filter((r) => r.depositId === dep.depositId && !['NALC', 'DHOC'].includes(r.routeName));
      const route = routesForDep.length ? routesForDep[i % routesForDep.length] : this.routes[0];
      const vehicle = this.vehicles[i % this.vehicles.length];
      const cmPool = [2, 2, 3, 5, 6, 7, 1, 4, 12];
      const costModelId = cmPool[i % cmPool.length];
      return {
        userId: 1000 + i,
        fullName,
        vendorTypeId,
        depositId: dep.depositId,
        routeId: route.routeId,
        vehicleId: vehicle.vehicleId,
        costModelId,
        isSort: rng() > 0.25,
        isLate: rng() > 0.8,
        routeSortValue: rng() > 0.5 ? 20 : 1,
        fixedRate: 95 + Math.round(rng() * 60),
        servicePartnerId: rng() > 0.8 ? this.servicePartners[i % this.servicePartners.length].servicePartnerId : null,
        isBAOP,
      };
    });
  }

  getCostModelName(id) {
    const cm = this.costModels.find((c) => c.costModelId === Number(id));
    return cm ? cm.name : '';
  }
  isBandedCostModelId(id) {
    return this.BANDED_COST_MODEL_IDS.includes(Number(id));
  }
  buildRateBands(costModelId) {
    const rng = rngForSeed(`bands-${costModelId}-${this.selectedDate}`);
    const bands = [];
    let min = 0;
    for (let i = 0; i < 4; i++) {
      const span = 10 + Math.floor(rng() * 15);
      const max = i === 3 ? null : min + span;
      const price = (1.4 + i * 0.35 + rng() * 0.2).toFixed(2);
      bands.push({ min, max, price });
      min = max != null ? max + 1 : min;
    }
    return bands;
  }

  /* ==================== PER-DATE MOCK RECORDS ==================== */
  loadDataForDate(date) {
    if (!this.recordsByDate.has(date)) {
      this.recordsByDate.set(date, this.generateRecordsForDate(date));
    }
    this.records = this.recordsByDate.get(date);
  }

  makeRecordId() {
    this._idCounter = (this._idCounter || 0) + 1;
    return `dom-${this._idCounter}-${Math.random().toString(36).slice(2, 7)}`;
  }

  generateRecordsForDate(date) {
    const rng = rngForSeed(`dom-records-${date}`);
    const records = [];
    const notesPool = ['Vehicle serviced this morning', 'Vendor requested late start', 'Covering extra loop', 'Please confirm arrival time', ''];

    for (const vendor of this.vendors) {
      const roll = rng();
      const vendorType = this.vendorTypes.find((t) => t.vendorTypeId === vendor.vendorTypeId);
      const isSubmitted = roll < 0.14;
      let status = 'Working';
      if (!isSubmitted) {
        if (roll < 0.14 + 0.09) status = 'Off';
        else if (roll < 0.14 + 0.09 + 0.09) status = 'NotAllocated';
      }

      const route = this.routes.find((r) => r.routeId === vendor.routeId);
      const vehicle = this.vehicles.find((v) => v.vehicleId === vendor.vehicleId);
      const deposit = this.deposits.find((d) => d.depositId === vendor.depositId);
      const costModelId = vendor.costModelId;
      const isBanded = this.isBandedCostModelId(costModelId);
      const isFixed = costModelId === 2 || costModelId === 3;
      const isHourly = costModelId === 7;

      const base = {
        id: this.makeRecordId(),
        userId: vendor.userId,
        Name: vendor.fullName,
        'Vendor type': vendorType ? vendorType.nameType : '',
        servicePartnerId: vendor.servicePartnerId,
        depositId: vendor.depositId,
        'Deposit Name': deposit ? deposit.depositName : '',
        isSubmitted,
      };

      if (status === 'Off') {
        records.push({
          ...base,
          Route: 'OFF',
          Vehicle: 'NOVEHICLE',
          'Payment Mode': '', paymentModeId: '',
          Rate: '', Sort: 'No', SortLate: false, routeSort: '',
          'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '',
          Extras: '', Notes: rng() > 0.7 ? 'Booked holiday' : '',
          Status: 'Off', isDayOff: true,
          depositId: null, 'Deposit Name': '',
        });
        continue;
      }

      if (status === 'NotAllocated') {
        records.push({
          ...base,
          Route: 'OFF',
          Vehicle: 'NOVEHICLE',
          'Payment Mode': '', paymentModeId: '',
          Rate: '', Sort: 'No', SortLate: false, routeSort: '',
          'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '',
          Extras: '', Notes: '',
          Status: 'NotAllocated', isDayOff: false,
          depositId: null, 'Deposit Name': '',
        });
        continue;
      }

      // Working (or Working + Submitted)
      const rate = isBanded ? '' : isFixed ? vendor.fixedRate : Math.round((8 + rng() * 12) * 100) / 100;
      const extras = isHourly ? Math.round(rng() * 3 * 4) / 4 : rng() > 0.6 ? Math.round(rng() * 20) : 0;
      const sortYes = vendor.isSort;
      records.push({
        ...base,
        Route: route ? route.routeName : '',
        Vehicle: vehicle ? vehicle.registrationPlates : 'NOVEHICLE',
        vehicleFuelType: vehicle ? vehicle.fuel_type : '',
        'Payment Mode': this.getCostModelName(costModelId), paymentModeId: costModelId,
        Rate: rate,
        Sort: sortYes ? 'Yes' : 'No',
        SortLate: sortYes ? vendor.isLate : false,
        routeSort: sortYes ? vendor.routeSortValue : '',
        'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '',
        Extras: extras, Notes: notesPool[Math.floor(rng() * notesPool.length)],
        Status: 'Working', isDayOff: false,
        depositId: vendor.depositId, 'Deposit Name': deposit ? deposit.depositName : '',
      });

      // Occasionally add a standalone AD-HOC row for this vendor in the same deposit block
      if (!vendor.isBAOP && rng() < 0.22) {
        const service = this.adhocServices[Math.floor(rng() * this.adhocServices.length)];
        records.push({
          id: this.makeRecordId(),
          userId: vendor.userId,
          Name: vendor.fullName,
          'Vendor type': vendorType ? vendorType.nameType : '',
          servicePartnerId: vendor.servicePartnerId,
          depositId: vendor.depositId,
          'Deposit Name': deposit ? deposit.depositName : '',
          isSubmitted: false,
          Route: 'DHOC',
          Vehicle: vehicle ? vehicle.registrationPlates : 'NOVEHICLE',
          vehicleFuelType: vehicle ? vehicle.fuel_type : '',
          'Payment Mode': this.getCostModelName(2), paymentModeId: 2,
          Rate: '', Sort: 'No', SortLate: false, routeSort: '',
          'AD-HOC Sort': String(service.adhocVendorPayment),
          'AD-HOC Service': service.adhocName, adhocServiceId: service.adhocServiceId,
          Extras: Math.round(rng() * 10), Notes: '',
          Status: 'Working', isDayOff: false,
        });
      }
    }

    return records;
  }

  /* ==================== FILTER OPTIONS ==================== */
  populateFilterOptions() {
    const spSel = document.getElementById('filterServicePartner');
    this.servicePartners.forEach((sp) => {
      const opt = document.createElement('option');
      opt.value = String(sp.servicePartnerId);
      opt.textContent = sp.partnerName;
      spSel.appendChild(opt);
    });

    const vtSel = document.getElementById('filterVendorType');
    const vtSubSel = document.getElementById('submittedVendorTypeFilter');
    this.vendorTypes.forEach((vt) => {
      [vtSel, vtSubSel].forEach((sel) => {
        const opt = document.createElement('option');
        opt.value = vt.nameType;
        opt.textContent = vt.nameType;
        sel.appendChild(opt);
      });
    });

    const stSel = document.getElementById('filterStatus');
    ['Off', 'Working', 'NotAllocated'].forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      stSel.appendChild(opt);
    });
  }

  /* ==================== EVENT LISTENERS ==================== */
  setupStaticListeners() {
    document.getElementById('btnPrevDay').addEventListener('click', () => this.changeDate(-1));
    document.getElementById('btnNextDay').addEventListener('click', () => this.changeDate(1));
    document.getElementById('selectedDateInput').addEventListener('change', (e) => {
      if (e.target.value) this.setDate(e.target.value);
    });

    document.getElementById('btnAddRecord').addEventListener('click', () => this.openCreateModal('record'));
    document.getElementById('btnAddAdhoc').addEventListener('click', () => this.openCreateModal('adhoc'));
    document.getElementById('btnAddDayOff').addEventListener('click', () => this.openCreateModal('dayoff'));

    document.getElementById('searchInput').addEventListener('input', (e) => { this.searchTerm = e.target.value; this.render(); });
    document.getElementById('filterStatus').addEventListener('change', (e) => { this.filterStatus = e.target.value; this.render(); });
    document.getElementById('filterVendorType').addEventListener('change', (e) => { this.filterVendorType = e.target.value; this.render(); });
    document.getElementById('filterServicePartner').addEventListener('change', (e) => { this.filterServicePartnerId = e.target.value; this.render(); });

    document.getElementById('submittedSearchInput').addEventListener('input', (e) => { this.submittedSearchTerm = e.target.value; this.render(); });
    document.getElementById('submittedKindFilter').addEventListener('change', (e) => { this.submittedKindFilter = e.target.value; this.render(); });
    document.getElementById('submittedVendorTypeFilter').addEventListener('change', (e) => { this.submittedVendorTypeFilter = e.target.value; this.render(); });

    document.getElementById('btnBatchSubmit').addEventListener('click', () => this.handleBatchSubmit());

    document.getElementById('btnCloseRecordModal').addEventListener('click', () => this.closeRecordModal());
    document.getElementById('btnCancelRecord').addEventListener('click', () => this.closeRecordModal());
    document.getElementById('recordForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

    document.getElementById('btnCloseDeleteModal').addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('btnCancelDelete').addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('btnConfirmDelete').addEventListener('click', () => this.confirmDelete());

    document.getElementById('btnCloseRateModal').addEventListener('click', () => this.closeRateModal());
    document.getElementById('rateModalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'rateModalBackdrop') this.closeRateModal(); });
    document.getElementById('recordModalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'recordModalBackdrop') this.closeRecordModal(); });
    document.getElementById('deleteModalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'deleteModalBackdrop') this.closeDeleteModal(); });

    document.getElementById('btnCloseNotesPopover').addEventListener('click', () => this.closeNotesPopover());
    document.addEventListener('click', (e) => {
      const pop = document.getElementById('notesPopover');
      if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-notes-badge]')) this.closeNotesPopover();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeNotesPopover();
        this.closeRateModal();
        this.closeDeleteModal();
        this.closeRecordModal();
      }
    });
  }

  changeDate(deltaDays) {
    const [y, m, d] = this.selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaDays);
    const next = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    this.setDate(next);
  }

  setDate(date) {
    this.selectedDate = date;
    document.getElementById('selectedDateInput').value = date;
    this.validatedKeys = new Set();
    this.submittedSearchTerm = '';
    this.submittedKindFilter = 'all';
    this.submittedVendorTypeFilter = 'all';
    document.getElementById('submittedSearchInput').value = '';
    document.getElementById('submittedKindFilter').value = 'all';
    document.getElementById('submittedVendorTypeFilter').value = 'all';
    this.loadDataForDate(date);
    this.render();
  }

  /* ==================== RENDER ==================== */
  render() {
    this.renderHeader();
    this.renderMetrics();

    const filtered = this.getFilteredRecords();
    const mainRows = filtered.filter((r) => !r.isSubmitted);
    const submittedRows = this.getSubmittedRows();

    document.getElementById('domEmptyState').hidden = !(mainRows.length === 0 && submittedRows.length === 0);
    document.getElementById('domBlocksContainer').innerHTML = '';
    document.getElementById('domReviewBar').hidden = mainRows.length === 0 && submittedRows.length === 0;

    const blocks = this.groupIntoBlocks(mainRows);
    const container = document.getElementById('domBlocksContainer');
    blocks.forEach((block) => container.appendChild(this.renderBlock(block, false)));

    this.updateSubmitButtonState(mainRows);

    const submittedSection = document.getElementById('domSubmittedSection');
    const submittedTotal = this.getAllSubmittedRowsUnfiltered().length;
    submittedSection.hidden = submittedTotal === 0;
    const submittedContainer = document.getElementById('domSubmittedBlockContainer');
    submittedContainer.innerHTML = '';
    if (submittedTotal > 0) {
      const block = { key: '__submitted', label: 'Submitted', rows: submittedRows };
      submittedContainer.appendChild(this.renderBlock(block, true, submittedTotal));
    }
  }

  renderHeader() {
    const d = new Date(`${this.selectedDate}T00:00:00`);
    const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const dateUK = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7);
    document.getElementById('pageHeaderSubtitle').textContent = `${dayName} - ${dateUK} - Week ${String(week).padStart(2, '0')}`;
  }

  renderMetrics() {
    const all = this.records;
    const total = all.length;
    const working = all.filter((r) => r.Status === 'Working' && !r.isSubmitted).length;
    const off = all.filter((r) => r.Status === 'Off').length;
    const notAllocated = all.filter((r) => r.Status === 'NotAllocated').length;
    const submitted = all.filter((r) => r.isSubmitted).length;
    const metrics = [
      { label: 'Total Records', value: total },
      { label: 'Working', value: working },
      { label: 'Day off', value: off },
      { label: 'Not allocated', value: notAllocated },
      { label: 'Submitted', value: submitted },
      { label: 'Selected', value: this.validatedKeys.size },
    ];
    document.getElementById('domMetrics').innerHTML = metrics.map((m) => `
      <div class="dom-metric-card">
        <div class="dom-metric-value">${m.value}</div>
        <div class="dom-metric-label">${escapeHtml(m.label)}</div>
      </div>
    `).join('');
  }

  getFilteredRecords() {
    const term = this.searchTerm.trim().toLowerCase();
    return this.records.filter((item) => {
      if (this.filterStatus !== 'all') {
        const rowIsOff = item.Status === 'Off';
        const rowIsNotAlloc = item.Status === 'NotAllocated';
        if (this.filterStatus === 'Working') {
          if (!rowIsOff && !rowIsNotAlloc && item.Status !== 'Working') return false;
        } else if (this.filterStatus === 'Off') {
          if (!rowIsOff) return false;
        } else if (this.filterStatus === 'NotAllocated') {
          if (!rowIsNotAlloc) return false;
        }
      }
      if (this.filterVendorType !== 'all' && (item['Vendor type'] || '').toLowerCase() !== this.filterVendorType.toLowerCase()) return false;
      if (this.filterServicePartnerId !== '') {
        if (item.servicePartnerId == null || String(item.servicePartnerId) !== this.filterServicePartnerId) return false;
      }
      if (term) {
        const hay = `${item.Name || ''} ${item.Route || ''} ${item.Vehicle || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }

  getAllSubmittedRowsUnfiltered() {
    return this.records.filter((r) => r.isSubmitted);
  }

  matchesSubmittedKind(row, kind) {
    if (kind === 'all') return true;
    const isDayOff = Boolean(row.isDayOff);
    if (kind === 'dayoff') return isDayOff;
    if (kind === 'notallocated') return !isDayOff && (row.Status === 'NotAllocated' || row.depositId === 7);
    if (kind === 'routes') return !isDayOff && row.depositId !== 7;
    return true;
  }

  getSubmittedRows() {
    let rows = this.getAllSubmittedRowsUnfiltered();
    if (this.filterVendorType !== 'all') {
      rows = rows.filter((r) => (r['Vendor type'] || '').toLowerCase() === this.filterVendorType.toLowerCase());
    }
    const term = this.searchTerm.trim().toLowerCase();
    if (term) rows = rows.filter((r) => `${r.Name} ${r.Route} ${r.Vehicle}`.toLowerCase().includes(term));

    if (this.submittedKindFilter !== 'all') rows = rows.filter((r) => this.matchesSubmittedKind(r, this.submittedKindFilter));
    if (this.submittedVendorTypeFilter !== 'all') rows = rows.filter((r) => (r['Vendor type'] || '').toLowerCase() === this.submittedVendorTypeFilter.toLowerCase());
    const subTerm = this.submittedSearchTerm.trim().toLowerCase();
    if (subTerm) {
      rows = rows.filter((r) => `${r.Name} ${r.Route} ${r.Vehicle} ${r['Deposit Name']} ${r.Notes}`.toLowerCase().includes(subTerm));
    }
    rows.sort((a, b) => String(a.Name).localeCompare(String(b.Name), undefined, { sensitivity: 'base' }));
    return rows;
  }

  groupIntoBlocks(rows) {
    const groups = new Map();
    for (const item of rows) {
      let key;
      if (item.depositId === 7) key = 'BAOP';
      else if (item.isDayOff || item.Status === 'Off') key = 'OFF';
      else if (item.Status === 'NotAllocated') key = 'NOTALLOC';
      else key = String(item.depositId != null ? item.depositId : item['Deposit Name'] || '');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }

    const blocks = [];
    if (groups.has('OFF')) blocks.push({ key: 'OFF', label: 'Day off', rows: groups.get('OFF') });
    if (groups.has('NOTALLOC')) blocks.push({ key: 'NOTALLOC', label: 'Not allocated', rows: groups.get('NOTALLOC') });
    for (const dep of this.deposits.filter((d) => d.depositId !== 7)) {
      const key = String(dep.depositId);
      if (groups.has(key)) blocks.push({ key, label: dep.depositName, rows: groups.get(key) });
    }
    if (groups.has('BAOP')) blocks.push({ key: 'BAOP', label: 'BAOP', rows: groups.get('BAOP') });
    return blocks;
  }

  applySort(rows) {
    const map = { Vendor: 'Name', Extra: 'Extras', 'Sort Value': 'routeSort' };
    const field = map[this.sortConfig.key] || this.sortConfig.key;
    const dir = this.sortConfig.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = String(a[field] ?? '').trim();
      const bv = String(b[field] ?? '').trim();
      return dir * av.localeCompare(bv, undefined, { sensitivity: 'base' });
    });
  }

  isEligibleForValidation(item) { return !item.isSubmitted; }

  renderBlock(block, isSubmitted, submittedTotal) {
    const wrapper = document.createElement('section');
    wrapper.className = 'dom-block';
    wrapper.dataset.blockKey = block.key;

    const isCollapsed = this.collapsedBlocks.has(block.key);
    const isDepositBlock = block.key !== 'OFF' && block.key !== 'NOTALLOC' && block.key !== '__submitted';
    const eligible = block.rows.filter((r) => this.isEligibleForValidation(r));
    const allSelected = eligible.length > 0 && eligible.every((r) => this.validatedKeys.has(r.id));

    const header = document.createElement('div');
    header.className = 'dom-block-header';
    header.innerHTML = `
      <div class="dom-block-header-left">
        <button type="button" class="dom-collapse-btn" data-toggle-collapse="${escapeHtml(block.key)}" aria-label="Toggle block">
          <i class="bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'}"></i>
        </button>
        <h2 class="dom-block-title">${escapeHtml(block.label)}<span class="dom-block-count">(${block.rows.length} ${block.rows.length === 1 ? 'record' : 'records'})</span></h2>
      </div>
      ${!isCollapsed && block.key !== 'NOTALLOC' ? `<button type="button" class="dom-select-all-btn" data-select-all="${escapeHtml(block.key)}" ${block.rows.length === 0 ? 'disabled' : ''}>${allSelected ? 'Unselect All' : 'Select All'}</button>` : ''}
    `;
    wrapper.appendChild(header);

    if (!isCollapsed) {
      const showEmpty = isSubmitted && block.rows.length === 0 && submittedTotal;
      if (showEmpty) {
        const empty = document.createElement('div');
        empty.className = 'dom-empty-state';
        empty.innerHTML = `<p class="dom-empty-title">No records to show</p><p class="dom-empty-text">${submittedTotal} submitted record(s) exist for this date, but none match the current filters.</p>`;
        wrapper.appendChild(empty);
      } else {
        const headers = block.key === 'NOTALLOC' ? TABLE_HEADERS_NOT_ALLOCATED : isSubmitted ? TABLE_HEADERS_SUBMITTED : TABLE_HEADERS;
        const mainRows = this.applySort(isDepositBlock ? block.rows.filter((r) => !this.hasAdhocService(r)) : block.rows);
        const adhocRows = (isSubmitted || !isDepositBlock) ? [] : this.applySort(block.rows.filter((r) => this.hasAdhocService(r)));

        wrapper.appendChild(this.renderTable(headers, mainRows, block.key !== 'NOTALLOC'));

        if (adhocRows.length > 0) {
          const sub = document.createElement('div');
          sub.className = 'dom-adhoc-subtable';
          sub.innerHTML = '<h3>AD-HOC</h3>';
          sub.appendChild(this.renderTable(TABLE_HEADERS_ADHOC, adhocRows, true));
          wrapper.appendChild(sub);
        }
      }
    }

    return wrapper;
  }

  hasAdhocService(row) {
    const label = String(row['AD-HOC Service'] || '').trim();
    return label !== '' && label.toLowerCase() !== 'null';
  }

  renderTable(headers, rows, showActions) {
    const scroll = document.createElement('div');
    scroll.className = 'dom-table-scroll';
    const table = document.createElement('table');
    table.className = 'dom-table';

    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    headers.forEach((h) => {
      const th = document.createElement('th');
      th.dataset.sortKey = h;
      const ind = this.sortConfig.key === h ? `<span class="sort-ind">${this.sortConfig.direction === 'asc' ? '↑' : '↓'}</span>` : '';
      th.innerHTML = `${escapeHtml(getHeaderLabel(h))}${ind}`;
      trh.appendChild(th);
    });
    if (showActions) {
      const thAct = document.createElement('th');
      thAct.textContent = 'Actions';
      trh.appendChild(thAct);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach((item) => {
      const tr = document.createElement('tr');
      tr.dataset.rowId = item.id;
      if (item.Status === 'Off') tr.classList.add('row-off');
      else if (item.Status === 'NotAllocated') tr.classList.add('row-notallocated');
      else if (item.isSubmitted) tr.classList.add('row-submitted');

      headers.forEach((h) => {
        const td = document.createElement('td');
        td.innerHTML = this.renderCell(h, item);
        tr.appendChild(td);
      });

      if (showActions) {
        const td = document.createElement('td');
        td.innerHTML = this.renderActionsCell(item);
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    scroll.appendChild(table);

    scroll.addEventListener('click', (e) => this.handleTableClick(e));
    return scroll;
  }

  renderCell(header, item) {
    if (header === 'Name' || header === 'Vendor') {
      const sp = item.servicePartnerId ? this.servicePartners.find((s) => s.servicePartnerId === item.servicePartnerId) : null;
      return `<span>${renderCellValue(item.Name)}</span>${sp ? ` <span class="sp-badge">${escapeHtml(sp.partnerName)}</span>` : ''}`;
    }
    if (header === 'Vehicle') {
      const plate = String(item.Vehicle || '').trim();
      if (!plate) return '<span class="dom-cell-empty">-</span>';
      if (plate.toUpperCase() === 'NOVEHICLE') return '<span class="fw-semibold text-muted">NOVEHICLE</span>';
      const isEv = String(item.vehicleFuelType || '').toLowerCase().includes('ev') || String(item.vehicleFuelType || '').toLowerCase().includes('electric');
      return `<span class="vrn-plate${isEv ? ' ev' : ''}">${escapeHtml(plate)}</span>`;
    }
    if (header === 'Notes') {
      const note = item.Notes;
      if (note && String(note).trim() !== '') {
        return `<button type="button" class="notes-badge" data-notes-badge data-note="${escapeHtml(note)}" title="View notes" aria-label="View notes">!</button>`;
      }
      return '<span class="dom-cell-empty">-</span>';
    }
    if (header === 'Extras' || header === 'Extra') {
      if (Number(item.paymentModeId) === 7) return escapeHtml(decimalHoursToTimeString(item.Extras) || '-');
      return renderCellValue(item.Extras);
    }
    if (header === 'Rate') {
      const modeLabel = this.getCostModelName(item.paymentModeId);
      const showIcon = modeLabel !== 'DR' && modeLabel !== 'FSR' && this.isBandedCostModelId(item.paymentModeId);
      if (showIcon) {
        return `<button type="button" class="rate-info-btn" data-rate-info data-row-id="${escapeHtml(item.id)}" title="View cost model bands">i</button>`;
      }
      return renderCellValue(item.Rate);
    }
    if (header === 'Sort') {
      const s = String(item.Sort || '').toLowerCase();
      if (s === 'yes' && item.SortLate) return 'Yes (Late)';
      if (s === 'yes') return 'Yes';
      return renderCellValue(item.Sort);
    }
    if (header === 'Sort Value') return renderCellValue(item.routeSort);
    if (header === 'AD-HOC Service') return renderCellValue(item['AD-HOC Service']);
    return renderCellValue(item[header]);
  }

  renderActionsCell(item) {
    if (item.isSubmitted) {
      return '<div class="dom-actions-cell"><span class="submitted-pill">Submitted</span></div>';
    }
    const isValidated = this.validatedKeys.has(item.id);
    const canDelete = item.Status !== 'NotAllocated';
    return `
      <div class="dom-actions-cell">
        <button type="button" class="dom-icon-btn validate-btn${isValidated ? ' checked' : ''}" data-validate="${escapeHtml(item.id)}" title="${isValidated ? 'Validated — click to unmark' : 'Mark as validated'}"><i class="bi bi-check-lg"></i></button>
        <button type="button" class="dom-icon-btn edit-btn" data-edit="${escapeHtml(item.id)}" title="Edit"><i class="bi bi-pencil"></i></button>
        ${canDelete ? `<button type="button" class="dom-icon-btn delete-btn" data-delete="${escapeHtml(item.id)}" title="Delete"><i class="bi bi-trash"></i></button>` : ''}
      </div>
    `;
  }

  /* ==================== TABLE / BLOCK INTERACTIONS ==================== */
  handleTableClick(e) {
    const th = e.target.closest('th[data-sort-key]');
    if (th) {
      const key = th.dataset.sortKey;
      this.sortConfig = { key, direction: this.sortConfig.key === key && this.sortConfig.direction === 'asc' ? 'desc' : 'asc' };
      this.render();
      return;
    }
    const notesBtn = e.target.closest('[data-notes-badge]');
    if (notesBtn) { this.openNotesPopover(notesBtn); return; }

    const rateBtn = e.target.closest('[data-rate-info]');
    if (rateBtn) { this.openRateModal(rateBtn.dataset.rowId); return; }

    const validateBtn = e.target.closest('[data-validate]');
    if (validateBtn) { this.toggleValidated(validateBtn.dataset.validate); return; }

    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) { this.openEditModal(editBtn.dataset.edit); return; }

    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) { this.openDeleteModal(deleteBtn.dataset.delete); return; }
  }

  setupBlockContainerDelegation() {
    ['domBlocksContainer', 'domSubmittedBlockContainer'].forEach((id) => {
      document.getElementById(id).addEventListener('click', (e) => {
        const collapseBtn = e.target.closest('[data-toggle-collapse]');
        if (collapseBtn) {
          const key = collapseBtn.dataset.toggleCollapse;
          if (this.collapsedBlocks.has(key)) this.collapsedBlocks.delete(key);
          else this.collapsedBlocks.add(key);
          this.render();
          return;
        }
        const selAllBtn = e.target.closest('[data-select-all]');
        if (selAllBtn) {
          const key = selAllBtn.dataset.selectAll;
          this.toggleSelectAllInBlock(key);
        }
      });
    });
  }

  toggleSelectAllInBlock(blockKey) {
    const filtered = this.getFilteredRecords().filter((r) => !r.isSubmitted);
    const submittedRows = this.getSubmittedRows();
    const allBlocks = [...this.groupIntoBlocks(filtered), { key: '__submitted', rows: submittedRows }];
    const block = allBlocks.find((b) => b.key === blockKey);
    if (!block) return;
    const eligible = block.rows.filter((r) => this.isEligibleForValidation(r));
    if (eligible.length === 0) return;
    const allSelected = eligible.every((r) => this.validatedKeys.has(r.id));
    eligible.forEach((r) => {
      if (allSelected) this.validatedKeys.delete(r.id);
      else this.validatedKeys.add(r.id);
    });
    this.render();
  }

  toggleValidated(id) {
    if (this.validatedKeys.has(id)) this.validatedKeys.delete(id);
    else this.validatedKeys.add(id);
    this.render();
  }

  updateSubmitButtonState(mainRows) {
    const btn = document.getElementById('btnBatchSubmit');
    const hint = document.getElementById('domReviewHint');
    btn.disabled = this.validatedKeys.size === 0;
    hint.textContent = this.validatedKeys.size === 0
      ? 'Select records using the checkbox to submit.'
      : `${this.validatedKeys.size} record(s) selected.`;
  }

  handleBatchSubmit() {
    if (this.validatedKeys.size === 0) return;
    let count = 0;
    this.records.forEach((r) => {
      if (this.validatedKeys.has(r.id)) { r.isSubmitted = true; count++; }
    });
    this.validatedKeys = new Set();
    this.showToast(`${count} record(s) submitted successfully.`, 'success');
    this.render();
  }

  /* ==================== NOTES POPOVER ==================== */
  openNotesPopover(btn) {
    const pop = document.getElementById('notesPopover');
    document.getElementById('notesPopoverText').textContent = btn.dataset.note || '';
    pop.hidden = false;
    const rect = btn.getBoundingClientRect();
    let top = rect.top - 10 + window.scrollY;
    let left = rect.left + rect.width / 2 + window.scrollX;
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    pop.style.transform = 'translate(-50%, -100%)';
    // reposition below if too close to top of viewport
    requestAnimationFrame(() => {
      const popRect = pop.getBoundingClientRect();
      if (popRect.top < 8) {
        pop.style.top = `${rect.bottom + 10 + window.scrollY}px`;
        pop.style.transform = 'translate(-50%, 0)';
      }
    });
  }
  closeNotesPopover() { document.getElementById('notesPopover').hidden = true; }

  /* ==================== RATE BANDS MODAL ==================== */
  openRateModal(rowId) {
    const item = this.records.find((r) => r.id === rowId);
    if (!item) return;
    const modeName = this.getCostModelName(item.paymentModeId);
    const bands = this.buildRateBands(item.paymentModeId);
    document.getElementById('rateModalBody').innerHTML = `
      <p class="mb-3 text-secondary" style="font-size:0.85rem;">Cost model <strong>${escapeHtml(modeName)}</strong> pays per stop, according to the band the route falls into.</p>
      <table class="dom-band-table">
        <thead><tr><th>Min stops</th><th>Max stops</th><th>Price / stop</th></tr></thead>
        <tbody>
          ${bands.map((b) => `<tr><td>${b.min}</td><td>${b.max == null ? '&infin;' : b.max}</td><td>&pound;${b.price}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
    document.getElementById('rateModalBackdrop').hidden = false;
  }
  closeRateModal() { document.getElementById('rateModalBackdrop').hidden = true; }

  /* ==================== DELETE MODAL ==================== */
  openDeleteModal(id) {
    const item = this.records.find((r) => r.id === id);
    if (!item) return;
    this.itemToDelete = item;
    const sameDayCount = this.records.filter((r) => r.userId === item.userId).length;
    document.getElementById('deleteModalText').textContent = sameDayCount > 1
      ? `Remove ${item.Name}'s record for ${item.Route}? This record will be deleted.`
      : `${item.Name} has no other record today — removing this will mark them as Not Allocated instead of deleting.`;
    document.getElementById('deleteModalBackdrop').hidden = false;
  }
  closeDeleteModal() { document.getElementById('deleteModalBackdrop').hidden = true; this.itemToDelete = null; }

  confirmDelete() {
    if (!this.itemToDelete) return;
    const item = this.itemToDelete;
    const sameDayCount = this.records.filter((r) => r.userId === item.userId).length;
    if (sameDayCount > 1) {
      this.records = this.records.filter((r) => r.id !== item.id);
      this.recordsByDate.set(this.selectedDate, this.records);
      this.showToast('Record deleted.', 'success');
    } else {
      Object.assign(item, {
        Route: 'OFF', Vehicle: 'NOVEHICLE', 'Payment Mode': '', paymentModeId: '',
        Rate: '', Sort: 'No', SortLate: false, routeSort: '',
        'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '',
        Status: 'NotAllocated', isDayOff: false, depositId: null, 'Deposit Name': '',
      });
      this.showToast('Vendor moved to Not Allocated.', 'success');
    }
    this.validatedKeys.delete(item.id);
    this.closeDeleteModal();
    this.render();
  }

  /* ==================== RECORD MODAL (add/edit) ==================== */
  openCreateModal(mode) {
    this.modalMode = mode;
    this.editingId = null;
    this.formData = this.blankFormData(mode);
    this.renderRecordForm();
    document.getElementById('recordModalTitle').textContent =
      mode === 'adhoc' ? 'Add Adhoc Service' : mode === 'dayoff' ? 'Add Day off' : 'Add New Record';
    document.getElementById('btnSubmitRecord').textContent = 'Add Record';
    document.getElementById('recordModalBackdrop').hidden = false;
  }

  openEditModal(id) {
    const item = this.records.find((r) => r.id === id);
    if (!item) return;
    this.editingId = id;
    this.modalMode = this.hasAdhocService(item) ? 'adhoc' : 'record';
    this.formData = { ...item };
    this.renderRecordForm();
    document.getElementById('recordModalTitle').textContent = 'Edit Record';
    document.getElementById('btnSubmitRecord').textContent = 'Update Record';
    document.getElementById('recordModalBackdrop').hidden = false;
  }

  closeRecordModal() {
    document.getElementById('recordModalBackdrop').hidden = true;
    this.editingId = null;
    this.formData = null;
  }

  blankFormData(mode) {
    const base = {
      id: null, userId: null, Name: '', Route: '', 'Payment Mode': '', paymentModeId: '',
      Rate: '', Sort: 'Yes', SortLate: false, routeSort: '', 'AD-HOC Sort': '', 'AD-HOC Service': '',
      adhocServiceId: '', Extras: '', Notes: '', Vehicle: '', vehicleFuelType: '',
      'Vendor type': '', Status: 'Working', depositId: null, 'Deposit Name': '',
      servicePartnerId: null, isDayOff: false, isSubmitted: false,
    };
    if (mode === 'dayoff') return { ...base, Route: 'OFF', Vehicle: 'NOVEHICLE', Status: 'Off', isDayOff: true };
    if (mode === 'adhoc') return { ...base, 'Payment Mode': this.getCostModelName(2), paymentModeId: 2, Sort: 'No' };
    return base;
  }

  applyVendorDefaults(fd, vendorName) {
    const vendor = this.vendors.find((v) => v.fullName === vendorName);
    if (!vendor) return fd;
    const vendorType = this.vendorTypes.find((t) => t.vendorTypeId === vendor.vendorTypeId);
    fd.userId = vendor.userId;
    fd['Vendor type'] = vendorType ? vendorType.nameType : '';
    fd.servicePartnerId = vendor.servicePartnerId;

    if (this.modalMode === 'dayoff' || fd.Status === 'Off' || fd.Status === 'NotAllocated') return fd;

    const route = this.routes.find((r) => r.routeId === vendor.routeId);
    const vehicle = this.vehicles.find((v) => v.vehicleId === vendor.vehicleId);
    const deposit = this.deposits.find((d) => d.depositId === vendor.depositId);
    fd.Vehicle = vehicle ? vehicle.registrationPlates : 'NOVEHICLE';
    fd.vehicleFuelType = vehicle ? vehicle.fuel_type : '';
    fd.depositId = vendor.depositId;
    fd['Deposit Name'] = deposit ? deposit.depositName : '';

    if (this.modalMode === 'adhoc') return fd;

    fd.Route = route ? route.routeName : '';
    fd.paymentModeId = vendor.costModelId;
    fd['Payment Mode'] = this.getCostModelName(vendor.costModelId);
    const isFixed = vendor.costModelId === 2 || vendor.costModelId === 3;
    const isBanded = this.isBandedCostModelId(vendor.costModelId);
    fd.Rate = isBanded ? '' : isFixed ? vendor.fixedRate : '';
    fd.Sort = vendor.isSort ? 'Yes' : 'No';
    fd.SortLate = vendor.isSort ? vendor.isLate : false;
    fd.routeSort = vendor.isSort ? vendor.routeSortValue : '';
    return fd;
  }

  renderRecordForm() {
    const grid = document.getElementById('recordFormGrid');
    const fd = this.formData;
    const mode = this.modalMode;
    const isBandedRate = this.isBandedCostModelId(fd.paymentModeId);
    const isExtraHours = Number(fd.paymentModeId) === 7;

    const vendorOptions = [...this.vendors].sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((v) => `<option value="${escapeHtml(v.fullName)}" ${fd.Name === v.fullName ? 'selected' : ''}>${escapeHtml(v.fullName)}</option>`).join('');

    const routeOptions = ['<option value="OFF">OFF</option>', ...this.routes.filter((r) => !['NALC', 'DHOC'].includes(r.routeName))
      .map((r) => `<option value="${escapeHtml(r.routeName)}" ${fd.Route === r.routeName ? 'selected' : ''}>${escapeHtml(r.routeName)}</option>`)]
      .join('');

    const vehicleOptions = ['<option value="NOVEHICLE">NOVEHICLE</option>', ...this.vehicles
      .map((v) => `<option value="${escapeHtml(v.registrationPlates)}" ${fd.Vehicle === v.registrationPlates ? 'selected' : ''}>${escapeHtml(v.registrationPlates)} (${escapeHtml(v.model)})</option>`)]
      .join('');

    const paymentModeOptions = this.costModels
      .map((c) => `<option value="${c.costModelId}" ${Number(fd.paymentModeId) === c.costModelId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');

    const vendorTypeOptions = this.vendorTypes
      .map((t) => `<option value="${escapeHtml(t.nameType)}" ${fd['Vendor type'] === t.nameType ? 'selected' : ''}>${escapeHtml(t.nameType)}</option>`).join('');

    const adhocOptions = this.adhocServices
      .map((s) => `<option value="${s.adhocServiceId}" ${String(fd.adhocServiceId) === String(s.adhocServiceId) ? 'selected' : ''}>${escapeHtml(s.adhocName)}</option>`).join('');

    const depositOptions = this.deposits
      .map((d) => `<option value="${escapeHtml(d.depositName)}" ${fd['Deposit Name'] === d.depositName ? 'selected' : ''}>${escapeHtml(d.depositName)}</option>`).join('');

    let html = '';

    if (mode === 'dayoff') {
      html += `
        <div class="dom-form-field span-2">
          <label class="dom-form-label">Vendor *</label>
          <select data-field="Name" required><option value="">Select vendor</option>${vendorOptions}</select>
        </div>`;
    } else if (mode === 'adhoc') {
      html += `
        <div class="dom-form-field"><label class="dom-form-label">Vendor *</label><select data-field="Name" required><option value="">Select vendor</option>${vendorOptions}</select></div>
        <div class="dom-form-field"><label class="dom-form-label">Route</label><select data-field="Route">${routeOptions}</select></div>
        <div class="dom-form-field"><label class="dom-form-label">Depot</label><select data-field="Deposit Name">${depositOptions}</select></div>
        <div class="dom-form-field"><label class="dom-form-label">AD-HOC Service *</label><select data-field="AD-HOC Service Select" required><option value="">Select service</option>${adhocOptions}</select></div>
        <div class="dom-form-field"><label class="dom-form-label">AD-HOC Sort</label><input type="text" data-field="AD-HOC Sort" value="${escapeHtml(fd['AD-HOC Sort'])}" placeholder="e.g. 10.00" /></div>
        <div class="dom-form-field"><label class="dom-form-label">Extra</label><input type="text" data-field="Extras" value="${escapeHtml(fd.Extras)}" /></div>
        <div class="dom-form-field span-2"><label class="dom-form-label">Notes</label><textarea data-field="Notes" rows="2">${escapeHtml(fd.Notes)}</textarea></div>
        <div class="dom-form-field"><label class="dom-form-label">Vehicle</label><select data-field="Vehicle">${vehicleOptions}</select></div>
      `;
    } else {
      html += `
        <div class="dom-form-field"><label class="dom-form-label">Vendor *</label><select data-field="Name" required><option value="">Select vendor</option>${vendorOptions}</select></div>
        <div class="dom-form-field">
          <label class="dom-form-label">Status *</label>
          <select data-field="Status" required>
            <option value="Working" ${fd.Status === 'Working' ? 'selected' : ''}>Working</option>
            <option value="Off" ${fd.Status === 'Off' ? 'selected' : ''}>Day Off</option>
            <option value="NotAllocated" ${fd.Status === 'NotAllocated' ? 'selected' : ''}>Not Allocated</option>
          </select>
        </div>
        <div class="dom-form-field"><label class="dom-form-label">Route${fd.Status === 'Working' ? ' *' : ''}</label><select data-field="Route" ${fd.Status !== 'Working' ? 'disabled' : ''}>${routeOptions}</select></div>
        <div class="dom-form-field"><label class="dom-form-label">Payment Mode${fd.Status === 'Working' ? ' *' : ''}</label><select data-field="Payment Mode" ${fd.Status !== 'Working' ? 'disabled' : ''}><option value="">Select mode</option>${paymentModeOptions}</select></div>
        <div class="dom-form-field">
          <label class="dom-form-label">Rate</label>
          <input type="text" data-field="Rate" value="${escapeHtml(fd.Rate)}" ${isBandedRate || fd.Status !== 'Working' ? 'disabled' : ''} placeholder="${isBandedRate ? 'Defined by cost model bands' : ''}" />
          ${isBandedRate ? '<p class="dom-form-hint">For DAF/VSR/SP_VSR, use the info icon in the Rate column of the table.</p>' : ''}
        </div>
        <div class="dom-form-field span-2">
          <label class="dom-form-label">Sort</label>
          <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:flex-start;">
            <div style="min-width:140px;">
              <select data-field="Sort" ${fd.Status !== 'Working' ? 'disabled' : ''}>
                <option value="Yes" ${fd.Sort === 'Yes' ? 'selected' : ''}>Yes</option>
                <option value="No" ${fd.Sort === 'No' ? 'selected' : ''}>No</option>
              </select>
              ${fd.Sort === 'Yes' ? `
              <div class="dom-sort-arrival">
                <span>Arrival:</span>
                <button type="button" class="dom-arrival-btn${!fd.SortLate ? ' active-ontime' : ''}" data-arrival="ontime"><i class="bi bi-check-lg"></i> On time</button>
                <button type="button" class="dom-arrival-btn${fd.SortLate ? ' active-late' : ''}" data-arrival="late"><i class="bi bi-clock"></i> Late</button>
              </div>` : ''}
            </div>
            <div style="min-width:140px;">
              <label class="dom-form-label" style="font-weight:500;">Sort value</label>
              <input type="number" data-field="routeSort" value="${escapeHtml(fd.routeSort)}" ${fd.Sort !== 'Yes' || fd.Status !== 'Working' ? 'disabled' : ''} placeholder="e.g. 0, 1, 20" />
            </div>
          </div>
        </div>
        <div class="dom-form-field">
          <label class="dom-form-label">${isExtraHours ? 'Extras - Time' : 'Extras - Qty Hour'}</label>
          ${isExtraHours
            ? `<input type="time" data-field="ExtrasTime" value="${escapeHtml(decimalHoursToTimeString(fd.Extras))}" />`
            : `<input type="text" data-field="Extras" value="${escapeHtml(fd.Extras)}" />`}
        </div>
        <div class="dom-form-field"><label class="dom-form-label">Vehicle</label><select data-field="Vehicle" ${fd.Status === 'Off' || fd.Status === 'NotAllocated' ? 'disabled' : ''}>${vehicleOptions}</select></div>
        <div class="dom-form-field span-2"><label class="dom-form-label">Notes</label><textarea data-field="Notes" rows="2">${escapeHtml(fd.Notes)}</textarea></div>
        <div class="dom-form-field"><label class="dom-form-label">Vendor type</label><select data-field="Vendor type"><option value="">Select type</option>${vendorTypeOptions}</select></div>
      `;
    }

    grid.innerHTML = html;
    this.bindRecordFormFields();
  }

  bindRecordFormFields() {
    const grid = document.getElementById('recordFormGrid');

    const nameField = grid.querySelector('[data-field="Name"]');
    if (nameField) {
      nameField.addEventListener('change', (e) => {
        this.formData.Name = e.target.value;
        this.formData = this.applyVendorDefaults(this.formData, e.target.value);
        this.renderRecordForm();
      });
    }

    const statusField = grid.querySelector('[data-field="Status"]');
    if (statusField) {
      statusField.addEventListener('change', (e) => {
        const status = e.target.value;
        this.formData.Status = status;
        if (status === 'Off' || status === 'NotAllocated') {
          this.formData.Route = 'OFF';
          this.formData.Vehicle = 'NOVEHICLE';
        } else if (this.formData.Name) {
          this.formData = this.applyVendorDefaults(this.formData, this.formData.Name);
        }
        this.renderRecordForm();
      });
    }

    const routeField = grid.querySelector('[data-field="Route"]');
    if (routeField) {
      routeField.addEventListener('change', (e) => {
        this.formData.Route = e.target.value;
        const route = this.routes.find((r) => r.routeName === e.target.value);
        if (route) {
          const dep = this.deposits.find((d) => d.depositId === route.depositId);
          this.formData.depositId = route.depositId;
          this.formData['Deposit Name'] = dep ? dep.depositName : '';
        }
      });
    }

    const paymentField = grid.querySelector('[data-field="Payment Mode"]');
    if (paymentField) {
      paymentField.addEventListener('change', (e) => {
        const cmId = Number(e.target.value);
        this.formData.paymentModeId = cmId;
        this.formData['Payment Mode'] = this.getCostModelName(cmId);
        if (this.isBandedCostModelId(cmId)) this.formData.Rate = '';
        this.renderRecordForm();
      });
    }

    const sortField = grid.querySelector('[data-field="Sort"]');
    if (sortField) {
      sortField.addEventListener('change', (e) => {
        this.formData.Sort = e.target.value;
        if (e.target.value === 'No') { this.formData.routeSort = ''; this.formData.SortLate = false; }
        this.renderRecordForm();
      });
    }

    grid.querySelectorAll('[data-arrival]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.formData.SortLate = btn.dataset.arrival === 'late';
        this.renderRecordForm();
      });
    });

    const adhocSelect = grid.querySelector('[data-field="AD-HOC Service Select"]');
    if (adhocSelect) {
      adhocSelect.addEventListener('change', (e) => {
        const service = this.adhocServices.find((s) => String(s.adhocServiceId) === e.target.value);
        this.formData.adhocServiceId = e.target.value;
        this.formData['AD-HOC Service'] = service ? service.adhocName : '';
        if (service) this.formData['AD-HOC Sort'] = String(service.adhocVendorPayment);
        this.renderRecordForm();
      });
    }

    grid.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach((el) => {
      const field = el.dataset.field;
      if (['Name', 'Status', 'Route', 'Payment Mode', 'Sort', 'AD-HOC Service Select'].includes(field)) return;
      el.addEventListener('input', (e) => {
        if (field === 'ExtrasTime') {
          const dec = timeStringToDecimalHours(e.target.value);
          this.formData.Extras = dec !== undefined ? dec : '';
        } else {
          this.formData[field] = e.target.value;
        }
      });
    });
  }

  handleFormSubmit(e) {
    e.preventDefault();
    const fd = this.formData;
    if (!fd.Name) { this.showToast('Please select a vendor.', 'error'); return; }
    if (this.modalMode === 'record' && fd.Status === 'Working' && !fd.Route) {
      this.showToast('Route is required when Status is Working.', 'error'); return;
    }
    if (this.modalMode === 'adhoc' && !fd['AD-HOC Service']) {
      this.showToast('Please select an AD-HOC Service.', 'error'); return;
    }

    if (this.editingId) {
      const idx = this.records.findIndex((r) => r.id === this.editingId);
      if (idx !== -1) {
        this.records[idx] = { ...this.records[idx], ...fd, id: this.editingId };
      }
      this.showToast('Record updated.', 'success');
    } else {
      const newRecord = { ...fd, id: this.makeRecordId(), isSubmitted: false };
      if (this.modalMode === 'dayoff') Object.assign(newRecord, { Route: 'OFF', Vehicle: 'NOVEHICLE', Status: 'Off', isDayOff: true, depositId: null, 'Deposit Name': '' });
      this.records.push(newRecord);
      this.recordsByDate.set(this.selectedDate, this.records);
      this.showToast(this.modalMode === 'adhoc' ? 'AD-HOC service added.' : this.modalMode === 'dayoff' ? 'Day off added.' : 'Record added.', 'success');
    }

    this.closeRecordModal();
    this.render();
  }

  /* ==================== TOASTS ==================== */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `app-toast ${type}`;
    const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill';
    toast.innerHTML = `<i class="bi ${icon}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 320);
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new DailyOperationsManagementApp();
  app.setupBlockContainerDelegation();
  window.domApp = app;
});
