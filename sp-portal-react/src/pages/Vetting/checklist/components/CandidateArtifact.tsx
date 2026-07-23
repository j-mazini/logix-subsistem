'use client';

import type { ChecklistCandidate } from '../modules/central-driver-record/model';
import { exportCandidate } from '../modules/client-outputs/exporters';
import styles from './CandidateArtifact.module.css';

interface Props {
  candidate: ChecklistCandidate;
}

function Row({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>{title}</h4>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export function CandidateArtifact({ candidate }: Props) {
  const docs = candidate.checklistDocs;

  // Passo 1
  const roleType = docs.role_type ?? {};
  const ageCheck = docs.age_check ?? {};
  const baseline = docs.registration_baseline ?? {};

  // Passo 2
  const ninDoc   = docs.nin_doc ?? {};
  const identity = docs.identity ?? {};

  // Passo 3
  const rtw  = docs.rtw_doc  ?? {};
  const dvla = docs.dvla_doc ?? {};

  // Passo 4
  const baForm = docs.ba_form ?? {};

  const generatedAt = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className={styles.artifact}>
      <div className={styles.artifactHeader}>
        <div>
          <p className={styles.artifactKicker}>Application Overview</p>
          <h3 className={styles.artifactName}>{candidate.name || '—'}</h3>
          <p className={styles.artifactRef}>Reference: {candidate.rawId} · Generated {generatedAt}</p>
        </div>
        <button
          type="button"
          className={styles.printBtn}
          onClick={() => exportCandidate('suitability', candidate)}
        >
          Suitability PDF
        </button>
      </div>

      <Section title="📋 Personal Information">
        <Row label="Full name" value={candidate.name} />
        <Row label="Email" value={candidate.email} />
        <Row label="Phone" value={candidate.phone} />
        <Row label="Date of birth" value={candidate.dob} />
        <Row label="Nationality" value={candidate.nationality} />
        <Row label="UK postcode" value={candidate.postcode || baseline.uk_postcode} />
        <Row label="Current address" value={candidate.address} />
        <Row label="NIN" value={candidate.nin || ninDoc.nin_number || baseline.national_insurance_number} />
      </Section>

      <Section title="🎯 Role & Application">
        <Row label="Proposed role" value={roleType.role_selected ?? candidate.role} />
        <Row label="Age verification" value={ageCheck.age_gate_result} />
        <Row label="Proposed start date" value={candidate.startDate} />
        <Row label="Employment type" value={candidate.employment} />
      </Section>

      <Section title="🪪 Identity Document">
        <Row label="Document type & number" value={identity.idRef} />
        <Row label="Document expiry" value={identity.idExpiry} />
      </Section>

      <Section title="📜 Right to Work">
        <Row label="Document type" value={rtw.rtw_type || baseline.right_to_work} />
        <Row label="Document number" value={rtw.rtw_number} />
        <Row label="Nationality (EU/Visa)" value={rtw.rtw_nationality} />
        <Row label="Expiry date" value={rtw.rtw_expiry} />
        <Row label="RTW check date" value={rtw.rtw_check_date} />
        <Row label="Share Code" value={rtw.rtw_share_code} />
      </Section>

      {candidate.role !== 'Bicycle Courier' && (
        <Section title="🚗 Driving Licence">
          <Row label="Licence type" value={dvla.dvla_type} />
          <Row label="Drive License Number" value={dvla.dvla_number} />
          <Row label="Expiry date" value={dvla.dvla_expiry} />
          <Row label="Country of issue" value={dvla.dvla_country} />
          <Row label="DVLA Share Code" value={dvla.dvla_share_code || baseline.dvla_share_code} />
        </Section>
      )}

      <Section title="✍️ Legal Declaration">
        <Row label="Form signed by" value={baForm.ba_form_signatory} />
        <Row label="Signed on" value={baForm.ba_form_signed_date} />
      </Section>
    </div>
  );
}
