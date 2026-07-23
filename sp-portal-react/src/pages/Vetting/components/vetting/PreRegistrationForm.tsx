'use client';

import { useState, useCallback } from 'react';
import { addDoc, collection, serverTimestamp } from '../../shims/firestore';
import { db } from '../../shims/firebase';
import { formatUkPhone, isValidUkPhone } from '../../utils/ukPhone';
import styles from './PreRegistrationForm.module.css';

// ─── form state ──────────────────────────────────────────────────────────────

interface FormState {
  roleCategory: 'Van Courier' | 'Motorbike Courier' | 'Bicycle Courier' | '';
  // personal
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  postcode: string;
  nin: string;
  // RTW
  rtwType: 'BRITISH_PASSPORT' | 'EU_PASSPORT_SHARE_CODE' | '';
  rtwNumber: string;
  rtwExpiry: string;
  rtwShareCode: string;
  // DVLA
  dvlaType: 'BRITISH' | 'EU' | '';
  dvlaNumber: string;
  dvlaExpiry: string;
  dvlaShareCode: string;
  dvlaCountry: string;
  // experience
  yearsOfExperience: string;
  multiDropExperience: 'YES' | 'NO' | '';
  multiDropCompany: string;
  multiDropExperienceLength: string;
  multiDropNotes: string;
  applicationSignature: string;
}

const EMPTY: FormState = {
  roleCategory: '',
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  nationality: '',
  address: '',
  postcode: '',
  nin: '',
  rtwType: '',
  rtwNumber: '',
  rtwExpiry: '',
  rtwShareCode: '',
  dvlaType: '',
  dvlaNumber: '',
  dvlaExpiry: '',
  dvlaShareCode: '',
  dvlaCountry: '',
  yearsOfExperience: '',
  multiDropExperience: '',
  multiDropCompany: '',
  multiDropExperienceLength: '',
  multiDropNotes: '',
  applicationSignature: '',
};

// ─── BA Express / Driver Application Form declaration ──────────────────────────
// Source of truth: public/documents/BA_Express_Application_Form.pdf (CAA Security
// Declaration). Bumping the text means bumping DECLARATION_VERSION so existing
// consent records stay traceable to the wording the candidate actually accepted.

const DECLARATION_VERSION = 'BA_Express_Application_Form_v1';

const DECLARATION_STATEMENTS: string[] = [
  'I declare that the information given is complete and accurate.',
  'I understand that it is an offence under the Aviation & Maritime Security Act 1990 to give false information regarding my application for employment.',
  'I declare that I have no criminal convictions other than any treated as spent under the provisions of the Rehabilitation of Offenders Act 1974 and those disclosed on the job application form.',
  'I declare that I accept that any misrepresentation of the facts is a ground for refusal of employment or disciplinary proceedings (and, in appropriate cases, criminal charges).',
  'I accept and authorise employment checks and renewals of criminal record certification, in the time frame set by the authorising bodies.',
  'I authorise approaches to be made to former employers, educational establishments, government agencies and personal referees for verification of the information I have supplied within this form.',
  'I accept that if the activities for which I am to be deployed require a CTC the CAA or its agents will carry out a CTC and that deployment on any such activities is conditional on the satisfactory result of such a check.',
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatNin(raw: string): string {
  // Target: AB 12 34 56 C — 2 letters, 6 digits, 1 letter
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 9);
  const parts: string[] = [];
  if (cleaned.length > 0) parts.push(cleaned.slice(0, 2));
  if (cleaned.length > 2) parts.push(cleaned.slice(2, 4));
  if (cleaned.length > 4) parts.push(cleaned.slice(4, 6));
  if (cleaned.length > 6) parts.push(cleaned.slice(6, 8));
  if (cleaned.length > 8) parts.push(cleaned.slice(8, 9));
  return parts.join(' ');
}

function formatShareCode(raw: string): string {
  // Target: W12 345 678
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 9);
  const parts: string[] = [];
  if (cleaned.length > 0) parts.push(cleaned.slice(0, 3));
  if (cleaned.length > 3) parts.push(cleaned.slice(3, 6));
  if (cleaned.length > 6) parts.push(cleaned.slice(6, 9));
  return parts.join(' ');
}

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Age verification gate:
//   < 18               → REJECTED        (too young to apply)
//   Bicycle, 18+       → AUTO_CONFIRMED  (insurance exception not applicable)
//   Van/Motorbike < 25 → PENDING_INSURER (accepted, but insurance must be confirmed)
//   Van/Motorbike 25+  → AUTO_CONFIRMED  (no age-related insurance condition)
type AgeVerification = 'REJECTED' | 'PENDING_INSURER' | 'AUTO_CONFIRMED';

const MIN_APPLY_AGE = 18;
const INSURER_REVIEW_AGE = 25;

