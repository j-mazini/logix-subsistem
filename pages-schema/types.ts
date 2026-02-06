/**
 * Tipos do esquema de páginas do subsistema DHL.
 * Utilizados pelo manifest e pelas definições de rotas.
 */

export type RouteSegment = "private" | "public";

export interface PageSchema {
  /** Caminho da rota (ex: "dhl/dashboard") */
  path: string;
  /** Nome legível da página */
  title: string;
  /** Descrição opcional */
  description?: string;
  /** Segmento: área privada ou pública */
  segment: RouteSegment;
  /** Se a página requer autenticação (derivado de segment por defeito) */
  requiresAuth?: boolean;
  /** Ícone ou identificador para navegação */
  navId?: string;
  /** Ordem na navegação (menor = mais acima) */
  navOrder?: number;
}

export interface RouteFolderSchema extends PageSchema {
  /** Caminho do ficheiro page.tsx relativo ao app (ex: "(private)/dhl/dashboard") */
  appPath: string;
}
