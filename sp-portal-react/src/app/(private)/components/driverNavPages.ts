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
    href: "/my-profile",
    label: "Profile",
    icon: "bi-person-circle",
    accent: "violet",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    // Was labelled "Profile" while showing daily operations and payment
    // breakdown — renamed when the driver got a real profile page above.
    href: "/subcontractor",
    label: "Operations",
    icon: "bi-clipboard-data",
    accent: "slate",
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
    label: "Month",
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
    label: "Requests",
    icon: "bi-inbox",
    accent: "indigo",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/my-deliveries",
    label: "Route",
    icon: "bi-signpost-split-fill",
    accent: "fuchsia",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/my-schedule",
    label: "Schedule",
    icon: "bi-calendar-week",
    accent: "teal",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
];
