/* =====================================================
   Vendor Performance — Logixsphere portal
   Vanilla JS, class-based, mock/simulated data (no backend)
   Ported from Logixsphere Next.js app/(private)/vendor-performance
   Metric formulas ported 1:1 from lib/performance-utils.ts
   Averaging logic ported 1:1 from PerformanceDetailView.tsx
   ===================================================== */

/* ---------- deterministic PRNG helpers (same seed -> same data every render) ---------- */
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

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function minutesToTimeString(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return `${pad2(h)}:${pad2(mm)}`;
}

/* ==================== performance-utils.ts port ==================== */

/** SPR (Stops Per Route) = total paid stops + total unpaid stops. */
function calculateSPR(operation) {
  const paidStops = operation.deliveryDetails.paidStops;
  const unpaidStops = operation.deliveryDetails.unpaidStops;

  const totalPaidStops = paidStops.pu + paidStops.ok + paidStops.hn + (paidStops.pd || 0);
  const totalUnpaidStops = unpaidStops.nr + unpaidStops.fp + unpaidStops.rd +
    unpaidStops.ca + unpaidStops.ba + unpaidStops.nh + unpaidStops.cm;

  return totalPaidStops + totalUnpaidStops;
}

/** SPOR-H (Stops Per Hour). */
function calculateSPORH(operation) {
  const departTime = operation.deliveryDetails.departTime;
  const arriveTime = operation.deliveryDetails.arriveTime;

  if (!departTime || !arriveTime) return 0;

  const departTimeMinutes = parseInt(departTime.split(':')[0], 10) * 60 + parseInt(departTime.split(':')[1], 10);
  const arriveTimeMinutes = parseInt(arriveTime.split(':')[0], 10) * 60 + parseInt(arriveTime.split(':')[1], 10);

  if (isNaN(departTimeMinutes) || isNaN(arriveTimeMinutes)) return 0;

  let workTimeMinutes = arriveTimeMinutes - departTimeMinutes;
  if (workTimeMinutes < 0) workTimeMinutes += 24 * 60;

  const breakMinutes = operation.dailyMetrics.breakMinutes || 0;
  const effectiveWorkMinutes = workTimeMinutes - breakMinutes;

  if (effectiveWorkMinutes <= 0) return 0;

  const totalStops = calculateSPR(operation);
  return (totalStops / effectiveWorkMinutes) * 60;
}

/** AFD (Attempted Failed Deliveries) percentage, with custom rounding rules. */
function calculateAFD(operation) {
  const unpaidStops = operation.deliveryDetails.unpaidStops;

  const totalFailedDeliveries =
    unpaidStops.nr + unpaidStops.fp + unpaidStops.rd + unpaidStops.ca +
    unpaidStops.ba + unpaidStops.nh + unpaidStops.cm;

  const spr = calculateSPR(operation);
  const totalDeliveries = spr + totalFailedDeliveries;

  if (totalDeliveries === 0) return 0;

  const percentage = (totalFailedDeliveries / totalDeliveries) * 100;

  const decimalPart = percentage - Math.floor(percentage);
  const decimalAsInt = Math.round(decimalPart * 100);

  if (decimalAsInt <= 10) {
    return Math.floor(percentage);
  } else {
    return Math.ceil(percentage);
  }
}

/** TW color band, ported from daily-operations-reports's utils.ts getTWColorClass. */
function getTimeWindowClass(percentage) {
  if (percentage >= 90 && percentage <= 100) return 'success';
  if (percentage >= 80 && percentage < 90) return 'warning';
  if (percentage >= 70 && percentage < 80) return 'orange';
  if (percentage < 60) return 'danger';
  return 'neutral';
}

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
function formatMonthYear(year, month) { return `${MONTH_NAMES_LONG[month] || 'Unknown'} ${year}`; }
function formatMonthYearShort(year, month) { return `${MONTH_NAMES_SHORT[month] || '???'}/${year}`; }

