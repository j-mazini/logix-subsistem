    (function () {
      'use strict';
      var SP_STORAGE_KEY = 'dhl_sp_portal_current_sp';
      var ASSET = function (path) { return path ? path.replace(/^assets\//, '../assets/') : ''; };
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

      var MOCK_POSTS = [
        { id: 0, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '1 hour ago', type: 'tutorial', title: 'DHL Training Video', content: 'Watch the DHL training video directly on the platform.', video: 'assets/videos/dhl-training-1.mp4', image: null, likes: 15, comments: 3, liked: false, commentList: [{ author: 'James T.', authorAvatar: 'assets/dhl-uk-logo.png', text: 'Really clear video, thanks.', timeAgo: '50 min ago' }] },
        { id: 1, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '2 hours ago', type: 'tutorial', title: 'Safe Loading Procedures', content: 'Updated tutorial for safe loading and unloading of parcels.', image: 'assets/sop-dhl-truck-london.png', likes: 24, comments: 8, liked: false, commentList: [] },
        { id: 2, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '1 day ago', type: 'update', title: 'New Depot Hours – MSE & LCY', content: 'Effective from next Monday, MSE and LCY depots will operate extended hours.', image: null, likes: 42, comments: 12, liked: false, commentList: [] },
        { id: 3, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '3 days ago', type: 'info', title: 'Time Window (TW) Compliance Reminder', content: 'Please ensure all deliveries are completed within the agreed time windows.', image: null, likes: 67, comments: 5, liked: true, commentList: [] }
      ];

      function escapeHtml(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
      }

      function getPostPreviewHtml(p) {
        var typeLabel = p.type === 'tutorial' ? 'Tutorial' : p.type === 'update' ? 'Update' : 'Info';
        var contentPreview = (p.content || '').length > 90 ? (p.content.substring(0, 90) + '…') : (p.content || '');
        var thumbHtml = '';
        if (p.video) thumbHtml = '<span class="sop-post-preview-thumb sop-post-preview-thumb--video"><i class="bi bi-play-fill"></i></span>';
        else if (p.image) thumbHtml = '<span class="sop-post-preview-thumb sop-post-preview-thumb--image" style="background-image:url(\'' + ASSET(p.image) + '\')"></span>';
        return '<div class="sop-post-header">' +
          '<div class="sop-post-avatar"><img src="' + ASSET(p.authorAvatar) + '" alt="" width="40" height="40" /></div>' +
          '<div class="sop-post-meta"><strong class="sop-post-author">' + escapeHtml(p.author) + '</strong>' +
          '<span class="sop-post-badge sop-post-badge--' + p.type + '">' + escapeHtml(typeLabel) + '</span>' +
          '<span class="sop-post-time">' + escapeHtml(p.timeAgo) + '</span></div></div>' +
          '<div class="sop-post-body">' +
          (p.title ? '<h3 class="sop-post-title">' + escapeHtml(p.title) + '</h3>' : '') +
          '<p class="sop-post-content sop-post-content--preview">' + escapeHtml(contentPreview) + '</p>' +
          (thumbHtml ? '<div class="sop-post-preview-media">' + thumbHtml + '</div>' : '') +
          '</div><span class="sop-post-preview-cta">View post</span>';
      }

      function getPostHtml(p) {
        var typeLabel = p.type === 'tutorial' ? 'Tutorial' : p.type === 'update' ? 'Update' : 'Info';
        var likeClass = p.liked ? 'sop-action-btn sop-action-btn--active' : 'sop-action-btn';
        var mediaHtml = '';
        if (p.video) mediaHtml = '<div class="sop-post-media sop-post-media--video"><video controls preload="metadata"><source src="' + ASSET(p.video) + '" type="video/mp4"></video></div>';
        else if (p.image) mediaHtml = '<div class="sop-post-media sop-post-media--image"><img src="' + ASSET(p.image) + '" alt="" /></div>';
        var commentsHtml = (p.commentList || []).map(function (c) {
          return '<div class="sop-comment"><div class="sop-comment-avatar"><img src="' + ASSET(c.authorAvatar) + '" alt="" width="32" height="32" /></div>' +
            '<div class="sop-comment-body"><strong class="sop-comment-author">' + escapeHtml(c.author) + '</strong> <span class="sop-comment-time">' + escapeHtml(c.timeAgo) + '</span>' +
            '<p class="sop-comment-text">' + escapeHtml(c.text) + '</p></div></div>';
        }).join('');
        return '<div class="sop-post-header">' +
          '<div class="sop-post-avatar"><img src="' + ASSET(p.authorAvatar) + '" alt="" width="40" height="40" /></div>' +
          '<div class="sop-post-meta"><strong class="sop-post-author">' + escapeHtml(p.author) + '</strong>' +
          '<span class="sop-post-badge sop-post-badge--' + p.type + '">' + escapeHtml(typeLabel) + '</span>' +
          '<span class="sop-post-time">' + escapeHtml(p.timeAgo) + '</span></div></div>' +
          '<div class="sop-post-body">' + (p.title ? '<h3 class="sop-post-title">' + escapeHtml(p.title) + '</h3>' : '') +
          '<p class="sop-post-content">' + escapeHtml(p.content) + '</p>' + mediaHtml + '</div>' +
          '<div class="sop-post-actions">' +
          '<button type="button" class="' + likeClass + '" data-action="like" data-id="' + p.id + '"><i class="bi bi-' + (p.liked ? 'heart-fill' : 'heart') + '"></i><span>' + (p.liked ? 'Liked' : 'Like') + '</span>' + (p.likes > 0 ? '<span class="sop-action-count">' + p.likes + '</span>' : '') + '</button>' +
          '<button type="button" class="sop-action-btn" data-action="comment" data-id="' + p.id + '"><i class="bi bi-chat"></i><span>Comment</span></button>' +
          '</div>' +
          '<div class="sop-comments"><h4 class="sop-comments-title">Comments</h4><div class="sop-comments-list">' + commentsHtml + '</div></div>';
      }

      function render(search) {
        var q = (search || '').toLowerCase().trim();
        var list = q ? MOCK_POSTS.filter(function (p) {
          var t = (p.title || '') + ' ' + (p.content || '') + ' ' + (p.type || '');
          return t.toLowerCase().indexOf(q) !== -1;
        }) : MOCK_POSTS;
        var feed = document.getElementById('sopFeed');
        if (!feed) return;
        feed.innerHTML = list.map(function (p) {
          return '<article class="sop-post sop-post--preview" data-id="' + p.id + '" role="button" tabindex="0">' + getPostPreviewHtml(p) + '</article>';
        }).join('');
      }

      function openPost(id) {
        var post = MOCK_POSTS.find(function (p) { return p.id === id; });
        if (!post) return;
        var detail = document.getElementById('sopPostDetail');
        var content = document.getElementById('sopPostDetailContent');
        var placeholder = document.getElementById('sopPostDetailPlaceholder');
        var closeBtn = document.getElementById('sopPostDetailClose');
        if (detail && content) {
          if (placeholder) placeholder.style.display = 'none';
          if (closeBtn) closeBtn.style.display = 'flex';
          content.innerHTML = '<article class="sop-post sop-post--detail" data-id="' + post.id + '">' + getPostHtml(post) + '</article>';
          detail.classList.add('sop-post-detail--open');
          detail.setAttribute('aria-hidden', 'false');
        }
      }

      function closePost() {
        var detail = document.getElementById('sopPostDetail');
        var content = document.getElementById('sopPostDetailContent');
        var placeholder = document.getElementById('sopPostDetailPlaceholder');
        var closeBtn = document.getElementById('sopPostDetailClose');
        if (detail) {
          detail.classList.remove('sop-post-detail--open');
          detail.setAttribute('aria-hidden', 'true');
          if (placeholder) placeholder.style.display = '';
          if (closeBtn) closeBtn.style.display = 'none';
          if (content) content.innerHTML = '<p class="sop-post-detail-placeholder" id="sopPostDetailPlaceholder">Click a post to open it</p>';
        }
      }

      var spName = getCurrentSp();
      if (spName) {
        document.getElementById('spHeaderName').textContent = spName;
        var logoMap = { 'BA Express': 'ba-express-logo.png', 'Premier Logistics Ltd': 'premier-logistics-logo.png', 'Swift Haul Solutions': 'swift-haul-logo.png', 'Metro Freight Partners': 'metro-freight-logo.png', 'Atlas Transport Services': 'atlas-transport-logo.png' };
        var avatar = document.getElementById('spHeaderAvatar');
        if (avatar && logoMap[spName]) { avatar.src = '../assets/' + logoMap[spName]; avatar.alt = spName; avatar.style.display = 'block'; }
      }
      appendSpToLinks();
      render();

      document.getElementById('sopSearch').addEventListener('input', function () { render(this.value); });

      document.getElementById('sopFeed').addEventListener('click', function (e) {
        var post = e.target.closest('.sop-post--preview');
        if (post && post.dataset.id) openPost(parseInt(post.dataset.id, 10));
      });
      document.getElementById('sopPostDetailBackdrop').addEventListener('click', closePost);
      document.getElementById('sopPostDetailClose').addEventListener('click', closePost);

      document.getElementById('sopPostDetailContent').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action="like"]');
        if (btn) {
          var id = parseInt(btn.dataset.id, 10);
          var post = MOCK_POSTS.find(function (p) { return p.id === id; });
          if (post) { post.liked = !post.liked; post.likes += post.liked ? 1 : -1; openPost(id); }
        }
      });

      function initBeamSidebar() {
        var beam = document.getElementById('beamSidebar');
        var trigger = document.getElementById('beamTrigger');
        var overlay = document.getElementById('beamOverlay');
        if (!beam || !trigger) return;
        function toggleBeam() {
          var isOpen = beam.getAttribute('data-state') === 'open';
          beam.setAttribute('data-state', isOpen ? 'closed' : 'open');
          trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
          if (overlay) overlay.classList.toggle('visible', !isOpen);
        }
        trigger.addEventListener('click', toggleBeam);
        if (overlay) overlay.addEventListener('click', function () { beam.setAttribute('data-state', 'closed'); trigger.setAttribute('aria-expanded', 'false'); overlay.classList.remove('visible'); });
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBeamSidebar);
      else initBeamSidebar();
    })();
