/**
 * Shared between sp-portal/vetting-admin/index.html (candidates list) and
 * sp-portal/vetting-admin/checklist.html (single-candidate review page) — the checklist
 * template, constants, and the localStorage-backed persistence both pages read/write.
 *
 * Splitting the list from the checklist means each page keeps its own in-memory
 * `candidates` array; VettingShared.STORAGE_KEY + the 'storage' event (see each page's
 * init()) keep them in sync when both are open in different tabs.
 */
(function (global) {
  'use strict';

  const CHECKLIST_TEMPLATE = [
    {
      title: 'Driver Registration & Application Form',
      subtitle: 'Application Form data capture, conditional DVLA/Right to Work rules, first review and confirmation email.',
      sla: 'Same day',
      items: [
        { title: 'Application Form data collected', required: true, detail: 'Name, phone, email, role type, date of birth, UK postcode/address, National Insurance Number, Right to Work and DVLA Share Code captured from the Application Form.', docKey: 'registration_baseline' },
        { title: 'Right to Work check', required: true, conditional: true, conditionNote: 'British/Irish does not require a Share Code. Online RTW routes require the Share Code.', docKey: 'rtw_doc', links: [{ label: 'Check RTW Share Code', url: 'https://www.gov.uk/view-right-to-work' }, { label: 'Generate RTW Share Code', url: 'https://www.gov.uk/prove-right-to-work/get-a-share-code-online' }] },
        { title: 'Driving Licence check', required: true, conditional: true, conditionNote: 'DVLA is not required when Role Type = Bicycle Courier.', docKey: 'dvla_doc', links: [{ label: 'DVLA Driving Check', url: 'https://www.gov.uk/check-driving-information' }] },
        { title: 'Registration data reviewed and exported', required: true, detail: 'Review the captured registration information against the Central Driver Record before sending confirmation.' },
        { title: 'Confirmation e-mail sent to candidate', required: true, detail: 'Send the approved access message through the agreed communication channel.', messageSlot: 'candidate-confirmation' },
        { title: 'BA Application Form downloaded and signature status confirmed', required: true, docKey: 'application_form', requiredDownload: { label: 'Download BA Application Form', documentName: 'BA_Express_Application_Form.pdf' } },
        { title: 'Driver registration completed', required: true, detail: 'Create or confirm the driver record before starting vetting.' }
      ]
    },
    {
      title: 'Interview',
      subtitle: 'Pre-interview information, interview scoring, work history review, DBS/reference checks and final interview decision.',
      sla: 'Before or on interview day',
      items: [
        { sectionHeader: '2.1 Pre-Interview', title: 'Interview Information Recorded', required: true, detail: 'Interview Date, Start Time, End Time, Location, Interviewer and Supervisor recorded.', docKey: 'interview_record', messageSlot: 'interview-invitation' },
        { title: 'Payment mode and company behaviour document downloaded', required: true, placeholderDownload: { label: 'Download briefing document', documentName: 'BA Express Payment Mode and Company Behaviour Briefing.pdf' } },
        { sectionHeader: '2.2 Interview', title: 'Core Competencies Scored', required: true, docKey: 'competency_scores' },
        { title: 'Online test released and score reviewed', required: true, detail: 'Redirect to the online test module. Once the candidate completes the released test, the score appears in this checklist.', docKey: 'practical_tests' },
        { title: 'DBS collected or requested', required: true, docKey: 'dbs_collect_request' },
        { title: 'Work References recorded', required: true, detail: 'Employment history is submitted by the driver in the candidate portal (Work history form). References can be collected orally or by letter/e-mail; gaps of 28 days or more are flagged in the 5-year history review.' },
        { title: '5 years history reviewed', required: true, docKey: 'five_year_employment_history' },
        { title: 'Interview Notes recorded', required: true, docKey: 'interview_notes' },
        { title: 'Red Flags reviewed', required: true, docKey: 'red_flags' },
        { title: 'Finish interview', required: true, docKey: 'interview_finish' },
        { sectionHeader: '2.3 Post Interview', title: 'Work Reference Check', required: true, docKey: 'reference_workflow' },
        { title: 'DBS', required: true, docKey: 'uk_crc' },
        { title: 'APHIDS', conditional: true, conditionNote: 'Required for depots or routes that require aviation/security clearance.', docKey: 'aphids', links: [{ label: 'APHIDS Application', url: 'https://cargo.aphids-application.homeoffice.gov.uk' }] },
        { title: 'Final decision', required: true, docKey: 'reference_dbs_final_decision' },
        { title: 'Approval e-mail', required: true, detail: 'Copy and send the approval e-mail after the final decision is approved.', messageSlot: 'approval-email' }
      ]
    },
    {
      title: 'Suitability Assessment',
      subtitle: 'Criminal declaration, declaration of suitability and observations.',
      sla: 'Same day as interview',
      items: [
        { title: 'Criminal record declaration recorded', required: true, docKey: 'criminal_record_declaration' },
        { title: 'Declaration of Suitability signed', required: true, docKey: 'suitability_declaration' },
        { title: 'Observations recorded', required: true, docKey: 'suitability_observations' }
      ]
    },
    {
      title: 'DHL Courses & Finalisation',
      subtitle: 'DHL courses, original document collection, payment mode, DHL folder and final application completion.',
      sla: 'Before driver start',
      items: [
        { title: 'Training courses booked and status recorded', required: true, docKey: 'cot_course' },
        { title: 'Original documents collected and recorded', required: true, docKey: 'documents_collection' },
        { title: 'Cost model recorded', required: true, docKey: 'payment_mode' },
        { title: 'DHL folder organised, physical copies present and delivered', required: true, docKey: 'dhl_folder' },
        { title: 'Driver application completed', required: true }
      ]
    }
  ];

  const CHECKLIST_TOTAL_ITEMS = CHECKLIST_TEMPLATE.reduce((total, step) => total + step.items.length, 0);
  const VETTING_OFFICERS = ['Sarah Thompson', 'Michael Chen', 'Emma Rodriguez', 'James Wilson', 'Priya Patel'];
  const ROLE_OPTIONS = ['Van Courier', 'Motorbike Courier', 'Bicycle Courier'];
  const SUITABILITY_OPTIONS = ['Suitable', 'Not Suitable', 'Review Required'];
  const APPLICATION_GATE_STEP = 0;
  const STORAGE_KEY = 'vettingAdminState.v1';
  const CURRENT_ACTOR = 'Current User';

  /** Standard messages the admin can copy-paste to the candidate (messageSlot items). */
  const MESSAGE_TEMPLATES = {
    'candidate-confirmation': (c) => `Hi ${c.name.split(' ')[0]},\n\nThanks for submitting your application to BA Express. We've received your details and will be in touch shortly with next steps.\n\nBA Express Onboarding Team`,
    'interview-invitation': (c) => `Hi ${c.name.split(' ')[0]},\n\nWe'd like to invite you to an interview as part of your BA Express onboarding. We'll confirm the date, time and location shortly.\n\nBA Express Onboarding Team`,
    'approval-email': (c) => `Hi ${c.name.split(' ')[0]},\n\nCongratulations — your application has been approved. You'll receive your portal access details separately.\n\nBA Express Onboarding Team`
  };

  const STANDARD_REJECTION_MESSAGE = 'Thank you for your interest in BA Express. After careful review, we are unable to proceed with your application at this time.';

  function generateTemporaryPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const block = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${block()}-${block()}-${block()}`;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDatetime(iso) {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function initials(name) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  /** Returns null if nothing is persisted yet (caller decides whether to seed mock data). */
  function loadCandidates() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('Failed to load persisted vetting state.', err);
      return null;
    }
  }

  function saveCandidates(candidates) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
    } catch (err) {
      console.warn('Failed to persist vetting state.', err);
    }
  }

  function logAudit(candidate, field, oldValue, newValue, reason) {
    if (!candidate.auditLog) candidate.auditLog = [];
    candidate.auditLog.unshift({
      field,
      oldValue: oldValue == null ? null : String(oldValue),
      newValue: newValue == null ? null : String(newValue),
      reason: reason || null,
      actor: CURRENT_ACTOR,
      at: new Date().toISOString()
    });
  }

  global.VettingShared = {
    CHECKLIST_TEMPLATE,
    CHECKLIST_TOTAL_ITEMS,
    VETTING_OFFICERS,
    ROLE_OPTIONS,
    SUITABILITY_OPTIONS,
    APPLICATION_GATE_STEP,
    STORAGE_KEY,
    CURRENT_ACTOR,
    MESSAGE_TEMPLATES,
    STANDARD_REJECTION_MESSAGE,
    generateTemporaryPassword,
    escapeHtml,
    formatDate,
    formatDatetime,
    initials,
    loadCandidates,
    saveCandidates,
    logAudit
  };
})(window);
