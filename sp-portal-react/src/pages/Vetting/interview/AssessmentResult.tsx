'use client';

import { db } from '../shims/firebase';
import { doc, onSnapshot } from '../shims/firestore';
import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { gradeAssessment, reviewAssessmentAnswers } from './assessment-bank';
import { answeredCount, type AssessmentDoc } from './assessment-types';

/**
 * Admin-only, read-only view of a candidate's online knowledge-test result.
 *
 * Extracted from AssessmentPanel so the external test panel keeps only "send +
 * confirm", while the graded score and answer review live in the checklist's
 * interview section. Grades live (answer key never leaves the admin bundle).
 */
export function AssessmentResult({ token }: { token?: string }) {
  const [data, setData] = useState<AssessmentDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const [activeAnswerIndex, setActiveAnswerIndex] = useState(0);

  useEffect(() => {
    setActiveAnswerIndex(0);
    if (!token) {
      setData(null);
      setMissing(false);
      return;
    }
    const unsub = onSnapshot(doc(db, 'assessments', token), (snap) => {
      if (!snap.exists()) {
        setData(null);
        setMissing(true);
        return;
      }
      setMissing(false);
      setData(snap.data() as AssessmentDoc);
    });
    return () => unsub();
  }, [token]);

  if (!token) {
    return (
      <p className={styles.secSub}>
        No online test released yet. Release it from the external test panel — the score appears here once the candidate finishes.
      </p>
    );
  }

  if (missing) {
    return <div className={styles.docWarn}>This assessment no longer exists in the database.</div>;
  }

  const status = data?.status ?? 'released';
  const answered = answeredCount(data?.answers);
  const total = data?.totalQuestions ?? 0;

  if (status !== 'completed' || !data) {
    return (
      <p className={styles.secSub}>
        Online test {status === 'in_progress' ? 'in progress' : 'released — awaiting the candidate'} · {answered}/{total} answered. The graded result will appear here when the candidate finishes.
      </p>
    );
  }

  const score = gradeAssessment(data.questions, data.answers);
  const answerReview = reviewAssessmentAnswers(data.questions, data.answers);
  const activeIndex = Math.min(activeAnswerIndex, Math.max(0, answerReview.length - 1));
  const activeAnswer = answerReview[activeIndex];
  const goToAnswer = (to: number) => {
    setActiveAnswerIndex(Math.max(0, Math.min(answerReview.length - 1, to)));
  };

  return (
    <>
      <div className={styles.assessScoreCard}>
        <div className={styles.assessScoreHead}>
          <span className={styles.assessScorePct}>{score.percent}%</span>
          <span className={styles.assessScoreFrac}>
            {score.correct}/{score.total} correct
          </span>
        </div>
        <div className={styles.assessCatGrid}>
          {Object.entries(score.byCategory).map(([cat, v]) => (
            <div key={cat} className={styles.assessCatRow}>
              <span className={styles.assessCatLabel}>{cat}</span>
              <span className={styles.assessCatVal}>
                {v.correct}/{v.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {activeAnswer && (
        <div className={styles.assessAnswerTabs}>
          <div className={styles.assessAnswerTabNav}>
            <button
              type="button"
              className={styles.assessAnswerArrow}
              disabled={activeIndex === 0}
              onClick={() => goToAnswer(activeIndex - 1)}
              aria-label="Previous answer"
            >
              ‹
            </button>

            <div className={styles.assessAnswerTabList} role="tablist" aria-label="Assessment answers">
              {answerReview.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  className={[
                    styles.assessAnswerTab,
                    index === activeIndex ? styles.assessAnswerTabActive : '',
                    item.isCorrect ? styles.assessAnswerTabCorrect : styles.assessAnswerTabWrong,
                  ].join(' ')}
                  onClick={() => goToAnswer(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={styles.assessAnswerArrow}
              disabled={activeIndex === answerReview.length - 1}
              onClick={() => goToAnswer(activeIndex + 1)}
              aria-label="Next answer"
            >
              ›
            </button>
          </div>

          <div
            className={`${styles.assessAnswerCard} ${
              activeAnswer.isCorrect ? styles.assessAnswerCardCorrect : styles.assessAnswerCardWrong
            }`}
          >
            <div className={styles.assessAnswerHead}>
              <span className={styles.assessAnswerMeta}>
                Question {activeIndex + 1} of {answerReview.length} · {activeAnswer.category}
              </span>
              <span
                className={`${styles.assessAnswerBadge} ${
                  activeAnswer.isCorrect ? styles.assessAnswerBadgeCorrect : styles.assessAnswerBadgeWrong
                }`}
              >
                {activeAnswer.isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            </div>
            <div className={styles.assessAnswerQuestion}>{activeAnswer.question}</div>
            <div className={styles.assessAnswerGrid}>
              <div>
                <span className={styles.assessAnswerLabel}>Candidate answer</span>
                <span className={styles.assessAnswerValue}>{activeAnswer.selectedAnswer}</span>
              </div>
              <div>
                <span className={styles.assessAnswerLabel}>Correct answer</span>
                <span className={styles.assessAnswerValue}>{activeAnswer.correctAnswer}</span>
              </div>
            </div>
            <p className={styles.assessExplanation}>{activeAnswer.explanation}</p>
          </div>
        </div>
      )}
    </>
  );
}
