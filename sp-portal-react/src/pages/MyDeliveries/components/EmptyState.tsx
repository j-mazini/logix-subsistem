import { myDeliveriesStyles as s } from "../styles";

export function EmptyState() {
  return (
    <div className={s.emptyState}>
      <i className={s.emptyStateIcon} aria-hidden="true" />
      <p>No stops assigned for today.</p>
    </div>
  );
}
