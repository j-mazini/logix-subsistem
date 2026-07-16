/**
 * Complete manifest of all 48 pages in logix-subsistem
 * Extends the incomplete DHL_PAGES_MANIFEST with the full page inventory
 *
 * This file maps every HTML page in the subsystem for React migration planning
 */

import type { PageSchema } from "./types";

export type PageFunction =
  | "auth"
  | "dashboard"
  | "asset-management"
  | "operations"
  | "contracts"
  | "procedures"
  | "provider-management"
  | "financial"
  | "admin"
  | "entry-point";

export interface ExtendedPageSchema extends PageSchema {
  /** Physical HTML file location relative to logix-subsistem root */
  htmlPath: string;
  /** Functional category */
  function: PageFunction;
  /** Whether this page has a legacy duplicate */
  hasLegacy?: boolean;
  /** If this is a legacy page, its current equivalent */
  currentEquivalent?: string;
  /** Login entry point required to access (null = public) */
  loginRequirement?: "main" | "dhl" | "sp-portal" | null;
}

// ============================================================================
// ROOT LEVEL PAGES (10)
// ============================================================================

const ROOT_PAGES: ExtendedPageSchema[] = [
  {
    htmlPath: "index.html",
    path: "/",
    title: "Main Entry",
    description: "Home / entry point",
    segment: "public",
    requiresAuth: false,
    function: "entry-point",
    loginRequirement: null,
  },
  {
    htmlPath: "login.html",
    path: "/login",
    title: "Main Login",
    description: "Primary authentication",
    segment: "public",
    requiresAuth: false,
    function: "auth",
    loginRequirement: null,
  },
  {
    htmlPath: "access-select.html",
    path: "/access-select",
    title: "Role/Tenant Selector",
    description: "Choose tenant or role after login",
    segment: "private",
    requiresAuth: true,
    function: "auth",
    loginRequirement: "main",
  },
  {
    htmlPath: "dashboard.html",
    path: "/dashboard",
    title: "Main Dashboard",
    description: "Operational overview and metrics",
    segment: "private",
    requiresAuth: true,
    function: "dashboard",
    loginRequirement: "main",
  },
  {
    htmlPath: "standard-operating-procedures.html",
    path: "/procedures",
    title: "Standard Operating Procedures",
    description: "SOP reference and documentation",
    segment: "private",
    requiresAuth: true,
    function: "procedures",
    loginRequirement: "main",
  },
  {
    htmlPath: "service-providers.html",
    path: "/service-providers",
    title: "Service Providers",
    description: "List of all service providers",
    segment: "public",
    requiresAuth: false,
    function: "provider-management",
    loginRequirement: null,
  },
  {
    htmlPath: "service-provider-profile.html",
    path: "/service-providers/:id",
    title: "Service Provider Profile",
    description: "Individual provider details",
    segment: "public",
    requiresAuth: false,
    function: "provider-management",
    loginRequirement: null,
  },
  {
    htmlPath: "vendor-admin-view.html",
    path: "/admin/vendors",
    title: "Vendor Administration",
    description: "Manage vendors/drivers",
    segment: "private",
    requiresAuth: true,
    function: "admin",
    loginRequirement: "main",
  },
  {
    htmlPath: "vehicles-admin-view.html",
    path: "/admin/vehicles",
    title: "Vehicle Administration",
    description: "Manage fleet vehicles",
    segment: "private",
    requiresAuth: true,
    function: "admin",
    loginRequirement: "main",
  },
  {
    htmlPath: "contract-management-admin-view.html",
    path: "/admin/contracts",
    title: "Contract Administration",
    description: "Manage all contracts",
    segment: "private",
    requiresAuth: true,
    function: "contracts",
    loginRequirement: "main",
  },
];

// ============================================================================
// DHL SUBSYSTEM (7)
// ============================================================================

