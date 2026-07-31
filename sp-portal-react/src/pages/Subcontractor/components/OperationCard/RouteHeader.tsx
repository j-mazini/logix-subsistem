import { memo } from "react";
import { motion } from "framer-motion";
import { AndonStatus } from "@/app/(private)/components";
import { subcontractorStyles } from "../../styles";

interface RouteHeaderProps {
  routeName: string;
  isSpms: boolean;
}

export const RouteHeader = memo(function RouteHeader({ routeName, isSpms }: RouteHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        delay: 0.1,
        duration: 0.4,
        type: 'spring',
        stiffness: 200,
        damping: 20
      }}
      whileHover={{
        scale: 1.01,
        boxShadow: '0 6px 20px rgba(52, 152, 219, 0.3)',
        y: -2
      }}
      className={subcontractorStyles.routeHeader}
    >
      <motion.div
        className={subcontractorStyles.routeHeaderPattern}
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}
        animate={{
          backgroundPosition: ['0 0', '20px 20px'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      <motion.div
        className={subcontractorStyles.routeHeaderShimmer}
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      <span className={subcontractorStyles.routeHeaderTitle}>{routeName}</span>
      <div className="relative z-10">
        <AndonStatus isSpms={isSpms} />
      </div>

      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-b-2xl"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      />
    </motion.div>
  );
});
