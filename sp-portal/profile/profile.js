    (function () {
      'use strict';
      var SP_STORAGE_KEY = 'dhl_sp_portal_current_sp';
      var COVER_STORAGE_KEY = 'dhl_sp_profile_cover';
      var AVATAR_STORAGE_KEY = 'dhl_sp_profile_avatar';

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

      function getStoredCover() {
        try {
          var raw = localStorage.getItem(COVER_STORAGE_KEY);
          if (!raw) return null;
          var data = JSON.parse(raw);
          return data[getCurrentSp()] || null;
        } catch (e) { return null; }
      }

      function setStoredCover(dataUrl) {
        try {
          var raw = localStorage.getItem(COVER_STORAGE_KEY);
          var all = raw ? JSON.parse(raw) : {};
          all[getCurrentSp()] = dataUrl;
          localStorage.setItem(COVER_STORAGE_KEY, JSON.stringify(all));
        } catch (e) {}
      }

      function getStoredAvatar() {
        try {
          var raw = localStorage.getItem(AVATAR_STORAGE_KEY);
          if (!raw) return null;
          var data = JSON.parse(raw);
          return data[getCurrentSp()] || null;
        } catch (e) { return null; }
      }

      function setStoredAvatar(dataUrl) {
        try {
          var raw = localStorage.getItem(AVATAR_STORAGE_KEY);
          var all = raw ? JSON.parse(raw) : {};
          all[getCurrentSp()] = dataUrl;
          localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(all));
        } catch (e) {}
      }

      function initCoverUpload() {
        var input = document.getElementById('profileCoverInput');
        var wrap = input && input.closest('.sp-profile-cover-wrap');
        var preview = document.getElementById('profileCoverPreview');
        if (!input || !preview) return;

        var stored = getStoredCover();
        if (stored) {
          preview.style.backgroundImage = 'url(' + stored + ')';
          preview.style.backgroundSize = 'cover';
          preview.style.backgroundPosition = 'center';
          wrap.classList.add('has-image');
        }

        input.addEventListener('change', function () {
          var file = input.files && input.files[0];
          if (!file || !file.type.match(/^image\//)) return;
          var reader = new FileReader();
          reader.onload = function (e) {
            var dataUrl = e.target.result;
            preview.style.backgroundImage = 'url(' + dataUrl + ')';
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            wrap.classList.add('has-image');
            setStoredCover(dataUrl);
          };
          reader.readAsDataURL(file);
        });
      }

      function initAvatarUpload() {
        var input = document.getElementById('profileAvatarInput');
        var preview = document.getElementById('profileAvatarPreview');
        var img = document.getElementById('profileAvatarImg');
        var initials = document.getElementById('profileAvatarInitials');
        if (!input || !preview) return;

        var stored = getStoredAvatar();
        if (stored) {
          if (img) { img.src = stored; img.classList.remove('d-none'); }
          if (initials) initials.style.display = 'none';
        }

        input.addEventListener('change', function () {
          var file = input.files && input.files[0];
          if (!file || !file.type.match(/^image\//)) return;
          var reader = new FileReader();
          reader.onload = function (e) {
            var dataUrl = e.target.result;
            if (img) { img.src = dataUrl; img.classList.remove('d-none'); }
            if (initials) initials.style.display = 'none';
            setStoredAvatar(dataUrl);
          };
          reader.readAsDataURL(file);
        });
      }

      var spName = getCurrentSp();
      if (!spName) {
        document.getElementById('spNotFound').classList.remove('hidden');
        document.getElementById('profileForm').classList.add('hidden');
      } else {
        document.getElementById('spHeaderName').textContent = spName;
        var logoMap = {};
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

        document.getElementById('profileForm').classList.remove('hidden');

        var meta = getSpMeta(spName);
        var displayName = document.getElementById('profileDisplayName');
        var tagline = document.getElementById('profileTagline');
        var initialsEl = document.getElementById('profileAvatarInitials');
        if (displayName) displayName.textContent = meta.name || spName;
        if (tagline) tagline.textContent = meta.owner ? 'Director: ' + meta.owner : (meta.description ? meta.description.substring(0, 80) + (meta.description.length > 80 ? '…' : '') : '—');
        if (initialsEl) initialsEl.textContent = (spName || '').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() || '—';

        if (meta) {
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

        initCoverUpload();
        initAvatarUpload();

        var avatarImg = document.getElementById('profileAvatarImg');
        var storedAvatar = getStoredAvatar();
        if (storedAvatar) {
          if (avatarImg) { avatarImg.src = storedAvatar; avatarImg.classList.remove('d-none'); }
          if (initialsEl) initialsEl.style.display = 'none';
        } else if (logoMap[spName] && avatarImg) {
          avatarImg.onerror = function () { if (initialsEl) initialsEl.style.display = 'flex'; };
          avatarImg.src = '../../assets/' + logoMap[spName];
          avatarImg.alt = spName;
          avatarImg.classList.remove('d-none');
          if (initialsEl) initialsEl.style.display = 'none';
        }
      }

      var saveBtn = document.getElementById('profileSaveBtn');
      if (saveBtn) {
        saveBtn.addEventListener('click', function () {
          var toast = document.getElementById('profileToast');
          var toastText = document.getElementById('profileToastText');
          if (toast && toastText) {
            toastText.textContent = 'Profile saved successfully.';
            toast.removeAttribute('hidden');
            setTimeout(function () { toast.setAttribute('hidden', ''); }, 3000);
          }
        });
      }
    })();
