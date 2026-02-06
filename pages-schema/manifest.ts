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
  // Adicionar aqui novas páginas do subsistema DHL
];

/** Prefixo base das rotas DHL no app (Next.js App Router) */
export const DHL_ROUTE_PREFIX = "dhl";
