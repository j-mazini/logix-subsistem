import { memo } from "react";
import { motion } from "framer-motion";
import { subcontractorStyles } from "../../styles";

interface NoteSectionProps {
  note: string;
}

export const NoteSection = memo(function NoteSection({ note }: NoteSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      whileHover={{ x: 4 }}
      className={subcontractorStyles.noteCard}
    >
      <motion.div
        className={subcontractorStyles.notePattern}
        animate={{
          backgroundPosition: ['0 0', '15px 15px'],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      <div className={subcontractorStyles.noteTitle}>
        <i className={subcontractorStyles.noteTitleIcon} />
        Notes
      </div>
      <div className={subcontractorStyles.noteText}>{note}</div>
    </motion.div>
  );
});