const DHL_PAGES: ExtendedPageSchema[] = [
  {
    htmlPath: "dhl/login/index.html",
    path: "/dhl/login",
    title: "DHL Login",
    description: "DHL-specific authentication",
    segment: "public",
    requiresAuth: false,
    function: "auth",
    loginRequirement: null,
  },
  {
    htmlPath: "dhl/access-select/index.html",
    path: "/dhl/access-select",
    title: "DHL Role Selector",
    description: "Choose role within DHL operations",
    segment: "private",
    requiresAuth: true,
    function: "auth",
    loginRequirement: "dhl",
  },
  {
    htmlPath: "dhl/dashboard/index.html",
    path: "/dhl/dashboard",
    title: "DHL Dashboard",
    description: "DHL operations overview",
    segment: "private",
    requiresAuth: true,
    function: "dashboard",
    loginRequirement: "dhl",
  },
  {
    htmlPath: "dhl/vendor-admin-view/index.html",
    path: "/dhl/admin/vendors",
    title: "DHL Vendor Administration",
    description: "Manage DHL vendors",
    segment: "private",
    requiresAuth: true,
    function: "admin",
    loginRequirement: "dhl",
  },
  {
    htmlPath: "dhl/vehicles-admin-view/index.html",
    path: "/dhl/admin/vehicles",
    title: "DHL Vehicle Administration",
    description: "Manage DHL fleet",
    segment: "private",
    requiresAuth: true,
    function: "admin",
    loginRequirement: "dhl",
  },
  {
    htmlPath: "dhl/contract-management/index.html",
    path: "/dhl/contracts",
    title: "DHL Contracts",
    description: "DHL contract management",
    segment: "private",
    requiresAuth: true,
    function: "contracts",
    loginRequirement: "dhl",
  },
  {
    htmlPath: "dhl/standard-operating-procedures/index.html",
    path: "/dhl/procedures",
    title: "DHL SOP",
    description: "DHL Standard Operating Procedures",
    segment: "private",
    requiresAuth: true,
    function: "procedures",
    loginRequirement: "dhl",
  },
];

// ============================================================================
// SERVICE PROVIDERS (2)
// ============================================================================

const SERVICE_PROVIDER_PAGES: ExtendedPageSchema[] = [
  {
    htmlPath: "service-providers/index.html",
    path: "/service-providers",
    title: "Service Providers (Alt)",
    description: "List of service providers (alternate route)",
    segment: "public",
    requiresAuth: false,
    function: "provider-management",
    loginRequirement: null,
    hasLegacy: false,
  },
  {
    htmlPath: "service-providers/profile.html",
    path: "/service-providers/:id/profile",
    title: "Service Provider Profile (Alt)",
    description: "Provider profile (alternate route)",
    segment: "public",
    requiresAuth: false,
    function: "provider-management",
    loginRequirement: null,
    hasLegacy: false,
  },
];

// ============================================================================
// SP PORTAL - AUTHENTICATION & CORE (4 legacy + 4 current = 8)
// ============================================================================

const SP_PORTAL_AUTH: ExtendedPageSchema[] = [
  {
    htmlPath: "sp-portal/login.html",
    path: "/sp-portal/login",
    title: "SP Portal Login (Legacy)",
    description: "Service Provider portal login",
    segment: "public",
    requiresAuth: false,
    function: "auth",
    loginRequirement: null,
    hasLegacy: true,
    currentEquivalent: "sp-portal/login/index.html",
  },
  {
    htmlPath: "sp-portal/login/index.html",
    path: "/sp-portal/login",
    title: "SP Portal Login",
    description: "Service Provider portal authentication",
    segment: "public",
    requiresAuth: false,
    function: "auth",
    loginRequirement: null,
  },
  {
    htmlPath: "sp-portal/select.html",
    path: "/sp-portal/select",
    title: "SP Company Selector (Legacy)",
    description: "Choose company after login",
    segment: "private",
    requiresAuth: true,
    function: "auth",
    loginRequirement: "sp-portal",
    hasLegacy: true,
    currentEquivalent: "sp-portal/select/index.html",
  },
  {
    htmlPath: "sp-portal/select/index.html",
    path: "/sp-portal/select",
    title: "SP Company Selector",
    description: "Select company/vehicle for operations",
    segment: "private",
    requiresAuth: true,
    function: "auth",
    loginRequirement: "sp-portal",
  },
];

// ============================================================================
// SP PORTAL - DASHBOARDS (5 legacy + current + legacy blocks = 7)
// ============================================================================

const SP_PORTAL_DASHBOARDS: ExtendedPageSchema[] = [
  {
    htmlPath: "sp-portal/dashboard.html",
    path: "/sp-portal/dashboard",
    title: "SP Dashboard (Legacy)",
    description: "Service Provider dashboard overview",
    segment: "private",
    requiresAuth: true,
    function: "dashboard",
    loginRequirement: "sp-portal",
    hasLegacy: true,
    currentEquivalent: "sp-portal/dashboard/index.html",
  },
  {
    htmlPath: "sp-portal/dashboard/index.html",
    path: "/sp-portal/dashboard",
    title: "SP Dashboard",
    description: "Service Provider operations dashboard",
    segment: "private",
    requiresAuth: true,
    function: "dashboard",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/dashboard/legacy/legacy-dashboard-blocks.html",
    path: "/sp-portal/dashboard/legacy-blocks",
    title: "Legacy Dashboard Components",
    description: "Legacy dashboard component blocks (internal)",
    segment: "private",
    requiresAuth: true,
    function: "dashboard",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/vendor-performance/index.html",
    path: "/sp-portal/performance",
    title: "Vendor/Driver Performance",
    description: "Analytics and performance metrics",
    segment: "private",
    requiresAuth: true,
    function: "dashboard",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/daily-financial-insights/index.html",
    path: "/sp-portal/financial",
    title: "Daily Financial Insights",
    description: "Financial metrics and analysis",
    segment: "private",
    requiresAuth: true,
    function: "financial",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/daily-operations-reports/index.html",
    path: "/sp-portal/reports",
    title: "Daily Operations Reports",
    description: "Operational reporting and analytics",
    segment: "private",
    requiresAuth: true,
    function: "dashboard",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/route-balance/index.html",
    path: "/sp-portal/route-balance",
    title: "Route Balance",
    description: "View and manage route assignments",
    segment: "private",
    requiresAuth: true,
    function: "operations",
    loginRequirement: "sp-portal",
  },
];

