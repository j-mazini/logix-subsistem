// @ts-nocheck
﻿import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchDepositsWithServiceTypesAndRoutes, DepositWithServiceTypesAndRoutesDTO } from '@/lib/serviceTypes';
import { extractLoop } from '../utils';
import { extractUniqueDepots, extractUniqueLoops } from '../dataProcessor';
import type { TransformedReportData } from '../types';

export const useFiltersData = (transformedData: TransformedReportData[], depotFilter: string) => {
  const [depositsData, setDepositsData] = useState<DepositWithServiceTypesAndRoutesDTO[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const initialDataLoadedRef = useRef(false);
  const depotToDepositIdMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const fetchInitialFiltersData = async () => {
      if (initialDataLoadedRef.current) return;

      try {
        setLoadingFilters(true);
        const data = await fetchDepositsWithServiceTypesAndRoutes();
        setDepositsData(data);
        initialDataLoadedRef.current = true;

        data.forEach(deposit => {
          if (deposit.depositName &&
            deposit.serviceTypes &&
            deposit.serviceTypes.length > 0) {
            depotToDepositIdMapRef.current.set(deposit.depositName, deposit.depositId);
          }
        });

        data.forEach(deposit => {
          deposit.serviceTypes.forEach(serviceType => {
            const isFlexServiceType = serviceType.name?.includes('_FLEX') || serviceType.name?.includes('FLEX');
            const serviceTypeName = serviceType.name || '';
            const baseLoopFromName = serviceTypeName.replace(/_FLEX$/i, '').replace(/FLEX/i, '').trim();
            const baseLoop = extractLoop(baseLoopFromName) || extractLoop(serviceTypeName);

            serviceType.routes.forEach(route => {
              if (route.routeName) {
                const routeLoop = extractLoop(route.routeName);
                if (routeLoop) {
                  const loopKey = isFlexServiceType ? `${routeLoop}_FLEX` : routeLoop;
                  if (isFlexServiceType) {
                    // Also map base loop (without _FLEX) for lookup
                  }
                }
              }
            });

            if (serviceType.routes.length === 0 && baseLoop) {
              const loopKey = isFlexServiceType ? `${baseLoop}_FLEX` : baseLoop;
            }
          });
        });
      } catch (err: any) {
        console.error('Error fetching initial deposits with service types and routes:', err);
      } finally {
        setLoadingFilters(false);
      }
    };

    fetchInitialFiltersData();
  }, []);

  const uniqueDepots = useMemo(() => {
    const depotsSet = new Set<string>();

    depositsData.forEach(deposit => {
      if (deposit.depositName &&
        deposit.serviceTypes &&
        deposit.serviceTypes.length > 0) {
        const hasRoutes = deposit.serviceTypes.some(serviceType =>
          serviceType.routes && serviceType.routes.length > 0
        );

        if (hasRoutes) {
          depotsSet.add(deposit.depositName);
        }
      }
    });

    const depotsFromData = extractUniqueDepots(transformedData);
    depotsFromData.forEach(depot => depotsSet.add(depot));

    return Array.from(depotsSet).sort();
  }, [depositsData, transformedData]);

  const uniqueLoops = useMemo(() => {
    const loopsSet = new Set<string>();

    depositsData.forEach(deposit => {
      if (depotFilter !== 'All') {
        const depositId = depotToDepositIdMapRef.current.get(depotFilter);
        if (depositId !== undefined && deposit.depositId !== depositId) {
          return;
        }
      }

      deposit.serviceTypes.forEach(serviceType => {
        serviceType.routes.forEach(route => {
          if (route.routeName) {
            const loop = extractLoop(route.routeName);
            if (loop) {
              loopsSet.add(loop);
            }
          }
        });
      });
    });

    const loopsFromData = extractUniqueLoops(transformedData);
    loopsFromData.forEach(loop => loopsSet.add(loop));

    return Array.from(loopsSet).sort();
  }, [depositsData, transformedData, depotFilter]);

  return { depositsData, loadingFilters, uniqueDepots, uniqueLoops };
};



