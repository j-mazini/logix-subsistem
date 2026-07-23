'use client';

import type { ChecklistCandidate } from '../modules/central-driver-record/model';
import { exportCandidate } from '../modules/client-outputs/exporters';
import styles from '../page.module.css';

function ReviewField({ label, value }: { label: string; value?: string }) {
  return (
    <div className={styles.registeredDataField}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

export function InitialInfoReview({ candidate }: { candidate: ChecklistCandidate }) {
  const roleType = candidate.checklistDocs.role_type ?? {};
  const ageCheck = candidate.checklistDocs.age_check ?? {};
  const rtw = candidate.checklistDocs.rtw_doc ?? {};
  const dvla = candidate.checklistDocs.dvla_doc ?? {};
  const baseline = candidate.checklistDocs.registration_baseline ?? {};

  return (
    <div className={styles.initialReviewBlock}>
      <div className={styles.initialReviewHeader}>
        <div>
          <span className={styles.registeredDataLabel}>Step 1 review</span>
          <h4 className={styles.initialReviewTitle}>Initial information snapshot</h4>
        </div>
        <button
          type="button"
          className={styles.exportButtonPrimary}
          onClick={() => exportCandidate('initial', candidate)}
        >
          Export initial review
        </button>
      </div>
      <div className={styles.registeredDataGrid}>
        <ReviewField label="Name" value={candidate.name || baseline.full_name} />
        <ReviewField label="Phone" value={candidate.phone || baseline.phone} />
        <ReviewField label="E-mail" value={candidate.email || baseline.email} />
        <ReviewField label="Role Type" value={roleType.role_selected || baseline.role_type || candidate.role} />
        <ReviewField label="Date of Birth" value={candidate.dob || baseline.date_of_birth} />
        <ReviewField label="UK Postcode" value={candidate.postcode || baseline.uk_postcode} />
        <ReviewField label="Address" value={candidate.address || baseline.address} />
        <ReviewField label="National Insurance Number" value={candidate.nin || baseline.national_insurance_number} />
        <ReviewField label="Right to Work" value={rtw.rtw_type || baseline.right_to_work} />
        <ReviewField
          label="DVLA Share Code"
          value={
            candidate.role === 'Bicycle Courier'
              ? 'Not required - Bike'
              : dvla.dvla_share_code || baseline.dvla_share_code
          }
        />
        <ReviewField label="Age gate result" value={ageCheck.age_gate_result} />
      </div>
    </div>
  );
}
