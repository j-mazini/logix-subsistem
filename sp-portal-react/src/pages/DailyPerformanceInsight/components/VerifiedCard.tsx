import React from 'react';
import { motion } from 'framer-motion';
import { AndonStatus } from '@/app/(private)/components';
import { dailyPerformanceInsightStyles } from '../styles';

interface VerifiedCardProps {
  routeName: string;
  isSpms: boolean;
}

export const VerifiedCard = React.memo<VerifiedCardProps>(({ routeName, isSpms }) => {
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
});

VerifiedCard.displayName = 'VerifiedCard';
