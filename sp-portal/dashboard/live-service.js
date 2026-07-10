/**
 * Live Service – dispatch carousel operacional em tempo real (Depot MSE).
 * Cada rota mostra a entrega atual, motorista, veículo e a fila de entregas.
 * Simulação local: estados avançam periodicamente (Completed → In progress → Next → Queued).
 * Respeita prefers-reduced-motion: sem pulso e sem avanço automático.
 */
(function () {
  'use strict';

  var REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================ Dados (Depot MSE) ============================ */
  var LIVE_SERVICE_STOPS = [
    {
      key: 'pre12', label: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12',
      stops: [
        { pc: 'RM 9 9AE', addr: '52 Market Street' },
        { pc: 'RM 4 3QR', addr: '167 Park Lane' },
        { pc: 'RM 6 8GD', addr: '143 New Road' },
        { pc: 'RM 8 0WP', addr: '19a Bridge Street' },
        { pc: 'RM 8 7HZ', addr: 'Flat 168 George Street' },
        { pc: 'RM 9 4XK', addr: 'Flat 134 High Street' },
        { pc: 'RM 6 5GY', addr: 'Unit 136 Bridge Street' },
        { pc: 'RM 6 8UL', addr: '76b High Street' },
        { pc: 'RM 7 1TD', addr: '184 Manor Road' },
        { pc: 'RM 4 4KL', addr: 'Flat 111 Green Lane' },
        { pc: 'RM 3 4RY', addr: 'Unit 187 Queen Street' },
        { pc: 'RM 3 8ES', addr: 'Unit 20 New Road' },
        { pc: 'RM 1 2PD', addr: 'Unit 132 New Road' },
        { pc: 'RM 8 6JU', addr: '195 School Lane' }
      ]
    },
    {
      key: 'asr', label: 'ASR', icon: 'bi-arrow-repeat', tone: 'asr',
      stops: [
        { pc: 'RM 3 8XQ', addr: 'Flat 165 High Street' },
        { pc: 'RM 9 4XK', addr: 'Flat 134 High Street' },
        { pc: 'RM 3 5PT', addr: 'Flat 158 New Road' },
        { pc: 'RM 4 4KL', addr: 'Flat 111 Green Lane' },
        { pc: 'RM 3 4RY', addr: 'Unit 187 Queen Street' }
      ]
    },
    {
      key: 'dsr', label: 'DSR', icon: 'bi-moon-stars', tone: 'dsr',
      stops: [
        { pc: 'RM 1 2DE', addr: '146a Green Lane' },
        { pc: 'RM 6 2CK', addr: 'Flat 70 Manor Road' },
        { pc: 'RM 6 7CT', addr: '1-1 Victoria Street' },
        { pc: 'RM 3 7DB', addr: '72a New Road' }
      ]
    }
  ];

  function liveRoute(name, service, icon, tone, stops) {
    return { key: name.toLowerCase(), label: name, service: service, icon: icon, tone: tone, stops: stops };
  }

  /* Rotas do Depot MSE. As entregas seguem classificadas por tipo de serviço. */
  var LIVE_ROUTES = [
    liveRoute('MD7A', 'Pre-12', 'bi-sunrise', 'pre12', LIVE_SERVICE_STOPS[0].stops.slice(0, 2)),
    liveRoute('MD7B', 'Pre-12', 'bi-sunrise', 'pre12', LIVE_SERVICE_STOPS[0].stops.slice(2, 4)),
    liveRoute('MD7C', 'Pre-12', 'bi-sunrise', 'pre12', LIVE_SERVICE_STOPS[0].stops.slice(4, 6)),
    liveRoute('MD7D', 'Pre-12', 'bi-sunrise', 'pre12', LIVE_SERVICE_STOPS[0].stops.slice(6, 8)),
    liveRoute('MD7E', 'Pre-12', 'bi-sunrise', 'pre12', LIVE_SERVICE_STOPS[0].stops.slice(8, 10)),
    liveRoute('MD7X', 'Pre-12', 'bi-sunrise', 'pre12', LIVE_SERVICE_STOPS[0].stops.slice(10, 12)),
    liveRoute('MD7Q', 'Pre-12', 'bi-sunrise', 'pre12', LIVE_SERVICE_STOPS[0].stops.slice(12, 14)),
    liveRoute('MD9A', 'ASR / DSR', 'bi-arrow-repeat', 'asr', [LIVE_SERVICE_STOPS[1].stops[0], LIVE_SERVICE_STOPS[2].stops[0]]),
    liveRoute('MD9B', 'ASR / DSR', 'bi-arrow-repeat', 'asr', [LIVE_SERVICE_STOPS[1].stops[1], LIVE_SERVICE_STOPS[2].stops[1]]),
    liveRoute('MD9C', 'ASR / DSR', 'bi-arrow-repeat', 'asr', [LIVE_SERVICE_STOPS[1].stops[2], LIVE_SERVICE_STOPS[2].stops[2]]),
    liveRoute('MD9D', 'ASR / DSR', 'bi-arrow-repeat', 'asr', [LIVE_SERVICE_STOPS[1].stops[3], LIVE_SERVICE_STOPS[2].stops[3]]),
    liveRoute('MD9X', 'ASR', 'bi-arrow-repeat', 'asr', LIVE_SERVICE_STOPS[1].stops.slice(4, 5))
  ];

  /* progresso inicial simulado: parte de cada rota já concluída */
  var progress = LIVE_ROUTES.reduce(function (state, route) {
    state[route.key] = route.stops.length > 1 ? 1 : 0;
    return state;
  }, {});
  var activeRouteIndex = 0;

  function statusFor(routeKey, index) {
    var done = progress[routeKey];
    if (index < done) return 'completed';
    if (index === done) return 'inprogress';
    if (index === done + 1) return 'next';
    return 'queued';
  }

  var STATUS_META = {
    completed: { label: 'Completed', icon: 'bi-check-circle-fill' },
    inprogress: { label: 'In progress', icon: 'bi-truck' },
    next: { label: 'Next', icon: 'bi-skip-forward-circle' },
    queued: { label: 'Queued', icon: 'bi-clock' }
  };

  function getAssignment(routeIndex) {
    var data = window.DHL_MOCK_DATA || {};
    var drivers = (data.vendors || []).filter(function (vendor) { return vendor.depot === 'MSE'; });
    var vehicles = (data.vehicles || []).filter(function (vehicle) { return vehicle.depot === 'MSE'; });
    var driver = drivers[routeIndex % drivers.length] || { firstName: 'TBX', lastName: 'Driver' };
    var vehicle = vehicles[routeIndex % vehicles.length] || { brand: 'Fleet', model: 'Van', vrn: 'TBX LIVE' };
    return {
      driverName: [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'TBX Driver',
      vehicleName: [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Fleet Van',
      vehicleVrn: vehicle.vrn || 'TBX LIVE'
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char];
    });
  }

  function renderDeliveryQueue(route) {
    return route.stops.map(function (stop, index) {
      var status = statusFor(route.key, index);
      var meta = STATUS_META[status];
      return '<li class="sp-live-queue-item sp-live-queue-item--' + status + '">' +
        '<span class="sp-live-queue-index">' + String(index + 1).padStart(2, '0') + '</span>' +
        '<span class="sp-live-queue-address"><strong>' + escapeHtml(stop.pc) + '</strong><span>' + escapeHtml(stop.addr) + '</span></span>' +
        '<span class="sp-live-queue-status"><i class="bi ' + meta.icon + '" aria-hidden="true"></i>' + meta.label + '</span>' +
        '</li>';
    }).join('');
  }

  /* ============================ Render ============================ */
  function renderCarousel() {
    var track = document.getElementById('spLiveCarouselTrack');
    var dots = document.getElementById('spLiveCarouselDots');
    if (!track || !dots) return;

    track.innerHTML = LIVE_ROUTES.map(function (route, routeIndex) {
      var done = progress[route.key];
      var total = route.stops.length;
      var pct = Math.round((done / total) * 100);
      var currentIndex = Math.min(done, total - 1);
      var currentStop = route.stops[currentIndex];
      var currentStatus = statusFor(route.key, currentIndex);
      var assignment = getAssignment(routeIndex);
      var completed = done >= total;
      return '<article class="sp-live-route-slide sp-live-route-slide--' + route.tone + '" role="group" aria-roledescription="slide" aria-label="' + route.label + ', route ' + (routeIndex + 1) + ' of ' + LIVE_ROUTES.length + '">' +
        '<div class="sp-live-route-head">' +
          '<div><span class="sp-live-route-eyebrow"><i class="bi ' + route.icon + '" aria-hidden="true"></i> ' + route.service + ' service</span><h3 class="sp-live-route-title">' + route.label + ' route</h3></div>' +
          '<div class="sp-live-route-progress-copy"><strong>' + done + '<span>/' + total + '</span></strong><span>deliveries complete</span></div>' +
        '</div>' +
        '<div class="sp-live-route-progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + route.label + ' progress"><span style="width:' + pct + '%"></span></div>' +
        '<div class="sp-live-route-body">' +
          '<section class="sp-live-current-delivery ' + (completed ? 'sp-live-current-delivery--complete' : '') + '" aria-label="Current delivery">' +
            '<div class="sp-live-current-kicker"><span class="sp-live-current-signal"><i class="bi ' + STATUS_META[currentStatus].icon + '" aria-hidden="true"></i></span>' + (completed ? 'Route complete' : 'Current delivery') + '</div>' +
            '<div class="sp-live-current-postcode">' + escapeHtml(currentStop.pc) + '</div>' +
            '<p class="sp-live-current-address">' + escapeHtml(currentStop.addr) + '</p>' +
            '<span class="sp-live-current-status">' + (completed ? 'All deliveries completed' : STATUS_META[currentStatus].label) + '</span>' +
          '</section>' +
          '<section class="sp-live-resource-panel" aria-label="Route resources">' +
            '<div class="sp-live-resource"><span class="sp-live-resource-icon"><i class="bi bi-person-fill" aria-hidden="true"></i></span><span><small>Driver</small><strong>' + escapeHtml(assignment.driverName) + '</strong><em>On route</em></span></div>' +
            '<div class="sp-live-resource"><span class="sp-live-resource-icon"><i class="bi bi-truck-front-fill" aria-hidden="true"></i></span><span><small>Vehicle</small><strong>' + escapeHtml(assignment.vehicleName) + '</strong><em>' + escapeHtml(assignment.vehicleVrn) + '</em></span></div>' +
          '</section>' +
          '<section class="sp-live-queue-panel" aria-label="Route deliveries"><div class="sp-live-queue-head"><span>Deliveries</span><span>' + total + ' stops</span></div><ol class="sp-live-queue-list">' + renderDeliveryQueue(route) + '</ol></section>' +
        '</div>' +
        '</article>';
    }).join('');

    dots.innerHTML = LIVE_ROUTES.map(function (route, index) {
      var selected = index === activeRouteIndex;
      return '<button type="button" class="sp-live-carousel-dot' + (selected ? ' is-active' : '') + '" data-live-route="' + index + '" role="tab" aria-selected="' + selected + '" aria-label="Show ' + route.label + ' route"><span></span>' + route.label + '</button>';
    }).join('');
    setCarouselPosition(false);
  }

  function setCarouselPosition(animate) {
    var track = document.getElementById('spLiveCarouselTrack');
    var position = document.getElementById('spLiveCarouselPosition');
    var dots = document.querySelectorAll('.sp-live-carousel-dot');
    if (track) {
      track.classList.toggle('sp-live-carousel-track--instant', !animate);
      track.style.transform = 'translateX(-' + (activeRouteIndex * 100) + '%)';
      if (!animate) requestAnimationFrame(function () { track.classList.remove('sp-live-carousel-track--instant'); });
    }
    if (position) position.textContent = 'Route ' + (activeRouteIndex + 1) + ' of ' + LIVE_ROUTES.length;
    dots.forEach(function (dot, index) {
      var selected = index === activeRouteIndex;
      dot.classList.toggle('is-active', selected);
      dot.setAttribute('aria-selected', String(selected));
    });
  }

  function renderKpis() {
    var total = 0, done = 0;
    LIVE_ROUTES.forEach(function (r) { total += r.stops.length; done += progress[r.key]; });
    setText('spLiveKpiTotal', total);
    setText('spLiveKpiPre12', LIVE_ROUTES.filter(function (route) { return route.service === 'Pre-12'; }).reduce(function (count, route) { return count + route.stops.length; }, 0));
    setText('spLiveKpiAsr', LIVE_ROUTES.filter(function (route) { return route.service.indexOf('ASR') !== -1; }).reduce(function (count, route) { return count + route.stops.length; }, 0));
    setText('spLiveKpiDsr', LIVE_ROUTES.filter(function (route) { return route.service.indexOf('DSR') !== -1; }).reduce(function (count, route) { return count + route.stops.length; }, 0));
    setText('spLiveKpiRoutes', LIVE_ROUTES.length);
    setText('spLiveKpiDone', done);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  /* avanço simulado: a cada tick, uma rota com stops pendentes progride */
  function tick() {
    var pending = LIVE_ROUTES.filter(function (r) { return progress[r.key] < r.stops.length; });
    if (!pending.length) return; // operação concluída: mantém estado final
    var route = pending[Math.floor(Math.random() * pending.length)];
    progress[route.key] += 1;
    renderCarousel();
    renderKpis();
  }

  function changeRoute(nextIndex, animate) {
    activeRouteIndex = (nextIndex + LIVE_ROUTES.length) % LIVE_ROUTES.length;
    setCarouselPosition(animate !== false);
  }

  function bindCarouselControls() {
    var prev = document.getElementById('spLiveCarouselPrev');
    var next = document.getElementById('spLiveCarouselNext');
    var dots = document.getElementById('spLiveCarouselDots');
    if (prev) prev.addEventListener('click', function () { changeRoute(activeRouteIndex - 1); });
    if (next) next.addEventListener('click', function () { changeRoute(activeRouteIndex + 1); });
    if (dots) dots.addEventListener('click', function (event) {
      var target = event.target.closest('[data-live-route]');
      if (target) changeRoute(Number(target.getAttribute('data-live-route')));
    });
  }

  /* ============================ Navegação por categoria ============================ */
  var NAV_GROUPS = [
    {
      title: 'Planning & Operations', icon: 'bi-calendar3',
      items: [
        { label: 'Week Planner', desc: 'Plan routes and crews for the week', icon: 'bi-calendar-week', href: null },
        { label: 'Route Balance', desc: 'Balance stops across live routes', icon: 'bi-sliders', href: null },
        { label: 'Daily Operations Management', desc: 'Run and adjust today’s operation', icon: 'bi-speedometer2', href: null }
      ]
    },
    {
      title: 'Setup', icon: 'bi-gear',
      items: [
        { label: 'Vendor', desc: 'Vendor records and onboarding', icon: 'bi-person-badge', href: '../../dhl/vendor-admin-view/index.html' },
        { label: 'Vehicles', desc: 'Fleet, VRNs and vehicle status', icon: 'bi-truck', href: '../vehicles/index.html' },
        { label: 'Assets', desc: 'Scanners, devices and equipment', icon: 'bi-upc-scan', href: null },
        { label: 'Contract Management', desc: 'Routes, loops and agreements', icon: 'bi-file-earmark-text', href: '../contracts/index.html' }
      ]
    },
    {
      title: 'Feed & Announcements', icon: 'bi-megaphone',
      items: [
        { label: 'Feed', desc: 'SOPs, tutorials and updates', icon: 'bi-journal-bookmark', href: '../sop-feed/index.html' },
        { label: 'Announcements', desc: 'Messages from DHL', icon: 'bi-megaphone-fill', href: '#announcements' }
      ]
    },
    {
      title: 'Compliance', icon: 'bi-shield-check',
      items: [
        { label: 'Service Provider Profile', desc: 'Company details and documents', icon: 'bi-building', href: '../profile/index.html' },
        { label: 'Compliance', desc: 'Training status and renewals', icon: 'bi-patch-check', href: null },
        { label: 'Vetting', desc: 'Driver vetting and checks', icon: 'bi-person-check', href: null }
      ]
    },
    {
      title: 'Billing', icon: 'bi-receipt',
      items: [
        { label: 'Invoice Processing Workflow', desc: 'Submit and track invoices', icon: 'bi-arrow-repeat', href: null },
        { label: 'Deductions', desc: 'Liquidation damages and adjustments', icon: 'bi-dash-circle', href: null },
        { label: 'Adhoc Invoice Management', desc: 'One-off works invoicing', icon: 'bi-receipt-cutoff', href: null }
      ]
    },
    {
      title: 'Performance', icon: 'bi-graph-up',
      items: [
        { label: 'Financial Insights', desc: 'Income, targets and trends', icon: 'bi-currency-pound', href: null },
        { label: 'Operation Insights', desc: 'SPR, AFD and time windows', icon: 'bi-bar-chart-line', href: null },
        { label: 'Vendor Performance', desc: 'Scorecards by vendor', icon: 'bi-trophy', href: null }
      ]
    },
    {
      title: 'Vendor Requests', icon: 'bi-inbox',
      items: [
        { label: 'Vendor Requests', desc: 'Open requests and approvals', icon: 'bi-envelope-paper', href: null }
      ]
    },
    {
      title: 'Trace & Queries', icon: 'bi-search',
      items: [
        { label: 'Trace & Queries', desc: 'Track shipments and raise queries', icon: 'bi-binoculars', href: null }
      ]
    }
  ];

  function currentSpQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      var sp = (params.get('sp') || '').trim();
      if (!sp) sp = sessionStorage.getItem('dhl_sp_portal_current_sp') || '';
      return sp ? ('?sp=' + encodeURIComponent(sp)) : '';
    } catch (e) { return ''; }
  }

  function renderNav() {
    var wrap = document.getElementById('spNavGroups');
    if (!wrap) return;
    var spQuery = currentSpQuery();
    var html = NAV_GROUPS.map(function (group, gi) {
      var cards = group.items.map(function (item) {
        var inner =
          '<span class="sp-nav-card-icon" aria-hidden="true"><i class="bi ' + item.icon + '"></i></span>' +
          '<span class="sp-nav-card-text">' +
            '<span class="sp-nav-card-title">' + item.label + '</span>' +
            '<span class="sp-nav-card-desc">' + item.desc + '</span>' +
          '</span>' +
          '<i class="bi bi-arrow-right-short sp-nav-card-arrow" aria-hidden="true"></i>';
        if (item.href === '#announcements') {
          return '<button type="button" class="sp-nav-card sp-nav-card--action" data-nav-action="announcements">' + inner + '</button>';
        }
        if (item.href) {
          var href = item.href + (item.href.indexOf('../') === 0 && item.href.indexOf('/dhl/') === -1 ? spQuery : '');
          return '<a class="sp-nav-card" href="' + href + '">' + inner + '</a>';
        }
        return '<a class="sp-nav-card sp-nav-card--soon" href="#" role="link" aria-disabled="true" tabindex="0">' + inner +
          '<span class="sp-nav-card-soon-chip">Soon</span></a>';
      }).join('');
      return '<section class="sp-nav-group" style="--nav-delay:' + (gi * 60) + 'ms" aria-label="' + group.title + '">' +
        '<h3 class="sp-nav-group-title"><i class="bi ' + group.icon + '" aria-hidden="true"></i> ' + group.title + '</h3>' +
        '<div class="sp-nav-cards">' + cards + '</div>' +
        '</section>';
    }).join('');
    wrap.innerHTML = html;

    wrap.addEventListener('click', function (ev) {
      var soon = ev.target.closest('.sp-nav-card--soon');
      if (soon) { ev.preventDefault(); return; }
      var action = ev.target.closest('[data-nav-action="announcements"]');
      if (action) {
        var trigger = document.getElementById('spAnnouncementBox');
        if (trigger) trigger.click();
      }
    });
  }

  /* ============================ Init ============================ */
  function init() {
    renderCarousel();
    renderKpis();
    bindCarouselControls();
    renderNav();
    if (!REDUCED_MOTION) {
      setInterval(function () {
        tick();
        changeRoute(activeRouteIndex + 1);
      }, 7000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
