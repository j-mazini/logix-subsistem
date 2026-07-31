import { memo } from "react";
import { currentPerformanceStyles } from "../styles";

export const LoadingState = memo(function LoadingState() {
  return (
    <div className={currentPerformanceStyles.loadingText}>
      Loading data...
    </div>
  );
});
