// BA Express Driver Vetting SOP v2.0 — Checklist Master Data
// Source: Master Vetting Protocol v3.0 · Vetting Process Protocol v2.0 · Strategic Blueprint v2

export interface ChecklistDocField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select';
  hidden?: boolean;
  adminReview?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

export interface ChecklistItem {
  title: string;
  hidden?: boolean;
  detail?: string;
  required?: boolean;
  conditional?: boolean;
  conditionNote?: string;
  docKey?: string;
  documentRegistration?: boolean;
  docTypes?: string[];
  docFields?: ChecklistDocField[];
  requiredDownload?: {
    label: string;
    url: string;
    trackingField: string;
  };
  placeholderDownload?: {
    label: string;
    documentName: string;
  };
  links?: Array<{ label: string; url: string }>;
  sectionHeader?: string;
  messageSlot?: 'candidate-confirmation' | 'interview-invitation' | 'approval-email';
}

export interface ChecklistStep {
  title: string;
  subtitle: string;
  items: ChecklistItem[];
  sla?: string;
  autoAction?: 'pre-screen' | 'interview-booking' | 'doc-request' | 'dhl-submit';
}

export const CHECKLIST_STEPS: ChecklistStep[] = [
  {
    title: 'Driver Registration & Application Form',
    subtitle: 'Application Form data capture, conditional DVLA/Right to Work rules, first review and confirmation email.',
    sla: 'Same day',
    items: [
      {
        title: 'Application Form data collected',
        required: true,
        detail: 'Name, phone, email, role type, date of birth, UK postcode/address, National Insurance Number, Right to Work and DVLA Share Code captured from the Application Form.',
        docKey: 'registration_baseline',
      },
      {
        title: 'Right to Work check',
        required: true,
        conditional: true,
        conditionNote: 'British/Irish does not require a Share Code. Online RTW routes require the Share Code.',
        docKey: 'rtw_doc',
        documentRegistration: false,
        docTypes: ['British/Irish', 'Passport + Online Share Code', 'Visa / eVisa + Online Share Code'],
        docFields: [
          { key: 'rtw_review_status', label: 'Review status', type: 'select', adminReview: true, options: ['Accepted', 'Rejected', 'Not applicable'], required: true },
          { key: 'rtw_type', label: 'Right to Work', type: 'select', options: ['British/Irish', 'Passport + Online Share Code', 'Visa / eVisa + Online Share Code', 'Not applicable'], required: true },
          { key: 'rtw_number', label: 'Document number', type: 'text', placeholder: 'Document number or N/A', required: true },
          { key: 'rtw_expiry', label: 'Expiry date', type: 'date' },
          { key: 'rtw_share_code', label: 'Share code', type: 'text', placeholder: 'e.g. W12 345 678', hint: 'Required only for online Right to Work routes.' },
          { key: 'rtw_check_date', label: 'RTW check date', type: 'date', adminReview: true },
        ],
        links: [
          { label: 'Check RTW Share Code', url: 'https://www.gov.uk/view-right-to-work' },
          { label: 'Generate RTW Share Code', url: 'https://www.gov.uk/prove-right-to-work/get-a-share-code-online' },
        ],
      },
      {
        title: 'Driving Licence check',
        required: true,
        conditional: true,
        conditionNote: 'DVLA is not required when Role Type = Bicycle Courier.',
        docKey: 'dvla_doc',
        documentRegistration: false,
        docTypes: ['UK Drive License', 'EU', 'Not applicable'],
        docFields: [
          { key: 'dvla_review_status', label: 'Review status', type: 'select', adminReview: true, options: ['Accepted', 'Rejected', 'Not applicable'], required: true },
          { key: 'dvla_type', label: 'Licence type', type: 'select', options: ['UK Drive License', 'EU', 'Not applicable'], required: true },
          { key: 'dvla_number', label: 'Drive License Number', type: 'text', placeholder: 'Drive License Number or N/A', required: true },
          { key: 'dvla_expiry', label: 'Expiry date', type: 'date', adminReview: true },
          { key: 'dvla_country', label: 'Country of issue', type: 'text', placeholder: 'e.g. UK, Italy, N/A' },
          { key: 'dvla_share_code', label: 'DVLA share code', type: 'text', placeholder: 'UK Drive License only' },
        ],
        links: [
          { label: 'DVLA Driving Check', url: 'https://www.gov.uk/check-driving-information' },
        ],
      },
      {
        title: 'Registration data reviewed and exported',
        required: true,
        detail: 'Review the captured registration information against the Central Driver Record before sending confirmation.',
      },
      {
        title: 'Confirmation e-mail sent to candidate',
        required: true,
        detail: 'Send the approved access message through the agreed communication channel.',
        messageSlot: 'candidate-confirmation',
      },
      {
        title: 'BA Application Form downloaded and signature status confirmed',
        required: true,
        docKey: 'application_form',
        requiredDownload: {
          label: 'Download BA Application Form',
          url: '/documents/BA_Express_Application_Form.pdf',
          trackingField: 'applicationFormDownloadedAt',
        },
        docFields: [
          { key: 'signature_status', label: 'Application Form signature status', type: 'select', options: ['Signed', 'Awaiting signature', 'Sent for signature', 'Signature failed'], required: true },
          { key: 'signed_at', label: 'Signed on', type: 'date' },
          { key: 'signer_name', label: 'Signer name', type: 'text' },
          { key: 'signer_email', label: 'Signer email', type: 'text' },
          { key: 'signature_text', label: 'Typed signature', type: 'text' },
        ],
      },
      {
        title: 'Driver registration completed',
        required: true,
        detail: 'Create or confirm the driver record before starting vetting.',
      },
    ],
  },
  {
    title: 'Interview',
    subtitle: 'Pre-interview information, interview scoring, work history review, DBS/reference checks and final interview decision.',
    sla: 'Before or on interview day',
    items: [
      {
        sectionHeader: '2.1 Pre-Interview',
        title: 'Interview Information Recorded',
        required: true,
        detail: 'Interview Date, Start Time, End Time, Location, Interviewer and Supervisor recorded.',
        docKey: 'interview_record',
        docFields: [
          { key: 'int_date', label: 'Interview Date', type: 'date', required: true },
          { key: 'int_start_time', label: 'Start Time', type: 'text', placeholder: 'HH:MM', required: true },
          { key: 'int_end_time', label: 'End Time', type: 'text', placeholder: 'HH:MM', required: true },
          { key: 'int_location', label: 'Location', type: 'text', required: true },
          { key: 'int_interviewer', label: 'Interviewer', type: 'text', required: true },
          { key: 'int_supervisor', label: 'Supervisor', type: 'text', required: true },
        ],
        messageSlot: 'interview-invitation',
      },
      {
        title: 'Payment mode and company behaviour document downloaded',
        required: true,
        detail: 'Placeholder for the payment mode and company behaviour briefing document.',
        placeholderDownload: {
          label: 'Download briefing document',
          documentName: 'BA Express Payment Mode and Company Behaviour Briefing.pdf',
        },
      },
      {
        sectionHeader: '2.2 Interview',
        title: 'Core Competencies Scored',
        required: true,
        docKey: 'competency_scores',
        docFields: [
          { key: 'total_score', label: 'Total score', type: 'text', placeholder: '0-35', required: true },
          { key: 'score_band', label: 'Score band', type: 'select', options: ['27+ Recommended', '22-26 Consider', '20-21 Borderline', '<20 Not recommended'], required: true },
        ],
      },
      {
        title: 'Online test released and score reviewed',
        required: true,
        docKey: 'practical_tests',
        detail: 'Redirect to the online test module. Once the candidate completes the released test, the score appears in this checklist.',
        links: [
          { label: 'Open / release online test', url: '/admin/interview' },
        ],
      },
      {
        title: 'DBS collected or requested',
        required: true,
        docKey: 'dbs_collect_request',
        docFields: [
          { key: 'dbs_collection_status', label: 'DBS action', type: 'select', options: ['Collected', 'Requested'], required: true },
          { key: 'dbs_collection_date', label: 'Action date', type: 'date', required: true },
          { key: 'dbs_collection_notes', label: 'Notes', type: 'text', placeholder: 'Collection/request details...' },
        ],
      },
      {
        title: 'Work References recorded',
        required: true,
        detail: 'Employment history is submitted by the driver in the candidate portal (Work history form). References can be collected orally or by letter/e-mail; gaps of 28 days or more are flagged in the 5-year history review.',
      },
      {
        title: '5 years history reviewed',
        required: true,
        docKey: 'five_year_employment_history',
        docFields: [],
      },
      {
        title: 'Interview Notes recorded',
        required: true,
        docKey: 'interview_notes',
        docFields: [
          { key: 'interview_notes', label: 'Interview notes', type: 'text', placeholder: 'Describe the interview, observations and context...', required: true },
        ],
      },
      {
        title: 'Red Flags reviewed',
        required: true,
        docKey: 'red_flags',
        docFields: [
          { key: 'immediate_concerns', label: 'Applicant red flags checklist', type: 'text', placeholder: 'List red flags or write None', required: true },
          { key: 'performance_concerns', label: 'Performance concerns', type: 'text', placeholder: 'List performance concerns or write None' },
          { key: 'red_flag_notes', label: 'Red flag notes', type: 'text' },
        ],
      },
      {
        title: 'Finish interview',
        required: true,
        docKey: 'interview_finish',
        docFields: [
          { key: 'interview_finish_status', label: 'Interview finish status', type: 'select', options: ['Not Suitable', 'Passed Interview but preceed with caution', 'Suitable'], required: true },
          { key: 'interview_finish_date', label: 'Finish date', type: 'date', required: true },
          { key: 'interview_finish_notes', label: 'Finish notes', type: 'text' },
        ],
      },
      {
        sectionHeader: '2.3 Post Interview',
        title: 'Work Reference Check',
        required: true,
        docKey: 'reference_workflow',
        docFields: [
          { key: 'reference_statuses', label: 'Reference statuses', type: 'text', placeholder: 'Employer A: Email sent / Responded / Approved' },
          { key: 'reference_outcome', label: 'Reference outcome', type: 'select', options: ['Approved', 'Risk Assessment', 'Rejected', 'Waiting'] },
        ],
      },
      {
        title: 'DBS',
        required: true,
        docKey: 'uk_crc',
        docFields: [
          { key: 'crc_type', label: 'Certificate type', type: 'select', options: ['DBS (England/Wales)', 'Disclosure Scotland', 'NI DBS'], required: true },
          { key: 'dbs_document_status', label: 'Document Status', type: 'select', options: ['No Records', 'With convictions'], required: true },
          { key: 'crc_reference', label: 'Reference number', type: 'text', required: true },
          { key: 'dbs_decision', label: 'DBS approval decision', type: 'select', options: ['Approved', 'Reproved'], required: true },
        ],
      },
      {
        title: 'APHIDS',
        conditional: true,
        conditionNote: 'Required for depots or routes that require aviation/security clearance.',
        docKey: 'aphids',
        docFields: [
          { key: 'aphids_date', label: 'Date', type: 'date', required: true },
          { key: 'aphids_in_folder', label: 'In folder?', type: 'select', options: ['Yes', 'No'], required: true },
        ],
        links: [
          { label: 'APHIDS Application', url: 'https://cargo.aphids-application.homeoffice.gov.uk' },
        ],
      },
      {
        title: 'Final decision',
        required: true,
        docKey: 'reference_dbs_final_decision',
        docFields: [
          { key: 'final_decision', label: 'Final decision', type: 'select', options: ['Approved', 'Reproved'], required: true },
          { key: 'final_decision_reason', label: 'Decision notes', type: 'text' },
        ],
      },
      {
        title: 'Approval e-mail',
        required: true,
        detail: 'Copy and send the approval e-mail after the final decision is approved.',
        messageSlot: 'approval-email',
      },
    ],
  },
  {
    title: 'Suitability Assessment',
    subtitle: 'Criminal declaration, declaration of suitability and observations.',
    sla: 'Same day as interview',
    items: [
      {
        title: 'Criminal record declaration recorded',
        required: true,
        docKey: 'criminal_record_declaration',
        docFields: [
          { key: 'declared_criminal_record', label: 'Candidate has declared a criminal record', type: 'select', options: ['No', 'Yes'], required: true },
          { key: 'criminal_record_notes', label: 'Declaration notes', type: 'text' },
        ],
      },
      {
        title: 'Declaration of Suitability signed',
        required: true,
        docKey: 'suitability_declaration',
        docFields: [
          { key: 'manager_name', label: 'Recruiting Manager name', type: 'text', placeholder: 'Full name', required: true },
          { key: 'declaration_date', label: 'Declaration date', type: 'date', required: true },
          { key: 'declaration_signed', label: 'Declaration signed', type: 'select', options: ['Yes', 'No'], required: true },
        ],
      },
      {
        title: 'Observations recorded',
        required: true,
        docKey: 'suitability_observations',
        docFields: [
          { key: 'strengths', label: 'Strengths identified', type: 'text', placeholder: 'Key strengths observed...' },
          { key: 'development_areas', label: 'Areas for development', type: 'text', placeholder: 'Gaps or concerns noted...' },
          { key: 'candidate_questions', label: 'Questions asked by candidate', type: 'text', placeholder: 'Questions raised by the candidate...' },
          { key: 'overall_impression', label: 'Overall impression', type: 'text', required: true },
        ],
      },
    ],
  },
  {
    title: 'DHL Courses & Finalisation',
    subtitle: 'DHL courses, original document collection, payment mode, DHL folder and final application completion.',
    sla: 'Before driver start',
    items: [
      {
        title: 'Training courses booked and status recorded',
        required: true,
        docKey: 'cot_course',
        docFields: [
          { key: 'cot_book_date', label: 'Book date', type: 'date', required: true },
          { key: 'cot_status', label: 'Status', type: 'select', options: ['Booked', 'Completed', 'Failed', 'Not required'], required: true },
          { key: 'manual_handling_date', label: 'Manual Handling Date', type: 'date', required: true },
          { key: 'manual_handling_status', label: 'Manual Handling Status', type: 'select', options: ['Booked', 'Completed', 'Not required'], required: true },
          { key: 'dangerous_goods_date', label: 'Dangerous Goods Date', type: 'date', required: true },
          { key: 'dangerous_goods_status', label: 'Dangerous Goods Status', type: 'select', options: ['Booked', 'Completed', 'Not required'], required: true },
        ],
      },
      {
        title: 'Original documents collected and recorded',
        required: true,
        docKey: 'documents_collection',
        docFields: [
          { key: 'originals_seen', label: 'Originals seen', type: 'select', options: ['Yes', 'No'], required: true },
          { key: 'copies_filed', label: 'Copies filed', type: 'select', options: ['Yes', 'No'], required: true },
          { key: 'collection_notes', label: 'Notes', type: 'text' },
        ],
      },
      {
        title: 'Cost model recorded',
        required: true,
        docKey: 'payment_mode',
        docFields: [
          { key: 'payment_mode', label: 'Cost model', type: 'select', options: ['DAF', 'DR', 'FSR', 'VSR'], required: true },
          { key: 'payment_notes', label: 'Payment notes', type: 'text' },
        ],
      },
      {
        title: 'DHL folder organised, physical copies present and delivered',
        required: true,
        docKey: 'dhl_folder',
        docFields: [
          { key: 'folder_organized', label: 'Folder organized', type: 'select', options: ['Yes', 'No'], required: true },
          { key: 'physical_copies_present', label: 'Physical copies present', type: 'select', options: ['Yes', 'No'], required: true },
          { key: 'sent_to_folder', label: 'Sent to folder', type: 'select', options: ['Pending', 'Yes', 'No', 'Not applicable'], required: true },
          { key: 'dhl_status', label: 'DHL status', type: 'select', options: ['Pending', 'Approved in writing', 'Rejected'], required: true },
        ],
      },
      { title: 'Driver application completed', required: true },
    ],
  },
];

export const TOTAL_CHECKLIST_ITEMS = CHECKLIST_STEPS.reduce(
  (total, step) => total + step.items.length,
  0,
);
