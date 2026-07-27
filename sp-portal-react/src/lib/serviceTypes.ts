export interface RouteDTO {
  routeName?: string;
  routeId?: number;
  [key: string]: any;
}

export interface ServiceTypeDTO {
  serviceTypeId: number;
  name?: string;
  routes?: RouteDTO[];
  [key: string]: any;
}

export interface DepositWithServiceTypesAndRoutesDTO {
  depositId?: number;
  depositName?: string;
  serviceTypes?: ServiceTypeDTO[];
  [key: string]: any;
}
export { fetchDepositsWithServiceTypesAndRoutes } from './daily-operations-api';