/* ==================== calculateAverages — 1:1 port of PerformanceDetailView.tsx useMemo ==================== */
/** Averages a month's daily rows, skipping 'N/A'/'--:--'/zero placeholder values, same as the source app. */
function calculateAverages(monthData) {
  if (!monthData || monthData.length === 0) {
    return { avgTw: '--:--', avgSpr: '--:--', avgSporH: '--:--', avgAfd: '--:--' };
  }
  let totalSporH = 0, countSporH = 0;
  let totalTw = 0, countTw = 0;
  let totalSpr = 0, countSpr = 0;
  let totalAfd = 0, countAfd = 0;

  monthData.forEach((d) => {
    if (d.sporH !== 'N/A' && d.sporH !== '0.0' && d.sporH !== '--:--') {
      const v = parseFloat(d.sporH);
      if (!isNaN(v) && v > 0) { totalSporH += v; countSporH++; }
    }
    if (d.tw !== 'N/A' && d.tw !== '0.0%' && d.tw !== '--:--') {
      const v = parseFloat(String(d.tw).replace('%', ''));
      if (!isNaN(v) && v > 0) { totalTw += v; countTw++; }
    }
    if (d.spr !== 'N/A' && d.spr !== '--:--') {
      const v = typeof d.spr === 'number' ? d.spr : parseFloat(d.spr);
      if (!isNaN(v)) { totalSpr += v; countSpr++; }
    }
    if (d.spr !== 'N/A' && d.spr !== '--:--') {
      try {
        const op = {
          deliveryDetails: {
            totalAfd: 0,
            paidStops: { pu: d.pu ?? 0, ok: d.ok ?? 0, hn: d.hn ?? 0, pd: d.pd ?? 0 },
            unpaidStops: { nr: d.nr ?? 0, fp: d.fp ?? 0, rd: 0, ba: d.ba ?? 0, nh: d.nh ?? 0, cm: d.cm ?? 0, ca: 0 },
            departTime: null,
            arriveTime: null,
          },
          dailyMetrics: { totalStops: 0, sporh: 0, breakMinutes: 0 },
        };
        const afdValue = calculateAFD(op);
        if (!isNaN(afdValue) && afdValue >= 0) { totalAfd += afdValue; countAfd++; }
      } catch (e) { /* ignore */ }
    }
  });

  const avgSporH = countSporH > 0 ? (totalSporH / countSporH).toFixed(1) : '--:--';
  const avgTw = countTw > 0 ? (totalTw / countTw).toFixed(1) : '--:--';
  const avgSpr = countSpr > 0 ? Math.round(totalSpr / countSpr) : '--:--';
  const avgAfd = countAfd > 0 ? Math.round(totalAfd / countAfd) : '--:--';

  return {
    avgTw: avgTw !== '--:--' ? avgTw + '%' : '--:--',
    avgSpr: avgSpr.toString(),
    avgSporH,
    avgAfd: avgAfd !== '--:--' ? avgAfd + '%' : '--:--',
  };
}

/** Averages a set of per-vendor averages (used for the "General" / all-vendors overview). */
function aggregateAverages(list) {
  let totalTw = 0, countTw = 0;
  let totalSpr = 0, countSpr = 0;
  let totalSporH = 0, countSporH = 0;
  let totalAfd = 0, countAfd = 0;

  list.forEach((a) => {
    if (a.avgTw !== '--:--') { totalTw += parseFloat(a.avgTw); countTw++; }
    if (a.avgSpr !== '--:--') { totalSpr += parseFloat(a.avgSpr); countSpr++; }
    if (a.avgSporH !== '--:--') { totalSporH += parseFloat(a.avgSporH); countSporH++; }
    if (a.avgAfd !== '--:--') { totalAfd += parseFloat(a.avgAfd); countAfd++; }
  });

  return {
    avgTw: countTw > 0 ? (totalTw / countTw).toFixed(1) + '%' : '--:--',
    avgSpr: countSpr > 0 ? String(Math.round(totalSpr / countSpr)) : '--:--',
    avgSporH: countSporH > 0 ? (totalSporH / countSporH).toFixed(1) : '--:--',
    avgAfd: countAfd > 0 ? Math.round(totalAfd / countAfd) + '%' : '--:--',
  };
}

