/**
 * Manifesto de demonstração para o Route Balancer.
 * Gera um .xlsx em memória (SheetJS) com o formato real esperado pelo
 * pipeline (título na linha 1, header na linha 2, dados a partir da linha 3)
 * e injeta no fluxo normal via fileInput + evento change — o processamento,
 * preview e download passam pelo código de produção sem atalhos.
 */
(function () {
  'use strict';

  var AREAS = ['RM1 2', 'RM3 4', 'RM3 8', 'RM4 3', 'RM4 4', 'RM6 2', 'RM6 5', 'RM6 8', 'RM7 1', 'RM8 0', 'RM8 6', 'RM9 4', 'RM9 9'];
  var STREETS = ['Market Street', 'Park Lane', 'New Road', 'Bridge Street', 'George Street', 'High Street', 'Manor Road', 'Green Lane', 'Queen Street', 'School Lane', 'Victoria Street', 'Station Road'];
  var NAMES = ['Harrow Trading Ltd', 'M. Okafor', 'Bright & Sons', 'Casa do Bacalhau', 'L. Fernandes', 'Riverside Pharmacy', 'The Print Yard', 'K. Szymanska', 'Dagenham Motors', 'Petals & Stems', 'J. Whitfield', 'Ilford Foods', 'A. Devi', 'Crown Upholstery', 'S. McAllister'];
  var SUFFIX = ['AE', 'QR', 'GD', 'WP', 'HZ', 'XK', 'GY', 'UL', 'TD', 'KL', 'RY', 'ES', 'PD', 'JU'];
  /* Produtos: C/T/K/X/Y/1/Q entram no Pre-12; D/P/N são serviço normal */
  var PRODUCTS = ['C', 'T', 'K', 'X', 'Y', '1', 'Q', 'D', 'D', 'P', 'N', 'D'];
  var SIZES = ['COY', 'COY', 'COY', 'COY-S1', 'COY-S2', 'FLY', 'FLY', 'NCY', 'PAL 1'];

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildRows() {
    var rnd = mulberry32(20260710);
    var pick = function (arr) { return arr[Math.floor(rnd() * arr.length)]; };
    var rows = [];
    for (var i = 0; i < 150; i++) {
      var area = pick(AREAS);
      var pc = area + pick(SUFFIX);
      var addr = (2 + Math.floor(rnd() * 190)) + ' ' + pick(STREETS);
      rows.push({
        name: rnd() < 0.05 ? '' : pick(NAMES),                    /* alguns sem nome → "SEM NOME n" */
        pc: pc,
        addr: addr,
        product: pick(PRODUCTS),
        booking: rnd() < 0.08 ? 'P' : '',                         /* ~8% pickups, fora da contagem de deliveries */
        size: pick(SIZES),
        phys: Math.round((0.4 + rnd() * 22) * 100) / 100,
        pieces: 1 + Math.floor(rnd() * 4)
      });
      /* ~6% de endereços duplicados para exercitar a deduplicação */
      if (rnd() < 0.06) {
        var dup = rows[rows.length - 1];
        rows.push({ name: dup.name, pc: dup.pc, addr: dup.addr, product: pick(PRODUCTS), booking: '', size: pick(SIZES), phys: 1.2, pieces: 1 });
      }
    }
    return rows;
  }

  function buildMockFile() {
    var rows = buildRows();
    var aoa = [
      ['DHL — MSE depot manifest (demo)'],
      ['Name.1', 'Postal Code', 'Address', 'Product', 'Booking type', 'Size Class', 'Phys.', 'Total Pieces']
    ];
    rows.forEach(function (r) {
      aoa.push([r.name, r.pc, r.addr, r.product, r.booking, r.size, r.phys, r.pieces]);
    });
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Manifest');
    var out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new File([out], 'demo-manifesto-MSE.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function init() {
    var btn = document.getElementById('btnMockManifest');
    var fileInput = document.getElementById('fileInput');
    var btnProcess = document.getElementById('btnProcess');
    if (!btn || !fileInput || !btnProcess || typeof XLSX === 'undefined') return;
    btn.addEventListener('click', function () {
      var dt = new DataTransfer();
      dt.items.add(buildMockFile());
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      /* processa em seguida, quando o app já habilitou o botão */
      setTimeout(function () { if (!btnProcess.disabled) btnProcess.click(); }, 80);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
