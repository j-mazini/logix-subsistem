import React from 'react';
import { motion } from 'framer-motion';

interface InvoiceActionButtonProps {
  icon: string;
  onClick: () => void;
  title: string;
  ariaLabel: string;
}

export const InvoiceActionButton = React.memo<InvoiceActionButtonProps>(({
  icon,
  onClick,
  title,
  ariaLabel
}) => {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      whileHover={{ scale: 1.2, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      className="text-slate-500 text-lg transition-colors duration-200 hover:text-blue-600 active:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-lg p-1.5 hover:bg-blue-50"
    >
      <i className={`bi ${icon}`} />
    </motion.button>
  );
});

InvoiceActionButton.displayName = 'InvoiceActionButton';