function ageDecision(age: number | null, roleCategory?: FormState['roleCategory']): AgeVerification | null {
  if (age === null) return null;
  if (age < MIN_APPLY_AGE) return 'REJECTED';
  if (roleCategory === 'Bicycle Courier') return 'AUTO_CONFIRMED';
  if (age < INSURER_REVIEW_AGE) return 'PENDING_INSURER';
  return 'AUTO_CONFIRMED';
}

function ageGateResult(verification: AgeVerification | null) {
  if (verification === 'REJECTED') return 'Rejected';
  if (verification) return 'Accepted';
  return null;
}

function ageVerificationLabel(verification: AgeVerification | null) {
  if (verification === 'AUTO_CONFIRMED') return 'Accepted - auto-confirmed (25+)';
  if (verification === 'PENDING_INSURER') return 'Accepted - pending insurer verification (18-24)';
  if (verification === 'REJECTED') return 'Rejected - under 18';
  return null;
}

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;

// ─── wizard steps ────────────────────────────────────────────────────────────
// The apply flow is a 4-step wizard; each step validates before advancing and
// the last step carries the BA Application Form declaration + e-signature.

const STEPS = [
  { label: 'Your details', short: 'Details' },
  { label: 'Documents & licence', short: 'Documents' },
  { label: 'Experience', short: 'Experience' },
  { label: 'Declaration & signature', short: 'Sign' },
] as const;

function validatePersonalStep(f: FormState): string | null {
  if (!f.roleCategory) return 'Select the category you are applying for.';

  if (f.fullName.trim().split(/\s+/).length < 2) return 'Enter your full legal name (at least two words).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return 'A valid email address is required.';
  if (!isValidUkPhone(f.phone)) {
    return 'Enter a valid UK mobile number, e.g. +44 7700 900 000.';
  }
  if (!f.dateOfBirth) return 'Date of birth is required.';
  if (ageDecision(calcAge(f.dateOfBirth), f.roleCategory) === 'REJECTED') {
    return `You must be at least ${MIN_APPLY_AGE} years old to apply.`;
  }
  if (!f.nationality.trim()) return 'Nationality is required.';
  if (!f.address.trim()) return 'Residential address is required.';
  if (!UK_POSTCODE.test(f.postcode.trim())) return 'Enter a valid UK postcode (e.g. SW1A 1AA).';

  const ninClean = f.nin.replace(/\s/g, '');
  if (!/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i.test(ninClean)) {
    return 'National Insurance Number must be in the format AB 12 34 56 C.';
  }
  return null;
}

function validateDocumentsStep(f: FormState): string | null {
  if (!f.rtwType) return 'Select a Right to Work document type.';
  if (!f.rtwNumber.trim()) return 'Document number is required.';
  if (!f.rtwExpiry) return 'Document expiry date is required.';
  if (f.rtwType === 'EU_PASSPORT_SHARE_CODE') {
    if (!f.rtwShareCode.trim()) return 'An online Share Code is required for this route.';
  }
  if (f.roleCategory !== 'Bicycle Courier') {
    if (!f.dvlaType) return 'Select a driving licence type.';
    if (!f.dvlaNumber.trim()) return 'Drive License Number is required.';
    if (!f.dvlaExpiry) return 'Driving licence expiry date is required.';
    if (f.dvlaType === 'BRITISH' && !f.dvlaShareCode.trim()) {
      return 'DVLA Share Code is mandatory for UK Drive License.';
    }
    if (f.dvlaType === 'EU' && !f.dvlaCountry.trim()) {
      return 'Country of issue is required for EU licences.';
    }

    const exp = parseFloat(f.yearsOfExperience);
    if (isNaN(exp) || exp < 0) return 'Years of driving experience is required.';
  }
  return null;
}

function validateExperienceStep(f: FormState): string | null {
  if (!f.multiDropExperience) return 'Select whether you have multi-drop delivery experience.';
  if (f.multiDropExperience === 'YES') {
    if (!f.multiDropCompany.trim()) return 'Enter the company where you gained multi-drop experience.';
    if (!f.multiDropExperienceLength.trim()) return 'Enter how long your multi-drop experience is.';
  }
  return null;
}

const STEP_VALIDATORS: Array<(f: FormState) => string | null> = [
  validatePersonalStep,
  validateDocumentsStep,
  validateExperienceStep,
];

const LAST_STEP_INDEX = STEPS.length - 1;

function firstStepValidationError(f: FormState) {
  for (let i = 0; i < STEP_VALIDATORS.length; i++) {
    const message = STEP_VALIDATORS[i](f);
    if (message) return { step: i, message };
  }
  return null;
}

// ─── main component ───────────────────────────────────────────────────────────

