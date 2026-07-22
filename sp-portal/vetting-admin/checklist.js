/**
 * SP Portal – Driver Vetting: single-candidate checklist/case review page
 * (sp-portal/vetting-admin/checklist.html?candidate=<id>). Split out from the candidates
 * list (index.html) so the two are separate screens — the list links here via "Review",
 * opened in a new tab.
 */
(function () {
  'use strict';

  const S = window.VettingShared;

  class VettingChecklist {
    constructor() {
      this.candidates = [];
      this.selectedId = new URLSearchParams(window.location.search).get('candidate');
      this.editingCase = false;
      this.expandedStep = null;
      this.assessmentReviewIndex = 0;
      this.init();
    }

    init() {
      this.cacheDOM();
      this.loadState();
      this.bindEvents();

      // Cross-tab equivalent of Firestore onSnapshot: fires in THIS tab whenever the
      // candidate (in another tab) answers a question, submits their assessment, or the
      // list page changes the same candidate's data.
      window.addEventListener('storage', (e) => {
        if (e.key === S.STORAGE_KEY) {
          this.candidates = S.loadCandidates() || [];
          this.renderDetailPanel();
        } else if (e.key === (window.AssessmentStore && window.AssessmentStore.STORAGE_KEY)) {
          this.renderDetailPanel();
        }
      });

      this.renderDetailPanel();
      this.hideLoadingOverlay();
    }

    cacheDOM() {
      this.loadingOverlay = document.getElementById('loadingOverlay');
      this.holdModal = new bootstrap.Modal(document.getElementById('holdModal'));
      this.rejectModal = new bootstrap.Modal(document.getElementById('rejectModal'));
      this.auditModal = new bootstrap.Modal(document.getElementById('auditModal'));
      this.dhlExportModal = new bootstrap.Modal(document.getElementById('dhlExportModal'));
      this.impactModal = new bootstrap.Modal(document.getElementById('impactModal'));
    }

    bindEvents() {
      document.getElementById('btnConfirmHold')?.addEventListener('click', () => this.confirmHold());
      document.getElementById('btnConfirmReject')?.addEventListener('click', () => this.confirmReject());
    }

    loadState() {
      this.candidates = S.loadCandidates() || [];
    }

    persist() {
      S.saveCandidates(this.candidates);
    }

    hideLoadingOverlay() {
      setTimeout(() => {
        this.loadingOverlay.classList.add('hidden');
      }, 500);
    }

    getSelectedCandidate() {
      return this.candidates.find(c => c.id === this.selectedId) || null;
    }

    escapeHtml(s) { return S.escapeHtml(s); }
    formatDatetime(iso) { return S.formatDatetime(iso); }

    /* ============ Detail panel ============ */

    renderDetailPanel() {
      const panel = document.getElementById('candidateDetailPanel');
      if (!panel) return;
      const c = this.getSelectedCandidate();

      if (!c) {
        panel.innerHTML = `
          <div class="checklistNotFound">
            <p class="checklistNotFoundTitle"><i class="bi bi-exclamation-triangle-fill"></i> Candidate not found</p>
            <p class="checklistNotFoundNote">${this.selectedId ? `No candidate matches id "${this.escapeHtml(this.selectedId)}".` : 'No candidate was specified in the URL.'} Go back to the candidates list and click "Review" on a candidate.</p>
            <a class="styled-button styled-button--outline" href="index.html">Back to candidates list</a>
          </div>
        `;
        this.renderFloatingActions(null);
        return;
      }

      const doneCount = c.checklist.reduce((n, step) => n + step.items.filter(it => it.complete).length, 0);
      const progressPct = Math.round((doneCount / S.CHECKLIST_TOTAL_ITEMS) * 100);

      panel.innerHTML = `
        <a class="checklistBackLink" href="index.html"><i class="bi bi-arrow-left"></i> Back to candidates list</a>
        <div class="panelHeader">
          <div>
            <h2 class="panelCandidateName">${this.escapeHtml(c.name)}</h2>
            <p class="panelCandidateMeta">${this.escapeHtml(c.email)} · ${this.escapeHtml(c.phone)}</p>
          </div>
          <div class="panelHeaderRight">
            <span class="stage-badge badge-${c.stage.toLowerCase().replace(/\s+/g, '-')}">${c.stage}</span>
            <button type="button" class="btn-action" title="Audit log" onclick="vettingApp.openAuditLog('${c.id}')"><i class="bi bi-clock-history"></i></button>
          </div>
        </div>

        <div class="progressTrack" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100">
          <div class="progressFill" style="width:${progressPct}%"></div>
        </div>
        <p class="progressLabel">${doneCount}/${S.CHECKLIST_TOTAL_ITEMS} items complete · ${progressPct}%</p>

        ${c.applicationRejected ? this.renderRejectionBanner(c) : ''}
        ${!c.applicationRejected && c.applicationOnHold ? this.renderHoldBanner(c) : ''}
        ${c.firstAccessTemporaryPassword ? this.renderTempPasswordBanner(c) : ''}

        ${this.renderCaseRegistrationPanel(c)}
        ${this.renderAssessmentSection(c)}
        ${this.renderSuitabilityBlock(c)}
        ${this.renderNotesBlock(c)}
        ${this.renderSteps(c)}
      `;

      this.bindDetailPanelEvents(c);
      this.renderFloatingActions(c);
    }

    renderRejectionBanner(c) {
      return `
        <div class="rejectBanner">
          <p class="rejectBannerTitle"><i class="bi bi-x-octagon-fill"></i> Application rejected</p>
          <div class="confirmationMessageBlock">
            <p class="confirmationMessageLabel">Standard rejection message (sent to candidate)</p>
            <div class="confirmationMessageBox">${this.escapeHtml(S.STANDARD_REJECTION_MESSAGE)}</div>
            <button type="button" class="btn-action btn-action--text" onclick="vettingApp.copyText(${JSON.stringify(S.STANDARD_REJECTION_MESSAGE)})">Copy message</button>
          </div>
          <label class="fieldLabel">Internal rejection notes</label>
          <textarea class="notesTextarea" data-role="rejection-notes" rows="2">${this.escapeHtml(c.rejectionNotes)}</textarea>
        </div>
      `;
    }

    renderHoldBanner(c) {
      return `
        <div class="holdBanner">
          <p class="holdBannerTitle"><i class="bi bi-pause-circle-fill"></i> Application on hold</p>
          <p class="holdBannerReason">${this.escapeHtml(c.applicationHoldReason || 'No reason provided.')}</p>
        </div>
      `;
    }

    renderTempPasswordBanner(c) {
      return `
        <div class="tempPasswordBanner">
          <p><i class="bi bi-key-fill"></i> First-access temporary password generated for the candidate portal:</p>
          <div class="tempPasswordValue">${this.escapeHtml(c.firstAccessTemporaryPassword)}
            <button type="button" class="btn-action btn-action--text" onclick="vettingApp.copyText('${c.firstAccessTemporaryPassword}')">Copy</button>
          </div>
        </div>
      `;
    }

    renderCaseRegistrationPanel(c) {
      const editing = this.editingCase;
      const field = (label, key, type = 'text') => {
        const value = c[key] || '';
        if (!editing) return `<div class="caseField"><span class="caseFieldLabel">${label}</span><span class="caseFieldValue">${this.escapeHtml(value) || '—'}</span></div>`;
        if (type === 'select') {
          const options = S.ROLE_OPTIONS.map(o => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('');
          return `<div class="caseField"><span class="caseFieldLabel">${label}</span><select class="caseFieldInput" data-case-field="${key}">${options}</select></div>`;
        }
        if (type === 'textarea') {
          return `<div class="caseField caseFieldFull"><span class="caseFieldLabel">${label}</span><textarea class="caseFieldInput" data-case-field="${key}" rows="2">${this.escapeHtml(value)}</textarea></div>`;
        }
        return `<div class="caseField"><span class="caseFieldLabel">${label}</span><input class="caseFieldInput" data-case-field="${key}" type="${type}" value="${this.escapeHtml(value)}" /></div>`;
      };

      return `
        <section class="caseRegistrationPanel">
          <div class="caseRegistrationHeader">
            <h3 class="sectionTitle">Case Registration</h3>
            ${editing
              ? `<button type="button" class="styled-button styled-button--primary" onclick="vettingApp.finishEditingCase('${c.id}')">Done editing</button>`
              : `<button type="button" class="styled-button styled-button--outline" onclick="vettingApp.requestEditCase()">Edit driver info</button>`}
          </div>
          <div class="caseFieldsGrid">
            ${field('Name', 'name')}
            ${field('Email', 'email', 'email')}
            ${field('Phone', 'phone')}
            ${field('Role', 'role', 'select')}
            ${field('Nationality', 'nationality')}
            ${field('Date of birth', 'dob', 'date')}
            ${field('Postcode', 'postcode')}
            ${field('National Insurance Number', 'nin')}
            ${field('Address', 'address', 'textarea')}
          </div>
          <div class="caseReadonlySection">
            <span class="caseFieldLabel">Right to Work / DVLA / Delivery Experience / Application Form Signature</span>
            <p class="caseReadonlyNote">Document status is managed from the checklist steps below (read-only here).</p>
          </div>
        </section>
      `;
    }

    renderSuitabilityBlock(c) {
      return `
        <section class="suitabilityBlock">
          <h3 class="sectionTitle">Suitability (Internal)</h3>
          <div class="suitabilityOptions">
            ${S.SUITABILITY_OPTIONS.map(opt => `
              <button type="button" class="suitabilityOption ${c.suitability === opt ? 'suitabilityOption--active' : ''}" data-suitability="${opt}">${opt}</button>
            `).join('')}
          </div>
        </section>
      `;
    }

    renderNotesBlock(c) {
      return `
        <section class="notesBlock">
          <h3 class="sectionTitle">Case Notes</h3>
          <textarea class="notesTextarea" data-role="case-notes" rows="3" placeholder="General observations about this case...">${this.escapeHtml(c.caseNotes)}</textarea>
        </section>
      `;
    }

    /* ============ Knowledge Assessment (AssessmentPanel + AssessmentResult, admin-only) ============ */

    assessmentLinkFor(token) {
      const url = new URL('../assessment/index.html', window.location.href);
      url.searchParams.set('token', token);
      return url.toString();
    }

    renderAssessmentSection(c) {
      const token = c.assessmentToken;
      const doc = token ? AssessmentStore.getAssessment(token) : null;

      let body;
      if (!token) {
        body = `<button type="button" class="styled-button styled-button--primary" onclick="vettingApp.releaseAssessment('${c.id}')">Release test</button>`;
      } else if (!doc) {
        body = `
          <p class="assessmentMissingWarning"><i class="bi bi-exclamation-triangle-fill"></i> Assessment document missing for this token.</p>
          <button type="button" class="styled-button styled-button--outline" onclick="vettingApp.releaseAssessment('${c.id}')">Reset / re-release</button>
        `;
      } else {
        const total = doc.totalQuestions || doc.questions.length;
        const answered = Object.keys(doc.answers || {}).length;
        const pct = Math.round((answered / total) * 100);
        const statusLabel = doc.status === 'completed' ? 'Completed' : doc.status === 'in_progress' ? 'In progress' : 'Released — awaiting start';
        const statusClass = doc.status === 'completed' ? 'assessmentStatus--completed' : doc.status === 'in_progress' ? 'assessmentStatus--progress' : 'assessmentStatus--released';
        const link = this.assessmentLinkFor(token);

        body = `
          <div class="assessmentStatusRow">
            <span class="assessmentStatus ${statusClass}">${statusLabel}</span>
            <button type="button" class="btn-action btn-action--text" onclick="vettingApp.copyText('${link}')">Copy link</button>
            <button type="button" class="btn-action btn-action--text" onclick="window.open('${link}', '_blank', 'noopener=false')">Open <i class="bi bi-box-arrow-up-right"></i></button>
            <button type="button" class="btn-action btn-action--text" onclick="vettingApp.resetAssessment('${c.id}')">Reset / re-release</button>
          </div>
          <div class="progressTrack"><div class="progressFill" style="width:${pct}%"></div></div>
          <p class="progressLabel">${answered}/${total} answered</p>
          ${doc.status === 'completed' ? this.renderAssessmentResult(c, doc) : ''}
        `;
      }

      return `
        <section class="assessmentSection">
          <h3 class="sectionTitle">Knowledge Assessment</h3>
          ${body}
        </section>
      `;
    }

    renderAssessmentResult(c, doc) {
      const score = AssessmentBank.gradeAssessment(doc.answers);
      const review = AssessmentBank.reviewAssessmentAnswers(doc.answers);
      const activeIndex = this.assessmentReviewIndex || 0;
      const activeQ = review[activeIndex];

      return `
        <div class="assessmentResult">
          <div class="assessmentScoreCard">
            <span class="assessmentScorePercent">${score.percent}%</span>
            <span class="assessmentScoreFraction">${score.correct}/${score.total} correct</span>
          </div>
          <div class="assessmentCategoryGrid">
            ${Object.keys(score.byCategory).map(cat => {
              const s = score.byCategory[cat];
              return `<div class="assessmentCategoryChip">${this.escapeHtml(cat)}: ${s.correct}/${s.total}</div>`;
            }).join('')}
          </div>
          <div class="assessmentReviewPills">
            ${review.map((r, i) => `<button type="button" class="assessmentReviewPill ${r.isCorrect ? 'assessmentReviewPill--correct' : 'assessmentReviewPill--incorrect'} ${i === activeIndex ? 'assessmentReviewPill--active' : ''}" data-review-index="${i}">${i + 1}</button>`).join('')}
          </div>
          ${activeQ ? `
            <div class="assessmentReviewDetail ${activeQ.isCorrect ? 'assessmentReviewDetail--correct' : 'assessmentReviewDetail--incorrect'}">
              <span class="assessmentReviewBadge">${activeQ.isCorrect ? '✓ Correct' : '✕ Incorrect'}</span>
              <p class="assessmentReviewQuestion">${this.escapeHtml(activeQ.question)}</p>
              <p class="assessmentReviewLine"><strong>Candidate answer:</strong> ${activeQ.selectedIndex != null ? this.escapeHtml(activeQ.options[activeQ.selectedIndex]) : '—'}</p>
              <p class="assessmentReviewLine"><strong>Correct answer:</strong> ${this.escapeHtml(activeQ.options[activeQ.correctIndex])}</p>
              <p class="assessmentReviewExplanation">${this.escapeHtml(activeQ.explanation)}</p>
            </div>
          ` : ''}
        </div>
      `;
    }

    releaseAssessment(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      const token = AssessmentStore.newAssessmentToken();
      const questions = AssessmentBank.releaseQuestions();
      const doc = {
        token,
        driver: { id: c.id, source: c.source || 'drivers' },
        candidateName: c.name,
        bankId: AssessmentBank.BANK_ID,
        questions,
        totalQuestions: questions.length,
        status: 'released',
        answers: {},
        currentIndex: 0,
        releasedAt: new Date().toISOString()
      };
      AssessmentStore.saveAssessment(doc);
      const old = c.assessmentToken;
      c.assessmentToken = token;
      S.logAudit(c, 'assessmentToken', old, token, 'Knowledge assessment released.');
      this.persist();
      this.assessmentReviewIndex = 0;
      this.renderDetailPanel();
    }

    resetAssessment(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      if (c.assessmentToken) AssessmentStore.deleteAssessment(c.assessmentToken);
      const old = c.assessmentToken;
      c.assessmentToken = null;
      S.logAudit(c, 'assessmentToken', old, null, 'Knowledge assessment reset.');
      this.persist();
      this.renderDetailPanel();
    }

    /* ============ Steps ============ */

    renderSteps(c) {
      const firstOpenIndex = c.checklist.findIndex((_, i) => !c.stepApprovals[i] && !c.stepRejections[i]);
      const openIndex = this.expandedStep != null ? this.expandedStep : (firstOpenIndex === -1 ? 0 : firstOpenIndex);

      return `
        <section class="steps">
          ${c.checklist.map((step, s) => {
            const doneCount = step.items.filter(it => it.complete).length;
            const pct = Math.round((doneCount / step.items.length) * 100);
            const approved = c.stepApprovals[s];
            const rejected = c.stepRejections[s];
            const isOpen = s === openIndex;
            const readyForApproval = step.items.every(it => !it.required || it.complete);
            const meta = c.stepApprovalMeta[s];

            return `
              <div class="stepCard ${approved ? 'stepCard--approved' : ''} ${rejected ? 'stepCard--rejected' : ''}">
                <button type="button" class="stepHeaderButton" data-toggle-step="${s}">
                  <div>
                    <p class="stepTitle">${s + 1}. ${this.escapeHtml(step.title)}</p>
                    <p class="stepSubtitle">${this.escapeHtml(step.subtitle)}</p>
                  </div>
                  <div class="stepHeaderMeta">
                    ${step.sla ? `<span class="checklist-sla-badge">SLA: ${this.escapeHtml(step.sla)}</span>` : ''}
                    <span class="checklist-step-progress">${doneCount}/${step.items.length} (${pct}%)</span>
                    ${approved ? '<span class="stepStatusBadge stepStatusBadge--approved">Approved</span>' : ''}
                    ${rejected ? '<span class="stepStatusBadge stepStatusBadge--rejected">Rejected</span>' : ''}
                    <i class="bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}"></i>
                  </div>
                </button>
                <div class="stepBody ${isOpen ? '' : 'hidden'}">
                  <div class="checklist-items">
                    ${step.items.map((item, i) => this.renderChecklistRow(c, s, i, item)).join('')}
                  </div>
                  ${meta ? `<p class="stepApprovalMeta">Approved by ${this.escapeHtml(meta.approvedBy)} on ${this.formatDatetime(meta.approvedAt)}</p>` : ''}
                  <div class="stepActions">
                    <button type="button" class="styled-button styled-button--success" ${approved ? 'disabled' : ''} ${!readyForApproval ? 'disabled title="Complete all required items first"' : ''} onclick="vettingApp.approveStep('${c.id}', ${s})">Approve Step</button>
                    <button type="button" class="styled-button styled-button--danger" ${rejected ? 'disabled' : ''} onclick="vettingApp.rejectStep('${c.id}', ${s})">Reprove Step</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </section>
      `;
    }

    renderChecklistRow(c, stepIndex, itemIndex, item) {
      const messageHtml = item.messageSlot && S.MESSAGE_TEMPLATES[item.messageSlot] ? `
        <div class="confirmationMessageBlock">
          <div class="confirmationMessageBox">${this.escapeHtml(S.MESSAGE_TEMPLATES[item.messageSlot](c))}</div>
          <button type="button" class="btn-action btn-action--text" onclick="vettingApp.copyText(${JSON.stringify(S.MESSAGE_TEMPLATES[item.messageSlot](c))})">Copy</button>
        </div>` : '';

      const downloadKey = `__downloaded_${stepIndex}_${itemIndex}`;
      const downloaded = !!c[downloadKey];
      const downloadHtml = item.requiredDownload ? `
        <div class="requiredDownloadRow">
          <button type="button" class="btn-action btn-action--text" onclick="vettingApp.markDownloaded('${c.id}', ${stepIndex}, ${itemIndex})">${downloaded ? 'Downloaded ✓' : 'Download'}</button>
          ${!downloaded ? '<span class="requiredDownloadNote">Download required before this item can be checked.</span>' : ''}
        </div>` : '';

      const checkboxDisabled = item.requiredDownload && !downloaded;

      const onlineTestHtml = item.onlineTest ? `
        <div class="onlineTestRow">
          <button type="button" class="btn-action btn-action--text" onclick="vettingApp.openOnlineTest('${c.id}')">Open Online Test <i class="bi bi-box-arrow-up-right"></i></button>
          ${c.onlineTestScore != null ? `<span class="onlineTestScore">Score: ${c.onlineTestScore}/${c.onlineTestMaxScore}</span>` : '<span class="onlineTestNote">Not completed yet</span>'}
        </div>` : '';

      return `
        ${item.sectionHeader ? `<p class="checklist-section-header">${this.escapeHtml(item.sectionHeader)}</p>` : ''}
        <label class="checklist-item itemRow">
          <input type="checkbox" data-step="${stepIndex}" data-item="${itemIndex}" ${item.complete ? 'checked' : ''} ${checkboxDisabled ? 'disabled' : ''} />
          <div class="checklist-label itemLabel">
            <p class="checklist-title">
              ${this.escapeHtml(item.title)}
              ${item.required ? '<span class="checklist-badge checklist-badge-required">Required</span>' : ''}
              ${item.conditional ? '<span class="checklist-badge checklist-badge-conditional">Conditional</span>' : ''}
            </p>
            ${item.detail ? `<p class="checklist-desc">${this.escapeHtml(item.detail)}</p>` : ''}
            ${item.conditional && item.conditionNote ? `<p class="checklist-condition-note">${this.escapeHtml(item.conditionNote)}</p>` : ''}
            ${checkboxDisabled ? '<p class="checklist-condition-note">Complete the required registration fields before checking this item.</p>' : ''}
            ${onlineTestHtml}
            ${downloadHtml}
            ${messageHtml}
          </div>
        </label>
      `;
    }

    bindDetailPanelEvents(c) {
      document.querySelectorAll('#candidateDetailPanel input[type="checkbox"][data-step]').forEach(cb => {
        cb.addEventListener('change', () => this.toggleChecklistItem(c.id, Number(cb.dataset.step), Number(cb.dataset.item), cb.checked));
      });
      document.querySelectorAll('#candidateDetailPanel [data-toggle-step]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.toggleStep);
          this.expandedStep = this.expandedStep === idx ? null : idx;
          this.renderDetailPanel();
        });
      });
      document.querySelectorAll('#candidateDetailPanel [data-suitability]').forEach(btn => {
        btn.addEventListener('click', () => this.setSuitability(c.id, btn.dataset.suitability));
      });
      const notesEl = document.querySelector('#candidateDetailPanel [data-role="case-notes"]');
      if (notesEl) notesEl.addEventListener('blur', () => this.saveCaseNotes(c.id, notesEl.value));
      const rejectionNotesEl = document.querySelector('#candidateDetailPanel [data-role="rejection-notes"]');
      if (rejectionNotesEl) rejectionNotesEl.addEventListener('blur', () => this.saveRejectionNotes(c.id, rejectionNotesEl.value));
      document.querySelectorAll('#candidateDetailPanel [data-review-index]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.assessmentReviewIndex = Number(btn.dataset.reviewIndex);
          this.renderDetailPanel();
        });
      });
    }

    toggleChecklistItem(candidateId, stepIndex, itemIndex, checked) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      const item = c.checklist[stepIndex].items[itemIndex];
      const old = item.complete;
      item.complete = checked;
      S.logAudit(c, `checklist.${stepIndex}.${itemIndex}`, old, checked);
      this.persist();
      this.renderDetailPanel();
    }

    markDownloaded(candidateId, stepIndex, itemIndex) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      c[`__downloaded_${stepIndex}_${itemIndex}`] = true;
      S.logAudit(c, `download.${stepIndex}.${itemIndex}`, 'No', 'Yes');
      this.persist();
      this.renderDetailPanel();
    }

    /** Opens the online test in a separate browser tab; the tab posts the score back via
     *  window.postMessage (see online-test.html + the 'message' listener registered in init()). */
    openOnlineTest(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      const url = `online-test.html?candidate=${encodeURIComponent(c.id)}&name=${encodeURIComponent(c.name)}`;
      window.open(url, '_blank', 'noopener=false');
    }

    findOnlineTestLocation(candidate) {
      for (let s = 0; s < candidate.checklist.length; s++) {
        const i = candidate.checklist[s].items.findIndex(it => it.onlineTest);
        if (i !== -1) return { stepIndex: s, itemIndex: i };
      }
      return null;
    }

    handleOnlineTestComplete(candidateId, score, maxScore) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      const old = c.onlineTestScore;
      c.onlineTestScore = score;
      c.onlineTestMaxScore = maxScore;
      S.logAudit(c, 'onlineTestScore', old, score);

      const loc = this.findOnlineTestLocation(c);
      if (loc) {
        const item = c.checklist[loc.stepIndex].items[loc.itemIndex];
        if (!item.complete) {
          item.complete = true;
          S.logAudit(c, `checklist.${loc.stepIndex}.${loc.itemIndex}`, false, true, 'Auto-completed: online test submitted.');
        }
      }

      this.persist();
      this.renderDetailPanel();
    }

    setSuitability(candidateId, value) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      const old = c.suitability;
      c.suitability = c.suitability === value ? null : value;
      S.logAudit(c, 'suitability', old, c.suitability);
      this.persist();
      this.renderDetailPanel();
    }

    saveCaseNotes(candidateId, value) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c || c.caseNotes === value) return;
      const old = c.caseNotes;
      c.caseNotes = value;
      S.logAudit(c, 'caseNotes', old, value);
      this.persist();
    }

    saveRejectionNotes(candidateId, value) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c || c.rejectionNotes === value) return;
      const old = c.rejectionNotes;
      c.rejectionNotes = value;
      S.logAudit(c, 'rejectionNotes', old, value);
      this.persist();
    }

    requestEditCase() {
      this.impactModal.show();
      const confirmBtn = document.getElementById('btnConfirmEditImpact');
      if (confirmBtn) {
        confirmBtn.onclick = () => {
          this.editingCase = true;
          this.impactModal.hide();
          this.renderDetailPanel();
        };
      }
    }

    finishEditingCase(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      document.querySelectorAll('#candidateDetailPanel [data-case-field]').forEach(input => {
        const key = input.dataset.caseField;
        const old = c[key];
        const value = input.value;
        if (old !== value) {
          c[key] = value;
          S.logAudit(c, key, old, value);
        }
      });
      this.editingCase = false;
      this.persist();
      this.renderDetailPanel();
    }

    /* ============ Step approval / rejection ============ */

    isStepReadyForApproval(step) {
      return step.items.every(it => !it.required || it.complete);
    }

    approveStep(candidateId, stepIndex) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      const step = c.checklist[stepIndex];
      if (!this.isStepReadyForApproval(step)) return;

      c.stepApprovals[stepIndex] = true;
      c.stepRejections[stepIndex] = false;
      c.stepApprovalMeta[stepIndex] = { approvedAt: new Date().toISOString(), approvedBy: S.CURRENT_ACTOR };
      S.logAudit(c, `stepApprovals.${stepIndex}`, false, true);

      if (stepIndex === S.APPLICATION_GATE_STEP) {
        const password = S.generateTemporaryPassword();
        c.firstAccessTemporaryPassword = password;
        c.accessGranted = true;
        c.applicationOnHold = false;
        c.applicationHoldReason = '';
        c.applicationRejected = false;
        c.stage = 'Pre-screen';
        S.logAudit(c, 'accessGranted', false, true, 'Application gate approved — first-access code issued.');
      }

      this.expandedStep = Math.min(stepIndex + 1, c.checklist.length - 1);
      this.persist();
      this.renderDetailPanel();
    }

    rejectStep(candidateId, stepIndex) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      c.stepRejections[stepIndex] = true;
      c.stepApprovals[stepIndex] = false;
      c.stepApprovalMeta[stepIndex] = null;
      for (let s = stepIndex + 1; s < c.stepApprovals.length; s++) {
        c.stepApprovals[s] = false;
        c.stepApprovalMeta[s] = null;
      }
      S.logAudit(c, `stepRejections.${stepIndex}`, false, true);

      if (stepIndex === S.APPLICATION_GATE_STEP) {
        c.accessGranted = false;
        S.logAudit(c, 'accessGranted', true, false, 'Application gate rejected.');
      }

      this.persist();
      this.renderDetailPanel();
    }

    /* ============ Global floating actions: Hold / Release history / Reject / Undo ============ */

    renderFloatingActions(c) {
      const group = document.getElementById('applyStatusFabGroup');
      if (!group) return;
      if (!c) {
        group.innerHTML = '';
        group.classList.add('hidden');
        return;
      }
      group.classList.remove('hidden');

      group.innerHTML = `
        ${c.applicationOnHold
          ? `<button type="button" class="fab holdApplyFab holdApplyFab--active" onclick="vettingApp.undoHold('${c.id}')"><i class="bi bi-pause-circle-fill"></i> On Hold (undo)</button>`
          : `<button type="button" class="fab holdApplyFab" onclick="vettingApp.openHoldModal('${c.id}')"><i class="bi bi-pause-circle"></i> Hold Apply</button>`}

        <button type="button" class="fab releaseHistoryFab ${c.workHistoryReleased ? 'releaseHistoryFab--active' : ''}" onclick="vettingApp.toggleReleaseHistory('${c.id}')">
          <i class="bi bi-unlock-fill"></i> ${c.workHistoryReleased ? 'History Released' : 'Release History'}
        </button>

        ${c.applicationRejected
          ? `<button type="button" class="fab undoFab" onclick="vettingApp.undoReject('${c.id}')"><i class="bi bi-arrow-counterclockwise"></i> Undo</button>`
          : `<button type="button" class="fab rejectApplyFab" onclick="vettingApp.openRejectModal('${c.id}')"><i class="bi bi-x-octagon"></i> Reject Apply</button>`}

        ${this.renderExportActions(c)}
      `;
    }

    openHoldModal(candidateId) {
      this.pendingActionCandidateId = candidateId;
      document.getElementById('holdReasonText').value = '';
      this.holdModal.show();
    }

    confirmHold() {
      const c = this.candidates.find(x => x.id === this.pendingActionCandidateId);
      if (!c) return;
      const reason = document.getElementById('holdReasonText').value.trim();
      c.applicationOnHold = true;
      c.applicationHoldReason = reason;
      c.stage = 'On Hold';
      S.logAudit(c, 'applicationOnHold', false, true, reason);
      this.holdModal.hide();
      this.persist();
      this.renderDetailPanel();
    }

    undoHold(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      c.applicationOnHold = false;
      const oldReason = c.applicationHoldReason;
      c.applicationHoldReason = '';
      c.stage = 'Application';
      S.logAudit(c, 'applicationOnHold', true, false, oldReason);
      this.persist();
      this.renderDetailPanel();
    }

    toggleReleaseHistory(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      const old = c.workHistoryReleased;
      c.workHistoryReleased = !old;
      S.logAudit(c, 'workHistoryReleased', old, c.workHistoryReleased);
      this.persist();
      this.renderDetailPanel();
    }

    openRejectModal(candidateId) {
      this.pendingActionCandidateId = candidateId;
      this.rejectModal.show();
    }

    confirmReject() {
      const c = this.candidates.find(x => x.id === this.pendingActionCandidateId);
      if (!c) return;
      c.applicationRejected = true;
      c.stage = 'Rejected';
      S.logAudit(c, 'applicationRejected', false, true);
      this.rejectModal.hide();
      this.persist();
      this.renderDetailPanel();
    }

    undoReject(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      c.applicationRejected = false;
      c.stage = 'Application';
      S.logAudit(c, 'applicationRejected', true, false, 'Rejection undone.');
      this.persist();
      this.renderDetailPanel();
    }

    copyText(text) {
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    }

    /* ============ Audit log viewer ============ */

    openAuditLog(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      const body = document.getElementById('auditLogBody');
      const entries = c.auditLog || [];
      body.innerHTML = entries.length ? entries.map(e => `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <p class="timeline-action"><strong>${this.escapeHtml(e.field)}</strong></p>
            <p class="timeline-detail">${this.escapeHtml(e.oldValue) || '—'} → ${this.escapeHtml(e.newValue) || '—'}</p>
            ${e.reason ? `<p class="timeline-detail">Reason: ${this.escapeHtml(e.reason)}</p>` : ''}
            <p class="timeline-meta">${this.escapeHtml(e.actor)} • ${this.formatDatetime(e.at)}</p>
          </div>
        </div>
      `).join('') : '<p class="empty-cell">No audit entries yet.</p>';
      this.auditModal.show();
    }

    /* ============ Export actions (PDF exports substituted with print / text downloads,
       matching this app's existing export convention — see sp-portal/drivers). ============ */

    renderExportActions(c) {
      return `
        <div class="exportActions" data-export-for="${c.id}">
          <button type="button" class="fab exportToggle" onclick="vettingApp.toggleExportPanel()"><i class="bi bi-download"></i> Export</button>
          <div class="exportActionsPanel hidden" id="exportActionsPanel">
            <button type="button" onclick="vettingApp.exportSuitabilityPdf('${c.id}')">Suitability PDF</button>
            <button type="button" onclick="vettingApp.exportInterview('${c.id}')">Export interview</button>
            <button type="button" onclick="vettingApp.openDhlExportModal('${c.id}')">Export to DHL</button>
            <button type="button" onclick="vettingApp.exportFullReport('${c.id}')">Export report</button>
            <button type="button" onclick="vettingApp.downloadCostModelsGuide()">Cost models guide</button>
          </div>
        </div>
      `;
    }

    toggleExportPanel() {
      document.getElementById('exportActionsPanel')?.classList.toggle('hidden');
    }

    downloadText(filename, content, mime = 'text/plain') {
      const blob = new Blob([content], { type: mime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    printSection(title, html) {
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`<html><head><title>${title}</title></head><body>${html}</body></html>`);
      w.document.close();
      w.focus();
      w.print();
    }

    exportSuitabilityPdf(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      this.printSection('Suitability Assessment', `
        <h1>Suitability Assessment</h1>
        <p><strong>${this.escapeHtml(c.name)}</strong> — ${this.escapeHtml(c.email)}</p>
        <p>Suitability: ${this.escapeHtml(c.suitability || 'Not assessed')}</p>
        <p>Case notes: ${this.escapeHtml(c.caseNotes || '—')}</p>
      `);
    }

    exportInterview(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      this.downloadText(`interview-${c.id}.json`, JSON.stringify(c.interview || {}, null, 2), 'application/json');
    }

    openDhlExportModal(candidateId) {
      this.pendingActionCandidateId = candidateId;
      this.dhlExportModal.show();
      const btn = document.getElementById('btnConfirmDhlExport');
      if (btn) {
        btn.onclick = () => {
          const c = this.candidates.find(x => x.id === candidateId);
          const signatory = document.getElementById('dhlSignatoryName').value.trim() || '—';
          const includeSuitability = document.getElementById('dhlSectionSuitability').checked;
          const includeInterview = document.getElementById('dhlSectionInterview').checked;
          let html = `<h1>DHL Handoff — ${this.escapeHtml(c.name)}</h1><p>Signed off by: ${this.escapeHtml(signatory)}</p>`;
          if (includeSuitability) html += `<h2>Suitability Assessment</h2><p>${this.escapeHtml(c.suitability || 'Not assessed')}</p>`;
          if (includeInterview) html += `<h2>Interview Notes</h2><p>${this.escapeHtml((c.interview && c.interview.interview_notes) || '—')}</p>`;
          this.dhlExportModal.hide();
          this.printSection('DHL Handoff', html);
        };
      }
    }

    exportFullReport(candidateId) {
      const c = this.candidates.find(x => x.id === candidateId);
      if (!c) return;
      this.downloadText(`vetting-report-${c.id}.json`, JSON.stringify(c, null, 2), 'application/json');
    }

    downloadCostModelsGuide() {
      const md = `# Cost Models Guide\n\nRefer to the BA Express cost model handbook for driver onboarding rate cards, mileage bands and fuel surcharge tables.\n`;
      this.downloadText('cost-models-guide.md', md, 'text/markdown');
    }
  }

  let vettingApp;
  document.addEventListener('DOMContentLoaded', () => {
    vettingApp = new VettingChecklist();
    window.vettingApp = vettingApp;
  });
})();
