    (function () {
      'use strict';
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
      // getCurrentSp()/appendSpToLinks()/header-pill population used to be
      // duplicated here; they now live once in sp-header-identity.js (loaded
      // before this file), which also fills #spHeaderName/#spHeaderAvatar.
      function getCurrentSp() {
        return window.SpHeaderIdentity.getCurrentSp();
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

      var STORAGE_KEY = 'dhl_sp_company_feed_posts';
      var activeFeedFilter = 'all';
      var DHL_POSTS = (function () {
        if (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.sopPosts && window.DHL_MOCK_DATA.sopPosts.length) {
          return window.DHL_MOCK_DATA.sopPosts.map(function (p) {
            var c = { id: p.id, author: p.author, authorAvatar: p.authorAvatar, timeAgo: p.timeAgo, type: p.type, title: p.title, content: p.content, video: p.video, image: p.image, youtubeVideoId: p.youtubeVideoId, likes: p.likes, comments: p.comments, liked: p.liked };
            c.commentList = (p.commentList || []).map(function (x) { return { author: x.author, company: x.company, authorAvatar: x.authorAvatar, text: x.text, timeAgo: x.timeAgo }; });
            c.source = 'dhl';
            return c;
          });
        }
        return [
          { id: 0, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '1 hour ago', type: 'tutorial', title: 'DHL Training Video', content: 'Watch the DHL training video directly on the platform.', video: 'assets/videos/dhl-training-1.mp4', image: null, youtubeVideoId: null, likes: 15, comments: 3, liked: false, commentList: [{ author: 'James T.', company: 'TBX', authorAvatar: 'assets/dhl-uk-logo.png', text: 'Really clear video, thanks.', timeAgo: '50 min ago' }], source: 'dhl' },
          { id: 1, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '2 hours ago', type: 'tutorial', title: 'Safe Loading Procedures', content: 'Updated tutorial for safe loading and unloading of parcels.', image: 'assets/sop-dhl-truck-london.png', video: null, youtubeVideoId: null, likes: 24, comments: 8, liked: false, commentList: [], source: 'dhl' },
          { id: 2, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '1 day ago', type: 'update', title: 'New Depot Hours – MSE & LCY', content: 'Effective from next Monday, MSE and LCY depots will operate extended hours.', image: null, video: null, youtubeVideoId: null, likes: 42, comments: 12, liked: false, commentList: [], source: 'dhl' },
          { id: 3, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '3 days ago', type: 'info', title: 'Time Window (TW) Compliance Reminder', content: 'Please ensure all deliveries are completed within the agreed time windows.', image: null, video: null, youtubeVideoId: null, likes: 67, comments: 5, liked: true, commentList: [], source: 'dhl' }
        ];
      })();

      function loadCompanyPosts() {
        try {
          var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
          if (stored && Array.isArray(stored) && stored.length) {
            return stored;
          }
        } catch (e) {}
        return [
          { id: 1001, author: 'TBX Admin', authorAvatar: 'assets/atlas-transport-logo.png', timeAgo: '10 min ago', type: 'update', title: 'Driver reminder: route changes this week', content: 'Please review the updated route plan before your next shift. We will publish changes directly here.', video: null, image: null, youtubeVideoId: null, likes: 4, comments: 1, liked: false, commentList: [{ author: 'Mina', company: 'TBX', authorAvatar: 'assets/atlas-transport-logo.png', text: 'Thanks for the reminder.', timeAgo: '5 min ago' }], source: 'company', audience: 'drivers' },
          { id: 1002, author: 'TBX Admin', authorAvatar: 'assets/atlas-transport-logo.png', timeAgo: '1 hour ago', type: 'info', title: 'Shared DHL guidance: time window compliance', content: 'This update was shared to your drivers from DHL guidance to keep everyone aligned.', video: null, image: null, youtubeVideoId: null, likes: 2, comments: 0, liked: false, commentList: [], source: 'company', audience: 'company', sharedFromDhlId: 3 }
        ];
      }

      function saveCompanyPosts() {
        var companyPosts = MOCK_POSTS.filter(function (p) { return p.source === 'company'; });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(companyPosts)); } catch (e) {}
      }

      function getFeedPosts() {
        var companyPosts = loadCompanyPosts();
        return companyPosts.concat(DHL_POSTS.map(function (p) {
          return Object.assign({}, p, { source: 'dhl', audience: 'company' });
        }));
      }

      var MOCK_POSTS = getFeedPosts();

      function escapeHtml(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
      }

      function getAudienceLabel(audience) {
        if (audience === 'everyone') return 'Everyone';
        if (audience === 'drivers') return 'Drivers';
        if (audience === 'supervisors') return 'Supervisors';
        return 'Company';
      }

      function getAvailableDepots() {
        if (window.DHL_MOCK_DATA && window.DHL_MOCK_DATA.contractDepots) {
          return window.DHL_MOCK_DATA.contractDepots.map(function (d) { return d.name; });
        }
        return ['MSE', 'LCY', 'LSE'];
      }

      function getCurrentUserDepot() {
        var spName = getCurrentSp();
        if (!spName || !window.DHL_MOCK_DATA || !window.DHL_MOCK_DATA.serviceProviders) return null;
        var sp = window.DHL_MOCK_DATA.serviceProviders.find(function (p) { return p.name === spName; });
        if (sp && sp.depotManagers) {
          return Object.keys(sp.depotManagers)[0] || null;
        }
        return null;
      }

      function isPostVisibleToUser(post, userDepot) {
        if (!post.depots || post.depots.length === 0) return true;
        if (!userDepot) return false;
        return post.depots.indexOf(userDepot) !== -1;
      }

      function getPostPreviewHtml(p) {
        var typeLabel = p.type === 'tutorial' ? 'Tutorial' : p.type === 'update' ? 'Update' : 'Info';
        var contentPreview = (p.content || '').length > 90 ? (p.content.substring(0, 90) + '…') : (p.content || '');
        var thumbHtml = '';
        var sourceLabel = p.source === 'dhl' ? 'DHL' : (p.sharedFromDhlId ? 'Shared from DHL' : 'Company');
        var audienceLabel = getAudienceLabel(p.audience);
        var depotBadgesHtml = (p.depots && p.depots.length > 0) ? '<div class="sop-post-depot-info">Depots: ' + (p.depots.map(function (d) { return '<span class="sop-depot-badge">' + escapeHtml(d) + '</span>'; }).join('')) + '</div>' : '';
        if (p.youtubeVideoId) {
          var thumbUrl = 'https://img.youtube.com/vi/' + escapeHtml(p.youtubeVideoId) + '/hqdefault.jpg';
          thumbHtml = '<span class="sop-post-preview-thumb sop-post-preview-thumb--video" style="background-image:url(\'' + thumbUrl + '\')"><i class="bi bi-play-fill"></i></span>';
        } else if (p.video) thumbHtml = '<span class="sop-post-preview-thumb sop-post-preview-thumb--video"><i class="bi bi-play-fill"></i></span>';
        else if (p.image) thumbHtml = '<span class="sop-post-preview-thumb sop-post-preview-thumb--image" style="background-image:url(\'' + ASSET(p.image) + '\')"></span>';
        return '<div class="sop-post-header">' +
          '<div class="sop-post-avatar"><img src="' + ASSET(p.authorAvatar) + '" alt="" width="40" height="40" /></div>' +
          '<div class="sop-post-meta"><strong class="sop-post-author">' + escapeHtml(p.author) + '</strong>' +
          '<span class="sop-post-badge sop-post-badge--' + p.type + '">' + escapeHtml(typeLabel) + '</span>' +
          '<span class="sop-post-badge sop-post-badge--source">' + escapeHtml(sourceLabel) + '</span>' +
          '<span class="sop-post-badge sop-post-badge--audience">' + escapeHtml(audienceLabel) + '</span>' +
          '<span class="sop-post-time">' + escapeHtml(p.timeAgo) + '</span></div></div>' +
          depotBadgesHtml +
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
        var sourceLabel = p.source === 'dhl' ? 'DHL' : (p.sharedFromDhlId ? 'Shared from DHL' : 'Company');
        var audienceLabel = getAudienceLabel(p.audience);
        var isOwnPost = p.source === 'company' && p.id >= 1000;
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
        var logoMap = {};
        var spName = getCurrentSp();
        var avatarSrc = (spName && logoMap[spName]) ? ASSET('assets/' + logoMap[spName]) : ASSET('assets/dhl-uk-logo.png');
        var commentFormHtml = '<form class="sop-comments-form" data-post-id="' + p.id + '">' +
          '<div class="sop-comments-input-wrap">' +
          '<img src="' + avatarSrc + '" alt="" class="sop-comment-input-avatar" width="32" height="32" />' +
          '<input type="text" class="sop-comments-input" placeholder="Write a comment..." maxlength="500" />' +
          '</div>' +
          '<button type="submit" class="sop-comments-submit">Comment</button>' +
          '</form>';
        var menuHtml = isOwnPost ? '<div class="sop-post-header-actions"><button type="button" class="sop-post-menu-btn" data-menu-toggle="' + p.id + '" aria-label="Post menu"><i class="bi bi-three-dots-vertical"></i></button><div class="sop-post-menu" id="menu-' + p.id + '"><button type="button" class="sop-post-menu-item" data-action="edit" data-id="' + p.id + '"><i class="bi bi-pencil-square"></i> Edit</button><button type="button" class="sop-post-menu-item sop-post-menu-item--delete" data-action="delete" data-id="' + p.id + '"><i class="bi bi-trash"></i> Delete</button></div></div>' : '';
        var audienceBadgeClass = p.audience === 'supervisors' ? 'supervisors' : p.audience === 'everyone' ? 'everyone' : 'audience';
        var depotBadgesHtml = (p.depots && p.depots.length > 0) ? '<span class="sop-post-depot-info">Depots: ' + (p.depots.map(function (d) { return '<span class="sop-depot-badge">' + escapeHtml(d) + '</span>'; }).join('')) + '</span>' : '';
        return '<div class="sop-post-header">' +
          '<div class="sop-post-meta-wrapper">' +
          '<div class="sop-post-avatar"><img src="' + ASSET(p.authorAvatar) + '" alt="" width="40" height="40" /></div>' +
          '<div class="sop-post-meta-flex"><strong class="sop-post-author">' + escapeHtml(p.author) + '</strong>' +
          '<span class="sop-post-badge sop-post-badge--' + p.type + '">' + escapeHtml(typeLabel) + '</span>' +
          '<span class="sop-post-badge sop-post-badge--source">' + escapeHtml(sourceLabel) + '</span>' +
          '<span class="sop-post-badge sop-post-badge--' + audienceBadgeClass + '">' + escapeHtml(audienceLabel) + '</span>' +
          '<span class="sop-post-time">' + escapeHtml(p.timeAgo) + '</span></div>' +
          menuHtml +
          '</div></div>' +
          depotBadgesHtml +
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
        var userDepot = getCurrentUserDepot();
        var list = MOCK_POSTS.filter(function (p) {
          if (!isPostVisibleToUser(p, userDepot)) return false;
          if (activeFeedFilter === 'everyone' && p.audience !== 'everyone') return false;
          if (activeFeedFilter === 'drivers' && p.audience !== 'drivers') return false;
          if (activeFeedFilter === 'company' && p.audience !== 'company') return false;
          if (activeFeedFilter === 'supervisors' && p.audience !== 'supervisors') return false;
          if (activeFeedFilter === 'dhl' && p.source !== 'dhl') return false;
          if (!q) return true;
          var t = (p.title || '') + ' ' + (p.content || '') + ' ' + (p.type || '') + ' ' + (p.author || '') + ' ' + (p.audience || '') + ' ' + ((p.depots || []).join(' '));
          return t.toLowerCase().indexOf(q) !== -1;
        });
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

      function populateDhlPostSelect() {
        var select = document.getElementById('companyPostDhlSource');
        if (!select) return;
        select.innerHTML = '<option value="">No DHL post selected</option>' + DHL_POSTS.map(function (p) {
          return '<option value="' + p.id + '">' + escapeHtml(p.title || 'DHL update') + '</option>';
        }).join('');
      }

      function populateDepotCheckboxes() {
        var container = document.getElementById('companyPostDepotList');
        if (!container) return;
        var depots = getAvailableDepots();
        container.innerHTML = depots.map(function (depot) {
          return '<div class="sop-depot-checkbox">' +
            '<input type="checkbox" id="depot-' + escapeHtml(depot) + '" name="depots" value="' + escapeHtml(depot) + '" />' +
            '<label for="depot-' + escapeHtml(depot) + '">' + escapeHtml(depot) + '</label>' +
            '</div>';
        }).join('');
      }

      function getSelectedDepots() {
        var checkboxes = document.querySelectorAll('input[name="depots"]:checked');
        var selected = [];
        checkboxes.forEach(function (cb) {
          selected.push(cb.value);
        });
        return selected.length > 0 ? selected : null;
      }

      populateDhlPostSelect();
      populateDepotCheckboxes();
      render();

      document.getElementById('sopSearch').addEventListener('input', debounce(function () { render(this.value); }, SEARCH_DEBOUNCE_MS));

      document.querySelectorAll('.sop-feed-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activeFeedFilter = this.dataset.feedTab || 'all';
          document.querySelectorAll('.sop-feed-tab').forEach(function (tab) {
            tab.classList.toggle('active', tab === btn);
          });
          render(document.getElementById('sopSearch').value);
        });
      });

      var companyPostForm = document.getElementById('companyPostForm');
      if (companyPostForm) {
        companyPostForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var titleInput = document.getElementById('companyPostTitle');
          var contentInput = document.getElementById('companyPostContent');
          var audienceInput = document.getElementById('companyPostAudience');
          var dhlInput = document.getElementById('companyPostDhlSource');
          var title = titleInput && titleInput.value ? titleInput.value.trim() : '';
          var content = contentInput && contentInput.value ? contentInput.value.trim() : '';
          var audience = audienceInput && audienceInput.value ? audienceInput.value : 'everyone';
          var selectedDhlId = dhlInput && dhlInput.value ? parseInt(dhlInput.value, 10) : null;
          var selectedDhlPost = selectedDhlId != null ? DHL_POSTS.find(function (p) { return p.id === selectedDhlId; }) : null;
          var selectedDepots = getSelectedDepots();
          if (!title && !content && !selectedDhlPost) return;

          var editingPost = null;
          if (MOCK_POSTS[0] && MOCK_POSTS[0]._isEditing) {
            editingPost = MOCK_POSTS.find(function (p) { return p._isEditing; });
          }

          if (editingPost) {
            editingPost.title = title || (selectedDhlPost ? selectedDhlPost.title : 'Company update');
            editingPost.content = content || (selectedDhlPost ? selectedDhlPost.content : 'Please review this important update.');
            editingPost.audience = audience;
            editingPost.depots = selectedDepots;
            delete editingPost._isEditing;
            delete editingPost._editId;
            saveCompanyPosts();
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';
            if (dhlInput) dhlInput.value = '';
            document.querySelectorAll('input[name="depots"]').forEach(function (cb) { cb.checked = false; });
            render(document.getElementById('sopSearch').value);
            openPost(editingPost.id);
          } else {
            var newPost = {
              id: Date.now(),
              author: 'Service Provider Admin',
              authorAvatar: 'assets/atlas-transport-logo.png',
              timeAgo: 'Just now',
              type: 'update',
              title: title || (selectedDhlPost ? selectedDhlPost.title : 'Company update'),
              content: content || (selectedDhlPost ? selectedDhlPost.content : 'Please review this important update.'),
              video: null,
              image: null,
              youtubeVideoId: null,
              likes: 0,
              comments: 0,
              liked: false,
              commentList: [],
              source: 'company',
              audience: audience,
              depots: selectedDepots,
              sharedFromDhlId: selectedDhlPost ? selectedDhlPost.id : null
            };
            MOCK_POSTS.unshift(newPost);
            saveCompanyPosts();
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';
            if (dhlInput) dhlInput.value = '';
            document.querySelectorAll('input[name="depots"]').forEach(function (cb) { cb.checked = false; });
            render();
            openPost(newPost.id);
          }
        });
      }

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
        var logoMap = {};
        var spName = getCurrentSp();
        var avatar = (spName && logoMap[spName]) ? 'assets/' + logoMap[spName] : 'assets/dhl-uk-logo.png';
        if (!post.commentList) post.commentList = [];
        post.commentList.push({ author: spInfo.owner, company: spInfo.company, authorAvatar: avatar, text: text, timeAgo: 'Just now' });
        post.comments = (post.commentList || []).length;
        input.value = '';
        openPost(postId);
      });

      document.addEventListener('click', function (e) {
        var menuBtn = e.target.closest('[data-menu-toggle]');
        if (menuBtn) {
          e.preventDefault();
          e.stopPropagation();
          var postId = menuBtn.dataset.menuToggle;
          var menu = document.getElementById('menu-' + postId);
          if (menu) {
            var allMenus = document.querySelectorAll('.sop-post-menu.open');
            allMenus.forEach(function (m) { if (m !== menu) m.classList.remove('open'); });
            menu.classList.toggle('open');
          }
          return;
        }
        var deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
          e.preventDefault();
          var postId = parseInt(deleteBtn.dataset.id, 10);
          if (confirm('Are you sure you want to delete this post?')) {
            var idx = MOCK_POSTS.findIndex(function (p) { return p.id === postId; });
            if (idx !== -1) {
              MOCK_POSTS.splice(idx, 1);
              saveCompanyPosts();
              closePost();
              render(document.getElementById('sopSearch').value);
            }
          }
          return;
        }
        var editBtn = e.target.closest('[data-action="edit"]');
        if (editBtn) {
          e.preventDefault();
          var postId = parseInt(editBtn.dataset.id, 10);
          var post = MOCK_POSTS.find(function (p) { return p.id === postId; });
          if (post) {
            var titleInput = document.getElementById('companyPostTitle');
            var contentInput = document.getElementById('companyPostContent');
            var audienceInput = document.getElementById('companyPostAudience');
            if (titleInput) titleInput.value = post.title || '';
            if (contentInput) contentInput.value = post.content || '';
            if (audienceInput) audienceInput.value = post.audience || 'drivers';
            post._isEditing = true;
            post._editId = postId;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (titleInput) titleInput.focus();
            closePost();
          }
          return;
        }
        var allMenus = document.querySelectorAll('.sop-post-menu.open');
        allMenus.forEach(function (m) { m.classList.remove('open'); });
      });

    })();
