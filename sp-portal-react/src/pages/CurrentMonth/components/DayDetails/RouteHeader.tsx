import { memo } from "react";
import { currentMonthStyles } from "../../styles";

interface RouteHeaderProps {
  routeName: string;
  isSpms: boolean;
}

export const RouteHeader = memo(function RouteHeader({ routeName, isSpms }: RouteHeaderProps) {
  return (
    <div className={currentMonthStyles.routeHeader}>
      <span className={currentMonthStyles.routeHeaderTitle}>{routeName}</span>
      {isSpms && (
        <span className={currentMonthStyles.routeHeaderBadge}>
          Verified
        </span>
      )}
    </div>
  );
});
