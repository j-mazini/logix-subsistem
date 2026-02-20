    (function () {
      'use strict';
      var SP_STORAGE_KEY = 'dhl_sp_portal_current_sp';
      function getCurrentSp() {
        var params = new URLSearchParams(window.location.search);
        var sp = (params.get('sp') || '').trim();
        if (sp) { try { sessionStorage.setItem(SP_STORAGE_KEY, sp); } catch (e) {} return sp; }
        try { return sessionStorage.getItem(SP_STORAGE_KEY) || ''; } catch (e) { return ''; }
      }
      function appendSpToLinks() {
        var sp = getCurrentSp();
        if (!sp) return;
        document.querySelectorAll('.beam-plate[href]').forEach(function (a) {
          var href = a.getAttribute('href');
          if (href && href.indexOf('?') === -1) a.setAttribute('href', href + '?sp=' + encodeURIComponent(sp));
        });
      }

      function postcodesToSubpostcodes(postcodes) {
        if (!postcodes || !postcodes.length) return [];
        var seen = {}, out = [];
        for (var i = 0; i < postcodes.length; i++) {
          var pc = String(postcodes[i]).trim();
          if (pc.length <= 2) continue;
          var sub = pc.slice(0, -2).trim();
          if (sub && !seen[sub]) { seen[sub] = true; out.push(sub); }
        }
        return out.sort();
      }
      function escapeHtml(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
      }

      var contractData = (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.contracts) ? window.DHL_MOCK_DATA.contracts : [];
      var spName = getCurrentSp();
      var ROUTE_TARGETS_STORAGE_KEY = 'dhl_contract_route_targets';

      function getStoredTarget(spNameVal, depotName, routeName) {
        try {
          var raw = localStorage.getItem(ROUTE_TARGETS_STORAGE_KEY);
          if (!raw) return null;
          var data = JSON.parse(raw);
          var sp = data[spNameVal];
          if (!sp) return null;
          var key = (depotName || '') + '|' + (routeName || '');
          return sp[key] != null ? Number(sp[key]) : null;
        } catch (e) { return null; }
      }

      function setStoredTarget(spName, depotName, routeName, value) {
        try {
          var raw = localStorage.getItem(ROUTE_TARGETS_STORAGE_KEY);
          var data = raw ? JSON.parse(raw) : {};
          if (!data[spName]) data[spName] = {};
          var key = (depotName || '') + '|' + (routeName || '');
          if (value === '' || value == null || isNaN(Number(value))) delete data[spName][key];
          else data[spName][key] = Number(value);
          localStorage.setItem(ROUTE_TARGETS_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
      }

      function getFilteredData() {
        if (!spName) return [];
        for (var i = 0; i < contractData.length; i++) {
          if (contractData[i].serviceProvider === spName) {
            var prov = contractData[i];
            var depots = [];
            for (var d = 0; d < (prov.depots || []).length; d++) {
              var dep = prov.depots[d];
              var loops = [];
              for (var L = 0; L < (dep.loops || []).length; L++) {
                var loop = dep.loops[L];
                var routes = (loop.routes || []).map(function (r) {
                  var stored = getStoredTarget(prov.serviceProvider, dep.name, r.name);
                  var target = stored != null && !isNaN(stored) ? stored : (r.targetDel != null ? r.targetDel : 0);
                  return { name: r.name, type: r.type || 'Child', target: target, driver: r.driver || '', postcodes: r.postcodes || [] };
                });
                var rate = typeof loop.deliveryRate === 'number' ? loop.deliveryRate : 0;
                loops.push({ name: loop.name, deliveryRate: rate, routes: routes });
              }
              depots.push({ name: dep.name, loops: loops });
            }
            return [{ serviceProvider: prov.serviceProvider, depots: depots }];
          }
        }
        return [];
      }

      var idGen = 0;
      function nextId(prefix) { return 'cm-' + (prefix || '') + '-' + (idGen++); }

      function renderTree() {
        var container = document.getElementById('contractTree');
        var emptyState = document.getElementById('emptyState');
        if (!spName) {
          document.getElementById('spNotFound').classList.remove('hidden');
          return;
        }
        document.getElementById('spNotFound').classList.add('hidden');
        document.getElementById('contractContent').classList.remove('hidden');
        document.getElementById('spHeaderName').textContent = spName;
        var logoMap = { 'BA Express': 'ba-express-logo.png', 'Premier Logistics Ltd': 'premier-logistics-logo.png', 'Swift Haul Solutions': 'swift-haul-logo.png', 'Metro Freight Partners': 'metro-freight-logo.png', 'Atlas Transport Services': 'atlas-transport-logo.png' };
        var avatar = document.getElementById('spHeaderAvatar');
        if (avatar) {
          var fallback = document.getElementById('spHeaderAvatarFallback');
          var showFallback = function (txt) {
            if (fallback) { fallback.textContent = (txt || spName || '').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); fallback.style.display = 'flex'; }
            if (avatar) avatar.style.display = 'none';
          };
          if (logoMap[spName]) {
            avatar.onerror = function () { showFallback(spName); };
            avatar.src = '../../assets/' + logoMap[spName];
            avatar.alt = spName;
            avatar.style.display = 'block';
          } else {
            showFallback(spName);
          }
        }
        appendSpToLinks();

        var filtered = getFilteredData();
        if (filtered.length === 0) {
          container.innerHTML = '';
          emptyState.classList.remove('hidden');
          document.getElementById('metricDepots').textContent = '0';
          document.getElementById('metricLoops').textContent = '0';
          document.getElementById('metricRoutes').textContent = '0';
          return;
        }
        emptyState.classList.add('hidden');
        var totalDepots = 0, totalLoops = 0, totalRoutes = 0;
        filtered.forEach(function (prov) {
          totalDepots += (prov.depots || []).length;
          (prov.depots || []).forEach(function (dep) {
            totalLoops += (dep.loops || []).length;
            (dep.loops || []).forEach(function (loop) {
              totalRoutes += (loop.routes || []).length;
            });
          });
        });
        document.getElementById('metricDepots').textContent = totalDepots;
        document.getElementById('metricLoops').textContent = totalLoops;
        document.getElementById('metricRoutes').textContent = totalRoutes;
        idGen = 0;
        var html = '';
        for (var i = 0; i < filtered.length; i++) {
          var prov = filtered[i];
          var spId = nextId('sp');
          html += '<div class="accordion mb-3" id="acc-sp-' + i + '">';
          html += '<div class="accordion-item">';
          html += '<h2 class="accordion-header">';
          html += '<button class="accordion-button py-3" type="button" data-bs-toggle="collapse" data-bs-target="#' + spId + '" aria-expanded="true">';
          html += '<i class="bi bi-building me-2 text-primary"></i> <span class="fw-semibold">' + escapeHtml(prov.serviceProvider) + '</span>';
          html += '</button></h2>';
          html += '<div id="' + spId + '" class="accordion-collapse collapse show" data-bs-parent="#acc-sp-' + i + '">';
          html += '<div class="accordion-body pt-2 contract-block-inner">';

          for (var d = 0; d < prov.depots.length; d++) {
            var dep = prov.depots[d];
            var depId = nextId('dep');
            html += '<div class="accordion accordion-flush mb-2" id="acc-' + depId + '">';
            html += '<div class="accordion-item">';
            html += '<h3 class="accordion-header">';
            html += '<button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#' + depId + '"><i class="bi bi-geo-alt me-2 text-secondary"></i> ' + escapeHtml(dep.name) + '</button></h3>';
            html += '<div id="' + depId + '" class="accordion-collapse collapse" data-bs-parent="#acc-' + depId + '">';
            html += '<div class="accordion-body contract-block-inner">';

            for (var L = 0; L < dep.loops.length; L++) {
              var loop = dep.loops[L];
              var loopId = nextId('loop');
              var rateVal = (loop.deliveryRate != null && !isNaN(loop.deliveryRate)) ? loop.deliveryRate : 0;
              var rateStr = rateVal > 0 ? '£' + rateVal.toFixed(2) : '—';
              var totalTarget = 0;
              for (var t = 0; t < loop.routes.length; t++) {
                var rt = loop.routes[t];
                totalTarget += (rt.target != null ? rt.target : (rt.targetDel != null ? rt.targetDel : 0));
              }
              var digressiveBands = (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands) ? window.DHL_MOCK_DATA.digressiveBands[loop.name] : null;
              var bandsHtml = '';
              if (digressiveBands && digressiveBands.length) {
                bandsHtml = digressiveBands.map(function (b, i) {
                  var range = b.max != null ? (b.min + '–' + b.max) : (b.min + '+');
                  return 'Band ' + (i + 1) + ': ' + range + ' (£' + (b.price ? b.price.toFixed(2) : '—') + ')';
                }).join(' · ');
              } else {
                bandsHtml = 'Band 1–4 (rate: ' + rateStr + ')';
              }
              html += '<div class="accordion accordion-flush mb-2">';
              html += '<div class="accordion-item">';
              html += '<h3 class="accordion-header">';
              html += '<button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#' + loopId + '"><i class="bi bi-arrow-repeat me-2 text-secondary"></i> ' + escapeHtml(loop.name) + '</button></h3>';
              html += '<div id="' + loopId + '" class="accordion-collapse collapse">';
              html += '<div class="accordion-body contract-block-inner">';
              html += '<div class="contract-rates-box">';
              html += '<p><strong class="text-dark">Bands (per loop):</strong> <span class="text-muted">' + escapeHtml(bandsHtml) + '</span></p>';
              html += '<p><strong class="text-dark">Rate (Band 1):</strong> <span class="text-dark">' + rateStr + '</span></p>';
              html += '<p><strong class="text-dark">Total Target:</strong> <span class="text-dark">' + totalTarget + '</span></p>';
              html += '</div>';

              for (var r = 0; r < loop.routes.length; r++) {
                var route = loop.routes[r];
                var routeId = nextId('route');
                var subpostcodes = postcodesToSubpostcodes(route.postcodes);
                var typeClass = (route.type || 'Child') === 'Flex' ? 'contract-route-type-flex' : 'contract-route-type-child';
                var targetVal = route.target != null ? route.target : (route.targetDel != null ? route.targetDel : 0);
                var spEsc = (escapeHtml(prov.serviceProvider) || '').replace(/'/g, '&#39;');
                var depEsc = (escapeHtml(dep.name) || '').replace(/'/g, '&#39;');
                var routeEsc = (escapeHtml(route.name) || '').replace(/'/g, '&#39;');
                html += '<div class="accordion accordion-flush mb-2">';
                html += '<div class="accordion-item">';
                html += '<h3 class="accordion-header">';
                html += '<button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#' + routeId + '"><i class="bi bi-signpost-2 me-2 text-secondary"></i> ' + escapeHtml(route.name) + '</button></h3>';
                html += '<div id="' + routeId + '" class="accordion-collapse collapse"><div class="accordion-body">';
                html += '<div class="contract-route-meta">';
                html += '<span>Type: <strong><span class="' + typeClass + '">' + (route.type || 'Child') + '</span></strong></span>';
                if (route.driver) html += '<span>Driver: <strong>' + escapeHtml(route.driver) + '</strong></span>';
                html += '<span>Target: <strong class="js-route-target-display">' + targetVal + '</strong></span>';
                html += '</div>';
                html += '<div class="contract-route-target-edit mt-2 mb-2">';
                html += '<label class="form-label small mb-1">Target — used for comparison and utilisation rate</label>';
                html += '<input type="number" min="0" step="1" class="form-control form-control-sm contract-route-target-input" value="' + targetVal + '" data-sp="' + spEsc + '" data-depot="' + depEsc + '" data-route="' + routeEsc + '" placeholder="Target" aria-label="Route target" />';
                html += '</div>';
                html += '<p class="small text-muted mb-2"><span class="contract-badge contract-badge-sub">Subpostcode</span></p>';
                html += '<div class="contract-subpostcodes">';
                for (var s = 0; s < subpostcodes.length; s++) html += '<span class="contract-subpostcode">' + escapeHtml(subpostcodes[s]) + '</span>';
                html += '</div></div></div></div></div>';
              }
              html += '</div></div></div></div>';
            }
            html += '</div></div></div></div>';
          }
          html += '</div></div></div></div>';
        }
        container.innerHTML = html;
      }

      renderTree();

      /* Apenas o Service Provider pode alterar o target das rotas */
      document.getElementById('contractTree').addEventListener('input', function (e) {
        var input = e.target && e.target.closest && e.target.closest('.contract-route-target-input');
        if (!input) return;
        var sp = input.getAttribute('data-sp');
        var depot = input.getAttribute('data-depot');
        var route = input.getAttribute('data-route');
        if (!sp || !route) return;
        var val = input.value.trim();
        var num = val === '' ? null : parseInt(val, 10);
        setStoredTarget(sp, depot, route, num);
        var display = input.closest('.accordion-body');
        if (display) {
          var targetDisplay = display.querySelector('.js-route-target-display');
          var t = isNaN(num) || num == null ? 0 : num;
          if (targetDisplay) targetDisplay.textContent = t;
        }
      });

    })();
