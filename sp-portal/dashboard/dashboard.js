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

      /**
       * Income digressivo por loop: aplica as bands cadastradas no Contract Management
       * ao total de stops do loop (não por rota individualmente).
       * Band 1: stops 1..max1 × price1, Band 2: stops (max1+1)..max2 × price2, etc.
       */
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

      /**
       * Calcula income agregando stops por loop e aplicando as bands do Contract
       * Management ao total do loop (comportamento digressivo correcto).
       * getStops(rec) → número de stops para aquela rota.
       */
      function calcIncomeForLoops(detailsList, getStops, registeredSet, routeNamesInLoop, routeNamesInDepot) {
        var stopsByLoop = {};
        var rateByLoop  = {};
        detailsList.forEach(function (rec) {
          if (!registeredSet[rec.route]) return;
          if (routeNamesInLoop  && !routeNamesInLoop[rec.route])  return;
          if (routeNamesInDepot && !routeNamesInDepot[rec.route]) return;
          var stops = getStops(rec);
          if (!(stops > 0)) return;
          var ln = rec.loop || '__noloop__';
          stopsByLoop[ln] = (stopsByLoop[ln] || 0) + stops;
          if (!rateByLoop[ln]) rateByLoop[ln] = rec.deliveryRate || 2.90;
        });
        var income = 0;
        Object.keys(stopsByLoop).forEach(function (ln) {
          var stops = stopsByLoop[ln];
          var bands = window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands && window.DHL_MOCK_DATA.digressiveBands[ln];
          income += (bands && bands.length) ? calculateDigressiveIncome(stops, ln) : stops * (rateByLoop[ln] || 2.90);
        });
        return income;
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
        var welcomeEl = document.getElementById('welcomeMsg');
        if (welcomeEl) welcomeEl.textContent = 'Welcome, ' + spName + '. Here is your operations summary.';
        document.getElementById('spHeaderName').textContent = spName;
        document.getElementById('spHeaderPill').setAttribute('title', spName);
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
        var panels = { lastday: 'folder-panel-lastday', spms: 'folder-panel-spms', ld: 'folder-panel-ld' };
        var tabs = { lastday: 'folderLastDay', spms: 'folderSpms', ld: 'folderLd' };
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
        if (folderId === 'lastday') {
          opmsDeliveriesPageIndex = 0;
          var s = lastDayState.selected;
          if (s && s !== 'all' && s.indexOf('|') === -1 && getDepotsForSp().indexOf(s) === -1) {
            var rec = getRegisteredRoutesWithDetails().filter(function (r) { return r.route === s; })[0];
            if (rec) setOpmsFilter(rec.depot + '|' + rec.loop);
          }
          updateOpmsFilterChips();
          updateLastDaySection();
        }
        if (folderId === 'spms') updateSpmsSection();
        if (folderId === 'ld') { ldTablePageIndex = 0; updateLiquidationDamagesSection(); }
        var dateFilterWrap = document.getElementById('opmsDateFilterWrap');
        if (dateFilterWrap) dateFilterWrap.classList.toggle('hidden', folderId === 'ld');
        var stripEl = document.getElementById('spFolderDashboardStrip');
        if (stripEl) stripEl.classList.toggle('sfb-strip-hidden', folderId === 'spms');
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
        var twFilter = lastDayState.twFilter || 'all';
        var counts = (data && data.counts) ? data.counts : {};
        if (data && data.byRoute && Object.keys(registeredSet).length > 0) {
          if (routeFilter && registeredSet[routeFilter]) {
            if (routePassesTwFilter(data, routeFilter, twFilter)) {
              var detailsForRoute = details.filter(function (rec) { return rec.route === routeFilter; })[0];
              var preferredKey = detailsForRoute ? (detailsForRoute.depot + '|' + routeFilter) : null;
              for (var k in data.byRoute) {
                if (data.byRoute[k].route !== routeFilter) continue;
                if (preferredKey && k === preferredKey) { counts = data.byRoute[k].counts || {}; break; }
              }
            } else { counts = {}; }
          } else {
            var agg = { OK: 0, PU: 0, HN: 0 };
            Object.keys(data.byRoute).forEach(function (k) {
              var r = data.byRoute[k].route;
              if (!r || !registeredSet[r]) return;
              if (routeNamesInLoop && !routeNamesInLoop[r]) return;
              if (routeNamesInDepot && !routeNamesInDepot[r]) return;
              if (!routePassesTwFilter(data, r, twFilter)) return;
              var routeCounts = data.byRoute[k].counts || {};
              Object.keys(routeCounts).forEach(function (c) { agg[c] = (agg[c] || 0) + (routeCounts[c] || 0); });
            });
            counts = agg;
          }
        }
        var metrics = getOpmsDeliveriesAndAfd(counts || {});
        var spr = metrics.deliveries + metrics.afd;  /* SPR = Del + PU + HN + AFD */
        var afdPct = (metrics.deliveries > 0) ? (metrics.afd / metrics.deliveries) * 100 : 0;
        var afdStr = (Math.round(afdPct * 10) / 10) + '%';
        var twRaw = null;
        var routeSetForTw = routeNamesInLoop || routeNamesInDepot || null;
        if (twFilter !== 'all' && data && data.byRoute) {
          var twFilteredSet = {};
          Object.keys(data.byRoute).forEach(function (k) {
            var r = data.byRoute[k].route;
            if (!r || !registeredSet[r]) return;
            if (routeSetForTw && !routeSetForTw[r]) return;
            if (routePassesTwFilter(data, r, twFilter)) twFilteredSet[r] = true;
          });
          routeSetForTw = Object.keys(twFilteredSet).length ? twFilteredSet : null;
        }
        if (data && data.twByRoute && Object.keys(data.twByRoute).length) {
          twRaw = getWeightedTwAverage(data, routeSetForTw);
          if (twRaw == null && routeSetForTw && Object.keys(routeSetForTw).length) {
            var twVals = [];
            Object.keys(routeSetForTw).forEach(function (routeName) {
              var v = getTwForRoute(data.twByRoute, routeName);
              if (v != null && !isNaN(v)) twVals.push(v <= 1 ? v * 100 : v);
            });
            if (twVals.length) { var s = 0; twVals.forEach(function (v) { s += v; }); twRaw = s / twVals.length; }
          }
          if (twRaw == null) {
            var twValsAll = []; Object.keys(data.twByRoute).forEach(function (k) { var v = data.twByRoute[k]; if (v != null && !isNaN(v)) twValsAll.push(v <= 1 ? v * 100 : v); });
            if (twValsAll.length) { var s0 = 0; twValsAll.forEach(function (v) { s0 += v; }); twRaw = s0 / twValsAll.length; }
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
        var metrics = getOpmsDeliveriesAndAfd(counts || {});
        var delOk = (counts['OK'] != null ? counts['OK'] : 0) + (counts['DEPAR'] != null ? counts['DEPAR'] : 0);
        var delPu = counts['PU'] || 0; var delHn = counts['HN'] || 0;
        var spr = metrics.deliveries + metrics.afd;  /* SPR = Del + PU + HN + AFD */
        var income = 0;
        var detailsList = getRegisteredRoutesWithDetails();
        var regSetStrip = getRegisteredRouteNamesSet();
        if (routeFilter) {
          var depotForRate = '';
          for (var key in (data && data.byRoute) || {}) {
            if (data.byRoute[key].route === routeFilter) { depotForRate = data.byRoute[key].depot || ''; break; }
          }
          var loopForStrip = getLoopNameForDepotRoute(depotForRate, routeFilter);
          var bandsStrip = window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands && window.DHL_MOCK_DATA.digressiveBands[loopForStrip];
          income = bandsStrip ? calculateDigressiveIncome(delOk + delPu + delHn, loopForStrip) : (delOk + delPu + delHn) * 2.90;
        } else if (data && data.byRoute && detailsList.length) {
          // Agregar stops por loop e aplicar bands ao total do loop
          var rniLoop = routeNamesInLoop; var rniDepot = routeNamesInDepot;
          income = calcIncomeForLoops(detailsList, function (rec) {
            var rd = data.byRoute[rec.depot + '|' + rec.route];
            return rd && rd.counts ? getOpmsDeliveriesAndAfd(rd.counts).deliveries : 0;
          }, regSetStrip, rniLoop, rniDepot);
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
        return { del: delOk, pu: delPu, hn: delHn, spr: spr, income: incomeStr, pct: pctStr };
      }

      /** Atualiza a strip de KPIs do bloco Operations (Last Day | SPMS | LD). Total Deliveries/Income/Total primeiro. */
      function updateSpFolderDashboardStrip(folderId) {
        var elSprFixed = document.getElementById('spFolderKpiSprFixed');
        var elFirstLabel = document.getElementById('spFolderKpiFirstLabel');
        var lastdayIds = ['spFolderKpiLastDay1', 'spFolderKpiLastDay2', 'spFolderKpiLastDay3', 'spFolderKpiLastDay4'];
        var spmsIds = ['spFolderKpiSpms1', 'spFolderKpiSpms2', 'spFolderKpiSpms3', 'spFolderKpiSpms4', 'spFolderKpiSpms5'];
        var ldIds = ['spFolderKpiLd1', 'spFolderKpiLd2'];
        lastdayIds.forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); });
        spmsIds.forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); });
        ldIds.forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); });
        if (folderId === 'lastday') {
          if (elFirstLabel) elFirstLabel.textContent = 'Total Deliveries';
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
          if (elFirstLabel) elFirstLabel.textContent = 'Income';
          var s = getSpmsStripData();
          if (elSprFixed) elSprFixed.textContent = s.income != null ? s.income : '—';
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
        } else if (folderId === 'ld') {
          var ld = getLdStripData();
          if (elFirstLabel) elFirstLabel.textContent = 'Total Deductions';
          if (elSprFixed) elSprFixed.textContent = ld.total != null ? ld.total : '—';
          ldIds.forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.remove('hidden'); });
          var elLdCount = document.getElementById('spFolderKpiLdCount');
          var elLdPending = document.getElementById('spFolderKpiLdPending');
          if (elLdCount) elLdCount.textContent = ld.count != null ? ld.count : '—';
          if (elLdPending) elLdPending.textContent = ld.pending != null ? ld.pending : '—';
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

      function routePassesTwFilter(data, routeName, twFilter) {
        if (!twFilter || twFilter === 'all') return true;
        if (!data || !data.twByRoute) return false;
        var tw = getTwForRoute(data.twByRoute, routeName);
        if (tw == null || typeof tw !== 'number' || isNaN(tw)) return false;
        var pct = tw <= 1 ? tw * 100 : tw;
        return getTimeWindowColor(pct) === twFilter;
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
        twFilter: 'all',
        expanded: { all: true }
      };
      var spmsState = { selected: 'all', expanded: { all: true } };
      var ldState = { selected: 'all', expanded: { all: true } };
      var opmsDeliveriesPageIndex = 0;
      var ldTablePageIndex = 0;
      var OPMS_PAGE_SIZE = 10;
      var LD_PAGE_SIZE = 8;

      /** Mock liquidation damages data. Keys: date string (YYYY-MM-DD). Values: array of { awb, route, depot, loop, issueDate, issueDescription, amount, status }. */
      function getLiquidationDamagesData() {
        var byDate = (window.DHL_EMBEDDED_DATA && window.DHL_EMBEDDED_DATA.liquidationDamages) ? window.DHL_EMBEDDED_DATA.liquidationDamages : {};
        if (Object.keys(byDate).length) return byDate;
        var details = getRegisteredRoutesWithDetails();
        if (!details.length) return {};
        var now = new Date();
        var monthKey = getCurrentMonthKey();
        var year = now.getFullYear();
        var month = now.getMonth();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var sample = [
          { awb: 'DHL1234567890', route: details[0].route, depot: details[0].depot, loop: details[0].loop, issueDescription: 'Damaged goods on delivery', amount: 150, status: 'Pending' },
          { awb: 'DHL1234567891', route: details[0].route, depot: details[0].depot, loop: details[0].loop, issueDescription: 'Late delivery', amount: 75, status: 'Resolved' },
          { awb: 'DHL1234567892', route: details.length > 1 ? details[1].route : details[0].route, depot: details.length > 1 ? details[1].depot : details[0].depot, loop: details.length > 1 ? details[1].loop : details[0].loop, issueDescription: 'Missing package', amount: 200, status: 'Pending' }
        ];
        var out = {};
        for (var d = 1; d <= Math.min(5, daysInMonth); d++) {
          var dateStr = monthKey + '-' + String(d).padStart(2, '0');
          out[dateStr] = sample.map(function (s, j) {
            return { awb: s.awb + '-' + d, route: s.route, depot: s.depot, loop: s.loop, issueDate: dateStr, issueDescription: s.issueDescription, amount: s.amount + (d + j) * 10, status: (d + j) % 2 ? 'Pending' : 'Resolved' };
          });
        }
        return out;
      }

      function getCurrentMonthKey() {
        var d = new Date();
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        return y + '-' + m;
      }

      function getLiquidationDamagesRowsForCurrentMonth() {
        var ldData = getLiquidationDamagesData();
        var monthKey = getCurrentMonthKey();
        var rows = [];
        Object.keys(ldData).forEach(function (dateStr) {
          if (dateStr && dateStr.indexOf(monthKey) === 0) {
            var dayRows = ldData[dateStr];
            if (Array.isArray(dayRows)) dayRows.forEach(function (r) { rows.push(r); });
          }
        });
        return rows;
      }

      function formatMonthDisplay() {
        var d = new Date();
        return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      }

      function setOpmsFilter(value) {
        lastDayState.selected = value;
        spmsState.selected = value;
        ldState.selected = value;
      }

      function updateOpmsFilterChips() {
        var depotChipsEl = document.getElementById('opmsDepotChips');
        var loopChipsEl = document.getElementById('opmsLoopChips');
        var routeChipsEl = document.getElementById('opmsRouteChips');
        var twChipsEl = document.getElementById('opmsTimeWindowChips');
        var twFilterWrap = document.getElementById('opmsTimeWindowFilterWrap');
        if (twFilterWrap) twFilterWrap.classList.toggle('hidden', currentFolderTab !== 'lastday');
        if (!depotChipsEl) return;
        var details = getRegisteredRoutesWithDetails();
        var loopsWithDepots = getLoopsWithDepotsForSp();
        var depotNames = [];
        var seenDepot = {};
        loopsWithDepots.forEach(function (x) {
          if (!seenDepot[x.depot]) { seenDepot[x.depot] = true; depotNames.push(x.depot); }
        });
        depotNames.sort();
        var selected = lastDayState.selected;
        var depotFilter = null;
        var loopFilter = null;
        var routeFilter = null;
        if (selected === 'all') { depotFilter = null; loopFilter = null; routeFilter = null; }
        else if (selected.indexOf('|') !== -1) {
          depotFilter = selected.split('|')[0] || null;
          loopFilter = selected.split('|')[1] || null;
          routeFilter = null;
        } else if (depotNames.indexOf(selected) !== -1) {
          depotFilter = selected;
          loopFilter = null;
          routeFilter = null;
        } else {
          routeFilter = selected;
          var rec = details.filter(function (r) { return r.route === selected; })[0];
          depotFilter = rec ? rec.depot : null;
          loopFilter = rec ? rec.loop : null;
        }
        if (currentFolderTab === 'lastday') {
          if (routeFilter) {
            setOpmsFilter(depotFilter && loopFilter ? depotFilter + '|' + loopFilter : (depotFilter || 'all'));
            selected = lastDayState.selected;
            depotFilter = selected === 'all' ? null : (selected.indexOf('|') !== -1 ? selected.split('|')[0] : (depotNames.indexOf(selected) !== -1 ? selected : null));
            loopFilter = selected.indexOf('|') !== -1 ? selected.split('|')[1] || null : null;
            routeFilter = null;
          }
        } else if (currentFolderTab !== 'lastday' && !loopFilter) {
          if (routeFilter) {
            setOpmsFilter(depotFilter || 'all');
            selected = lastDayState.selected;
            depotFilter = selected === 'all' ? null : selected;
            loopFilter = null;
            routeFilter = null;
          }
        }
        depotChipsEl.innerHTML = '<button type="button" class="disco-chip' + (!depotFilter ? ' active' : '') + '" data-opms-depot="">All</button>' +
          depotNames.map(function (d) {
            return '<button type="button" class="disco-chip' + (depotFilter === d ? ' active' : '') + '" data-opms-depot="' + escapeHtml(d) + '">' + escapeHtml(d) + '</button>';
          }).join('');
        var loopsForDepot = depotFilter ? loopsWithDepots.filter(function (x) { return x.depot === depotFilter; }) : loopsWithDepots;
        var uniqueLoops = [];
        var seenLoop = {};
        loopsForDepot.forEach(function (x) {
          var key = x.depot + '|' + x.loop;
          if (!seenLoop[key]) { seenLoop[key] = true; uniqueLoops.push(x); }
        });
        uniqueLoops.sort(function (a, b) { return (a.depot + a.loop).localeCompare(b.depot + b.loop); });
        loopChipsEl.innerHTML = '<button type="button" class="disco-chip' + (!loopFilter ? ' active' : '') + '" data-opms-loop="">All</button>' +
          uniqueLoops.map(function (x) {
            var loopKey = x.depot + '|' + x.loop;
            var isActive = loopFilter && depotFilter && loopFilter === x.loop && depotFilter === x.depot;
            return '<button type="button" class="disco-chip' + (isActive ? ' active' : '') + '" data-opms-loop="' + escapeHtml(loopKey) + '">' + escapeHtml(x.loop) + '</button>';
          }).join('');
        var routesForFilter = details;
        if (loopFilter && depotFilter) {
          routesForFilter = details.filter(function (r) { return r.depot === depotFilter && r.loop === loopFilter; });
        } else if (depotFilter) {
          routesForFilter = details.filter(function (r) { return r.depot === depotFilter; });
        }
        var showRouteChips = (currentFolderTab !== 'lastday') && (loopFilter && depotFilter);
        var routeFilterWrap = document.getElementById('opmsRouteFilterWrap');
        if (routeFilterWrap) routeFilterWrap.classList.toggle('hidden', !showRouteChips);
        var routeNames = [];
        var seenRoute = {};
        if (showRouteChips && loopFilter && depotFilter) {
          routesForFilter = details.filter(function (r) { return r.depot === depotFilter && r.loop === loopFilter; });
          routesForFilter.forEach(function (r) {
            if (!seenRoute[r.route]) { seenRoute[r.route] = true; routeNames.push(r.route); }
          });
          routeNames.sort();
        }
        if (routeChipsEl) {
          if (showRouteChips) {
            routeChipsEl.innerHTML = '<button type="button" class="disco-chip' + (!routeFilter ? ' active' : '') + '" data-opms-route="">All</button>' +
              routeNames.map(function (r) {
                return '<button type="button" class="disco-chip' + (routeFilter === r ? ' active' : '') + '" data-opms-route="' + escapeHtml(r) + '">' + escapeHtml(r) + '</button>';
              }).join('');
          } else {
            routeChipsEl.innerHTML = '';
          }
        }
        depotChipsEl.querySelectorAll('.disco-chip').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var depot = (btn.getAttribute('data-opms-depot') || '').trim();
            setOpmsFilter(depot || 'all');
            updateOpmsFilterChips();
            if (currentFolderTab === 'lastday') { opmsDeliveriesPageIndex = 0; updateLastDaySection(); updateSpFolderDashboardStrip('lastday'); }
            else if (currentFolderTab === 'spms') { updateSpmsSection(); updateSpFolderDashboardStrip('spms'); }
            else { ldTablePageIndex = 0; updateLiquidationDamagesSection(); updateSpFolderDashboardStrip('ld'); }
          });
        });
        loopChipsEl.querySelectorAll('.disco-chip').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var loopKey = (btn.getAttribute('data-opms-loop') || '').trim();
            setOpmsFilter(loopKey || (depotFilter || 'all'));
            updateOpmsFilterChips();
            if (currentFolderTab === 'lastday') { opmsDeliveriesPageIndex = 0; updateLastDaySection(); updateSpFolderDashboardStrip('lastday'); }
            else if (currentFolderTab === 'spms') { updateSpmsSection(); updateSpFolderDashboardStrip('spms'); }
            else { ldTablePageIndex = 0; updateLiquidationDamagesSection(); updateSpFolderDashboardStrip('ld'); }
          });
        });
        if (routeChipsEl) {
          routeChipsEl.querySelectorAll('.disco-chip').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var route = (btn.getAttribute('data-opms-route') || '').trim();
              setOpmsFilter(route || (loopFilter && depotFilter ? depotFilter + '|' + loopFilter : depotFilter || 'all'));
              updateOpmsFilterChips();
              if (currentFolderTab === 'lastday') { opmsDeliveriesPageIndex = 0; updateLastDaySection(); updateSpFolderDashboardStrip('lastday'); }
              else if (currentFolderTab === 'spms') { updateSpmsSection(); updateSpFolderDashboardStrip('spms'); }
              else { ldTablePageIndex = 0; updateLiquidationDamagesSection(); updateSpFolderDashboardStrip('ld'); }
            });
          });
        }
        if (twChipsEl) {
          var twFilter = lastDayState.twFilter || 'all';
          twChipsEl.querySelectorAll('.disco-chip[data-opms-tw]').forEach(function (btn) {
            var val = (btn.getAttribute('data-opms-tw') || '').trim() || 'all';
            btn.classList.toggle('active', val === twFilter);
            if (!btn._opmsTwBound) {
              btn._opmsTwBound = true;
              btn.addEventListener('click', function () {
                lastDayState.twFilter = (this.getAttribute('data-opms-tw') || '').trim() || 'all';
                updateOpmsFilterChips();
                if (currentFolderTab === 'lastday') { opmsDeliveriesPageIndex = 0; updateLastDaySection(); updateSpFolderDashboardStrip('lastday'); }
              });
            }
          });
        }
      }

      function getLdStripData() {
        var rows = getLiquidationDamagesRowsForCurrentMonth();
        var routeFilter = ''; var loopFilter = null; var depotFilter = null;
        if (ldState.selected === 'all') { routeFilter = ''; loopFilter = null; depotFilter = null; }
        else if (ldState.selected.indexOf('|') !== -1) { depotFilter = ldState.selected.split('|')[0] || null; loopFilter = ldState.selected.split('|')[1] || null; }
        else if (getDepotsForSp().indexOf(ldState.selected) !== -1) { depotFilter = ldState.selected; }
        else { routeFilter = ldState.selected; }
        var filtered = rows.filter(function (r) {
          if (routeFilter && r.route !== routeFilter) return false;
          if (loopFilter && r.loop !== loopFilter) return false;
          if (depotFilter && r.depot !== depotFilter) return false;
          return true;
        });
        var total = 0; var pending = 0;
        filtered.forEach(function (r) {
          total += Number(r.amount) || 0;
          if (String(r.status || '').toLowerCase() === 'pending') pending++;
        });
        return { total: total ? '£' + total.toFixed(2) : '—', pending: pending, count: filtered.length };
      }

      function updateLiquidationDamagesSection() {
        if (!spName) return;
        var ldViewingEl = document.getElementById('ldViewingMonth');
        if (ldViewingEl) ldViewingEl.textContent = formatMonthDisplay();
        var depotNames = getDepotsForSp();
        var routeFilter = ''; var loopFilter = null; var depotFilter = null;
        if (ldState.selected === 'all') { routeFilter = ''; loopFilter = null; depotFilter = null; }
        else if (ldState.selected.indexOf('|') !== -1) { loopFilter = ldState.selected.split('|')[1] || null; depotFilter = ldState.selected.split('|')[0] || null; }
        else if (depotNames.indexOf(ldState.selected) !== -1) { depotFilter = ldState.selected; }
        else { routeFilter = ldState.selected; }
        var rows = getLiquidationDamagesRowsForCurrentMonth();
        var filtered = rows.filter(function (r) {
          if (routeFilter && r.route !== routeFilter) return false;
          if (loopFilter && r.loop !== loopFilter) return false;
          if (depotFilter && r.depot !== depotFilter) return false;
          return true;
        });
        var totalAmount = filtered.reduce(function (sum, r) { return sum + (Number(r.amount) || 0); }, 0);
        var totalEl = document.getElementById('ldTotalAmount');
        if (totalEl) totalEl.textContent = '£' + totalAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        var countEl = document.getElementById('ldCount');
        if (countEl) countEl.textContent = String(filtered.length);
        var totalPages = Math.max(1, Math.ceil(filtered.length / LD_PAGE_SIZE));
        if (ldTablePageIndex >= totalPages) ldTablePageIndex = Math.max(0, totalPages - 1);
        var start = ldTablePageIndex * LD_PAGE_SIZE;
        var pageRows = filtered.slice(start, start + LD_PAGE_SIZE);
        var tbody = document.getElementById('ldTableBody');
        var emptyEl = document.getElementById('ldTableEmpty');
        var paginationNav = document.getElementById('ldPagination');
        var paginationInfo = document.getElementById('ldPaginationInfo');
        var paginationPrev = document.getElementById('ldPaginationPrev');
        var paginationNext = document.getElementById('ldPaginationNext');
        if (tbody) {
          tbody.innerHTML = pageRows.map(function (r) {
            var routeDisplay = r.route || '—';
            var statusClass = String(r.status || '').toLowerCase() === 'pending' ? 'text-warning' : 'text-success';
            return '<tr><td><strong>' + escapeHtml(r.awb || '—') + '</strong></td><td>' + escapeHtml(routeDisplay) + '</td><td>' + escapeHtml(r.issueDate ? formatDate(r.issueDate) : '—') + '</td><td>' + escapeHtml(r.issueDescription || '—') + '</td><td class="text-end">£' + (Number(r.amount) || 0).toFixed(2) + '</td><td><span class="' + statusClass + '">' + escapeHtml(r.status || '—') + '</span></td></tr>';
          }).join('');
        }
        if (emptyEl) emptyEl.classList.toggle('hidden', filtered.length > 0);
        if (paginationNav) paginationNav.classList.toggle('hidden', filtered.length <= LD_PAGE_SIZE);
        if (paginationInfo) paginationInfo.textContent = filtered.length > LD_PAGE_SIZE ? (start + 1) + '–' + Math.min(start + LD_PAGE_SIZE, filtered.length) + ' of ' + filtered.length : (filtered.length ? '1–' + filtered.length + ' of ' + filtered.length : '—');
        if (paginationPrev) {
          paginationPrev.disabled = ldTablePageIndex <= 0;
          paginationPrev.onclick = function () { if (ldTablePageIndex > 0) { ldTablePageIndex--; updateLiquidationDamagesSection(); } };
        }
        if (paginationNext) {
          paginationNext.disabled = ldTablePageIndex >= totalPages - 1;
          paginationNext.onclick = function () { if (ldTablePageIndex < totalPages - 1) { ldTablePageIndex++; updateLiquidationDamagesSection(); } };
        }
      }

      function initLiquidationDamages() {
      }

      function getLastDayDates() {
        return Object.keys(opmsDataByDate).filter(function (d) {
          var day = opmsDataByDate[d];
          return (day.counts || day.byRoute || (day.twByRoute && Object.keys(day.twByRoute).length));
        }).sort();
      }

      function getCurrentViewDate() {
        if (lastDayState.dates.length === 0) return '';
        var i = Math.max(0, Math.min(lastDayState.dateIndex, lastDayState.dates.length - 1));
        return lastDayState.dates[i] || '';
      }

      function updateLastDaySection() {
        if (!spName) return;
        var prevDatesLen = lastDayState.dates.length;
        lastDayState.dates = getLastDayDates();
        if (lastDayState.dateIndex >= lastDayState.dates.length) lastDayState.dateIndex = Math.max(0, lastDayState.dates.length - 1);
        if (prevDatesLen === 0 && lastDayState.dates.length > 0) lastDayState.dateIndex = lastDayState.dates.length - 1;
        var selDate = getCurrentViewDate();
        var viewingDateEl = document.getElementById('opmsViewingDate');
        var datePrevBtn = document.getElementById('opmsDatePrev');
        var dateNextBtn = document.getElementById('opmsDateNext');
        if (viewingDateEl) viewingDateEl.textContent = selDate ? formatDate(selDate) : '—';
        if (datePrevBtn) {
          datePrevBtn.disabled = lastDayState.dates.length === 0 || lastDayState.dateIndex <= 0;
          datePrevBtn.setAttribute('aria-disabled', datePrevBtn.disabled ? 'true' : 'false');
        }
        if (dateNextBtn) {
          dateNextBtn.disabled = lastDayState.dates.length === 0 || lastDayState.dateIndex >= lastDayState.dates.length - 1;
          dateNextBtn.setAttribute('aria-disabled', dateNextBtn.disabled ? 'true' : 'false');
        }
        var details = getRegisteredRoutesWithDetails();
        var loopsWithDepots = getLoopsWithDepotsForSp();
        var depotNames = [];
        var seenDepot = {};
        loopsWithDepots.forEach(function (x) {
          if (!seenDepot[x.depot]) { seenDepot[x.depot] = true; depotNames.push(x.depot); }
        });
        depotNames.sort();
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
          depotFilter = lastDayState.selected.split('|')[0] || null;
        } else if (depotNames.indexOf(lastDayState.selected) !== -1) {
          routeFilter = '';
          loopFilter = null;
          depotFilter = lastDayState.selected;
        } else {
          routeFilter = lastDayState.selected;
          loopFilter = null;
          depotFilter = null;
        }
        opmsDeliveriesPageIndex = 0;
        renderLastDayDeliveriesTable(selDate, routeFilter, loopFilter, depotFilter);
        if (currentFolderTab === 'lastday') updateSpFolderDashboardStrip('lastday');
      }

      function renderLastDayDeliveriesTable(storeDate, routeFilter, loopFilter, depotFilter) {
        var tbody = document.getElementById('lastDayDeliveriesBody');
        var emptyEl = document.getElementById('lastDayDeliveriesEmpty');
        var paginationNav = document.getElementById('opmsDeliveriesPagination');
        var paginationInfo = document.getElementById('opmsPaginationInfo');
        var paginationPrev = document.getElementById('opmsPaginationPrev');
        var paginationNext = document.getElementById('opmsPaginationNext');
        if (!tbody) return;
        var data = storeDate ? opmsDataByDate[storeDate] : null;
        var registeredSet = getRegisteredRouteNamesSet();
        var details = getRegisteredRoutesWithDetails();
        if (!data || !data.byRoute || Object.keys(data.byRoute).length === 0) {
          tbody.innerHTML = '';
          if (emptyEl) emptyEl.classList.remove('hidden');
          if (paginationNav) paginationNav.classList.add('hidden');
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
          var counts = rec.counts || {};
          var del = (counts['OK'] || 0) + (counts['DEPAR'] || 0);
          var pu = counts['PU'] || 0;
          var hn = counts['HN'] || 0;
          var afd = (getOpmsDeliveriesAndAfd(counts).afd || 0);
          var stops = del + pu + hn;
          var twRaw = (data.twByRoute && typeof data.twByRoute === 'object') ? getTwForRoute(data.twByRoute, r) : null;
          var twPct = null;
          var twDisplay = '—';
          var twColor = 'grey';
          if (twRaw != null && typeof twRaw === 'number' && !isNaN(twRaw)) {
            twPct = twRaw <= 1 ? twRaw * 100 : twRaw;
            twColor = getTimeWindowColor(twPct);
            twDisplay = (Math.round(twPct * 10) / 10) + '%';
          }
          rows.push({ depot: depot, route: r, del: del, pu: pu, hn: hn, afd: afd, twDisplay: twDisplay, twColor: twColor, stops: stops });
        });
        var twFilter = lastDayState.twFilter || 'all';
        if (twFilter !== 'all') rows = rows.filter(function (row) { return row.twColor === twFilter; });
        rows.sort(function (a, b) { return (a.depot + a.route).localeCompare(b.depot + b.route); });
        tbody.innerHTML = rows.map(function (row) {
          var twClass = row.twColor === 'green' ? ' opms-tw-flag--green' : row.twColor === 'yellow' ? ' opms-tw-flag--yellow' : row.twColor === 'red' ? ' opms-tw-flag--red' : ' opms-tw-flag--grey';
          var twCell = row.twDisplay && row.twDisplay !== '—'
            ? ('<span class="opms-tw-flag' + twClass + '" aria-label="Time Window ' + escapeHtml(row.twDisplay) + '">' + escapeHtml(row.twDisplay) + '</span>')
            : '—';
          var sprVal = row.stops != null ? row.stops : '—';
          return '<tr>' +
            '<td class="opms-route-cell"><span class="opms-route-name">' + escapeHtml(row.route) + '</span></td>' +
            '<td class="text-end"><span class="opms-spr-flag" aria-label="SPR ' + sprVal + '">' + escapeHtml(String(sprVal)) + '</span></td>' +
            '<td class="text-end">' + twCell + '</td>' +
            '<td class="text-end">' + row.del + '</td>' +
            '<td class="text-end">' + row.pu + '</td>' +
            '<td class="text-end">' + row.hn + '</td>' +
            '<td class="text-end">' + row.afd + '</td>' +
            '</tr>';
        }).join('');
        if (emptyEl) emptyEl.classList.add('hidden');
        if (paginationNav) paginationNav.classList.remove('hidden');
        if (paginationInfo) paginationInfo.textContent = rows.length ? '1–' + rows.length + ' of ' + rows.length : '—';
        var pagBtns = paginationNav ? paginationNav.querySelector('.opms-pagination-btns') : null;
        if (paginationNav && pagBtns) pagBtns.classList.add('hidden');
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
            if (twRaw != null) twLabel = 'Time Window – daily average';
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
                twLabel = 'Time Window – daily average';
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
              '<div class="opms-tw-by-route-table-wrap"><table class="opms-tw-by-route-table opms-table-disco-style" aria-label="Time Window % for route">' +
              '<thead><tr><th>Route</th><th>% TW Adh DL</th></tr></thead><tbody>' +
              '<tr><td class="opms-tw-route-name">' + escapeHtml(routeFilter) + '</td><td class="opms-tw-route-value opms-tw-route-value--' + colorClass + '">' + displayVal + '%</td></tr>' +
              '</tbody></table></div></div>';
          }
        }
        wrap.innerHTML = tableHtml + circlesHtml + twByRouteHtml;
        wrap.classList.add('opms-goals-visible');
      }

      function initLastDay() {
        var datePrevBtn = document.getElementById('opmsDatePrev');
        var dateNextBtn = document.getElementById('opmsDateNext');
        var datePickerBtn = document.getElementById('opmsDatePicker');
        var dateDropdown = document.getElementById('opmsDateDropdown');
        if (datePrevBtn) datePrevBtn.addEventListener('click', function () {
          if (lastDayState.dateIndex > 0) {
            lastDayState.dateIndex--;
            updateLastDaySection();
            updateSpmsSection();
          }
        });
        if (dateNextBtn) dateNextBtn.addEventListener('click', function () {
          if (lastDayState.dateIndex < lastDayState.dates.length - 1) {
            lastDayState.dateIndex++;
            updateLastDaySection();
            updateSpmsSection();
          }
        });
        function openDateDropdown() {
          if (!dateDropdown || !datePickerBtn) return;
          lastDayState.dates = getLastDayDates();
          dateDropdown.innerHTML = '';
          if (lastDayState.dates.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'opms-date-dropdown-option';
            empty.textContent = 'No date available';
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
                updateSpmsSection();
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
        updateOpmsFilterChips();
      }

      function initSpms() {
        /* Date e filtros agora são unificados no topo do bloco (opmsDatePrev, opmsDepotChips, etc.) */
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

      function updateSpmsFinancialVisuals(v) {
        var ARC_LEN  = 119;  // arco plano r=100, semi-chord=56 → arc length ≈ 119
        var RING_LEN = 251;  // 2π × 40 ≈ 251.3 (perf ring r=40)

        // --- Income arc gauge (com suporte a overflow neon > 100%) ---
        var incomeArc     = document.getElementById('spmsIncomeArc');
        var incomeArcOver = document.getElementById('spmsIncomeArcOver');
        var ipRaw = Math.max(v.incomePct || 0, 0);
        var ipBase = Math.min(ipRaw, 100);
        if (incomeArc) {
          incomeArc.style.strokeDasharray = (ipBase / 100 * ARC_LEN).toFixed(1) + ' ' + ARC_LEN;
          incomeArc.style.stroke = ipBase >= 95 ? '#22c55e' : ipBase >= 75 ? '#f59e0b' : '#ef4444';
        }
        if (incomeArcOver) {
          if (ipRaw > 100) {
            var ipOver = (ipRaw - 100) / 100 * ARC_LEN;
            incomeArcOver.style.strokeDasharray = ipOver.toFixed(1) + ' ' + ARC_LEN;
            incomeArcOver.style.opacity = '1';
          } else {
            incomeArcOver.style.strokeDasharray = '0 ' + ARC_LEN;
            incomeArcOver.style.opacity = '0';
          }
        }

        // --- AFD speedometer needle: -90° (0%) → 0° (4%) → +90° (8%+) ---
        var needle  = document.getElementById('spmsAfdNeedle');
        var afdCard = document.getElementById('sfbAfdCard');
        var afdStatus = document.getElementById('sfbAfdStatus');
        var afdPct = v.afdPct || 0;
        if (needle) {
          var afdAngle = -90 + Math.min(afdPct / 8, 1) * 180;
          needle.style.transform = 'rotate(' + afdAngle.toFixed(1) + 'deg)';
        }
        if (afdCard) {
          afdCard.classList.toggle('sfb-afd--ok',  afdPct <= 4);
          afdCard.classList.toggle('sfb-afd--bad', afdPct >  4);
        }
        if (afdStatus) {
          afdStatus.textContent = afdPct <= 0 ? '—' : afdPct <= 4 ? 'Within target' : 'Over threshold';
        }

        // --- Performance ring (com suporte a overflow neon > 100%) ---
        var ring     = document.getElementById('spmsPerfRing');
        var ringOver = document.getElementById('spmsPerfRingOver');
        var ringVal  = document.getElementById('spmsPerfRingVal');
        var ppRaw  = Math.max(v.delPctRaw || 0, 0);
        var ppBase = Math.min(ppRaw, 100);
        if (ring) {
          ring.style.strokeDasharray = (ppBase / 100 * RING_LEN).toFixed(1) + ' ' + RING_LEN;
          ring.style.stroke = ppBase >= 95 ? '#22c55e' : ppBase >= 80 ? '#f59e0b' : '#ef4444';
        }
        if (ringOver) {
          if (ppRaw > 100) {
            var ppOver = (ppRaw - 100) / 100 * RING_LEN;
            ringOver.style.strokeDasharray = ppOver.toFixed(1) + ' ' + RING_LEN;
            ringOver.style.opacity = '1';
          } else {
            ringOver.style.strokeDasharray = '0 ' + RING_LEN;
            ringOver.style.opacity = '0';
          }
        }
        if (ringVal) {
          ringVal.textContent = (ppRaw > 0) ? (Math.round(ppRaw * 10) / 10) + '%' : '—';
        }

        // --- Performance breakdown (DEL / PU / HN / Total) ---
        var total = (v.delOk || 0) + (v.delPu || 0) + (v.delHn || 0);
        var perfDel   = document.getElementById('sfbPerfDel');
        var perfPu    = document.getElementById('sfbPerfPu');
        var perfHn    = document.getElementById('sfbPerfHn');
        var perfTotal = document.getElementById('sfbPerfTotal');
        if (perfDel)   perfDel.textContent   = total > 0 ? v.delOk : '—';
        if (perfPu)    perfPu.textContent    = total > 0 ? v.delPu : '—';
        if (perfHn)    perfHn.textContent    = total > 0 ? v.delHn : '—';
        if (perfTotal) perfTotal.textContent = total > 0 ? total   : '—';

      }

      function updateSpmsSection() {
        if (!spName) return;
        try {
        lastDayState.dates = getLastDayDates();
        if (lastDayState.dateIndex >= lastDayState.dates.length) lastDayState.dateIndex = Math.max(0, lastDayState.dates.length - 1);
        var selDate = getCurrentViewDate();
        var details = getRegisteredRoutesWithDetails();
        var loopsWithDepots = getLoopsWithDepotsForSp();
        var depotNames = [];
        var seenDepot = {};
        loopsWithDepots.forEach(function (x) {
          if (!seenDepot[x.depot]) { seenDepot[x.depot] = true; depotNames.push(x.depot); }
        });
        depotNames.sort();
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
        var spmsKpiAfdEl = document.getElementById('spmsKpiAfd');
        function setSpmsDashboardEmpty() {
          if (spmsKpiDelEl) spmsKpiDelEl.textContent = '—';
          if (spmsKpiPuEl) spmsKpiPuEl.textContent = '—';
          if (spmsKpiHnEl) spmsKpiHnEl.textContent = '—';
          if (spmsKpiIncomeEl) spmsKpiIncomeEl.textContent = '—';
          if (spmsKpiPctEl) spmsKpiPctEl.textContent = '—';
          if (spmsKpiAfdEl) spmsKpiAfdEl.textContent = '—';
          var sa = document.getElementById('spmsAvgIncome');
          var sr = document.getElementById('spmsAvgRoute');
          var stra = document.getElementById('spmsTotalRotasAbertas');
          if (sa) sa.textContent = '—';
          if (sr) sr.textContent = '—';
          if (stra) stra.textContent = '—';
          ['sfbPerfDel','sfbPerfPu','sfbPerfHn','sfbPerfTotal'].forEach(function(id){ var el=document.getElementById(id); if(el) el.textContent='—'; });
          var sfbAfdStatus = document.getElementById('sfbAfdStatus'); if(sfbAfdStatus) sfbAfdStatus.textContent='—';
          // Reset imediato (sem transição)
          var incArc = document.getElementById('spmsIncomeArc');
          var perfRing = document.getElementById('spmsPerfRing');
          var afdNeedle = document.getElementById('spmsAfdNeedle');
          if(incArc)  { incArc.style.transition='none';  incArc.style.strokeDasharray='0 119'; }
          var incArcOver2 = document.getElementById('spmsIncomeArcOver');
          if(incArcOver2) { incArcOver2.style.transition='none'; incArcOver2.style.strokeDasharray='0 119'; incArcOver2.style.opacity='0'; }
          if(perfRing){ perfRing.style.transition='none'; perfRing.style.strokeDasharray='0 251'; }
          var perfRingOver2 = document.getElementById('spmsPerfRingOver');
          if(perfRingOver2) { perfRingOver2.style.transition='none'; perfRingOver2.style.strokeDasharray='0 251'; perfRingOver2.style.opacity='0'; }
          if(afdNeedle){ afdNeedle.style.transition='none'; afdNeedle.style.transform='rotate(-90deg)'; }
          // Restaurar transições no próximo frame
          requestAnimationFrame(function(){
            if(incArc)  incArc.style.transition='';
            if(incArcOver2) incArcOver2.style.transition='';
            if(perfRing) perfRing.style.transition='';
            if(perfRingOver2) perfRingOver2.style.transition='';
            if(afdNeedle) afdNeedle.style.transition='';
          });
        }
        if (!data || !hasCounts) {
          if (wrap) wrap.innerHTML = '<div class="last-day-goals-wrap"></div>';
          setSpmsDashboardEmpty();
          return;
        }
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
            var brItem = data.byRoute[k];
            if (!brItem || brItem.route !== routeFilter || !registeredSet[routeFilter]) continue;
            var routeCounts = brItem.counts || {};
            if (preferredKey && k === preferredKey) { counts = routeCounts; depotForRate = brItem.depot || ''; break; }
            if (!fallbackCounts) fallbackCounts = routeCounts;
            depotForRate = brItem.depot || '';
          }
          if (counts === data.counts && fallbackCounts) counts = fallbackCounts;
          if (routeFilter && !fallbackCounts && preferredKey && !data.byRoute[preferredKey]) counts = {};
        } else if (data.byRoute && Object.keys(registeredSet).length > 0) {
          var agg = { OK: 0, PU: 0, HN: 0 };
          Object.keys(data.byRoute).forEach(function (k) {
            var routeRec = data.byRoute[k];
            if (!routeRec || !routeRec.route) return;
            var r = routeRec.route;
            if (!registeredSet[r]) return;
            if (routeNamesInLoop && !routeNamesInLoop[r]) return;
            if (routeNamesInDepot && !routeNamesInDepot[r]) return;
            var routeCounts = routeRec.counts || {};
            Object.keys(routeCounts).forEach(function (c) { agg[c] = (agg[c] || 0) + (routeCounts[c] || 0); });
          });
          counts = agg;
        }
        counts = counts || {};
        var metrics = getOpmsDeliveriesAndAfd(counts);
        var rate = depotForRate ? getLoopDeliveryRateForDepotRoute(depotForRate, routeFilter || '') : 0;
        if (!rate && routeFilter && data.byRoute) {
          for (var key in data.byRoute) {
            var br = data.byRoute[key];
            if (br && br.route === routeFilter) {
              rate = getLoopDeliveryRateForDepotRoute(br.depot || '', routeFilter);
              break;
            }
          }
        }
        if (rate === 0) rate = 2.90;
        var targetDel = depotForRate && routeFilter ? getTargetDelForDepotRoute(depotForRate, routeFilter) : 0;
        if (!targetDel && routeFilter && data.byRoute) {
          for (var key in data.byRoute) {
            var br2 = data.byRoute[key];
            if (br2 && br2.route === routeFilter) {
              targetDel = getTargetDelForDepotRoute(br2.depot || '', routeFilter);
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
        var afdPct = (metrics.deliveries > 0) ? (metrics.afd / metrics.deliveries) * 100 : 0;
        var afdOver4 = afdPct > 4;
        var afdColor = afdOver4 ? '#ef4444' : '#22c55e';
        var afdTrack = afdOver4 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)';
        var afdClass = 'opms-circle-afd' + (afdOver4 ? ' opms-circle-afd--over' : ' opms-circle-afd--ok');
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
        // ── Income calculado: stops por loop × bands do Contract Management ──
        var calculatedIncome = 0;
        if (routeFilter) {
          // Vista de rota única: stops da rota × band do loop ao qual pertence
          var loopForIncome = depotForRate ? getLoopNameForDepotRoute(depotForRate, routeFilter) : '';
          var bandsForRoute = window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.digressiveBands && window.DHL_MOCK_DATA.digressiveBands[loopForIncome];
          calculatedIncome = bandsForRoute ? calculateDigressiveIncome(metrics.deliveries, loopForIncome) : metrics.deliveries * rate;
        } else if (data.byRoute && details.length > 0) {
          // Vista de loop/depot/all: agregar stops POR LOOP e aplicar bands ao total do loop
          calculatedIncome = calcIncomeForLoops(details, function (rec) {
            var key = rec.depot + '|' + rec.route;
            var routeData = data.byRoute[key];
            return routeData && routeData.counts ? getOpmsDeliveriesAndAfd(routeData.counts).deliveries : 0;
          }, registeredSet, routeNamesInLoop, routeNamesInDepot);
        }

        // ── Income esperado (target): baseado em targets por loop × bands ──
        var excelIncome = 0;
        if (routeFilter && data.incomeByRouteFromExcel && data.incomeByRouteFromExcel[routeFilter] != null) {
          excelIncome = Number(data.incomeByRouteFromExcel[routeFilter]) || 0;
        } else if (data.incomeByRouteFromExcel && details.length > 0) {
          details.forEach(function (rec) {
            if (routeNamesInLoop  && !routeNamesInLoop[rec.route])  return;
            if (routeNamesInDepot && !routeNamesInDepot[rec.route]) return;
            if (!registeredSet[rec.route]) return;
            var v = data.incomeByRouteFromExcel[rec.route];
            if (v != null) excelIncome += Number(v) || 0;
          });
        }
        var expectedIncome = excelIncome;
        if (expectedIncome <= 0 && details.length > 0) {
          // Target income: agregar targets POR LOOP × bands (mesmo critério que calculatedIncome)
          expectedIncome = calcIncomeForLoops(details, function (rec) {
            return rec.targetDel || 0;
          }, registeredSet, routeNamesInLoop, routeNamesInDepot);
        }
        var incomePct = expectedIncome > 0 ? (calculatedIncome / expectedIncome) * 100 : 100;
        var incomeFormatted = '£' + (calculatedIncome.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        var incomePctDisplay = (Math.round(incomePct * 10) / 10) + '%';
        var afdHtml = '<div class="opms-circle-item"><div class="opms-circle ' + afdClass + ' opms-progress-circle-wrap">' +
          '<div class="opms-progress-circle-inner">' +
          opmsProgressCircleSvg(afdPct, { progressColor: afdColor, trackColor: afdTrack, maxForOneLap: 6 }) +
          '<span class="opms-circle-value">' + (Math.round(afdPct * 10) / 10) + '%</span></div>' +
          '<span class="opms-circle-label">AFD (%)</span></div></div>';
        var goalsCirclesHtml = '<div class="last-day-goals-wrap opms-goals-visible"><div class="last-day-goals-circles-wrap">' + performanceHtml + afdHtml + '</div></div>';
        if (wrap) wrap.innerHTML = goalsCirclesHtml;
        if (spmsKpiDelEl) spmsKpiDelEl.textContent = delOk;
        if (spmsKpiPuEl) spmsKpiPuEl.textContent = delPu;
        if (spmsKpiHnEl) spmsKpiHnEl.textContent = delHn;
        if (spmsKpiIncomeEl) spmsKpiIncomeEl.textContent = incomeFormatted;
        if (spmsKpiPctEl) spmsKpiPctEl.textContent = totalTarget ? (Math.round(delPctRaw * 10) / 10) + '%' : '—';
        if (spmsKpiAfdEl) spmsKpiAfdEl.textContent = (Math.round(afdPct * 10) / 10) + '%';
        // Defer visual animations: garantir que o browser pintou o estado inicial (stroke-dasharray: 0) antes de transicionar
        var _vis = { incomePct: incomePct, delPctRaw: delPctRaw, afdPct: afdPct, delOk: delOk, delPu: delPu, delHn: delHn };
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            updateSpmsFinancialVisuals(_vis);
          });
        });
        var routeCount = 0;
        if (data.byRoute && details.length > 0) {
          details.forEach(function (rec) {
            if (!registeredSet[rec.route]) return;
            if (routeNamesInLoop && !routeNamesInLoop[rec.route]) return;
            if (routeNamesInDepot && !routeNamesInDepot[rec.route]) return;
            if (routeFilter && rec.route !== routeFilter) return;
            var key = rec.depot + '|' + rec.route;
            var routeData = data.byRoute[key];
            if (!routeData || !routeData.counts) return;
            routeCount++;
          });
        }
        var avgIncome = routeCount > 0 ? calculatedIncome / routeCount : 0;
        var avgRouteDel = routeCount > 0 ? (delOk + delPu + delHn) / routeCount : 0;
        var spmsAvgIncomeEl = document.getElementById('spmsAvgIncome');
        var spmsAvgRouteEl = document.getElementById('spmsAvgRoute');
        var spmsTotalRotasAbertasEl = document.getElementById('spmsTotalRotasAbertas');
        if (spmsAvgIncomeEl) spmsAvgIncomeEl.textContent = routeCount > 0 ? '£' + (avgIncome.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '—';
        if (spmsAvgRouteEl) spmsAvgRouteEl.textContent = routeCount > 0 ? (Math.round(avgRouteDel * 10) / 10) : '—';
        if (spmsTotalRotasAbertasEl) spmsTotalRotasAbertasEl.textContent = routeCount;
        if (currentFolderTab === 'spms') updateSpFolderDashboardStrip('spms');
        } catch (e) {
          console.warn('updateSpmsSection error:', e);
          var wrapErr = document.getElementById('spmsGoalsWrap');
          if (wrapErr) wrapErr.innerHTML = '<div class="last-day-goals-wrap"></div>';
          setSpmsDashboardEmpty();
        }
      }

      var dailyOpsFilteredList = [];
      var dailyOpsPreviousCount = -1;
      var dailyOpsAutoCloseTimer = null;
      var DAILY_OPS_NEW_PEEK_MS = 5000;
      var DAILY_OPS_CARD_STORAGE_KEY = 'dhl_sp_daily_ops_card';

      function saveDailyOpsToCard() {
        if (!spName || !dailyOpsFilteredList.length) return;
        try {
          var toSave = dailyOpsFilteredList.map(function (n) {
            return { message: n.message, type: n.type, severity: n.severity || 'info', timeAgoMinutes: n.timeAgoMinutes, serviceProvider: n.serviceProvider, icon: n.icon };
          });
          var raw = localStorage.getItem(DAILY_OPS_CARD_STORAGE_KEY);
          var all = raw ? JSON.parse(raw) : {};
          if (typeof all !== 'object' || Array.isArray(all)) all = {};
          all[spName] = { serviceProvider: spName, notifications: toSave, updatedAt: new Date().toISOString() };
          localStorage.setItem(DAILY_OPS_CARD_STORAGE_KEY, JSON.stringify(all));
        } catch (e) {}
      }

      function loadDailyOpsFromCard() {
        if (!spName) return null;
        try {
          var raw = localStorage.getItem(DAILY_OPS_CARD_STORAGE_KEY);
          if (!raw) return null;
          var all = JSON.parse(raw);
          var payload = (all && typeof all === 'object' && !Array.isArray(all)) ? all[spName] : null;
          if (!payload || payload.serviceProvider !== spName || !Array.isArray(payload.notifications) || !payload.notifications.length) return null;
          return { notifications: payload.notifications };
        } catch (e) { return null; }
      }

      var NOTIFICATION_TYPE_ICONS = {
        delay: 'clock-history',
        delivery_done: 'check-circle',
        problem: 'exclamation-triangle',
        route_change: 'signpost-2',
        vehicle_issue: 'truck',
        driver_alert: 'person',
        alert: 'megaphone-fill',
        info: 'info-circle',
        network_delay: 'wifi'
      };
      var NOTIFICATION_TYPE_LABELS = {
        delay: 'Delay',
        delivery_done: 'Delivery done',
        problem: 'Problem',
        route_change: 'Route change',
        vehicle_issue: 'Vehicle issue',
        driver_alert: 'Driver alert',
        alert: 'Alert',
        info: 'Info',
        network_delay: 'Networks & Delays'
      };
      function getIconForNotification(n) {
        if (n.type && NOTIFICATION_TYPE_ICONS[n.type]) return NOTIFICATION_TYPE_ICONS[n.type];
        if (n.icon) return n.icon;
        return 'bell';
      }
      function getTypeLabelForNotification(n) {
        var t = (n.type || 'info').trim() || 'info';
        return NOTIFICATION_TYPE_LABELS[t] || (t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' '));
      }

      function getDailyOpsTimeText(n) {
        var m = n.timeAgoMinutes || 0;
        return m <= 60 ? m + ' min ago' : Math.floor(m / 60) + ' h ago';
      }

      function renderNotifSidebarItem(n) {
        var timeText = getDailyOpsTimeText(n);
        var icon = getIconForNotification(n);
        var severity = n.severity || 'info';
        var typeLabel = getTypeLabelForNotification(n);
        return '<div class="sp-notif-item sp-notif-item--' + severity + '" role="listitem">' +
          '<span class="sp-notif-item-icon"><i class="bi bi-' + icon + '"></i></span>' +
          '<div class="sp-notif-item-body">' +
          '<span class="sp-notif-item-type">' + escapeHtml(typeLabel) + '</span>' +
          '<p class="sp-notif-item-msg">' + escapeHtml(n.message) + '</p>' +
          '<span class="sp-notif-item-time">' + escapeHtml(timeText) + '</span>' +
          '</div></div>';
      }

      function openNotificationsSidebar() {
        var sidebar = document.getElementById('spNotifSidebar');
        if (!sidebar) return;
        if (dailyOpsAutoCloseTimer) { clearTimeout(dailyOpsAutoCloseTimer); dailyOpsAutoCloseTimer = null; }
        sidebar.classList.add('is-open');
        sidebar.setAttribute('aria-hidden', 'false');
        var tab = document.getElementById('spNotifTab');
        if (tab) tab.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      }

      function closeNotificationsSidebar() {
        var sidebar = document.getElementById('spNotifSidebar');
        if (!sidebar) return;
        if (dailyOpsAutoCloseTimer) { clearTimeout(dailyOpsAutoCloseTimer); dailyOpsAutoCloseTimer = null; }
        sidebar.classList.remove('is-open');
        sidebar.setAttribute('aria-hidden', 'true');
        var tab = document.getElementById('spNotifTab');
        if (tab) tab.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }

      function updateNotifSidebarContent() {
        var listEl = document.getElementById('spNotifList');
        var emptyEl = document.getElementById('spNotifEmpty');
        var panel = document.querySelector('.sp-notif-sidebar-panel');
        var spLabel = document.getElementById('spNotifSidebarSp');
        if (spLabel) { spLabel.textContent = spName ? spName : ''; spLabel.setAttribute('aria-label', spName ? 'Service Provider: ' + spName : 'Service Provider'); }
        if (!listEl) return;
        if (dailyOpsFilteredList.length === 0) {
          listEl.innerHTML = '';
          if (emptyEl) { emptyEl.classList.remove('hidden'); }
          if (panel) {
            var emptyTotalRem = 3.5 + 6;
            panel.style.maxHeight = (emptyTotalRem * 16) + 'px';
            panel.style.height = 'auto';
          }
          return;
        }
        listEl.innerHTML = dailyOpsFilteredList.map(function (n) { return renderNotifSidebarItem(n); }).join('');
        if (emptyEl) emptyEl.classList.add('hidden');
        if (panel) {
          var count = dailyOpsFilteredList.length;
          var headerRem = 3.5;
          var itemRem = 4.25;
          var emptyBodyRem = 5;
          var contentRem = count * itemRem;
          var totalRem = headerRem + contentRem;
          var maxVhPx = window.innerHeight * 0.9;
          var totalPx = Math.min(totalRem * 16, maxVhPx);
          panel.style.maxHeight = totalPx + 'px';
          panel.style.height = 'auto';
        }
      }

      function updateNotifTabBadge() {
        var badge = document.getElementById('spNotifTabBadge');
        if (!badge) return;
        if (dailyOpsFilteredList.length === 0) {
          badge.classList.add('hidden');
          return;
        }
        badge.textContent = dailyOpsFilteredList.length > 99 ? '99+' : String(dailyOpsFilteredList.length);
        badge.classList.remove('hidden');
      }

      function updateDailyOpsSection() {
        var listEl = document.getElementById('spNotifList');
        var emptyEl = document.getElementById('spNotifEmpty');
        if (!listEl) return;
        var notifications = (data.dailyOperationsNotifications) ? data.dailyOperationsNotifications : [];
        var prevLen = dailyOpsFilteredList.length;
        dailyOpsFilteredList = spName ? notifications.filter(function (n) { return n.serviceProvider === spName; }) : [];
        dailyOpsFilteredList.forEach(function (n) { if (!n.type) n.type = 'info'; });
        dailyOpsFilteredList.sort(function (a, b) { return (a.timeAgoMinutes || 0) - (b.timeAgoMinutes || 0); });
        if (dailyOpsFilteredList.length === 0) {
          var saved = loadDailyOpsFromCard();
          if (saved && saved.notifications && saved.notifications.length) {
            dailyOpsFilteredList = saved.notifications;
            dailyOpsFilteredList.forEach(function (n) { if (!n.type) n.type = 'info'; });
            updateNotifSidebarContent();
            updateNotifTabBadge();
            dailyOpsPreviousCount = dailyOpsFilteredList.length;
            return;
          }
          updateNotifSidebarContent();
          updateNotifTabBadge();
          dailyOpsPreviousCount = 0;
          return;
        }
        saveDailyOpsToCard();
        updateNotifSidebarContent();
        updateNotifTabBadge();
        var isNewNotification = dailyOpsPreviousCount >= 0 && dailyOpsFilteredList.length > dailyOpsPreviousCount;
        dailyOpsPreviousCount = dailyOpsFilteredList.length;
        if (isNewNotification) {
          /* Snackbar com preview da nova Notificação */
          var snackbarEl = document.getElementById('spNotifSnackbar');
          var snackbarText = document.getElementById('spNotifSnackbarText');
          if (snackbarEl && snackbarText && dailyOpsFilteredList.length > 0) {
            var preview = (dailyOpsFilteredList[0].message || '').slice(0, 80);
            if (preview.length < (dailyOpsFilteredList[0].message || '').length) preview += '…';
            snackbarText.textContent = preview;
            snackbarEl.removeAttribute('hidden');
            setTimeout(function () {
              snackbarEl.setAttribute('hidden', '');
            }, 4500);
          }
          openNotificationsSidebar();
          if (dailyOpsAutoCloseTimer) clearTimeout(dailyOpsAutoCloseTimer);
          dailyOpsAutoCloseTimer = setTimeout(function () {
            dailyOpsAutoCloseTimer = null;
            closeNotificationsSidebar();
          }, DAILY_OPS_NEW_PEEK_MS);
        }
      }

      function initNotificationsSidebar() {
        var tab = document.getElementById('spNotifTab');
        var sidebar = document.getElementById('spNotifSidebar');
        var backdrop = document.getElementById('spNotifSidebarBackdrop');
        var closeBtn = document.getElementById('spNotifSidebarClose');
        if (tab) {
          tab.addEventListener('click', function () {
            if (sidebar && sidebar.classList.contains('is-open')) closeNotificationsSidebar();
            else openNotificationsSidebar();
          });
        }
        if (backdrop) backdrop.addEventListener('click', closeNotificationsSidebar);
        if (closeBtn) closeBtn.addEventListener('click', closeNotificationsSidebar);
      }

      /* ========== Avisos (lembrete no header; só desaparece se DHL excluir ou data Expire; clique abre modal com páginas) ========== */
      var avisosList = [];
      var avisosModalPage = 0;
      var avisosCarouselIndex = 0;
      var avisosCarouselTimer = null;
      var AVISOS_CAROUSEL_INTERVAL_MS = 5000;

      function getActiveAvisos() {
        return window.AvisosStorage ? AvisosStorage.getActiveAvisos() : [];
      }

      function updateAvisosCarouselSlide() {
        var boxText = document.getElementById('spAnnouncementBoxText');
        var boxPages = document.getElementById('spAnnouncementBoxPages');
        if (!boxText) return;
        if (avisosList.length === 0) {
          boxText.textContent = 'No announcements yet.';
          if (boxPages) boxPages.textContent = '';
          return;
        }
        var idx = avisosCarouselIndex % avisosList.length;
        var a = avisosList[idx];
        var preview = (a.title ? a.title + ' – ' : '') + (a.message || '').slice(0, 50);
        if ((a.message || '').length > 50) preview += '…';
        boxText.textContent = preview;
        if (boxPages) {
          boxPages.textContent = avisosList.length > 1 ? ' (' + (idx + 1) + ' / ' + avisosList.length + ')' : '';
        }
      }

      function startAvisosCarousel() {
        stopAvisosCarousel();
        if (avisosList.length <= 1) return;
        avisosCarouselTimer = setInterval(function () {
          avisosCarouselIndex = (avisosCarouselIndex + 1) % avisosList.length;
          updateAvisosCarouselSlide();
        }, AVISOS_CAROUSEL_INTERVAL_MS);
      }

      function stopAvisosCarousel() {
        if (avisosCarouselTimer) {
          clearInterval(avisosCarouselTimer);
          avisosCarouselTimer = null;
        }
      }

      function updateAvisosStrip() {
        avisosList = getActiveAvisos();
        var boxText = document.getElementById('spAnnouncementBoxText');
        var boxPages = document.getElementById('spAnnouncementBoxPages');
        var emptyEl = document.getElementById('spAnnouncementEmpty');
        var trigger = document.getElementById('spAnnouncementBox');
        if (!boxText) return;
        if (avisosList.length === 0) {
          stopAvisosCarousel();
          boxText.textContent = 'No announcements yet.';
          if (boxPages) boxPages.textContent = '';
          if (emptyEl) emptyEl.classList.remove('hidden');
          if (trigger) { trigger.disabled = true; trigger.setAttribute('aria-disabled', 'true'); }
          return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');
        if (trigger) { trigger.disabled = false; trigger.removeAttribute('aria-disabled'); }
        avisosCarouselIndex = 0;
        updateAvisosCarouselSlide();
        if (avisosList.length > 1) startAvisosCarousel(); else stopAvisosCarousel();
      }

      function openAvisosModal() {
        avisosList = getActiveAvisos();
        var modal = document.getElementById('spAvisosModal');
        var trigger = document.getElementById('spAnnouncementBox');
        if (!modal || avisosList.length === 0) return;
        avisosModalPage = 0;
        renderAvisosModalPages();
        modal.removeAttribute('hidden');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
      }

      function closeAvisosModal() {
        var modal = document.getElementById('spAvisosModal');
        var trigger = document.getElementById('spAnnouncementBox');
        if (modal) modal.setAttribute('hidden', '');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }

      function renderAvisosModalPages() {
        var container = document.getElementById('spAvisosModalPages');
        var pagenum = document.getElementById('spAvisosModalPagenum');
        var prevBtn = document.getElementById('spAvisosModalPrev');
        var nextBtn = document.getElementById('spAvisosModalNext');
        var dots = document.getElementById('spAvisosModalDots');
        if (!container) return;
        var total = avisosList.length;
        var current = Math.min(avisosModalPage, total - 1);
        if (total === 0) {
          container.innerHTML = '';
          if (pagenum) pagenum.textContent = '0 / 0';
          return;
        }
        var a = avisosList[current];
        var expStr = a.expireDate ? new Date(a.expireDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        container.innerHTML = '<div class="sp-avisos-modal-page">' +
          '<h3 class="sp-avisos-modal-page-title">' + escapeHtml(a.title || 'Notice') + '</h3>' +
          '<p class="sp-avisos-modal-page-msg">' + escapeHtml(a.message || '') + '</p>' +
          '<p class="sp-avisos-modal-page-expire"><small>Expires: ' + escapeHtml(expStr) + '</small></p>' +
          '</div>';
        if (pagenum) pagenum.textContent = (current + 1) + ' / ' + total;
        if (prevBtn) {
          prevBtn.disabled = current <= 0;
          prevBtn.setAttribute('aria-disabled', current <= 0 ? 'true' : 'false');
        }
        if (nextBtn) {
          nextBtn.disabled = current >= total - 1;
          nextBtn.setAttribute('aria-disabled', current >= total - 1 ? 'true' : 'false');
        }
        if (dots) {
          dots.innerHTML = avisosList.map(function (_, i) {
            return '<button type="button" class="sp-avisos-modal-dot' + (i === current ? ' active' : '') + '" data-page="' + i + '" aria-label="Notice ' + (i + 1) + '"' + (i === current ? ' aria-current="true"' : '') + '></button>';
          }).join('');
        }
      }

      function initAvisosStripAndModal() {
        var modal = document.getElementById('spAvisosModal');
        var backdrop = document.getElementById('spAvisosModalBackdrop');
        var closeBtn = document.getElementById('spAvisosModalClose');
        var prevBtn = document.getElementById('spAvisosModalPrev');
        var nextBtn = document.getElementById('spAvisosModalNext');
        var dots = document.getElementById('spAvisosModalDots');
        updateAvisosStrip();
        var announcementBox = document.getElementById('spAnnouncementBox');
        if (announcementBox) announcementBox.addEventListener('click', openAvisosModal);
        if (backdrop) backdrop.addEventListener('click', closeAvisosModal);
        if (closeBtn) closeBtn.addEventListener('click', closeAvisosModal);
        if (prevBtn) prevBtn.addEventListener('click', function () {
          if (avisosModalPage > 0) {
            avisosModalPage--;
            renderAvisosModalPages();
          }
        });
        if (nextBtn) nextBtn.addEventListener('click', function () {
          if (avisosModalPage < avisosList.length - 1) {
            avisosModalPage++;
            renderAvisosModalPages();
          }
        });
        if (dots) dots.addEventListener('click', function (e) {
          var btn = e.target.closest('.sp-avisos-modal-dot');
          if (!btn) return;
          var p = parseInt(btn.getAttribute('data-page'), 10);
          if (!isNaN(p)) {
            avisosModalPage = p;
            renderAvisosModalPages();
          }
        });
        if (modal) modal.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') closeAvisosModal();
        });
      }

      /* ========== Network & Delay (DHL cria; SP só visualiza) ========== */
      var NETWORK_DELAY_STORAGE_KEY = 'dhl_network_delay';
      var networkDelayCarouselIndex = 0;
      var networkDelayCarouselTimer = null;
      var NETWORK_DELAY_CAROUSEL_INTERVAL_MS = 5000;

      /** Seed inicial: um Announcement e um Network & Delay de exemplo (conteúdo da DHL). */
      function seedSpDefaultContent() {
        if (window.AvisosStorage && getActiveAvisos().length === 0) {
          var exp = new Date();
          exp.setDate(exp.getDate() + 30);
          window.AvisosStorage.addAviso({
            title: 'Service update',
            message: 'Please ensure all drivers complete the safety briefing by end of week. Contact your DHL representative for materials.',
            expireDate: exp.toISOString().slice(0, 10)
          });
        }
        var ndList = getNetworkDelayItems();
        if (ndList.length === 0) {
          addNetworkDelayItem({ message: 'Network delay reported on Northern corridor – allow extra time for collections.' });
        }
      }

      function getNetworkDelayItems() {
        try {
          var raw = localStorage.getItem(NETWORK_DELAY_STORAGE_KEY);
          return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
      }

      function addNetworkDelayItem(item) {
        var list = getNetworkDelayItems();
        list.unshift({
          id: 'nd-' + Date.now(),
          message: (item && item.message) ? String(item.message).trim() : 'Network or delay alert',
          createdAt: new Date().toISOString()
        });
        try {
          localStorage.setItem(NETWORK_DELAY_STORAGE_KEY, JSON.stringify(list));
        } catch (e) {}
        return list;
      }

      function setNetworkDelayCarouselActive(index) {
        var listEl = document.getElementById('spNetworkDelayList');
        if (!listEl) return;
        var slides = listEl.querySelectorAll('.sp-network-delay-slide');
        slides.forEach(function (el, i) {
          el.classList.toggle('active', i === index);
        });
      }

      function startNetworkDelayCarousel(count) {
        if (networkDelayCarouselTimer) {
          clearInterval(networkDelayCarouselTimer);
          networkDelayCarouselTimer = null;
        }
        if (count <= 1) return;
        networkDelayCarouselTimer = setInterval(function () {
          var listEl = document.getElementById('spNetworkDelayList');
          var slides = listEl ? listEl.querySelectorAll('.sp-network-delay-slide') : [];
          var n = slides.length;
          if (n <= 1) return;
          networkDelayCarouselIndex = (networkDelayCarouselIndex + 1) % n;
          setNetworkDelayCarouselActive(networkDelayCarouselIndex);
        }, NETWORK_DELAY_CAROUSEL_INTERVAL_MS);
      }

      function renderNetworkDelayList() {
        var wrap = document.getElementById('spNetworkDelayWrap');
        var listEl = document.getElementById('spNetworkDelayList');
        var emptyEl = document.getElementById('spNetworkDelayEmpty');
        var items = getNetworkDelayItems();
        if (!wrap || !listEl) return;
        listEl.innerHTML = items.map(function (nd, i) {
          var dateStr = nd.createdAt ? new Date(nd.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
          return '<li class="list-group-item list-group-item-action py-2 small sp-network-delay-slide' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">' +
            '<span class="sp-network-delay-msg">' + escapeHtml(nd.message || '') + '</span>' +
            (dateStr ? ' <span class="text-muted">' + escapeHtml(dateStr) + '</span>' : '') +
            '</li>';
        }).join('');
        if (emptyEl) {
          emptyEl.classList.toggle('hidden', items.length > 0);
        }
        networkDelayCarouselIndex = 0;
        setNetworkDelayCarouselActive(0);
        startNetworkDelayCarousel(items.length);
      }

      function getCreateModalSelectedCategory() {
        var el = document.querySelector('#spCreateTypeModal input[name="spCreateCategory"]:checked');
        return (el && el.value) ? el.value : 'info';
      }

      function getDefaultMessageForCategory(type) {
        var messages = {
          delay: 'Delivery delay – estimated 15 min.',
          delivery_done: 'Delivery completed.',
          problem: 'Issue reported.',
          route_change: 'Change to route – new time window.',
          vehicle_issue: 'Vehicle under review.',
          driver_alert: 'Driver status update.',
          alert: 'Alert notice.',
          info: 'Information update.',
          network_delay: 'Network or delay reported.'
        };
        return messages[type] || 'Notification';
      }

      function addNotificationFromCreate(type, message) {
        var list = (data.dailyOperationsNotifications) ? data.dailyOperationsNotifications : [];
        data.dailyOperationsNotifications = list;
        var severity = (type === 'problem') ? 'danger' : (type === 'delay' || type === 'vehicle_issue' || type === 'alert' || type === 'network_delay') ? 'warning' : (type === 'delivery_done') ? 'success' : 'info';
        list.unshift({
          id: 'op-create-' + Date.now(),
          serviceProvider: spName,
          type: type,
          severity: severity,
          message: (message || getDefaultMessageForCategory(type)).trim(),
          timeAgoMinutes: 0
        });
        updateDailyOpsSection();
      }

      function openCreateTypeModal() {
        var modal = document.getElementById('spCreateTypeModal');
        if (modal) {
          modal.removeAttribute('hidden');
          modal.setAttribute('aria-hidden', 'false');
        }
      }

      function closeCreateTypeModal() {
        var modal = document.getElementById('spCreateTypeModal');
        if (modal) {
          modal.setAttribute('hidden', '');
          modal.setAttribute('aria-hidden', 'true');
        }
      }

      /* ---- Previews para o modal Create ---- */
      var CREATE_PREVIEWS = {
        announcement: {
          html: '<div class="sp-create-preview-mock sp-create-preview-mock--announce">' +
            '<div class="sp-create-preview-mock-bar"><span class="sp-create-preview-mock-dot"></span><span>Header — top banner of the dashboard</span></div>' +
            '<div class="sp-create-preview-mock-header">' +
              '<span style="font-size:0.7rem;font-weight:700;color:#1e40af">Dashboard</span>' +
              '<div class="sp-create-preview-mock-announce-box">' +
                '<i class="bi bi-megaphone-fill" style="color:#3b82f6;font-size:0.65rem"></i>' +
                '<span style="font-size:0.65rem;color:#1e40af"> Your notice appears here</span>' +
              '</div>' +
              '<span style="font-size:0.7rem;color:#94a3b8">👤</span>' +
            '</div>' +
          '</div>'
        },
        notification: {
          html: '<div class="sp-create-preview-mock sp-create-preview-mock--notif">' +
            '<div class="sp-create-preview-mock-bar"><span class="sp-create-preview-mock-dot"></span><span>Sidebar — notifications side panel</span></div>' +
            '<div class="sp-create-preview-mock-item sp-create-preview-mock-item--highlight">' +
              '<span class="sp-create-preview-mock-icon" style="color:#6366f1"><i class="bi bi-bell-fill"></i></span>' +
              '<div><div class="sp-create-preview-mock-title">Your notice</div><div class="sp-create-preview-mock-sub">Appears here, on the right side panel</div></div>' +
            '</div>' +
            '<div class="sp-create-preview-mock-item">' +
              '<span class="sp-create-preview-mock-icon" style="color:#94a3b8"><i class="bi bi-bell"></i></span>' +
              '<div><div class="sp-create-preview-mock-title" style="color:#94a3b8">Previous notification</div></div>' +
            '</div>' +
          '</div>'
        },
        network_delay: {
          html: '<div class="sp-create-preview-mock sp-create-preview-mock--nd">' +
            '<div class="sp-create-preview-mock-bar"><span class="sp-create-preview-mock-dot"></span><span>Delays — Network &amp; Delays summary block</span></div>' +
            '<div class="sp-create-preview-mock-summary">' +
              '<div class="sp-create-preview-mock-kpis">' +
                '<div class="sp-create-preview-mock-kpi">10<br><small>Deliveries</small></div>' +
                '<div class="sp-create-preview-mock-kpi">3<br><small>Routes</small></div>' +
                '<div class="sp-create-preview-mock-kpi">2.4<br><small>SPR</small></div>' +
              '</div>' +
              '<div class="sp-create-preview-mock-nd-card">' +
                '<div class="sp-create-preview-mock-nd-title"><i class="bi bi-wifi" style="color:#a16207"></i> Network &amp; Delays</div>' +
                '<div class="sp-create-preview-mock-nd-msg">Your alert appears here</div>' +
              '</div>' +
            '</div>' +
          '</div>'
        }
      };

      function updateCreatePreview(type) {
        var preview = document.getElementById('spCreateTypePreview');
        var box = document.getElementById('spCreateTypePreviewBox');
        var submitBtn = document.getElementById('spCreateTypeSubmit');
        if (!preview || !box) return;
        if (!type || !CREATE_PREVIEWS[type]) {
          preview.classList.add('hidden');
          if (submitBtn) submitBtn.disabled = true;
          return;
        }
        box.innerHTML = CREATE_PREVIEWS[type].html;
        preview.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = false;
      }

      function initCreateTypeModal() {
        var trigger = document.getElementById('spCreateTrigger');
        var modal = document.getElementById('spCreateTypeModal');
        var backdrop = document.getElementById('spCreateTypeModalBackdrop');
        var closeBtn = document.getElementById('spCreateTypeModalClose');
        var cancelBtn = document.getElementById('spCreateTypeCancel');
        var submitBtn = document.getElementById('spCreateTypeSubmit');
        var radios = modal ? modal.querySelectorAll('input[name="spCreateType"]') : [];

        if (trigger) trigger.addEventListener('click', openCreateTypeModal);
        if (backdrop) backdrop.addEventListener('click', closeCreateTypeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeCreateTypeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeCreateTypeModal);
        if (modal) modal.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') closeCreateTypeModal();
        });

        radios.forEach(function (radio) {
          radio.addEventListener('change', function () {
            /* Atualizar visual das opções */
            radios.forEach(function (r) {
              r.closest('.sp-create-type-option').classList.remove('selected');
            });
            radio.closest('.sp-create-type-option').classList.add('selected');
            updateCreatePreview(radio.value);
          });
        });

        if (submitBtn) {
          submitBtn.addEventListener('click', function () {
            var checked = modal ? modal.querySelector('input[name="spCreateType"]:checked') : null;
            if (!checked) return;
            var type = checked.value;
            closeCreateTypeModal();

            if (type === 'notification') {
              addNotificationFromCreate('info', getDefaultMessageForCategory('info'));
              openNotificationsSidebar();
            } else if (type === 'announcement') {
              var wrap = document.getElementById('spAnnouncementBoxWrap');
              if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              updateAvisosStrip();
            } else if (type === 'network_delay') {
              addNetworkDelayItem({ message: getDefaultMessageForCategory('network_delay') });
              renderNetworkDelayList();
              var discoBlock = document.getElementById('spDiscoBlock');
              if (discoBlock) discoBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        }

        /* Reset ao abrir */
        if (modal) {
          var origOpen = openCreateTypeModal;
          openCreateTypeModal = function () {
            origOpen();
            radios.forEach(function (r) {
              r.checked = false;
              r.closest('.sp-create-type-option').classList.remove('selected');
            });
            updateCreatePreview(null);
          };
        }

        renderNetworkDelayList();
      }

      /* ---- Tabs do modal de Avisos (3 categorias) ---- */
      function initAvisosModalTabs() {
        var modal = document.getElementById('spAvisosModal');
        if (!modal) return;
        modal.addEventListener('click', function (e) {
          var tab = e.target.closest('[data-avisos-tab]');
          if (!tab) return;
          var key = tab.getAttribute('data-avisos-tab');
          modal.querySelectorAll('[data-avisos-tab]').forEach(function (t) {
            t.classList.toggle('active', t === tab);
            t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
          });
          modal.querySelectorAll('.sp-avisos-modal-panel').forEach(function (p) {
            p.classList.add('hidden');
          });
          var panel = document.getElementById('spAvisosPanel_' + key);
          if (panel) {
            panel.classList.remove('hidden');
            if (key === 'network') renderAvisosNetworkPanel();
            if (key === 'notifications') renderAvisosNotifPanel();
          }
        });
      }

      function renderAvisosNetworkPanel() {
        var list = document.getElementById('spAvisosNetworkList');
        var empty = document.getElementById('spAvisosNetworkEmpty');
        var items = getNetworkDelayItems();
        if (!list) return;
        if (items.length === 0) {
          list.innerHTML = '';
          if (empty) empty.classList.remove('hidden');
          return;
        }
        if (empty) empty.classList.add('hidden');
        list.innerHTML = items.map(function (nd) {
          var dateStr = nd.createdAt ? new Date(nd.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
          return '<li class="sp-avisos-list-item">' +
            '<span class="sp-avisos-list-icon sp-avisos-list-icon--nd"><i class="bi bi-wifi"></i></span>' +
            '<div class="sp-avisos-list-content">' +
              '<p class="sp-avisos-list-msg">' + escapeHtml(nd.message || '') + '</p>' +
              (dateStr ? '<span class="sp-avisos-list-date">' + escapeHtml(dateStr) + '</span>' : '') +
            '</div>' +
          '</li>';
        }).join('');
      }

      function renderAvisosNotifPanel() {
        var list = document.getElementById('spAvisosNotifList');
        var empty = document.getElementById('spAvisosNotifEmpty');
        var items = (data && data.dailyOperationsNotifications) ? data.dailyOperationsNotifications : [];
        if (!list) return;
        if (items.length === 0) {
          list.innerHTML = '';
          if (empty) empty.classList.remove('hidden');
          return;
        }
        if (empty) empty.classList.add('hidden');
        list.innerHTML = items.slice(0, 20).map(function (n) {
          return '<li class="sp-avisos-list-item">' +
            '<span class="sp-avisos-list-icon sp-avisos-list-icon--notif"><i class="bi bi-bell-fill"></i></span>' +
            '<div class="sp-avisos-list-content">' +
              '<p class="sp-avisos-list-msg">' + escapeHtml(n.message || '') + '</p>' +
              (n.timeAgoMinutes != null ? '<span class="sp-avisos-list-date">' + (n.timeAgoMinutes === 0 ? 'Just now' : n.timeAgoMinutes + ' min ago') + '</span>' : '') +
            '</div>' +
          '</li>';
        }).join('');
      }

      function render() {
        var depotEl = document.getElementById('spFilterDepot');
        var loopEl = document.getElementById('spFilterLoop');
        var routeEl = document.getElementById('spFilterRoute');
        filterState.depot = depotEl ? depotEl.value : '';
        filterState.loop = loopEl ? loopEl.value : '';
        filterState.route = routeEl ? routeEl.value : '';
        updateDailyOpsSection();
        updateAvisosStrip();
        if (typeof renderNetworkDelayList === 'function') renderNetworkDelayList();
        updateKPIs();
        updateLastDaySection();
        updateSpmsSection();
        lastDayState.dates = getLastDayDates();
        updateCompliance();
        updateDriversDocs();
        updateVehicles();
      }

      var discoState = { depot: '', loop: '', slot: 'AM' };
      var _discoDeliveriesWithSlotCache = null;

      /** Entregas com slot AM/PM; inclui entregas da tarde (PM) geradas no mesmo esquema. */
      function getDiscoDeliveries() {
        var data = window.DISCO_DATA;
        var raw = (data && data.deliveries && Array.isArray(data.deliveries)) ? data.deliveries : [];
        if (!raw.length) return [];
        if (_discoDeliveriesWithSlotCache) return _discoDeliveriesWithSlotCache;
        var list = [];
        raw.forEach(function (d, i) {
          var slot = (d.slot === 'AM' || d.slot === 'PM') ? d.slot : (d.pre12 === true ? 'AM' : (i % 2 === 0 ? 'AM' : 'PM'));
          list.push(Object.assign({}, d, { slot: slot }));
        });
        var amCount = list.filter(function (d) { return d.slot === 'AM'; }).length;
        var pmCount = list.filter(function (d) { return d.slot === 'PM'; }).length;
        if (pmCount < amCount * 0.4) {
          var toClone = list.filter(function (d) { return d.slot === 'AM'; });
          var take = Math.max(1, Math.floor(toClone.length * 0.45));
          for (var j = 0; j < take; j++) {
            var src = toClone[j % toClone.length];
            var clone = Object.assign({}, src, {
              slot: 'PM',
              subpostcode: (src.subpostcode || '').replace(/\s/g, ' ').trim() + ' PM',
              address: (src.address || '') + (src.address ? ' (PM)' : ' (PM)')
            });
            list.push(clone);
          }
        }
        _discoDeliveriesWithSlotCache = list;
        return list;
      }

      function getFilteredDiscoDeliveries() {
        var list = getDiscoDeliveries();
        var depot = (discoState.depot || '').trim();
        var loop = (discoState.loop || '').trim();
        var slot = (discoState.slot || 'AM').trim();
        return list.filter(function (d) {
          if (slot && (d.slot || '').trim() !== slot) return false;
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

      /** Entregas de um depot (respeita slot AM/PM). */
      function getDeliveriesForDepot(depotName) {
        var list = getDiscoDeliveries();
        var depotTrim = (depotName || '').trim();
        var slot = (discoState.slot || '').trim();
        if (!depotTrim) return [];
        return list.filter(function (d) {
          if (slot && (d.slot || '').trim() !== slot) return false;
          return (d.depot || '').trim() === depotTrim;
        });
      }

      /** Entregas de um loop (depot já fixo no estado; respeita slot AM/PM). */
      function getDeliveriesForLoop(depotName, loopName) {
        var list = getDiscoDeliveries();
        var depotTrim = (depotName || '').trim();
        var loopTrim = (loopName || '').trim();
        var slot = (discoState.slot || '').trim();
        if (!depotTrim || !loopTrim) return [];
        return list.filter(function (d) {
          if (slot && (d.slot || '').trim() !== slot) return false;
          return (d.depot || '').trim() === depotTrim && (d.loop || '').trim() === loopTrim;
        });
      }

      /** Resumo por depot: array de { depot, totalDeliveries, pre12, asr, dsr }. Respeita slot AM/PM. */
      function getDiscoDepotSummary() {
        var list = getDiscoDeliveries();
        var slot = (discoState.slot || '').trim();
        var byDepot = {};
        list.forEach(function (d) {
          if (slot && (d.slot || '').trim() !== slot) return;
          var dep = (d.depot || '').trim();
          if (!dep) return;
          if (!byDepot[dep]) byDepot[dep] = { depot: dep, totalDeliveries: 0, pre12: 0, asr: 0, dsr: 0 };
          byDepot[dep].totalDeliveries += 1;
          if (d.pre12 === true) byDepot[dep].pre12 += 1;
          if (d.asr === true) byDepot[dep].asr += 1;
          if (d.dsr === true) byDepot[dep].dsr += 1;
        });
        return Object.keys(byDepot).sort().map(function (dep) {
          var o = byDepot[dep];
          return {
            depot: o.depot,
            totalDeliveries: o.totalDeliveries,
            pre12: o.pre12,
            asr: o.asr,
            dsr: o.dsr
          };
        });
      }

      /** Gera HTML das listas Pre-12, ASR e DSR a partir de um array de entregas. Slot PM não tem Pre-12. */
      function getPre12AsrDsrTableHtmlFromDeliveries(deliveries) {
        var slot = (discoState.slot || 'AM').trim();
        var showPre12 = slot === 'AM';
        var pre12 = showPre12 ? deliveries.filter(function (d) { return d.pre12 === true; }) : [];
        var asr = deliveries.filter(function (d) { return d.asr === true; });
        var dsr = deliveries.filter(function (d) { return d.dsr === true; });
        function rowsHtml(list) {
          if (!list.length) return '';
          return list.map(function (d) {
            var pc = escapeHtml((d.subpostcode || '').trim());
            var addr = escapeHtml((d.address || '').trim());
            return '<tr><td class="disco-addr-postcode">' + pc + '</td><td class="disco-addr-address">' + addr + '</td></tr>';
          }).join('');
        }
        function blockHtml(title, list) {
          var onlyHeader = !list.length;
          var body = onlyHeader ? '' : '<div class="disco-route-detail-address-list">' +
            '<table class="disco-route-address-table"><tbody>' + rowsHtml(list) + '</tbody></table></div>';
          return '<div class="disco-route-detail-list-block' + (onlyHeader ? ' disco-route-detail-list-block--header-only' : '') + '">' +
            '<h4 class="disco-route-detail-list-title">' + title + '</h4>' + body + '</div>';
        }
        var pre12Block = showPre12 ? blockHtml('Pre-12', pre12) : '';
        return '<div class="disco-route-detail-content">' +
          '<div class="disco-route-detail-lists">' +
            pre12Block +
            blockHtml('ASR', asr) +
            blockHtml('DSR', dsr) +
          '</div></div>';
      }

      /** HTML das listas Pre-12, ASR e DSR para um card de rota (tabela por categoria). */
      function getRoutePre12AsrDsrTableHtml(routeName) {
        return getPre12AsrDsrTableHtmlFromDeliveries(getDeliveriesForRoute(routeName));
      }

      /** HTML das listas Pre-12, ASR e DSR para um card de depot. */
      function getDepotPre12AsrDsrTableHtml(depotName) {
        return getPre12AsrDsrTableHtmlFromDeliveries(getDeliveriesForDepot(depotName));
      }

      /** HTML das listas Pre-12, ASR e DSR para um card de loop (depot já no estado). */
      function getLoopPre12AsrDsrTableHtml(loopName) {
        return getPre12AsrDsrTableHtmlFromDeliveries(getDeliveriesForLoop(discoState.depot, loopName));
      }

      /** Total stops no header: conta conforme filtros (depot/loop/slot). Switch AM/PM: só o selecionado fica aceso. */
      function updateStopsKpi() {
        var list = getFilteredDiscoDeliveries();
        var el = document.getElementById('dashboardStopsValue');
        if (el) el.textContent = list.length;
        var slot = (discoState.slot || 'AM').trim();
        var gravuraAm = document.getElementById('discoGravuraAm');
        var gravuraPm = document.getElementById('discoGravuraPm');
        if (gravuraAm) {
          gravuraAm.classList.toggle('disco-gravura-on', slot === 'AM');
          gravuraAm.setAttribute('aria-pressed', slot === 'AM' ? 'true' : 'false');
        }
        if (gravuraPm) {
          gravuraPm.classList.toggle('disco-gravura-on', slot === 'PM');
          gravuraPm.setAttribute('aria-pressed', slot === 'PM' ? 'true' : 'false');
        }
      }

      function getDiscoGeneralSummary() {
        var list = getFilteredDiscoDeliveries();
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
        var totalRoutes = Object.keys(routes).length;
        var spr = totalRoutes > 0 ? totalDeliveries / totalRoutes : 0;
        var sporH = totalRoutes > 0 ? (totalDeliveries / totalRoutes) / 8 : 0;
        return {
          totalDeliveries: totalDeliveries,
          totalRoutes: totalRoutes,
          depotsCount: Object.keys(depots).length,
          loopsCount: Object.keys(loops).length,
          pre12: pre12,
          asr: asr,
          dsr: dsr,
          spr: spr,
          sporH: sporH
        };
      }

      /** Resumo calculado sobre os dados já filtrados por depot/loop activos. */
      function getFilteredDiscoSummary() {
        var list = getFilteredDiscoDeliveries();
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
        var totalRoutes = Object.keys(routes).length;
        var spr = totalRoutes > 0 ? totalDeliveries / totalRoutes : 0;
        var sporH = totalRoutes > 0 ? (totalDeliveries / totalRoutes) / 8 : 0;
        return {
          totalDeliveries: totalDeliveries,
          totalRoutes: totalRoutes,
          depotsCount: Object.keys(depots).length,
          loopsCount: Object.keys(loops).length,
          pre12: pre12,
          asr: asr,
          dsr: dsr,
          spr: spr,
          sporH: sporH
        };
      }

      /** Resumo por loop para um depot: array de { loop, totalDeliveries, totalRoutes, pre12, asr, dsr }. Respeita slot AM/PM. */
      function getDiscoLoopSummary(depot) {
        var list = getDiscoDeliveries();
        var depotTrim = (depot || '').trim();
        var slot = (discoState.slot || '').trim();
        var byLoop = {};
        list.forEach(function (d) {
          if (slot && (d.slot || '').trim() !== slot) return;
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
        // Performance: usar requestAnimationFrame para renderização suave
        requestAnimationFrame(function() {
          var depotChips = document.getElementById('discoDepotChips');
          var loopChips = document.getElementById('discoLoopChips');
          var routeBlocks = document.getElementById('discoRouteBlocks');
          var noData = document.getElementById('discoNoData');
          var deliveries = getDiscoDeliveries();
          updateStopsKpi();
        if (!deliveries.length) {
          if (noData) noData.classList.remove('hidden');
          document.getElementById('dashboardStopsValue') && (document.getElementById('dashboardStopsValue').textContent = '—');
          if (depotChips) depotChips.innerHTML = '';
          if (loopChips) loopChips.innerHTML = '';
          if (routeBlocks) routeBlocks.innerHTML = '';
          document.getElementById('discoSummaryBlock') && document.getElementById('discoSummaryBlock').classList.add('hidden');
          document.getElementById('discoDepotBlocksWrap') && document.getElementById('discoDepotBlocksWrap').classList.add('hidden');
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

        /* Resumo KPI: sempre visível, actualiza com os filtros activos */
        if (summaryBlock) {
          summaryBlock.classList.remove('hidden');
          var summary = getFilteredDiscoSummary();
          var grid = document.getElementById('discoSummaryGrid');

          /* Título dinâmico com badges de contexto */
          var summaryTitle = summaryBlock.querySelector('.disco-summary-title');
          if (summaryTitle) {
            var badges = '';
            if (hasDepot) badges += '<span class="disco-summary-filter-badge">' + escapeHtml(discoState.depot) + '</span>';
            if (hasLoop) badges += '<span class="disco-summary-filter-badge disco-summary-filter-badge--loop">' + escapeHtml(discoState.loop) + '</span>';
            summaryTitle.innerHTML = 'Summary' + (badges ? '<span class="disco-summary-filter-ctx">' + badges + '</span>' : '');
          }

          /* Marcar card como "filtrado" visualmente */
          var summaryCard = summaryBlock.querySelector('.disco-summary-card');
          if (summaryCard) summaryCard.classList.toggle('disco-summary-card--filtered', hasDepot || hasLoop);

          if (grid) {
            var items = '';
            items +=
              '<div class="disco-summary-item">' +
                '<span class="disco-summary-value">' + summary.totalDeliveries + '</span>' +
                '<span class="disco-summary-label">Total deliveries</span>' +
              '</div>' +
              '<div class="disco-summary-item">' +
                '<span class="disco-summary-value">' + summary.totalRoutes + '</span>' +
                '<span class="disco-summary-label">Routes</span>' +
              '</div>' +
              '<div class="disco-summary-item disco-summary-item--kpi">' +
                '<span class="disco-summary-value">' + (summary.totalRoutes ? summary.spr.toFixed(1) : '—') + '</span>' +
                '<span class="disco-summary-label">SPR (Stops/Route)</span>' +
              '</div>' +
              '<div class="disco-summary-item disco-summary-item--kpi">' +
                '<span class="disco-summary-value">' + (summary.totalRoutes ? summary.sporH.toFixed(1) : '—') + '</span>' +
                '<span class="disco-summary-label">SPOR-H (÷8h)</span>' +
              '</div>';

            /* Mostrar Depots apenas quando não está filtrado por depot específico */
            if (!hasDepot) {
              items +=
                '<div class="disco-summary-item">' +
                  '<span class="disco-summary-value">' + summary.depotsCount + '</span>' +
                  '<span class="disco-summary-label">Depots</span>' +
                '</div>';
            }

            /* Mostrar Loops apenas quando não está filtrado por loop específico */
            if (!hasLoop) {
              items +=
                '<div class="disco-summary-item">' +
                  '<span class="disco-summary-value">' + summary.loopsCount + '</span>' +
                  '<span class="disco-summary-label">Loops</span>' +
                '</div>';
            }

            if ((discoState.slot || 'AM').trim() === 'AM') {
              items += '<div class="disco-summary-item">' +
                '<span class="disco-summary-value">' + summary.pre12 + '</span>' +
                '<span class="disco-summary-label">Pre-12</span>' +
              '</div>';
            }
            items +=
              '<div class="disco-summary-item">' +
                '<span class="disco-summary-value">' + summary.asr + '</span>' +
                '<span class="disco-summary-label">ASR</span>' +
              '</div>' +
              '<div class="disco-summary-item">' +
                '<span class="disco-summary-value">' + summary.dsr + '</span>' +
                '<span class="disco-summary-label">DSR</span>' +
              '</div>';

            grid.innerHTML = items;
          }
        }

        /* Cards por depot (Depot = Todos, Loop = Todos): um card por depot com Pre-12, ASR e DSR */
        var depotBlocksWrap = document.getElementById('discoDepotBlocksWrap');
        var depotBlocks = document.getElementById('discoDepotBlocks');
        if (depotBlocksWrap && depotBlocks) {
          if (!hasDepot && !hasLoop) {
            depotBlocksWrap.classList.remove('hidden');
            var depotItems = getDiscoDepotSummary();
            depotBlocks.innerHTML = depotItems.map(function (item) {
              return '<div class="disco-route-block disco-depot-block shadow-sm" data-depot="' + escapeHtml(item.depot) + '">' +
                '<div class="disco-route-block-head d-flex justify-content-between align-items-center flex-wrap gap-2">' +
                  '<span class="disco-route-block-name">' + escapeHtml(item.depot) + '</span>' +
                  '<span class="disco-route-block-stops">' + item.totalDeliveries + ' deliveries</span>' +
                '</div>' +
                '<div class="disco-route-block-summary d-flex flex-wrap gap-2">' +
                  (discoState.slot === 'AM' ? '<span class="disco-route-block-badge">Pre-12: ' + item.pre12 + '</span>' : '') +
                  '<span class="disco-route-block-badge">ASR: ' + item.asr + '</span>' +
                  '<span class="disco-route-block-badge">DSR: ' + item.dsr + '</span>' +
                '</div>' +
                getDepotPre12AsrDsrTableHtml(item.depot) +
                '</div>';
            }).join('');
            depotBlocks.setAttribute('data-count', String(depotItems.length));
          } else {
            depotBlocksWrap.classList.add('hidden');
            depotBlocks.innerHTML = '';
            depotBlocks.removeAttribute('data-count');
          }
        }

        /* Blocos por loop (depot selecionado, loop = Todos): um card por loop com Pre-12, ASR e DSR */
        if (loopSummaryBlock) {
          if (hasDepot && !hasLoop) {
            loopSummaryBlock.classList.remove('hidden');
            var loopSummaryTitle = document.getElementById('discoLoopSummaryTitle');
            if (loopSummaryTitle) loopSummaryTitle.textContent = 'Depot loops: ' + escapeHtml(discoState.depot);
            var loopGrid = document.getElementById('discoLoopSummaryGrid');
            if (loopGrid) {
              var loopItems = getDiscoLoopSummary(discoState.depot);
              loopGrid.innerHTML = loopItems.map(function (item) {
                return '<div class="disco-route-block disco-loop-block shadow-sm" data-loop="' + escapeHtml(item.loop) + '">' +
                  '<div class="disco-route-block-head d-flex justify-content-between align-items-center flex-wrap gap-2">' +
                    '<span class="disco-route-block-name">' + escapeHtml(item.loop) + '</span>' +
                    '<span class="disco-route-block-stops">' + item.totalDeliveries + ' deliveries</span>' +
                  '</div>' +
                  '<div class="disco-route-block-summary d-flex flex-wrap gap-2">' +
                    (discoState.slot === 'AM' ? '<span class="disco-route-block-badge">Pre-12: ' + item.pre12 + '</span>' : '') +
                    '<span class="disco-route-block-badge">ASR: ' + item.asr + '</span>' +
                    '<span class="disco-route-block-badge">DSR: ' + item.dsr + '</span>' +
                  '</div>' +
                  getLoopPre12AsrDsrTableHtml(item.loop) +
                  '</div>';
              }).join('');
              loopGrid.setAttribute('data-count', String(loopItems.length));
            }
          } else {
            loopSummaryBlock.classList.add('hidden');
            if (document.getElementById('discoLoopSummaryGrid')) document.getElementById('discoLoopSummaryGrid').removeAttribute('data-count');
          }
        }

        var depots = getDiscoUniqueDepots();
        var loops = getDiscoUniqueLoops();
        if (depotChips) {
          depotChips.innerHTML = '<button type="button" class="disco-chip' + (!discoState.depot ? ' active' : '') + '" data-depot="">All</button>' +
            depots.map(function (d) {
              return '<button type="button" class="disco-chip' + (discoState.depot === d ? ' active' : '') + '" data-depot="' + escapeHtml(d) + '">' + escapeHtml(d) + '</button>';
            }).join('');
        }
        if (loopChips) {
          loopChips.innerHTML = '<button type="button" class="disco-chip' + (!discoState.loop ? ' active' : '') + '" data-loop="">All</button>' +
            loops.map(function (l) {
              return '<button type="button" class="disco-chip' + (discoState.loop === l ? ' active' : '') + '" data-loop="' + escapeHtml(l) + '">' + escapeHtml(l) + '</button>';
            }).join('');
        }

        /* Blocos de rotas: quando há loop selecionado (com ou sem depot) */
        if (routeBlocks) {
          if (hasLoop) {
            routeBlocks.classList.remove('hidden');
            routeBlocks.innerHTML = routesWithSummary.map(function (item) {
              return '<div class="disco-route-block shadow-sm" data-route="' + escapeHtml(item.route) + '">' +
                '<div class="disco-route-block-head d-flex justify-content-between align-items-center flex-wrap gap-2">' +
                  '<span class="disco-route-block-name">' + escapeHtml(item.route) + '</span>' +
                  '<span class="disco-route-block-stops">' + item.stops + ' stops</span>' +
                '</div>' +
                '<div class="disco-route-block-summary d-flex flex-wrap gap-2">' +
                  (discoState.slot === 'AM' ? '<span class="disco-route-block-badge">Pre-12: ' + item.pre12 + '</span>' : '') +
                  '<span class="disco-route-block-badge">ASR: ' + item.asr + '</span>' +
                  '<span class="disco-route-block-badge">DSR: ' + item.dsr + '</span>' +
                '</div>' +
                getRoutePre12AsrDsrTableHtml(item.route) +
                '</div>';
            }).join('');
            routeBlocks.setAttribute('data-count', String(routesWithSummary.length));
          } else {
            routeBlocks.classList.add('hidden');
            routeBlocks.innerHTML = '';
            routeBlocks.removeAttribute('data-count');
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
        }); // Fim do requestAnimationFrame
      }

      function initDisco() {
        var gravuraAm = document.getElementById('discoGravuraAm');
        var gravuraPm = document.getElementById('discoGravuraPm');
        if (gravuraAm) {
          gravuraAm.addEventListener('click', function () {
            discoState.slot = 'AM';
            updateDiscoSection();
          });
        }
        if (gravuraPm) {
          gravuraPm.addEventListener('click', function () {
            discoState.slot = 'PM';
            updateDiscoSection();
          });
        }
        var noData = document.getElementById('discoNoData');
        var deliveries = getDiscoDeliveries();
        if (!deliveries.length) {
          if (noData) noData.classList.remove('hidden');
          document.getElementById('dashboardStopsValue') && (document.getElementById('dashboardStopsValue').textContent = '—');
          document.getElementById('discoDepotChips') && (document.getElementById('discoDepotChips').innerHTML = '');
          document.getElementById('discoLoopChips') && (document.getElementById('discoLoopChips').innerHTML = '');
          document.getElementById('discoRouteBlocks') && (document.getElementById('discoRouteBlocks').innerHTML = '');
          var depotWrap = document.getElementById('discoDepotBlocksWrap');
          var depotBlocks = document.getElementById('discoDepotBlocks');
          if (depotWrap) depotWrap.classList.add('hidden');
          if (depotBlocks) depotBlocks.innerHTML = '';
          document.getElementById('discoLoopSummaryBlock') && document.getElementById('discoLoopSummaryBlock').classList.add('hidden');
          return;
        }
        updateDiscoSection();
      }

      /** Modal do Disco: fixa no body para permanecer visível mesmo quando filtros são aplicados */
      function initDiscoModal() {
        var modal = document.getElementById('discoRouteModal');
        var modalTitle = document.getElementById('discoRouteModalTitle');
        var modalBody = document.getElementById('discoRouteModalBody');
        var backdrop = document.getElementById('discoRouteModalBackdrop');
        var closeBtn = document.getElementById('discoRouteModalClose');
        if (!modal || !modalBody) return;

        function closeDiscoModal() {
          modal.classList.add('hidden');
          modal.setAttribute('aria-hidden', 'true');
        }

        function openDiscoModal(title, contentHtml) {
          if (modalTitle) modalTitle.textContent = title;
          if (modalBody) modalBody.innerHTML = contentHtml;
          modal.classList.remove('hidden');
          modal.setAttribute('aria-hidden', 'false');
        }

        document.addEventListener('click', function (e) {
          if (e.target.closest('.disco-chip')) return;
          var block = e.target.closest('.disco-route-block');
          if (!block) return;
          var route = block.getAttribute('data-route');
          var depot = block.getAttribute('data-depot');
          var loop = block.getAttribute('data-loop');
          var title = '';
          var content = '';
          if (route) {
            title = 'Route: ' + (route || '');
            content = getRoutePre12AsrDsrTableHtml(route);
          } else if (depot) {
            title = 'Depot: ' + (depot || '');
            content = getDepotPre12AsrDsrTableHtml(depot);
          } else if (loop) {
            title = 'Loop: ' + (loop || '');
            content = getLoopPre12AsrDsrTableHtml(loop);
          }
          if (content) openDiscoModal(title, content);
        });

        if (backdrop) backdrop.addEventListener('click', closeDiscoModal);
        if (closeBtn) closeBtn.addEventListener('click', closeDiscoModal);
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeDiscoModal();
        });
      }

      if (spName) {
        render();
        var tabLastDay = document.getElementById('folderLastDay');
        var tabSpms = document.getElementById('folderSpms');
        var tabLd = document.getElementById('folderLd');
        if (tabLastDay) tabLastDay.addEventListener('click', function () { switchFolderTab('lastday'); });
        if (tabSpms) tabSpms.addEventListener('click', function () { switchFolderTab('spms'); });
        if (tabLd) tabLd.addEventListener('click', function () { switchFolderTab('ld'); });
        initLastDay();
        initSpms();
        initLiquidationDamages();
        switchFolderTab('lastday');
        initNotificationsSidebar();
        seedSpDefaultContent();
        initAvisosStripAndModal();
        initAvisosModalTabs();
        if (document.getElementById('spCreateTypeModal')) initCreateTypeModal();
        else renderNetworkDelayList();
        initCarousel();
        if (document.getElementById('openFullDashboardBtn')) initFullDashboardModal();
      }
      initDisco();
      initDiscoModal();

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

      document.addEventListener('DOMContentLoaded', function () {
      });
    })();
