    (function () {
      'use strict';
      var SP_STORAGE_KEY = 'dhl_sp_portal_current_sp';

      function getCurrentSp() {
        var params = new URLSearchParams(window.location.search);
        var sp = (params.get('sp') || '').trim();
        if (sp) {
          try { sessionStorage.setItem(SP_STORAGE_KEY, sp); } catch (e) {}
          return sp;
        }
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

      var data = window.DHL_MOCK_DATA || {};
      var vendors = (data.vendors) ? data.vendors : [];
      var vehicles = (data.vehicles) ? data.vehicles : [];
      var contracts = (data.contracts) ? data.contracts : [];
      var spName = getCurrentSp();
      var ROUTE_TARGETS_STORAGE_KEY = 'dhl_contract_route_targets';
      var OPMS_STORAGE_KEY = 'dhl_opms_uploaded_data';

      function loadOpmsStoredData() {
        try {
          var raw = localStorage.getItem(OPMS_STORAGE_KEY);
          if (!raw) return {};
          var all = JSON.parse(raw);
          return (all[spName] && typeof all[spName] === 'object') ? all[spName] : {};
        } catch (e) { return {}; }
      }

      function saveOpmsStoredData() {
        try {
          var raw = localStorage.getItem(OPMS_STORAGE_KEY);
          var all = raw ? JSON.parse(raw) : {};
          all[spName] = opmsDataByDate;
          localStorage.setItem(OPMS_STORAGE_KEY, JSON.stringify(all));
        } catch (e) { console.warn('OPMS save failed', e); }
      }

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

      var filterState = { depot: '', loop: '', route: '' };

      function getDepotsForSp() {
        var out = [], seen = {};
        contracts.forEach(function (c) {
          if (c.serviceProvider !== spName) return;
          (c.depots || []).forEach(function (d) {
            if (d.name && !seen[d.name]) { seen[d.name] = true; out.push(d.name); }
          });
        });
        return out.sort();
      }

      function getLoopsForSp(depotName) {
        var out = [], seen = {};
        contracts.forEach(function (c) {
          if (c.serviceProvider !== spName) return;
          (c.depots || []).forEach(function (d) {
            if (d.name !== depotName || !d.loops) return;
            d.loops.forEach(function (l) {
              if (l.name && !seen[l.name]) { seen[l.name] = true; out.push(l.name); }
            });
          });
        });
        return out.sort();
      }

      function getRoutesForSp(depotName, loopName) {
        var out = [];
        contracts.forEach(function (c) {
          if (c.serviceProvider !== spName) return;
          (c.depots || []).forEach(function (d) {
            if (d.name !== depotName || !d.loops) return;
            d.loops.forEach(function (l) {
              if (l.name !== loopName || !l.routes) return;
              l.routes.forEach(function (r) {
                if (r.name) out.push(r.name);
              });
            });
          });
        });
        return out;
      }

      /** Returns the loop delivery rate (band rate) for a given depot and route for current SP, or 0 if not found. */
      function getLoopDeliveryRateForDepotRoute(depotName, routeName) {
        var rate = 0;
        contracts.forEach(function (c) {
          if (c.serviceProvider !== spName) return;
          (c.depots || []).forEach(function (d) {
            if (d.name !== depotName || !d.loops) return;
            d.loops.forEach(function (l) {
              if (!l.routes) return;
              for (var i = 0; i < l.routes.length; i++) {
                if (String(l.routes[i].name) === String(routeName)) {
                  rate = typeof l.deliveryRate === 'number' ? l.deliveryRate : 0;
                  return;
                }
              }
            });
          });
        });
        return rate;
      }

      /** Returns the loop name for a given depot and route for current SP, or '' if not found. */
      function getLoopNameForDepotRoute(depotName, routeName) {
        var loopName = '';
        contracts.forEach(function (c) {
          if (c.serviceProvider !== spName) return;
          (c.depots || []).forEach(function (d) {
            if (d.name !== depotName || !d.loops) return;
            d.loops.forEach(function (l) {
              if (!l.routes) return;
              for (var i = 0; i < l.routes.length; i++) {
                if (String(l.routes[i].name) === String(routeName)) {
                  loopName = l.name || '';
                  return;
                }
              }
            });
          });
        });
        return loopName;
      }

      /** Income digressivo: Band 1 com um valor, Band 2 = (entregas no intervalo Band 2) × preço Band 2, etc. Retorna total em GBP. */
      function calculateDigressiveIncome(deliveries, loopName) {
        var bands = (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands) ? window.DHL_MOCK_DATA.digressiveBands[loopName] : null;
        if (!bands || !bands.length) return 0;
        var d = Math.max(0, Math.floor(deliveries));
        var total = 0;
        for (var i = 0; i < bands.length && d > 0; i++) {
          var b = bands[i];
          var min = b.min;
          var max = b.max == null ? 1e9 : b.max;
          var inBand = Math.min(d, max - min + 1);
          total += inBand * (b.price || 0);
          d -= inBand;
        }
        return total;
      }

      /** Returns target (meta de entregas) for a given depot and route for current SP. Usa o valor cadastrado no Contract Management (localStorage) se existir; senão o do contrato. */
      function getTargetDelForDepotRoute(depotName, routeName) {
        var stored = getStoredTarget(spName, depotName, routeName);
        if (stored != null && !isNaN(stored)) return stored;
        var target = 0;
        contracts.forEach(function (c) {
          if (c.serviceProvider !== spName) return;
          (c.depots || []).forEach(function (d) {
            if (d.name !== depotName || !d.loops) return;
            d.loops.forEach(function (l) {
              if (!l.routes) return;
              for (var i = 0; i < l.routes.length; i++) {
                if (String(l.routes[i].name) === String(routeName)) {
                  target = typeof l.routes[i].targetDel === 'number' ? l.routes[i].targetDel : 0;
                  return;
                }
              }
            });
          });
        });
        return target;
      }

      /** Set de nomes de rotas cadastradas no sistema (contracts) para o SP atual. */
      function getRegisteredRouteNamesSet() {
        var set = {};
        contracts.forEach(function (c) {
          if (c.serviceProvider !== spName) return;
          (c.depots || []).forEach(function (d) {
            (d.loops || []).forEach(function (l) {
              (l.routes || []).forEach(function (r) {
                if (r.name) set[r.name] = true;
              });
            });
          });
        });
        return set;
      }

      /** Lista de pares depot+loop para o SP atual (para dropdown Select Loop). */
      function getLoopsWithDepotsForSp() {
        var out = [];
        var seen = {};
        contracts.forEach(function (c) {
          if (c.serviceProvider !== spName) return;
          (c.depots || []).forEach(function (d) {
            (d.loops || []).forEach(function (l) {
              var key = (d.name || '') + '|' + (l.name || '');
              if (l.name && !seen[key]) { seen[key] = true; out.push({ depot: d.name, loop: l.name }); }
            });
          });
        });
        return out.sort(function (a, b) { return (a.depot + a.loop).localeCompare(b.depot + b.loop); });
      }

      /** Lista de rotas cadastradas com depot, loop, targetDel (do cadastro ou contrato), targetPu, deliveryRate (para comparação e % aproveitamento). */
      function getRegisteredRoutesWithDetails() {
        var list = [];
        contracts.forEach(function (c) {
          if (c.serviceProvider !== spName) return;
          (c.depots || []).forEach(function (d) {
            (d.loops || []).forEach(function (l) {
              var rate = typeof l.deliveryRate === 'number' ? l.deliveryRate : 0;
              (l.routes || []).forEach(function (r) {
                if (!r.name) return;
                var storedTarget = getStoredTarget(spName, d.name, r.name);
                var targetDel = storedTarget != null && !isNaN(storedTarget) ? storedTarget : (typeof r.targetDel === 'number' ? r.targetDel : 0);
                list.push({
                  depot: d.name,
                  loop: l.name,
                  route: r.name,
                  targetDel: targetDel,
                  targetPu: typeof r.targetPu === 'number' ? r.targetPu : 0,
                  deliveryRate: rate
                });
              });
            });
          });
        });
        return list;
      }

      /** Gera SVG de círculo de progresso. Suporta OVERLAPS: quando valor > maxForOneLap, a primeira volta usa progressColor; a segunda volta (overlap) é desenhada em glow branco.
       * opts: radius, strokeWidth, trackColor, progressColor, large, maxForOneLap (default 100; para AFD use 6). */
      function opmsProgressCircleSvg(pct, opts) {
        opts = opts || {};
        var r = opts.radius != null ? opts.radius : 42;
        var strokeWidth = opts.strokeWidth != null ? opts.strokeWidth : 8;
        if (opts.large) { r = 58; strokeWidth = 10; }
        var trackColor = opts.trackColor || '#e2e8f0';
        var progressColor = opts.progressColor || '#22c55e';
        var maxForOneLap = opts.maxForOneLap != null ? opts.maxForOneLap : 100;
        var size = (r + strokeWidth) * 2;
        var cx = size / 2;
        var cy = size / 2;
        var circum = 2 * Math.PI * r;
        var pctNum = typeof pct === 'number' && !isNaN(pct) ? pct : 0;
        var firstLapPct = pctNum >= maxForOneLap ? 100 : Math.max(0, (pctNum / maxForOneLap) * 100);
        var overlapPct = pctNum > maxForOneLap ? Math.min(100, ((pctNum - maxForOneLap) / maxForOneLap) * 100) : 0;
        var firstDash = circum * firstLapPct / 100;
        var overlapDash = overlapPct > 0 ? circum * overlapPct / 100 : 0;
        var rot = 'rotate(-90 ' + cx + ' ' + cy + ')';
        var track = '<circle class="opms-progress-track" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + trackColor + '" stroke-width="' + strokeWidth + '"/>';
        var fill = '<circle class="opms-progress-fill" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + progressColor + '" stroke-width="' + strokeWidth + '" stroke-dasharray="0 ' + circum + '" style="--opms-dash:' + firstDash + ';--opms-circum:' + circum + '" transform="' + rot + '"/>';
        var overlap = overlapDash > 0
          ? '<circle class="opms-progress-overlap" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="' + strokeWidth + '" stroke-dasharray="0 ' + circum + '" style="--opms-dash:' + overlapDash + ';--opms-circum:' + circum + '" transform="' + rot + '"/>'
          : '';
        return '<svg class="opms-progress-svg' + (overlapDash > 0 ? ' opms-progress-has-overlap' : '') + '" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" aria-hidden="true">' +
          track + fill + overlap +
          '</svg>';
      }

      function updateFilterSelects() {
        var depotSel = document.getElementById('spFilterDepot');
        var loopWrap = document.getElementById('spLoopFilterWrap');
        var loopSel = document.getElementById('spFilterLoop');
        var routeWrap = document.getElementById('spRouteFilterWrap');
        var routeSel = document.getElementById('spFilterRoute');
        if (!depotSel) return;
        var depots = getDepotsForSp();
        var currentDepot = filterState.depot;
        depotSel.innerHTML = '<option value="">All depots</option>' + depots.map(function (d) {
          return '<option value="' + d + '"' + (d === currentDepot ? ' selected' : '') + '>' + d + '</option>';
        }).join('');
        if (loopWrap && loopSel) {
          if (currentDepot) {
            loopWrap.classList.remove('hidden');
            loopWrap.setAttribute('aria-hidden', 'false');
            var loops = getLoopsForSp(currentDepot);
            var currentLoop = filterState.loop;
            if (loops.indexOf(currentLoop) === -1) currentLoop = '';
            loopSel.innerHTML = '<option value="">All loops</option>' + loops.map(function (l) {
              return '<option value="' + l + '"' + (l === currentLoop ? ' selected' : '') + '>' + l + '</option>';
            }).join('');
            if (routeWrap && routeSel) {
              if (filterState.loop) {
                routeWrap.classList.remove('hidden');
                routeWrap.setAttribute('aria-hidden', 'false');
                var routes = getRoutesForSp(currentDepot, filterState.loop);
                var currentRoute = filterState.route;
                if (routes.indexOf(currentRoute) === -1) currentRoute = '';
                routeSel.innerHTML = '<option value="">All routes</option>' + routes.map(function (r) {
                  return '<option value="' + r + '"' + (r === currentRoute ? ' selected' : '') + '>' + r + '</option>';
                }).join('');
              } else {
                routeWrap.classList.add('hidden');
                routeWrap.setAttribute('aria-hidden', 'true');
                filterState.route = '';
              }
            }
          } else {
            loopWrap.classList.add('hidden');
            loopWrap.setAttribute('aria-hidden', 'true');
            if (routeWrap) { routeWrap.classList.add('hidden'); routeWrap.setAttribute('aria-hidden', 'true'); }
            filterState.loop = '';
            filterState.route = '';
          }
        }
      }

      if (!spName) {
        document.getElementById('spNotFound').classList.remove('hidden');
        document.querySelector('.sidebar-inset').style.display = 'none';
        var fw = document.getElementById('spDashboardFoldersBlock');
        if (fw) fw.style.display = 'none';
      } else {
        document.getElementById('welcomeMsg').textContent = 'Welcome, ' + spName + '. Here is your operations summary.';
        document.getElementById('spHeaderName').textContent = spName;
        document.getElementById('spHeaderPill').setAttribute('title', spName);
        var logoMap = { 'BA Express': 'ba-express-logo.png', 'Premier Logistics Ltd': 'premier-logistics-logo.png', 'Swift Haul Solutions': 'swift-haul-logo.png', 'Metro Freight Partners': 'metro-freight-logo.png', 'Atlas Transport Services': 'atlas-transport-logo.png' };
        var avatar = document.getElementById('spHeaderAvatar');
        if (avatar && logoMap[spName]) { avatar.src = '../assets/' + logoMap[spName]; avatar.alt = spName; avatar.style.display = 'block'; }
        appendSpToLinks();
      }

      function filterVendors() {
        var list = vendors.filter(function (v) { return v.serviceProvider === spName && v.status === 'Active'; });
        if (filterState.depot) list = list.filter(function (v) { return v.depot === filterState.depot; });
        return list;
      }
      function filterVehicles() {
        var list = vehicles.filter(function (v) { return v.serviceProvider === spName; });
        if (filterState.depot) list = list.filter(function (v) { return v.depot === filterState.depot; });
        return list;
      }
      function aggregateContracts() {
        var totalLoops = 0, totalRoutes = 0, totalStops = 0, totalDeliveries = 0, sumDel = 0, countDel = 0;
        contracts.forEach(function (c) {
          if (c.serviceProvider !== spName) return;
          (c.depots || []).forEach(function (d) {
            if (filterState.depot && d.name !== filterState.depot) return;
            (d.loops || []).forEach(function (l) {
              if (filterState.loop && l.name !== filterState.loop) return;
              totalLoops++;
              (l.routes || []).forEach(function (r) {
                if (filterState.route && r.name !== filterState.route) return;
                totalRoutes++;
                if (r.postcodes && Array.isArray(r.postcodes)) totalStops += r.postcodes.length;
                totalDeliveries += Math.floor(Number(r.deliveries) || (r.postcodes && r.postcodes.length) || 0);
                if (r.targetDel != null) { sumDel += r.targetDel; countDel++; }
              });
            });
          });
        });
        return { loops: totalLoops, routes: totalRoutes, totalStops: totalStops, totalDeliveries: totalDeliveries };
      }

      function getValidityStatus(dateStr, monthsValidity) {
        if (!dateStr) return 'expired';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'expired';
        var exp = new Date(d);
        exp.setMonth(exp.getMonth() + monthsValidity);
        var now = new Date();
        var warn = new Date(now);
        warn.setMonth(warn.getMonth() + 3);
        if (exp < now) return 'expired';
        if (exp < warn) return 'expiring';
        return 'ok';
      }
      function getDirectExpiryStatus(dateStr) {
        if (!dateStr) return 'ok';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'ok';
        var now = new Date();
        var warn = new Date(now);
        warn.setMonth(warn.getMonth() + 3);
        if (d < now) return 'expired';
        if (d < warn) return 'expiring';
        return 'ok';
      }
      function formatDate(dateStr) {
        if (!dateStr) return '—';
        var parts = String(dateStr).split('-');
        if (parts.length >= 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
        return dateStr;
      }
      function escapeHtml(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
      }

      function hasNoTechnicalInfo(v) {
        var fields = ['wrappedVehicle', 'slamLock', 'camera', 'gps', 'bulkhead', 'doors270'];
        return fields.every(function (f) { return !v[f]; });
      }
      function getVehicleAgeYears(dateStr) {
        if (!dateStr) return 0;
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return 0;
        return (new Date() - d) / (365.25 * 24 * 60 * 60 * 1000);
      }

      function updateKPIs() {
        if (!spName) return;
        var filteredVendors = filterVendors();
        var agg = aggregateContracts();
        var summary = (data.dashboardSummary) || { spohR: 12.4 };
        var spohrVal = summary.spohR != null ? Math.round(summary.spohR * 10) / 10 : 0;

        var vals = { spr: agg.totalDeliveries || 0, spohr: spohrVal, routes: agg.routes || 0, stops: agg.totalStops || 0, vendors: filteredVendors.length, loops: agg.loops || 0 };
        ['kpiSpr', 'kpiSpohr', 'kpiTotalRoutes', 'kpiTotalStops', 'kpiVendors', 'kpiLoops'].forEach(function (id, i) {
          var el = document.getElementById(id);
          if (el) el.textContent = vals[['spr', 'spohr', 'routes', 'stops', 'vendors', 'loops'][i]];
        });
        ['modalKpiSpr', 'modalKpiSpohr', 'modalKpiTotalRoutes', 'modalKpiTotalStops', 'modalKpiVendors', 'modalKpiLoops'].forEach(function (id, i) {
          var el = document.getElementById(id);
          if (el) el.textContent = vals[['spr', 'spohr', 'routes', 'stops', 'vendors', 'loops'][i]];
        });
        var spFolderSprFixed = document.getElementById('spFolderKpiSprFixed');
        if (spFolderSprFixed) spFolderSprFixed.textContent = agg.totalDeliveries != null ? agg.totalDeliveries : 0;

        var grid = document.getElementById('kpiGrid');
        if (grid) grid.setAttribute('data-loading', 'false');
        var modalGrid = document.getElementById('modalKpiGrid');
        if (modalGrid) modalGrid.setAttribute('data-loading', 'false');
      }

      function updateCompliance() {
        if (!spName) return;
        var filtered = filterVendors();
        var courses = [
          { key: 'cargo', dateKey: 'cargoTrainingDate', expId: 'complianceCargoExpiring', expId2: 'complianceCargoExpired' },
          { key: 'dangerous', dateKey: 'dangerousGoodsTrainingDate', expId: 'complianceDangerousExpiring', expId2: 'complianceDangerousExpired' },
          { key: 'manual', dateKey: 'manualHandlingTrainingDate', expId: 'complianceManualExpiring', expId2: 'complianceManualExpired' }
        ];
        courses.forEach(function (c) {
          var expiring = [], expired = [];
          filtered.forEach(function (v) {
            var st = getValidityStatus(v[c.dateKey], 24);
            var name = (v.firstName || '') + ' ' + (v.lastName || '');
            if (st === 'expiring') expiring.push(name);
            if (st === 'expired') expired.push(name);
          });
          var htmlExp = expiring.length ? expiring.map(function (x, i) { return '<li class="list-group-item compliance-item" style="animation-delay:' + (i * 0.04) + 's">' + escapeHtml(x) + '</li>'; }).join('') : '<li class="list-group-item text-muted none">None</li>';
          var htmlExp2 = expired.length ? expired.map(function (x, i) { return '<li class="list-group-item compliance-item" style="animation-delay:' + (i * 0.04) + 's">' + escapeHtml(x) + '</li>'; }).join('') : '<li class="list-group-item text-muted none">None</li>';
          var elExp = document.getElementById(c.expId);
          var elExp2 = document.getElementById(c.expId2);
          if (elExp) elExp.innerHTML = htmlExp;
          if (elExp2) elExp2.innerHTML = htmlExp2;
          var modalExp = document.getElementById('modal' + c.expId.charAt(0).toUpperCase() + c.expId.slice(1));
          var modalExp2 = document.getElementById('modal' + c.expId2.charAt(0).toUpperCase() + c.expId2.slice(1));
          if (modalExp) modalExp.innerHTML = htmlExp;
          if (modalExp2) modalExp2.innerHTML = htmlExp2;
        });
      }

      function updateDriversDocs() {
        if (!spName) return;
        var filtered = filterVendors();
        var rows = [];
        filtered.forEach(function (v) {
          var name = (v.firstName || '') + ' ' + (v.lastName || '');
          var st = getValidityStatus(v.dvlaCheckDate, 6);
          if (st === 'expiring' || st === 'expired') rows.push({ vendor: v, name: name, document: 'DVLA Check', date: v.dvlaCheckDate, status: st });
          ['licenceExpiringDate', 'passportExpiringDate', 'visaValidity'].forEach(function (key) {
            if (!v[key]) return;
            var labels = { licenceExpiringDate: 'Licence', passportExpiringDate: 'Passport', visaValidity: 'Visa' };
            var st = getDirectExpiryStatus(v[key]);
            if (st === 'expiring' || st === 'expired') rows.push({ vendor: v, name: name, document: labels[key], date: v[key], status: st });
          });
        });
        var tbody = document.getElementById('modalDriversDocsBody');
        var emptyEl = document.getElementById('modalDriversDocsEmpty');
        if (!tbody) return;
        var rowHtml = rows.map(function (r) {
          var statusClass = r.status === 'expired' ? 'dashboard-status-expired' : 'dashboard-status-expiring';
          return '<tr><td><strong>' + escapeHtml(r.name) + '</strong></td><td>' + escapeHtml(r.vendor.depot || '—') + '</td><td>' + escapeHtml(r.document) + '</td><td>' + formatDate(r.date) + '</td><td><span class="dashboard-reason-badge ' + statusClass + '">' + (r.status === 'expired' ? 'Expired' : 'Expiring') + '</span></td></tr>';
        }).join('');
        if (rows.length === 0) {
          tbody.innerHTML = '';
          if (emptyEl) emptyEl.classList.remove('hidden');
          return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');
        tbody.innerHTML = rowHtml;
      }

      function updateVehicles() {
        if (!spName) return;
        var filtered = filterVehicles();
        var attention = filtered.filter(function (v) {
          var age = getVehicleAgeYears(v.registrationDate);
          var noTech = hasNoTechnicalInfo(v);
          return age >= 6 || noTech;
        });
        var rowHtmlShort = attention.map(function (v) {
          var age = getVehicleAgeYears(v.registrationDate);
          var noTech = hasNoTechnicalInfo(v);
          var reason = [];
          if (age >= 6) reason.push('6+ years');
          if (noTech) reason.push('No Technical Info');
          return '<tr><td><strong>' + escapeHtml(v.vrn || '—') + '</strong></td><td>' + escapeHtml(v.brand || '—') + '</td><td>' + escapeHtml(v.depot || '—') + '</td><td><span class="dashboard-reason-badge">' + escapeHtml(reason.join(' • ')) + '</span></td></tr>';
        }).join('');
        var rowHtmlFull = attention.map(function (v) {
          var age = getVehicleAgeYears(v.registrationDate);
          var noTech = hasNoTechnicalInfo(v);
          var reason = [];
          if (age >= 6) reason.push('6+ years');
          if (noTech) reason.push('No Technical Info');
          return '<tr><td><strong>' + escapeHtml(v.vrn || '—') + '</strong></td><td>' + escapeHtml(v.brand || '—') + '</td><td>' + escapeHtml(v.model || '—') + '</td><td>' + formatDate(v.registrationDate) + '</td><td>' + escapeHtml(v.depot || '—') + '</td><td><span class="dashboard-reason-badge">' + escapeHtml(reason.join(' • ')) + '</span></td></tr>';
        }).join('');
        var tbody = document.getElementById('vehiclesAttentionBody');
        var emptyEl = document.getElementById('vehiclesEmptyState');
        if (tbody) {
          if (attention.length === 0) { tbody.innerHTML = ''; } else { tbody.innerHTML = rowHtmlShort; }
        }
        if (emptyEl) emptyEl.classList.toggle('hidden', attention.length > 0);
        var modalBody = document.getElementById('modalVehiclesBody');
        var modalEmpty = document.getElementById('modalVehiclesEmpty');
        if (modalBody) {
          if (attention.length === 0) { modalBody.innerHTML = ''; } else { modalBody.innerHTML = rowHtmlFull; }
        }
        if (modalEmpty) modalEmpty.classList.toggle('hidden', attention.length > 0);
      }

      var currentFolderTab = 'lastday';
      function switchFolderTab(folderId) {
        currentFolderTab = folderId;
        var panels = { lastday: 'folder-panel-lastday', spms: 'folder-panel-spms' };
        var tabs = { lastday: 'folderLastDay', spms: 'folderSpms' };
        Object.keys(panels).forEach(function (id) {
          var panel = document.getElementById(panels[id]);
          var tab = document.getElementById(tabs[id]);
          var isActive = id === folderId;
          if (panel) {
            var isTabPane = panel.classList.contains('tab-pane');
            if (isTabPane) {
              panel.classList.toggle('show', isActive);
              panel.classList.toggle('active', isActive);
            } else {
              panel.classList.toggle('hidden', !isActive);
            }
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
          }
          if (tab) { tab.classList.toggle('active', isActive); tab.setAttribute('aria-selected', isActive ? 'true' : 'false'); }
        });
        if (folderId === 'lastday') updateLastDaySection();
        if (folderId === 'spms') updateSpmsSection();
        updateSpFolderDashboardStrip(folderId);
      }

      /** Dados para a strip Last Day (SPOH-R, SPR, STOPS, TW, AFD). */
      function getLastDayStripData() {
        var selDate = getCurrentViewDate();
        var data = selDate ? opmsDataByDate[selDate] : null;
        var spohr = (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.dashboardSummary && window.DHL_MOCK_DATA.dashboardSummary.spohR != null) ? window.DHL_MOCK_DATA.dashboardSummary.spohR : null;
        var routeFilter = ''; var loopFilter = null; var depotFilter = null;
        if (lastDayState.selected === 'all') { routeFilter = ''; loopFilter = null; depotFilter = null; }
        else if (lastDayState.selected.indexOf('|') !== -1) { depotFilter = lastDayState.selected.split('|')[0] || null; loopFilter = lastDayState.selected.split('|')[1] || null; }
        else if (getDepotsForSp().indexOf(lastDayState.selected) !== -1) { depotFilter = lastDayState.selected; }
        else { routeFilter = lastDayState.selected; }
        var registeredSet = getRegisteredRouteNamesSet();
        var details = getRegisteredRoutesWithDetails();
        var routeNamesInLoop = null; var routeNamesInDepot = null;
        if (loopFilter) { routeNamesInLoop = {}; details.forEach(function (rec) { if (rec.loop === loopFilter) routeNamesInLoop[rec.route] = true; }); }
        else if (depotFilter) { routeNamesInDepot = {}; details.forEach(function (rec) { if (rec.depot === depotFilter) routeNamesInDepot[rec.route] = true; }); }
        var counts = (data && data.counts) ? data.counts : {};
        if (data && data.byRoute && Object.keys(registeredSet).length > 0) {
          if (routeFilter && registeredSet[routeFilter]) {
            var detailsForRoute = details.filter(function (rec) { return rec.route === routeFilter; })[0];
            var preferredKey = detailsForRoute ? (detailsForRoute.depot + '|' + routeFilter) : null;
            for (var k in data.byRoute) {
              if (data.byRoute[k].route !== routeFilter) continue;
              if (preferredKey && k === preferredKey) { counts = data.byRoute[k].counts || {}; break; }
            }
          } else {
            var agg = { OK: 0, PU: 0, HN: 0 };
            Object.keys(data.byRoute).forEach(function (k) {
              var r = data.byRoute[k].route;
              if (!r || !registeredSet[r]) return;
              if (routeNamesInLoop && !routeNamesInLoop[r]) return;
              if (routeNamesInDepot && !routeNamesInDepot[r]) return;
              var routeCounts = data.byRoute[k].counts || {};
              Object.keys(routeCounts).forEach(function (c) { agg[c] = (agg[c] || 0) + (routeCounts[c] || 0); });
            });
            counts = agg;
          }
        }
        var metrics = getOpmsDeliveriesAndAfd(counts || {});
        var spr = metrics.deliveries;
        var afdPct = (metrics.deliveries > 0) ? (metrics.afd / metrics.deliveries) * 100 : 0;
        var afdStr = (Math.round(afdPct * 10) / 10) + '%';
        var twRaw = null;
        if (data && data.twByRoute && Object.keys(data.twByRoute).length) {
          twRaw = getWeightedTwAverage(data, routeNamesInLoop || routeNamesInDepot || null);
          if (twRaw == null) {
            var twVals = []; Object.keys(data.twByRoute).forEach(function (k) { var v = data.twByRoute[k]; if (v != null && !isNaN(v)) twVals.push(v <= 1 ? v * 100 : v); });
            if (twVals.length) { var s = 0; twVals.forEach(function (v) { s += v; }); twRaw = s / twVals.length; }
          }
        }
        var twStr = twRaw != null ? (twRaw <= 1 ? (Math.round(twRaw * 1000) / 10) : (Math.round(twRaw * 10) / 10)) + '%' : '—';
        var stopsVal = (data && (data.counts || (data.byRoute && Object.keys(data.byRoute).length))) ? metrics.deliveries : null;
        if (stopsVal == null) {
          var agg = aggregateContracts();
          stopsVal = agg.totalStops;
        }
        return { spohr: spohr != null ? (Math.round(spohr * 10) / 10) : '—', spr: spr, stops: stopsVal, tw: twStr, afd: afdStr };
      }
      function getSpmsStripData() {
        var selDate = getCurrentViewDate();
        var data = selDate ? opmsDataByDate[selDate] : null;
        var routeFilter = spmsState.selected; var loopFilter = null; var depotFilter = null;
        if (spmsState.selected === 'all') { routeFilter = ''; }
        else if (spmsState.selected.indexOf('|') !== -1) { loopFilter = spmsState.selected.split('|')[1]; depotFilter = spmsState.selected.split('|')[0]; routeFilter = ''; }
        else if (getDepotsForSp().indexOf(spmsState.selected) !== -1) { depotFilter = spmsState.selected; routeFilter = ''; }
        var details = getRegisteredRoutesWithDetails();
        var routeNamesInLoop = null; var routeNamesInDepot = null;
        if (loopFilter) { routeNamesInLoop = {}; details.forEach(function (r) { if (r.loop === loopFilter) routeNamesInLoop[r.route] = true; }); }
        if (depotFilter) { routeNamesInDepot = {}; details.forEach(function (r) { if (r.depot === depotFilter) routeNamesInDepot[r.route] = true; }); }
        var counts = (data && data.counts) ? data.counts : {};
        if (data && data.byRoute) {
          if (routeFilter && data.byRoute) {
            var dr = details.filter(function (r) { return r.route === routeFilter; })[0];
            var pk = dr ? (dr.depot + '|' + routeFilter) : null;
            for (var key in data.byRoute) {
              if (data.byRoute[key].route !== routeFilter) continue;
              if (pk && key === pk) { counts = data.byRoute[key].counts || {}; break; }
            }
          } else {
            var agg = { OK: 0, PU: 0, HN: 0 };
            var regSet = getRegisteredRouteNamesSet();
            Object.keys(data.byRoute).forEach(function (k) {
              var r = data.byRoute[k].route;
              if (!r || !regSet[r]) return;
              if (routeNamesInLoop && !routeNamesInLoop[r]) return;
              if (routeNamesInDepot && !routeNamesInDepot[r]) return;
              var rc = data.byRoute[k].counts || {};
              Object.keys(rc).forEach(function (c) { agg[c] = (agg[c] || 0) + (rc[c] || 0); });
            });
            counts = agg;
          }
        }
        var delOk = (counts['OK'] != null ? counts['OK'] : 0) + (counts['DEPAR'] != null ? counts['DEPAR'] : 0);
        var delPu = counts['PU'] || 0; var delHn = counts['HN'] || 0;
        var income = 0;
        var detailsList = getRegisteredRoutesWithDetails();
        if (routeFilter) {
          var depotForRate = ''; for (var key in (data && data.byRoute) || {}) { if (data.byRoute[key].route === routeFilter) { depotForRate = data.byRoute[key].depot || ''; break; } }
          var loopName = getLoopNameForDepotRoute(depotForRate, routeFilter);
          income = (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands && window.DHL_MOCK_DATA.digressiveBands[loopName]) ? calculateDigressiveIncome(delOk + delPu + delHn, loopName) : (delOk + delPu + delHn) * 2.90;
        } else if (data && data.byRoute && detailsList.length) {
          Object.keys(data.byRoute).forEach(function (key) {
            var rd = data.byRoute[key]; var r = rd.route; var depot = rd.depot;
            if (!getRegisteredRouteNamesSet()[r]) return;
            if (loopFilter && details.filter(function (x) { return x.loop === loopFilter; }).every(function (x) { return x.route !== r; })) return;
            if (depotFilter && depot !== depotFilter) return;
            var m = getOpmsDeliveriesAndAfd(rd.counts || {}); var loopName = getLoopNameForDepotRoute(depot, r);
            income += (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands && window.DHL_MOCK_DATA.digressiveBands[loopName]) ? calculateDigressiveIncome(m.deliveries, loopName) : m.deliveries * 2.90;
          });
        }
        var incomeStr = '£' + (income.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        var totalTarget = 0; detailsList.forEach(function (rec) {
          if (routeFilter && rec.route !== routeFilter) return;
          if (loopFilter && rec.loop !== loopFilter) return;
          if (depotFilter && rec.depot !== depotFilter) return;
          totalTarget += getTargetDelForDepotRoute(rec.depot, rec.route) || 0;
        });
        var delPctRaw = totalTarget > 0 ? ((delOk + delPu + delHn) / totalTarget) * 100 : 0;
        var pctStr = totalTarget ? (Math.round(delPctRaw * 10) / 10) + '%' : '—';
        return { del: delOk, pu: delPu, hn: delHn, income: incomeStr, pct: pctStr };
      }

      /** Atualiza a strip de KPIs do bloco Operations (Last Day | SPMS). SPR é sempre o bloco fixo. */
      function updateSpFolderDashboardStrip(folderId) {
        var agg = aggregateContracts();
        var elSprFixed = document.getElementById('spFolderKpiSprFixed');
        var lastdayIds = ['spFolderKpiLastDay1', 'spFolderKpiLastDay2', 'spFolderKpiLastDay3', 'spFolderKpiLastDay4'];
        var spmsIds = ['spFolderKpiSpms1', 'spFolderKpiSpms2', 'spFolderKpiSpms3', 'spFolderKpiSpms4', 'spFolderKpiSpms5'];
        lastdayIds.forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); });
        spmsIds.forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); });
        if (folderId === 'lastday') {
          var d = getLastDayStripData();
          if (elSprFixed) elSprFixed.textContent = d.spr != null ? d.spr : '—';
          lastdayIds.forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.remove('hidden'); });
          var elSpohr = document.getElementById('spFolderKpiSpohr');
          var elStopsL = document.getElementById('spFolderKpiStops');
          var elTw = document.getElementById('spFolderKpiTw');
          var elAfd = document.getElementById('spFolderKpiAfd');
          if (elSpohr) elSpohr.textContent = d.spohr != null ? d.spohr : '—';
          if (elStopsL) elStopsL.textContent = d.stops != null ? d.stops : '—';
          if (elTw) elTw.textContent = d.tw != null ? d.tw : '—';
          if (elAfd) elAfd.textContent = d.afd != null ? d.afd : '—';
        } else if (folderId === 'spms') {
          var s = getSpmsStripData();
          if (elSprFixed) elSprFixed.textContent = s.del != null ? s.del : '—';
          spmsIds.forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.remove('hidden'); });
          var elDel = document.getElementById('spFolderKpiDel');
          var elPu = document.getElementById('spFolderKpiPu');
          var elHn = document.getElementById('spFolderKpiHn');
          var elInc = document.getElementById('spFolderKpiIncome');
          var elPct = document.getElementById('spFolderKpiPct');
          if (elDel) elDel.textContent = s.del != null ? s.del : '—';
          if (elPu) elPu.textContent = s.pu != null ? s.pu : '—';
          if (elHn) elHn.textContent = s.hn != null ? s.hn : '—';
          if (elInc) elInc.textContent = s.income != null ? s.income : '—';
          if (elPct) elPct.textContent = s.pct != null ? s.pct : '—';
        }
      }

      var carouselIndex = 0;
      var carouselTotal = 3;
      function updateCarousel() {
        var track = document.getElementById('carouselTrack');
        if (track) track.style.transform = 'translateX(-' + (carouselIndex * 100) + '%)';
        var dots = document.getElementById('carouselDots');
        if (dots) dots.innerHTML = [0, 1, 2].map(function (i) { return '<button type="button" class="sp-carousel-dot' + (i === carouselIndex ? ' active' : '') + '" data-index="' + i + '" aria-label="Slide ' + (i + 1) + '"></button>'; }).join('');
      }
      function initCarousel() {
        if (!document.getElementById('carouselTrack')) return;
        var prev = document.getElementById('carouselPrev');
        var next = document.getElementById('carouselNext');
        var dotsWrap = document.getElementById('carouselDots');
        if (prev) prev.addEventListener('click', function () { carouselIndex = (carouselIndex - 1 + carouselTotal) % carouselTotal; updateCarousel(); });
        if (next) next.addEventListener('click', function () { carouselIndex = (carouselIndex + 1) % carouselTotal; updateCarousel(); });
        if (dotsWrap) dotsWrap.addEventListener('click', function (e) {
          var btn = e.target.closest('.sp-carousel-dot');
          if (btn && btn.dataset.index != null) { carouselIndex = parseInt(btn.dataset.index, 10); updateCarousel(); }
        });
        updateCarousel();
      }

      var modalCarouselIndex = 0;
      var modalCarouselInterval = null;
      var MODAL_SLIDES = 4;
      var MODAL_AUTO_INTERVAL_MS = 4500;

      function updateModalCarousel() {
        var track = document.getElementById('modalTrack');
        if (track) track.style.transform = 'translateX(-' + (modalCarouselIndex * 100) + '%)';
        var dotsWrap = document.getElementById('modalCategoryDots');
        if (dotsWrap) {
          var labels = ['KPIs', 'Compliance', 'Drivers', 'Vehicles'];
          dotsWrap.innerHTML = labels.map(function (label, i) {
            return '<button type="button" class="sp-modal-category-dot' + (i === modalCarouselIndex ? ' active' : '') + '" data-index="' + i + '" title="' + label + '">' + label + '</button>';
          }).join('');
        }
      }

      function startModalAutoCarousel() {
        stopModalAutoCarousel();
        modalCarouselInterval = setInterval(function () {
          modalCarouselIndex = (modalCarouselIndex + 1) % MODAL_SLIDES;
          updateModalCarousel();
        }, MODAL_AUTO_INTERVAL_MS);
      }

      function stopModalAutoCarousel() {
        if (modalCarouselInterval) { clearInterval(modalCarouselInterval); modalCarouselInterval = null; }
      }

      function openFullDashboardModal() {
        var modal = document.getElementById('fullDashboardModal');
        if (!modal) return;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        modalCarouselIndex = 0;
        updateModalCarousel();
        requestAnimationFrame(function () { requestAnimationFrame(function () { modal.classList.add('sp-full-dashboard-modal--open'); }); });
      }

      function closeFullDashboardModal() {
        var modal = document.getElementById('fullDashboardModal');
        if (!modal) return;
        modal.classList.remove('sp-full-dashboard-modal--open');
        stopModalAutoCarousel();
        setTimeout(function () {
          modal.classList.add('hidden');
          document.body.style.overflow = '';
        }, 280);
      }

      function initFullDashboardModal() {
        var openBtn = document.getElementById('openFullDashboardBtn');
        var closeBtn = document.getElementById('closeFullDashboardBtn');
        var backdrop = document.getElementById('fullDashboardModalBackdrop');
        if (openBtn) openBtn.addEventListener('click', openFullDashboardModal);
        if (closeBtn) closeBtn.addEventListener('click', closeFullDashboardModal);
        if (backdrop) backdrop.addEventListener('click', closeFullDashboardModal);
        var dotsEl = document.getElementById('modalCategoryDots');
        if (dotsEl) dotsEl.addEventListener('click', function (e) {
          var btn = e.target.closest('.sp-modal-category-dot');
          if (btn && btn.dataset.index != null) {
            modalCarouselIndex = parseInt(btn.dataset.index, 10);
            updateModalCarousel();
          }
        });
      }

      function getTimeWindowColor(pct) {
        if (pct > 90) return 'green';
        if (pct >= 80) return 'yellow';
        return 'red';
      }

      /** OPMS (Last Day): AFD = soma de TODOS os códigos da coluna Act Ckpt Code, exceto: OK, PU, HN, DEPAR, ARRVD. Sem outros cálculos. */
      var OPMS_AFD_EXCLUDED = ['OK', 'PU', 'HN', 'DEPAR', 'ARRVD'];
      var OPMS_DELIVERIES_CODES = ['PU', 'HN', 'OK'];
      var opmsDataByDate = loadOpmsStoredData();
      if (window.OPMS_EMBEDDED_DATA && typeof window.OPMS_EMBEDDED_DATA === 'object') {
        for (var d in window.OPMS_EMBEDDED_DATA) {
          if (window.OPMS_EMBEDDED_DATA.hasOwnProperty(d)) opmsDataByDate[d] = window.OPMS_EMBEDDED_DATA[d];
        }
      }

      /** Lookup TW por rota: tenta chave exata e chave normalizada (trim, espaços colapsados). */
      function getTwForRoute(twByRoute, routeName) {
        if (!twByRoute || routeName == null) return null;
        var r = String(routeName).replace(/\s+/g, ' ').trim();
        if (twByRoute[r] != null) return twByRoute[r];
        for (var k in twByRoute) {
          if (String(k).replace(/\s+/g, ' ').trim() === r) return twByRoute[k];
        }
        return null;
      }

      /** Média ponderada de TW por entregas (deliveries). data = { byRoute, twByRoute }. routeNamesSet = opcional objeto { routeName: true } para filtrar por loop/depot. */
      function getWeightedTwAverage(data, routeNamesSet) {
        if (!data || !data.twByRoute || !data.byRoute) return null;
        var sumTwDel = 0, sumDel = 0;
        Object.keys(data.byRoute).forEach(function (key) {
          var rec = data.byRoute[key];
          var routeName = rec && rec.route;
          if (!routeName) return;
          if (routeNamesSet && !routeNamesSet[routeName]) return;
          var tw = getTwForRoute(data.twByRoute, routeName);
          if (tw == null || typeof tw !== 'number' || isNaN(tw)) return;
          var counts = rec.counts || {};
          var del = getOpmsDeliveriesAndAfd(counts).deliveries || 0;
          if (del <= 0) return;
          sumTwDel += tw * del;
          sumDel += del;
        });
        if (sumDel <= 0) return null;
        return sumTwDel / sumDel;
      }

      /** AFD = soma de todos os códigos exceto OK, PU, HN, DEPAR, ARRVD. Deliveries = PU + HN + (OK ou DEPAR). Fontes PDF usam DEPAR em vez de OK. */
      function getOpmsDeliveriesAndAfd(counts) {
        counts = counts || {};
        var okOrDepar = (counts['OK'] != null && counts['OK'] > 0) ? counts['OK'] : (counts['DEPAR'] || 0);
        var deliveries = okOrDepar + (counts['PU'] || 0) + (counts['HN'] || 0);
        var excluded = {};
        OPMS_AFD_EXCLUDED.forEach(function (c) { excluded[c] = true; });
        excluded['DEPAR'] = true;
        var afd = 0;
        Object.keys(counts).forEach(function (c) {
          if (!excluded[c]) afd += (counts[c] || 0);
        });
        return { deliveries: deliveries, afd: afd };
      }

      var lastDayState = {
        dates: [],
        dateIndex: 0,
        selected: 'all',
        expanded: { all: true }
      };
      var spmsState = { selected: 'all', expanded: { all: true } };

      function getLastDayDates() {
        return Object.keys(opmsDataByDate).filter(function (d) {
          var day = opmsDataByDate[d];
          return (day.counts || day.byRoute || (day.twByRoute && Object.keys(day.twByRoute).length));
        }).sort().reverse();
      }

      function getCurrentViewDate() {
        if (lastDayState.dates.length === 0) return '';
        var i = Math.max(0, Math.min(lastDayState.dateIndex, lastDayState.dates.length - 1));
        return lastDayState.dates[i] || '';
      }

      function updateLastDaySection() {
        if (!spName) return;
        lastDayState.dates = getLastDayDates();
        if (lastDayState.dateIndex >= lastDayState.dates.length) lastDayState.dateIndex = Math.max(0, lastDayState.dates.length - 1);
        var selDate = getCurrentViewDate();
        var viewingDateEl = document.getElementById('lastDayViewingDate');
        var datePrevBtn = document.getElementById('lastDayDatePrev');
        var dateNextBtn = document.getElementById('lastDayDateNext');
        if (viewingDateEl) viewingDateEl.textContent = selDate ? formatDate(selDate) : '—';
        if (datePrevBtn) {
          datePrevBtn.disabled = lastDayState.dates.length === 0 || lastDayState.dateIndex <= 0;
          datePrevBtn.setAttribute('aria-disabled', datePrevBtn.disabled ? 'true' : 'false');
        }
        if (dateNextBtn) {
          dateNextBtn.disabled = lastDayState.dates.length === 0 || lastDayState.dateIndex >= lastDayState.dates.length - 1;
          dateNextBtn.setAttribute('aria-disabled', dateNextBtn.disabled ? 'true' : 'false');
        }
        var treeEl = document.getElementById('lastDayTree');
        var details = getRegisteredRoutesWithDetails();
        var loopsWithDepots = getLoopsWithDepotsForSp();
        var depotNames = [];
        var seenDepot = {};
        loopsWithDepots.forEach(function (x) {
          if (!seenDepot[x.depot]) { seenDepot[x.depot] = true; depotNames.push(x.depot); }
        });
        depotNames.sort();
        if (treeEl) {
          treeEl.innerHTML = '';
          var allLi = document.createElement('li');
          allLi.setAttribute('role', 'treeitem');
          allLi.setAttribute('aria-expanded', lastDayState.expanded.all ? 'true' : 'false');
          allLi.setAttribute('data-id', 'all');
          allLi.className = 'opms-tree-item opms-tree-item-all' + (lastDayState.selected === 'all' ? ' selected' : '');
          var allLabel = document.createElement('span');
          allLabel.className = 'opms-tree-label';
          allLabel.innerHTML = (lastDayState.expanded.all ? '<i class="bi bi-chevron-down opms-tree-icon"></i>' : '<i class="bi bi-chevron-right opms-tree-icon"></i>') + '<span>All</span>';
          allLi.appendChild(allLabel);
          allLi.addEventListener('click', function (e) {
            e.stopPropagation();
            lastDayState.expanded.all = !lastDayState.expanded.all;
            lastDayState.selected = 'all';
            updateLastDaySection();
          });
          treeEl.appendChild(allLi);
          if (lastDayState.expanded.all && depotNames.length) {
            var depotsUl = document.createElement('ul');
            depotsUl.setAttribute('role', 'group');
            depotsUl.className = 'opms-tree-children';
            depotNames.forEach(function (depotName) {
              var depotExpanded = !!lastDayState.expanded[depotName];
              var depotLoops = loopsWithDepots.filter(function (x) { return x.depot === depotName; });
              var depotLi = document.createElement('li');
              depotLi.setAttribute('role', 'treeitem');
              depotLi.setAttribute('aria-expanded', depotExpanded ? 'true' : 'false');
              depotLi.setAttribute('data-id', depotName);
              depotLi.className = 'opms-tree-item opms-tree-item-depot' + (lastDayState.selected === depotName ? ' selected' : '');
              var depotLabel = document.createElement('span');
              depotLabel.className = 'opms-tree-label';
              depotLabel.innerHTML = (depotExpanded ? '<i class="bi bi-chevron-down opms-tree-icon"></i>' : '<i class="bi bi-chevron-right opms-tree-icon"></i>') + '<span>' + escapeHtml(depotName) + '</span>';
              depotLi.appendChild(depotLabel);
              depotLi.addEventListener('click', function (e) {
                e.stopPropagation();
                lastDayState.expanded[depotName] = !lastDayState.expanded[depotName];
                lastDayState.selected = depotName;
                updateLastDaySection();
              });
              depotsUl.appendChild(depotLi);
              if (depotExpanded && depotLoops.length) {
                var loopsUl = document.createElement('ul');
                loopsUl.setAttribute('role', 'group');
                loopsUl.className = 'opms-tree-children';
                depotLoops.forEach(function (x) {
                  var loopKey = x.depot + '|' + x.loop;
                  var loopExpanded = !!lastDayState.expanded[loopKey];
                  var loopRoutes = details.filter(function (rec) { return rec.depot === x.depot && rec.loop === x.loop; }).map(function (r) { return r.route; }).sort();
                  var loopLi = document.createElement('li');
                  loopLi.setAttribute('role', 'treeitem');
                  loopLi.setAttribute('aria-expanded', loopExpanded ? 'true' : 'false');
                  loopLi.setAttribute('data-id', loopKey);
                  loopLi.className = 'opms-tree-item opms-tree-item-loop' + (lastDayState.selected === loopKey ? ' selected' : '');
                  var loopLabel = document.createElement('span');
                  loopLabel.className = 'opms-tree-label';
                  loopLabel.innerHTML = (loopExpanded ? '<i class="bi bi-chevron-down opms-tree-icon"></i>' : '<i class="bi bi-chevron-right opms-tree-icon"></i>') + '<span>' + escapeHtml(x.loop) + '</span>';
                  loopLi.appendChild(loopLabel);
                  loopLi.addEventListener('click', function (e) {
                    e.stopPropagation();
                    lastDayState.expanded[loopKey] = !lastDayState.expanded[loopKey];
                    lastDayState.selected = loopKey;
                    updateLastDaySection();
                  });
                  loopsUl.appendChild(loopLi);
                  if (loopExpanded && loopRoutes.length) {
                    var routesUl = document.createElement('ul');
                    routesUl.setAttribute('role', 'group');
                    routesUl.className = 'opms-tree-children opms-tree-routes';
                    loopRoutes.forEach(function (routeName) {
                      var routeLi = document.createElement('li');
                      routeLi.setAttribute('role', 'treeitem');
                      routeLi.setAttribute('data-route', routeName);
                      routeLi.className = 'opms-tree-item opms-tree-item-route' + (lastDayState.selected === routeName ? ' selected' : '');
                      var routeLabel = document.createElement('span');
                      routeLabel.className = 'opms-tree-label';
                      routeLabel.innerHTML = '<span class="opms-tree-route-name">' + escapeHtml(routeName) + '</span>';
                      routeLi.appendChild(routeLabel);
                      routeLi.addEventListener('click', function (e) {
                        e.stopPropagation();
                        lastDayState.selected = routeName;
                        updateLastDaySection();
                      });
                      routesUl.appendChild(routeLi);
                    });
                    loopLi.appendChild(routesUl);
                  }
                });
                depotLi.appendChild(loopsUl);
              }
            });
            allLi.appendChild(depotsUl);
          }
        }
        var routeFilter = '';
        var loopFilter = null;
        var depotFilter = null;
        if (lastDayState.selected === 'all') {
          routeFilter = '';
          loopFilter = null;
          depotFilter = null;
        } else if (lastDayState.selected.indexOf('|') !== -1) {
          routeFilter = '';
          loopFilter = lastDayState.selected.split('|')[1] || null;
          depotFilter = null;
        } else if (depotNames.indexOf(lastDayState.selected) !== -1) {
          routeFilter = '';
          loopFilter = null;
          depotFilter = lastDayState.selected;
        } else {
          routeFilter = lastDayState.selected;
          loopFilter = null;
          depotFilter = null;
        }
        renderLastDayDeliveriesTable(selDate, routeFilter, loopFilter, depotFilter);
        if (currentFolderTab === 'lastday') updateSpFolderDashboardStrip('lastday');
      }

      function renderLastDayDeliveriesTable(storeDate, routeFilter, loopFilter, depotFilter) {
        var tbody = document.getElementById('lastDayDeliveriesBody');
        var emptyEl = document.getElementById('lastDayDeliveriesEmpty');
        if (!tbody) return;
        var data = storeDate ? opmsDataByDate[storeDate] : null;
        var registeredSet = getRegisteredRouteNamesSet();
        var details = getRegisteredRoutesWithDetails();
        if (!data || !data.byRoute || Object.keys(data.byRoute).length === 0) {
          tbody.innerHTML = '';
          if (emptyEl) emptyEl.classList.remove('hidden');
          return;
        }
        var rows = [];
        Object.keys(data.byRoute).forEach(function (key) {
          var rec = data.byRoute[key];
          var r = rec.route; var depot = rec.depot || '';
          if (!r || !registeredSet[r]) return;
          if (routeFilter && r !== routeFilter) return;
          if (loopFilter) {
            var loopMatch = details.some(function (d) { return d.route === r && d.loop === loopFilter; });
            if (!loopMatch) return;
          }
          if (depotFilter && depot !== depotFilter) return;
          var loopName = '';
          details.forEach(function (d) { if (d.route === r && d.depot === depot) loopName = d.loop || ''; });
          var counts = rec.counts || {};
          var del = (counts['OK'] || 0) + (counts['DEPAR'] || 0);
          var pu = counts['PU'] || 0;
          var hn = counts['HN'] || 0;
          var stops = del + pu + hn;
          rows.push({ depot: depot, loop: loopName, route: r, del: del, pu: pu, hn: hn, stops: stops });
        });
        rows.sort(function (a, b) { return (a.depot + a.loop + a.route).localeCompare(b.depot + b.loop + b.route); });
        tbody.innerHTML = rows.map(function (row) {
          return '<tr><td>' + escapeHtml(row.depot) + '</td><td>' + escapeHtml(row.loop) + '</td><td>' + escapeHtml(row.route) + '</td><td class="text-end">' + row.del + '</td><td class="text-end">' + row.pu + '</td><td class="text-end">' + row.hn + '</td><td class="text-end">' + row.stops + '</td></tr>';
        }).join('');
        if (emptyEl) emptyEl.classList.toggle('hidden', rows.length > 0);
      }

      function renderLastDayGoals(storeDate, routeFilter, loopFilter, depotFilter) {
        return;
      }
      function _renderLastDayGoalsUnused(storeDate, routeFilter, loopFilter, depotFilter) {
        var wrap = document.getElementById('lastDayGoalsWrap');
        var emptyEl = document.getElementById('lastDayEmptyState');
        if (!wrap) return;
        var data = storeDate ? opmsDataByDate[storeDate] : null;
        var registeredSet = getRegisteredRouteNamesSet();
        var hasCounts = data && (data.counts || (data.byRoute && Object.keys(data.byRoute).length > 0));
        var hasTw = data && data.twByRoute && Object.keys(data.twByRoute).length > 0;
        if (!data || (!hasCounts && !hasTw)) {
          wrap.innerHTML = '';
          wrap.classList.remove('opms-goals-visible');
          if (emptyEl) emptyEl.classList.remove('hidden');
          var goalsRow = document.getElementById('spFolderGoalsRow');
          var perfSection = document.getElementById('opmsPerformanceSection');
          if (goalsRow) goalsRow.classList.add('hidden');
          if (perfSection) perfSection.classList.remove('opms-performance-block--goals-in-strip');
          return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');
        var counts = data.counts || {};
        var depotForRate = '';
        var routeNamesInLoop = null;
        var routeNamesInDepot = null;
        var details = getRegisteredRoutesWithDetails();
        if (loopFilter) {
          routeNamesInLoop = {};
          details.forEach(function (rec) {
            if (rec.loop === loopFilter) routeNamesInLoop[rec.route] = true;
          });
        } else if (depotFilter) {
          routeNamesInDepot = {};
          details.forEach(function (rec) {
            if (rec.depot === depotFilter) routeNamesInDepot[rec.route] = true;
          });
        }
        if (routeFilter && data.byRoute) {
          var detailsForRoute = details.filter(function (rec) { return rec.route === routeFilter; })[0];
          var preferredKey = detailsForRoute ? (detailsForRoute.depot + '|' + routeFilter) : null;
          var fallbackCounts = null;
          for (var k in data.byRoute) {
            if (data.byRoute[k].route !== routeFilter || !registeredSet[routeFilter]) continue;
            var routeCounts = data.byRoute[k].counts || {};
            if (preferredKey && k === preferredKey) {
              counts = routeCounts;
              depotForRate = data.byRoute[k].depot || '';
              break;
            }
            if (!fallbackCounts) fallbackCounts = routeCounts;
            depotForRate = data.byRoute[k].depot || '';
          }
          if (counts === data.counts && fallbackCounts) counts = fallbackCounts;
          if (routeFilter && !fallbackCounts && preferredKey && !data.byRoute[preferredKey]) counts = {};
        } else if (data.byRoute && Object.keys(registeredSet).length > 0) {
          var agg = { OK: 0, PU: 0, HN: 0 };
          Object.keys(data.byRoute).forEach(function (k) {
            var r = data.byRoute[k].route;
            if (!r || !registeredSet[r]) return;
            if (routeNamesInLoop && !routeNamesInLoop[r]) return;
            if (routeNamesInDepot && !routeNamesInDepot[r]) return;
            var routeCounts = data.byRoute[k].counts || {};
            Object.keys(routeCounts).forEach(function (c) {
              agg[c] = (agg[c] || 0) + (routeCounts[c] || 0);
            });
          });
          counts = agg;
        }
        counts = counts || {};
        var tableHtml = '';
        var circlesParts = [];
        if (hasCounts) {
          var metrics = getOpmsDeliveriesAndAfd(counts);
          /* Performance e Income foram movidos para a aba SPMS. Last Day mantém apenas AFD e Time Window. */
          /* AFD % = Act Failures per 100 deliveries. < 4% = verde, >= 4% = vermelho. */
          var afdPct = (metrics.deliveries > 0) ? (metrics.afd / metrics.deliveries) * 100 : 0;
          var afdOver4 = afdPct > 4;
          var afdColor = afdOver4 ? '#ef4444' : '#22c55e';
          var afdTrack = afdOver4 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)';
          var afdClass = 'opms-circle-afd' + (afdOver4 ? ' opms-circle-afd--over' : ' opms-circle-afd--ok');
          circlesParts.push(
            '<div class="opms-circle-item"><div class="opms-circle ' + afdClass + ' opms-progress-circle-wrap">' +
              '<div class="opms-progress-circle-inner">' +
              opmsProgressCircleSvg(afdPct, { progressColor: afdColor, trackColor: afdTrack, maxForOneLap: 6 }) +
              '<span class="opms-circle-value">' + (Math.round(afdPct * 10) / 10) + '%</span></div>' +
              '<span class="opms-circle-label">AFD (%)</span></div></div>'
          );
        }
        /* Time Window: sempre no bloco Performance. All = média do dia (só rotas com TW); Depot/Loop = média do depot/loop; Rota = valor da rota. */
        var twRaw = null;
        var twLabel = 'Time Window';
        if (hasTw && data.twByRoute) {
          if (routeFilter && registeredSet[routeFilter]) {
            twRaw = getTwForRoute(data.twByRoute, routeFilter);
            if (twRaw != null) twLabel = 'Time Window – ' + escapeHtml(routeFilter);
          } else if (loopFilter) {
            var loopRouteSet = {};
            details.forEach(function (rec) {
              if (rec.loop === loopFilter) loopRouteSet[rec.route] = true;
            });
            twRaw = getWeightedTwAverage(data, loopRouteSet);
            if (twRaw != null) twLabel = 'Time Window – Loop ' + escapeHtml(loopFilter);
            if (twRaw == null) {
              var twValuesLoop = [];
              details.forEach(function (rec) {
                if (rec.loop !== loopFilter) return;
                var v = getTwForRoute(data.twByRoute, rec.route);
                if (v != null) twValuesLoop.push(v);
              });
              if (twValuesLoop.length > 0) {
                var sumLoop = 0;
                twValuesLoop.forEach(function (v) { sumLoop += v; });
                twRaw = sumLoop / twValuesLoop.length;
                twLabel = 'Time Window – Loop ' + escapeHtml(loopFilter);
              }
            }
          } else if (depotFilter) {
            var depotRouteSet = {};
            details.forEach(function (rec) {
              if (rec.depot === depotFilter) depotRouteSet[rec.route] = true;
            });
            twRaw = getWeightedTwAverage(data, depotRouteSet);
            if (twRaw != null) twLabel = 'Time Window – Depot ' + escapeHtml(depotFilter);
            if (twRaw == null) {
              var twValuesDepot = [];
              details.forEach(function (rec) {
                if (rec.depot !== depotFilter) return;
                var v = getTwForRoute(data.twByRoute, rec.route);
                if (v != null) twValuesDepot.push(v);
              });
              if (twValuesDepot.length > 0) {
                var sumDepot = 0;
                twValuesDepot.forEach(function (v) { sumDepot += v; });
                twRaw = sumDepot / twValuesDepot.length;
                twLabel = 'Time Window – Depot ' + escapeHtml(depotFilter);
              }
            }
          } else {
            /* All: média do dia; rotas sem TW não entram na média */
            twRaw = getWeightedTwAverage(data, null);
            if (twRaw != null) twLabel = 'Time Window – média do dia';
            if (twRaw == null) {
              var twValuesAll = [];
              var twKeys = Object.keys(data.twByRoute);
              twKeys.forEach(function (k) {
                var val = data.twByRoute[k];
                if (val != null && typeof val === 'number' && !isNaN(val)) twValuesAll.push(val);
              });
              if (twValuesAll.length > 0) {
                var sumAll = 0;
                twValuesAll.forEach(function (v) { sumAll += v; });
                twRaw = sumAll / twValuesAll.length;
                twLabel = 'Time Window – média do dia';
              }
            }
          }
        }
        /* Círculo TW sempre visível: com valor ou placeholder (—) */
        var twDisplay = '—';
        var twForCircle = 0;
        var twColor = 'grey';
        var twStroke = '#94a3b8';
        if (twRaw != null && typeof twRaw === 'number' && Number.isFinite(twRaw)) {
          twForCircle = twRaw <= 1 ? twRaw * 100 : twRaw;
          twDisplay = (twRaw <= 1 ? (Math.round(twRaw * 1000) / 10) : (Math.round(twRaw * 1000) / 1000)) + '%';
          twColor = getTimeWindowColor(twForCircle);
          twStroke = twColor === 'green' ? '#22c55e' : twColor === 'yellow' ? '#eab308' : '#ef4444';
        }
        circlesParts.push(
          '<div class="opms-circle-item"><div class="opms-circle opms-circle-tw opms-circle-tw--' + twColor + ' opms-progress-circle-wrap">' +
            '<div class="opms-progress-circle-inner">' +
            opmsProgressCircleSvg(twForCircle, { progressColor: twStroke, trackColor: 'rgba(0,0,0,0.06)', maxForOneLap: 100 }) +
            '<span class="opms-circle-value">' + twDisplay + '</span></div>' +
            '<span class="opms-circle-label">' + twLabel + '</span></div></div>'
        );
        var circlesHtml = '<div class="last-day-goals-circles-wrap">' + circlesParts.join('') + '</div>';
        var twByRouteHtml = '';
        /* Time Window por rota: mostrar apenas quando uma rota está selecionada (ex.: DY1A → só TW da DY1A). */
        if (hasTw && data.twByRoute && routeFilter && registeredSet[routeFilter]) {
          var twValForRoute = getTwForRoute(data.twByRoute, routeFilter);
          if (twValForRoute != null && typeof twValForRoute === 'number' && !isNaN(twValForRoute)) {
            var pct = twValForRoute <= 1 ? twValForRoute * 100 : twValForRoute;
            var colorClass = getTimeWindowColor(pct);
            var displayVal = twValForRoute <= 1 ? (Math.round(twValForRoute * 1000) / 10) : (Math.round(twValForRoute * 10) / 10);
            twByRouteHtml = '<div class="opms-tw-by-route-wrap"><h4 class="opms-tw-by-route-title"><i class="bi bi-clock-history"></i> Time Window – ' + escapeHtml(routeFilter) + '</h4>' +
              '<div class="opms-tw-by-route-table-wrap"><table class="opms-tw-by-route-table" aria-label="Time Window % da rota">' +
              '<thead><tr><th>Rota</th><th>% TW Adh DL</th></tr></thead><tbody>' +
              '<tr><td class="opms-tw-route-name">' + escapeHtml(routeFilter) + '</td><td class="opms-tw-route-value opms-tw-route-value--' + colorClass + '">' + displayVal + '%</td></tr>' +
              '</tbody></table></div></div>';
          }
        }
        wrap.innerHTML = tableHtml + circlesHtml + twByRouteHtml;
        wrap.classList.add('opms-goals-visible');
      }

      function initLastDay() {
        var datePrevBtn = document.getElementById('lastDayDatePrev');
        var dateNextBtn = document.getElementById('lastDayDateNext');
        var datePickerBtn = document.getElementById('lastDayDatePicker');
        var dateDropdown = document.getElementById('lastDayDateDropdown');
        if (datePrevBtn) datePrevBtn.addEventListener('click', function () {
          if (lastDayState.dateIndex > 0) {
            lastDayState.dateIndex--;
            updateLastDaySection();
          }
        });
        if (dateNextBtn) dateNextBtn.addEventListener('click', function () {
          if (lastDayState.dateIndex < lastDayState.dates.length - 1) {
            lastDayState.dateIndex++;
            updateLastDaySection();
          }
        });
        function openDateDropdown() {
          if (!dateDropdown || !datePickerBtn) return;
          lastDayState.dates = getLastDayDates();
          dateDropdown.innerHTML = '';
          if (lastDayState.dates.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'opms-date-dropdown-option';
            empty.textContent = 'Nenhuma data disponível';
            empty.style.pointerEvents = 'none';
            empty.style.opacity = '0.7';
            dateDropdown.appendChild(empty);
          } else {
            lastDayState.dates.forEach(function (d, i) {
              var opt = document.createElement('button');
              opt.type = 'button';
              opt.className = 'opms-date-dropdown-option' + (i === lastDayState.dateIndex ? ' current' : '');
              opt.textContent = formatDate(d);
              opt.setAttribute('role', 'option');
              opt.setAttribute('data-index', String(i));
              opt.addEventListener('click', function () {
                lastDayState.dateIndex = i;
                dateDropdown.classList.add('hidden');
                datePickerBtn.setAttribute('aria-expanded', 'false');
                updateLastDaySection();
              });
              dateDropdown.appendChild(opt);
            });
          }
          dateDropdown.classList.remove('hidden');
          datePickerBtn.setAttribute('aria-expanded', 'true');
        }
        function closeDateDropdown() {
          if (dateDropdown) dateDropdown.classList.add('hidden');
          if (datePickerBtn) datePickerBtn.setAttribute('aria-expanded', 'false');
        }
        if (datePickerBtn && dateDropdown) {
          datePickerBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (dateDropdown.classList.contains('hidden')) openDateDropdown();
            else closeDateDropdown();
          });
        }
        document.addEventListener('click', function () {
          closeDateDropdown();
        });
        if (dateDropdown) {
          dateDropdown.addEventListener('click', function (e) {
            e.stopPropagation();
          });
        }
      }

      function initSpms() {
        var spmsPrevBtn = document.getElementById('spmsDatePrev');
        var spmsNextBtn = document.getElementById('spmsDateNext');
        var spmsPickerBtn = document.getElementById('spmsDatePicker');
        var spmsDropdown = document.getElementById('spmsDateDropdown');
        if (spmsPrevBtn) spmsPrevBtn.addEventListener('click', function () {
          if (lastDayState.dateIndex > 0) {
            lastDayState.dateIndex--;
            updateLastDaySection();
            updateSpmsSection();
          }
        });
        if (spmsNextBtn) spmsNextBtn.addEventListener('click', function () {
          if (lastDayState.dateIndex < lastDayState.dates.length - 1) {
            lastDayState.dateIndex++;
            updateLastDaySection();
            updateSpmsSection();
          }
        });
        function openSpmsDateDropdown() {
          if (!spmsDropdown || !spmsPickerBtn) return;
          lastDayState.dates = getLastDayDates();
          spmsDropdown.innerHTML = '';
          if (lastDayState.dates.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'opms-date-dropdown-option';
            empty.textContent = 'Nenhuma data disponível';
            empty.style.pointerEvents = 'none';
            empty.style.opacity = '0.7';
            spmsDropdown.appendChild(empty);
          } else {
            lastDayState.dates.forEach(function (d, i) {
              var opt = document.createElement('button');
              opt.type = 'button';
              opt.className = 'opms-date-dropdown-option' + (i === lastDayState.dateIndex ? ' current' : '');
              opt.textContent = formatDate(d);
              opt.setAttribute('role', 'option');
              opt.setAttribute('data-index', String(i));
              opt.addEventListener('click', function () {
                lastDayState.dateIndex = i;
                spmsDropdown.classList.add('hidden');
                spmsPickerBtn.setAttribute('aria-expanded', 'false');
                updateLastDaySection();
                updateSpmsSection();
              });
              spmsDropdown.appendChild(opt);
            });
          }
          spmsDropdown.classList.remove('hidden');
          spmsPickerBtn.setAttribute('aria-expanded', 'true');
        }
        function closeSpmsDateDropdown() {
          if (spmsDropdown) spmsDropdown.classList.add('hidden');
          if (spmsPickerBtn) spmsPickerBtn.setAttribute('aria-expanded', 'false');
        }
        if (spmsPickerBtn && spmsDropdown) {
          spmsPickerBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (spmsDropdown.classList.contains('hidden')) openSpmsDateDropdown();
            else closeSpmsDateDropdown();
          });
        }
        if (spmsDropdown) spmsDropdown.addEventListener('click', function (e) { e.stopPropagation(); });
      }

      /** Parse SPMS service item string: extrai HN (Handover), OK (Deliveries), PU (Pickups). DD e PD são somados ao OK. */
      function parseSpmsServiceItem(serviceItem) {
        var s = String(serviceItem || '');
        var hn = 0, ok = 0, pu = 0, dd = 0, pd = 0;
        var hnMatch = s.match(/(\d+)\s*x\s*HN\s*-/i) || s.match(/(\d+)\s*xHN/i);
        if (hnMatch) hn = parseInt(hnMatch[1], 10) || 0;
        var okMatch = s.match(/(\d+)\s*x\s*OK\b/i) || s.match(/(\d+)\s*xOK/i);
        if (okMatch) ok = parseInt(okMatch[1], 10) || 0;
        var ddMatch = s.match(/(\d+)\s*x\s*DD\b/i) || s.match(/(\d+)\s*xDD/i);
        if (ddMatch) dd = parseInt(ddMatch[1], 10) || 0;
        var pdMatch = s.match(/(\d+)\s*x\s*PD\b/i) || s.match(/(\d+)\s*xPD/i);
        if (pdMatch) pd = parseInt(pdMatch[1], 10) || 0;
        var puMatch = s.match(/(\d+)\s*x\s*PU\b/i) || s.match(/(\d+)\s*xPU/i);
        if (puMatch) pu = parseInt(puMatch[1], 10) || 0;
        return { hn: hn, ok: ok + dd + pd, pu: pu };
      }

      /** Remove "NxDaily Service Charge LOOP" e "NxDaily Electric Charge" do texto do Service item. */
      function formatSpmsServiceItemDisplay(serviceItem) {
        var s = String(serviceItem || '');
        s = s.replace(/\d*x\s*Daily\s+Service\s+Charge\s+LOOP/gi, '').replace(/\d*x\s*Daily\s+Electric\s+Charge/gi, '');
        s = s.replace(/,\s*,/g, ',').replace(/^\s*,\s*|\s*,\s*$/g, '').trim();
        return s || '—';
      }

      function updateSpmsSection() {
        if (!spName) return;
        lastDayState.dates = getLastDayDates();
        if (lastDayState.dateIndex >= lastDayState.dates.length) lastDayState.dateIndex = Math.max(0, lastDayState.dates.length - 1);
        var selDate = getCurrentViewDate();
        var spmsViewingEl = document.getElementById('spmsViewingDate');
        var spmsPrevBtn = document.getElementById('spmsDatePrev');
        var spmsNextBtn = document.getElementById('spmsDateNext');
        if (spmsViewingEl) spmsViewingEl.textContent = selDate ? formatDate(selDate) : '—';
        if (spmsPrevBtn) {
          spmsPrevBtn.disabled = lastDayState.dates.length === 0 || lastDayState.dateIndex <= 0;
          spmsPrevBtn.setAttribute('aria-disabled', spmsPrevBtn.disabled ? 'true' : 'false');
        }
        if (spmsNextBtn) {
          spmsNextBtn.disabled = lastDayState.dates.length === 0 || lastDayState.dateIndex >= lastDayState.dates.length - 1;
          spmsNextBtn.setAttribute('aria-disabled', spmsNextBtn.disabled ? 'true' : 'false');
        }
        var treeEl = document.getElementById('spmsTree');
        var details = getRegisteredRoutesWithDetails();
        var loopsWithDepots = getLoopsWithDepotsForSp();
        var depotNames = [];
        var seenDepot = {};
        loopsWithDepots.forEach(function (x) {
          if (!seenDepot[x.depot]) { seenDepot[x.depot] = true; depotNames.push(x.depot); }
        });
        depotNames.sort();
        if (treeEl) {
          treeEl.innerHTML = '';
          var allLi = document.createElement('li');
          allLi.setAttribute('role', 'treeitem');
          allLi.setAttribute('aria-expanded', spmsState.expanded.all ? 'true' : 'false');
          allLi.setAttribute('data-id', 'all');
          allLi.className = 'opms-tree-item opms-tree-item-all' + (spmsState.selected === 'all' ? ' selected' : '');
          var allLabel = document.createElement('span');
          allLabel.className = 'opms-tree-label';
          allLabel.innerHTML = (spmsState.expanded.all ? '<i class="bi bi-chevron-down opms-tree-icon"></i>' : '<i class="bi bi-chevron-right opms-tree-icon"></i>') + '<span>All</span>';
          allLi.appendChild(allLabel);
          allLi.addEventListener('click', function (e) {
            e.stopPropagation();
            spmsState.expanded.all = !spmsState.expanded.all;
            spmsState.selected = 'all';
            updateSpmsSection();
          });
          treeEl.appendChild(allLi);
          if (spmsState.expanded.all && depotNames.length) {
            var depotsUl = document.createElement('ul');
            depotsUl.setAttribute('role', 'group');
            depotsUl.className = 'opms-tree-children';
            depotNames.forEach(function (depotName) {
              var depotExpanded = !!spmsState.expanded[depotName];
              var depotLoops = loopsWithDepots.filter(function (x) { return x.depot === depotName; });
              var depotLi = document.createElement('li');
              depotLi.setAttribute('role', 'treeitem');
              depotLi.setAttribute('aria-expanded', depotExpanded ? 'true' : 'false');
              depotLi.setAttribute('data-id', depotName);
              depotLi.className = 'opms-tree-item opms-tree-item-depot' + (spmsState.selected === depotName ? ' selected' : '');
              var depotLabel = document.createElement('span');
              depotLabel.className = 'opms-tree-label';
              depotLabel.innerHTML = (depotExpanded ? '<i class="bi bi-chevron-down opms-tree-icon"></i>' : '<i class="bi bi-chevron-right opms-tree-icon"></i>') + '<span>' + escapeHtml(depotName) + '</span>';
              depotLi.appendChild(depotLabel);
              depotLi.addEventListener('click', function (e) {
                e.stopPropagation();
                spmsState.expanded[depotName] = !spmsState.expanded[depotName];
                spmsState.selected = depotName;
                updateSpmsSection();
              });
              depotsUl.appendChild(depotLi);
              if (depotExpanded && depotLoops.length) {
                var loopsUl = document.createElement('ul');
                loopsUl.setAttribute('role', 'group');
                loopsUl.className = 'opms-tree-children';
                depotLoops.forEach(function (x) {
                  var loopKey = x.depot + '|' + x.loop;
                  var loopExpanded = !!spmsState.expanded[loopKey];
                  var loopRoutes = details.filter(function (rec) { return rec.depot === x.depot && rec.loop === x.loop; }).map(function (r) { return r.route; }).sort();
                  var loopLi = document.createElement('li');
                  loopLi.setAttribute('role', 'treeitem');
                  loopLi.setAttribute('aria-expanded', loopExpanded ? 'true' : 'false');
                  loopLi.setAttribute('data-id', loopKey);
                  loopLi.className = 'opms-tree-item opms-tree-item-loop' + (spmsState.selected === loopKey ? ' selected' : '');
                  var loopLabel = document.createElement('span');
                  loopLabel.className = 'opms-tree-label';
                  loopLabel.innerHTML = (loopExpanded ? '<i class="bi bi-chevron-down opms-tree-icon"></i>' : '<i class="bi bi-chevron-right opms-tree-icon"></i>') + '<span>' + escapeHtml(x.loop) + '</span>';
                  loopLi.appendChild(loopLabel);
                  loopLi.addEventListener('click', function (e) {
                    e.stopPropagation();
                    spmsState.expanded[loopKey] = !spmsState.expanded[loopKey];
                    spmsState.selected = loopKey;
                    updateSpmsSection();
                  });
                  loopsUl.appendChild(loopLi);
                  if (loopExpanded && loopRoutes.length) {
                    var routesUl = document.createElement('ul');
                    routesUl.setAttribute('role', 'group');
                    routesUl.className = 'opms-tree-children opms-tree-routes';
                    loopRoutes.forEach(function (routeName) {
                      var routeLi = document.createElement('li');
                      routeLi.setAttribute('role', 'treeitem');
                      routeLi.setAttribute('data-route', routeName);
                      routeLi.className = 'opms-tree-item opms-tree-item-route' + (spmsState.selected === routeName ? ' selected' : '');
                      var routeLabel = document.createElement('span');
                      routeLabel.className = 'opms-tree-label';
                      routeLabel.innerHTML = '<span class="opms-tree-route-name">' + escapeHtml(routeName) + '</span>';
                      routeLi.appendChild(routeLabel);
                      routeLi.addEventListener('click', function (e) {
                        e.stopPropagation();
                        spmsState.selected = routeName;
                        updateSpmsSection();
                      });
                      routesUl.appendChild(routeLi);
                    });
                    loopLi.appendChild(routesUl);
                  }
                });
                depotLi.appendChild(loopsUl);
              }
            });
            allLi.appendChild(depotsUl);
          }
        }
        var routeFilter = '';
        var loopFilter = null;
        var depotFilter = null;
        if (spmsState.selected === 'all') {
          routeFilter = '';
          loopFilter = null;
          depotFilter = null;
        } else if (spmsState.selected.indexOf('|') !== -1) {
          loopFilter = spmsState.selected.split('|')[1] || null;
          depotFilter = spmsState.selected.split('|')[0] || null;
        } else if (depotNames.indexOf(spmsState.selected) !== -1) {
          depotFilter = spmsState.selected;
        } else {
          routeFilter = spmsState.selected;
        }
        var wrap = document.getElementById('spmsGoalsWrap');
        var data = selDate ? opmsDataByDate[selDate] : null;
        var registeredSet = getRegisteredRouteNamesSet();
        var hasCounts = data && (data.counts || (data.byRoute && Object.keys(data.byRoute).length > 0));
        var spmsKpiDelEl = document.getElementById('spmsKpiDel');
        var spmsKpiPuEl = document.getElementById('spmsKpiPu');
        var spmsKpiHnEl = document.getElementById('spmsKpiHn');
        var spmsKpiIncomeEl = document.getElementById('spmsKpiIncome');
        var spmsKpiPctEl = document.getElementById('spmsKpiPct');
        var spmsTbody = document.getElementById('spmsOverviewTbody');
        var spmsTfoot = document.getElementById('spmsOverviewTfoot');
        var spmsTableWrap = document.getElementById('spmsTableWrap');
        var spmsDashboardEmpty = document.getElementById('spmsDashboardEmpty');
        function setSpmsDashboardEmpty() {
          if (spmsKpiDelEl) spmsKpiDelEl.textContent = '—';
          if (spmsKpiPuEl) spmsKpiPuEl.textContent = '—';
          if (spmsKpiHnEl) spmsKpiHnEl.textContent = '—';
          if (spmsKpiIncomeEl) spmsKpiIncomeEl.textContent = '—';
          if (spmsKpiPctEl) spmsKpiPctEl.textContent = '—';
          var sa = document.getElementById('spmsAvgIncome');
          var sr = document.getElementById('spmsAvgRoute');
          if (sa) sa.textContent = '—';
          if (sr) sr.textContent = '—';
          if (spmsTbody) spmsTbody.innerHTML = '';
          if (spmsTfoot) spmsTfoot.innerHTML = '';
          if (spmsTableWrap) spmsTableWrap.classList.add('hidden');
          if (spmsDashboardEmpty) spmsDashboardEmpty.classList.remove('hidden');
        }
        if (!data || !hasCounts) {
          if (wrap) { wrap.innerHTML = ''; wrap.classList.remove('opms-goals-visible'); }
          setSpmsDashboardEmpty();
          return;
        }
        if (wrap) wrap.classList.add('opms-goals-visible');
        var counts = data.counts || {};
        var depotForRate = '';
        var routeNamesInLoop = null;
        var routeNamesInDepot = null;
        if (loopFilter) {
          routeNamesInLoop = {};
          details.forEach(function (rec) { if (rec.loop === loopFilter) routeNamesInLoop[rec.route] = true; });
        } else if (depotFilter) {
          routeNamesInDepot = {};
          details.forEach(function (rec) { if (rec.depot === depotFilter) routeNamesInDepot[rec.route] = true; });
        }
        if (routeFilter && data.byRoute) {
          var detailsForRoute = details.filter(function (rec) { return rec.route === routeFilter; })[0];
          var preferredKey = detailsForRoute ? (detailsForRoute.depot + '|' + routeFilter) : null;
          var fallbackCounts = null;
          for (var k in data.byRoute) {
            if (data.byRoute[k].route !== routeFilter || !registeredSet[routeFilter]) continue;
            var routeCounts = data.byRoute[k].counts || {};
            if (preferredKey && k === preferredKey) { counts = routeCounts; depotForRate = data.byRoute[k].depot || ''; break; }
            if (!fallbackCounts) fallbackCounts = routeCounts;
            depotForRate = data.byRoute[k].depot || '';
          }
          if (counts === data.counts && fallbackCounts) counts = fallbackCounts;
          if (routeFilter && !fallbackCounts && preferredKey && !data.byRoute[preferredKey]) counts = {};
        } else if (data.byRoute && Object.keys(registeredSet).length > 0) {
          var agg = { OK: 0, PU: 0, HN: 0 };
          Object.keys(data.byRoute).forEach(function (k) {
            var r = data.byRoute[k].route;
            if (!r || !registeredSet[r]) return;
            if (routeNamesInLoop && !routeNamesInLoop[r]) return;
            if (routeNamesInDepot && !routeNamesInDepot[r]) return;
            var routeCounts = data.byRoute[k].counts || {};
            Object.keys(routeCounts).forEach(function (c) { agg[c] = (agg[c] || 0) + (routeCounts[c] || 0); });
          });
          counts = agg;
        }
        counts = counts || {};
        var metrics = getOpmsDeliveriesAndAfd(counts);
        var rate = depotForRate ? getLoopDeliveryRateForDepotRoute(depotForRate, routeFilter || '') : 0;
        if (!rate && routeFilter && data.byRoute) {
          for (var key in data.byRoute) {
            if (data.byRoute[key].route === routeFilter) {
              rate = getLoopDeliveryRateForDepotRoute(data.byRoute[key].depot, routeFilter);
              break;
            }
          }
        }
        if (rate === 0) rate = 2.90;
        var targetDel = depotForRate && routeFilter ? getTargetDelForDepotRoute(depotForRate, routeFilter) : 0;
        if (!targetDel && routeFilter && data.byRoute) {
          for (var key in data.byRoute) {
            if (data.byRoute[key].route === routeFilter) {
              targetDel = getTargetDelForDepotRoute(data.byRoute[key].depot, routeFilter);
              break;
            }
          }
        }
        var totalTarget = targetDel;
        if (!routeFilter && details.length > 0) {
          totalTarget = 0;
          details.forEach(function (rec) {
            if (routeNamesInLoop && !routeNamesInLoop[rec.route]) return;
            if (routeNamesInDepot && !routeNamesInDepot[rec.route]) return;
            if (!registeredSet[rec.route]) return;
            totalTarget += rec.targetDel || 0;
          });
        }
        var delPctRaw = totalTarget > 0 ? (metrics.deliveries / totalTarget) * 100 : 100;
        var delOk = (counts['OK'] != null && counts['OK'] > 0) ? counts['OK'] : (counts['DEPAR'] || 0);
        var delPu = counts['PU'] || 0;
        var delHn = counts['HN'] || 0;
        var delTotal = delOk + delPu + delHn;
        var performanceHtml = '<div class="opms-circle-item opms-circle-item--rate"><div class="opms-circle opms-circle-rate opms-progress-circle-wrap">' +
          '<div class="opms-progress-circle-inner">' +
          opmsProgressCircleSvg(delPctRaw, { large: true, progressColor: '#22c55e', trackColor: 'rgba(34,197,94,0.2)', maxForOneLap: 100 }) +
          '<div class="opms-circle-rate-fields">' +
          '<span class="opms-circle-rate-row"><strong>DEL</strong> ' + delOk + '</span>' +
          '<span class="opms-circle-rate-row"><strong>PU</strong> ' + delPu + '</span>' +
          '<span class="opms-circle-rate-row"><strong>HN</strong> ' + delHn + '</span>' +
          '<span class="opms-circle-rate-row opms-circle-rate-total"><strong>Total</strong> ' + delTotal + '</span>' +
          '</div></div>' +
          '<span class="opms-circle-label">Performance (' + (totalTarget ? Math.round(delPctRaw * 10) / 10 + '%' : '—') + ')</span></div></div>';
        var loopForIncome = routeFilter && depotForRate ? getLoopNameForDepotRoute(depotForRate, routeFilter) : '';
        var calculatedIncome = (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands && window.DHL_MOCK_DATA.digressiveBands[loopForIncome])
          ? calculateDigressiveIncome(metrics.deliveries, loopForIncome)
          : (metrics.deliveries * rate);
        var excelIncome = 0;
        if (routeFilter && data.incomeByRouteFromExcel && data.incomeByRouteFromExcel[routeFilter] != null) {
          excelIncome = Number(data.incomeByRouteFromExcel[routeFilter]) || 0;
        } else if (data.incomeByRouteFromExcel && details.length > 0) {
          details.forEach(function (rec) {
            if (routeNamesInLoop && !routeNamesInLoop[rec.route]) return;
            if (routeNamesInDepot && !routeNamesInDepot[rec.route]) return;
            if (!registeredSet[rec.route]) return;
            var v = data.incomeByRouteFromExcel[rec.route];
            if (v != null) excelIncome += Number(v) || 0;
          });
        }
        if (!routeFilter && data.byRoute && details.length > 0) {
          calculatedIncome = 0;
          details.forEach(function (rec) {
            if (routeNamesInLoop && !routeNamesInLoop[rec.route]) return;
            if (routeNamesInDepot && !routeNamesInDepot[rec.route]) return;
            if (!registeredSet[rec.route]) return;
            var key = rec.depot + '|' + rec.route;
            var routeData = data.byRoute[key];
            if (routeData && routeData.counts) {
              var m = getOpmsDeliveriesAndAfd(routeData.counts);
              var loopName = rec.loop || '';
              if (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands && window.DHL_MOCK_DATA.digressiveBands[loopName]) {
                calculatedIncome += calculateDigressiveIncome(m.deliveries, loopName);
              } else {
                calculatedIncome += m.deliveries * (rec.deliveryRate || 2.90);
              }
            }
          });
        }
        var expectedIncome = excelIncome;
        if (expectedIncome <= 0 && details.length > 0) {
          expectedIncome = 0;
          details.forEach(function (rec) {
            if (routeNamesInLoop && !routeNamesInLoop[rec.route]) return;
            if (routeNamesInDepot && !routeNamesInDepot[rec.route]) return;
            if (!registeredSet[rec.route]) return;
            var td = rec.targetDel || 0;
            var loopName = rec.loop || '';
            if (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands && window.DHL_MOCK_DATA.digressiveBands[loopName]) {
              expectedIncome += calculateDigressiveIncome(td, loopName);
            } else {
              expectedIncome += td * (rec.deliveryRate || 2.90);
            }
          });
        }
        var incomePct = expectedIncome > 0 ? (calculatedIncome / expectedIncome) * 100 : 100;
        var incomeFormatted = '£' + (calculatedIncome.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        var incomePctDisplay = (Math.round(incomePct * 10) / 10) + '%';
        var incomeHtml = '<div class="opms-circle-item"><div class="opms-circle opms-circle-income opms-progress-circle-wrap">' +
          '<div class="opms-progress-circle-inner">' +
          opmsProgressCircleSvg(incomePct, { progressColor: '#6366f1', trackColor: 'rgba(99,102,241,0.2)', maxForOneLap: 100 }) +
          '<div class="opms-circle-income-values">' +
          '<span class="opms-circle-value">' + incomeFormatted + '</span>' +
          '<span class="opms-circle-income-pct">' + incomePctDisplay + '</span></div></div>' +
          '<span class="opms-circle-label">Income (GBP)</span></div></div>';
        var goalsCirclesHtml = '<div class="last-day-goals-circles-wrap">' + performanceHtml + incomeHtml + '</div>';
        if (wrap) wrap.innerHTML = goalsCirclesHtml;
        if (spmsKpiDelEl) spmsKpiDelEl.textContent = delOk;
        if (spmsKpiPuEl) spmsKpiPuEl.textContent = delPu;
        if (spmsKpiHnEl) spmsKpiHnEl.textContent = delHn;
        if (spmsKpiIncomeEl) spmsKpiIncomeEl.textContent = incomeFormatted;
        if (spmsKpiPctEl) spmsKpiPctEl.textContent = totalTarget ? (Math.round(delPctRaw * 10) / 10) + '%' : '—';
        var rowsToShow = [];
        if (data.byRoute && details.length > 0) {
          details.forEach(function (rec) {
            if (!registeredSet[rec.route]) return;
            if (routeNamesInLoop && !routeNamesInLoop[rec.route]) return;
            if (routeNamesInDepot && !routeNamesInDepot[rec.route]) return;
            if (routeFilter && rec.route !== routeFilter) return;
            var key = rec.depot + '|' + rec.route;
            var routeData = data.byRoute[key];
            if (!routeData || !routeData.counts) return;
            var m = getOpmsDeliveriesAndAfd(routeData.counts);
            var rOk = (routeData.counts['OK'] != null && routeData.counts['OK'] > 0) ? routeData.counts['OK'] : (routeData.counts['DEPAR'] || 0);
            var rPu = routeData.counts['PU'] || 0;
            var rHn = routeData.counts['HN'] || 0;
            var loopName = rec.loop || getLoopNameForDepotRoute(rec.depot, rec.route) || '';
            var rRate = (rec.deliveryRate != null) ? rec.deliveryRate : getLoopDeliveryRateForDepotRoute(rec.depot, rec.route) || 2.90;
            var rIncome = (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands && window.DHL_MOCK_DATA.digressiveBands[loopName])
              ? calculateDigressiveIncome(m.deliveries, loopName)
              : (m.deliveries * rRate);
            var rTarget = rec.targetDel || 0;
            var rPct = rTarget > 0 ? (m.deliveries / rTarget) * 100 : (m.deliveries ? 100 : 0);
            rowsToShow.push({
              depot: rec.depot || '—',
              loop: loopName || '—',
              route: rec.route,
              del: rOk,
              pu: rPu,
              hn: rHn,
              income: rIncome,
              pct: rPct
            });
          });
        }
        rowsToShow.sort(function (a, b) {
          var c = (a.depot || '').localeCompare(b.depot || '');
          if (c !== 0) return c;
          c = (a.loop || '').localeCompare(b.loop || '');
          if (c !== 0) return c;
          return (a.route || '').localeCompare(b.route || '');
        });
        if (spmsTbody) {
          spmsTbody.innerHTML = rowsToShow.map(function (r) {
            var incStr = '£' + (r.income.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            var pctStr = r.pct ? (Math.round(r.pct * 10) / 10) + '%' : '—';
            return '<tr><td>' + escapeHtml(r.depot) + '</td><td>' + escapeHtml(r.loop) + '</td><td>' + escapeHtml(r.route) + '</td>' +
              '<td class="text-end">' + r.del + '</td><td class="text-end">' + r.pu + '</td><td class="text-end">' + r.hn + '</td>' +
              '<td class="text-end">' + incStr + '</td><td class="text-end">' + pctStr + '</td></tr>';
          }).join('');
        }
        if (spmsTfoot && rowsToShow.length > 0) {
          var totDel = 0, totPu = 0, totHn = 0, totIncome = 0;
          rowsToShow.forEach(function (r) {
            totDel += r.del;
            totPu += r.pu;
            totHn += r.hn;
            totIncome += r.income;
          });
          var totIncStr = '£' + (totIncome.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          spmsTfoot.innerHTML = '<tr><td colspan="3"><strong>Total</strong></td><td class="text-end">' + totDel + '</td><td class="text-end">' + totPu + '</td><td class="text-end">' + totHn + '</td><td class="text-end">' + totIncStr + '</td><td class="text-end">—</td></tr>';
        } else if (spmsTfoot) {
          spmsTfoot.innerHTML = '';
        }
        var routeCount = rowsToShow.length;
        var avgIncome = routeCount > 0 ? calculatedIncome / routeCount : 0;
        var avgRouteDel = routeCount > 0 ? (delOk + delPu + delHn) / routeCount : 0;
        var spmsAvgIncomeEl = document.getElementById('spmsAvgIncome');
        var spmsAvgRouteEl = document.getElementById('spmsAvgRoute');
        if (spmsAvgIncomeEl) spmsAvgIncomeEl.textContent = routeCount > 0 ? '£' + (avgIncome.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '—';
        if (spmsAvgRouteEl) spmsAvgRouteEl.textContent = routeCount > 0 ? (Math.round(avgRouteDel * 10) / 10) : '—';
        if (spmsTableWrap) spmsTableWrap.classList.remove('hidden');
        if (spmsDashboardEmpty) spmsDashboardEmpty.classList.add('hidden');
        if (currentFolderTab === 'spms') updateSpFolderDashboardStrip('spms');
      }

      var dailyOpsFilteredList = [];
      var dailyOpsIndex = 0;
      var dailyOpsInterval = null;
      var DAILY_OPS_AUTO_MS = 4500;

      var NOTIFICATION_TYPE_ICONS = {
        delay: 'clock-history',
        delivery_done: 'check-circle',
        problem: 'exclamation-triangle',
        route_change: 'signpost-2',
        vehicle_issue: 'truck',
        driver_alert: 'person',
        alert: 'megaphone-fill',
        info: 'info-circle'
      };
      function getIconForNotification(n) {
        if (n.type && NOTIFICATION_TYPE_ICONS[n.type]) return NOTIFICATION_TYPE_ICONS[n.type];
        if (n.icon) return n.icon;
        return 'bell';
      }

      function getDailyOpsTimeText(n) {
        var m = n.timeAgoMinutes || 0;
        return m <= 60 ? m + ' min ago' : Math.floor(m / 60) + ' h ago';
      }

      function renderDailyOpsItem(n) {
        var timeText = getDailyOpsTimeText(n);
        var icon = getIconForNotification(n);
        return '<div class="sp-daily-ops-item sp-daily-ops-item--' + (n.severity || 'info') + '" role="listitem">' +
          '<span class="sp-daily-ops-item-icon"><i class="bi bi-' + icon + '"></i></span>' +
          '<div class="sp-daily-ops-item-body">' +
          '<p class="sp-daily-ops-item-msg">' + escapeHtml(n.message) + '</p>' +
          '<span class="sp-daily-ops-item-time">' + escapeHtml(timeText) + '</span>' +
          '</div></div>';
      }

      function renderDailyOpsSlide() {
        var slideEl = document.getElementById('dailyOpsSlide');
        var dotsEl = document.getElementById('dailyOpsDots');
        if (!slideEl || !dailyOpsFilteredList.length) return;
        var n = dailyOpsFilteredList[dailyOpsIndex];
        slideEl.innerHTML = renderDailyOpsItem(n);
        slideEl.classList.remove('hidden');
        if (dotsEl) {
          dotsEl.innerHTML = dailyOpsFilteredList.map(function (_, i) {
            return '<button type="button" class="sp-daily-ops-dot' + (i === dailyOpsIndex ? ' active' : '') + '" data-index="' + i + '" role="tab" aria-selected="' + (i === dailyOpsIndex) + '" aria-label="Notification ' + (i + 1) + ' of ' + dailyOpsFilteredList.length + '"></button>';
          }).join('');
        }
      }

      function goToDailyOpsIndex(index) {
        if (!dailyOpsFilteredList.length) return;
        var newIndex = (index + dailyOpsFilteredList.length) % dailyOpsFilteredList.length;
        var slideEl = document.getElementById('dailyOpsSlide');
        if (!slideEl) return;
        var direction = newIndex > dailyOpsIndex ? 1 : (newIndex < dailyOpsIndex ? -1 : 1);
        if (slideEl.classList.contains('sp-daily-ops-slide--exit')) {
          dailyOpsIndex = newIndex;
          renderDailyOpsSlide();
          startDailyOpsAutoAdvance();
          return;
        }
        slideEl.classList.add('sp-daily-ops-slide--exit', direction === 1 ? 'sp-daily-ops-slide--exit-next' : 'sp-daily-ops-slide--exit-prev');
        setTimeout(function () {
          dailyOpsIndex = newIndex;
          renderDailyOpsSlide();
          slideEl.classList.remove('sp-daily-ops-slide--exit', 'sp-daily-ops-slide--exit-next', 'sp-daily-ops-slide--exit-prev');
          slideEl.classList.add('sp-daily-ops-slide--enter', direction === 1 ? 'sp-daily-ops-slide--enter-from-right' : 'sp-daily-ops-slide--enter-from-left');
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              slideEl.classList.add('sp-daily-ops-slide--enter-active');
            });
          });
          setTimeout(function () {
            slideEl.classList.remove('sp-daily-ops-slide--enter', 'sp-daily-ops-slide--enter-from-right', 'sp-daily-ops-slide--enter-from-left', 'sp-daily-ops-slide--enter-active');
          }, 260);
          startDailyOpsAutoAdvance();
        }, 200);
      }

      function startDailyOpsAutoAdvance() {
        stopDailyOpsAutoAdvance();
        if (dailyOpsFilteredList.length <= 1) return;
        dailyOpsInterval = setInterval(function () {
          goToDailyOpsIndex(dailyOpsIndex + 1);
        }, DAILY_OPS_AUTO_MS);
      }

      function stopDailyOpsAutoAdvance() {
        if (dailyOpsInterval) { clearInterval(dailyOpsInterval); dailyOpsInterval = null; }
      }

      function openDailyOpsModal() {
        var modal = document.getElementById('dailyOpsModal');
        var listEl = document.getElementById('dailyOpsModalList');
        if (!modal || !listEl) return;
        listEl.innerHTML = dailyOpsFilteredList.map(function (n) { return renderDailyOpsItem(n); }).join('');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(function () { modal.classList.add('sp-daily-ops-modal--open'); });
      }

      function closeDailyOpsModal() {
        var modal = document.getElementById('dailyOpsModal');
        if (!modal) return;
        modal.classList.remove('sp-daily-ops-modal--open');
        setTimeout(function () {
          modal.classList.add('hidden');
          document.body.style.overflow = '';
        }, 220);
      }

      function updateDailyOpsSection() {
        var slideEl = document.getElementById('dailyOpsSlide');
        var feedEl = document.getElementById('dailyOpsFeed');
        var emptyEl = document.getElementById('dailyOpsEmpty');
        if (!slideEl) return;
        var notifications = (data.dailyOperationsNotifications) ? data.dailyOperationsNotifications : [];
        dailyOpsFilteredList = spName ? notifications.filter(function (n) { return n.serviceProvider === spName; }) : [];
        dailyOpsFilteredList.sort(function (a, b) { return (a.timeAgoMinutes || 0) - (b.timeAgoMinutes || 0); });
        dailyOpsIndex = 0;
        stopDailyOpsAutoAdvance();
        if (dailyOpsFilteredList.length === 0) {
          slideEl.innerHTML = '';
          slideEl.classList.add('hidden');
          if (feedEl) {
            feedEl.classList.remove('sp-daily-ops-feed--clickable');
            feedEl.classList.add('sp-daily-ops-feed--empty');
          }
          var dotsEl = document.getElementById('dailyOpsDots');
          if (dotsEl) dotsEl.innerHTML = '';
          if (emptyEl) emptyEl.classList.remove('hidden');
          return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');
        if (feedEl) {
          feedEl.classList.add('sp-daily-ops-feed--clickable');
          feedEl.classList.remove('sp-daily-ops-feed--empty');
        }
        renderDailyOpsSlide();
        startDailyOpsAutoAdvance();
      }

      function initDailyOpsModal() {
        var slideWrapEl = document.getElementById('dailyOpsSlideWrap');
        var prevBtn = document.getElementById('dailyOpsPrev');
        var nextBtn = document.getElementById('dailyOpsNext');
        var dotsEl = document.getElementById('dailyOpsDots');
        var backdrop = document.getElementById('dailyOpsModalBackdrop');
        var closeBtn = document.getElementById('dailyOpsModalClose');
        if (slideWrapEl) {
          slideWrapEl.addEventListener('click', function () {
            if (dailyOpsFilteredList.length > 0) openDailyOpsModal();
          });
          slideWrapEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (dailyOpsFilteredList.length > 0) openDailyOpsModal(); }
          });
        }
        if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); goToDailyOpsIndex(dailyOpsIndex - 1); });
        if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); goToDailyOpsIndex(dailyOpsIndex + 1); });
        if (dotsEl) dotsEl.addEventListener('click', function (e) {
          var btn = e.target.closest('.sp-daily-ops-dot[data-index]');
          if (btn && btn.dataset.index != null) { e.stopPropagation(); goToDailyOpsIndex(parseInt(btn.dataset.index, 10)); }
        });
        if (backdrop) backdrop.addEventListener('click', closeDailyOpsModal);
        if (closeBtn) closeBtn.addEventListener('click', closeDailyOpsModal);
      }

      function render() {
        var depotEl = document.getElementById('spFilterDepot');
        var loopEl = document.getElementById('spFilterLoop');
        var routeEl = document.getElementById('spFilterRoute');
        filterState.depot = depotEl ? depotEl.value : '';
        filterState.loop = loopEl ? loopEl.value : '';
        filterState.route = routeEl ? routeEl.value : '';
        updateDailyOpsSection();
        updateKPIs();
        updateLastDaySection();
        updateSpmsSection();
        lastDayState.dates = getLastDayDates();
        updateCompliance();
        updateDriversDocs();
        updateVehicles();
      }

      var discoState = { depot: '', loop: '' };

      function getDiscoDeliveries() {
        var data = window.DISCO_DATA;
        return (data && data.deliveries && Array.isArray(data.deliveries)) ? data.deliveries : [];
      }

      function getFilteredDiscoDeliveries() {
        var list = getDiscoDeliveries();
        var depot = (discoState.depot || '').trim();
        var loop = (discoState.loop || '').trim();
        if (!depot && !loop) return list;
        return list.filter(function (d) {
          if (depot && (d.depot || '').trim() !== depot) return false;
          if (loop && (d.loop || '').trim() !== loop) return false;
          return true;
        });
      }

      function getDiscoUniqueDepots() {
        var list = getDiscoDeliveries();
        var seen = {};
        list.forEach(function (d) {
          var v = (d.depot || '').trim();
          if (v) seen[v] = true;
        });
        return Object.keys(seen).sort();
      }

      /** Loops únicos: se houver depot selecionado, apenas loops desse depot; senão todos. */
      function getDiscoUniqueLoops() {
        var list = getDiscoDeliveries();
        var depot = (discoState.depot || '').trim();
        var seen = {};
        list.forEach(function (d) {
          if (depot && (d.depot || '').trim() !== depot) return;
          var v = (d.loop || '').trim();
          if (v) seen[v] = true;
        });
        return Object.keys(seen).sort();
      }

      function getRoutesWithStopsFromDeliveries(deliveries) {
        var byRoute = {};
        deliveries.forEach(function (d) {
          var r = (d.route || '').trim();
          if (r) byRoute[r] = (byRoute[r] || 0) + 1;
        });
        return Object.keys(byRoute).sort().map(function (route) {
          return { route: route, stops: byRoute[route] };
        });
      }

      function getRoutesWithSummary(deliveries) {
        var byRoute = {};
        deliveries.forEach(function (d) {
          var r = (d.route || '').trim();
          if (!r) return;
          if (!byRoute[r]) byRoute[r] = { route: r, stops: 0, pre12: 0, asr: 0, dsr: 0 };
          byRoute[r].stops += 1;
          if (d.pre12 === true) byRoute[r].pre12 += 1;
          if (d.asr === true) byRoute[r].asr += 1;
          if (d.dsr === true) byRoute[r].dsr += 1;
        });
        return Object.keys(byRoute).sort().map(function (route) { return byRoute[route]; });
      }

      function getDeliveriesForRoute(routeName) {
        return getFilteredDiscoDeliveries().filter(function (d) {
          return (d.route || '').trim() === routeName;
        });
      }

      /** HTML das listas Pre-12, ASR e DSR para um card de rota (tabela por categoria). */
      function getRoutePre12AsrDsrTableHtml(routeName) {
        var deliveries = getDeliveriesForRoute(routeName);
        var pre12 = deliveries.filter(function (d) { return d.pre12 === true; });
        var asr = deliveries.filter(function (d) { return d.asr === true; });
        var dsr = deliveries.filter(function (d) { return d.dsr === true; });
        function rowsHtml(list) {
          if (!list.length) return '<tr><td colspan="2" class="disco-list-empty">—</td></tr>';
          return list.map(function (d) {
            var pc = escapeHtml((d.subpostcode || '').trim());
            var addr = escapeHtml((d.address || '').trim());
            return '<tr><td class="disco-addr-postcode">' + pc + '</td><td class="disco-addr-address">' + addr + '</td></tr>';
          }).join('');
        }
        return '<div class="disco-route-detail-content">' +
          '<div class="disco-route-detail-lists">' +
            '<div class="disco-route-detail-list-block">' +
              '<h4 class="disco-route-detail-list-title">Pre-12</h4>' +
              '<div class="disco-route-detail-address-list">' +
                '<table class="disco-route-address-table"><tbody>' + rowsHtml(pre12) + '</tbody></table>' +
              '</div></div>' +
            '<div class="disco-route-detail-list-block">' +
              '<h4 class="disco-route-detail-list-title">ASR</h4>' +
              '<div class="disco-route-detail-address-list">' +
                '<table class="disco-route-address-table"><tbody>' + rowsHtml(asr) + '</tbody></table>' +
              '</div></div>' +
            '<div class="disco-route-detail-list-block">' +
              '<h4 class="disco-route-detail-list-title">DSR</h4>' +
              '<div class="disco-route-detail-address-list">' +
                '<table class="disco-route-address-table"><tbody>' + rowsHtml(dsr) + '</tbody></table>' +
              '</div></div>' +
          '</div></div>';
      }

      function updateSprKpi() {
        var el = document.getElementById('dashboardSprValue');
        if (!el) return;
        var list = getFilteredDiscoDeliveries();
        el.textContent = list.length;
      }

      function getDiscoGeneralSummary() {
        var list = getDiscoDeliveries();
        var totalDeliveries = list.length;
        var routes = {};
        var depots = {};
        var loops = {};
        var pre12 = 0, asr = 0, dsr = 0;
        list.forEach(function (d) {
          var r = (d.route || '').trim();
          if (r) routes[r] = true;
          var dep = (d.depot || '').trim();
          if (dep) depots[dep] = true;
          var lp = (d.loop || '').trim();
          if (lp) loops[lp] = true;
          if (d.pre12 === true) pre12 += 1;
          if (d.asr === true) asr += 1;
          if (d.dsr === true) dsr += 1;
        });
        return {
          totalDeliveries: totalDeliveries,
          totalRoutes: Object.keys(routes).length,
          depotsCount: Object.keys(depots).length,
          loopsCount: Object.keys(loops).length,
          pre12: pre12,
          asr: asr,
          dsr: dsr
        };
      }

      /** Resumo por loop para um depot: array de { loop, totalDeliveries, totalRoutes, pre12, asr, dsr }. */
      function getDiscoLoopSummary(depot) {
        var list = getDiscoDeliveries();
        var depotTrim = (depot || '').trim();
        var byLoop = {};
        list.forEach(function (d) {
          if ((d.depot || '').trim() !== depotTrim) return;
          var lp = (d.loop || '').trim();
          if (!lp) return;
          if (!byLoop[lp]) byLoop[lp] = { loop: lp, totalDeliveries: 0, routes: {}, pre12: 0, asr: 0, dsr: 0 };
          byLoop[lp].totalDeliveries += 1;
          var r = (d.route || '').trim();
          if (r) byLoop[lp].routes[r] = true;
          if (d.pre12 === true) byLoop[lp].pre12 += 1;
          if (d.asr === true) byLoop[lp].asr += 1;
          if (d.dsr === true) byLoop[lp].dsr += 1;
        });
        return Object.keys(byLoop).sort().map(function (lp) {
          var o = byLoop[lp];
          return {
            loop: o.loop,
            totalDeliveries: o.totalDeliveries,
            totalRoutes: Object.keys(o.routes).length,
            pre12: o.pre12,
            asr: o.asr,
            dsr: o.dsr
          };
        });
      }

      function escapeHtml(s) {
        if (s == null) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
      }

      function updateDiscoSection() {
        var depotChips = document.getElementById('discoDepotChips');
        var loopChips = document.getElementById('discoLoopChips');
        var routeBlocks = document.getElementById('discoRouteBlocks');
        var noData = document.getElementById('discoNoData');
        var deliveries = getDiscoDeliveries();
        updateSprKpi();
        if (!deliveries.length) {
          if (noData) noData.classList.remove('hidden');
          document.getElementById('dashboardSprValue') && (document.getElementById('dashboardSprValue').textContent = '—');
          if (depotChips) depotChips.innerHTML = '';
          if (loopChips) loopChips.innerHTML = '';
          if (routeBlocks) routeBlocks.innerHTML = '';
          document.getElementById('discoSummaryBlock') && document.getElementById('discoSummaryBlock').classList.add('hidden');
          document.getElementById('discoLoopSummaryBlock') && document.getElementById('discoLoopSummaryBlock').classList.add('hidden');
          return;
        }
        if (noData) noData.classList.add('hidden');
        var hasDepot = !!(discoState.depot || '').trim();
        var hasLoop = !!(discoState.loop || '').trim();
        var summaryBlock = document.getElementById('discoSummaryBlock');
        var loopSummaryBlock = document.getElementById('discoLoopSummaryBlock');
        var filtered = getFilteredDiscoDeliveries();
        var routesWithSummary = getRoutesWithSummary(filtered);

        /* Resumo geral: só quando nenhum depot está selecionado */
        if (summaryBlock) {
          if (!hasDepot) {
            summaryBlock.classList.remove('hidden');
            var summary = getDiscoGeneralSummary();
            var grid = document.getElementById('discoSummaryGrid');
            if (grid) {
              grid.innerHTML =
                '<div class="disco-summary-item">' +
                  '<span class="disco-summary-value">' + summary.totalDeliveries + '</span>' +
                  '<span class="disco-summary-label">Total entregas</span>' +
                '</div>' +
                '<div class="disco-summary-item">' +
                  '<span class="disco-summary-value">' + summary.totalRoutes + '</span>' +
                  '<span class="disco-summary-label">Rotas</span>' +
                '</div>' +
                '<div class="disco-summary-item">' +
                  '<span class="disco-summary-value">' + summary.depotsCount + '</span>' +
                  '<span class="disco-summary-label">Depots</span>' +
                '</div>' +
                '<div class="disco-summary-item">' +
                  '<span class="disco-summary-value">' + summary.loopsCount + '</span>' +
                  '<span class="disco-summary-label">Loops</span>' +
                '</div>' +
                '<div class="disco-summary-item">' +
                  '<span class="disco-summary-value">' + summary.pre12 + '</span>' +
                  '<span class="disco-summary-label">Pre-12</span>' +
                '</div>' +
                '<div class="disco-summary-item">' +
                  '<span class="disco-summary-value">' + summary.asr + '</span>' +
                  '<span class="disco-summary-label">ASR</span>' +
                '</div>' +
                '<div class="disco-summary-item">' +
                  '<span class="disco-summary-value">' + summary.dsr + '</span>' +
                  '<span class="disco-summary-label">DSR</span>' +
                '</div>';
            }
          } else {
            summaryBlock.classList.add('hidden');
          }
        }

        /* Resumo por loop: depot selecionado mas loop não */
        if (loopSummaryBlock) {
          if (hasDepot && !hasLoop) {
            loopSummaryBlock.classList.remove('hidden');
            var loopSummaryTitle = document.getElementById('discoLoopSummaryTitle');
            if (loopSummaryTitle) loopSummaryTitle.textContent = 'Loops do depot ' + escapeHtml(discoState.depot);
            var loopGrid = document.getElementById('discoLoopSummaryGrid');
            if (loopGrid) {
              var loopItems = getDiscoLoopSummary(discoState.depot);
              loopGrid.innerHTML = loopItems.map(function (item) {
                return '<div class="disco-route-block" data-loop="' + escapeHtml(item.loop) + '">' +
                  '<div class="disco-route-block-head">' +
                    '<span class="disco-route-block-name">' + escapeHtml(item.loop) + '</span>' +
                    '<span class="disco-route-block-stops">' + item.totalDeliveries + ' entregas</span>' +
                  '</div>' +
                  '<div class="disco-route-block-summary">' +
                    '<span class="disco-route-block-badge">Pre-12: ' + item.pre12 + '</span>' +
                    '<span class="disco-route-block-badge">ASR: ' + item.asr + '</span>' +
                    '<span class="disco-route-block-badge">DSR: ' + item.dsr + '</span>' +
                  '</div></div>';
              }).join('');
            }
          } else {
            loopSummaryBlock.classList.add('hidden');
          }
        }

        var depots = getDiscoUniqueDepots();
        var loops = getDiscoUniqueLoops();
        if (depotChips) {
          depotChips.innerHTML = '<button type="button" class="disco-chip' + (!discoState.depot ? ' active' : '') + '" data-depot="">Todos</button>' +
            depots.map(function (d) {
              return '<button type="button" class="disco-chip' + (discoState.depot === d ? ' active' : '') + '" data-depot="' + escapeHtml(d) + '">' + escapeHtml(d) + '</button>';
            }).join('');
        }
        if (loopChips) {
          loopChips.innerHTML = '<button type="button" class="disco-chip' + (!discoState.loop ? ' active' : '') + '" data-loop="">Todos</button>' +
            loops.map(function (l) {
              return '<button type="button" class="disco-chip' + (discoState.loop === l ? ' active' : '') + '" data-loop="' + escapeHtml(l) + '">' + escapeHtml(l) + '</button>';
            }).join('');
        }

        /* Blocos de rotas: só quando depot e loop estão selecionados */
        if (routeBlocks) {
          if (hasDepot && hasLoop) {
            routeBlocks.classList.remove('hidden');
            routeBlocks.innerHTML = routesWithSummary.map(function (item) {
              return '<div class="disco-route-block" data-route="' + escapeHtml(item.route) + '">' +
                '<div class="disco-route-block-head">' +
                  '<span class="disco-route-block-name">' + escapeHtml(item.route) + '</span>' +
                  '<span class="disco-route-block-stops">' + item.stops + ' stops</span>' +
                '</div>' +
                '<div class="disco-route-block-summary">' +
                  '<span class="disco-route-block-badge">Pre-12: ' + item.pre12 + '</span>' +
                  '<span class="disco-route-block-badge">ASR: ' + item.asr + '</span>' +
                  '<span class="disco-route-block-badge">DSR: ' + item.dsr + '</span>' +
                '</div>' +
                getRoutePre12AsrDsrTableHtml(item.route) +
                '</div>';
            }).join('');
          } else {
            routeBlocks.classList.add('hidden');
            routeBlocks.innerHTML = '';
          }
        }

        depotChips && depotChips.querySelectorAll('.disco-chip').forEach(function (btn) {
            btn.addEventListener('click', function () {
            discoState.depot = (btn.getAttribute('data-depot') || '').trim();
            var loopsOfDepot = getDiscoUniqueLoops();
            if (discoState.loop && loopsOfDepot.indexOf(discoState.loop) === -1) discoState.loop = '';
            updateDiscoSection();
          });
        });
        loopChips && loopChips.querySelectorAll('.disco-chip').forEach(function (btn) {
          btn.addEventListener('click', function () {
            discoState.loop = (btn.getAttribute('data-loop') || '').trim();
            updateDiscoSection();
          });
        });
      }

      function initDisco() {
        var noData = document.getElementById('discoNoData');
        var deliveries = getDiscoDeliveries();
        if (!deliveries.length) {
          if (noData) noData.classList.remove('hidden');
          document.getElementById('dashboardSprValue') && (document.getElementById('dashboardSprValue').textContent = '—');
          document.getElementById('discoDepotChips') && (document.getElementById('discoDepotChips').innerHTML = '');
          document.getElementById('discoLoopChips') && (document.getElementById('discoLoopChips').innerHTML = '');
          document.getElementById('discoRouteBlocks') && (document.getElementById('discoRouteBlocks').innerHTML = '');
          return;
        }
        updateDiscoSection();
      }

      if (spName) {
        render();
        var tabLastDay = document.getElementById('folderLastDay');
        var tabSpms = document.getElementById('folderSpms');
        if (tabLastDay) tabLastDay.addEventListener('click', function () { switchFolderTab('lastday'); });
        if (tabSpms) tabSpms.addEventListener('click', function () { switchFolderTab('spms'); });
        initLastDay();
        initSpms();
        switchFolderTab('lastday');
        initDailyOpsModal();
        initCarousel();
        if (document.getElementById('openFullDashboardBtn')) initFullDashboardModal();
      }
      initDisco();

      /* Subpostcodes a partir de postcodes (igual contracts.js): remove últimos 2 caracteres por código. */
      function postcodesToSubpostcodes(postcodes) {
        if (!postcodes || !postcodes.length) return [];
        var seen = {}, out = [];
        for (var i = 0; i < postcodes.length; i++) {
          var pc = String(postcodes[i]).trim().replace(/\s+/g, '');
          if (pc.length <= 2) continue;
          var sub = pc.slice(0, -2).trim();
          if (sub && !seen[sub]) { seen[sub] = true; out.push(sub); }
        }
        return out.sort();
      }

    })();
