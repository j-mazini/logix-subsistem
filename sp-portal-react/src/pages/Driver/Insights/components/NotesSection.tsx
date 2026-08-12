import { motion } from 'framer-motion';
import { dailyPerformanceInsightStyles } from '../styles';

interface NotesSectionProps {
  note: string;
}

export function NotesSection({ note }: NotesSectionProps) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={dailyPerformanceInsightStyles.notesCard}>
      <div className={dailyPerformanceInsightStyles.notesHeader}>
        <div className={dailyPerformanceInsightStyles.notesIconWrapper}>
          <i className={dailyPerformanceInsightStyles.notesIcon} />
        </div>
        <div className={dailyPerformanceInsightStyles.notesTitle}>Notes</div>
      </div>
      <p className={dailyPerformanceInsightStyles.notesText}>{note}</p>
    </motion.div>
  );
}
