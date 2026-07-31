import { memo } from "react";
import { currentPerformanceStyles } from "../styles";

interface ErrorStateProps {
  error: string;
}

export const ErrorState = memo(function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className={currentPerformanceStyles.errorText}>
      Error: {error}
    </div>
  );
});
