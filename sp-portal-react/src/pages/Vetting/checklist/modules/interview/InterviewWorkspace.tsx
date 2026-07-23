import type { ReactNode } from 'react';
import Link from '../../../shims/link';
import styles from '../../page.module.css';
import { AssessmentResult } from '../../../interview/AssessmentResult';
import {
  COMP_ITEMS,
  DOC_ITEMS,
  NEXT_ITEMS,
  PRAC_ITEMS,
  PREP_ITEMS,
  REDFLAG_ITEMS,
  autoInterviewDecision,
  interviewScore,
  type ChecklistInterview,
} from './model';

interface InterviewWorkspaceProps {
  candidateId: string;
  interview: ChecklistInterview;
  activeTab: number;
  onTabChange: (tab: number) => void;
  onTextChange: (field: keyof ChecklistInterview, value: string) => void;
  onTextBlur: () => void;
  onCheck: (field: 'prepChecks' | 'docChecks' | 'redFlags', index: number, checked: boolean) => void;
  onDocExpiry: (index: number, value: string) => void;
  onScore: (group: 'comp' | 'prac', key: string, score: number) => void;
  onNextStep: (index: number, checked: boolean) => void;
  readOnly?: boolean;
}

export function InterviewWorkspace({
  candidateId,
  interview: iv,
  activeTab,
  onTabChange,
  onTextChange,
  onTextBlur,
  onCheck,
  onDocExpiry,
  onScore,
  onNextStep,
  readOnly = false,
}: InterviewWorkspaceProps) {
  const score = interviewScore(iv);
  const auto = autoInterviewDecision(score, iv);
  const prepDone = iv.prepChecks.filter(Boolean).length;
  const docDone = iv.docChecks.filter(Boolean).length;
  const flagCount = iv.redFlags.filter(Boolean).length;
  const scored = [...Object.values(iv.comp), ...Object.values(iv.prac)].filter((value) => Number(value) > 0).length;
  const decisionLabel =
    iv.decision === 'hire-strong'
      ? 'Hire'
      : iv.decision === 'hire-cond'
        ? 'Conditional'
        : iv.decision === 'second'
          ? '2nd IV'
          : iv.decision === 'decline'
            ? 'Decline'
            : '';

  const tabs = [
    { label: 'Prep', badge: `${prepDone}/${PREP_ITEMS.length}`, red: false },
    { label: 'Record', badge: iv.outcome ? iv.outcome.split(' ')[0] : '', red: false },
    { label: 'Scoring', badge: scored ? `${score}/50` : '', red: false },
    { label: 'Documents', badge: `${docDone}/${DOC_ITEMS.length}`, red: false },
    { label: 'Red Flags', badge: flagCount ? `${flagCount} flags` : '', red: flagCount > 0 },
    { label: 'Decision', badge: decisionLabel, red: false },
  ];

  return (
    <div className={styles.interviewBlock}>
      <div className={styles.interviewHead}>
        <div>
          <p className={styles.interviewKicker}>Face-to-Face Interview</p>
          <h3 className={styles.interviewTitle}>Interview workspace</h3>
          <p className={styles.interviewSub}>
            Record notes, score the interview, confirm document sighting and capture the suitability decision.
          </p>
        </div>
        <div className={styles.interviewScore}>
          <span>{score}<small>/50</small></span>
          <Link href={`/vetting-interview?candidate=${candidateId}`} className={styles.interviewLink}>
            Open full panel
          </Link>
        </div>
      </div>

      <div className={styles.interviewTabs}>
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            className={`${styles.interviewTab} ${activeTab === index ? styles.interviewTabActive : ''}`}
            onClick={() => onTabChange(index)}
          >
            {tab.label}
            {tab.badge && (
              <span className={`${styles.interviewBadge} ${tab.red ? styles.interviewBadgeRed : ''}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <fieldset className={`${styles.interviewBody} ${styles.interviewReadOnlyFieldset}`} disabled={readOnly}>
        {activeTab === 0 && (
          <div className={styles.interviewSection}>
            <div className={styles.interviewSectionHead}>Pre-Interview Setup</div>
            <p className={styles.interviewSectionSub}>
              Complete 15 minutes before the interview · {prepDone}/{PREP_ITEMS.length} items ready
            </p>
            <div className={styles.interviewChecks}>
              {PREP_ITEMS.map((item, index) => (
                <label key={item} className={styles.interviewCheck}>
                  <input
                    type="checkbox"
                    checked={iv.prepChecks[index] ?? false}
                    onChange={(e) => onCheck('prepChecks', index, e.target.checked)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <div className={styles.interviewInfo}>
              <strong>Interview Environment</strong>
              Location: Private meeting room or office · Duration: 45-60 min · Attendees: HR Representative + Direct Supervisor · Materials: Water, note-taking materials, evaluation forms
            </div>
            <div className={styles.interviewInfo}>
              <strong>Candidate Confirmation (send 24h before)</strong>
              "Hello [Name], this is a reminder of your interview tomorrow at [time] at [address]. Please bring all original documents from our checklist. The interview will take approximately 1 hour."
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div className={styles.interviewSection}>
            <div className={styles.interviewSectionHead}>Interview Record</div>
            <p className={styles.interviewSectionSub}>Core details and notes for the case file</p>
            <div className={styles.interviewFormGrid}>
              <InterviewField label="Interview date">
                <input type="date" value={iv.date ?? ''} onChange={(e) => onTextChange('date', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
              <InterviewField label="Start time">
                <input type="time" value={iv.startTime ?? ''} onChange={(e) => onTextChange('startTime', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
              <InterviewField label="HR Interviewer">
                <input type="text" placeholder="HR Representative" value={iv.interviewer ?? ''} onChange={(e) => onTextChange('interviewer', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
              <InterviewField label="Direct Supervisor">
                <input type="text" placeholder="Supervisor name" value={iv.supervisorName ?? ''} onChange={(e) => onTextChange('supervisorName', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
              <InterviewField label="Location">
                <input type="text" placeholder="e.g. Birmingham SC" value={iv.location ?? ''} onChange={(e) => onTextChange('location', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
              <InterviewField label="Interview outcome">
                <select value={iv.outcome ?? ''} onChange={(e) => onTextChange('outcome', e.target.value)} onBlur={onTextBlur}>
                  <option value="">- not assessed -</option>
                  <option value="Pass">Pass</option>
                  <option value="Refer - needs follow-up">Refer - needs follow-up</option>
                  <option value="Fail">Fail</option>
                </select>
              </InterviewField>
              <InterviewField label="Interview notes" full>
                <textarea rows={4} placeholder="History discussion, driving experience, explanations given..." value={iv.notes ?? ''} onChange={(e) => onTextChange('notes', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
            </div>
            <div className={styles.interviewSep}>Observations</div>
            <div className={styles.interviewFormGrid}>
              <InterviewField label="Strengths identified" full>
                <textarea rows={2} placeholder="Key strengths observed..." value={iv.strengths ?? ''} onChange={(e) => onTextChange('strengths', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
              <InterviewField label="Areas for development" full>
                <textarea rows={2} placeholder="Gaps or concerns noted..." value={iv.development ?? ''} onChange={(e) => onTextChange('development', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
              <InterviewField label="Questions asked by candidate" full>
                <textarea rows={2} placeholder="Questions raised by the candidate..." value={iv.candidateQuestions ?? ''} onChange={(e) => onTextChange('candidateQuestions', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
              <InterviewField label="Overall impression" full>
                <textarea rows={2} placeholder="General assessment and impression..." value={iv.overall ?? ''} onChange={(e) => onTextChange('overall', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className={styles.interviewSection}>
            <div className={styles.interviewSectionHead}>Core Competencies</div>
            <p className={styles.interviewSectionSub}>Score each 1-5 · 1=Inadequate · 3=Satisfactory · 5=Excellent</p>
            {[...COMP_ITEMS.map((item) => ({ ...item, group: 'comp' as const })), ...PRAC_ITEMS.map((item) => ({ ...item, group: 'prac' as const }))].map((item, index) => {
              const current = iv[item.group][item.k] ?? 0;
              return (
                <div key={item.k} className={styles.scoreRow}>
                  {index === COMP_ITEMS.length && <div className={styles.interviewSep}>Practical Tests - administer during Phase 4</div>}
                  <div className={styles.scoreLabelCol}>
                    <div className={styles.scoreLabel}>{item.label}</div>
                    <div className={styles.scoreDefinition}>{current ? item.desc[current - 1] : ''}</div>
                  </div>
                  <div className={styles.scoreButtons}>
                    {[1, 2, 3, 4, 5].map((scoreValue) => (
                      <button
                        key={scoreValue}
                        type="button"
                        className={`${styles.scoreButton} ${current === scoreValue ? styles.scoreButtonSelected : ''} ${styles[`score${scoreValue}`]}`}
                        onClick={() => onScore(item.group, item.k, scoreValue)}
                      >
                        {scoreValue}
                      </button>
                    ))}
                  </div>
                  <div className={styles.scoreCurrent}>{current || '-'}/5</div>
                </div>
              );
            })}
            <div className={styles.interviewTotalRow}>
              <span>Total Score (max 50)</span>
              <b>{score}/50</b>
            </div>
            <div className={`${styles.interviewDecision} ${styles[auto.className]}`}>{auto.label}</div>

            <div className={styles.interviewSep}>Online knowledge test</div>
            <AssessmentResult token={iv.assessmentToken} />
          </div>
        )}

        {activeTab === 3 && (
          <div className={styles.interviewSection}>
            <div className={styles.interviewSectionHead}>Document Collection</div>
            <p className={styles.interviewSectionSub}>Original + photocopy required · record expiry dates where applicable · {docDone}/{DOC_ITEMS.length} collected</p>
            <div className={styles.interviewChecks}>
              {DOC_ITEMS.map((item, index) => {
                const expiry = iv.docExpiry[index] ?? '';
                const expired = expiry && expiry < new Date().toISOString().slice(0, 10);
                return (
                  <div key={item} className={styles.interviewDocRow}>
                    <label className={styles.interviewCheck}>
                      <input type="checkbox" checked={iv.docChecks[index] ?? false} onChange={(e) => onCheck('docChecks', index, e.target.checked)} />
                      <span>{item}</span>
                    </label>
                    <span className={styles.interviewDocDateLabel}>expiry</span>
                    <input className={`${styles.interviewDocDate} ${expired ? styles.interviewDocExpired : ''}`} type="date" value={expiry ?? ''} onChange={(e) => onDocExpiry(index, e.target.value)} />
                  </div>
                );
              })}
            </div>
            <div className={styles.interviewSep}>Verification Notes</div>
            <InterviewField label="" full>
              <textarea rows={7} placeholder={'ID/Passport: ___ Expiry: ___\nDriving Licence: ___ Expiry: ___\nEndorsements: ___\nDBS Date: ___ Status: ___\nRight to Work: ___\nAny Concerns: ___'} value={iv.docNotes ?? ''} onChange={(e) => onTextChange('docNotes', e.target.value)} onBlur={onTextBlur} />
            </InterviewField>
          </div>
        )}

        {activeTab === 4 && (
          <div className={styles.interviewSection}>
            <div className={styles.interviewSectionHead}>Immediate Concerns {flagCount > 0 && <span className={styles.interviewBadgeRed}>{flagCount} flagged</span>}</div>
            <p className={styles.interviewSectionSub}>Tick any that apply - each is an automatic decline factor</p>
            <div className={styles.interviewChecks}>
              {REDFLAG_ITEMS.map((item, index) => (
                <label key={item} className={styles.interviewCheck}>
                  <input type="checkbox" checked={iv.redFlags[index] ?? false} onChange={(e) => onCheck('redFlags', index, e.target.checked)} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <InterviewField label="Red flag notes" full>
              <textarea rows={3} placeholder="Details on any flags raised..." value={iv.redFlagNotes ?? ''} onChange={(e) => onTextChange('redFlagNotes', e.target.value)} onBlur={onTextBlur} />
            </InterviewField>
          </div>
        )}

        {activeTab === 5 && (
          <div className={styles.interviewSection}>
            <div className={styles.interviewSectionHead}>Scoring Thresholds</div>
            <div className={styles.interviewThresholds}>
              <div className={`${styles.interviewThreshold} ${styles.decisionHire}`}><b>38+</b>Hire - Strong</div>
              <div className={`${styles.interviewThreshold} ${styles.decisionConditional}`}><b>32-37</b>Hire - Conditional</div>
              <div className={`${styles.interviewThreshold} ${styles.decisionSecond}`}><b>28-31</b>Second Interview</div>
              <div className={`${styles.interviewThreshold} ${styles.decisionDecline}`}><b>&lt;28</b>Decline</div>
            </div>
            <div className={styles.interviewTotalRow}>
              <span>Calculated score</span>
              <b>{score}/50</b>
            </div>
            <div className={`${styles.interviewDecision} ${styles[auto.className]}`}>{auto.label}</div>
            <InterviewField label="Formal decision" full>
              <select value={iv.decision ?? ''} onChange={(e) => onTextChange('decision', e.target.value)} onBlur={onTextBlur}>
                <option value="">- not yet decided -</option>
                <option value="hire-strong">HIRE - Strong Candidate (38+ pts)</option>
                <option value="hire-cond">HIRE - Conditional (32-37 pts)</option>
                <option value="second">Second Interview Required (28-31 pts)</option>
                <option value="decline">DECLINE (below 28 pts)</option>
              </select>
            </InterviewField>
            {iv.decision === 'hire-cond' && (
              <InterviewField label="Conditions / requirements" full>
                <textarea rows={3} placeholder="Specify training, probation, or retest requirements..." value={iv.conditions ?? ''} onChange={(e) => onTextChange('conditions', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
            )}
            <div className={styles.interviewSep}>Next Steps</div>
            <div className={styles.interviewChecks}>
              {NEXT_ITEMS.map((item, index) => (
                <label key={item} className={styles.interviewCheck}>
                  <input type="radio" name={`nextSteps-${candidateId}`} checked={iv.nextSteps[index] ?? false} onChange={(e) => onNextStep(index, e.target.checked)} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <div className={styles.interviewFormGrid}>
              <InterviewField label="HR signature">
                <input type="text" placeholder="Name / initials" value={iv.hrSig ?? ''} onChange={(e) => onTextChange('hrSig', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
              <InterviewField label="Supervisor signature">
                <input type="text" placeholder="Name / initials" value={iv.supervisorSig ?? ''} onChange={(e) => onTextChange('supervisorSig', e.target.value)} onBlur={onTextBlur} />
              </InterviewField>
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
}

function InterviewField({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.interviewField} ${full ? styles.interviewFieldFull : ''}`}>
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}
