import { useMemo, useState } from "react";
import { fetchMyRouteToday } from "../mock/mockMyDeliveriesData";
import { buildGroups, withStartIndexes, DisplayStopGroup } from "../utils";
import { DeliveryStop } from "../types";

export function useMyRoute() {
  const routeData = useMemo(() => fetchMyRouteToday(), []);
  const initialGroups = useMemo(() => buildGroups(routeData.stops), [routeData]);

  // Grouped state, not a flat array: each area's stops live under their own
  // key, and group display order is tracked separately. "Same subpostcode is
  // always one group" holds by construction this way — no mutation needs to
  // preserve contiguity to stay correct (see utils.ts's buildGroups).
  const [groupOrder, setGroupOrder] = useState<string[]>(() => initialGroups.map((group) => group.code));
  const [stopsByCode, setStopsByCode] = useState<Record<string, DeliveryStop[]>>(() =>
    Object.fromEntries(initialGroups.map((group) => [group.code, group.items]))
  );

  const groups = useMemo(
    () => groupOrder.map((code) => ({ code, items: stopsByCode[code] ?? [] })),
    [groupOrder, stopsByCode]
  );
  const displayGroups = useMemo(() => withStartIndexes(groups), [groups]);

  const stops = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const deliveriesCount = stops.filter((stop) => stop.type === "DEL").length;
  const pickupsCount = stops.length - deliveriesCount;

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  // Reordering stops is scoped to one postcode group at a time — a stop's
  // postcode is fixed data, so "reordering the route" within a group means
  // picking a visiting order for its addresses, not moving stops between
  // areas. Whole groups (the areas themselves) can still be reordered
  // relative to each other via moveGroup/handleGroupsReorder.
  function handleGroupReorder(code: string, newItems: DeliveryStop[]) {
    setStopsByCode((prev) => ({ ...prev, [code]: newItems }));
  }

  function moveStop(code: string, localIndex: number, direction: -1 | 1) {
    setStopsByCode((prev) => {
      const items = prev[code];
      const target = localIndex + direction;
      if (!items || target < 0 || target >= items.length) return prev;
      const next = [...items];
      [next[localIndex], next[target]] = [next[target], next[localIndex]];
      return { ...prev, [code]: next };
    });
  }

  function handleGroupsReorder(newGroups: DisplayStopGroup[]) {
    setGroupOrder(newGroups.map((group) => group.code));
  }

  function moveGroup(groupIndex: number, direction: -1 | 1) {
    setGroupOrder((prev) => {
      const target = groupIndex + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[groupIndex], next[target]] = [next[target], next[groupIndex]];
      return next;
    });
  }

  return {
    routeData,
    stops,
    groups: displayGroups,
    deliveriesCount,
    pickupsCount,
    todayLabel,
    handleGroupReorder,
    moveStop,
    handleGroupsReorder,
    moveGroup,
  };
}
