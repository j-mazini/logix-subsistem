import { USER_TYPE } from "../mockAuth";

export interface DriverNavPage {
  href: string;
  label: string;
  icon: string;
  allowedUserTypes: number[];
}

/** Shared by MobileNavBar and DesktopNavBar so the tab list/order never drifts between the two. */
export const DRIVER_NAV_PAGES: DriverNavPage[] = [
  {
    href: "/daily-performance-insight",
    label: "Insights",
    icon: "bi-speedometer",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/subcontractor",
    label: "Profile",
    icon: "bi-person",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/deductions",
    label: "Deductions",
    icon: "bi-graph-down-arrow",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/current-month",
    label: "Mês",
    icon: "bi-calendar-event",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/current-performance",
    label: "Performance",
    icon: "bi-bar-chart-line",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/mobile-invoice",
    label: "Invoice",
    icon: "bi-file-earmark-text",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/requests-inbox",
    label: "Pedidos",
    icon: "bi-inbox",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
  {
    href: "/my-deliveries",
    label: "Rota",
    icon: "bi-signpost-split-fill",
    allowedUserTypes: [USER_TYPE.ADMIN, USER_TYPE.DRIVER, USER_TYPE.SUPERVISOR],
  },
];
