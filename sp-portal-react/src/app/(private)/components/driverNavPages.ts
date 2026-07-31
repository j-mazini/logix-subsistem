import { USER_TYPE } from "../mockAuth";
import type { AccentKey } from "./accentColors";

export interface DriverNavPage {
  href: string;
  label: string;
  icon: string;
  accent: AccentKey;
  allowedUserTypes: number[];
}

/** Shared by MobileNavBar and DesktopNavBar so the tab list/order never drifts between the two. */
export const DRIVER_NAV_PAGES: DriverNavPage[] = [
  {
    href: "/daily-performance-insight",
    label: "Insights",
    icon: "bi-speedometer",
    accent: "blue",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/subcontractor",
    label: "Profile",
    icon: "bi-person",
    accent: "violet",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/deductions",
    label: "Deductions",
    icon: "bi-graph-down-arrow",
    accent: "rose",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/current-month",
    label: "Mês",
    icon: "bi-calendar-event",
    accent: "amber",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/current-performance",
    label: "Performance",
    icon: "bi-bar-chart-line",
    accent: "emerald",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/mobile-invoice",
    label: "Invoice",
    icon: "bi-file-earmark-text",
    accent: "cyan",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/requests",
    label: "Pedidos",
    icon: "bi-inbox",
    accent: "indigo",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/my-deliveries",
    label: "Rota",
    icon: "bi-signpost-split-fill",
    accent: "fuchsia",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
];
