'use client';

import { db } from '../shims/firebase';
import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from '../shims/firestore';
import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { ASSESSMENT_BANK_ID, releaseQuestions } from './assessment-bank';
import { answeredCount, newAssessmentToken, type AssessmentDoc } from './assessment-types';

interface AssessmentPanelProps {
  driverId: string;
  driverSource: 'drivers' | 'legacy-vendors';
  candidateName: string;
  token: string;
  onReleased: (token: string) => void;
  onReset: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  released: 'Released — awaiting start',
  in_progress: 'In progress',
  completed: 'Completed',
};

export function AssessmentPanel({
  driverId,
  driverSource,
  candidateName,
  token,
  onReleased,
  onReset,
}: AssessmentPanelProps) {
  const [data, setData] = useState<AssessmentDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Live subscription to the candidate's assessment.
  useEffect(() => {
    if (!token) {
      setData(null);
      setMissing(false);
      return;
    }
    const ref = doc(db, 'assessments', token);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setData(null);
          setMissing(true);
          return;
        }
        setMissing(false);
        setData(snap.data() as AssessmentDoc);
      },
      (e) => setErr(e.message),
    );
    return () => unsub();
  }, [token]);

  // Note: the score is computed live admin-side (see `score` below) and is never
  // persisted to the assessment doc — that doc is candidate-readable via the
  // capability token, so storing the score there would leak it to the candidate.

  const release = async () => {
    setBusy(true);
    setErr(null);
    try {
      const newToken = newAssessmentToken();
      const questions = releaseQuestions();
      await setDoc(doc(db, 'assessments', newToken), {
        token: newToken,
        driver: { id: driverId, source: driverSource },
        candidateName,
        bankId: ASSESSMENT_BANK_ID,
        questions,
        totalQuestions: questions.length,
        status: 'released',
        answers: {},
        currentIndex: 0,
        releasedAt: serverTimestamp(),
      });
      onReleased(newToken);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to release test');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!token) return;
    if (!window.confirm('Reset this test? The candidate link will stop working and all progress will be cleared.')) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteDoc(doc(db, 'assessments', token));
      onReset();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to reset test');
    } finally {
      setBusy(false);
    }
  };

  const link =
    typeof window !== 'undefined' && token ? `${window.location.origin}/assessment/${token}` : '';

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — user can copy manually */
    }
  };

  // ── not released yet ────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div>
        <h3 className={styles.secH}>Candidate Assessment</h3>
        <p className={styles.secSub}>
          Release a multiple-choice driver knowledge test. The candidate opens a private link and answers
          the questions; the graded score and answer review appear in the checklist interview section.
        </p>
        {err && <div className={styles.docWarn}>{err}</div>}
        <button className={styles.assessReleaseBtn} onClick={release} disabled={busy}>
          {busy ? 'Releasing…' : 'Release test to candidate'}
        </button>
      </div>
    );
  }

  const answered = answeredCount(data?.answers);
  const total = data?.totalQuestions ?? releaseQuestions().length;
  const pct = total ? Math.round((answered / total) * 100) : 0;
  const status = data?.status ?? 'released';

  return (
    <div>
      <h3 className={styles.secH}>Candidate Assessment</h3>
      <p className={styles.secSub}>
        Share the private link below with {candidateName || 'the candidate'}. Progress updates live.
      </p>
      {err && <div className={styles.docWarn}>{err}</div>}
      {missing && (
        <div className={styles.docWarn}>
          This assessment no longer exists in the database. Reset to release a new one.
        </div>
      )}

      <div className={styles.assessLinkRow}>
        <input className={styles.assessLinkInput} readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
        <button className={styles.assessCopyBtn} onClick={copyLink}>
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
      </div>

      <div className={styles.assessStatusRow}>
        <span className={`${styles.assessStatusBadge} ${styles[`assess_${status}`]}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
        <span className={styles.assessProgressText}>
          {answered}/{total} answered
        </span>
      </div>
      <div className={styles.assessProgressBar}>
        <div className={styles.assessProgressFill} style={{ width: `${pct}%` }} />
      </div>

      {status === 'completed' && (
        <p className={styles.secSub}>
          ✓ Test completed. The graded score and answer review are in the checklist interview section.
        </p>
      )}

      <button className={styles.assessResetBtn} onClick={reset} disabled={busy}>
        {busy ? 'Working…' : 'Reset / re-release'}
      </button>
    </div>
  );
}