export function PreRegistrationForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // Each BA Application Form permission is a checkbox the candidate must tick
  // individually, right on the apply form; the full set of ticked boxes IS the
  // electronic signature — no separate declaration step.
  const [acceptedStatements, setAcceptedStatements] = useState<boolean[]>(
    () => DECLARATION_STATEMENTS.map(() => false),
  );
  const [signatureConsent, setSignatureConsent] = useState(false);
  const [postcodeLookup, setPostcodeLookup] = useState<{
    status: 'idle' | 'loading' | 'valid' | 'invalid' | 'error';
    area?: string;
  }>({ status: 'idle' });

  const age = calcAge(form.dateOfBirth);
  const ageVerification = ageDecision(age, form.roleCategory);
  const exp = parseFloat(form.yearsOfExperience);
  const requiresDrivingLicence = form.roleCategory !== 'Bicycle Courier';
  const insuranceWarning =
    requiresDrivingLicence && form.dateOfBirth && form.yearsOfExperience
      ? (age !== null && age < 25) || (!isNaN(exp) && exp < 1)
      : false;

  const set = useCallback(
    (name: keyof FormState, value: string) =>
      setForm((prev) => ({ ...prev, [name]: value })),
    [],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      if (name === 'nin') {
        set('nin', formatNin(value));
      } else if (name === 'phone') {
        set('phone', formatUkPhone(value));
      } else if (name === 'rtwShareCode' || name === 'dvlaShareCode') {
        set(name as keyof FormState, formatShareCode(value));
      } else if (name === 'roleCategory') {
        setForm((prev) => ({
          ...prev,
          roleCategory: value as FormState['roleCategory'],
          ...(value === 'Bicycle Courier'
            ? {
                dvlaType: '',
                dvlaNumber: '',
                dvlaExpiry: '',
                dvlaShareCode: '',
                dvlaCountry: '',
                yearsOfExperience: '',
              }
            : {}),
        }));
      } else if (name === 'rtwType' || name === 'dvlaType') {
        // Reset dependent fields on type change
        if (name === 'rtwType') {
          setForm((prev) => ({
            ...prev,
            rtwType: value as FormState['rtwType'],
            rtwNumber: '',
            rtwExpiry: '',
            rtwShareCode: '',
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            dvlaType: value as FormState['dvlaType'],
            dvlaNumber: '',
            dvlaExpiry: '',
            dvlaShareCode: '',
            dvlaCountry: '',
          }));
        }
      } else if (name === 'multiDropExperience') {
        setForm((prev) => ({
          ...prev,
          multiDropExperience: value as FormState['multiDropExperience'],
          ...(value !== 'YES'
            ? {
                multiDropCompany: '',
                multiDropExperienceLength: '',
                multiDropNotes: '',
              }
            : {}),
        }));
      } else if (name === 'postcode') {
        setPostcodeLookup({ status: 'idle' });
        set('postcode', value);
      } else {
        set(name as keyof FormState, value);
      }
    },
    [set],
  );

  // Look up the postcode via postcodes.io (free, no key). Validates the code
  // and auto-fills the town/area into the address — postcodes.io does not
  // expose full street/house (PAF) data, so the visitor still types those.
  const lookupPostcode = useCallback(async () => {
    const pc = form.postcode.trim();
    if (!pc) {
      setPostcodeLookup({ status: 'idle' });
      return;
    }
    if (!UK_POSTCODE.test(pc)) {
      setPostcodeLookup({ status: 'invalid' });
      return;
    }

    setPostcodeLookup({ status: 'loading' });
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`,
      );
      if (!res.ok) {
        setPostcodeLookup({ status: 'invalid' });
        return;
      }
      const data = await res.json();
      const r = data.result;
      const town = r.admin_district as string | null;
      const area = [town, r.region || r.country].filter(Boolean).join(', ');

      setForm((prev) => {
        const next = { ...prev, postcode: r.postcode as string };
        // Append the town to the address only when it isn't already there.
        if (town && !prev.address.toLowerCase().includes(town.toLowerCase())) {
          const base = prev.address.replace(/[,\s]+$/, '').trim();
          next.address = base ? `${base}, ${town}` : town;
        }
        return next;
      });
      setPostcodeLookup({ status: 'valid', area });
    } catch {
      setPostcodeLookup({ status: 'error' });
    }
  }, [form.postcode]);

  const toggleStatement = (index: number) =>
    setAcceptedStatements((prev) => prev.map((v, i) => (i === index ? !v : v)));

  const scrollFormTop = () => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    setError(null);
    const validationError = STEP_VALIDATORS[step]?.(form) ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((s) => Math.min(s + 1, LAST_STEP_INDEX));
    scrollFormTop();
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
    scrollFormTop();
  };

  // Final step → re-validate every step (a candidate can go back and edit),
  // then check the BA Application Form permission boxes. Every permission
  // ticked individually plus the signature consent IS the electronic
  // signature — the application is written already signed (no DocuSign
  // round-trip).
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (step < LAST_STEP_INDEX) {
      goNext();
      return;
    }

    const validationError = firstStepValidationError(form);
    if (validationError) {
      setStep(validationError.step);
      setError(validationError.message);
      scrollFormTop();
      return;
    }

    if (!acceptedStatements.every(Boolean)) {
      setError('Please tick every declaration box — each permission must be accepted individually.');
      return;
    }
    if (!signatureConsent) {
      setError('Please tick the final box to confirm the ticked boxes count as your electronic signature.');
      return;
    }
    const signatureText = form.applicationSignature.trim();
    if (!signatureText) {
      setError('Please type your signature before submitting the application.');
      return;
    }

    setLoading(true);

    const consentedAt = new Date().toISOString();

    try {
      const docData = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        nationality: form.nationality.trim(),
        role: form.roleCategory,
        proposedRole: form.roleCategory,
        currentStatus: 'PRE_REGISTERED',
        source: 'apply_page',
        personalInfo: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          nationality: form.nationality.trim(),
          dateOfBirth: form.dateOfBirth,
          address: form.address,
          postcode: form.postcode.trim().toUpperCase(),
          nin: form.nin,
        },
        rtw: {
          documentType: form.rtwType,
          documentNumber: form.rtwNumber,
          expirationDate: form.rtwExpiry,
          nationality: form.nationality.trim(),
          shareCode: form.rtwShareCode || null,
        },
        dvla: {
          type: form.dvlaType || null,
          number: form.dvlaNumber || null,
          expirationDate: form.dvlaExpiry || null,
          shareCode: form.dvlaShareCode || null,
          country: form.dvlaCountry || null,
          yearsOfExperience: form.yearsOfExperience ? parseFloat(form.yearsOfExperience) : 0,
        },
        deliveryExperience: {
          hasMultiDropExperience: form.multiDropExperience === 'YES',
          company: form.multiDropCompany || null,
          experienceLength: form.multiDropExperienceLength || null,
          notes: form.multiDropNotes || null,
        },
        checklistDocs: {
          role_type: {
            role_selected: form.roleCategory,
            __documentStatus: 'Received',
          },
          age_check: {
            age_gate_result: ageGateResult(ageVerification),
            age_years: age,
            age_verification: ageVerification,
            age_verification_label: ageVerificationLabel(ageVerification),
            __documentStatus:
              ageVerification === 'AUTO_CONFIRMED'
                ? 'Received'
                : ageVerification === 'PENDING_INSURER'
                  ? 'Pending'
                  : ageVerification === 'REJECTED'
                    ? 'Rejected'
                    : '',
          },
          registration_baseline: {
            full_name: form.fullName,
            phone: form.phone,
            email: form.email,
            nationality: form.nationality.trim(),
            role_type: form.roleCategory,
            date_of_birth: form.dateOfBirth,
            uk_postcode: form.postcode.trim().toUpperCase(),
            address: form.address,
            national_insurance_number: form.nin,
            right_to_work:
              form.rtwType === 'BRITISH_PASSPORT'
                ? 'British/Irish'
                : 'Passport + Online Share Code',
            dvla_share_code:
              form.roleCategory === 'Bicycle Courier'
                ? 'Not required'
                : form.dvlaShareCode || '',
            __documentStatus: 'Received',
          },
          nin_doc: {
            nin_number: form.nin,
            __documentStatus: 'Received',
          },
          rtw_doc: {
            rtw_type:
              form.rtwType === 'BRITISH_PASSPORT'
                ? 'British/Irish'
                : 'Passport + Online Share Code',
            rtw_number: form.rtwNumber,
            rtw_expiry: form.rtwExpiry,
            rtw_nationality: form.nationality.trim(),
            rtw_share_code: form.rtwShareCode || null,
            __documentStatus: 'Declared by candidate',
          },
          dvla_doc: form.roleCategory === 'Bicycle Courier' ? {
            __documentStatus: 'Not applicable',
          } : {
            dvla_type:
              form.dvlaType === 'BRITISH'
                ? 'UK Drive License'
                : form.dvlaType === 'EU'
                  ? 'EU'
                  : '',
            dvla_number: form.dvlaNumber || null,
            dvla_expiry: form.dvlaExpiry || null,
            dvla_country: form.dvlaCountry || null,
            dvla_share_code: form.dvlaShareCode || null,
            years_of_experience: form.yearsOfExperience || null,
            __documentStatus: 'Declared by candidate',
          },
          delivery_experience: {
            has_multi_drop_experience: form.multiDropExperience === 'YES' ? 'Yes' : 'No',
            multi_drop_company: form.multiDropCompany || null,
            multi_drop_experience_length: form.multiDropExperienceLength || null,
            multi_drop_notes: form.multiDropNotes || null,
            __documentStatus: 'Declared by candidate',
          },
          application_form: {
            declaration_version: DECLARATION_VERSION,
            signature_status: 'Signed',
            signed_at: consentedAt,
            signer_name: form.fullName.trim(),
            signer_email: form.email.trim(),
            signature_text: signatureText,
            __documentStatus: 'Signed',
          },
        },
        // BA Application Form permissions acknowledged at apply time. Every
        // statement carries its own accepted flag because the candidate ticks
        // each box individually — kept as a top-level record so the consent is
        // auditable independent of the checklist.
        applicationDeclaration: {
          type: 'CAA_SECURITY_DECLARATION',
          version: DECLARATION_VERSION,
          acknowledged: true,
          consentToESign: true,
          consentedAt,
          signatureText,
          statements: DECLARATION_STATEMENTS.map((text, i) => ({
            text,
            accepted: acceptedStatements[i] === true,
          })),
        },
        // Electronic signature of the BA Express / Driver Application Form.
        // The candidate's individually ticked permission boxes ARE the
        // signature: the record is written already SIGNED, stamped with the
        // consent time.
        signature: {
          provider: 'declaration_checkbox',
          method: 'per_statement_checkbox',
          status: 'SIGNED',
          envelopeId: null as string | null,
          signedPdfPath: null as string | null,
          signerName: form.fullName.trim(),
          signerEmail: form.email.trim(),
          signatureText,
          requestedAt: consentedAt,
          completedAt: consentedAt,
        },
        prescreenFlags: {
          ageUnder25: requiresDrivingLicence && age !== null && age < 25,
          expUnder1yr: !isNaN(exp) && exp < 1,
          insuranceExceptionRequired: insuranceWarning,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        statusUpdatedAt: serverTimestamp(),
      };

      console.log('[PreRegistrationForm] Submitting driver application to Firestore...', { email: form.email, role: form.roleCategory });
      const ref = await addDoc(collection(db, 'drivers'), docData);
      console.log('[PreRegistrationForm] Application submitted successfully. Doc ID:', ref.id);

      setForm(EMPTY);
      setAcceptedStatements(DECLARATION_STATEMENTS.map(() => false));
      setSignatureConsent(false);
      setStep(0);
      setSubmitted(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[PreRegistrationForm] Submission failed:', errorMessage, err);

      if (errorMessage.includes('permission-denied') || errorMessage.includes('PERMISSION_DENIED')) {
        setError('Database access denied. Please check security rules or contact support.');
      } else if (errorMessage.includes('network') || errorMessage.includes('offline')) {
        setError('Network error. Please check your internet connection and try again.');
      } else if (errorMessage.includes('auth') || errorMessage.includes('unauthenticated')) {
        setError('Authentication failed. Please refresh the page and try again.');
      } else if (errorMessage.includes('FAILED_PRECONDITION')) {
        setError('Database is not properly initialized. Please contact support.');
      } else {
        setError('We could not submit your application. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✓</div>
        <h2 className={styles.successTitle}>Application submitted and signed</h2>
        <p className={styles.successMessage}>
          Thank you — your Driver Application Form has been signed electronically through the
          declaration boxes you ticked. Our recruitment team will now review your details and
          get back to you by email.
        </p>
      </div>
    );
  }

  const allStatementsAccepted = acceptedStatements.every(Boolean);
  const acceptedCount = acceptedStatements.filter(Boolean).length;
  const signatureText = form.applicationSignature.trim();
  const requiredDetailsComplete = firstStepValidationError(form) === null;
  const declarationComplete = allStatementsAccepted && signatureConsent && Boolean(signatureText);
  const canSubmit = !loading && requiredDetailsComplete && declarationComplete;

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {/* ── WIZARD STEPPER ── */}
      <ol className={styles.stepper} aria-label="Application steps">
        {STEPS.map((s, i) => (
          <li
            key={s.label}
            className={`${styles.step} ${i === step ? styles.stepCurrent : ''} ${i < step ? styles.stepDone : ''}`}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className={styles.stepMarker} aria-hidden="true">
              {i < step ? (
                <svg viewBox="0 0 12 10" className={styles.stepTick}>
                  <path d="M1 5.5 4.2 8.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={styles.stepLabel}>{s.label}</span>
            <span className={styles.stepLabelShort}>{s.short}</span>
          </li>
        ))}
      </ol>

      {error && (
        <div className={`${styles.status} ${styles.statusError}`} role="alert">
          {error}
        </div>
      )}

      {step === 0 && (
      <div className={styles.stepPane}>
      {/* ── PERSONAL INFORMATION ── */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Application category</legend>
        <div className={styles.grid2}>
          <SelectField
            label="Category you are applying for"
            name="roleCategory"
            value={form.roleCategory}
            onChange={handleChange}
            required
            options={[
              ['Van Courier', 'Van Courier'],
              ['Motorbike Courier', 'Motorbike Courier'],
              ['Bicycle Courier', 'Bicycle Courier'],
            ]}
          />
        </div>
        {form.roleCategory === 'Bicycle Courier' && (
          <div className={styles.notRequiredNotice} role="note">
            <strong>Not required</strong>
            <span>Bicycle Courier applications do not require a driving licence or insurance exception at this stage.</span>
          </div>
        )}
      </fieldset>

      {/* ── PERSONAL INFORMATION ── */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Personal information</legend>
        <div className={styles.grid2}>
          <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} full required />
          <Field label="Email address" name="email" type="email" value={form.email} onChange={handleChange} required />
          <Field label="UK phone number" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+44 7700 900 000" required />
          <Field label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} required />
          <Field label="Nationality" name="nationality" value={form.nationality} onChange={handleChange} placeholder="e.g. British" required />
        </div>
        <div className={styles.grid1}>
          <Textarea
            label="Residential address"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="House / flat number, street name, city"
            required
          />
        </div>
        <div className={styles.grid2}>
          <Field
            label="UK postcode"
            name="postcode"
            value={form.postcode}
            onChange={handleChange}
            onBlur={lookupPostcode}
            placeholder="e.g. SW1A 1AA"
            required
            hint={
              postcodeLookup.status === 'loading' ? (
                'Checking postcode…'
              ) : postcodeLookup.status === 'valid' ? (
                <span className={styles.postcodeOk}>
                  ✓ {postcodeLookup.area} — added to your address
                </span>
              ) : postcodeLookup.status === 'invalid' ? (
                <span className={styles.postcodeBad}>
                  ✗ Postcode not found. Please check it and try again.
                </span>
              ) : postcodeLookup.status === 'error' ? (
                "Couldn't check the postcode right now — you can still continue."
              ) : (
                'Enter your postcode to fill in your town automatically.'
              )
            }
          />
          <Field
            label="National Insurance Number"
            name="nin"
            value={form.nin}
            onChange={handleChange}
            placeholder="AB 12 34 56 C"
            hint="Format: AB 12 34 56 C — found on P60, payslip or HMRC letter."
            required
          />
        </div>
      </fieldset>

      </div>
      )}

      {step === 1 && (
      <div className={styles.stepPane}>
      {/* ── RIGHT TO WORK ── */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Right to work</legend>
        <div className={styles.grid2}>
          <SelectField
            label="Document type"
            name="rtwType"
            value={form.rtwType}
            onChange={handleChange}
            required
            options={[
              ['BRITISH_PASSPORT', 'British/Irish'],
              ['EU_PASSPORT_SHARE_CODE', 'Passport + Online Share Code'],
            ]}
          />
        </div>

        {form.rtwType && (
          <div className={styles.grid2}>
            <Field
              label="Passport number"
              name="rtwNumber"
              value={form.rtwNumber}
              onChange={handleChange}
              placeholder="e.g. 123456789"
              required
            />
            <Field
              label="Passport expiry date"
              name="rtwExpiry"
              type="date"
              value={form.rtwExpiry}
              onChange={handleChange}
              required
            />
            {form.rtwType === 'EU_PASSPORT_SHARE_CODE' && (
              <Field
                label="Share Code"
                name="rtwShareCode"
                value={form.rtwShareCode}
                onChange={handleChange}
                placeholder="W12 345 678"
                hint={
                  <>
                    You can generate your Share Code at{' '}
                    <a
                      href="https://www.gov.uk/prove-right-to-work/get-a-share-code-online"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.helpLink}
                    >
                      gov.uk/prove-right-to-work
                    </a>
                    .
                  </>
                }
                required
              />
            )}
          </div>
        )}
      </fieldset>

      {/* ── DRIVING LICENCE ── */}
      {!requiresDrivingLicence && (
        <fieldset className={`${styles.fieldset} ${styles.fieldsetInactive}`} aria-disabled="true">
          <legend className={styles.legend}>Driving licence</legend>
          <div className={styles.notRequiredNotice} role="note">
            <strong>Not required for Bicycle Courier</strong>
            <span>No DVLA licence, DVLA share code, driving experience or insurance exception is needed for this application category.</span>
          </div>
          <div className={styles.inactiveGrid}>
            <div className={styles.inactiveField}>
              <span>Licence type</span>
              <strong>Not applicable</strong>
            </div>
            <div className={styles.inactiveField}>
              <span>DVLA Share Code</span>
              <strong>Not required</strong>
            </div>
            <div className={styles.inactiveField}>
              <span>Driving experience</span>
              <strong>Not required</strong>
            </div>
            <div className={styles.inactiveField}>
              <span>Insurance exception</span>
              <strong>Not required</strong>
            </div>
          </div>
        </fieldset>
      )}

      {requiresDrivingLicence && (
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Driving licence</legend>
        <div className={styles.grid2}>
          <SelectField
            label="Licence type"
            name="dvlaType"
            value={form.dvlaType}
            onChange={handleChange}
            required
            options={[
              ['BRITISH', 'UK Drive License'],
              ['EU', 'EU licence'],
            ]}
          />
        </div>

        {form.dvlaType && (
          <div className={styles.grid2}>
            <Field
              label="Drive License Number"
              name="dvlaNumber"
              value={form.dvlaNumber}
              onChange={handleChange}
              placeholder={form.dvlaType === 'BRITISH' ? 'e.g. JONES012345JJ9AB' : 'Drive License Number'}
              required
            />
            <Field
              label="Expiry date"
              name="dvlaExpiry"
              type="date"
              value={form.dvlaExpiry}
              onChange={handleChange}
              required
            />

            {form.dvlaType === 'BRITISH' && (
              <Field
                label="DVLA Share Code (mandatory)"
                name="dvlaShareCode"
                value={form.dvlaShareCode}
                onChange={handleChange}
                placeholder="e.g. ABC 123 456"
                hint={
                  <>
                    Generate your code at{' '}
                    <a
                      href="https://www.gov.uk/view-driving-licence"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.helpLink}
                    >
                      gov.uk/view-driving-licence
                    </a>
                    . It expires in 21 days.
                  </>
                }
                required
              />
            )}

            {form.dvlaType === 'EU' && (
              <Field
                label="Country of issue"
                name="dvlaCountry"
                value={form.dvlaCountry}
                onChange={handleChange}
                placeholder="e.g. Italy"
                required
              />
            )}

            <Field
              label="Years of driving experience"
              name="yearsOfExperience"
              type="number"
              value={form.yearsOfExperience}
              onChange={handleChange}
              placeholder="e.g. 3"
              required
            />
          </div>
        )}
      </fieldset>
      )}

      </div>
      )}

      {step === 2 && (
      <div className={styles.stepPane}>
      {/* ── DELIVERY EXPERIENCE ── */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Delivery experience</legend>
        <div className={styles.grid2}>
          <SelectField
            label="Do you have any experience with multi-drop deliveries?"
            name="multiDropExperience"
            value={form.multiDropExperience}
            onChange={handleChange}
            required
            options={[
              ['YES', 'Yes'],
              ['NO', 'No'],
            ]}
          />
        </div>

        {form.multiDropExperience === 'YES' && (
          <>
            <div className={styles.grid2}>
              <Field
                label="Company"
                name="multiDropCompany"
                value={form.multiDropCompany}
                onChange={handleChange}
                placeholder="e.g. DHL, Amazon, DPD"
                required
              />
              <Field
                label="Time of experience"
                name="multiDropExperienceLength"
                value={form.multiDropExperienceLength}
                onChange={handleChange}
                placeholder="e.g. 8 months, 2 years"
                required
              />
            </div>
            <div className={styles.grid1}>
              <Textarea
                label="Notes"
                name="multiDropNotes"
                value={form.multiDropNotes}
                onChange={handleChange}
                placeholder="Tell us about routes, number of stops per day, parcels, apps used or delivery areas."
                full
              />
            </div>
          </>
        )}
      </fieldset>

      {/* ── INSURANCE WARNING ── */}
      {insuranceWarning && (
        <div className={`${styles.status} ${styles.statusWarning}`} role="note">
          <strong>Note — Insurance Exception:</strong> Van and motorbike candidates under 25
          or with less than 1 year of driving experience may require a specialist insurance quote before proceeding.
          Your application will still be reviewed and our team will contact you within 24 hours.
        </div>
      )}

      </div>
      )}

      {step === 3 && (
      <div className={styles.stepPane}>
      {/* ── BA APPLICATION FORM DECLARATION / E-SIGNATURE ── */}
      <section className={styles.docPanel} aria-labelledby="caa-declaration-title">
        <header className={styles.docHeader}>
          <div className={styles.docRef}>
            <span>BA Application Form</span>
            <span className={styles.docRefCode}>{DECLARATION_VERSION}</span>
          </div>
          <h3 id="caa-declaration-title" className={styles.docTitle}>
            CAA Security Declaration
          </h3>
          <p className={styles.declarationIntro}>
            Read each clause below and tick every box to accept each permission individually.
            Your ticked boxes count as your electronic signature of the BA Application Form —
            no paper or emailed copy needs to be signed.
          </p>
        </header>

        <div className={styles.progressTrack} role="presentation">
          {DECLARATION_STATEMENTS.map((statement, index) => (
            <span
              key={statement}
              className={`${styles.progressSegment} ${acceptedStatements[index] ? styles.progressSegmentDone : ''}`}
            />
          ))}
        </div>
        <p className={styles.statementProgress} aria-live="polite">
          {acceptedCount === DECLARATION_STATEMENTS.length
            ? 'All permissions accepted — ready to sign'
            : `${acceptedCount} of ${DECLARATION_STATEMENTS.length} permissions accepted`}
        </p>

        <div className={styles.statementList}>
          {DECLARATION_STATEMENTS.map((statement, index) => (
            <label
              key={statement}
              className={`${styles.clauseRow} ${acceptedStatements[index] ? styles.clauseRowChecked : ''}`}
            >
              <span className={styles.clauseNumber}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <input
                type="checkbox"
                checked={acceptedStatements[index]}
                onChange={() => toggleStatement(index)}
                className={styles.clauseInput}
              />
              <span className={styles.clauseBox} aria-hidden="true">
                <svg viewBox="0 0 12 10" className={styles.clauseTick}>
                  <path d="M1 5.5 4.2 8.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={styles.clauseText}>{statement}</span>
            </label>
          ))}
        </div>

        <div className={`${styles.signatureContainer} ${signatureConsent && signatureText ? styles.signatureSigned : ''}`}>
          {/* Declaration header */}
          <div className={styles.signatureHeader}>
            <h3 className={styles.signatureTitle}>Sign your application</h3>
            <p className={styles.signatureSubtitle}>
              By typing your name below, you confirm that all information provided is accurate and complete.
              This is your electronic signature under UK law.
            </p>
          </div>

          {/* Consent terms */}
          <fieldset className={styles.signatureTerms}>
            <legend className={styles.termsLegend}>I confirm that:</legend>
            <div className={styles.termsList}>
              <label className={styles.termItem}>
                <input
                  type="checkbox"
                  checked={signatureConsent}
                  onChange={(e) => setSignatureConsent(e.target.checked)}
                  className={styles.termInput}
                />
                <span className={styles.termCheckmark} aria-hidden="true">
                  <svg viewBox="0 0 12 10" className={styles.termTick}>
                    <path d="M1 5.5 4.2 8.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className={styles.termText}>
                  The information I have provided in this application is complete and accurate
                </span>
              </label>
            </div>
          </fieldset>

          {/* Signature input section */}
          <div className={styles.signatureForm}>
            <div className={styles.signatureInputGroup}>
              <label htmlFor="applicationSignature" className={styles.signatureInputLabel}>
                Your full legal name
              </label>
              <input
                id="applicationSignature"
                type="text"
                name="applicationSignature"
                value={form.applicationSignature}
                onChange={handleChange}
                className={styles.signatureTextInput}
                placeholder="E.g. John Michael Smith"
                aria-label="Electronic signature"
                autoComplete="name"
                maxLength={80}
              />
              <p className={styles.signatureInputHint}>
                {signatureText
                  ? `Signed as "${signatureText}" on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : 'Type your full name exactly as it appears on your official documents.'}
              </p>
            </div>

            {/* Signed confirmation */}
            {signatureConsent && signatureText && (
              <div className={styles.signatureConfirmation} role="status" aria-live="polite">
                <svg className={styles.confirmationIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div className={styles.confirmationText}>
                  <div className={styles.confirmationStatus}>Application signed</div>
                  <div className={styles.confirmationDate}>
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at{' '}
                    {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      </div>
      )}

      <div className={styles.formNav}>
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            disabled={loading}
            className={styles.submitSecondary}
          >
            Back
          </button>
        )}
        {step < LAST_STEP_INDEX ? (
          <button
            type="button"
            onClick={goNext}
            disabled={loading}
            className={styles.submit}
          >
            Continue
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className={styles.submit}
          >
            {loading ? 'Submitting…' : 'Sign & submit application'}
          </button>
        )}
      </div>
    </form>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  type = 'text',
  full = false,
  required = false,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  type?: string;
  full?: boolean;
  required?: boolean;
  placeholder?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <label className={styles.label} htmlFor={name}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={styles.input}
        autoComplete="off"
      />
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

function Textarea({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder,
  full = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <div className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <label className={styles.label} htmlFor={name}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        className={styles.textarea}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<[string, string]>;
  required?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={name}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        className={styles.select}
      >
        <option value="">— select —</option>
        {options.map(([optValue, optLabel]) => (
          <option key={optValue} value={optValue}>
            {optLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
