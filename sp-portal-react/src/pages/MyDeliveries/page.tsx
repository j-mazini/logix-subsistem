import { StandardPageLayout, PageHeader, PageContent } from "@/app/(private)/components";
import { useMyRoute } from "./hooks/useMyRoute";
import { RouteHeaderCard } from "./components/RouteHeaderCard";
import { ReorderHint } from "./components/ReorderHint";
import { EmptyState } from "./components/EmptyState";
import { DeliveriesList } from "./components/DeliveriesList";

export default function MyDeliveriesPage() {
  const {
    routeData,
    stops,
    groups,
    deliveriesCount,
    pickupsCount,
    todayLabel,
    handleGroupReorder,
    moveStop,
    handleGroupsReorder,
    moveGroup,
  } = useMyRoute();

  return (
    <StandardPageLayout bottomPadding="pb-[70px]">
      <PageHeader />

      <PageContent>
        <RouteHeaderCard
          routeName={routeData.routeName}
          vehicle={routeData.vehicle}
          todayLabel={todayLabel}
          totalStops={stops.length}
          deliveries={deliveriesCount}
          pickups={pickupsCount}
        />

        {stops.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ReorderHint />
            <DeliveriesList
              groups={groups}
              onReorderGroups={handleGroupsReorder}
              onMoveGroup={moveGroup}
              onReorderStops={handleGroupReorder}
              onMoveStop={moveStop}
            />
          </>
        )}
      </PageContent>
    </StandardPageLayout>
  );
}
