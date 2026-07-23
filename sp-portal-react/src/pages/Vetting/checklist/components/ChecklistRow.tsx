'use client';

import { useState } from 'react';
import type { ChecklistItem } from '../data/checklist';
import {
  COMP_ITEMS,
  type ChecklistInterview,
} from '../modules/interview/model';
import {
  calculateFiveYearCoverage,
  extractEmploymentRecords,
  type EmploymentRecord,
} from '../modules/work-history/coverage';
import { AssessmentResult } from '../../interview/AssessmentResult';
import styles from '../page.module.css';

export interface AdminWorkHistoryEntry {
  employer: string;
  companyContact: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  reasonForLeaving: string;
}

function normaliseWorkHistoryDate(value: string, edge: 'start' | 'end') {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  const month = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (!month) return trimmed;
  if (edge === 'start') return `${trimmed}-01`;

  const year = Number(month[1]);
  const monthIndex = Number(month[2]);
  const endDay = new Date(year, monthIndex, 0).getDate();
  return `${trimmed}-${String(endDay).padStart(2, '0')}`;
}

export function ChecklistRow({
  item,
  checked,
  autoValidated = false,
  registeredValue,
  registeredFields,
  registrationComplete = true,
  saving,
  readOnly = false,
  interview,
  candidateName,
  candidateRole,
  workHistoryEntries = [],
  onToggle,
  onDocFieldChange,
  onDocFieldBlur,
  getDocFieldValue,
  onRequiredDownload,
  onInterviewScore,
}: {
  item: ChecklistItem;
  checked: boolean;
  autoValidated?: boolean;
  registeredValue?: string;
  registeredFields?: Array<{ label: string; value: string }>;
  registrationComplete?: boolean;
  saving: boolean;
  readOnly?: boolean;
  interview?: ChecklistInterview;
  candidateName?: string;
  candidateRole?: string;
  workHistoryEntries?: AdminWorkHistoryEntry[];
  onToggle: () => void;
  onDocFieldChange: (docKey: string, fieldKey: string, value: string) => void;
  onDocFieldBlur: (docKey: string, fieldKey: string, value: string) => void;
  getDocFieldValue: (docKey: string, fieldKey: string) => string;
  onRequiredDownload?: () => Promise<void>;
  onInterviewScore?: (group: 'comp' | 'prac', key: string, score: number) => void | Promise<void>;
}) {
  const normalise = (value: string | undefined) =>
    (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const translateSentToFolderStatus = (value: string) => {
    switch (normalise(value)) {
      case 'pendente':
        return 'Pending';
      case 'sim':
        return 'Yes';
      case 'nao':
        return 'No';
      case 'nao aplicavel':
        return 'Not applicable';
      default:
        return value;
    }
  };
  const hasDocumentRegistration = Boolean(
    item.docKey && item.docTypes?.length && item.documentRegistration !== false,
  );
  const hasDocFields = Boolean(item.docKey && item.docFields?.length);
  const hasAdminReviewFields = Boolean(
    item.docFields?.some((field) => !field.hidden && field.adminReview),
  );
  const documentStatus = item.docKey ? getDocFieldValue(item.docKey, '__documentStatus') : '';
  const sentToFolderStatus = item.docKey ? getDocFieldValue(item.docKey, '__sentToFolder') : '';
  const notApplicableValues = new Set(['not applicable', 'nao aplicavel', 'not required']);
  const isDocumentNotApplicable = Boolean(
    item.docKey &&
      (notApplicableValues.has(normalise(documentStatus)) ||
        notApplicableValues.has(normalise(sentToFolderStatus)) ||
        normalise(registeredValue).includes('not applicable')),
  );
  const ageGateResult =
    item.docKey === 'age_check'
      ? getDocFieldValue(item.docKey, 'age_gate_result')
      : '';
  const isAgeInsurancePending =
    item.docKey === 'age_check' &&
    ageGateResult !== 'Rejected' &&
    (getDocFieldValue(item.docKey, 'age_verification') === 'PENDING_INSURER' ||
      registeredValue?.toLowerCase().includes('pending insurer verification'));
  const isAgeRejected = item.docKey === 'age_check' && ageGateResult === 'Rejected';
  const hideAgeRegistrationData = isAgeInsurancePending;
  const [docsOpen, setDocsOpen] = useState(false);
  const isWorkReferences = item.docKey === 'work_references';
  const isFiveYearEmploymentHistory = item.docKey === 'five_year_employment_history';
  const isReferenceWorkflow = item.docKey === 'reference_workflow';
  const isCompetencyScores = item.docKey === 'competency_scores';
  const isPracticalTests = item.docKey === 'practical_tests';
  const [visibleEmploymentRows, setVisibleEmploymentRows] = useState(1);
  const [copiedReferenceText, setCopiedReferenceText] = useState(false);

  const scoreValue = (group: 'comp' | 'prac', key: string) =>
    Number(interview?.[group]?.[key] || 0);
  const hasScore = (group: 'comp' | 'prac', key: string) =>
    scoreValue(group, key) > 0;
  const coreCompetencyComplete = COMP_ITEMS.every((score) => hasScore('comp', score.k));
  const coreCompetencyTotal = COMP_ITEMS.reduce(
    (sum, score) => sum + scoreValue('comp', score.k),
    0,
  );
  const coreCompetencyBand = (() => {
    if (!coreCompetencyComplete) return '';
    if (coreCompetencyTotal >= 27) return '27+ Recommended';
    if (coreCompetencyTotal >= 22) return '22-26 Consider';
    if (coreCompetencyTotal >= 20) return '20-21 Borderline';
    return '<20 Not recommended';
  })();
  const shouldHideNotApplicable =
    autoValidated && isDocumentNotApplicable && item.docKey !== 'rtw_doc';

  const syncDocField = (docKey: string, fieldKey: string, value: string) => {
    onDocFieldChange(docKey, fieldKey, value);
    onDocFieldBlur(docKey, fieldKey, value);
  };

  const deleteEmploymentRow = (slot: number) => {
    if (!item.docKey || readOnly) return;
    const maxRows = 6;
    const employmentFields = ['name', 'email', 'role', 'start', 'end', 'method'];
    const followUpFields = ['email_status', 'outcome', 'notes'];

    for (let current = slot; current < maxRows; current += 1) {
      const next = current + 1;
      employmentFields.forEach((field) => {
        syncDocField(
          item.docKey!,
          `employer_${current}_${field}`,
          getDocFieldValue(item.docKey!, `employer_${next}_${field}`),
        );
      });
      followUpFields.forEach((field) => {
        syncDocField(
          'reference_workflow',
          `employer_${current}_${field}`,
          getDocFieldValue('reference_workflow', `employer_${next}_${field}`),
        );
      });
    }

    employmentFields.forEach((field) => {
      syncDocField(item.docKey!, `employer_${maxRows}_${field}`, '');
    });
    followUpFields.forEach((field) => {
      syncDocField('reference_workflow', `employer_${maxRows}_${field}`, '');
    });
    setVisibleEmploymentRows((current) => Math.max(1, current - 1));
  };

  if (shouldHideNotApplicable) return null;

  const renderDocFields = () =>
    item.docFields
      ?.filter(
        (field) =>
          !field.hidden &&
          (item.documentRegistration !== false || field.adminReview),
      )
      .map((field) => {
      const value = getDocFieldValue(item.docKey!, field.key);
      if (field.type === 'select' && field.options) {
        return (
          <DocSelect
            key={field.key}
            label={field.label}
            options={field.options}
            value={value}
            readOnly={readOnly}
            onChange={(nextValue) => onDocFieldChange(item.docKey!, field.key, nextValue)}
            onBlur={(nextValue) => onDocFieldBlur(item.docKey!, field.key, nextValue)}
          />
        );
      }
      return (
        <DocInput
          key={field.key}
          label={field.label}
          type={field.type}
          value={value}
          placeholder={field.placeholder}
          hint={field.hint}
          multiline={item.docKey === 'interview_notes' && field.key === 'interview_notes'}
          readOnly={readOnly || isDocumentNotApplicable}
          readOnlyReason={isDocumentNotApplicable ? 'Not required for this case' : undefined}
          onChange={(nextValue) => onDocFieldChange(item.docKey!, field.key, nextValue)}
          onBlur={(nextValue) => onDocFieldBlur(item.docKey!, field.key, nextValue)}
        />
      );
    });

  const renderRequiredDownload = () => {
    if (!item.requiredDownload || !item.docKey) return null;

    return (
      <div className={styles.requiredDownloadBlock}>
        <button
          type="button"
          className={styles.requiredDownloadButton}
          disabled={readOnly}
          onClick={async () => {
            if (readOnly) return;
            if (onRequiredDownload) await onRequiredDownload();
            const fieldKey = item.requiredDownload!.trackingField;
            onDocFieldChange(item.docKey!, fieldKey, 'Yes');
            onDocFieldBlur(item.docKey!, fieldKey, 'Yes');
          }}
        >
          ↓ {item.requiredDownload.label}
        </button>
        <span className={styles.requiredDownloadStatus}>
          {getDocFieldValue(item.docKey, item.requiredDownload.trackingField) === 'Yes'
            ? '✓ Download registered'
            : 'Download required before completing this item'}
        </span>
      </div>
    );
  };

  const renderPlaceholderDownload = () => {
    if (!item.placeholderDownload) return null;

    return (
      <div className={styles.requiredDownloadBlock}>
        <button
          type="button"
          className={styles.requiredDownloadButton}
          disabled
          title="Document placeholder only. The file is not available yet."
        >
          ↓ {item.placeholderDownload.label}
        </button>
        <span className={styles.requiredDownloadStatus}>
          Reserved document: {item.placeholderDownload.documentName}
        </span>
      </div>
    );
  };

  const referenceRequestMessage = () => {
    const applicantName = candidateName?.trim() || 'the applicant';
    const applicantRole = candidateRole?.trim() || 'role';

    return `Dear Sir/Madam,

I hope this message finds you well.

We are currently in the process of hiring ${applicantName} for a ${applicantRole} at BA Express, and he has listed your company as a previous employer.

As part of our standard recruitment procedure, we would greatly appreciate if you could provide us with the following information:

Can you confirm that ${applicantName} was employed at your company?
What were his employment dates (start and end date)?
What position/role did he hold during his employment?
Could you please share your feedback on his work performance, reliability, and overall conduct as an employee?
Any additional insights you could provide about his punctuality, professionalism, and ability to work as part of a team would be extremely valuable to us in making our hiring decision.

All information provided will be treated with strict confidentiality and used solely for employment verification purposes.

Thank you very much for your time and assistance. Should you have any questions, please feel free to contact me.

Best regards,`;
  };

  const renderWorkReferences = () => {
    if (!isWorkReferences || !item.docKey) return null;
    const fields = Object.fromEntries(
      item.docFields?.map((field) => [
        field.key,
        getDocFieldValue(item.docKey!, field.key),
      ]) ?? [],
    );
    const records = extractEmploymentRecords(fields);
    const coverage = calculateFiveYearCoverage(records);
    const lastFilledRecordIndex = records.reduce(
      (last, record, index) =>
        record.company || record.role || record.start || record.end ? index : last,
      -1,
    );
    const visibleRows = Math.min(
      records.length,
      Math.max(1, visibleEmploymentRows, lastFilledRecordIndex + 1),
    );

    return (
      <div className={`${styles.docFieldPanel} ${styles.workReferencesPanel}`}>
        <DocInput
          label="References requested on"
          type="date"
          value={getDocFieldValue(item.docKey, 'references_requested_at')}
          readOnly={readOnly}
          onChange={(value) => onDocFieldChange(item.docKey!, 'references_requested_at', value)}
          onBlur={(value) => onDocFieldBlur(item.docKey!, 'references_requested_at', value)}
        />

        {!coverage.complete && (
          <div className={`${styles.coverageStatus} ${styles.coverageStatusFlag}`}>
            <strong>5-year coverage flag</strong>
            <span>{coverage.summary}</span>
          </div>
        )}

        <div className={styles.employmentHistoryGrid}>
          {records.slice(0, visibleRows).map((_, index) => {
            const slot = index + 1;
            return (
              <div key={slot} className={styles.employmentHistoryRow}>
                <div className={styles.employmentHistoryRowTitle}>
                  <span>Employment record {slot}</span>
                  <button
                    type="button"
                    className={styles.deleteEmploymentRowButton}
                    disabled={readOnly}
                    onClick={() => deleteEmploymentRow(slot)}
                  >
                    Delete
                  </button>
                </div>
                <DocInput
                  label={`Company ${slot}`}
                  type="text"
                  value={getDocFieldValue(item.docKey!, `employer_${slot}_name`)}
                  placeholder="Company name"
                  readOnly={readOnly}
                  onChange={(value) => onDocFieldChange(item.docKey!, `employer_${slot}_name`, value)}
                  onBlur={(value) => onDocFieldBlur(item.docKey!, `employer_${slot}_name`, value)}
                />
                <DocInput
                  label={`Reference e-mail ${slot}`}
                  type="text"
                  value={getDocFieldValue(item.docKey!, `employer_${slot}_email`)}
                  placeholder="reference@example.com"
                  readOnly={readOnly}
                  onChange={(value) => onDocFieldChange(item.docKey!, `employer_${slot}_email`, value)}
                  onBlur={(value) => onDocFieldBlur(item.docKey!, `employer_${slot}_email`, value)}
                />
                <DocInput
                  label={`Role ${slot}`}
                  type="text"
                  value={getDocFieldValue(item.docKey!, `employer_${slot}_role`)}
                  placeholder="Job title"
                  readOnly={readOnly}
                  onChange={(value) => onDocFieldChange(item.docKey!, `employer_${slot}_role`, value)}
                  onBlur={(value) => onDocFieldBlur(item.docKey!, `employer_${slot}_role`, value)}
                />
                <DocInput
                  label={`Start date ${slot}`}
                  type="date"
                  value={getDocFieldValue(item.docKey!, `employer_${slot}_start`)}
                  readOnly={readOnly}
                  onChange={(value) => onDocFieldChange(item.docKey!, `employer_${slot}_start`, value)}
                  onBlur={(value) => onDocFieldBlur(item.docKey!, `employer_${slot}_start`, value)}
                />
                <DocInput
                  label={`End date ${slot}`}
                  type="date"
                  value={getDocFieldValue(item.docKey!, `employer_${slot}_end`)}
                  readOnly={readOnly}
                  onChange={(value) => onDocFieldChange(item.docKey!, `employer_${slot}_end`, value)}
                  onBlur={(value) => onDocFieldBlur(item.docKey!, `employer_${slot}_end`, value)}
                />
                <DocSelect
                  label={`Reference method ${slot}`}
                  options={['Oral', 'Letter', 'E-mail']}
                  value={getDocFieldValue(item.docKey!, `employer_${slot}_method`)}
                  readOnly={readOnly}
                  onChange={(value) => onDocFieldChange(item.docKey!, `employer_${slot}_method`, value)}
                  onBlur={(value) => onDocFieldBlur(item.docKey!, `employer_${slot}_method`, value)}
                />
              </div>
            );
          })}
        </div>

        {visibleRows < records.length && (
          <button
            type="button"
            className={styles.addEmploymentRowButton}
            disabled={readOnly}
            onClick={() =>
              setVisibleEmploymentRows((current) =>
                Math.min(records.length, Math.max(current, visibleRows) + 1),
              )
            }
          >
            + Add employer
          </button>
        )}
      </div>
    );
  };

  const renderFiveYearEmploymentHistory = () => {
    if (!isFiveYearEmploymentHistory || !item.docKey) return null;
    const workReferenceFields = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => index + 1).flatMap((slot) => [
        [`employer_${slot}_name`, getDocFieldValue('work_references', `employer_${slot}_name`)],
        [`employer_${slot}_email`, getDocFieldValue('work_references', `employer_${slot}_email`)],
        [`employer_${slot}_role`, getDocFieldValue('work_references', `employer_${slot}_role`)],
        [`employer_${slot}_start`, getDocFieldValue('work_references', `employer_${slot}_start`)],
        [`employer_${slot}_end`, getDocFieldValue('work_references', `employer_${slot}_end`)],
        [`employer_${slot}_method`, getDocFieldValue('work_references', `employer_${slot}_method`)],
      ]),
    );
    const referenceRecords = extractEmploymentRecords(workReferenceFields).filter(
      (record) => record.company || record.role || record.start || record.end,
    );
    const submittedEntries = workHistoryEntries.filter(
      (entry) => entry.employer || entry.jobTitle || entry.startDate || entry.endDate,
    );
    const submittedRecords: EmploymentRecord[] = submittedEntries.map((entry) => ({
      company: entry.employer,
      role: entry.jobTitle,
      start: normaliseWorkHistoryDate(entry.startDate, 'start'),
      end: entry.endDate ? normaliseWorkHistoryDate(entry.endDate, 'end') : '',
      method: 'Driver portal',
    }));
    const records = [...submittedRecords, ...referenceRecords];
    const coverage = calculateFiveYearCoverage(records);

    return (
      <div className={`${styles.docFieldPanel} ${styles.workReferencesPanel}`}>
        {!coverage.complete && (
          <div className={`${styles.coverageStatus} ${styles.coverageStatusFlag}`}>
            <strong>5-year coverage flag</strong>
            <span>{coverage.summary}</span>
          </div>
        )}

        {records.length === 0 ? (
          <div className={styles.emptyInheritedBlock}>
            No records yet — the driver submits work history in the candidate portal.
          </div>
        ) : (
          <>
            {submittedEntries.length > 0 && (
              <div className={styles.workHistoryReviewList}>
                <div className={styles.workHistoryReviewSectionTitle}>
                  Driver-submitted work history
                </div>
                {submittedEntries.map((entry, index) => {
                  const slot = index + 1;
                  const period = [entry.startDate || 'No start date', entry.endDate || 'Current'].join(' - ');
                  return (
                    <div
                      key={`${entry.employer}-${entry.startDate}-${entry.endDate}-${slot}`}
                      className={styles.workHistoryReviewRow}
                    >
                      <div className={styles.workHistoryReviewHeader}>
                        <strong>{entry.employer || `Employer ${slot}`}</strong>
                        <span>{period}</span>
                      </div>
                      <div className={styles.workHistoryReviewMeta}>
                        <span>Role: {entry.jobTitle || 'Not recorded'}</span>
                        <span>Company contact: {entry.companyContact || 'Not recorded'}</span>
                        <span>
                          Reason for leaving: {entry.reasonForLeaving || 'Not recorded'}
                        </span>
                        <span>Source: Driver portal</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {referenceRecords.length > 0 && (
              <div className={styles.workHistoryReviewList}>
                <div className={styles.workHistoryReviewSectionTitle}>
                  Interview work references
                </div>
                {referenceRecords.map((record, index) => {
                  const slot = index + 1;
                  const period = [record.start || 'No start date', record.end || 'Current'].join(' - ');
                  return (
                    <div
                      key={`${record.company}-${record.start}-${record.end}-${slot}`}
                      className={styles.workHistoryReviewRow}
                    >
                      <div className={styles.workHistoryReviewHeader}>
                        <strong>{record.company || `Company ${slot}`}</strong>
                        <span>{period}</span>
                      </div>
                      <div className={styles.workHistoryReviewMeta}>
                        <span>Role: {record.role || 'Not recorded'}</span>
                        <span>
                          Reference e-mail: {record.email || 'Not recorded'}
                        </span>
                        <span>Method: {record.method || 'Not recorded'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderReferenceWorkflow = () => {
    if (!isReferenceWorkflow || !item.docKey) return null;
    const workReferenceFields = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => index + 1).flatMap((slot) => [
        [`employer_${slot}_name`, getDocFieldValue('work_references', `employer_${slot}_name`)],
        [`employer_${slot}_email`, getDocFieldValue('work_references', `employer_${slot}_email`)],
        [`employer_${slot}_role`, getDocFieldValue('work_references', `employer_${slot}_role`)],
        [`employer_${slot}_start`, getDocFieldValue('work_references', `employer_${slot}_start`)],
        [`employer_${slot}_end`, getDocFieldValue('work_references', `employer_${slot}_end`)],
        [`employer_${slot}_method`, getDocFieldValue('work_references', `employer_${slot}_method`)],
      ]),
    );
    const legacyRecords = extractEmploymentRecords(workReferenceFields).filter(
      (record) => record.company || record.role || record.start || record.end,
    );
    // Driver-submitted work history first, then any legacy admin-typed
    // references — same order as the registration-complete gate so the
    // per-slot status fields line up.
    const submittedRecords: EmploymentRecord[] = workHistoryEntries
      .filter((entry) => entry.employer || entry.jobTitle || entry.startDate || entry.endDate)
      .map((entry) => ({
        company: entry.employer,
        email: entry.companyContact,
        role: entry.jobTitle,
        start: normaliseWorkHistoryDate(entry.startDate, 'start'),
        end: entry.endDate ? normaliseWorkHistoryDate(entry.endDate, 'end') : '',
        method: 'Driver portal',
      }));
    const records = [...submittedRecords, ...legacyRecords];
    const referenceEmailText = referenceRequestMessage();
    const workflowValue = (slot: number, field: string) =>
      getDocFieldValue(item.docKey!, `employer_${slot}_${field}`) ||
      getDocFieldValue('five_year_employment_history', `employer_${slot}_${field}`);

    return (
      <div className={`${styles.docFieldPanel} ${styles.workReferencesPanel}`}>
        {records.length === 0 ? (
          <div className={styles.emptyInheritedBlock}>
            No employment records yet — the driver submits work history in the candidate portal.
          </div>
        ) : (
          <>
            <div className={styles.referenceEmailTemplateBlock}>
              <pre className={styles.referenceEmailBody}>{referenceEmailText}</pre>
              <button
                type="button"
                className={styles.copyConfirmationButton}
                onClick={async () => {
                  await navigator.clipboard.writeText(referenceEmailText);
                  setCopiedReferenceText(true);
                }}
              >
                {copiedReferenceText ? '✓ E-mail text copied' : 'Copy e-mail text'}
              </button>
            </div>

            <div className={styles.referenceFollowUpList}>
              {records.map((record, index) => {
                const slot = index + 1;
                return (
                  <div key={`${record.company}-${slot}`} className={styles.referenceFollowUpRow}>
                    <div className={styles.referenceFollowUpCompany}>
                      <strong>{record.company || `Company ${slot}`}</strong>
                      <span>
                        {[record.role, record.start, record.end || 'Current', record.method]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      <span>{record.email ? `Contact: ${record.email}` : 'No company contact recorded'}</span>
                    </div>
                    <DocSelect
                      label="Email status"
                      options={['Not sent', 'Email sent', 'Responded']}
                      value={workflowValue(slot, 'email_status')}
                      readOnly={readOnly}
                      onChange={(value) =>
                        onDocFieldChange(item.docKey!, `employer_${slot}_email_status`, value)
                      }
                      onBlur={(value) =>
                        onDocFieldBlur(item.docKey!, `employer_${slot}_email_status`, value)
                      }
                    />
                    <DocSelect
                      label="Reference outcome"
                      options={['Approved', 'Reproved']}
                      value={workflowValue(slot, 'outcome')}
                      readOnly={readOnly}
                      onChange={(value) =>
                        onDocFieldChange(item.docKey!, `employer_${slot}_outcome`, value)
                      }
                      onBlur={(value) =>
                        onDocFieldBlur(item.docKey!, `employer_${slot}_outcome`, value)
                      }
                    />
                    <DocInput
                      label="Notes"
                      type="text"
                      value={workflowValue(slot, 'notes')}
                      placeholder="Reference notes, evidence, chase details..."
                      readOnly={readOnly}
                      onChange={(value) =>
                        onDocFieldChange(item.docKey!, `employer_${slot}_notes`, value)
                      }
                      onBlur={(value) =>
                        onDocFieldBlur(item.docKey!, `employer_${slot}_notes`, value)
                      }
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderCompetencyScores = () => {
    if (!isCompetencyScores) return null;
    return (
      <div className={`${styles.docFieldPanel} ${styles.competencyScorePanel}`}>
        <div className={styles.competencyScoreList}>
          {COMP_ITEMS.map((score) => {
            const current = scoreValue('comp', score.k);
            return (
              <div key={score.k} className={styles.scoreRow}>
                <div className={styles.scoreLabelCol}>
                  <div className={styles.scoreLabel}>{score.label}</div>
                  <div className={styles.scoreDefinition}>
                    {current ? score.desc[current - 1] : 'Score 1-5'}
                  </div>
                </div>
                <div className={styles.scoreButtons}>
                  {[1, 2, 3, 4, 5].map((scoreOption) => (
                    <button
                      key={scoreOption}
                      type="button"
                      className={`${styles.scoreButton} ${current === scoreOption ? styles.scoreButtonSelected : ''} ${styles[`score${scoreOption}`]}`}
                      disabled={readOnly || !onInterviewScore}
                      onClick={() => onInterviewScore?.('comp', score.k, scoreOption)}
                    >
                      {scoreOption}
                    </button>
                  ))}
                </div>
                <div className={styles.scoreCurrent}>{current || '-'}/5</div>
              </div>
            );
          })}
        </div>
        <ReadOnlyDocField
          label="Total score"
          value={String(coreCompetencyTotal)}
          placeholder="0-35"
        />
        <ReadOnlyDocField
          label="Score band"
          value={coreCompetencyBand}
          placeholder={coreCompetencyComplete ? '— select —' : 'Complete all scores'}
        />
      </div>
    );
  };

  const renderPracticalTests = () => {
    if (!isPracticalTests) return null;
    return (
      <div className={styles.docFieldPanel}>
        <AssessmentResult token={interview?.assessmentToken} />
      </div>
    );
  };

  return (
    <div
      className={[
        styles.item,
        item.conditional ? styles.itemConditional : '',
        isAgeInsurancePending ? styles.itemAmber : '',
        isAgeRejected ? styles.itemRejected : '',
        isDocumentNotApplicable ? styles.itemNotApplicable : '',
      ].join(' ')}
    >
      {item.sectionHeader && (
        <div className={styles.passoHeader}>{item.sectionHeader}</div>
      )}
      <div className={styles.itemRow}>
        <label className={styles.itemLabel}>
          <input
            type="checkbox"
            checked={checked}
            disabled={readOnly || saving || autoValidated || (!checked && !registrationComplete)}
            onChange={onToggle}
            className={styles.nativeCheckbox}
          />
          <span
            aria-hidden="true"
            className={`${styles.checkIcon} ${checked ? styles.checkIconDone : ''}`}
          >
            {checked ? '✓' : ''}
          </span>
          <span className={styles.itemTitle}>
            {item.title}
            {autoValidated && <span className={styles.automaticTag}>Auto-validated</span>}
            {isDocumentNotApplicable && (
              <span className={styles.notRequiredTag}>Not required</span>
            )}
          </span>
        </label>

        {hasDocumentRegistration && (
          <button
            type="button"
            className={styles.docToggle}
            onClick={() => setDocsOpen((v) => !v)}
            aria-expanded={docsOpen}
          >
            {docsOpen ? 'Hide fields ▲' : 'Enter details ▼'}
          </button>
        )}
      </div>

      {!checked && !registrationComplete && (
        <p className={styles.registrationRequired}>
          {item.docKey === 'competency_scores'
            ? 'Complete all core competency scores before checking this item.'
            : 'Complete the required registration fields before checking this item.'}
        </p>
      )}

      {isDocumentNotApplicable && (
        <p className={styles.notApplicableNotice}>
          This item is not required for this candidate or role. Supporting upload fields are inactive unless the status is changed.
        </p>
      )}

      {!hideAgeRegistrationData && (registeredFields?.length || registeredValue) && (
        <div className={styles.registeredData}>
          <span className={styles.registeredDataLabel}>
            {registeredFields?.length ? 'Driver registration data' : 'Registration data'}
          </span>
          {registeredFields?.length ? (
            <div className={styles.registeredDataGrid}>
              {registeredFields.map((field) => (
                <div key={field.label} className={styles.registeredDataField}>
                  <span>{field.label}</span>
                  <strong>{field.value || '—'}</strong>
                </div>
              ))}
            </div>
          ) : (
            <strong className={styles.registeredValue}>{registeredValue}</strong>
          )}
        </div>
      )}
      {hideAgeRegistrationData && registeredValue && (
        <strong className={styles.registeredValue}>{registeredValue}</strong>
      )}

      {item.links && item.links.length > 0 && (
        <div className={styles.itemLinks}>
          {item.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.itemLink}
            >
              ↗ {link.label}
            </a>
          ))}
        </div>
      )}

      {renderPlaceholderDownload()}

      {isWorkReferences && renderWorkReferences()}

      {isFiveYearEmploymentHistory && renderFiveYearEmploymentHistory()}

      {isReferenceWorkflow && renderReferenceWorkflow()}

      {isCompetencyScores && renderCompetencyScores()}

      {isPracticalTests && renderPracticalTests()}

      {!isWorkReferences && !isFiveYearEmploymentHistory && !isReferenceWorkflow && !isCompetencyScores && !isPracticalTests && !hasDocumentRegistration && hasDocFields && (!autoValidated || hasAdminReviewFields) && (
        <div className={styles.docFieldPanel}>
          {renderDocFields()}
        </div>
      )}

      {!hasDocumentRegistration && renderRequiredDownload()}

      {hasDocumentRegistration && docsOpen && (
        <div className={styles.docFieldPanel}>
          <div className={styles.documentRegistrationGrid}>
            <DocSelect
              label="Document status"
              options={['Not requested', 'Pending', 'Received', 'Verified original', 'Rejected / replace required', 'Not applicable']}
              value={getDocFieldValue(item.docKey!, '__documentStatus')}
              readOnly={readOnly}
              onChange={(value) => {
                onDocFieldChange(item.docKey!, '__documentStatus', value);
                onDocFieldBlur(item.docKey!, '__documentStatus', value);
              }}
              onBlur={() => undefined}
            />
            <DocInput
              label="File / document name"
              type="text"
              value={getDocFieldValue(item.docKey!, '__fileName')}
              placeholder="e.g. Passport Pedro Monte.pdf"
              readOnly={readOnly || isDocumentNotApplicable}
              readOnlyReason={isDocumentNotApplicable ? 'Not required for this case' : undefined}
              onChange={(value) => onDocFieldChange(item.docKey!, '__fileName', value)}
              onBlur={(value) => onDocFieldBlur(item.docKey!, '__fileName', value)}
            />
            <DocInput
              label="Google Drive file / folder URL"
              type="url"
              value={getDocFieldValue(item.docKey!, '__driveUrl')}
              placeholder="https://drive.google.com/..."
              readOnly={readOnly || isDocumentNotApplicable}
              readOnlyReason={isDocumentNotApplicable ? 'Not required for this case' : undefined}
              onChange={(value) => onDocFieldChange(item.docKey!, '__driveUrl', value)}
              onBlur={(value) => onDocFieldBlur(item.docKey!, '__driveUrl', value)}
            />
            <DocSelect
              label="Sent to folder"
              options={['Pending', 'Yes', 'No', 'Not applicable']}
              value={translateSentToFolderStatus(getDocFieldValue(item.docKey!, '__sentToFolder'))}
              readOnly={readOnly}
              onChange={(value) => {
                onDocFieldChange(item.docKey!, '__sentToFolder', value);
                onDocFieldBlur(item.docKey!, '__sentToFolder', value);
              }}
              onBlur={() => undefined}
            />
            <DocInput
              label="Received / uploaded date"
              type="date"
              value={getDocFieldValue(item.docKey!, '__receivedDate')}
              readOnly={readOnly || isDocumentNotApplicable}
              readOnlyReason={isDocumentNotApplicable ? 'Not required for this case' : undefined}
              onChange={(value) => onDocFieldChange(item.docKey!, '__receivedDate', value)}
              onBlur={(value) => onDocFieldBlur(item.docKey!, '__receivedDate', value)}
            />
            <DocInput
              label="Document notes"
              type="text"
              value={getDocFieldValue(item.docKey!, '__documentNotes')}
              placeholder="Original seen, copy filed, replacement needed..."
              readOnly={readOnly}
              onChange={(value) => onDocFieldChange(item.docKey!, '__documentNotes', value)}
              onBlur={(value) => onDocFieldBlur(item.docKey!, '__documentNotes', value)}
            />
          </div>

          {renderDocFields()}
        </div>
      )}

      {hasDocumentRegistration && renderRequiredDownload()}
    </div>
  );
}

function ReadOnlyDocField({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder?: string;
}) {
  return (
    <div className={styles.docField}>
      <label className={styles.docFieldLabel}>{label}</label>
      <input
        className={styles.docFieldInput}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled
        readOnly
      />
    </div>
  );
}

function DocSelect({
  label,
  options,
  value,
  onChange,
  onBlur,
  readOnly = false,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className={styles.docField}>
      <label className={styles.docFieldLabel}>{label}</label>
      <select
        className={styles.docFieldInput}
        value={value ?? ''}
        disabled={readOnly}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onBlur(event.target.value)}
      >
        <option value="">— select —</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function DocInput({
  label,
  type,
  value,
  placeholder,
  hint,
  multiline = false,
  onChange,
  onBlur,
  readOnly = false,
  readOnlyReason,
}: {
  label: string;
  type: string;
  value: string;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  return (
    <div className={`${styles.docField} ${multiline ? styles.docFieldWide : ''}`}>
      <label className={styles.docFieldLabel}>{label}</label>
      {multiline ? (
        <textarea
          className={`${styles.docFieldInput} ${styles.docFieldTextarea}`}
          value={value ?? ''}
          placeholder={placeholder}
          disabled={readOnly}
          rows={7}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onBlur(event.target.value)}
        />
      ) : (
        <input
          className={styles.docFieldInput}
          type={type}
          value={value ?? ''}
          placeholder={placeholder}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onBlur(event.target.value)}
        />
      )}
      {readOnlyReason && <p className={styles.docFieldInactiveHint}>{readOnlyReason}</p>}
      {hint && <p className={styles.docFieldHint}>{hint}</p>}
    </div>
  );
}
