'use client';

import { useCallback, useMemo, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import './styles/vetting-checklist.css';
import { CHECKLIST_STEPS } from './checklist/data/checklist';

// Types from ba-express-vetting
interface ChecklistCandidate {
  id: string;
  rawId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  dob: string;
  nin: string;
  postcode: string;
  address: string;
  nationality: string;
  checks: boolean[];
  stepApprovals: boolean[];
  stepRejections: boolean[];
  stepApprovalMeta: Array<{ approvedAt: number; approvedBy: string } | null>;
  stepRejectionMeta: Array<{ rejectedAt: number; rejectedBy: string } | null>;
  applicationRejected: boolean;
  applicationOnHold: boolean;
  applicationHoldReason: string;
  caseNotes: string;
  checklistDocs: Record<string, unknown>;
  status: string;
  updatedAt: string;
  source: 'drivers' | 'legacy-vendors';
  automatedChecks: boolean[];
  interview: any;
  suitability: string;
  firstAccessTemporaryPassword: string;
  owner?: string;
  depot?: string;
  employment?: string;
  startDate?: string;
  category?: string;
  driveFolderUrl?: string;
  applicationRejectionInternalNotes?: string;
}


// Mock candidates for demo
const MOCK_CANDIDATES: ChecklistCandidate[] = [
  {
    id: 'candidate-1',
    rawId: 'raw-1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+44 20 7946 0958',
    role: 'Bike Courier',
    dob: '1990-05-15',
    nin: 'AB123456C',
    postcode: 'SW1A 1AA',
    address: '10 Downing Street, London',
    nationality: 'British',
    checks: Array(50).fill(false),
    stepApprovals: Array(4).fill(false),
    stepRejections: Array(4).fill(false),
    stepApprovalMeta: Array(4).fill(null),
    stepRejectionMeta: Array(4).fill(null),
    applicationRejected: false,
    applicationOnHold: false,
    applicationHoldReason: '',
    caseNotes: '',
    checklistDocs: {},
    status: 'PRE_REGISTERED',
    updatedAt: new Date().toISOString(),
    source: 'drivers',
    automatedChecks: Array(50).fill(false),
    interview: {},
    suitability: '',
    firstAccessTemporaryPassword: '',
  },
];

export function VettingChecklist() {
  const [candidates, setCandidates] = useState<ChecklistCandidate[]>(MOCK_CANDIDATES);
  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.id ?? null);
  const [openStepBlocks, setOpenStepBlocks] = useState<Record<number, boolean>>({});

  const selected = useMemo(
    () => candidates.find((c) => c.id === selectedId) ?? candidates[0] ?? null,
    [candidates, selectedId],
  );

  const handleToggleCheck = useCallback((globalIndex: number) => {
    if (!selected) return;
    const nextChecks = [...selected.checks];
    nextChecks[globalIndex] = !nextChecks[globalIndex];
    setCandidates((cur) =>
      cur.map((c) => (c.id === selected.id ? { ...c, checks: nextChecks } : c)),
    );
  }, [selected]);

  const handleApproveStep = useCallback((stepIndex: number) => {
    if (!selected) return;
    const nextApprovals = [...selected.stepApprovals];
    nextApprovals[stepIndex] = true;
    const nextMeta = [...selected.stepApprovalMeta];
    nextMeta[stepIndex] = {
      approvedAt: Date.now(),
      approvedBy: 'Current User',
    };
    const nextRejections = [...selected.stepRejections];
    nextRejections[stepIndex] = false;

    setCandidates((cur) =>
      cur.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              stepApprovals: nextApprovals,
              stepApprovalMeta: nextMeta,
              stepRejections: nextRejections,
            }
          : c,
      ),
    );
  }, [selected]);

  const handleRejectStep = useCallback((stepIndex: number) => {
    if (!selected) return;
    const nextRejections = [...selected.stepRejections];
    nextRejections[stepIndex] = true;
    const nextRejectionMeta = [...selected.stepRejectionMeta];
    nextRejectionMeta[stepIndex] = {
      rejectedAt: Date.now(),
      rejectedBy: 'Current User',
    };

    setCandidates((cur) =>
      cur.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              stepRejections: nextRejections,
              stepRejectionMeta: nextRejectionMeta,
            }
          : c,
      ),
    );
  }, [selected]);

  const toggleStepBlock = useCallback((idx: number) => {
    setOpenStepBlocks((current) => ({
      ...current,
      [idx]: !current[idx],
    }));
  }, []);

  const stepSummaries = useMemo(() => {
    if (!selected) return [];
    let offset = 0;
    return CHECKLIST_STEPS.map((step, idx) => {
      const start = offset;
      const end = start + step.items.length;
      offset = end;
      const checks = selected.checks.slice(start, end);
      const visibleItems = step.items.filter((item) => !item.hidden);
      const done = visibleItems.filter((_, itemIndex) => checks[itemIndex]).length;

      return {
        idx,
        step,
        start,
        checks,
        done,
        total: visibleItems.length,
        isApproved: selected.stepApprovals[idx] ?? false,
        isRejected: selected.stepRejections[idx] ?? false,
        approvalMeta: selected.stepApprovalMeta[idx] ?? null,
        rejectionMeta: selected.stepRejectionMeta[idx] ?? null,
      };
    });
  }, [selected]);

  return (
    <PortalLayout mainClassName="vetting-checklist">
      <div className="vetting-checklist-page">
        <header className="vetting-checklist-header">
          <h1>Vetting Checklist</h1>
          <p className="vetting-checklist-subtitle">BA Express Driver Vetting Process</p>
        </header>

        {!selected ? (
          <div className="vetting-empty">No checklist data available yet.</div>
        ) : (
          <main className="vetting-checklist-main">
            <section className="vetting-checklist-panel">
              <div className="vetting-panel-header">
                <div>
                  <p className="vetting-panel-label">Selected candidate</p>
                  <h2 className="vetting-panel-name">{selected.name}</h2>
                  <p className="vetting-panel-meta">
                    {selected.email} · Status: {selected.status}
                  </p>
                </div>
              </div>

              <div className="vetting-checklist-steps">
                {stepSummaries.map(({ idx, step, start, checks, done, total, isApproved, isRejected, approvalMeta, rejectionMeta }) => {
                  const isExpanded = openStepBlocks[idx] ?? idx === 0;

                  return (
                    <article key={step.title} className="vetting-step-card">
                      <button
                        type="button"
                        className="vetting-step-header"
                        onClick={() => toggleStepBlock(idx)}
                      >
                        <div className="vetting-step-info">
                          <span className="vetting-step-number">Step {idx + 1}</span>
                          <div>
                            <h3 className="vetting-step-title">{step.title}</h3>
                            <p className="vetting-step-subtitle">{step.subtitle}</p>
                          </div>
                        </div>
                        <div className="vetting-step-progress">
                          <span className="vetting-step-status">
                            {done}/{total}
                          </span>
                          <span className="vetting-step-icon">{isExpanded ? '−' : '+'}</span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="vetting-step-body">
                          <div className="vetting-items-list">
                            {step.items.map((item, itemIdx) => {
                              if (item.hidden) return null;
                              const globalIndex = start + itemIdx;
                              const checked = checks[itemIdx];

                              return (
                                <div key={item.title} className="vetting-item">
                                  <input
                                    type="checkbox"
                                    id={`item-${globalIndex}`}
                                    checked={checked}
                                    onChange={() => handleToggleCheck(globalIndex)}
                                    className="vetting-item-checkbox"
                                  />
                                  <label htmlFor={`item-${globalIndex}`} className="vetting-item-label">
                                    <span className="vetting-item-title">{item.title}</span>
                                    {item.detail && <p className="vetting-item-detail">{item.detail}</p>}
                                    {item.required && <span className="vetting-item-required">Required</span>}
                                  </label>
                                </div>
                              );
                            })}
                          </div>

                          <div className="vetting-step-actions">
                            {isApproved ? (
                              <div className="vetting-step-approved">
                                <span className="vetting-approved-check">✓</span>
                                <div>
                                  <strong>Approved</strong>
                                  {approvalMeta && (
                                    <small>by {approvalMeta.approvedBy}</small>
                                  )}
                                </div>
                              </div>
                            ) : isRejected ? (
                              <div className="vetting-step-rejected">
                                <span className="vetting-rejected-icon">!</span>
                                <div>
                                  <strong>Rejected</strong>
                                  {rejectionMeta && (
                                    <small>by {rejectionMeta.rejectedBy}</small>
                                  )}
                                </div>
                              </div>
                            ) : null}

                            <div className="vetting-step-buttons">
                              <button
                                type="button"
                                className="vetting-btn vetting-btn-reject"
                                onClick={() => handleRejectStep(idx)}
                              >
                                Reject Step {idx + 1}
                              </button>
                              <button
                                type="button"
                                className="vetting-btn vetting-btn-approve"
                                onClick={() => handleApproveStep(idx)}
                              >
                                Approve Step {idx + 1}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="vetting-checklist-sidebar">
              <div className="vetting-candidates-list">
                <h3 className="vetting-candidates-title">Candidates</h3>
                <ul>
                  {candidates.map((candidate) => (
                    <li key={candidate.id}>
                      <button
                        type="button"
                        className={`vetting-candidate-btn ${selected?.id === candidate.id ? 'active' : ''}`}
                        onClick={() => setSelectedId(candidate.id)}
                      >
                        {candidate.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </main>
        )}
      </div>
    </PortalLayout>
  );
}
