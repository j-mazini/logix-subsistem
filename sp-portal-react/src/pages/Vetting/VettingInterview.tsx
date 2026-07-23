'use client';

import { useState, useCallback, useMemo } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import './styles/vetting-interview.css';

interface InterviewCandidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  assessmentToken: string;
}

const MOCK_INTERVIEW_CANDIDATES: InterviewCandidate[] = [
  {
    id: 'candidate-1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+44 20 7946 0958',
    status: 'In Interview',
    assessmentToken: 'token-12345',
  },
  {
    id: 'candidate-2',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+44 20 7946 0959',
    status: 'Assessment Complete',
    assessmentToken: 'token-67890',
  },
];

interface AssessmentScore {
  category: string;
  score: number;
  maxScore: number;
}

interface AssessmentData {
  candidateId: string;
  submittedAt: number;
  scores: AssessmentScore[];
  notes: string;
  passed: boolean;
}

export function VettingInterview() {
  const [candidates, setCandidates] = useState<InterviewCandidate[]>(MOCK_INTERVIEW_CANDIDATES);
  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.id ?? null);
  const [assessmentData, setAssessmentData] = useState<Record<string, AssessmentData>>({});
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [selectedNotes, setSelectedNotes] = useState<string>('');

  const selected = useMemo(
    () => candidates.find((c) => c.id === selectedId),
    [candidates, selectedId],
  );

  const handleReleaseTest = useCallback((candidateId: string) => {
    const token = `token-${Math.random().toString(36).substr(2, 9)}`;
    setCandidates((cur) =>
      cur.map((c) => (c.id === candidateId ? { ...c, assessmentToken: token } : c)),
    );
  }, []);

  const handleResetTest = useCallback((candidateId: string) => {
    setCandidates((cur) =>
      cur.map((c) => (c.id === candidateId ? { ...c, assessmentToken: '' } : c)),
    );
    setAssessmentData((cur) => {
      const next = { ...cur };
      delete next[candidateId];
      return next;
    });
  }, []);

  const handleSaveAssessment = useCallback(() => {
    if (!selected) return;
    setAssessmentData((cur) => ({
      ...cur,
      [selected.id]: {
        candidateId: selected.id,
        submittedAt: Date.now(),
        scores: [
          { category: 'Communication', score: selectedScore, maxScore: 10 },
          { category: 'Problem Solving', score: selectedScore, maxScore: 10 },
          { category: 'Technical Knowledge', score: selectedScore, maxScore: 10 },
        ],
        notes: selectedNotes,
        passed: selectedScore >= 7,
      },
    }));
  }, [selected, selectedScore, selectedNotes]);

  const currentAssessment = selected ? assessmentData[selected.id] : null;

  return (
    <PortalLayout mainClassName="vetting-interview">
      <div className="vetting-interview-page">
        <header className="vetting-interview-header">
          <h1>Candidate Assessment</h1>
          <p className="vetting-interview-subtitle">Online Knowledge Test & Interview Management</p>
        </header>

        {!selected ? (
          <div className="vetting-empty">No candidates available.</div>
        ) : (
          <main className="vetting-interview-main">
            <section className="vetting-interview-panel">
              <div className="vetting-panel-header">
                <div>
                  <p className="vetting-panel-label">Candidate</p>
                  <h2 className="vetting-panel-name">{selected.name}</h2>
                  <p className="vetting-panel-meta">
                    {selected.email} · {selected.phone} · Status: {selected.status}
                  </p>
                </div>
              </div>

              <div className="vetting-interview-tabs">
                <div className="vetting-tab-content">
                  <div className="vetting-assessment-section">
                    <h3 className="vetting-section-title">Online Knowledge Test</h3>

                    <div className="vetting-assessment-card">
                      <div className="vetting-assessment-header">
                        <div>
                          <p className="vetting-assessment-label">Test Status</p>
                          <p className="vetting-assessment-status">
                            {selected.assessmentToken ? 'Released' : 'Not released'}
                          </p>
                        </div>
                      </div>

                      <div className="vetting-assessment-actions">
                        {!selected.assessmentToken ? (
                          <button
                            type="button"
                            className="vetting-btn vetting-btn-primary"
                            onClick={() => handleReleaseTest(selected.id)}
                          >
                            Release Test to Candidate
                          </button>
                        ) : (
                          <>
                            <p className="vetting-assessment-token">
                              Token: <code>{selected.assessmentToken}</code>
                            </p>
                            <button
                              type="button"
                              className="vetting-btn vetting-btn-secondary"
                              onClick={() => handleResetTest(selected.id)}
                            >
                              Reset Test
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {currentAssessment && (
                      <div className="vetting-assessment-result">
                        <h4 className="vetting-result-title">Test Result</h4>
                        <div className="vetting-result-scores">
                          {currentAssessment.scores.map((score) => (
                            <div key={score.category} className="vetting-score-row">
                              <span className="vetting-score-category">{score.category}</span>
                              <span className="vetting-score-value">
                                {score.score} / {score.maxScore}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className={`vetting-result-status ${currentAssessment.passed ? 'passed' : 'failed'}`}>
                          {currentAssessment.passed ? '✓ Passed' : '✗ Failed'}
                        </div>
                      </div>
                    )}

                    <div className="vetting-assessment-scoring">
                      <label htmlFor="score" className="vetting-label">
                        Overall Score
                      </label>
                      <input
                        id="score"
                        type="number"
                        min="0"
                        max="10"
                        value={selectedScore}
                        onChange={(e) => setSelectedScore(parseInt(e.target.value))}
                        className="vetting-input"
                      />
                    </div>

                    <div className="vetting-assessment-notes">
                      <label htmlFor="notes" className="vetting-label">
                        Assessment Notes
                      </label>
                      <textarea
                        id="notes"
                        value={selectedNotes}
                        onChange={(e) => setSelectedNotes(e.target.value)}
                        placeholder="Record your observations and feedback..."
                        className="vetting-textarea"
                        rows={4}
                      />
                    </div>

                    <button
                      type="button"
                      className="vetting-btn vetting-btn-save"
                      onClick={handleSaveAssessment}
                    >
                      Save Assessment
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <aside className="vetting-interview-sidebar">
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
                        <small>{candidate.status}</small>
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
