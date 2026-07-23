'use client';

import { useState } from 'react';
import type { ChecklistCandidate } from '../modules/central-driver-record/model';
import styles from '../page.module.css';

export type CaseRegistrationField =
  | 'name'
  | 'email'
  | 'phone'
  | 'role'
  | 'startDate'
  | 'nationality'
  | 'dob'
  | 'postcode'
  | 'nin'
  | 'address'
  | 'owner'
  | 'driveFolderUrl';

interface CaseRegistrationPanelProps {
  candidate: ChecklistCandidate;
  onChange: (field: CaseRegistrationField, value: string) => void;
  onBlur: () => void;
  readOnly?: boolean;
}

type ReviewItem = {
  label: string;
  value: string | null | undefined;
  full?: boolean;
};

type ReviewSection = {
  title: string;
  items: ReviewItem[];
};

type EditableApplicantField = {
  label: string;
  field: CaseRegistrationField;
  value: string;
  full?: boolean;
  inputType?: string;
  multiline?: boolean;
  options?: string[];
};

const ROLE_OPTIONS = ['Van Courier', 'Motorbike Courier', 'Bicycle Courier'];

function cleanValue(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean || clean === '-' || clean.toLowerCase() === 'not applicable') return '';
  return clean;
}

function dateValue(value: string | null | undefined) {
  const clean = cleanValue(value);
  if (!clean) return '';
  const date = new Date(clean);
  if (Number.isNaN(date.getTime())) return clean;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function CaseRegistrationPanel({
  candidate,
  onChange,
  onBlur,
  readOnly = false,
}: CaseRegistrationPanelProps) {
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [editingDriverInfo, setEditingDriverInfo] = useState(false);

  const rtw = candidate.checklistDocs.rtw_doc ?? {};
  const dvla = candidate.checklistDocs.dvla_doc ?? {};
  const delivery = candidate.checklistDocs.delivery_experience ?? {};
  const applicationForm = candidate.checklistDocs.application_form ?? {};

  const editableApplicantFields: EditableApplicantField[] = [
    { label: 'Full name', field: 'name', value: candidate.name, full: true },
    { label: 'Email', field: 'email', value: candidate.email, inputType: 'email' },
    { label: 'UK phone number', field: 'phone', value: candidate.phone, inputType: 'tel' },
    {
      label: 'Proposed role',
      field: 'role',
      value: candidate.role,
      options: ROLE_OPTIONS,
    },
    { label: 'Nationality', field: 'nationality', value: candidate.nationality },
    { label: 'Date of birth', field: 'dob', value: candidate.dob, inputType: 'date' },
    { label: 'UK postcode', field: 'postcode', value: candidate.postcode },
    { label: 'National Insurance Number', field: 'nin', value: candidate.nin },
    {
      label: 'Current address',
      field: 'address',
      value: candidate.address,
      full: true,
      multiline: true,
    },
  ];

  const applicantReviewItems = editableApplicantFields
    .map((item) => ({
      label: item.label,
      value: item.field === 'dob' ? dateValue(item.value) : cleanValue(item.value),
      full: item.full,
    }))
    .filter((item) => item.value);

  const sections: ReviewSection[] = [
    {
      title: 'Right to Work',
      items: [
        { label: 'Right to Work', value: rtw.rtw_type },
        { label: 'Document number', value: rtw.rtw_number },
        { label: 'Document expiry date', value: dateValue(rtw.rtw_expiry) },
        { label: 'Share code', value: rtw.rtw_share_code },
      ],
    },
    {
      title: 'Driving licence',
      items: [
        { label: 'Licence type', value: dvla.dvla_type },
        { label: 'Drive License Number', value: dvla.dvla_number },
        { label: 'Expiry date', value: dateValue(dvla.dvla_expiry) },
        { label: 'DVLA share code', value: dvla.dvla_share_code },
        { label: 'Country of issue', value: dvla.dvla_country },
        { label: 'Years of driving experience', value: dvla.years_of_experience },
      ],
    },
    {
      title: 'Delivery experience',
      items: [
        { label: 'Multi-drop experience', value: delivery.has_multi_drop_experience },
        { label: 'Company', value: delivery.multi_drop_company },
        { label: 'Time of experience', value: delivery.multi_drop_experience_length },
        { label: 'Notes', value: delivery.multi_drop_notes, full: true },
      ],
    },
    {
      title: 'Application form signature',
      items: [
        { label: 'Signed on', value: dateValue(applicationForm.signed_at) },
        { label: 'Typed signature', value: applicationForm.signature_text, full: true },
      ],
    },
  ];

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => ({ ...item, value: cleanValue(item.value) }))
        .filter((item) => item.value),
    }))
    .filter((section) => section.items.length > 0);

  const handleEditClick = () => {
    if (readOnly) return;
    setImpactModalOpen(true);
  };

  const handleConfirmEdit = () => {
    setImpactModalOpen(false);
    setEditingDriverInfo(true);
  };

  const handleDoneEditing = () => {
    void onBlur();
    setEditingDriverInfo(false);
  };

  return (
    <div className={styles.caseRegistrationBlock}>
      <div className={styles.caseRegistrationHead}>
        <div>
          <p className={styles.panelKicker}>Central Driver Record</p>
          <h3 className={styles.caseRegistrationTitle}>Case registration</h3>
          <p className={styles.panelSub}>
            Review the information submitted by the applicant.
          </p>
        </div>
        {!readOnly && (
          <div className={styles.caseRegistrationActions}>
            {editingDriverInfo && (
              <span className={styles.caseRegistrationEditNotice}>Editing impacts vetting</span>
            )}
            <button
              type="button"
              className={
                editingDriverInfo
                  ? styles.caseRegistrationDoneButton
                  : styles.caseRegistrationEditButton
              }
              onClick={editingDriverInfo ? handleDoneEditing : handleEditClick}
            >
              {editingDriverInfo ? 'Done editing' : 'Edit driver info'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.caseRegistrationReview}>
        {(editingDriverInfo || applicantReviewItems.length > 0) && (
          <section className={styles.caseRegistrationReviewSection}>
            <h4 className={styles.caseRegistrationSection}>Applicant details</h4>
            <div className={styles.caseRegistrationGrid}>
              {editingDriverInfo
                ? editableApplicantFields.map((item) => (
                    <div
                      key={item.field}
                      className={`${styles.caseRegistrationField} ${item.full ? styles.caseRegistrationFieldFull : ''}`}
                    >
                      <label htmlFor={`case-registration-${item.field}`}>{item.label}</label>
                      {item.options ? (
                        <select
                          id={`case-registration-${item.field}`}
                          value={item.value ?? ''}
                          onChange={(event) => onChange(item.field, event.target.value)}
                          onBlur={onBlur}
                        >
                          <option value="">Select role</option>
                          {item.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : item.multiline ? (
                        <textarea
                          id={`case-registration-${item.field}`}
                          className={styles.caseRegistrationTextarea}
                          value={item.value ?? ''}
                          rows={3}
                          onChange={(event) => onChange(item.field, event.target.value)}
                          onBlur={onBlur}
                        />
                      ) : (
                        <input
                          id={`case-registration-${item.field}`}
                          type={item.inputType ?? 'text'}
                          value={item.value ?? ''}
                          onChange={(event) => onChange(item.field, event.target.value)}
                          onBlur={onBlur}
                        />
                      )}
                    </div>
                  ))
                : applicantReviewItems.map((item) => (
                    <div
                      key={`Applicant details:${item.label}`}
                      className={`${styles.caseRegistrationField} ${item.full ? styles.caseRegistrationFieldFull : ''}`}
                    >
                      <span className={styles.caseRegistrationReviewLabel}>{item.label}</span>
                      <span className={styles.caseRegistrationReviewValue}>{item.value}</span>
                    </div>
                  ))}
            </div>
          </section>
        )}

        {visibleSections.map((section) => (
          <section key={section.title} className={styles.caseRegistrationReviewSection}>
            <h4 className={styles.caseRegistrationSection}>{section.title}</h4>
            <div className={styles.caseRegistrationGrid}>
              {section.items.map((item) => (
                <div
                  key={`${section.title}:${item.label}`}
                  className={`${styles.caseRegistrationField} ${item.full ? styles.caseRegistrationFieldFull : ''}`}
                >
                  <span className={styles.caseRegistrationReviewLabel}>{item.label}</span>
                  <span className={styles.caseRegistrationReviewValue}>{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {impactModalOpen && (
        <div className={styles.rejectModalBackdrop} role="presentation">
          <div
            className={styles.rejectModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-info-impact-title"
          >
            <div className={styles.impactModalIcon}>!</div>
            <h3 id="driver-info-impact-title" className={styles.rejectModalTitle}>
              Editing driver information can impact vetting
            </h3>
            <p className={styles.rejectModalWarning}>
              Changes to applicant details can alter validation, checklist status, generated
              documents, age/role rules, Right to Work or DVLA review context, and audit history.
            </p>
            <p className={styles.rejectModalWarning}>
              Continue only if you are correcting verified information from the applicant or
              supporting evidence.
            </p>
            <div className={styles.rejectModalActions}>
              <button
                type="button"
                className={styles.appRejectCancelBtn}
                onClick={() => setImpactModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.appHoldConfirmBtn}
                onClick={handleConfirmEdit}
              >
                I understand, edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
