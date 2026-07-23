'use client';

import { useAuth } from '../shims/AuthContext';
import { db } from '../shims/firebase';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '../shims/firestore';
import Link from '../shims/link';
import { useRouter } from '../shims/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminNavbar } from '../components/admin/AdminNavbar';
import { STAGES, mapDriverDoc, mapLegacyVendorDoc, type Candidate, type Stage } from './data/candidates';
import { PreRegistrationForm } from '../components/vetting/PreRegistrationForm';
import styles from './page.module.css';

const STAGE_BADGE: Record<Stage, string> = {
  Application: styles.stagePreRegistered,
  'Pre-screen': styles.stagePreScreen,
  Interview: styles.stageInterview,
  Suitability: styles.stageDhl,
  Documents: styles.stageDhl,
  'Vetting checks': styles.stageDhl,
  'DHL submission': styles.stageDhl,
  'Van hire': styles.stageDhl,
  Training: styles.stageDhl,
  Active: styles.stageApproved,
  'On hold': styles.stageOnHold,
  Rejected: styles.stageRejected,
};

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type ActionType = 'reopen' | 'delete';

export default function AdminVettingPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<Stage | 'All'>('All');

  const [showNewModal, setShowNewModal] = useState(false);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setLinkEmail('');
    setGeneratedLink('');
    setLinkError(null);
    setLinkCopied(false);
  };

  const handleGenerateLink = async () => {
    const email = linkEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLinkError('Enter a valid e-mail address.');
      return;
    }
    setGeneratingLink(true);
    setLinkError(null);
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const code = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      await setDoc(doc(db, 'invitationLinks', code), {
        code,
        email,
        used: false,
        usedAt: null,
        createdAt: Date.now(),
        createdBy: user?.email ?? 'admin',
        status: 'pending',
      });
      setGeneratedLink(`${window.location.origin}/vetting/register?invite=${code}`);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Unable to create the access link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const [actionModal, setActionModal] = useState<{ candidate: Candidate; action: ActionType } | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) router.replace('/vetting');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    setDataLoading(true);
    let driversLoaded = false;
    let legacyLoaded = false;
    let driverRows: Candidate[] = [];
    let legacyRows: Candidate[] = [];

    const publish = () => {
      if (!driversLoaded || !legacyLoaded) return;
      setCandidates(
        [...driverRows, ...legacyRows].sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        ),
      );
      setDataError(null);
      setDataLoading(false);
    };

    const unsubDrivers = onSnapshot(
      collection(db, 'drivers'),
      (snap) => {
        driverRows = snap.docs.map((d) => mapDriverDoc(d.id, d.data()));
        driversLoaded = true;
        publish();
      },
      (err) => {
        driversLoaded = true;
        setDataError(`drivers: ${err.message}`);
        setDataLoading(false);
      },
    );

    const unsubLegacy = onSnapshot(
      collection(db, 'workspaces', 'ba-express-vetting', 'vendors'),
      (snap) => {
        legacyRows = snap.docs.map((d) => mapLegacyVendorDoc(d.id, d.data()));
        legacyLoaded = true;
        publish();
      },
      (err) => {
        legacyLoaded = true;
        setDataError(`vendors: ${err.message}`);
        setDataLoading(false);
      },
    );

    return () => {
      unsubDrivers();
      unsubLegacy();
    };
  }, [loading, isAuthenticated]);

  const handleDecision = async () => {
    if (!actionModal) return;
    setSavingAction(true);
    const { candidate, action } = actionModal;

    try {
      if (candidate.source === 'drivers') {
        const statusMap: Record<string, string> = {
          reopen: 'PRE_REGISTERED',
        };
        if (action === 'delete') {
          await deleteDoc(doc(db, 'drivers', candidate.id));
        } else {
          await updateDoc(doc(db, 'drivers', candidate.id), {
            currentStatus: statusMap[action],
            statusUpdatedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        const rawId = candidate.id.replace(/^legacy-/, '');
        const statusMap: Record<string, string> = {
          reopen: 'active',
        };
        if (action === 'delete') {
          await deleteDoc(doc(db, 'workspaces', 'ba-express-vetting', 'vendors', rawId));
        } else {
          await updateDoc(doc(db, 'workspaces', 'ba-express-vetting', 'vendors', rawId), {
            status: statusMap[action],
            updatedAt: Date.now(),
          });
        }
      }
      setActionModal(null);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setSavingAction(false);
    }
  };

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (stageFilter !== 'All' && c.stage !== stageFilter) return false;
      const q = search.trim().toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q) && !c.phone.includes(q))
        return false;
      return true;
    });
  }, [candidates, stageFilter, search]);

  const stats = useMemo(() => ({
    total: candidates.length,
    inProgress: candidates.filter(
      (c) => c.stage !== 'Active' && c.stage !== 'Rejected' && c.stage !== 'On hold',
    ).length,
    onHold: candidates.filter((c) => c.stage === 'On hold').length,
    approved: candidates.filter((c) => c.stage === 'Active').length,
    rejected: candidates.filter((c) => c.stage === 'Rejected').length,
  }), [candidates]);

  const stageCounts = useMemo(() => {
    const counts: Partial<Record<Stage, number>> = {};
    for (const c of candidates) {
      counts[c.stage] = (counts[c.stage] ?? 0) + 1;
    }
    return counts;
  }, [candidates]);

  if (loading || dataLoading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
      </div>
    );
  }

  const isTerminal = (c: Candidate) => c.stage === 'Active' || c.stage === 'Rejected';

  return (
    <div className={styles.page}>
      <AdminNavbar />

      <main className={styles.content}>
        <div className={styles.eyebrow}>
          <div className={styles.eyebrowLine} />
          <span className={styles.eyebrowText}>Driver Vetting Pipeline</span>
        </div>
        <h1 className={styles.title}>
          Admin <span className={styles.titleAccent}>Vetting</span>
        </h1>

        <section className={styles.statsGrid}>
          <button
            className={`${styles.statCard} ${stageFilter === 'All' ? styles.statCardActive : ''}`}
            onClick={() => setStageFilter('All')}
          >
            <p className={styles.statValue}>{stats.total}</p>
            <p className={styles.statLabel}>All vendors</p>
          </button>
          <button
            className={`${styles.statCard} ${styles.statCardClickable}`}
            onClick={() => setStageFilter('All')}
          >
            <p className={`${styles.statValue} ${styles.statAmber}`}>{stats.inProgress}</p>
            <p className={styles.statLabel}>In progress</p>
          </button>
          <button
            className={`${styles.statCard} ${stageFilter === 'Active' ? styles.statCardActive : ''}`}
            onClick={() => setStageFilter('Active')}
          >
            <p className={`${styles.statValue} ${styles.statSuccess}`}>{stats.approved}</p>
            <p className={styles.statLabel}>Approved</p>
          </button>
          <button
            className={`${styles.statCard} ${stageFilter === 'Rejected' ? styles.statCardActive : ''}`}
            onClick={() => setStageFilter('Rejected')}
          >
            <p className={`${styles.statValue} ${styles.statDanger}`}>{stats.rejected}</p>
            <p className={styles.statLabel}>Rejected</p>
          </button>
        </section>

        {dataError && <div className={styles.errorBanner}>{dataError}</div>}

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <button
              className={`${styles.filterButton} ${stageFilter === 'All' ? styles.filterButtonActive : ''}`}
              onClick={() => setStageFilter('All')}
            >
              All
            </button>
            {STAGES.map((stage) => (
              <button
                key={stage}
                className={`${styles.filterButton} ${stageFilter === stage ? styles.filterButtonActive : ''}`}
                onClick={() => setStageFilter(stage)}
              >
                {stage}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <button className={styles.accessLinkButton} onClick={() => setShowLinkModal(true)}>
            Access link
          </button>
          <button className={styles.newVendorButton} onClick={() => setShowNewModal(true)}>
            + New vendor
          </button>
        </div>

        <div className={styles.tableShell}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeadRow}>
                <th className={styles.tableHeading}>Candidate</th>
                <th className={`${styles.tableHeading} ${styles.tableHeadingHidden}`}>Phone</th>
                <th className={styles.tableHeading}>Stage</th>
                <th className={`${styles.tableHeading} ${styles.tableHeadingHidden}`}>Submitted</th>
                <th className={styles.tableHeading}>SLA</th>
                <th className={styles.tableHeading}>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    No candidates found
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      <div className={styles.candidate}>
                        <span className={styles.initials}>{initials(c.name)}</span>
                        <div>
                          <p className={styles.candidateName}>{c.name}</p>
                          <p className={styles.candidateEmailMobile}>{c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${styles.tableCell} ${styles.tableCellHidden}`}>
                      <span className={styles.contactPhone}>{c.phone || '—'}</span>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.badge} ${STAGE_BADGE[c.stage]}`}>{c.stage}</span>
                    </td>
                    <td className={`${styles.tableCell} ${styles.tableCellHidden}`}>
                      <span className={styles.dateCell}>{fmtDate(c.submittedAt)}</span>
                    </td>
                    <td className={styles.tableCell}>
                      {isTerminal(c) ? (
                        <span className={styles.slaOk}>—</span>
                      ) : c.slaBreached ? (
                        <span className={styles.slaBreached}>
                          <span className={styles.slaDotDanger} />
                          {c.daysInStage}d
                        </span>
                      ) : (
                        <span className={styles.slaNormal}>
                          <span className={styles.slaDotOk} />
                          {c.daysInStage}d
                        </span>
                      )}
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actionsCell}>
                        <Link
                          href={`/vetting-checklist?candidate=${c.source === 'drivers' ? `driver-${c.id}` : c.id}`}
                          className={styles.viewButton}
                        >
                          Checklist
                        </Link>
                        {(c.stage === 'Active' || c.stage === 'Rejected') && (
                          <button
                            className={styles.actionReopen}
                            onClick={() => setActionModal({ candidate: c, action: 'reopen' })}
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          className={styles.actionDelete}
                          onClick={() => setActionModal({ candidate: c, action: 'delete' })}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.overviewHeader}>
          <div className={styles.overviewLine} />
          <span className={styles.overviewTitle}>Stage breakdown</span>
        </div>
        <div className={styles.stageGrid}>
          {STAGES.map((stage) => {
            const count = stageCounts[stage] ?? 0;
            return (
              <button
                key={stage}
                className={styles.stageCard}
                onClick={() => setStageFilter(stage)}
              >
                <p className={styles.stageCardLabel}>{stage}</p>
                <p className={styles.stageCardValue}>{count}</p>
                {stage !== 'Active' && stage !== 'Rejected' && count > 0 && (
                  <p className={styles.stageCardWarning}>{count} pending</p>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* ── Single-use access link modal ── */}
      {showLinkModal && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => e.target === e.currentTarget && closeLinkModal()}
        >
          <div className={styles.confirmModal}>
            <div className={styles.modalActions}>
              <h2 className={styles.modalTitle}>Single-use access link</h2>
              <button className={styles.modalCancel} onClick={closeLinkModal}>
                Close
              </button>
            </div>
            <p className={styles.confirmText}>
              Generate a one-time link to the application form for a specific applicant.
              Send it by e-mail — the link is tied to the address below.
            </p>

            {linkError && <div className={styles.errorBanner}>{linkError}</div>}

            {generatedLink ? (
              <div className={styles.linkResult}>
                <span className={styles.linkResultLabel}>Link for {linkEmail.trim().toLowerCase()}</span>
                <code className={styles.linkResultUrl}>{generatedLink}</code>
                <button
                  className={styles.copyLinkButton}
                  onClick={async () => {
                    await navigator.clipboard.writeText(generatedLink);
                    setLinkCopied(true);
                  }}
                >
                  {linkCopied ? '✓ Link copied' : 'Copy link'}
                </button>
              </div>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="applicant@email.com"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  className={styles.linkInput}
                  disabled={generatingLink}
                />
                <div className={styles.modalActions}>
                  <button
                    className={styles.confirmReopen}
                    onClick={handleGenerateLink}
                    disabled={generatingLink || !linkEmail.trim()}
                  >
                    {generatingLink ? 'Generating…' : 'Generate link'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── New vendor modal ── */}
      {showNewModal && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => e.target === e.currentTarget && setShowNewModal(false)}
        >
          <div className={styles.modal} ref={modalRef}>
            <div className={styles.modalActions}>
              <h2 className={styles.modalTitle}>Register driver application</h2>
              <button className={styles.modalCancel} onClick={() => setShowNewModal(false)}>
                Close
              </button>
            </div>
            <p className={styles.modalSub}>
              Complete the same application form drivers use. Submitting creates the candidate record and sends the e-signature request.
            </p>
            <PreRegistrationForm />
          </div>
        </div>
      )}

      {/* ── Action confirmation modal ── */}
      {actionModal && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => e.target === e.currentTarget && setActionModal(null)}
        >
          <div className={styles.confirmModal}>
            <h2 className={styles.modalTitle}>
              {actionModal.action === 'reopen' && 'Reopen case'}
              {actionModal.action === 'delete' && 'Delete case'}
            </h2>
            <p className={styles.confirmText}>
              {actionModal.action === 'reopen' &&
                `Reopen the case for "${actionModal.candidate.name}"? Their stage will be reset to Application.`}
              {actionModal.action === 'delete' &&
                `Permanently delete the vetting case for "${actionModal.candidate.name}"? This cannot be undone.`}
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setActionModal(null)} disabled={savingAction}>
                Cancel
              </button>
              <button
                className={
                  actionModal.action === 'reopen'
                    ? styles.confirmReopen
                    : styles.confirmReject
                }
                onClick={handleDecision}
                disabled={savingAction}
              >
                {savingAction
                  ? 'Saving…'
                  : actionModal.action === 'reopen'
                  ? 'Reopen'
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
