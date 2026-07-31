import { memo } from "react";
import { deductionsStyles } from "../styles";

export const LoadingState = memo(function LoadingState() {
  return (
    <div className={deductionsStyles.loadingContainer}>
      <p className={deductionsStyles.loadingText}>Loading...</p>
    </div>
  );
});
