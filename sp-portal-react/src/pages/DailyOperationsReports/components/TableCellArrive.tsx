// @ts-nocheck
import React from 'react';
import { timeToMinutes, extractLoop, isFlexRoute } from '../utils';

interface TableCellArriveProps {
  arrive: string | null;
  route: string;
  depot: string;
}

export const TableCellArrive: React.FC<TableCellArriveProps> = ({ arrive, route, depot }) => {
  if (!arrive) return <span>---</span>;
  
  const isFlex = isFlexRoute(route);
  const arriveMinutes = timeToMinutes(arrive);
  const loop = extractLoop(route);
  let shouldBeRed = false;
  
  if (arriveMinutes !== null && !isFlex) {
    // Regra 1: Depot MSE ou LCY < 17:00 (1020 min)
    if ((depot === 'MSE' || depot === 'LCY') && arriveMinutes < 1020) {
      shouldBeRed = true;
    }
    // Regra 2: Loop LL3 ou LL4 < 18:00 (1080 min)
    if ((loop === 'LL3' || loop === 'LL4') && arriveMinutes < 1080) {
      shouldBeRed = true;
    }
  }
  
  return (
    <span className={shouldBeRed ? 'text-[#dc3545] font-semibold' : ''}>
      {arrive}
    </span>
  );
};

