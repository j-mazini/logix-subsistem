import { motion } from 'framer-motion';
import { AndonStatus } from './AndonStatus';
import { dailyPerformanceInsightStyles } from '../styles';

interface VerifiedCardProps {
  routeName: string;
  isSpms: boolean;
}

export function VerifiedCard({ routeName, isSpms }: VerifiedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={{ scale: 1.02 }}
      className={dailyPerformanceInsightStyles.verifiedCard}
    >
      <span className={dailyPerformanceInsightStyles.verifiedCardText}>{routeName}</span>
      <AndonStatus isSpms={isSpms} />
    </motion.div>
  );
}
