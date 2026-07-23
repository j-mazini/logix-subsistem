'use client';

import { useAuth } from '../shims/AuthContext';
import { db } from '../shims/firebase';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from '../shims/firestore';
import { useRouter } from '../shims/navigation';
import { useEffect, useState } from 'react';
import { AdminNavbar } from '../components/admin/AdminNavbar';
import { useAdminCandidate } from '../components/admin/AdminCandidateContext';
import styles from './page.module.css';
import { AssessmentPanel } from './AssessmentPanel';
import { AssessmentResult } from './AssessmentResult';

// ─────────────────────────────────────────────────────────────────────────────
// External assessment panel.
//
// The full interview workflow (record, scoring, red flags, decision, documents)
// now lives in the checklist's interview section. This standalone page is scoped
// to a single job: release the candidate's online knowledge test and show the
// graded result.
// ─────────────────────────────────────────────────────────────────────────────

interface IvCandidate {
  id: string;
  rawId: string;
  name: string;
  email: string;
  phone: string;
  source: 'drivers' | 'legacy-vendors';
  status: string;
  assessmentToken: string;
  updatedAt: string;
}

function readToken(data: DocumentData): string {
  if (typeof data.assessmentToken === 'string' && data.assessmentToken) return data.assessmentToken;
  if (typeof data.interview?.assessmentToken === 'string' && data.interview.assessmentToken)
    return data.interview.assessmentToken;
  if (typeof data.assessment?.token === 'string' && data.assessment.token) return data.assessment.token;
  return '';
}

function toIso(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date(0).toISOString();
}

function mapDriverDoc(id: string, data: DocumentData): IvCandidate {
  const pi = data.personalInfo ?? {};
  return {
    id: `driver-${id}`,
    rawId: id,
    name: pi.fullName ?? data.fullName ?? 'Unnamed candidate',
    email: pi.email ?? data.email ?? '',
    phone: pi.phone ?? data.phone ?? '',
    source: 'drivers',
    status: (data.currentStatus ?? data.status ?? 'PRE_REGISTERED') as string,
    assessmentToken: readToken(data),
    updatedAt: toIso(data.updatedAt ?? data.createdAt),
  };
}

function mapLegacyDoc(id: string, data: DocumentData): IvCandidate {
  return {
    id: `legacy-${id}`,
    rawId: id,
    name: data.name ?? data.fullName ?? 'Unnamed candidate',
    email: data.email ?? '',
    phone: data.phone ?? '',
    source: 'legacy-vendors',
    status: (data.status ?? 'active') as string,
    assessmentToken: readToken(data),
    updatedAt: toIso(data.updatedAt ?? data.createdAt),
  };
}

export default function AdminInterviewAssessmentPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<IvCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const selected = candidates.find((c) => c.id === selectedId) ?? candidates[0] ?? null;

  // Preselect the candidate passed by the checklist interview link.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search || (window.location.hash.split('?')[1] ?? '')).get('candidate');
    if (p) setSelectedId(p);
  }, []);

  // ── navbar applicant select sync ──────────────────────────────────────────

  const { selectedId: navCandidateId, setSelectedId: setNavCandidateId } = useAdminCandidate();

  // The navbar select drives which applicant this page shows.
  useEffect(() => {
    if (navCandidateId) setSelectedId(navCandidateId);
  }, [navCandidateId]);

  // Reflect the resolved candidate (e.g. default first row) back into the navbar.
  useEffect(() => {
    if (selected && selected.id !== navCandidateId) setNavCandidateId(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) router.replace('/vetting');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    setDataLoading(true);
    let dL = false,
      lL = false;
    let dRows: IvCandidate[] = [],
      lRows: IvCandidate[] = [];

    const publish = () => {
      if (!dL || !lL) return;
      const rows = [...dRows, ...lRows].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setCandidates(rows);
      setSelectedId((cur) => (cur && rows.some((r) => r.id === cur) ? cur : rows[0]?.id ?? null));
      setDataLoading(false);
    };

    const u1 = onSnapshot(
      collection(db, 'drivers'),
      (s) => {
        dRows = s.docs.map((d) => mapDriverDoc(d.id, d.data()));
        dL = true;
        publish();
      },
      (e) => {
        dL = true;
        setDataError(e.message);
        setDataLoading(false);
      },
    );

    const u2 = onSnapshot(
      collection(db, 'workspaces', 'ba-express-vetting', 'vendors'),
      (s) => {
        lRows = s.docs.map((d) => mapLegacyDoc(d.id, d.data()));
        lL = true;
        publish();
      },
      (e) => {
        lL = true;
        setDataError(e.message);
        setDataLoading(false);
      },
    );

    return () => {
      u1();
      u2();
    };
  }, [loading, isAuthenticated]);

  // Persist the released/reset assessment token onto the candidate document.
  const persistToken = async (candidate: IvCandidate, token: string) => {
    const ref =
      candidate.source === 'drivers'
        ? doc(db, 'drivers', candidate.rawId)
        : doc(db, 'workspaces', 'ba-express-vetting', 'vendors', candidate.rawId);
    const payload = {
      assessmentToken: token,
      'interview.assessmentToken': token,
      ...(candidate.source === 'drivers' ? { updatedAt: serverTimestamp() } : { updatedAt: Date.now() }),
    };
    // optimistic update so the UI reflects the change immediately
    setCandidates((cur) =>
      cur.map((c) => (c.id === candidate.id ? { ...c, assessmentToken: token } : c)),
    );
    try {
      await updateDoc(ref, payload);
      setDataError(null);
    } catch (e) {
      setDataError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  if (loading || dataLoading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <AdminNavbar />

      <main className={styles.content}>
        <div className={styles.eyebrow}>
          <div className={styles.eyebrowLine} />
          <span className={styles.eyebrowText}>Online Knowledge Test</span>
        </div>
        <h1 className={styles.title}>
          Candidate <span className={styles.titleAccent}>Test</span>
        </h1>

        {dataError && <div className={styles.errorBanner}>Error: {dataError}</div>}

        <div className={styles.workspace}>
          <section className={styles.ivPanel}>
            {!selected ? (
              <div className={styles.emptyPanel}>No candidates available.</div>
            ) : (
              <>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelKicker}>Candidate</p>
                    <h2 className={styles.panelTitle}>{selected.name}</h2>
                    <p className={styles.panelSub}>
                      {[selected.email, selected.phone].filter(Boolean).join(' · ')} · status{' '}
                      {selected.status}
                    </p>
                  </div>
                </div>

                <div className={styles.tabBody}>
                  <AssessmentPanel
                    driverId={selected.rawId}
                    driverSource={selected.source}
                    candidateName={selected.name}
                    token={selected.assessmentToken}
                    onReleased={(token) => persistToken(selected, token)}
                    onReset={() => persistToken(selected, '')}
                  />

                  <div className={styles.sep}>Result</div>
                  <AssessmentResult token={selected.assessmentToken} />
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
