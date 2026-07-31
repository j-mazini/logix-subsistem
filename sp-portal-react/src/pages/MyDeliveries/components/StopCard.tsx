import { Reorder, useDragControls } from "framer-motion";
import { DeliveryStop } from "../types";
import { myDeliveriesStyles as s } from "../styles";

interface StopCardProps {
  stop: DeliveryStop;
  sequence: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function StopCard({ stop, sequence, isFirst, isLast, onMoveUp, onMoveDown }: StopCardProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={stop}
      dragListener={false}
      dragControls={dragControls}
      className={s.stopCard}
      whileDrag={{ scale: 1.04, boxShadow: "0 12px 28px rgba(15, 23, 42, 0.22)", zIndex: 1 }}
    >
      <span className={s.stopSequence}>{sequence}</span>
      <span
        className={s.stopDragHandleButton}
        onPointerDown={(e) => dragControls.start(e)}
        role="button"
        tabIndex={-1}
        aria-label="Drag to reorder this stop"
      >
        <i className={s.stopDragHandle} aria-hidden="true" />
      </span>

      <div className={s.stopBody}>
        <span className={s.stopPostcode}>{stop.postcode}</span>
        <span className={`${s.typeBadgeBase} ${stop.type === "DEL" ? s.typeBadgeDel : s.typeBadgePu}`}>
          {stop.type}
        </span>
        {(stop.pre12 || stop.asr || stop.dsr) && (
          <span className={s.tagDotsWrap}>
            {stop.pre12 && <span className={`${s.tagDotBase} ${s.tagDotPre12}`} title="Pre 12" />}
            {stop.asr && <span className={`${s.tagDotBase} ${s.tagDotAsr}`} title="ASR" />}
            {stop.dsr && <span className={`${s.tagDotBase} ${s.tagDotDsr}`} title="DSR" />}
          </span>
        )}
      </div>

      <span className={s.piecesBadge}>{stop.pieces}pc</span>

      <div className={s.reorderButtons}>
        <button
          type="button"
          className={s.reorderButton}
          disabled={isFirst}
          onClick={onMoveUp}
          aria-label="Move stop up"
        >
          <i className="bi bi-caret-up-fill" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={s.reorderButton}
          disabled={isLast}
          onClick={onMoveDown}
          aria-label="Move stop down"
        >
          <i className="bi bi-caret-down-fill" aria-hidden="true" />
        </button>
      </div>
    </Reorder.Item>
  );
}
