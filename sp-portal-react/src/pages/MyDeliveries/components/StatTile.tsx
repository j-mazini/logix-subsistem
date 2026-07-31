import { myDeliveriesStyles as s } from "../styles";

interface StatTileProps {
  value: number;
  label: string;
  size?: "lg" | "sm";
}

/** Shared by RouteHeaderCard (page-level totals) and StopGroupSection (per-area totals). */
export function StatTile({ value, label, size = "lg" }: StatTileProps) {
  const isLarge = size === "lg";
  return (
    <div className={isLarge ? s.headerStat : s.groupStatTile}>
      <span className={isLarge ? s.headerStatValue : s.groupStatValue}>{value}</span>
      <span className={isLarge ? s.headerStatLabel : s.groupStatLabel}>{label}</span>
    </div>
  );
}