// ============================================================================
// SP PORTAL - ASSETS (6: vehicles + drivers + assets)
// ============================================================================

const SP_PORTAL_ASSETS: ExtendedPageSchema[] = [
  {
    htmlPath: "sp-portal/vehicles.html",
    path: "/sp-portal/vehicles",
    title: "Vehicles (Legacy)",
    description: "Fleet vehicle management",
    segment: "private",
    requiresAuth: true,
    function: "asset-management",
    loginRequirement: "sp-portal",
    hasLegacy: true,
    currentEquivalent: "sp-portal/vehicles/index.html",
  },
  {
    htmlPath: "sp-portal/vehicles/index.html",
    path: "/sp-portal/vehicles",
    title: "Vehicles",
    description: "Manage fleet vehicles",
    segment: "private",
    requiresAuth: true,
    function: "asset-management",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/drivers.html",
    path: "/sp-portal/drivers",
    title: "Drivers (Legacy)",
    description: "Driver management and assignments",
    segment: "private",
    requiresAuth: true,
    function: "asset-management",
    loginRequirement: "sp-portal",
    hasLegacy: true,
    currentEquivalent: "sp-portal/drivers/index.html",
  },
  {
    htmlPath: "sp-portal/drivers/index.html",
    path: "/sp-portal/drivers",
    title: "Drivers",
    description: "Manage drivers and assignments",
    segment: "private",
    requiresAuth: true,
    function: "asset-management",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/assets/index.html",
    path: "/sp-portal/assets",
    title: "Assets",
    description: "Asset management and tracking",
    segment: "private",
    requiresAuth: true,
    function: "asset-management",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/profile.html",
    path: "/sp-portal/profile",
    title: "Profile (Legacy)",
    description: "Company profile management",
    segment: "private",
    requiresAuth: true,
    function: "asset-management",
    loginRequirement: "sp-portal",
    hasLegacy: true,
    currentEquivalent: "sp-portal/profile/index.html",
  },
  {
    htmlPath: "sp-portal/profile/index.html",
    path: "/sp-portal/profile",
    title: "Profile",
    description: "Company profile and settings",
    segment: "private",
    requiresAuth: true,
    function: "asset-management",
    loginRequirement: "sp-portal",
  },
];

// ============================================================================
// SP PORTAL - OPERATIONS & ROUTING (5)
// ============================================================================

const SP_PORTAL_OPERATIONS: ExtendedPageSchema[] = [
  {
    htmlPath: "sp-portal/route-balancer/index.html",
    path: "/sp-portal/route-balancer",
    title: "Route Balancer",
    description: "Tool for balancing routes",
    segment: "private",
    requiresAuth: true,
    function: "operations",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/week-planner/index.html",
    path: "/sp-portal/week-planner",
    title: "Week Planner",
    description: "Plan routes and assignments for the week",
    segment: "private",
    requiresAuth: true,
    function: "operations",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/daily-operations-management/index.html",
    path: "/sp-portal/daily-operations",
    title: "Daily Operations Management",
    description: "Manage daily operations",
    segment: "private",
    requiresAuth: true,
    function: "operations",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/requests-admin/index.html",
    path: "/sp-portal/requests",
    title: "Requests Administration",
    description: "Manage support requests",
    segment: "private",
    requiresAuth: true,
    function: "operations",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/adhoc-invoice-management/index.html",
    path: "/sp-portal/invoices",
    title: "Ad-hoc Invoice Management",
    description: "Handle one-off invoicing",
    segment: "private",
    requiresAuth: true,
    function: "financial",
    loginRequirement: "sp-portal",
  },
];

// ============================================================================
// SP PORTAL - CONTRACTS & PROCEDURES (4)
// ============================================================================