/* ==================== KpiDashboardAlt.tsx port (tile helpers) ==================== */
function parsePct(s) {
  if (!s || s === '--:--' || s === 'N/A') return 0;
  const n = parseFloat(String(s).replace('%', '').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function parseNum(s) {
  if (!s || s === '--:--' || s === 'N/A') return 0;
  const n = parseFloat(String(s).replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function barColorTw(value) {
  const p = parsePct(value);
  if (p === 0 && (value === '--:--' || value === 'N/A')) return '#9CA3AF';
  if (p >= 90) return '#22c55e';
  if (p >= 80) return '#eab308';
  return '#ef4444';
}
function barColorSporH(value) {
  const v = parseNum(value);
  if (v === 0 && (value === '--:--' || value === 'N/A')) return '#9CA3AF';
  return v >= 18 ? '#22c55e' : '#ef4444';
}
function barColorNeutral(value) {
  if (!value || value === '--:--' || value === 'N/A') return '#9CA3AF';
  return '#6366f1';
}
function pctTw(v) { return Math.min(100, parsePct(v)); }
function pctSpr(v) { return Math.min(100, (parseNum(v) / 200) * 100); }
function pctSporH(v) { return Math.min(100, (parseNum(v) / 20) * 100); }
function pctAfd(v) { return Math.min(100, parsePct(v)); }

function buildKpiCards(stats, shortLabels) {
  return [
    {
      key: 'tw', label: shortLabels ? 'TW' : 'Avg TW', sublabel: 'Time window', value: stats.avgTw,
      icon: 'bi-clock', barPercent: pctTw(stats.avgTw), barColor: barColorTw(stats.avgTw),
      isNA: !stats.avgTw || stats.avgTw === '--:--', valueClass: '', chartType: 'Gauge',
    },
    {
      key: 'spr', label: shortLabels ? 'SPR' : 'Avg SPR', sublabel: 'Stops per route', value: stats.avgSpr,
      icon: 'bi-signpost-split', barPercent: pctSpr(stats.avgSpr), barColor: barColorNeutral(stats.avgSpr),
      isNA: !stats.avgSpr || stats.avgSpr === '--:--', valueClass: '', chartType: 'Thermometer',
    },
    {
      key: 'sporH', label: shortLabels ? 'SPOR-H' : 'Avg SPOR-H', sublabel: 'Stops per hour', value: stats.avgSporH,
      icon: 'bi-speedometer2', barPercent: pctSporH(stats.avgSporH), barColor: barColorSporH(stats.avgSporH),
      isNA: !stats.avgSporH || stats.avgSporH === '--:--', valueClass: '', chartType: 'Clock',
    },
    {
      key: 'afd', label: shortLabels ? 'AFD' : 'Avg AFD', sublabel: 'Attempted failed deliveries', value: stats.avgAfd,
      icon: 'bi-exclamation-triangle', barPercent: pctAfd(stats.avgAfd), barColor: barColorNeutral(stats.avgAfd),
      isNA: !stats.avgAfd || stats.avgAfd === '--:--', valueClass: 'vp-kpi-afd', chartType: 'Gauge',
    },
  ];
}

/* ==================== MOCK DATA ==================== */
const DEPOT_PREFIX = { LSE: 'LL', LCY: 'DY', MSE: 'MD' };
const DEPOTS = Object.keys(DEPOT_PREFIX);

const FIRST_NAMES = ['James', 'Olivia', 'Daniel', 'Sophia', 'Marcus', 'Amelia', 'Ryan', 'Grace', 'Liam', 'Isabella', 'Noah', 'Chloe', 'Ethan', 'Freya'];
const LAST_NAMES = ['Carter', 'Bennett', 'Hughes', 'Morgan', 'Reid', 'Foster', 'Walsh', 'Whitfield', 'Doyle', 'Nolan', 'Sinclair', 'Pearce', 'Osei', 'Vance'];

const SERVICE_PARTNERS = [
  { id: 1, name: 'Acme Logistics Ltd' },
  { id: 2, name: 'Swift Carriers UK' },
  { id: 3, name: 'Northline Express' },
];

const VENDOR_COUNT = 12;

class VendorPerformanceApp {
  constructor() {
    this.today = new Date();
    this.periodYear = this.today.getFullYear();
    this.periodMonth = this.today.getMonth();

    this.selectedServicePartnerId = '';
    this.selectedVendorId = null;
    this.detailYear = null;
    this.detailMonth = null;
    this.kpiView = 'summary';
    this.vendorSearchTerm = '';
    this.filteredComboVendors = [];

    this.monthDataCache = new Map();

    this.buildMasterData();
    this.init();
  }

  init() {
    this.setupListeners();
    this.renderHeader();
    this.renderFilters();
    this.renderDetail();

    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.remove('active');
    }, 400);
  }

  /* ==================== MOCK MASTER DATA ==================== */
  buildMasterData() {
    this.vendors = Array.from({ length: VENDOR_COUNT }, (_, i) => {
      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = LAST_NAMES[i % LAST_NAMES.length];
      const sp = SERVICE_PARTNERS[i % SERVICE_PARTNERS.length];
      return {
        id: i + 1,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        servicePartnerId: sp.id,
      };
    });

    // Only months that actually have data appear in each vendor's carousel —
    // mirrors useAvailableMonthsForVendor (real API); here it's 3-8 random months
    // out of the trailing 12-month window.
    this.vendorMonths = new Map();
    this.vendors.forEach((v) => {
      const rng = rngForSeed(`vp-months-${v.id}`);
      const allMonths = [];
      for (let i = -11; i <= 0; i++) {
        const d = new Date(this.today.getFullYear(), this.today.getMonth() + i, 1);
        allMonths.push({ year: d.getFullYear(), month: d.getMonth() });
      }
      const count = 3 + Math.floor(rng() * 6); // 3-8 months
      const pool = allMonths.slice();
      const picked = [];
      for (let k = 0; k < count && pool.length > 0; k++) {
        const idx = Math.floor(rng() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
      }
      picked.sort((a, b) => a.year - b.year || a.month - b.month);
      this.vendorMonths.set(v.id, picked);
    });
  }

  getVendorCarouselMonths(vendorId) {
    return this.vendorMonths.get(vendorId) || [];
  }

  getVendorMonthData(vendorId, year, month) {
    const key = `${vendorId}-${year}-${month}`;
    if (!this.monthDataCache.has(key)) {
      this.monthDataCache.set(key, this.generateMonthData(vendorId, year, month));
    }
    return this.monthDataCache.get(key);
  }

  /** Generates weekday daily-performance rows for a vendor/month (stop-code fields ported from daily-operations-reports's mock generator). */
  generateMonthData(vendorId, year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue; // weekends: no operation

      const iso = formatDateISO(d);
      const rng = rngForSeed(`vp-day-${vendorId}-${iso}`);

      if (rng() < 0.12) {
        // ~12% of weekdays are a day off — kept in the table to exercise the
        // '--:--' / N/A display + averaging-skip logic.
        data.push({
          day, dayOfWeek: dow, route: 'N/A',
          pu: 0, ok: 0, hn: 0, pd: 0, nr: 0, fp: 0, ba: 0, nh: 0, cm: 0, ca: 0,
          spr: 'N/A', sporH: 'N/A', tw: 'N/A',
          workedHours: null, departTime: null, arriveTime: null,
        });
        continue;
      }

      const depot = DEPOTS[Math.floor(rng() * DEPOTS.length)];
      const routeNumber = 1 + Math.floor(rng() * 20);
      const routeName = `${DEPOT_PREFIX[depot]}${String(routeNumber).padStart(2, '0')}`;

      const departMinutes = 6 * 60 + Math.floor(rng() * 150); // 06:00-08:30
      const workMinutes = 480 + Math.floor(rng() * 150); // 8h-10.5h
      const breakMinutes = 15 + Math.floor(rng() * 31); // 15-45 min
      const arriveMinutes = departMinutes + workMinutes;
      const departTime = minutesToTimeString(departMinutes);
      const arriveTime = minutesToTimeString(arriveMinutes);

      const totalStops = 70 + Math.floor(rng() * 90); // 70-160
      const failedRatio = rng() * 0.12; // up to 12% failed
      const failedCount = Math.round(totalStops * failedRatio);
      const paidCount = totalStops - failedCount;

      const pu = Math.floor(paidCount * (0.35 + rng() * 0.15));
      const ok = Math.floor(paidCount * (0.3 + rng() * 0.15));
      const hn = Math.max(0, paidCount - pu - ok - Math.floor(paidCount * 0.05));
      const pd = Math.max(0, paidCount - pu - ok - hn);

      let remainingFailed = failedCount;
      const nr = Math.min(remainingFailed, Math.floor(failedCount * 0.25)); remainingFailed -= nr;
      const fp = Math.min(remainingFailed, Math.floor(failedCount * 0.2)); remainingFailed -= fp;
      const ba = Math.min(remainingFailed, Math.floor(failedCount * 0.15)); remainingFailed -= ba;
      const nh = Math.min(remainingFailed, Math.floor(failedCount * 0.2)); remainingFailed -= nh;
      const cm = Math.min(remainingFailed, Math.floor(failedCount * 0.1)); remainingFailed -= cm;
      const ca = Math.max(0, remainingFailed);

      const percentageOnTime = 0.55 + rng() * 0.45;

      const operation = {
        deliveryDetails: {
          totalAfd: failedCount,
          paidStops: { pu, ok, hn, pd },
          unpaidStops: { nr, fp, rd: 0, ba, nh, cm, ca },
          departTime, arriveTime,
        },
        dailyMetrics: { totalStops, sporh: 0, breakMinutes },
      };

      const spr = calculateSPR(operation);
      const sporH = calculateSPORH(operation).toFixed(1);
      const tw = (percentageOnTime * 100).toFixed(1) + '%';
      const workedHours = ((arriveMinutes - departMinutes - breakMinutes) / 60).toFixed(2);

      data.push({
        day, dayOfWeek: dow, route: routeName,
        pu, ok, hn, pd, nr, fp, ba, nh, cm, ca,
        spr, sporH, tw, workedHours, departTime, arriveTime,
      });
    }

    return data;
  }

  getFilteredVendors(servicePartnerId) {
    if (!servicePartnerId) return this.vendors;
    return this.vendors.filter((v) => String(v.servicePartnerId) === String(servicePartnerId));
  }

  computeGeneralStats(year, month, servicePartnerId) {
    const vendors = this.getFilteredVendors(servicePartnerId);
    let vendorsWithData = 0;
    const perVendorAverages = [];

    vendors.forEach((v) => {
      const months = this.vendorMonths.get(v.id) || [];
      const has = months.some((m) => m.year === year && m.month === month);
      if (has) {
        vendorsWithData++;
        const data = this.getVendorMonthData(v.id, year, month);
        perVendorAverages.push(calculateAverages(data));
      }
    });

    return { totalVendors: vendorsWithData, ...aggregateAverages(perVendorAverages) };
  }

  /* ==================== LISTENERS ==================== */
  setupListeners() {
    document.getElementById('servicePartnerSelect').addEventListener('change', (e) => {
      this.selectedServicePartnerId = e.target.value;
      const filtered = this.getFilteredVendors(this.selectedServicePartnerId);
      if (this.selectedVendorId && !filtered.some((v) => v.id === this.selectedVendorId)) {
        this.selectedVendorId = null;
        this.detailYear = null;
        this.detailMonth = null;
      }
      this.renderHeader();
      this.renderFilters();
      this.renderDetail();
    });

    const searchInput = document.getElementById('vendorSearchInput');
    searchInput.addEventListener('focus', () => {
      this.vendorSearchTerm = '';
      searchInput.value = '';
      this.openCombo();
    });
    searchInput.addEventListener('input', (e) => {
      this.vendorSearchTerm = e.target.value;
      this.renderVendorComboList();
      this.openCombo();
    });

    document.getElementById('vendorComboList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-vendor-id]');
      if (!btn) return;
      this.handleVendorChange(parseInt(btn.dataset.vendorId, 10));
      this.closeCombo();
    });

    document.getElementById('vendorComboClear').addEventListener('click', () => {
      this.handleVendorChange(null);
      this.closeCombo();
    });

    document.addEventListener('click', (e) => {
      const combo = document.getElementById('vendorCombo');
      if (combo && !combo.contains(e.target)) this.closeCombo();
    });

    document.getElementById('btnClearFilters').addEventListener('click', () => {
      this.selectedServicePartnerId = '';
      this.selectedVendorId = null;
      this.detailYear = null;
      this.detailMonth = null;
      this.vendorSearchTerm = '';
      this.kpiView = 'summary';
      this.renderHeader();
      this.renderFilters();
      this.renderDetail();
      this.showToast('Filters cleared', 'info');
    });

    document.getElementById('vpDetailContent').addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.vp-kpi-toggle-btn');
      if (toggleBtn) {
        this.kpiView = toggleBtn.dataset.kpiView;
        this.renderDetail();
        return;
      }
      const monthBtn = e.target.closest('[data-year][data-month]');
      if (monthBtn) {
        this.handleMonthSelect(parseInt(monthBtn.dataset.year, 10), parseInt(monthBtn.dataset.month, 10));
      }
    });
  }

  openCombo() {
    document.getElementById('vendorComboList').hidden = false;
  }
  closeCombo() {
    document.getElementById('vendorComboList').hidden = true;
  }

  handleVendorChange(vendorId) {
    this.selectedVendorId = vendorId;
    this.kpiView = 'summary';
    if (vendorId) {
      const months = this.getVendorCarouselMonths(vendorId);
      if (months.length > 0) {
        const last = months[months.length - 1];
        this.detailYear = last.year;
        this.detailMonth = last.month;
      } else {
        this.detailYear = null;
        this.detailMonth = null;
      }
    } else {
      this.detailYear = null;
      this.detailMonth = null;
    }
    this.renderHeader();
    this.renderFilters();
    this.renderDetail();
  }

  handleMonthSelect(year, month) {
    this.detailYear = year;
    this.detailMonth = month;
    this.renderHeader();
    this.renderDetail();
  }

  /* ==================== RENDER ==================== */
  renderHeader() {
    const label = this.selectedVendorId != null && this.detailYear != null
      ? formatMonthYear(this.detailYear, this.detailMonth)
      : formatMonthYear(this.periodYear, this.periodMonth);
    document.getElementById('vpHeaderSubtitle').textContent = label;
    document.getElementById('vpHeaderMetricValue').textContent = String(
      this.getFilteredVendors(this.selectedServicePartnerId).length
    );
  }

  renderFilters() {
    const spSelect = document.getElementById('servicePartnerSelect');
    spSelect.innerHTML = `<option value="">All Service Partners</option>` +
      SERVICE_PARTNERS.map((sp) => `<option value="${sp.id}">${escapeHtml(sp.name)}</option>`).join('');
    spSelect.value = this.selectedServicePartnerId;

    this.filteredComboVendors = this.getFilteredVendors(this.selectedServicePartnerId).slice().sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { sensitivity: 'base' })
    );

    const input = document.getElementById('vendorSearchInput');
    const selected = this.vendors.find((v) => v.id === this.selectedVendorId);
    if (document.activeElement !== input) {
      input.value = selected ? `${selected.firstName} ${selected.lastName}` : '';
    }
    document.getElementById('vendorComboClear').hidden = !this.selectedVendorId;

    this.renderVendorComboList();
  }

  renderVendorComboList() {
    const list = document.getElementById('vendorComboList');
    const term = this.vendorSearchTerm.trim().toLowerCase();
    const vendors = this.filteredComboVendors.filter((v) => {
      if (!term) return true;
      return `${v.firstName} ${v.lastName}`.toLowerCase().includes(term);
    });

    if (vendors.length === 0) {
      list.innerHTML = `<div class="vp-combo-empty">No vendors found</div>`;
      return;
    }

    list.innerHTML = vendors.map((v) => `
      <button type="button" class="vp-combo-option ${v.id === this.selectedVendorId ? 'is-selected' : ''}" data-vendor-id="${v.id}">
        ${escapeHtml(v.firstName)} ${escapeHtml(v.lastName)}
      </button>
    `).join('');
  }

  renderDetail() {
    const container = document.getElementById('vpDetailContent');
    if (this.selectedVendorId == null) {
      container.innerHTML = this.renderGeneralView();
      return;
    }

    const months = this.getVendorCarouselMonths(this.selectedVendorId);
    if (months.length === 0) {
      container.innerHTML = this.renderEmptyState('No records for this vendor', 'This vendor has no performance data in the last 12 months.');
      return;
    }

    container.innerHTML = this.renderDetailView(months);

    const carousel = document.getElementById('vpMonthCarousel');
    const active = carousel && carousel.querySelector('.is-active');
    if (active) active.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
  }

  renderGeneralView() {
    const stats = this.computeGeneralStats(this.periodYear, this.periodMonth, this.selectedServicePartnerId);
    const monthLabel = formatMonthYear(this.periodYear, this.periodMonth);

    return `
      <div class="vp-detail-stack">
        <div class="vp-month-chip-row">
          <span class="vp-month-chip is-active">${monthLabel}</span>
        </div>
        <div class="vp-card">
          <div class="vp-card-header">
            <div>
              <h2 class="vp-card-title">${monthLabel} &ndash; Overview (all vendors)</h2>
              <p class="vp-card-sub">${stats.totalVendors} vendor${stats.totalVendors === 1 ? '' : 's'} with data</p>
            </div>
            ${this.renderKpiToggle()}
          </div>
          ${this.kpiView === 'summary' ? this.renderKpiSummary(stats, false) : this.renderKpiCharts(stats, false)}
        </div>
        <div class="vp-card vp-table-card">
          <div class="vp-card-header vp-card-header--bar"><h2 class="vp-card-title">Daily Breakdown</h2></div>
          <div class="vp-empty-inline">
            <p>Select a vendor above to see daily breakdown by day.</p>
          </div>
        </div>
      </div>
    `;
  }

  renderDetailView(months) {
    const vendor = this.vendors.find((v) => v.id === this.selectedVendorId);
    const year = this.detailYear;
    const month = this.detailMonth;
    const monthData = this.getVendorMonthData(vendor.id, year, month);
    const stats = calculateAverages(monthData);
    const monthLabel = formatMonthYear(year, month);

    return `
      <div class="vp-detail-stack">
        <div class="vp-carousel-wrapper">
          <div class="vp-carousel-scroll" id="vpMonthCarousel" role="listbox" aria-label="Select a month">
            ${months.map((m) => {
              const active = m.year === year && m.month === month;
              return `<button type="button" role="option" aria-selected="${active}" class="vp-month-chip ${active ? 'is-active' : ''}" data-year="${m.year}" data-month="${m.month}">${formatMonthYearShort(m.year, m.month)}</button>`;
            }).join('')}
          </div>
        </div>
        <div class="vp-card">
          <div class="vp-card-header">
            <h2 class="vp-card-title">${escapeHtml(vendor.firstName)} ${escapeHtml(vendor.lastName)} &ndash; ${monthLabel} Performance</h2>
            ${this.renderKpiToggle()}
          </div>
          ${this.kpiView === 'summary' ? this.renderKpiSummary(stats, true) : this.renderKpiCharts(stats, true)}
        </div>
        <div class="vp-card vp-table-card">
          <div class="vp-card-header vp-card-header--bar"><h2 class="vp-card-title">Daily Breakdown</h2></div>
          <div class="vp-table-scroll">
            ${this.renderDailyTable(monthData)}
          </div>
        </div>
      </div>
    `;
  }

  renderKpiToggle() {
    return `
      <div class="vp-kpi-toggle" role="group" aria-label="KPI view">
        <button type="button" class="vp-kpi-toggle-btn ${this.kpiView === 'summary' ? 'is-active' : ''}" data-kpi-view="summary">Summary</button>
        <button type="button" class="vp-kpi-toggle-btn ${this.kpiView === 'charts' ? 'is-active' : ''}" data-kpi-view="charts">Charts</button>
      </div>
    `;
  }

  renderKpiSummary(stats, shortLabels) {
    const cards = buildKpiCards(stats, shortLabels);
    return `
      <div class="vp-kpi-grid" role="region" aria-label="KPIs summary">
        ${cards.map((c) => `
          <div class="vp-kpi-tile">
            <div class="vp-kpi-tile-header">
              <span class="vp-kpi-tile-icon"><i class="bi ${c.icon}"></i></span>
              <span class="vp-kpi-tile-label">${c.label}</span>
            </div>
            <p class="vp-kpi-tile-value ${c.valueClass}">${c.isNA ? '&ndash;' : escapeHtml(c.value)}</p>
            <p class="vp-kpi-tile-sub">${c.sublabel}</p>
            <div class="vp-kpi-tile-bar"><div class="vp-kpi-tile-bar-fill" style="width:${c.barPercent}%;background:${c.barColor}"></div></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /* Simplified stand-in for AnimatedMetricChart's gauge/thermometer/clock visuals:
     a labelled progress bar per metric with a caption naming the original chart type. */
  renderKpiCharts(stats, shortLabels) {
    const cards = buildKpiCards(stats, shortLabels);
    return `
      <div class="vp-chart-grid">
        ${cards.map((c) => `
          <div class="vp-chart-card">
            <div class="vp-chart-card-header">
              <span class="vp-chart-icon"><i class="bi ${c.icon}"></i></span>
              <span class="vp-chart-label">${c.label}</span>
            </div>
            <p class="vp-chart-value ${c.valueClass}">${c.isNA ? '&ndash;' : escapeHtml(c.value)}</p>
            <div class="vp-chart-gauge"><div class="vp-chart-gauge-fill" style="width:${c.barPercent}%;background:${c.barColor}"></div></div>
            <p class="vp-chart-type">${c.chartType}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderDailyTable(monthData) {
    const daysWithData = monthData.filter((d) => !(d.route === 'N/A' && d.spr === 'N/A' && d.sporH === 'N/A' && d.tw === 'N/A'));

    if (daysWithData.length === 0) {
      return `<table class="vp-table"><tbody><tr><td colspan="16" class="vp-table-message">No data available for this month.</td></tr></tbody></table>`;
    }

    const rows = daysWithData.slice().reverse().map((d, idx) => this.renderTableRow(d, idx)).join('');

    return `
      <table class="vp-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Route</th>
            <th title="Not Received">NR</th>
            <th title="Failed Pick">FP</th>
            <th title="Business Address">BA</th>
            <th title="Not Home">NH</th>
            <th title="Customer">CM</th>
            <th title="Closed on Arrival">CA</th>
            <th title="Pick Up">PU</th>
            <th title="OK">OK</th>
            <th title="Home Not">HN</th>
            <th title="Paid">PD</th>
            <th>SPR</th>
            <th>SPOR-H</th>
            <th>TW</th>
            <th>AFD</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  renderTableRow(d, idx) {
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = WEEKDAYS[d.dayOfWeek];
    const isSaturday = d.dayOfWeek === 6;
    const routeClass = d.route === 'N/A' ? 'vp-cell-muted' : '';
    const displayRoute = d.route === 'N/A' ? '--:--' : d.route;

    const sprIsNA = d.spr === 'N/A' || d.spr === '--:--' || d.spr === 0 || d.spr === '0';
    const displaySpr = sprIsNA ? '--:--' : d.spr;

    const sporHIsNA = d.sporH === 'N/A' || d.sporH === '--:--' || d.sporH === '0.0';
    const displaySporH = sporHIsNA ? '--:--' : d.sporH;

    const twIsNA = d.tw === 'N/A' || d.tw === '--:--' || d.tw === '0.0%';
    const displayTw = twIsNA ? '--:--' : d.tw;
    const twBand = twIsNA ? 'neutral' : getTimeWindowClass(parseFloat(d.tw));

    let displayAfd = '--:--';
    let afdClass = 'vp-cell-muted';
    if (!sprIsNA) {
      try {
        const op = {
          deliveryDetails: {
            totalAfd: 0,
            paidStops: { pu: d.pu ?? 0, ok: d.ok ?? 0, hn: d.hn ?? 0, pd: d.pd ?? 0 },
            unpaidStops: { nr: d.nr ?? 0, fp: d.fp ?? 0, rd: 0, ba: d.ba ?? 0, nh: d.nh ?? 0, cm: d.cm ?? 0, ca: d.ca ?? 0 },
            departTime: null, arriveTime: null,
          },
          dailyMetrics: { totalStops: 0, sporh: 0, breakMinutes: 0 },
        };
        const afdValue = calculateAFD(op);
        if (!isNaN(afdValue) && afdValue >= 0) {
          displayAfd = `${afdValue}%`;
          afdClass = 'vp-cell-afd';
        }
      } catch (e) { /* ignore */ }
    }

    const rowClass = idx % 2 === 0 ? '' : '';

    return `
      <tr class="${rowClass}">
        <td><strong class="vp-day-num">${String(d.day).padStart(2, '0')}</strong><span class="vp-day-pill ${isSaturday ? 'is-sat' : ''}">${dayName}</span></td>
        <td class="${routeClass}">${escapeHtml(displayRoute)}</td>
        <td>${d.nr ?? 0}</td>
        <td>${d.fp ?? 0}</td>
        <td>${d.ba ?? 0}</td>
        <td>${d.nh ?? 0}</td>
        <td>${d.cm ?? 0}</td>
        <td>${d.ca ?? 0}</td>
        <td>${d.pu ?? 0}</td>
        <td>${d.ok ?? 0}</td>
        <td>${d.hn ?? 0}</td>
        <td>${d.pd ?? 0}</td>
        <td class="${sprIsNA ? 'vp-cell-muted' : ''}">${escapeHtml(String(displaySpr))}</td>
        <td class="${sporHIsNA ? 'vp-cell-muted' : ''}">${escapeHtml(displaySporH)}</td>
        <td class="vp-tw-${twBand}">${escapeHtml(displayTw)}</td>
        <td class="${afdClass}">${displayAfd}</td>
      </tr>
    `;
  }

  renderEmptyState(title, subtitle) {
    return `<div class="vp-empty-state"><p class="vp-empty-title">${escapeHtml(title)}</p><p class="vp-empty-sub">${escapeHtml(subtitle)}</p></div>`;
  }

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
  const app = new VendorPerformanceApp();
  window.vendorPerformanceApp = app;
});
