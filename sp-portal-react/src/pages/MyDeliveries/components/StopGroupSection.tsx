import { Reorder, useDragControls } from "framer-motion";
import { DeliveryStop } from "../types";
import { DisplayStopGroup } from "../utils";
import { StopCard } from "./StopCard";
import { StatTile } from "./StatTile";
import { GroupHeaderActions } from "./GroupHeaderActions";
import { myDeliveriesStyles as s } from "../styles";

interface StopGroupSectionProps {
  group: DisplayStopGroup;
  isFirstGroup: boolean;
  isLastGroup: boolean;
  onMoveGroupUp: () => void;
  onMoveGroupDown: () => void;
  onReorderStops: (code: string, newItems: DeliveryStop[]) => void;
  onMoveStop: (code: string, localIndex: number, direction: -1 | 1) => void;
}

export function StopGroupSection({
  group,
  isFirstGroup,
  isLastGroup,
  onMoveGroupUp,
  onMoveGroupDown,
  onReorderStops,
  onMoveStop,
}: StopGroupSectionProps) {
  const { code, items, startIndex } = group;
  const dragControls = useDragControls();
  const delCount = items.filter((item) => item.type === "DEL").length;
  const puCount = items.length - delCount;

  return (
    <Reorder.Item
      value={group}
      dragListener={false}
      dragControls={dragControls}
      className={s.groupSection}
      whileDrag={{ boxShadow: "0 16px 36px rgba(15, 23, 42, 0.18)", zIndex: 1 }}
    >
      <div className={s.groupHeader}>
        <span className={s.groupHeaderCode}>
          <i className={s.groupHeaderIcon} aria-hidden="true" />
          {code}
        </span>
        <GroupHeaderActions
          code={code}
          isFirstGroup={isFirstGroup}
          isLastGroup={isLastGroup}
          onMoveGroupUp={onMoveGroupUp}
          onMoveGroupDown={onMoveGroupDown}
          dragControls={dragControls}
        />
      </div>

      <div className={s.groupStatsRow}>
        <StatTile value={delCount} label="Deliveries" size="sm" />
        <StatTile value={puCount} label="Pickups" size="sm" />
        <StatTile value={items.length} label="Total Stops" size="sm" />
      </div>

      <div className={s.groupListWrap}>
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={(newItems) => onReorderStops(code, newItems)}
          className="list-none p-0 m-0"
        >
          {items.map((stop, localIndex) => (
            <StopCard
              key={stop.id}
              stop={stop}
              sequence={startIndex + localIndex + 1}
              isFirst={localIndex === 0}
              isLast={localIndex === items.length - 1}
              onMoveUp={() => onMoveStop(code, localIndex, -1)}
              onMoveDown={() => onMoveStop(code, localIndex, 1)}
            />
          ))}
        </Reorder.Group>
      </div>
    </Reorder.Item>
  );
}
