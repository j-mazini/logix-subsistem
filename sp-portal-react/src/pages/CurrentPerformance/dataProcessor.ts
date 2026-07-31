import { parseDateLocal } from './utils';
import { parseWorkedHoursToDecimal } from '@/lib/performance-utils';

export interface DayData {
  day: number;
  dayOfWeek: number;
  route: string;
  stops: number | string;
  sporH: string;
  tw: string;
  spr: number | string;
  sporHClass?: string;
  twClass?: string;
  sprClass?: string;
}

export interface DailyOverview {
  operationId: number;
  routeId: number;
  routeName: string;
  amountTotal: string;
  totalStops: number;
  totalPaidStops: number;
  totalUnpaidStops: number;
  departTime: string | null;
  arriveTime: string | null;
  workedHours: number | null;
  breakMinutes: number;
  extra: number;
  adhocSort: number;
  routeSort: number;
  rate: number;
  operationCostModel: number;
  costModelName: string;
  status: string;
  dateName: string;
  percentageOnTime: number;
  sporh: number;
}

export interface MonthOverview {
  currentMonth: {
    name: string;
    daysWorked: number;
    totalAmount: string;
    averagePerDay: string;
  };
  dailyEarnings: Array<{
    date: string;
    dateName: string;
    amount: string;
    operations?: DailyOverview[];
    totalAmount?: string | null;
    calculatedAmount?: string;
  }>;
}

export const processMonthData = (
  data: MonthOverview,
  year: number,
  month: number,
  today: Date,
  getSporHClass: (value: string) => string,
  getTimeWindowClass: (value: string) => string
): DayData[] => {
  const mappedData: DayData[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = new Date(year, month, 1).getDay();

  const dataByDay: { [key: number]: DailyOverview[] } = {};
  data.dailyEarnings.forEach(earning => {
    const dateObj = parseDateLocal(earning.date);
    const day = dateObj.getDate();
    if (earning.operations && earning.operations.length > 0) {
      dataByDay[day] = earning.operations;
    }
  });

  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = (startDayOfWeek + day - 1) % 7;
    if (dayOfWeek === 0) continue;

    const isCurrentMonth = (year === today.getFullYear() && month === today.getMonth());
    const isFutureMonth = (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth()));

    if (isFutureMonth || (isCurrentMonth && day > today.getDate())) {
      mappedData.push({
        day,
        dayOfWeek,
        route: '--:--',
        stops: '--:--',
        sporH: '--:--',
        tw: '--:--',
        spr: '--:--',
      });
      continue;
    }

    const dayOperations = dataByDay[day];

    if (!dayOperations || dayOperations.length === 0) {
      mappedData.push({
        day,
        dayOfWeek,
        route: '--:--',
        stops: '--:--',
        sporH: '--:--',
        tw: '--:--',
        spr: '--:--',
      });
      continue;
    }

    let totalStops = 0;
    let onRoadHours = 0;
    let hasDeliveryDetails = false;
    let totalTw = 0;
    const routeNames: string[] = [];
    let validTwCount = 0;

    dayOperations.forEach(op => {
      totalStops += op.totalStops || 0;
      routeNames.push(op.routeName || '--:--');

      const hours = parseWorkedHoursToDecimal(op.workedHours ?? 0);
      if (hours > 0) {
        onRoadHours += hours;
        hasDeliveryDetails = true;
      }

      if (op.percentageOnTime !== undefined && op.percentageOnTime !== null && !isNaN(op.percentageOnTime)) {
        let twValue = op.percentageOnTime;
        if (twValue > 0 && twValue <= 1) {
          twValue = twValue * 100;
        }
        totalTw += twValue;
        validTwCount++;
      }
    });

    let sporH: string;
    if (!hasDeliveryDetails) {
      sporH = '0.0';
    } else if (onRoadHours > 0) {
      sporH = (totalStops / onRoadHours).toFixed(1);
    } else {
      sporH = '0.0';
    }

    const sporHClass = sporH !== '--:--' ? getSporHClass(sporH) : 'na-value';

    let tw = '--:--';
    let twClass = 'na-value';

    if (validTwCount > 0) {
      const avgTw = totalTw / validTwCount;
      tw = avgTw === 0 ? '0.0%' : `${avgTw.toFixed(1)}%`;
      twClass = getTimeWindowClass(tw);
    }

    const spr = totalStops > 0 ? totalStops : '--:--';
    const route = routeNames.length > 0 ? routeNames[0] : '--:--';

    mappedData.push({
      day,
      dayOfWeek,
      route,
      stops: totalStops > 0 ? totalStops : '--:--',
      sporH,
      tw,
      spr,
      sporHClass,
      twClass,
      sprClass: 'neutral-value',
    });
  }

  return mappedData;
};

export const calculateAverages = (data: DayData[]) => {
  let totalSporH = 0, countSporH = 0;
  let totalTw = 0, countTw = 0;
  let totalSpr = 0, countSpr = 0;

  data.forEach(d => {
    const sprValue =
      d.spr === 'N/A' || d.spr === '--:--'
        ? NaN
        : typeof d.spr === 'number'
        ? d.spr
        : parseFloat(d.spr);
    const hasStops = !isNaN(sprValue) && sprValue > 0;
    if (!hasStops) return;

    totalSpr += sprValue;
    countSpr++;

    if (d.sporH !== 'N/A' && d.sporH !== '--:--') {
      const v = parseFloat(d.sporH);
      if (!isNaN(v)) {
        totalSporH += v;
        countSporH++;
      }
    }

    if (d.tw !== 'N/A' && d.tw !== '--:--') {
      const v = parseFloat(d.tw);
      if (!isNaN(v)) {
        totalTw += v;
        countTw++;
      }
    }
  });

  if (countSporH === 0 && countTw === 0 && countSpr === 0 && data.length > 0) {
    return {
      avgSporH: '--:--',
      avgTw: '--:--',
      avgSpr: '--:--',
    };
  }

  const avgSporH = countSporH > 0 ? (totalSporH / countSporH).toFixed(1) : '--:--';
  const avgTw = countTw > 0 ? (totalTw / countTw).toFixed(1) : '--:--';
  const avgSpr = countSpr > 0 ? Math.round(totalSpr / countSpr) : '--:--';

  return {
    avgTw: avgTw !== '--:--' ? avgTw + '%' : '--:--',
    avgSpr: avgSpr.toString(),
    avgSporH: avgSporH,
  };
};
