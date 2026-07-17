/* =====================================================
   Invoices — Processing Workflow, Deductions & Recharges,
   Schedule for Payment, Invoices History
   ===================================================== */
(function () {
  'use strict';

  const gbp = (v) =>
    '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  /* =====================================================
     MOCK DATA
     ===================================================== */
  const WORKFLOW_STATUSES = ['Current Period', 'Pending Verification', 'Ready for Invoicing', 'Invoiced'];

  const workflowRecords = [
    { id: 'REC-2025001', sub: 'Benjamin Harris', period: 'Mar 2025', amount: 2489.2, status: 'Pending Verification' },
    { id: 'REC-2025002', sub: 'James Anderson', period: 'Jan 2025', amount: 929.1, status: 'Pending Verification' },
    { id: 'REC-2025003', sub: 'Charlotte Walker', period: 'Mar 2025', amount: 643.41, status: 'Ready for Invoicing' },
    { id: 'REC-2025004', sub: 'Alexander Lee', period: 'Jan 2025', amount: 2546.77, status: 'Ready for Invoicing' },
    { id: 'REC-2025005', sub: 'Emma Wilson', period: 'Dec 2024', amount: 1670.29, status: 'Invoiced' },
    { id: 'REC-2025006', sub: 'Maria Garcia', period: 'Mar 2025', amount: 1798.1, status: 'Current Period' },
    { id: 'REC-2025007', sub: 'Maria Garcia', period: 'Dec 2024', amount: 1324.02, status: 'Pending Verification' },
    { id: 'REC-2025008', sub: 'Olivia Taylor', period: 'Mar 2025', amount: 2102.02, status: 'Invoiced' },
    { id: 'REC-2025009', sub: 'Amelia Lewis', period: 'Jan 2025', amount: 2697.66, status: 'Current Period' },
    { id: 'REC-2025010', sub: 'Sarah Brown', period: 'Mar 2025', amount: 3011.18, status: 'Pending Verification' },
    { id: 'REC-2025011', sub: 'Daniel Clark', period: 'Feb 2025', amount: 1877.45, status: 'Pending Verification' },
    { id: 'REC-2025012', sub: 'Michael Davis', period: 'Mar 2025', amount: 2214.9, status: 'Current Period' },
    { id: 'REC-2025013', sub: 'Isabella Jackson', period: 'Feb 2025', amount: 1490.33, status: 'Pending Verification' },
    { id: 'REC-2025014', sub: 'Matthew Moore', period: 'Jan 2025', amount: 2955.08, status: 'Ready for Invoicing' },
    { id: 'REC-2025015', sub: 'John Smith', period: 'Mar 2025', amount: 1102.76, status: 'Pending Verification' },
    { id: 'REC-2025016', sub: 'Sophia Martinez', period: 'Feb 2025', amount: 2381.55, status: 'Pending Verification' },
    { id: 'REC-2025017', sub: 'William Taylor', period: 'Mar 2025', amount: 1755.6, status: 'Ready for Invoicing' },
    { id: 'REC-2025018', sub: 'Emma Wilson', period: 'Jan 2025', amount: 1288.14, status: 'Pending Verification' },
    { id: 'REC-2025019', sub: 'Alexander Wilson', period: 'Feb 2025', amount: 2620.31, status: 'Ready for Invoicing' },
    { id: 'REC-2025020', sub: 'Olivia Martinez', period: 'Mar 2025', amount: 1932.87, status: 'Pending Verification' },
    { id: 'REC-2025021', sub: 'Sarah Walker', period: 'Feb 2025', amount: 3106.44, status: 'Pending Verification' },
    { id: 'REC-2025022', sub: 'David Harris', period: 'Mar 2025', amount: 1667.92, status: 'Current Period' },
    { id: 'REC-2025023', sub: 'Isabella Lee', period: 'Jan 2025', amount: 2450.18, status: 'Pending Verification' },
    { id: 'REC-2025024', sub: 'Benjamin Garcia', period: 'Feb 2025', amount: 1518.73, status: 'Current Period' },
    { id: 'REC-2025025', sub: 'Charlotte Wilson', period: 'Mar 2025', amount: 2033.5, status: 'Ready for Invoicing' },
    { id: 'REC-2025026', sub: 'Daniel Wilson', period: 'Dec 2024', amount: 985.62, status: 'Invoiced' },
    { id: 'REC-2025027', sub: 'Mia Rodriguez', period: 'Jan 2025', amount: 1529.47, status: 'Current Period' },
    { id: 'REC-2025028', sub: 'Amelia Lewis', period: 'Feb 2025', amount: 1442.86, status: 'Current Period' },
    { id: 'REC-2025029', sub: 'Robert Johnson', period: 'Mar 2025', amount: 2240.2, status: 'Pending Verification' },
    { id: 'REC-2025030', sub: 'Amelia Lewis', period: 'Jan 2025', amount: 573.77, status: 'Invoiced' }
  ];

  const DED_CATEGORIES = ['Repairs & Damages', 'Pre-Payments', 'Liquidation Damages', 'Traffic Penalties', 'Other'];

  const deductionRecords = [
    { ref: 'RPD-THBRITO-050325-002', driver: 'PEDRO MONTE', amount: 120.0, desc: '', inst: 2, paid: 0, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'RPD-THBRITO-080325-003', driver: 'JAIME CASSULE', amount: 280.75, desc: '', inst: 4, paid: 2, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'RPD-THBRITO-120325-004', driver: 'EUCLIDES BARROS', amount: 350.0, desc: '', inst: 1, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'RPD-THBRITO-150325-005', driver: 'CLAUDIO LOPES', amount: 85.99, desc: '', inst: 1, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'RPD-THBRITO-180325-006', driver: 'BRUNO RIBEIRO', amount: 175.25, desc: '', inst: 2, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'RPD-THBRITO-220325-007', driver: 'RODRIGO MONTEIRO', amount: 425.0, desc: '', inst: 5, paid: 3, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'RPD-THBRITO-250325-008', driver: 'REINALDO NETO', amount: 160.0, desc: '', inst: 1, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'RPD-THBRITO-110325-010', driver: 'ANDRE SILVA', amount: 295.0, desc: '', inst: 3, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'RPD-THBRITO-170325-011', driver: 'HELIO FERNANDES', amount: 380.0, desc: '', inst: 4, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'RPD-THBRITO-210325-012', driver: 'CARLOS MENDES', amount: 490.0, desc: '', inst: 5, paid: 4, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'RPD-THBRITO-280325-013', driver: 'PEDRO MONTE', amount: 235.5, desc: '', inst: 2, paid: 0, cat: 'Repairs & Damages', month: '2025-03' },
    { ref: 'PRP-THBRITO-030325-002', driver: 'ANDRE SILVA', amount: 750.0, desc: 'Advance payment for March deliveries', inst: 1, paid: 0, cat: 'Pre-Payments', month: '2025-03' },
    { ref: 'PRP-THBRITO-050325-003', driver: 'ROBERTO CARLOS', amount: 920.0, desc: 'Equipment purchase advance', inst: 2, paid: 1, cat: 'Pre-Payments', month: '2025-03' },
    { ref: 'PRP-THBRITO-090325-004', driver: 'CARLOS MENDES', amount: 850.0, desc: 'Fuel card advance', inst: 2, paid: 1, cat: 'Pre-Payments', month: '2025-03' },
    { ref: 'PRP-THBRITO-140325-005', driver: 'BRUNO RIBEIRO', amount: 1100.0, desc: 'Vehicle deposit advance', inst: 3, paid: 1, cat: 'Pre-Payments', month: '2025-03' },
    { ref: 'PRP-THBRITO-190325-006', driver: 'HELIO FERNANDES', amount: 680.0, desc: 'Uniform and PPE advance', inst: 1, paid: 1, cat: 'Pre-Payments', month: '2025-03' },
    { ref: 'PRP-THBRITO-230325-007', driver: 'PEDRO MONTE', amount: 900.0, desc: 'Advance payment for routes', inst: 2, paid: 0, cat: 'Pre-Payments', month: '2025-03' },
    { ref: 'PRP-THBRITO-270325-008', driver: 'JAIME CASSULE', amount: 900.0, desc: 'Maintenance advance', inst: 2, paid: 1, cat: 'Pre-Payments', month: '2025-03' },
    { ref: 'LQD-THBRITO-040325-001', driver: 'RODRIGO MONTEIRO', amount: 620.0, desc: 'Missed delivery window - route 12', inst: 2, paid: 1, cat: 'Liquidation Damages', month: '2025-03' },
    { ref: 'LQD-THBRITO-100325-002', driver: 'EUCLIDES BARROS', amount: 540.0, desc: 'Contract SLA breach', inst: 1, paid: 0, cat: 'Liquidation Damages', month: '2025-03' },
    { ref: 'LQD-THBRITO-160325-003', driver: 'REINALDO NETO', amount: 780.0, desc: 'Failed collection penalty', inst: 3, paid: 1, cat: 'Liquidation Damages', month: '2025-03' },
    { ref: 'LQD-THBRITO-200325-004', driver: 'ANDRE SILVA', amount: 460.0, desc: 'Route abandonment penalty', inst: 1, paid: 1, cat: 'Liquidation Damages', month: '2025-03' },
    { ref: 'LQD-THBRITO-260325-005', driver: 'CARLOS MENDES', amount: 700.0, desc: 'Damaged parcels claim', inst: 2, paid: 0, cat: 'Liquidation Damages', month: '2025-03' },
    { ref: 'TRF-THBRITO-060325-001', driver: 'BRUNO RIBEIRO', amount: 65.0, desc: 'Bus lane violation', inst: 1, paid: 1, cat: 'Traffic Penalties', month: '2025-03' },
    { ref: 'TRF-THBRITO-090325-002', driver: 'PEDRO MONTE', amount: 130.0, desc: 'Parking fine - city centre', inst: 1, paid: 0, cat: 'Traffic Penalties', month: '2025-03' },
    { ref: 'TRF-THBRITO-130325-003', driver: 'HELIO FERNANDES', amount: 100.0, desc: 'Congestion charge', inst: 1, paid: 1, cat: 'Traffic Penalties', month: '2025-03' },
    { ref: 'TRF-THBRITO-180325-004', driver: 'JAIME CASSULE', amount: 65.0, desc: 'Bus lane violation', inst: 1, paid: 0, cat: 'Traffic Penalties', month: '2025-03' },
    { ref: 'TRF-THBRITO-240325-005', driver: 'RODRIGO MONTEIRO', amount: 130.0, desc: 'Speeding fine', inst: 2, paid: 1, cat: 'Traffic Penalties', month: '2025-03' },
    { ref: 'TRF-THBRITO-290325-006', driver: 'EUCLIDES BARROS', amount: 65.0, desc: 'Parking fine', inst: 1, paid: 0, cat: 'Traffic Penalties', month: '2025-03' },
    { ref: 'OTH-THBRITO-220325-005', driver: 'CLAUDIO LOPES', amount: 70.0, desc: 'Vehicle cleaning', inst: 1, paid: 1, cat: 'Other', month: '2025-03' },
    { ref: 'OTH-THBRITO-240325-006', driver: 'BRUNO RIBEIRO', amount: 55.0, desc: 'ID card replacement', inst: 1, paid: 0, cat: 'Other', month: '2025-03' },
    { ref: 'OTH-THBRITO-260325-007', driver: 'REINALDO NETO', amount: 90.0, desc: 'Scanner repair', inst: 1, paid: 1, cat: 'Other', month: '2025-03' },
    { ref: 'OTH-THBRITO-280325-008', driver: 'ANDRE SILVA', amount: 80.0, desc: 'Key replacement', inst: 1, paid: 0, cat: 'Other', month: '2025-03' },
    { ref: 'OTH-THBRITO-300325-009', driver: 'CARLOS MENDES', amount: 65.0, desc: 'Fuel card replacement', inst: 1, paid: 1, cat: 'Other', month: '2025-03' },
    { ref: 'OTH-THBRITO-310325-010', driver: 'PEDRO MONTE', amount: 65.0, desc: 'Locker fee', inst: 1, paid: 0, cat: 'Other', month: '2025-03' },
    { ref: 'RPD-THBRITO-050225-001', driver: 'PEDRO MONTE', amount: 210.0, desc: '', inst: 2, paid: 2, cat: 'Repairs & Damages', month: '2025-02' },
    { ref: 'PRP-THBRITO-100225-001', driver: 'JAIME CASSULE', amount: 500.0, desc: 'February advance', inst: 1, paid: 1, cat: 'Pre-Payments', month: '2025-02' },
    { ref: 'TRF-THBRITO-140225-001', driver: 'BRUNO RIBEIRO', amount: 65.0, desc: 'Bus lane violation', inst: 1, paid: 1, cat: 'Traffic Penalties', month: '2025-02' }
  ];

  const DED_TOTAL_STOPS = 2840; // month stop count for avg-per-stop metric

  const scheduleRecords = [
    { id: 'INV-2025001', sub: 'Charlotte Wilson', period: 'Dec 2024', payDate: '2025-04-17', run: 1, amount: 2219.95, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025002', sub: 'Benjamin Garcia', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 1968.64, deduction: 141.4, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
    { id: 'INV-2025003', sub: 'Amelia Clark', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1873.48, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025004', sub: 'Benjamin Chen', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 1774.28, deduction: 93.74, dedReason: 'Failed Delivery', status: 'Scheduled', hold: false },
    { id: 'INV-2025005', sub: 'Alexander Harris', period: 'Dec 2024', payDate: '2025-04-17', run: 1, amount: 2006.63, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025006', sub: 'William Taylor', period: 'Dec 2024', payDate: '2025-04-17', run: 1, amount: 2897.28, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025007', sub: 'Alexander Wilson', period: 'Dec 2024', payDate: '2025-04-17', run: 1, amount: 2162.95, deduction: 295.35, dedReason: 'Late Delivery', status: 'Scheduled', hold: false },
    { id: 'INV-2025008', sub: 'Olivia Martinez', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1967.22, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025009', sub: 'Isabella Lee', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 2908.77, deduction: 353.21, dedReason: 'Insurance Payment', status: 'Scheduled', hold: false },
    { id: 'INV-2025010', sub: 'Daniel Wilson', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 2012.69, deduction: 192.22, dedReason: 'Late Delivery', status: 'Scheduled', hold: false },
    { id: 'INV-2025011', sub: 'Sarah Walker', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 2999.9, deduction: 415.45, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
    { id: 'INV-2025012', sub: 'Emma Thompson', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 2445.1, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025013', sub: 'James Anderson', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 1893.55, deduction: 120.5, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
    { id: 'INV-2025014', sub: 'Maria Garcia', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 2210.4, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025015', sub: 'Olivia Taylor', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1755.82, deduction: 88.9, dedReason: 'Failed Delivery', status: 'Scheduled', hold: false },
    { id: 'INV-2025016', sub: 'Benjamin Harris', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 2489.2, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025017', sub: 'Charlotte Walker', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 1620.75, deduction: 210.15, dedReason: 'Insurance Payment', status: 'Scheduled', hold: false },
    { id: 'INV-2025018', sub: 'Michael Davis', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 2075.33, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025019', sub: 'Sophia Martinez', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 2330.6, deduction: 175.4, dedReason: 'Late Delivery', status: 'Scheduled', hold: false },
    { id: 'INV-2025020', sub: 'Matthew Moore', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 2955.08, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025021', sub: 'John Smith', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1480.22, deduction: 95.6, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
    { id: 'INV-2025022', sub: 'Isabella Jackson', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 1998.4, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025023', sub: 'Daniel Clark', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 2140.15, deduction: 160.0, dedReason: 'Failed Delivery', status: 'Scheduled', hold: false },
    { id: 'INV-2025024', sub: 'Emma Wilson', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1670.29, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025025', sub: 'Amelia Lewis', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 1442.86, deduction: 75.3, dedReason: 'Late Delivery', status: 'Scheduled', hold: false },
    { id: 'INV-2025026', sub: 'Robert Johnson', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 2240.2, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025027', sub: 'Mia Rodriguez', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1529.47, deduction: 110.85, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
    { id: 'INV-2025028', sub: 'Sarah Brown', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 3011.18, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
    { id: 'INV-2025029', sub: 'Sarah Thomas', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1720.09, deduction: 0, dedReason: '', status: 'Scheduled', hold: true },
    { id: 'INV-2025030', sub: 'David Harris', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 1540.7, deduction: 193.98, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false }
  ];

  const historyRecords = [
    { id: 'INV-2024001', sub: 'Amelia Lewis', amount: 726.22, payDate: '2024-12-30' },
    { id: 'INV-2024002', sub: 'Olivia Taylor', amount: 1457.87, payDate: '2024-12-06' },
    { id: 'INV-2024003', sub: 'Emma Wilson', amount: 465.1, payDate: '2025-02-24' },
    { id: 'INV-2024005', sub: 'Isabella Jackson', amount: 2336.62, payDate: '2025-03-31' },
    { id: 'INV-2024007', sub: 'Emma Wilson', amount: 1497.02, payDate: '2025-01-10' },
    { id: 'INV-2024009', sub: 'Daniel Clark', amount: 1276.9, payDate: '2024-12-18' },
    { id: 'INV-2024012', sub: 'Matthew Moore', amount: 3175.28, payDate: '2025-02-01' },
    { id: 'INV-2024013', sub: 'Emma Wilson', amount: 827.81, payDate: '2024-10-31' },
    { id: 'INV-2024015', sub: 'Isabella Jackson', amount: 409.93, payDate: '2025-02-18' },
    { id: 'INV-2024018', sub: 'Alexander Lee', amount: 2515.63, payDate: '2025-03-09' },
    { id: 'INV-2024020', sub: 'Charlotte Walker', amount: 2552.34, payDate: '2024-12-20' },
    { id: 'INV-2024026', sub: 'John Smith', amount: 2504.07, payDate: '2024-10-20' },
    { id: 'INV-2024027', sub: 'Michael Davis', amount: 532.26, payDate: '2025-01-27' },
    { id: 'INV-2024028', sub: 'Olivia Taylor', amount: 1410.67, payDate: '2024-10-15' },
    { id: 'INV-2024029', sub: 'Sarah Brown', amount: 1618.86, payDate: '2025-01-14' },
    { id: 'INV-2024030', sub: 'Sophia Martinez', amount: 984.51, payDate: '2024-11-22' }
  ];

  /* =====================================================
     SHARED HELPERS
     ===================================================== */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  let toastTimer = null;
  function toast(msg) {
    const el = $('#appToast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function openDetailModal(title, fields) {
    $('#invoiceModalTitle').textContent = title;
    $('#invoiceModalBody').innerHTML =
      '<div class="detail-grid">' +
      fields
        .map(
          ([label, value]) =>
            `<div class="detail-item"><p class="detail-label">${label}</p><p class="detail-value">${value}</p></div>`
        )
        .join('') +
      '</div>';
    bootstrap.Modal.getOrCreateInstance($('#invoiceModal')).show();
  }

  /* =====================================================
     TAB SWITCHING
     ===================================================== */
  function activateView(view) {
    if (!$('#view-' + view)) return;
    $$('.view-tab').forEach((t) => {
      const on = t.dataset.view === view;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.view-panel').forEach((p) => p.classList.remove('active'));
    $('#view-' + view).classList.add('active');
  }

  $$('.view-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activateView(tab.dataset.view);
      history.replaceState(null, '', '#' + tab.dataset.view);
    });
  });

  if (location.hash) activateView(location.hash.slice(1));

  /* =====================================================
     VIEW 1 — PROCESSING WORKFLOW
     ===================================================== */
  let workflowFilter = null; // null = all, or a stage name
  const workflowSelected = new Set();

  const STATUS_CLASS = {
    'Current Period': 'current',
    'Pending Verification': 'pending',
    'Ready for Invoicing': 'ready',
    Invoiced: 'invoiced'
  };

  function workflowActionsFor(rec) {
    const view = `<button class="icon-btn icon-btn--view" data-act="view" data-id="${rec.id}" title="View details"><i class="bi bi-eye"></i></button>`;
    switch (rec.status) {
      case 'Pending Verification':
        return view + `<button class="icon-btn icon-btn--move" data-act="ready" data-id="${rec.id}" title="Mark ready for invoicing"><i class="bi bi-arrow-left-right"></i></button>`;
      case 'Ready for Invoicing':
        return (
          view +
          `<button class="icon-btn icon-btn--invoice" data-act="invoice" data-id="${rec.id}" title="Generate invoice"><i class="bi bi-file-earmark-spreadsheet"></i></button>` +
          `<button class="icon-btn icon-btn--move" data-act="back" data-id="${rec.id}" title="Send back to verification"><i class="bi bi-arrow-left-right"></i></button>`
        );
      case 'Invoiced':
        return (
          view +
          `<button class="icon-btn icon-btn--download" data-act="download" data-id="${rec.id}" title="Download invoice"><i class="bi bi-download"></i></button>` +
          `<button class="icon-btn icon-btn--schedule" data-act="schedule" data-id="${rec.id}" title="Schedule for payment"><i class="bi bi-calendar-plus"></i></button>`
        );
      default:
        return view;
    }
  }

  function renderWorkflow() {
    // Stage cards
    WORKFLOW_STATUSES.forEach((stage) => {
      const card = document.querySelector(`.workflow-stage[data-stage="${stage}"]`);
      const recs = workflowRecords.filter((r) => r.status === stage);
      card.querySelector('[data-count]').textContent = `${recs.length} records`;
      card.querySelector('[data-amount]').textContent = gbp(recs.reduce((s, r) => s + r.amount, 0));
      card.classList.toggle('active', workflowFilter === stage);
    });

    const visible = workflowFilter
      ? workflowRecords.filter((r) => r.status === workflowFilter)
      : workflowRecords;

    const body = $('#workflowBody');
    body.innerHTML = visible.length
      ? visible
          .map(
            (r) => `
        <tr class="${workflowSelected.has(r.id) ? 'row-selected' : ''}">
          <td><input type="checkbox" class="form-check-input row-check" data-id="${r.id}" ${workflowSelected.has(r.id) ? 'checked' : ''} /></td>
          <td class="record-id">${r.id}</td>
          <td>${r.sub}</td>
          <td>${r.period}</td>
          <td class="amount-cell">${gbp(r.amount)}</td>
          <td><span class="status-badge ${STATUS_CLASS[r.status]}">${r.status}</span></td>
          <td>${workflowActionsFor(r)}</td>
        </tr>`
          )
          .join('')
      : '<tr class="empty-row"><td colspan="7">No records in this stage.</td></tr>';

    $('#workflowTotal').textContent = gbp(visible.reduce((s, r) => s + r.amount, 0));
    $('#workflowCount').textContent = `Total: ${visible.length} records`;
    $('#workflowSelectAll').checked = visible.length > 0 && visible.every((r) => workflowSelected.has(r.id));
  }

  // Stage filter (click active card again to clear)
  $$('.workflow-stage').forEach((card) => {
    card.addEventListener('click', () => {
      const stage = card.dataset.stage;
      workflowFilter = workflowFilter === stage ? null : stage;
      renderWorkflow();
    });
  });

  $('#workflowSelectAll').addEventListener('change', (e) => {
    const visible = workflowFilter
      ? workflowRecords.filter((r) => r.status === workflowFilter)
      : workflowRecords;
    visible.forEach((r) => (e.target.checked ? workflowSelected.add(r.id) : workflowSelected.delete(r.id)));
    renderWorkflow();
  });

  $('#workflowBody').addEventListener('change', (e) => {
    const cb = e.target.closest('.row-check');
    if (!cb) return;
    cb.checked ? workflowSelected.add(cb.dataset.id) : workflowSelected.delete(cb.dataset.id);
    renderWorkflow();
  });

  $('#workflowBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    const rec = workflowRecords.find((r) => r.id === btn.dataset.id);
    if (!rec) return;
    switch (btn.dataset.act) {
      case 'view':
        openDetailModal(rec.id, [
          ['Record ID', rec.id],
          ['Subcontractor', rec.sub],
          ['Period', rec.period],
          ['Amount', gbp(rec.amount)],
          ['Status', rec.status]
        ]);
        break;
      case 'ready':
        rec.status = 'Ready for Invoicing';
        toast(`${rec.id} moved to Ready for Invoicing.`);
        renderWorkflow();
        break;
      case 'back':
        rec.status = 'Pending Verification';
        toast(`${rec.id} sent back to Pending Verification.`);
        renderWorkflow();
        break;
      case 'invoice':
        rec.status = 'Invoiced';
        toast(`Invoice generated for ${rec.id}.`);
        renderWorkflow();
        break;
      case 'download':
        toast(`Downloading invoice for ${rec.id}…`);
        break;
      case 'schedule':
        toast(`${rec.id} scheduled for the next payment run.`);
        break;
    }
  });

  $('#btnApplyBatch').addEventListener('click', () => {
    const action = $('#batchAction').value;
    if (!action) return toast('Select a batch action first.');
    if (!workflowSelected.size) return toast('Select at least one record.');
    const map = { verify: 'Pending Verification', ready: 'Ready for Invoicing', invoice: 'Invoiced' };
    workflowRecords.forEach((r) => {
      if (workflowSelected.has(r.id)) r.status = map[action];
    });
    toast(`${workflowSelected.size} record(s) updated to ${map[action]}.`);
    workflowSelected.clear();
    renderWorkflow();
  });

  /* =====================================================
     VIEW 2 — DEDUCTIONS, DISBURSEMENTS & RECHARGES
     ===================================================== */
  const DED_PAGE_SIZE = 25;
  let dedCategory = null; // null = All Categories
  let dedPage = 1;

  function dedBaseSet() {
    const month = $('#dedMonth').value;
    const driver = $('#dedDriver').value;
    return deductionRecords.filter(
      (r) => r.month === month && (!driver || r.driver === driver)
    );
  }

  function renderDeductions() {
    const base = dedBaseSet();

    // Category cards
    const cardsHost = $('#categoryCards');
    const catData = DED_CATEGORIES.map((cat) => {
      const recs = base.filter((r) => r.cat === cat);
      return { cat, count: recs.length, total: recs.reduce((s, r) => s + r.amount, 0) };
    });
    const allTotal = base.reduce((s, r) => s + r.amount, 0);
    cardsHost.innerHTML =
      `<button class="category-card ${dedCategory === null ? 'active' : ''}" data-cat="">
         <span class="category-name">All Categories</span>
         <span class="category-count">${base.length} records</span>
         <span class="category-amount">${gbp(allTotal)}</span>
       </button>` +
      catData
        .map(
          (c) => `
        <button class="category-card ${dedCategory === c.cat ? 'active' : ''}" data-cat="${c.cat}">
          <span class="category-name">${c.cat}</span>
          <span class="category-count">${c.count} records</span>
          <span class="category-amount">${gbp(c.total)}</span>
        </button>`
        )
        .join('');

    const filtered = dedCategory ? base.filter((r) => r.cat === dedCategory) : base;
    const pages = Math.max(1, Math.ceil(filtered.length / DED_PAGE_SIZE));
    if (dedPage > pages) dedPage = pages;
    const pageRecs = filtered.slice((dedPage - 1) * DED_PAGE_SIZE, dedPage * DED_PAGE_SIZE);

    $('#dedBody').innerHTML = pageRecs.length
      ? pageRecs
          .map((r) => {
            const pct = r.inst ? Math.round((r.paid / r.inst) * 100) : 0;
            const pClass = r.paid === 0 ? 'p-none' : r.paid >= r.inst ? 'p-done' : 'p-partial';
            return `
          <tr>
            <td class="record-id">${r.ref}</td>
            <td>${r.driver}</td>
            <td class="amount-cell">${gbp(r.amount)}</td>
            <td>${r.desc || '—'}</td>
            <td>${r.inst}x</td>
            <td>${r.cat}</td>
            <td>
              <div class="progress-wrap">
                <span class="progress-count ${pClass}">${r.paid}/${r.inst}</span>
                <span class="progress-track"><span class="progress-fill ${pClass === 'p-done' ? 'p-done' : ''}" style="width:${pct}%"></span></span>
              </div>
            </td>
          </tr>`;
          })
          .join('')
      : '<tr class="empty-row"><td colspan="7">No records found for the selected filters.</td></tr>';

    const pageTotal = pageRecs.reduce((s, r) => s + r.amount, 0);
    const overallTotal = filtered.reduce((s, r) => s + r.amount, 0);
    $('#dedTotal').textContent = gbp(pageTotal);
    $('#dedAvg').textContent = gbp(pageTotal / DED_TOTAL_STOPS);
    $('#dedOverallTotal').textContent = gbp(overallTotal);
    $('#dedOverallAvg').textContent = gbp(overallTotal / DED_TOTAL_STOPS);
    $('#dedCount').textContent = `Showing ${pageRecs.length} of ${filtered.length} records`;

    // Pagination
    let pagHtml = `<button class="page-btn" data-page="prev" ${dedPage === 1 ? 'disabled' : ''}>&laquo;</button>`;
    for (let p = 1; p <= pages; p++) {
      pagHtml += `<button class="page-btn ${p === dedPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
    pagHtml += `<button class="page-btn" data-page="next" ${dedPage === pages ? 'disabled' : ''}>&raquo;</button>`;
    $('#dedPagination').innerHTML = pages > 1 ? pagHtml : '';
  }

  $('#categoryCards').addEventListener('click', (e) => {
    const card = e.target.closest('.category-card');
    if (!card) return;
    dedCategory = card.dataset.cat || null;
    dedPage = 1;
    renderDeductions();
  });

  $('#dedPagination').addEventListener('click', (e) => {
    const btn = e.target.closest('.page-btn');
    if (!btn || btn.disabled) return;
    const p = btn.dataset.page;
    if (p === 'prev') dedPage -= 1;
    else if (p === 'next') dedPage += 1;
    else dedPage = Number(p);
    renderDeductions();
  });

  $('#btnDedSearch').addEventListener('click', () => {
    dedPage = 1;
    renderDeductions();
  });
  $('#dedMonth').addEventListener('change', () => {
    dedPage = 1;
    renderDeductions();
  });

  $('#btnDedExport').addEventListener('click', () => {
    const base = dedBaseSet();
    const filtered = dedCategory ? base.filter((r) => r.cat === dedCategory) : base;
    const rows = [
      ['Reference', 'Driver', 'Amount', 'Description', 'Instalments', 'Paid', 'Category'],
      ...filtered.map((r) => [r.ref, r.driver, r.amount.toFixed(2), r.desc, r.inst, r.paid, r.cat])
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `deductions-${$('#dedMonth').value}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Export generated.');
  });

  // Populate driver select
  (function populateDrivers() {
    const drivers = [...new Set(deductionRecords.map((r) => r.driver))].sort();
    $('#dedDriver').insertAdjacentHTML(
      'beforeend',
      drivers.map((d) => `<option value="${d}">${d}</option>`).join('')
    );
  })();

  /* =====================================================
     VIEW 3 — SCHEDULE FOR PAYMENT
     ===================================================== */
  const scheduleSelected = new Set();

  function renderSchedule() {
    const pending = scheduleRecords.filter((r) => r.status === 'Scheduled');
    $('#schCount').textContent = pending.length;
    $('#schTotalAmount').textContent = gbp(pending.reduce((s, r) => s + r.amount, 0));
    $('#schTotalDeductions').textContent = gbp(pending.reduce((s, r) => s + r.deduction, 0));
    $('#schNextRun').textContent = pending.length ? '17 April 2025' : '—';

    $('#scheduleBody').innerHTML = scheduleRecords.length
      ? scheduleRecords
          .map((r) => {
            const total = r.amount - r.deduction;
            return `
        <tr class="${scheduleSelected.has(r.id) ? 'row-selected' : ''}">
          <td><input type="checkbox" class="form-check-input row-check" data-id="${r.id}" ${scheduleSelected.has(r.id) ? 'checked' : ''} /></td>
          <td class="record-id">${r.id}${r.hold ? '<span class="hold-flag">[ON HOLD]</span>' : ''}</td>
          <td>${r.sub}</td>
          <td>${r.period}</td>
          <td>${fmtDate(r.payDate)}<span class="run-tag">Run #${r.run}</span></td>
          <td class="amount-cell">${gbp(r.amount)}</td>
          <td class="amount-cell">${gbp(r.deduction)}${r.dedReason ? `<span class="deduction-tag">${r.dedReason}</span>` : ''}</td>
          <td class="amount-cell">${gbp(total)}</td>
          <td><span class="status-badge ${r.status === 'Paid' ? 'paid' : 'scheduled'}">${r.status}</span></td>
          <td>${
            r.status === 'Scheduled'
              ? `<button class="icon-btn icon-btn--paid" data-act="pay" data-id="${r.id}" title="Mark as paid"><i class="bi bi-check2"></i></button>`
              : `<button class="icon-btn icon-btn--view" data-act="view" data-id="${r.id}" title="View details"><i class="bi bi-eye"></i></button>`
          }</td>
        </tr>`;
          })
          .join('')
      : '<tr class="empty-row"><td colspan="10">No payments scheduled.</td></tr>';

    $('#schTotAmount').textContent = gbp(scheduleRecords.reduce((s, r) => s + r.amount, 0));
    $('#schTotDeductions').textContent = gbp(scheduleRecords.reduce((s, r) => s + r.deduction, 0));
    $('#schTotPayment').textContent = gbp(scheduleRecords.reduce((s, r) => s + r.amount - r.deduction, 0));
    $('#scheduleCount').textContent = `Total: ${scheduleRecords.length} records`;
    $('#scheduleSelectAll').checked =
      scheduleRecords.length > 0 && scheduleRecords.every((r) => scheduleSelected.has(r.id));
  }

  $('#scheduleSelectAll').addEventListener('change', (e) => {
    scheduleRecords.forEach((r) => (e.target.checked ? scheduleSelected.add(r.id) : scheduleSelected.delete(r.id)));
    renderSchedule();
  });

  $('#scheduleBody').addEventListener('change', (e) => {
    const cb = e.target.closest('.row-check');
    if (!cb) return;
    cb.checked ? scheduleSelected.add(cb.dataset.id) : scheduleSelected.delete(cb.dataset.id);
    renderSchedule();
  });

  $('#scheduleBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    const rec = scheduleRecords.find((r) => r.id === btn.dataset.id);
    if (!rec) return;
    if (btn.dataset.act === 'pay') {
      rec.status = 'Paid';
      toast(`${rec.id} marked as paid.`);
      renderSchedule();
    } else {
      openDetailModal(rec.id, [
        ['Invoice ID', rec.id],
        ['Subcontractor', rec.sub],
        ['Period', rec.period],
        ['Payment Date', fmtDate(rec.payDate)],
        ['Amount', gbp(rec.amount)],
        ['Deductions', gbp(rec.deduction)],
        ['Total Payment', gbp(rec.amount - rec.deduction)],
        ['Status', rec.status]
      ]);
    }
  });

  $('#btnMarkPaid').addEventListener('click', () => {
    if (!scheduleSelected.size) return toast('Select at least one invoice.');
    let n = 0;
    scheduleRecords.forEach((r) => {
      if (scheduleSelected.has(r.id) && r.status === 'Scheduled') {
        r.status = 'Paid';
        n++;
      }
    });
    scheduleSelected.clear();
    toast(`${n} invoice(s) marked as paid.`);
    renderSchedule();
  });

  /* =====================================================
     VIEW 4 — INVOICES HISTORY
     ===================================================== */
  function renderHistory() {
    const from = $('#histFrom').value;
    const to = $('#histTo').value;
    const sub = $('#histSub').value;

    const filtered = historyRecords.filter(
      (r) => (!from || r.payDate >= from) && (!to || r.payDate <= to) && (!sub || r.sub === sub)
    );

    $('#historyBody').innerHTML = filtered.length
      ? filtered
          .map(
            (r) => `
        <tr>
          <td class="record-id">${r.id}</td>
          <td>${r.sub}</td>
          <td class="amount-cell">${gbp(r.amount)}</td>
          <td>${fmtDate(r.payDate)}</td>
          <td>
            <button class="icon-btn icon-btn--view" data-act="view" data-id="${r.id}" title="View invoice"><i class="bi bi-eye"></i></button>
            <button class="icon-btn icon-btn--print" data-act="print" data-id="${r.id}" title="Print invoice"><i class="bi bi-printer"></i></button>
          </td>
        </tr>`
          )
          .join('')
      : '<tr class="empty-row"><td colspan="5">No invoices found for the selected period.</td></tr>';

    $('#historyCount').textContent = `Showing ${filtered.length} of ${historyRecords.length} records`;
    $('#historyTotal').textContent = gbp(filtered.reduce((s, r) => s + r.amount, 0));
  }

  $('#btnHistSearch').addEventListener('click', renderHistory);

  $('#historyBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    const rec = historyRecords.find((r) => r.id === btn.dataset.id);
    if (!rec) return;
    if (btn.dataset.act === 'view') {
      openDetailModal(rec.id, [
        ['Invoice Number', rec.id],
        ['Subcontractor', rec.sub],
        ['Amount', gbp(rec.amount)],
        ['Payment Date', fmtDate(rec.payDate)]
      ]);
    } else {
      toast(`Sending ${rec.id} to printer…`);
    }
  });

  // Populate subcontractor select
  (function populateSubs() {
    const subs = [...new Set(historyRecords.map((r) => r.sub))].sort();
    $('#histSub').insertAdjacentHTML(
      'beforeend',
      subs.map((s) => `<option value="${s}">${s}</option>`).join('')
    );
  })();

  /* =====================================================
     INIT
     ===================================================== */
  renderWorkflow();
  renderDeductions();
  renderSchedule();
  renderHistory();

  window.addEventListener('load', () => {
    setTimeout(() => $('#loadingOverlay').classList.add('hidden'), 350);
  });
})();
