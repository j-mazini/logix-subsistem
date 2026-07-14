/* =====================================================
   Assets Management — Logixsphere portal
   Vanilla JS, class-based, mock/simulated data (no backend)
   Real add/edit/delete against an in-memory store.
   ===================================================== */

/* ---------- small deterministic PRNG helpers ---------- */
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

class AssetsApp {
  constructor() {
    this.activeTab = 'vendor-types';

    this.search = {
      vendorTypes: '',
      userTypes: '',
      costModels: '',
      vehicleTypes: '',
      managementTeam: '',
      adhocCategories: '',
    };

    this.editing = {
      vendorType: null,
      userType: null,
      costModel: null,
      vehicleType: null,
      managementTeam: null,
      adhocCategory: null,
    };

    this.pendingDelete = null; // { type, id }

    this.buildMasterData();
    this.buildMockData();
    this.init();
  }

  /* ==================== INIT ==================== */
  init() {
    this.populateModalSelects();
    this.setupListeners();
    this.renderAll();

    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.remove('active');
    }, 400);
  }

  /* ==================== SUPPORT / REFERENCE DATA ==================== */
  buildMasterData() {
    this.deposits = [
      { depositId: 1, depositName: 'London North Depot' },
      { depositId: 2, depositName: 'Birmingham Central Depot' },
      { depositId: 3, depositName: 'Manchester Depot' },
      { depositId: 4, depositName: 'Leeds Depot' },
      { depositId: 5, depositName: 'Bristol Depot' },
    ];

    this.servicePartners = [
      { servicePartnerId: 1, partnerName: 'Swift Logistics' },
      { servicePartnerId: 2, partnerName: 'Kent Express' },
      { servicePartnerId: 3, partnerName: 'Medway Movers' },
    ];

    this.customers = [
      { customerId: 1, customerName: 'DHL eCommerce' },
      { customerId: 2, customerName: 'DHL Parcel UK' },
      { customerId: 3, customerName: 'DHL Express' },
    ];

    const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca'];
    const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Murphy'];
    this.users = Array.from({ length: 10 }, (_, i) => ({
      id: 1000 + i,
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[(i * 3) % lastNames.length],
    }));
  }

  getDepositName(id) {
    const d = this.deposits.find((x) => x.depositId === Number(id));
    return d ? d.depositName : `Deposit ${id}`;
  }
  getUserName(id) {
    const u = this.users.find((x) => x.id === Number(id));
    return u ? `${u.firstName} ${u.lastName}` : `User ${id}`;
  }
  getServicePartnerName(id) {
    const sp = this.servicePartners.find((x) => x.servicePartnerId === Number(id));
    return sp ? sp.partnerName : `Service Partner ${id}`;
  }
  getCustomerName(id) {
    const c = this.customers.find((x) => x.customerId === Number(id));
    return c ? c.customerName : `Customer ${id}`;
  }

  /* ==================== MOCK DATA (6 tabs) ==================== */
  buildMockData() {
    const now = Date.now();
    const daysAgo = (n) => new Date(now - n * 86400000).toISOString();

    // 1. Vendor Types
    const vendorTypeNames = ['Owner Driver', 'Multi-Drop', 'Courier Partner', 'Van Owner', 'Fleet Operator', 'Bike Courier', 'Subcontractor'];
    this.vendorTypeSeq = 100;
    this.vendorTypes = vendorTypeNames.map((name, i) => ({
      vendorTypeId: this.vendorTypeSeq++,
      nameType: name,
      createdBy: 'system',
      createdAt: daysAgo(200 - i * 5),
      updatedAt: i % 3 === 0 ? daysAgo(10 + i) : null,
    }));

    // 2. User Types
    const userTypeNames = ['Admin', 'Supervisor', 'Driver', 'Vendor', 'Dispatcher', 'Finance'];
    this.userTypeSeq = 200;
    this.userTypes = userTypeNames.map((name) => ({
      userTypeId: this.userTypeSeq++,
      nameType: name,
    }));

    // 3. Cost Models (edit-only in this page)
    const costModelDefs = [
      { name: 'Per Drop', description: 'Rate per delivered stop, tiered by volume.', paymentMethod: 'Invoice', isAdhocCategory: false, customerId: 1 },
      { name: 'Per Mile', description: 'Flat rate per mile driven on route.', paymentMethod: 'Invoice', isAdhocCategory: false, customerId: 2 },
      { name: 'Per Hour', description: 'Hourly rate for time-based routes.', paymentMethod: 'Prepaid', isAdhocCategory: false, customerId: null },
      { name: 'Flat Rate Ad-hoc', description: 'Fixed fee for one-off adhoc works.', paymentMethod: 'Invoice', isAdhocCategory: true, customerId: 3 },
      { name: 'Fuel Surcharge', description: 'Percentage surcharge applied on top of base rate.', paymentMethod: 'Invoice', isAdhocCategory: false, customerId: null },
      { name: 'Weekend Premium', description: 'Additional premium for Saturday/Sunday routes.', paymentMethod: 'Prepaid', isAdhocCategory: false, customerId: 1 },
    ];
    this.costModelSeq = 300;
    this.costModels = costModelDefs.map((def, i) => ({
      costModelId: this.costModelSeq++,
      ...def,
      createdBy: 'system',
      createdAt: daysAgo(180 - i * 8),
      updatedAt: null,
    }));

    // 4. Vehicle Types
    const vehicleTypeNames = ['Van', 'Truck 3.5t', 'Bike', 'Car', 'Box Van 7.5t', 'Articulated Lorry', 'Motorbike'];
    this.vehicleTypeSeq = 400;
    this.vehicleTypes = vehicleTypeNames.map((name, i) => ({
      vehicleTypeId: this.vehicleTypeSeq++,
      typeName: name,
      createdBy: 'system',
      createdAt: daysAgo(220 - i * 6),
      updatedAt: i % 4 === 0 ? daysAgo(15 + i) : null,
    }));

    // 5. Management & Support Team Functions
    const rng = rngForSeed('am-management-team-v1');
    const functionNames = ['Fleet Manager', 'Ops Supervisor', 'Route Planner', 'Compliance Officer', 'Customer Service Lead', 'Depot Coordinator'];
    this.managementTeamSeq = 500;
    this.managementTeam = functionNames.map((name, i) => {
      const hasSp = rng() > 0.4;
      return {
        managementTeamFunctionId: this.managementTeamSeq++,
        functionName: name,
        depositId: this.deposits[i % this.deposits.length].depositId,
        userId: this.users[i % this.users.length].id,
        servicePartnerId: hasSp ? this.servicePartners[i % this.servicePartners.length].servicePartnerId : null,
        createdBy: 'system',
        createdAt: daysAgo(150 - i * 7),
        updatedAt: null,
      };
    });

    // 6. Adhoc Categories
    const categoryDefs = [
      { name: 'Operational', description: 'Day-to-day operational adhoc works.', active: true },
      { name: 'Customer Requested', description: 'Adhoc works requested directly by the customer.', active: true },
      { name: 'Compliance', description: 'Works required to satisfy compliance obligations.', active: true },
      { name: 'Weather Related', description: 'Adhoc works triggered by adverse weather.', active: true },
      { name: 'Equipment Failure', description: 'Works related to equipment or vehicle failure.', active: false },
      { name: 'Special Project', description: 'One-off works tied to a special project.', active: true },
    ];
    this.adhocCategorySeq = 600;
    this.adhocCategories = categoryDefs.map((def, i) => ({
      adhocCategoriesId: this.adhocCategorySeq++,
      ...def,
      createdBy: 'system',
      createdAt: daysAgo(120 - i * 4),
      updatedAt: null,
    }));
  }

  /* ==================== SELECT OPTIONS ==================== */
  populateModalSelects() {
    const depositSel = document.getElementById('managementTeamDeposit');
    this.deposits.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = String(d.depositId);
      opt.textContent = d.depositName;
      depositSel.appendChild(opt);
    });

    const userSel = document.getElementById('managementTeamUser');
    this.users.forEach((u) => {
      const opt = document.createElement('option');
      opt.value = String(u.id);
      opt.textContent = `${u.firstName} ${u.lastName}`;
      userSel.appendChild(opt);
    });

    const spSel = document.getElementById('managementTeamServicePartner');
    this.servicePartners.forEach((sp) => {
      const opt = document.createElement('option');
      opt.value = String(sp.servicePartnerId);
      opt.textContent = sp.partnerName;
      spSel.appendChild(opt);
    });
  }

  /* ==================== LISTENERS ==================== */
  setupListeners() {
    document.querySelectorAll('.am-tab').forEach((btn) => {
      btn.addEventListener('click', () => this.setTab(btn.dataset.tab));
    });

    // Search inputs
    document.getElementById('searchVendorTypes').addEventListener('input', (e) => { this.search.vendorTypes = e.target.value; this.renderVendorTypes(); });
    document.getElementById('searchUserTypes').addEventListener('input', (e) => { this.search.userTypes = e.target.value; this.renderUserTypes(); });
    document.getElementById('searchCostModels').addEventListener('input', (e) => { this.search.costModels = e.target.value; this.renderCostModels(); });
    document.getElementById('searchVehicleTypes').addEventListener('input', (e) => { this.search.vehicleTypes = e.target.value; this.renderVehicleTypes(); });
    document.getElementById('searchManagementTeam').addEventListener('input', (e) => { this.search.managementTeam = e.target.value; this.renderManagementTeam(); });
    document.getElementById('searchAdhocCategories').addEventListener('input', (e) => { this.search.adhocCategories = e.target.value; this.renderAdhocCategories(); });

    // Clear buttons
    document.getElementById('btnClearVendorTypes').addEventListener('click', () => { this.search.vendorTypes = ''; document.getElementById('searchVendorTypes').value = ''; this.renderVendorTypes(); });
    document.getElementById('btnClearUserTypes').addEventListener('click', () => { this.search.userTypes = ''; document.getElementById('searchUserTypes').value = ''; this.renderUserTypes(); });
    document.getElementById('btnClearCostModels').addEventListener('click', () => { this.search.costModels = ''; document.getElementById('searchCostModels').value = ''; this.renderCostModels(); });
    document.getElementById('btnClearVehicleTypes').addEventListener('click', () => { this.search.vehicleTypes = ''; document.getElementById('searchVehicleTypes').value = ''; this.renderVehicleTypes(); });
    document.getElementById('btnClearManagementTeam').addEventListener('click', () => { this.search.managementTeam = ''; document.getElementById('searchManagementTeam').value = ''; this.renderManagementTeam(); });
    document.getElementById('btnClearAdhocCategories').addEventListener('click', () => { this.search.adhocCategories = ''; document.getElementById('searchAdhocCategories').value = ''; this.renderAdhocCategories(); });

    // Add buttons
    document.getElementById('btnAddVendorType').addEventListener('click', () => this.openVendorTypeModal(null));
    document.getElementById('btnAddUserType').addEventListener('click', () => this.openUserTypeModal(null));
    document.getElementById('btnAddVehicleType').addEventListener('click', () => this.openVehicleTypeModal(null));
    document.getElementById('btnAddManagementTeam').addEventListener('click', () => this.openManagementTeamModal(null));
    document.getElementById('btnAddAdhocCategory').addEventListener('click', () => this.openAdhocCategoryModal(null));
    // Note: Cost Models tab has no "Add" button, matching the source (`showAddButton={false}`).

    // List click delegation (edit / delete)
    document.getElementById('listVendorTypes').addEventListener('click', (e) => this.handleListClick(e, 'vendorType'));
    document.getElementById('listUserTypes').addEventListener('click', (e) => this.handleListClick(e, 'userType'));
    document.getElementById('listCostModels').addEventListener('click', (e) => this.handleListClick(e, 'costModel'));
    document.getElementById('listVehicleTypes').addEventListener('click', (e) => this.handleListClick(e, 'vehicleType'));
    document.getElementById('listManagementTeam').addEventListener('click', (e) => this.handleListClick(e, 'managementTeam'));
    document.getElementById('listAdhocCategories').addEventListener('click', (e) => this.handleListClick(e, 'adhocCategory'));

    // Modal close (generic)
    document.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', () => this.closeModal(el.dataset.closeModal));
    });
    document.querySelectorAll('.am-modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeModal(backdrop.id);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
    });

    // Forms
    document.getElementById('vendorTypeForm').addEventListener('submit', (e) => this.submitVendorType(e));
    document.getElementById('userTypeForm').addEventListener('submit', (e) => this.submitUserType(e));
    document.getElementById('costModelForm').addEventListener('submit', (e) => this.submitCostModel(e));
    document.getElementById('vehicleTypeForm').addEventListener('submit', (e) => this.submitVehicleType(e));
    document.getElementById('managementTeamForm').addEventListener('submit', (e) => this.submitManagementTeam(e));
    document.getElementById('adhocCategoryForm').addEventListener('submit', (e) => this.submitAdhocCategory(e));

    // Confirm delete
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());
  }

  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.am-tab').forEach((btn) => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
    document.getElementById('panelVendorTypes').hidden = tab !== 'vendor-types';
    document.getElementById('panelUserTypes').hidden = tab !== 'user-types';
    document.getElementById('panelCostModels').hidden = tab !== 'cost-models';
    document.getElementById('panelVehicleTypes').hidden = tab !== 'vehicle-types';
    document.getElementById('panelManagementTeam').hidden = tab !== 'management-team';
    document.getElementById('panelAdhocCategories').hidden = tab !== 'adhoc-categories';
  }

  handleListClick(e, type) {
    const editBtn = e.target.closest('[data-edit-id]');
    if (editBtn) {
      const id = Number(editBtn.dataset.editId);
      this.openEditModalFor(type, id);
      return;
    }
    const deleteBtn = e.target.closest('[data-delete-id]');
    if (deleteBtn) {
      const id = Number(deleteBtn.dataset.deleteId);
      this.requestDelete(type, id);
    }
  }

  openEditModalFor(type, id) {
    if (type === 'vendorType') this.openVendorTypeModal(this.vendorTypes.find((v) => v.vendorTypeId === id));
    if (type === 'userType') this.openUserTypeModal(this.userTypes.find((v) => v.userTypeId === id));
    if (type === 'costModel') this.openCostModelModal(this.costModels.find((v) => v.costModelId === id));
    if (type === 'vehicleType') this.openVehicleTypeModal(this.vehicleTypes.find((v) => v.vehicleTypeId === id));
    if (type === 'managementTeam') this.openManagementTeamModal(this.managementTeam.find((v) => v.managementTeamFunctionId === id));
    if (type === 'adhocCategory') this.openAdhocCategoryModal(this.adhocCategories.find((v) => v.adhocCategoriesId === id));
  }

  /* ==================== MODAL GENERIC HELPERS ==================== */
  openModal(id) { document.getElementById(id).hidden = false; }
  closeModal(id) { document.getElementById(id).hidden = true; }
  closeAllModals() {
    document.querySelectorAll('.am-modal-backdrop').forEach((el) => { el.hidden = true; });
  }

  renderInfoBox(elId, item) {
    const box = document.getElementById(elId);
    if (!item || (!item.createdBy && !item.createdAt && !item.updatedAt)) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    box.hidden = false;
    const rows = [];
    if (item.createdBy) rows.push(`<div class="am-info-box-row"><strong>Created by:</strong> ${escapeHtml(item.createdBy)}</div>`);
    if (item.createdAt) rows.push(`<div class="am-info-box-row"><strong>Created at:</strong> ${escapeHtml(formatDate(item.createdAt))}</div>`);
    if (item.updatedAt) rows.push(`<div class="am-info-box-row"><strong>Updated at:</strong> ${escapeHtml(formatDate(item.updatedAt))}</div>`);
    box.innerHTML = `<p class="am-info-box-title">Additional Information</p>${rows.join('')}`;
  }

  /* ==================== VENDOR TYPES ==================== */
  filteredVendorTypes() {
    const q = this.search.vendorTypes.trim().toLowerCase();
    if (!q) return this.vendorTypes;
    return this.vendorTypes.filter((v) => (v.nameType || '').toLowerCase().includes(q));
  }

  renderVendorTypes() {
    const rows = this.filteredVendorTypes();
    const list = document.getElementById('listVendorTypes');
    if (rows.length === 0) {
      list.innerHTML = this.emptyStateHtml('🏢', 'No vendor types found', 'Try adjusting the search or creating a new vendor type.');
      return;
    }
    list.innerHTML = rows.map((v) => `
      <div class="am-card am-card--blue">
        <div class="am-card-body">
          <h3 class="am-card-title">${escapeHtml(v.nameType || `Vendor Type ${v.vendorTypeId}`)}</h3>
          <div class="am-card-meta"><span><i class="bi bi-hash"></i>ID: ${v.vendorTypeId}</span></div>
          ${(v.createdAt || v.updatedAt) ? `<div class="am-card-footnote">${v.createdAt ? `<span>Created: ${escapeHtml(formatDate(v.createdAt))}</span>` : ''}${v.updatedAt ? `<span>Updated: ${escapeHtml(formatDate(v.updatedAt))}</span>` : ''}</div>` : ''}
        </div>
        <div class="am-card-actions">
          <button type="button" class="am-icon-btn" data-edit-id="${v.vendorTypeId}" title="Edit vendor type"><i class="bi bi-pencil"></i></button>
        </div>
      </div>
    `).join('');
  }

  openVendorTypeModal(vendorType) {
    this.editing.vendorType = vendorType || null;
    document.getElementById('vendorTypeModalTitle').textContent = vendorType ? 'Edit Vendor Type' : 'Create Vendor Type';
    document.getElementById('vendorTypeSubmitBtn').textContent = vendorType ? 'Update Vendor Type' : 'Create Vendor Type';
    document.getElementById('vendorTypeName').value = vendorType ? (vendorType.nameType || '') : '';
    this.renderInfoBox('vendorTypeInfoBox', vendorType);
    this.openModal('vendorTypeModalBackdrop');
  }

  submitVendorType(e) {
    e.preventDefault();
    const nameType = document.getElementById('vendorTypeName').value.trim();
    if (!nameType) { alert('Type name is required'); return; }
    const editing = this.editing.vendorType;
    if (editing) {
      editing.nameType = nameType;
      editing.updatedAt = new Date().toISOString();
      this.showToast('Vendor type updated successfully.', 'success');
    } else {
      this.vendorTypes.push({
        vendorTypeId: this.vendorTypeSeq++,
        nameType,
        createdBy: 'you',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      });
      this.showToast('Vendor type created successfully.', 'success');
    }
    this.closeModal('vendorTypeModalBackdrop');
    this.renderVendorTypes();
  }

  /* ==================== USER TYPES ==================== */
  filteredUserTypes() {
    const q = this.search.userTypes.trim().toLowerCase();
    if (!q) return this.userTypes;
    return this.userTypes.filter((v) => (v.nameType || '').toLowerCase().includes(q));
  }

  renderUserTypes() {
    const rows = this.filteredUserTypes();
    const list = document.getElementById('listUserTypes');
    if (rows.length === 0) {
      list.innerHTML = this.emptyStateHtml('👤', 'No user types found', 'Try adjusting the search or creating a new user type.');
      return;
    }
    list.innerHTML = rows.map((v) => `
      <div class="am-card am-card--green">
        <div class="am-card-body">
          <h3 class="am-card-title">${escapeHtml(v.nameType || `User Type ${v.userTypeId}`)}</h3>
          <div class="am-card-meta"><span><i class="bi bi-hash"></i>ID: ${v.userTypeId}</span></div>
        </div>
        <div class="am-card-actions">
          <button type="button" class="am-icon-btn" data-edit-id="${v.userTypeId}" title="Edit user type"><i class="bi bi-pencil"></i></button>
        </div>
      </div>
    `).join('');
  }

  openUserTypeModal(userType) {
    this.editing.userType = userType || null;
    document.getElementById('userTypeModalTitle').textContent = userType ? 'Edit User Type' : 'Create User Type';
    document.getElementById('userTypeSubmitBtn').textContent = userType ? 'Update User Type' : 'Create User Type';
    document.getElementById('userTypeName').value = userType ? (userType.nameType || '') : '';
    this.openModal('userTypeModalBackdrop');
  }

  submitUserType(e) {
    e.preventDefault();
    const nameType = document.getElementById('userTypeName').value.trim();
    if (!nameType) { alert('Name type is required'); return; }
    const editing = this.editing.userType;
    if (editing) {
      editing.nameType = nameType;
      this.showToast('User type updated successfully.', 'success');
    } else {
      this.userTypes.push({ userTypeId: this.userTypeSeq++, nameType });
      this.showToast('User type created successfully.', 'success');
    }
    this.closeModal('userTypeModalBackdrop');
    this.renderUserTypes();
  }

  /* ==================== COST MODELS (edit-only) ==================== */
  filteredCostModels() {
    const q = this.search.costModels.trim().toLowerCase();
    if (!q) return this.costModels;
    return this.costModels.filter((v) => (v.name || '').toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q));
  }

  renderCostModels() {
    const rows = this.filteredCostModels();
    const list = document.getElementById('listCostModels');
    if (rows.length === 0) {
      list.innerHTML = this.emptyStateHtml('💰', 'No cost models found', 'Try adjusting the search.');
      return;
    }
    list.innerHTML = rows.map((c) => `
      <div class="am-card am-card--amber">
        <div class="am-card-body">
          <h3 class="am-card-title">${escapeHtml(c.name || 'Unnamed')} ${c.isAdhocCategory ? '<span class="am-badge">Ad-Hoc</span>' : ''}</h3>
          <div class="am-card-block">
            <p class="am-card-block-label">Formula</p>
            <p class="am-card-block-value">${c.description && c.description.trim() ? escapeHtml(c.description) : '—'}</p>
          </div>
          <div class="am-card-block">
            <p class="am-card-block-label">Payment Method</p>
            <p class="am-card-block-value">${c.paymentMethod && c.paymentMethod.trim() ? escapeHtml(c.paymentMethod) : '—'}</p>
          </div>
          ${c.createdAt ? `<div class="am-card-footnote"><span>Created: ${escapeHtml(formatDate(c.createdAt))}</span></div>` : ''}
        </div>
        <div class="am-card-actions">
          <button type="button" class="am-icon-btn" data-edit-id="${c.costModelId}" title="Edit cost model"><i class="bi bi-pencil"></i></button>
        </div>
      </div>
    `).join('');
  }

  openCostModelModal(costModel) {
    // Assets page mirrors the source behaviour: cost models are edit-only here
    // (the "Add Cost Model" button is intentionally omitted, matching showAddButton=false).
    if (!costModel) return;
    this.editing.costModel = costModel;
    const box = document.getElementById('costModelReadonlyBox');
    box.innerHTML = `
      <p class="am-info-box-title">Cost Model (read-only)</p>
      <div class="am-info-box-row"><strong>Name:</strong> ${escapeHtml(costModel.name ?? '—')}</div>
      ${costModel.customerId != null ? `<div class="am-info-box-row"><strong>Customer:</strong> ${escapeHtml(this.getCustomerName(costModel.customerId))}</div>` : ''}
      ${costModel.isAdhocCategory ? `<div class="am-info-box-row"><strong>Ad-Hoc Category:</strong> Yes</div>` : ''}
    `;
    document.getElementById('costModelDescription').value = costModel.description || '';
    document.getElementById('costModelPaymentMethod').value = costModel.paymentMethod || '';
    this.renderInfoBox('costModelInfoBox', costModel);
    this.openModal('costModelModalBackdrop');
  }

  submitCostModel(e) {
    e.preventDefault();
    const editing = this.editing.costModel;
    if (!editing) return;
    editing.description = document.getElementById('costModelDescription').value.trim() || undefined;
    editing.paymentMethod = document.getElementById('costModelPaymentMethod').value.trim() || undefined;
    editing.updatedAt = new Date().toISOString();
    this.showToast('Cost model updated successfully.', 'success');
    this.closeModal('costModelModalBackdrop');
    this.renderCostModels();
  }

  /* ==================== VEHICLE TYPES ==================== */
  filteredVehicleTypes() {
    const q = this.search.vehicleTypes.trim().toLowerCase();
    if (!q) return this.vehicleTypes;
    return this.vehicleTypes.filter((v) => (v.typeName || '').toLowerCase().includes(q));
  }

  renderVehicleTypes() {
    const rows = this.filteredVehicleTypes();
    const list = document.getElementById('listVehicleTypes');
    if (rows.length === 0) {
      list.innerHTML = this.emptyStateHtml('🚛', 'No vehicle types found', 'Try adjusting the search or creating a new vehicle type.');
      return;
    }
    list.innerHTML = rows.map((v) => `
      <div class="am-card am-card--indigo">
        <div class="am-card-body">
          <h3 class="am-card-title">${escapeHtml(v.typeName || `Vehicle Type ${v.vehicleTypeId}`)}</h3>
          <div class="am-card-meta"><span><i class="bi bi-hash"></i>ID: ${v.vehicleTypeId}</span></div>
          ${(v.createdAt || v.updatedAt) ? `<div class="am-card-footnote">${v.createdAt ? `<span>Created: ${escapeHtml(formatDate(v.createdAt))}</span>` : ''}${v.updatedAt ? `<span>Updated: ${escapeHtml(formatDate(v.updatedAt))}</span>` : ''}</div>` : ''}
        </div>
        <div class="am-card-actions">
          <button type="button" class="am-icon-btn" data-edit-id="${v.vehicleTypeId}" title="Edit vehicle type"><i class="bi bi-pencil"></i></button>
        </div>
      </div>
    `).join('');
  }

  openVehicleTypeModal(vehicleType) {
    this.editing.vehicleType = vehicleType || null;
    document.getElementById('vehicleTypeModalTitle').textContent = vehicleType ? 'Edit Vehicle Type' : 'Create Vehicle Type';
    document.getElementById('vehicleTypeSubmitBtn').textContent = vehicleType ? 'Update Vehicle Type' : 'Create Vehicle Type';
    document.getElementById('vehicleTypeName').value = vehicleType ? (vehicleType.typeName || '') : '';
    this.renderInfoBox('vehicleTypeInfoBox', vehicleType);
    this.openModal('vehicleTypeModalBackdrop');
  }

  submitVehicleType(e) {
    e.preventDefault();
    const typeName = document.getElementById('vehicleTypeName').value.trim();
    if (!typeName) { alert('Type name is required'); return; }
    const editing = this.editing.vehicleType;
    if (editing) {
      editing.typeName = typeName;
      editing.updatedAt = new Date().toISOString();
      this.showToast('Vehicle type updated successfully.', 'success');
    } else {
      this.vehicleTypes.push({
        vehicleTypeId: this.vehicleTypeSeq++,
        typeName,
        createdBy: 'you',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      });
      this.showToast('Vehicle type created successfully.', 'success');
    }
    this.closeModal('vehicleTypeModalBackdrop');
    this.renderVehicleTypes();
  }

  /* ==================== MANAGEMENT & SUPPORT TEAM ==================== */
  filteredManagementTeam() {
    const q = this.search.managementTeam.trim().toLowerCase();
    if (!q) return this.managementTeam;
    return this.managementTeam.filter((item) => {
      const haystack = [
        item.functionName,
        this.getDepositName(item.depositId),
        this.getUserName(item.userId),
        item.servicePartnerId ? this.getServicePartnerName(item.servicePartnerId) : '',
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  renderManagementTeam() {
    const rows = this.filteredManagementTeam();
    const list = document.getElementById('listManagementTeam');
    if (rows.length === 0) {
      list.innerHTML = this.emptyStateHtml('👥', 'No management team functions found', 'Try adjusting the search or creating a new one.');
      return;
    }
    list.innerHTML = rows.map((item) => `
      <div class="am-card am-card--red">
        <div class="am-card-body">
          <h3 class="am-card-title">${escapeHtml(item.functionName || `Function ${item.managementTeamFunctionId}`)}</h3>
          <div class="am-card-meta">
            <span><i class="bi bi-hash"></i>ID: ${item.managementTeamFunctionId}</span>
            ${item.depositId ? `<span><i class="bi bi-building"></i>Deposit: ${escapeHtml(this.getDepositName(item.depositId))}</span>` : ''}
            ${item.userId ? `<span><i class="bi bi-person"></i>Vendor: ${escapeHtml(this.getUserName(item.userId))}</span>` : ''}
            ${item.servicePartnerId ? `<span><i class="bi bi-briefcase"></i>Service Partner: ${escapeHtml(this.getServicePartnerName(item.servicePartnerId))}</span>` : ''}
          </div>
        </div>
        <div class="am-card-actions">
          <button type="button" class="am-icon-btn" data-edit-id="${item.managementTeamFunctionId}" title="Edit"><i class="bi bi-pencil"></i></button>
          <button type="button" class="am-icon-btn danger" data-delete-id="${item.managementTeamFunctionId}" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    `).join('');
  }

  openManagementTeamModal(item) {
    this.editing.managementTeam = item || null;
    document.getElementById('managementTeamModalTitle').textContent = item ? 'Edit Management Team Function' : 'Create Management Team Function';
    document.getElementById('managementTeamSubmitBtn').textContent = item ? 'Update' : 'Create';
    document.getElementById('managementTeamFunctionName').value = item ? (item.functionName || '') : '';
    document.getElementById('managementTeamDeposit').value = item && item.depositId != null ? String(item.depositId) : '';
    document.getElementById('managementTeamUser').value = item && item.userId != null ? String(item.userId) : '';
    document.getElementById('managementTeamServicePartner').value = item && item.servicePartnerId != null ? String(item.servicePartnerId) : '';
    this.renderInfoBox('managementTeamInfoBox', item);
    this.openModal('managementTeamModalBackdrop');
  }

  submitManagementTeam(e) {
    e.preventDefault();
    const functionName = document.getElementById('managementTeamFunctionName').value.trim();
    const depositId = document.getElementById('managementTeamDeposit').value;
    const userId = document.getElementById('managementTeamUser').value;
    const servicePartnerId = document.getElementById('managementTeamServicePartner').value;
    if (!functionName || !depositId || !userId) {
      alert('Function name, deposit and user are required');
      return;
    }
    const editing = this.editing.managementTeam;
    if (editing) {
      editing.functionName = functionName;
      editing.depositId = Number(depositId);
      editing.userId = Number(userId);
      editing.servicePartnerId = servicePartnerId ? Number(servicePartnerId) : null;
      editing.updatedAt = new Date().toISOString();
      this.showToast('Management team function updated successfully.', 'success');
    } else {
      this.managementTeam.push({
        managementTeamFunctionId: this.managementTeamSeq++,
        functionName,
        depositId: Number(depositId),
        userId: Number(userId),
        servicePartnerId: servicePartnerId ? Number(servicePartnerId) : null,
        createdBy: 'you',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      });
      this.showToast('Management team function created successfully.', 'success');
    }
    this.closeModal('managementTeamModalBackdrop');
    this.renderManagementTeam();
  }

  /* ==================== ADHOC CATEGORIES ==================== */
  filteredAdhocCategories() {
    const q = this.search.adhocCategories.trim().toLowerCase();
    if (!q) return this.adhocCategories;
    return this.adhocCategories.filter((c) => (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  }

  renderAdhocCategories() {
    const rows = this.filteredAdhocCategories();
    const list = document.getElementById('listAdhocCategories');
    if (rows.length === 0) {
      list.innerHTML = this.emptyStateHtml('🏷️', 'No adhoc categories found', 'Try adjusting the search or creating a new adhoc category.');
      return;
    }
    list.innerHTML = rows.map((c) => `
      <div class="am-card am-card--purple">
        <div class="am-card-body">
          <h3 class="am-card-title">${escapeHtml(c.name || `Category ${c.adhocCategoriesId}`)} <span class="am-badge ${c.active ? 'active' : 'inactive'}">${c.active ? 'Active' : 'Inactive'}</span></h3>
          ${c.description ? `<p class="am-card-sub">${escapeHtml(c.description)}</p>` : ''}
          <div class="am-card-meta"><span><i class="bi bi-hash"></i>ID: ${c.adhocCategoriesId}</span></div>
        </div>
        <div class="am-card-actions">
          <button type="button" class="am-icon-btn" data-edit-id="${c.adhocCategoriesId}" title="Edit"><i class="bi bi-pencil"></i></button>
          <button type="button" class="am-icon-btn danger" data-delete-id="${c.adhocCategoriesId}" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    `).join('');
  }

  openAdhocCategoryModal(item) {
    this.editing.adhocCategory = item || null;
    document.getElementById('adhocCategoryModalTitle').textContent = item ? 'Edit Adhoc Category' : 'Create Adhoc Category';
    document.getElementById('adhocCategorySubmitBtn').textContent = item ? 'Update Category' : 'Create Category';
    document.getElementById('adhocCategoryName').value = item ? (item.name || '') : '';
    document.getElementById('adhocCategoryDescription').value = item ? (item.description || '') : '';
    document.getElementById('adhocCategoryActive').checked = item ? item.active !== false : true;
    this.renderInfoBox('adhocCategoryInfoBox', item);
    this.openModal('adhocCategoryModalBackdrop');
  }

  submitAdhocCategory(e) {
    e.preventDefault();
    const name = document.getElementById('adhocCategoryName').value.trim();
    if (!name) { alert('Name is required'); return; }
    const description = document.getElementById('adhocCategoryDescription').value.trim();
    const active = document.getElementById('adhocCategoryActive').checked;
    const editing = this.editing.adhocCategory;
    if (editing) {
      editing.name = name;
      editing.description = description || undefined;
      editing.active = active;
      editing.updatedAt = new Date().toISOString();
      this.showToast('Adhoc category updated successfully.', 'success');
    } else {
      this.adhocCategories.push({
        adhocCategoriesId: this.adhocCategorySeq++,
        name,
        description: description || undefined,
        active,
        createdBy: 'you',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      });
      this.showToast('Adhoc category created successfully.', 'success');
    }
    this.closeModal('adhocCategoryModalBackdrop');
    this.renderAdhocCategories();
  }

  /* ==================== DELETE (Management Team + Adhoc Categories only,
     matching the source's ConfirmDeleteModal usage) ==================== */
  requestDelete(type, id) {
    this.pendingDelete = { type, id };
    const messages = {
      managementTeam: 'Are you sure you want to delete this management team function? This action cannot be undone.',
      adhocCategory: 'Are you sure you want to delete this category? This action cannot be undone and will affect associated services.',
    };
    const titles = {
      managementTeam: 'Delete Management Team Function',
      adhocCategory: 'Delete Adhoc Category',
    };
    document.getElementById('confirmDeleteTitle').textContent = titles[type] || 'Delete Item';
    document.getElementById('confirmDeleteMessage').textContent = messages[type] || 'Are you sure you want to delete this item?';
    this.openModal('confirmDeleteModalBackdrop');
  }

  confirmDelete() {
    if (!this.pendingDelete) return;
    const { type, id } = this.pendingDelete;
    if (type === 'managementTeam') {
      this.managementTeam = this.managementTeam.filter((x) => x.managementTeamFunctionId !== id);
      this.renderManagementTeam();
      this.showToast('Management team function deleted.', 'success');
    } else if (type === 'adhocCategory') {
      this.adhocCategories = this.adhocCategories.filter((x) => x.adhocCategoriesId !== id);
      this.renderAdhocCategories();
      this.showToast('Adhoc category deleted.', 'success');
    }
    this.pendingDelete = null;
    this.closeModal('confirmDeleteModalBackdrop');
  }

  /* ==================== SHARED RENDER HELPERS ==================== */
  emptyStateHtml(icon, title, subtitle) {
    return `<div class="am-empty-state"><span class="am-empty-icon">${icon}</span><p class="am-empty-title">${escapeHtml(title)}</p><p class="am-empty-text">${escapeHtml(subtitle)}</p></div>`;
  }

  renderAll() {
    this.renderVendorTypes();
    this.renderUserTypes();
    this.renderCostModels();
    this.renderVehicleTypes();
    this.renderManagementTeam();
    this.renderAdhocCategories();
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
  const app = new AssetsApp();
  window.assetsApp = app;
});
