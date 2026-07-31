import type { DragControls } from "framer-motion";
import { myDeliveriesStyles as s } from "../styles";

interface GroupHeaderActionsProps {
  code: string;
  isFirstGroup: boolean;
  isLastGroup: boolean;
  onMoveGroupUp: () => void;
  onMoveGroupDown: () => void;
  dragControls: DragControls;
}

export function GroupHeaderActions({
  code,
  isFirstGroup,
  isLastGroup,
  onMoveGroupUp,
  onMoveGroupDown,
  dragControls,
}: GroupHeaderActionsProps) {
  return (
    <div className={s.groupHeaderActions}>
      <button
        type="button"
        className={s.groupMoveButton}
        disabled={isFirstGroup}
        onClick={onMoveGroupUp}
        aria-label={`Move ${code} area up`}
      >
        <i className="bi bi-caret-up-fill" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={s.groupMoveButton}
        disabled={isLastGroup}
        onClick={onMoveGroupDown}
        aria-label={`Move ${code} area down`}
      >
        <i className="bi bi-caret-down-fill" aria-hidden="true" />
      </button>
      <span
        className={s.groupDragHandle}
        onPointerDown={(e) => dragControls.start(e)}
        role="button"
        tabIndex={-1}
        aria-label={`Drag to reorder ${code} area`}
      >
        <i className="bi bi-grip-horizontal" aria-hidden="true" />
      </span>
    </div>
  );
}
