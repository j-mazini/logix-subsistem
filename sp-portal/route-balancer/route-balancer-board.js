/**
 * Quadro de balanceamento de rotas — cards conectados.
 * Ouve 'rb:results' do core (dfPostcodes) e monta cards por rota ligados por
 * um traço de rota pontilhado (SVG). Subpostcodes são fichas que se movem por
 * drag-and-drop OU por clique (pegar → escolher rota destino). Duas rotas
 * podem ser comparadas lado a lado, com sugestão do melhor movimento único
 * para equilibrá-las. Exporta o split para .xlsx via SheetJS.
 */
(function () {
  'use strict';

  var ROUTE_POOL = ['MD7A', 'MD7B', 'MD7C', 'MD7D', 'MD7E', 'MD7X', 'MD7Q', 'MD9A'];
  var state = {
    items: [],          // [{sub, count}]
    routeCount: 4,
    assign: {},         // sub -> route index
    picked: null,       // sub da ficha "na mão" (click-to-move)
    compare: []         // até 2 índices de rota
  };
  var wrap = null;

  /* ---------- distribuição ---------- */
  function rebalance() {
    var totals = new Array(state.routeCount).fill(0);
    state.assign = {};
    state.items.slice().sort(function (a, b) { return b.count - a.count; }).forEach(function (it) {
      var min = 0;
      for (var i = 1; i < state.routeCount; i++) if (totals[i] < totals[min]) min = i;
      state.assign[it.sub] = min;
      totals[min] += it.count;
    });
  }

  function routeTotals() {
    var totals = new Array(state.routeCount).fill(0);
    state.items.forEach(function (it) {
      var r = state.assign[it.sub];
      if (r != null && r < state.routeCount) totals[r] += it.count;
    });
    return totals;
  }

  function itemsOf(r) {
    return state.items
      .filter(function (it) { return state.assign[it.sub] === r; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function grandTotal() {
    return state.items.reduce(function (s, it) { return s + it.count; }, 0);
  }

  /* desvio vs. alvo: verde ±8%, âmbar ±18%, vermelho além */
  function paceClass(total, target) {
    if (!target) return 'ok';
    var d = Math.abs(total - target) / target;
    if (d <= 0.08) return 'ok';
    if (d <= 0.18) return 'warn';
    return 'over';
  }

  /* melhor movimento único para aproximar duas rotas */
  function bestMove(a, b) {
    var totals = routeTotals();
    var heavy = totals[a] >= totals[b] ? a : b;
    var light = heavy === a ? b : a;
    var diff = totals[heavy] - totals[light];
    if (diff <= 1) return null;
    var best = null;
    itemsOf(heavy).forEach(function (it) {
      var after = Math.abs(diff - 2 * it.count);
      if (after < diff && (!best || after < best.after)) best = { sub: it.sub, count: it.count, from: heavy, to: light, after: after };
    });
    return best;
  }

  /* ---------- render ---------- */
  function esc(v) {
    return String(v).replace(/[&<>'"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c];
    });
  }

  function compareHtml(totals, target) {
    if (state.compare.length !== 2) return '';
    var a = state.compare[0], b = state.compare[1];
    var diff = totals[a] - totals[b];
    var move = bestMove(a, b);
    var sides = [a, b].map(function (r) {
      var pace = paceClass(totals[r], target);
      return '<div class="rb-compare-side rb-compare-side--' + pace + '">' +
        '<span class="rb-compare-route">' + esc(ROUTE_POOL[r]) + '</span>' +
        '<span class="rb-compare-total">' + totals[r] + '</span>' +
        '<span class="rb-compare-areas">' + itemsOf(r).length + ' áreas</span>' +
      '</div>';
    }).join('<div class="rb-compare-vs">vs</div>');
    var verdict;
    if (move) {
      verdict = '<div class="rb-compare-suggest">' +
        '<span>Δ ' + Math.abs(diff) + ' — mover <strong>' + esc(move.sub) + '</strong> (' + move.count + ') de ' +
        esc(ROUTE_POOL[move.from]) + ' para ' + esc(ROUTE_POOL[move.to]) + ' reduz para Δ ' + move.after + '</span>' +
        '<button type="button" class="rb-board-btn rb-board-btn--amber" id="rbApplyMove" data-sub="' + esc(move.sub) + '" data-to="' + move.to + '">Aplicar</button>' +
      '</div>';
    } else {
      verdict = '<div class="rb-compare-suggest"><span>Δ ' + Math.abs(diff) + ' — rotas equilibradas, nenhum movimento melhora.</span></div>';
    }
    return '<div class="rb-compare">' + sides + verdict + '</div>';
  }

  function render() {
    if (!wrap) return;
    var totals = routeTotals();
    var target = state.routeCount ? Math.round(grandTotal() / state.routeCount) : 0;

    var pickedIt = state.picked ? state.items.find(function (i) { return i.sub === state.picked; }) : null;
    var hint = pickedIt
      ? 'A mover <strong>' + esc(pickedIt.sub) + '</strong> (' + pickedIt.count + ') — clique na rota de destino, ou na ficha para cancelar.'
      : 'Arraste uma ficha — ou clique nela e depois na rota de destino. Alvo por rota: <strong>' + target + '</strong> deliveries. Use ⇄ para comparar duas rotas.';

    var head =
      '<div class="rb-board-head">' +
        '<div>' +
          '<p class="rb-board-title"><i class="bi bi-arrows-move" aria-hidden="true"></i> Balancear rotas</p>' +
          '<p class="rb-board-hint" id="rbBoardHint">' + hint + '</p>' +
        '</div>' +
        '<div class="rb-board-controls">' +
          '<label class="rb-board-count">Rotas ' +
            '<select id="rbRouteCount">' +
              [2, 3, 4, 5, 6, 7, 8].map(function (n) {
                return '<option value="' + n + '"' + (n === state.routeCount ? ' selected' : '') + '>' + n + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
          '<button type="button" class="rb-board-btn" id="rbRebalance"><i class="bi bi-stars" aria-hidden="true"></i> Rebalancear</button>' +
          '<button type="button" class="rb-board-btn" id="rbExport"><i class="bi bi-download" aria-hidden="true"></i> Exportar .xlsx</button>' +
        '</div>' +
      '</div>';

    var cols = '';
    for (var r = 0; r < state.routeCount; r++) {
      var chips = itemsOf(r).map(function (it) {
        var picked = state.picked === it.sub;
        return '<li class="rb-chip' + (picked ? ' is-picked' : '') + '" draggable="true" tabindex="0" role="button" ' +
          'data-sub="' + esc(it.sub) + '" aria-pressed="' + picked + '" title="Arraste ou clique para mover">' +
          '<span class="rb-chip-sub">' + esc(it.sub) + '</span>' +
          '<span class="rb-chip-count">' + it.count + '</span>' +
        '</li>';
      }).join('');
      var pace = paceClass(totals[r], target);
      var comparing = state.compare.indexOf(r) !== -1;
      var receivable = pickedIt && state.assign[pickedIt.sub] !== r;
      cols +=
        '<section class="rb-route-col' + (comparing ? ' is-compared' : '') + (receivable ? ' is-receivable' : '') + '" data-route="' + r + '" aria-label="' + esc(ROUTE_POOL[r]) + '">' +
          '<header class="rb-route-col-head rb-route-col-head--' + pace + '">' +
            '<span class="rb-route-name">' + esc(ROUTE_POOL[r]) + '</span>' +
            '<span class="rb-route-head-right">' +
              '<span class="rb-route-total">' + totals[r] + '<small>/' + target + '</small></span>' +
              '<button type="button" class="rb-route-compare-btn' + (comparing ? ' is-on' : '') + '" data-compare="' + r + '" title="Comparar esta rota" aria-pressed="' + comparing + '">&#8644;</button>' +
            '</span>' +
          '</header>' +
          '<div class="rb-route-meter"><span class="rb-route-meter-fill rb-route-meter-fill--' + pace + '" style="width:' +
            Math.min(100, target ? Math.round((totals[r] / (target * 1.5)) * 100) : 0) + '%"></span></div>' +
          (receivable ? '<button type="button" class="rb-route-receive" data-receive="' + r + '">Receber ' + esc(pickedIt.sub) + ' aqui</button>' : '') +
          '<ul class="rb-route-list">' + chips + '</ul>' +
        '</section>';
    }

    wrap.innerHTML = head + compareHtml(totals, target) +
      '<div class="rb-board-grid-wrap"><svg class="rb-board-links" aria-hidden="true"></svg>' +
      '<div class="rb-board-grid">' + cols + '</div></div>';
    bind();
    requestAnimationFrame(drawLinks);
  }

  /* ---------- conexões entre cards (traço de rota) ---------- */
  function drawLinks(highlightRoute) {
    var gridWrap = wrap.querySelector('.rb-board-grid-wrap');
    var svg = wrap.querySelector('.rb-board-links');
    if (!gridWrap || !svg) return;
    var cards = [].slice.call(wrap.querySelectorAll('.rb-route-col'));
    var base = gridWrap.getBoundingClientRect();
    svg.setAttribute('width', base.width);
    svg.setAttribute('height', base.height);
    svg.setAttribute('viewBox', '0 0 ' + base.width + ' ' + base.height);
    var paths = '';
    for (var i = 0; i < cards.length - 1; i++) {
      var a = cards[i].getBoundingClientRect();
      var b = cards[i + 1].getBoundingClientRect();
      var hl = highlightRoute != null && (i === highlightRoute - 1 || i === highlightRoute);
      var d;
      if (b.left >= a.right - 2) {
        /* mesmo "vagão": liga a lateral dos headers */
        var y1 = a.top - base.top + 26, y2 = b.top - base.top + 26;
        var x1 = a.right - base.left, x2 = b.left - base.left;
        var mx = (x1 + x2) / 2;
        d = 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2;
      } else {
        /* quebra de linha: desce do card e sobe no próximo */
        var xs = a.left - base.left + a.width / 2, ys = a.bottom - base.top;
        var xe = b.left - base.left + b.width / 2, ye = b.top - base.top;
        var my = (ys + ye) / 2;
        d = 'M' + xs + ',' + ys + ' C' + xs + ',' + my + ' ' + xe + ',' + my + ' ' + xe + ',' + ye;
      }
      paths += '<path d="' + d + '" class="rb-link' + (hl ? ' rb-link--hot' : '') + '" />';
    }
    svg.innerHTML = paths;
  }

  /* ---------- interação ---------- */
  var draggingSub = null;

  function moveSub(sub, to) {
    state.assign[sub] = to;
    state.picked = null;
    render();
  }

  function bind() {
    var count = document.getElementById('rbRouteCount');
    if (count) count.addEventListener('change', function () {
      state.routeCount = Math.max(2, Math.min(8, Number(count.value) || 4));
      state.compare = state.compare.filter(function (r) { return r < state.routeCount; });
      state.picked = null;
      rebalance();
      render();
    });
    var reb = document.getElementById('rbRebalance');
    if (reb) reb.addEventListener('click', function () { state.picked = null; rebalance(); render(); });
    var exp = document.getElementById('rbExport');
    if (exp) exp.addEventListener('click', exportXlsx);
    var apply = document.getElementById('rbApplyMove');
    if (apply) apply.addEventListener('click', function () {
      moveSub(apply.getAttribute('data-sub'), Number(apply.getAttribute('data-to')));
    });

    wrap.querySelectorAll('.rb-route-compare-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var r = Number(btn.getAttribute('data-compare'));
        var i = state.compare.indexOf(r);
        if (i !== -1) state.compare.splice(i, 1);
        else {
          state.compare.push(r);
          if (state.compare.length > 2) state.compare.shift();
        }
        render();
      });
    });

    wrap.querySelectorAll('.rb-route-receive').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (state.picked) moveSub(state.picked, Number(btn.getAttribute('data-receive')));
      });
    });

    wrap.querySelectorAll('.rb-chip').forEach(function (chip) {
      var sub = chip.getAttribute('data-sub');
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        state.picked = state.picked === sub ? null : sub;
        render();
      });
      chip.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chip.click(); }
      });
      chip.addEventListener('dragstart', function (e) {
        draggingSub = sub;
        chip.classList.add('is-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', sub);
        }
      });
      chip.addEventListener('dragend', function () {
        draggingSub = null;
        chip.classList.remove('is-dragging');
        wrap.querySelectorAll('.rb-route-col').forEach(function (c) { c.classList.remove('is-drop'); });
        drawLinks();
      });
    });

    wrap.querySelectorAll('.rb-route-col').forEach(function (col) {
      var r = Number(col.getAttribute('data-route'));
      col.addEventListener('click', function () {
        if (state.picked && state.assign[state.picked] !== r) moveSub(state.picked, r);
      });
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        if (!col.classList.contains('is-drop')) {
          col.classList.add('is-drop');
          drawLinks(r);
        }
      });
      col.addEventListener('dragleave', function () { col.classList.remove('is-drop'); drawLinks(); });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('is-drop');
        var sub = draggingSub || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
        if (sub) moveSub(sub, r);
      });
    });
  }

  function exportXlsx() {
    if (typeof XLSX === 'undefined') return;
    var rows = [['Route', 'Subpostcode', 'Deliveries']];
    var totals = routeTotals();
    for (var r = 0; r < state.routeCount; r++) {
      itemsOf(r).forEach(function (it) { rows.push([ROUTE_POOL[r], it.sub, it.count]); });
      rows.push([ROUTE_POOL[r] + ' TOTAL', '', totals[r]]);
    }
    rows.push(['TOTAL', '', grandTotal()]);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Route Split');
    XLSX.writeFile(wb, 'route-split.xlsx');
  }

  /* ---------- ciclo de vida ---------- */
  function show(visible) {
    if (wrap) wrap.hidden = !visible;
  }

  document.addEventListener('rb:results', function (ev) {
    var df = (ev.detail && ev.detail.dfPostcodes) || [];
    state.items = df
      .filter(function (r) { return String(r.subpostcode || '').toUpperCase() !== 'TOTAL'; })
      .map(function (r) { return { sub: r.subpostcode, count: r['total de deliveries'] || 0 }; });
    state.picked = null;
    state.compare = [];
    rebalance();
    render();
    show(state.items.length > 0);
  });
  document.addEventListener('rb:reset', function () { show(false); });

  window.addEventListener('resize', function () { if (wrap && !wrap.hidden) drawLinks(); });

  function init() {
    wrap = document.getElementById('rbBoard');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
