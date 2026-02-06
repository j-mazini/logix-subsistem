/**
 * Manifesto de rotas do subsistema DHL.
 * Lista todas as páginas que pertencem a este subsistema.
 * O frontend logix-sphere-frontend-nextjs pode importar este ficheiro
 * para registar ou gerar as rotas correspondentes.
 */

import type { PageSchema } from "./types";

export const DHL_PAGES_MANIFEST: PageSchema[] = [
  {
    path: "dhl/dashboard",
    title: "DHL Dashboard",
    description: "Visão geral das operações DHL",
    segment: "private",
    requiresAuth: true,
    navId: "dhl-dashboard",
    navOrder: 100,
  },
  {
    path: "dhl/shipments",
    title: "DHL Envios",
    description: "Gestão de envios DHL",
    segment: "private",
    requiresAuth: true,
    navId: "dhl-shipments",
    navOrder: 101,
  },
  // Portal Service Provider (hierarquia abaixo; vistas para o SP)
  {
    path: "dhl/portal/dashboard",
    title: "SP Portal – Dashboard",
    description: "Dashboard do Service Provider (apenas as suas métricas)",
    segment: "private",
    requiresAuth: true,
    navId: "dhl-portal-dashboard",
    navOrder: 200,
  },
  {
    path: "dhl/portal/profile",
    title: "SP Portal – My Profile",
    description: "Editar perfil da empresa",
    segment: "private",
    requiresAuth: true,
    navId: "dhl-portal-profile",
    navOrder: 201,
  },
  {
    path: "dhl/portal/drivers",
    title: "SP Portal – Drivers",
    description: "Listar e criar drivers",
    segment: "private",
    requiresAuth: true,
    navId: "dhl-portal-drivers",
    navOrder: 202,
  },
  {
    path: "dhl/portal/vehicles",
    title: "SP Portal – Vehicles",
    description: "Listar e criar veículos",
    segment: "private",
    requiresAuth: true,
    navId: "dhl-portal-vehicles",
    navOrder: 203,
  },
  {
    path: "dhl/portal/contracts",
    title: "SP Portal – Contracts",
    description: "Contratos do SP (read-only)",
    segment: "private",
    requiresAuth: true,
    navId: "dhl-portal-contracts",
    navOrder: 204,
  },
  {
    path: "dhl/portal/sop-feed",
    title: "SP Portal – SOP Feed",
    description: "SOP Feed (read-only)",
    segment: "private",
    requiresAuth: true,
    navId: "dhl-portal-sop-feed",
    navOrder: 205,
  },
];

/** Prefixo base das rotas DHL no app (Next.js App Router) */
export const DHL_ROUTE_PREFIX = "dhl";
