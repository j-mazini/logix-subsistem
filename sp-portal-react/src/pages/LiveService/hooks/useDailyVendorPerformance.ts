import { useMemo } from 'react';
import { Deliverer } from '../types';
import {
  calculateAverages,
  calculateSPR,
  calculateSPORH,
  buildKpiCards,
  DayRecord,
  KpiCard,
  OperationLike,
} from '../../VendorPerformance/VendorPerformance';

const formatHHMM = (iso?: string) => (iso ? new Date(iso).toISOString().slice(11, 16) : null);

/** Constrói o "dia" de um deliverer no mesmo formato usado pelo Vendor Performance
 * (paidStops/unpaidStops/depart-arrive), a partir dos dados ao vivo do Live Service.
 * Usa assignedPackages/deliveredPackages — a mesma contagem já exibida no Team
 * Status — em vez do pool de MOCK_DELIVERIES (pequeno demais pra refletir a
 * carga real de cada van). "Failed" só existe depois que a rota fecha (arrived):
 * antes disso a diferença assigned-delivered é só trabalho ainda não tentado. */
function toDayRecord(deliverer: Deliverer): DayRecord {
  const isComplete = deliverer.routeStatus === 'arrived';
  const pu = deliverer.deliveredPackages;
  const nr = isComplete ? Math.max(0, deliverer.assignedPackages - deliverer.deliveredPackages) : 0;

  const departTime = formatHHMM(deliverer.departedAt);
  const arriveTime = formatHHMM(deliverer.arrivedAt);

  const operation: OperationLike = {
    deliveryDetails: {
      paidStops: { pu, ok: 0, hn: 0, pd: 0 },
      unpaidStops: { nr, fp: 0, rd: 0, ca: 0, ba: 0, nh: 0, cm: 0 },
      departTime,
      arriveTime,
    },
    dailyMetrics: { breakMinutes: 0 },
  };

  const spr = calculateSPR(operation);
  // SPOR-H exige partida e chegada — vans ainda em rota ("departed") não têm um
  // tempo de trabalho fechado ainda, então ficam de fora da média do dia, igual
  // ao Vendor Performance ignora dias incompletos.
  const sporH = departTime && arriveTime ? calculateSPORH(operation).toFixed(1) : 'N/A';
  // TW só existe depois que a van sai pra rota (antes disso não houve entrega
  // pra estar dentro ou fora da janela prometida).
  const tw = deliverer.routeStatus === 'sort' ? 'N/A' : `${deliverer.timeWindowPct.toFixed(1)}%`;

  return {
    day: new Date().getDate(),
    dayOfWeek: new Date().getDay(),
    route: deliverer.routeName,
    pu,
    ok: 0,
    hn: 0,
    pd: 0,
    nr,
    fp: 0,
    ba: 0,
    nh: 0,
    cm: 0,
    ca: 0,
    spr: spr > 0 ? spr : 'N/A',
    sporH,
    tw,
    workedHours: null,
    departTime,
    arriveTime,
  };
}

/** Performance "de hoje" — mesmas fórmulas (SPR/SPOR-H/AFD/TW) e mesma agregação
 * do Vendor Performance, para o dia corrente. Sem `selectedId`, agrega a frota
 * inteira; com um van selecionado no mapa, mostra só a performance dessa rota. */
export function useDailyVendorPerformance(deliverers: Deliverer[], selectedId: string | null) {
  const kpiCards: KpiCard[] = useMemo(() => {
    const scoped = selectedId ? deliverers.filter(d => d.id === selectedId) : deliverers;
    const rows = scoped.map(toDayRecord);
    const dailyAverages = calculateAverages(rows);
    return buildKpiCards(dailyAverages, false);
  }, [deliverers, selectedId]);

  return { kpiCards };
}
