import { Reorder } from "framer-motion";
import { DeliveryStop } from "../types";
import { DisplayStopGroup } from "../utils";
import { StopGroupSection } from "./StopGroupSection";

interface DeliveriesListProps {
  groups: DisplayStopGroup[];
  onReorderGroups: (newGroups: DisplayStopGroup[]) => void;
  onMoveGroup: (groupIndex: number, direction: -1 | 1) => void;
  onReorderStops: (code: string, newItems: DeliveryStop[]) => void;
  onMoveStop: (code: string, localIndex: number, direction: -1 | 1) => void;
}

export function DeliveriesList({ groups, onReorderGroups, onMoveGroup, onReorderStops, onMoveStop }: DeliveriesListProps) {
  return (
    <Reorder.Group axis="y" values={groups} onReorder={onReorderGroups} className="list-none p-0 m-0">
      {groups.map((group, groupIndex) => (
        <StopGroupSection
          key={group.code}
          group={group}
          isFirstGroup={groupIndex === 0}
          isLastGroup={groupIndex === groups.length - 1}
          onMoveGroupUp={() => onMoveGroup(groupIndex, -1)}
          onMoveGroupDown={() => onMoveGroup(groupIndex, 1)}
          onReorderStops={onReorderStops}
          onMoveStop={onMoveStop}
        />
      ))}
    </Reorder.Group>
  );
}
