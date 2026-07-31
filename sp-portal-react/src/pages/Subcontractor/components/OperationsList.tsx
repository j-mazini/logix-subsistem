import { memo } from "react";
import { motion } from "framer-motion";
import { DayOverviewResponse } from "../types";
import { OperationCard } from "../OperationCard";
import { subcontractorStyles } from "../styles";

interface OperationsListProps {
  operations: DayOverviewResponse[];
}

export const OperationsList = memo(function OperationsList({ operations }: OperationsListProps) {
  return (
    <div className={subcontractorStyles.operationsListRoot}>
      <div className={subcontractorStyles.operationsListScroll}>
        <div className={subcontractorStyles.operationsListInner}>
          {operations.map((operation, index) => (
            <motion.div
              key={operation.operationId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="overflow-visible"
            >
              <OperationCard operation={operation} />
              {index < operations.length - 1 && (
                <div className={subcontractorStyles.operationsDividerWrapper}>
                  <div className={subcontractorStyles.operationsDividerLine} />
                  <div className={subcontractorStyles.operationsDividerDot} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
});
