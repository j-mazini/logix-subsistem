import { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  children?: ReactNode;
  alignHeader?: "left" | "right" | "between";
}

/**
 * Row for a page's own header controls (month selectors, filters…). The user
 * pill is NOT rendered here — StandardPageLayout owns it so it keeps the same
 * position on every page; without children this row renders nothing.
 */
export function PageHeader({ children, alignHeader = "right" }: PageHeaderProps) {
  if (!children) return null;

  const alignClass =
    alignHeader === "left"
      ? "justify-start"
      : alignHeader === "between"
      ? "justify-between"
      : "justify-end";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className="pt-3 sm:pt-4 pb-2 sm:pb-3"
    >
      <div className={`flex ${alignClass} items-center min-h-[52px] sm:min-h-[58px] gap-2 sm:gap-3 w-full min-w-0 flex-wrap`}>
        {children}
      </div>
    </motion.div>
  );
}
