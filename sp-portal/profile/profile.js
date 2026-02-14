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

      function getSpMeta(spName) {
        var data = window.DHL_MOCK_DATA;
        if (!data || !data.serviceProviders) return null;
        for (var i = 0; i < data.serviceProviders.length; i++) {
          if (data.serviceProviders[i].name === spName) return data.serviceProviders[i];
        }
        return { name: spName, owner: '', description: '', email: '', phone: '', depotManagers: {} };
      }

      function escapeAttr(s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      var spName = getCurrentSp();
      if (!spName) {
        document.getElementById('spNotFound').classList.remove('hidden');
        document.getElementById('profileForm').classList.add('hidden');
      } else {
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
        var meta = getSpMeta(spName);
        if (meta) {
          document.getElementById('profileForm').classList.remove('hidden');
          document.getElementById('profileName').value = meta.name || '';
          document.getElementById('profileOwner').value = meta.owner || '';
          document.getElementById('profileDescription').value = meta.description || '';
          document.getElementById('profileEmail').value = meta.email || '';
          document.getElementById('profilePhone').value = meta.phone || '';

          var depots = [];
          var dm = meta.depotManagers || {};
          Object.keys(dm).forEach(function (d) { depots.push(d); });
          depots.sort();
          var container = document.getElementById('depotManagersContainer');
          container.innerHTML = depots.length === 0
            ? '<p class="text-muted mb-0">No depot managers configured.</p>'
            : depots.map(function (d) {
                var m = dm[d];
                var name = (m && m.name) ? m.name : '';
                var email = (m && m.email) ? m.email : '';
                var phone = (m && m.phone) ? m.phone : '';
                return (
                  '<div class="depot-manager-row border rounded p-2 mb-2">' +
                  '<label class="form-label small text-muted">' + escapeAttr(d) + '</label>' +
                  '<div class="row g-2">' +
                  '<div class="col-12"><input type="text" class="form-control form-control-sm" data-depot="' + escapeAttr(d) + '" data-field="name" placeholder="Manager name" value="' + escapeAttr(name) + '" /></div>' +
                  '<div class="col-md-6"><input type="email" class="form-control form-control-sm" data-depot="' + escapeAttr(d) + '" data-field="email" placeholder="Email" value="' + escapeAttr(email) + '" /></div>' +
                  '<div class="col-md-6"><input type="text" class="form-control form-control-sm" data-depot="' + escapeAttr(d) + '" data-field="phone" placeholder="Phone" value="' + escapeAttr(phone) + '" /></div>' +
                  '</div></div>'
                );
              }).join('');
        }
      }

      document.getElementById('profileForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var toast = document.getElementById('profileToast');
        var toastText = document.getElementById('profileToastText');
        if (toast && toastText) {
          toastText.textContent = 'Profile saved successfully.';
          toast.removeAttribute('hidden');
          setTimeout(function () { toast.setAttribute('hidden', ''); }, 3000);
        }
      });

    })();
