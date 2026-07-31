import { StatTile } from "./StatTile";
import { myDeliveriesStyles as s } from "../styles";

interface RouteHeaderCardProps {
  routeName: string;
  vehicle: string;
  todayLabel: string;
  totalStops: number;
  deliveries: number;
  pickups: number;
}

export function RouteHeaderCard({ routeName, vehicle, todayLabel, totalStops, deliveries, pickups }: RouteHeaderCardProps) {
  return (
    <div className={s.headerCard}>
      <div className={s.headerGlow} aria-hidden="true" />
      <div className={s.headerTopRow}>
        <div className={s.headerIconBadge}>
          <i className={s.headerTitleIcon} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className={s.headerTitle}>My Route — {routeName}</h1>
          <p className={s.headerSubtitle}>
            {todayLabel} · {vehicle}
          </p>
        </div>
      </div>
      <div className={s.headerStatsRow}>
        <StatTile value={totalStops} label="Total Stops" />
        <StatTile value={deliveries} label="Deliveries" />
        <StatTile value={pickups} label="Pickups" />
      </div>
    </div>
  );
}
