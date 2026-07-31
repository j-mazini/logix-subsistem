import { memo } from "react";
import { deductionsStyles } from "../styles";

interface ErrorStateProps {
  error: string;
}

export const ErrorState = memo(function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className={deductionsStyles.errorContainer}>
      <p className={deductionsStyles.errorText}>Error: {error}</p>
    </div>
  );
});
