import { ReactNode } from "react";
import { motion } from "framer-motion";
import { MobileHeader } from "./MobileHeader";

interface PageHeaderProps {
  children?: ReactNode;
  showMobileHeader?: boolean;
  alignHeader?: "left" | "right" | "between";
}

export function PageHeader({
  children,
  showMobileHeader = true,
  alignHeader = "right",
}: PageHeaderProps) {
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
      {children ? (
        <div className={`flex ${alignClass} items-center min-h-[52px] sm:min-h-[58px] gap-2 sm:gap-3 w-full min-w-0 flex-wrap`}>
          {children}
          {showMobileHeader && (
            <div className="mb-0 flex-shrink-0">
              <MobileHeader />
            </div>
          )}
        </div>
      ) : (
        showMobileHeader && (
          <div className={`flex ${alignClass} items-center`}>
            <MobileHeader />
          </div>
        )
      )}
    </motion.div>
  );
}
