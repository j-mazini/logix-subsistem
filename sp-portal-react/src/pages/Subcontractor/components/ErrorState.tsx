import { memo } from "react";
import { subcontractorStyles } from "../styles";

interface ErrorStateProps {
  message?: string;
}

export const ErrorState = memo(function ErrorState({
  message = "No data available for the selected date",
}: ErrorStateProps) {
  return (
    <div className={subcontractorStyles.errorContainer}>
      <p className={subcontractorStyles.errorText}>{message}</p>
    </div>
  );
});
