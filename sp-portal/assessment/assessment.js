/**
 * Candidate-facing assessment runner. Imports only AssessmentStore (assessment-types.js)
 * — no answer key is ever available to this page. The candidate never sees their score:
 * on submit we only flip status to 'completed' and let the admin grade it separately.
 */
(function () {
  'use strict';

  var root = document.getElementById('assessmentApp');
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token') || '';

  function escapeHtml(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderState(iconHtml, title, subtitle) {
    root.innerHTML =
      '<div class="a-card">' +
      '<div class="a-state">' +
      '<div class="a-state-icon">' + iconHtml + '</div>' +
      '<h1 class="a-title">' + escapeHtml(title) + '</h1>' +
      '<p class="a-subtitle">' + escapeHtml(subtitle) + '</p>' +
      '</div></div>';
  }

  function render() {
    if (!token) {
      renderState('⚠️', 'Invalid link', 'No assessment token was provided in this URL.');
      return;
    }

    var doc = AssessmentStore.getAssessment(token);
    if (!doc) {
      renderState('⚠️', 'Link no longer valid', 'This test link has expired or was reset. Please contact your recruiter for a new link.');
      return;
    }

    if (doc.status === 'completed') {
      renderState('✅', 'Test submitted', 'Thank you — your responses have been recorded. Your recruiter will review your results and contact you with next steps.');
      return;
    }

    if (doc.status === 'released') {
      doc.status = 'in_progress';
      doc.startedAt = new Date().toISOString();
      AssessmentStore.saveAssessment(doc);
    }

    var total = doc.totalQuestions || doc.questions.length;
    var idx = Math.min(doc.currentIndex || 0, doc.questions.length - 1);
    var q = doc.questions[idx];
    var answeredCount = Object.keys(doc.answers || {}).length;
    var selected = doc.answers ? doc.answers[q.id] : undefined;
    var isLast = idx === doc.questions.length - 1;

    root.innerHTML =
      '<div class="a-card">' +
      '<h1 class="a-title">Driver Knowledge Assessment</h1>' +
      '<p class="a-subtitle">Question ' + (idx + 1) + ' of ' + doc.questions.length + '</p>' +
      '<div class="a-progress-track"><div class="a-progress-fill" style="width:' + Math.round((answeredCount / total) * 100) + '%"></div></div>' +
      '<p class="a-progress-label">' + answeredCount + '/' + total + ' answered</p>' +
      '<span class="a-category">' + escapeHtml(q.category) + '</span>' +
      '<p class="a-question">' + escapeHtml(q.question) + '</p>' +
      '<div class="a-options">' +
      q.options.map(function (opt, i) {
        return '<button type="button" class="a-option ' + (selected === i ? 'a-option--selected' : '') + '" data-option="' + i + '">' + escapeHtml(opt) + '</button>';
      }).join('') +
      '</div>' +
      '<div class="a-nav">' +
      '<button type="button" class="a-btn" id="btnPrev" ' + (idx === 0 ? 'disabled' : '') + '>Previous</button>' +
      (isLast
        ? '<button type="button" class="a-btn a-btn--primary" id="btnSubmit" ' + (selected == null ? 'disabled' : '') + '>Submit test</button>'
        : '<button type="button" class="a-btn a-btn--primary" id="btnNext" ' + (selected == null ? 'disabled' : '') + '>Next</button>') +
      '</div>' +
      '</div>';

    root.querySelectorAll('.a-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.dataset.option);
        if (!doc.answers) doc.answers = {};
        doc.answers[q.id] = i;
        AssessmentStore.saveAssessment(doc);
        render();
      });
    });

    var prevBtn = document.getElementById('btnPrev');
    if (prevBtn) prevBtn.addEventListener('click', function () {
      doc.currentIndex = Math.max(0, idx - 1);
      AssessmentStore.saveAssessment(doc);
      render();
    });

    var nextBtn = document.getElementById('btnNext');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      doc.currentIndex = Math.min(doc.questions.length - 1, idx + 1);
      AssessmentStore.saveAssessment(doc);
      render();
    });

    var submitBtn = document.getElementById('btnSubmit');
    if (submitBtn) submitBtn.addEventListener('click', function () {
      doc.status = 'completed';
      doc.completedAt = new Date().toISOString();
      AssessmentStore.saveAssessment(doc);
      render();
    });
  }

  window.addEventListener('storage', function (e) {
    if (e.key === AssessmentStore.STORAGE_KEY) render();
  });

  render();
})();
