import { memo } from "react";
import { DailyOverview } from "./types";
import { OperationCard } from "./components/DayDetails/OperationCard";
import { currentMonthStyles } from "./styles";
import "@/app/(private)/tailwind.css";

interface DayDetailsProps {
  selectedDays: DailyOverview[];
  selectedDateName: string;
  onBack: () => void;
}

export const DayDetails = memo(function DayDetails({
  selectedDays,
  onBack,
}: DayDetailsProps) {
  return (
    <div className={currentMonthStyles.dayDetailsRoot}>
      <button
        onClick={onBack}
        className={currentMonthStyles.dayDetailsBackButton}
      >
        <i className={currentMonthStyles.dayDetailsBackIcon} />
        <span>Back to Month Overview</span>
      </button>

      <div className={currentMonthStyles.dayDetailsScroll}>
        {selectedDays.map((operation, index) => (
          <OperationCard
            key={`${operation.operationId}-${operation.routeId}-${index}`}
            operation={operation}
            index={index}
          />
        ))}
      </div>
    </div>
  );
});
