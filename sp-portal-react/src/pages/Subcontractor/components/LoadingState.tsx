import { memo } from "react";
import { subcontractorStyles } from "../styles";

export const LoadingState = memo(function LoadingState() {
  return (
    <div className={subcontractorStyles.loadingContainer}>
      <p className={subcontractorStyles.loadingText}>Loading...</p>
    </div>
  );
});
