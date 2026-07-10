    (function () {
      'use strict';
      var SP_STORAGE_KEY = 'dhl_sp_portal_current_sp';
      var SEARCH_DEBOUNCE_MS = 200;
      var ASSET = function (path) { return path ? path.replace(/^assets\//, '../../assets/') : ''; };
      function debounce(fn, ms) {
        var t;
        return function () {
          var self = this, args = arguments;
          if (t) clearTimeout(t);
          t = setTimeout(function () { fn.apply(self, args); }, ms);
        };
      }
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
      function getSpOwnerAndCompany() {
        var spName = getCurrentSp();
        if (!spName || !window.DHL_MOCK_DATA || !window.DHL_MOCK_DATA.serviceProviders) return { owner: 'User', company: spName || '—' };
        var sp = window.DHL_MOCK_DATA.serviceProviders.find(function (p) { return p.name === spName; });
        return { owner: (sp && sp.owner) ? sp.owner : 'User', company: spName };
      }
      function getCommentAuthorDisplay(c) {
        if (!c) return '';
        var name = c.author || 'User';
        var company = c.company || '';
        return company ? name + ' (' + company + ')' : name;
      }

      var MOCK_POSTS = (function () {
        if (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.sopPosts && window.DHL_MOCK_DATA.sopPosts.length) {
          return window.DHL_MOCK_DATA.sopPosts.map(function (p) {
            var c = { id: p.id, author: p.author, authorAvatar: p.authorAvatar, timeAgo: p.timeAgo, type: p.type, title: p.title, content: p.content, video: p.video, image: p.image, youtubeVideoId: p.youtubeVideoId, likes: p.likes, comments: p.comments, liked: p.liked };
            c.commentList = (p.commentList || []).map(function (x) { return { author: x.author, company: x.company, authorAvatar: x.authorAvatar, text: x.text, timeAgo: x.timeAgo }; });
            return c;
          });
        }
        return [
          { id: 0, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '1 hour ago', type: 'tutorial', title: 'DHL Training Video', content: 'Watch the DHL training video directly on the platform.', video: 'assets/videos/dhl-training-1.mp4', image: null, youtubeVideoId: null, likes: 15, comments: 3, liked: false, commentList: [{ author: 'James T.', company: 'BA Express', authorAvatar: 'assets/ba-express-logo.png', text: 'Really clear video, thanks.', timeAgo: '50 min ago' }] },
          { id: 1, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '2 hours ago', type: 'tutorial', title: 'Safe Loading Procedures', content: 'Updated tutorial for safe loading and unloading of parcels.', image: 'assets/sop-dhl-truck-london.png', video: null, youtubeVideoId: null, likes: 24, comments: 8, liked: false, commentList: [] },
          { id: 2, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '1 day ago', type: 'update', title: 'New Depot Hours – MSE & LCY', content: 'Effective from next Monday, MSE and LCY depots will operate extended hours.', image: null, video: null, youtubeVideoId: null, likes: 42, comments: 12, liked: false, commentList: [] },
          { id: 3, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '3 days ago', type: 'info', title: 'Time Window (TW) Compliance Reminder', content: 'Please ensure all deliveries are completed within the agreed time windows.', image: null, video: null, youtubeVideoId: null, likes: 67, comments: 5, liked: true, commentList: [] }
        ];
      })();

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
        if (p.youtubeVideoId) {
          var thumbUrl = 'https://img.youtube.com/vi/' + escapeHtml(p.youtubeVideoId) + '/hqdefault.jpg';
          thumbHtml = '<span class="sop-post-preview-thumb sop-post-preview-thumb--video" style="background-image:url(\'' + thumbUrl + '\')"><i class="bi bi-play-fill"></i></span>';
        } else if (p.video) thumbHtml = '<span class="sop-post-preview-thumb sop-post-preview-thumb--video"><i class="bi bi-play-fill"></i></span>';
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
        if (p.youtubeVideoId) {
          var vid = escapeHtml(p.youtubeVideoId);
          mediaHtml = '<a href="https://www.youtube.com/watch?v=' + vid + '" target="_blank" rel="noopener noreferrer" class="sop-post-media sop-post-media--youtube sop-youtube-link" title="Watch on YouTube"><span class="sop-youtube-thumb" style="background-image:url(\'https://img.youtube.com/vi/' + vid + '/hqdefault.jpg\')"></span><span class="sop-youtube-play"><i class="bi bi-play-circle-fill"></i></span><span class="sop-youtube-label">Watch on YouTube</span></a>';
        } else if (p.video) mediaHtml = '<div class="sop-post-media sop-post-media--video"><video controls preload="metadata"><source src="' + ASSET(p.video) + '" type="video/mp4"></video></div>';
        else if (p.image) mediaHtml = '<div class="sop-post-media sop-post-media--image"><img src="' + ASSET(p.image) + '" alt="" /></div>';
        var commentsHtml = (p.commentList || []).map(function (c) {
          return '<div class="sop-comment"><div class="sop-comment-avatar"><img src="' + ASSET(c.authorAvatar) + '" alt="" width="32" height="32" /></div>' +
            '<div class="sop-comment-body"><strong class="sop-comment-author">' + escapeHtml(getCommentAuthorDisplay(c)) + '</strong> <span class="sop-comment-time">' + escapeHtml(c.timeAgo) + '</span>' +
            '<p class="sop-comment-text">' + escapeHtml(c.text) + '</p></div></div>';
        }).join('');
        var logoMap = { 'BA Express': 'ba-express-logo.png', 'Premier Logistics Ltd': 'premier-logistics-logo.png', 'Swift Haul Solutions': 'swift-haul-logo.png', 'Metro Freight Partners': 'metro-freight-logo.png', 'Atlas Transport Services': 'atlas-transport-logo.png' };
        var spName = getCurrentSp();
        var avatarSrc = (spName && logoMap[spName]) ? ASSET('assets/' + logoMap[spName]) : ASSET('assets/dhl-uk-logo.png');
        var commentFormHtml = '<form class="sop-comments-form" data-post-id="' + p.id + '">' +
          '<div class="sop-comments-input-wrap">' +
          '<img src="' + avatarSrc + '" alt="" class="sop-comment-input-avatar" width="32" height="32" />' +
          '<input type="text" class="sop-comments-input" placeholder="Write a comment..." maxlength="500" />' +
          '</div>' +
          '<button type="submit" class="sop-comments-submit">Comment</button>' +
          '</form>';
        return '<div class="sop-post-header">' +
          '<div class="sop-post-avatar"><img src="' + ASSET(p.authorAvatar) + '" alt="" width="40" height="40" /></div>' +
          '<div class="sop-post-meta"><strong class="sop-post-author">' + escapeHtml(p.author) + '</strong>' +
          '<span class="sop-post-badge sop-post-badge--' + p.type + '">' + escapeHtml(typeLabel) + '</span>' +
          '<span class="sop-post-time">' + escapeHtml(p.timeAgo) + '</span></div></div>' +
          '<div class="sop-post-body">' + (p.title ? '<h3 class="sop-post-title">' + escapeHtml(p.title) + '</h3>' : '') +
          '<p class="sop-post-content">' + escapeHtml(p.content) + '</p>' + mediaHtml + '</div>' +
          '<div class="sop-post-actions">' +
          '<button type="button" class="' + likeClass + '" data-action="like" data-id="' + p.id + '"><i class="bi bi-' + (p.liked ? 'heart-fill' : 'heart') + '"></i><span>' + (p.liked ? 'Liked' : 'Like') + '</span>' + (p.likes > 0 ? '<span class="sop-action-count">' + p.likes + '</span>' : '') + '</button>' +
          '<button type="button" class="sop-action-btn" data-action="comment" data-id="' + p.id + '"><i class="bi bi-chat"></i><span>Comment</span>' + (p.comments > 0 ? '<span class="sop-action-count">' + p.comments + '</span>' : '') + '</button>' +
          '</div>' +
          '<div class="sop-comments"><h4 class="sop-comments-title">Comments</h4><div class="sop-comments-list">' + commentsHtml + '</div>' + commentFormHtml + '</div>';
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
      }
      appendSpToLinks();
      render();

      document.getElementById('sopSearch').addEventListener('input', debounce(function () { render(this.value); }, SEARCH_DEBOUNCE_MS));

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
      document.getElementById('sopPostDetailContent').addEventListener('submit', function (e) {
        var form = e.target.closest('.sop-comments-form');
        if (!form) return;
        e.preventDefault();
        var input = form.querySelector('.sop-comments-input');
        var text = (input && input.value) ? input.value.trim() : '';
        if (!text) return;
        var postId = parseInt(form.dataset.postId, 10);
        var post = MOCK_POSTS.find(function (p) { return p.id === postId; });
        if (!post) return;
        var spInfo = getSpOwnerAndCompany();
        var logoMap = { 'BA Express': 'ba-express-logo.png', 'Premier Logistics Ltd': 'premier-logistics-logo.png', 'Swift Haul Solutions': 'swift-haul-logo.png', 'Metro Freight Partners': 'metro-freight-logo.png', 'Atlas Transport Services': 'atlas-transport-logo.png' };
        var spName = getCurrentSp();
        var avatar = (spName && logoMap[spName]) ? 'assets/' + logoMap[spName] : 'assets/dhl-uk-logo.png';
        if (!post.commentList) post.commentList = [];
        post.commentList.push({ author: spInfo.owner, company: spInfo.company, authorAvatar: avatar, text: text, timeAgo: 'Just now' });
        post.comments = (post.commentList || []).length;
        input.value = '';
        openPost(postId);
      });

    })();