const SP_PORTAL_CONTRACTS: ExtendedPageSchema[] = [
  {
    htmlPath: "sp-portal/contracts.html",
    path: "/sp-portal/contracts",
    title: "Contracts (Legacy)",
    description: "View contracts (read-only)",
    segment: "private",
    requiresAuth: true,
    function: "contracts",
    loginRequirement: "sp-portal",
    hasLegacy: true,
    currentEquivalent: "sp-portal/contracts/index.html",
  },
  {
    htmlPath: "sp-portal/contracts/index.html",
    path: "/sp-portal/contracts",
    title: "Contracts",
    description: "Contract details (read-only)",
    segment: "private",
    requiresAuth: true,
    function: "contracts",
    loginRequirement: "sp-portal",
  },
  {
    htmlPath: "sp-portal/sop-feed.html",
    path: "/sp-portal/procedures",
    title: "SOP Feed (Legacy)",
    description: "Standard Operating Procedures feed",
    segment: "private",
    requiresAuth: true,
    function: "procedures",
    loginRequirement: "sp-portal",
    hasLegacy: true,
    currentEquivalent: "sp-portal/sop-feed/index.html",
  },
  {
    htmlPath: "sp-portal/sop-feed/index.html",
    path: "/sp-portal/procedures",
    title: "SOP Feed",
    description: "Operating procedures and guidelines",
    segment: "private",
    requiresAuth: true,
    function: "procedures",
    loginRequirement: "sp-portal",
  },
];

// ============================================================================
// SP PORTAL - ADMIN (2)
// ============================================================================

const SP_PORTAL_ADMIN: ExtendedPageSchema[] = [
  {
    htmlPath: "sp-portal/vetting-admin.html",
    path: "/sp-portal/vetting",
    title: "Vetting Administration (Legacy)",
    description: "Manage vetting process",
    segment: "private",
    requiresAuth: true,
    function: "admin",
    loginRequirement: "sp-portal",
    hasLegacy: true,
    currentEquivalent: "sp-portal/vetting-admin/index.html",
  },
  {
    htmlPath: "sp-portal/vetting-admin/index.html",
    path: "/sp-portal/vetting",
    title: "Vetting Administration",
    description: "Vetting and approval workflows",
    segment: "private",
    requiresAuth: true,
    function: "admin",
    loginRequirement: "sp-portal",
  },
];

// ============================================================================
// COMPLETE MANIFEST
// ============================================================================

export const COMPLETE_PAGES_MANIFEST: ExtendedPageSchema[] = [
  ...ROOT_PAGES,
  ...DHL_PAGES,
  ...SERVICE_PROVIDER_PAGES,
  ...SP_PORTAL_AUTH,
  ...SP_PORTAL_DASHBOARDS,
  ...SP_PORTAL_ASSETS,
  ...SP_PORTAL_OPERATIONS,
  ...SP_PORTAL_CONTRACTS,
  ...SP_PORTAL_ADMIN,
];

// ============================================================================
// EXPORT BY CATEGORY
// ============================================================================

export const PAGES_BY_FUNCTION = {
  auth: COMPLETE_PAGES_MANIFEST.filter(p => p.function === "auth"),
  dashboard: COMPLETE_PAGES_MANIFEST.filter(p => p.function === "dashboard"),
  "asset-management": COMPLETE_PAGES_MANIFEST.filter(p => p.function === "asset-management"),
  operations: COMPLETE_PAGES_MANIFEST.filter(p => p.function === "operations"),
  contracts: COMPLETE_PAGES_MANIFEST.filter(p => p.function === "contracts"),
  procedures: COMPLETE_PAGES_MANIFEST.filter(p => p.function === "procedures"),
  "provider-management": COMPLETE_PAGES_MANIFEST.filter(p => p.function === "provider-management"),
  financial: COMPLETE_PAGES_MANIFEST.filter(p => p.function === "financial"),
  admin: COMPLETE_PAGES_MANIFEST.filter(p => p.function === "admin"),
  "entry-point": COMPLETE_PAGES_MANIFEST.filter(p => p.function === "entry-point"),
};

// ============================================================================
// STATISTICS
// ============================================================================

export const MANIFEST_STATS = {
  total: COMPLETE_PAGES_MANIFEST.length,
  byFunction: Object.fromEntries(
    Object.entries(PAGES_BY_FUNCTION).map(([fn, pages]) => [fn, pages.length])
  ),
  withLegacy: COMPLETE_PAGES_MANIFEST.filter(p => p.hasLegacy).length,
  requiresAuth: COMPLETE_PAGES_MANIFEST.filter(p => p.requiresAuth).length,
  public: COMPLETE_PAGES_MANIFEST.filter(p => p.segment === "public").length,
  byLoginRequirement: {
    main: COMPLETE_PAGES_MANIFEST.filter(p => p.loginRequirement === "main").length,
    dhl: COMPLETE_PAGES_MANIFEST.filter(p => p.loginRequirement === "dhl").length,
    "sp-portal": COMPLETE_PAGES_MANIFEST.filter(p => p.loginRequirement === "sp-portal").length,
    public: COMPLETE_PAGES_MANIFEST.filter(p => p.loginRequirement === null).length,
  },
};
