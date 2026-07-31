import { DayOverviewResponse } from './types';

export const isDayOff = (operation: DayOverviewResponse): boolean => {
  return (
    operation.status?.toLowerCase().includes('day off') ||
    operation.status?.toLowerCase().includes('dayoff') ||
    operation.note?.toLowerCase().includes('day off') ||
    operation.note?.toLowerCase().includes('dayoff') ||
    operation.route.routeName.toUpperCase() === "DAY OFF" ||
    operation.route.routeName.toUpperCase() === "OFF"
  );
};

export const calculateAvgHourlyRate = (
  operation: DayOverviewResponse,
  totalRevenue: number
): number => {
  const { departTime, arriveTime } = operation.deliveryDetails;
  const routeName = operation.route.routeName;

  if (!departTime || !arriveTime) {
    return 0;
  }

  try {
    const depart = new Date(`1970-01-01T${departTime}`);
    const arrive = new Date(`1970-01-01T${arriveTime}`);
    const breakMinutes = operation.dailyMetrics.breakMinutes || 0;

    if (arrive < depart) {
      arrive.setDate(arrive.getDate() + 1);
    }

    let initialWorkHours = new Date('1970-01-01T07:30:00');
    const firstRouteName = routeName.charAt(0);
    switch (firstRouteName) {
      case 'D':
        initialWorkHours = new Date('1970-01-01T07:30:00');
        break;
      case 'L':
        initialWorkHours = new Date('1970-01-01T06:45:00');
        break;
      case 'M':
        initialWorkHours = new Date('1970-01-01T07:45:00');
        break;
      default:
        initialWorkHours = new Date('1970-01-01T07:30:00');
    }

    const hoursWorked = ((((arrive.getHours()*60) + arrive.getMinutes()) - ((initialWorkHours.getHours()*60) + initialWorkHours.getMinutes()) - breakMinutes));

    if (hoursWorked <= 0) {
      return 0;
    }

    return (totalRevenue / hoursWorked) * 60;
  } catch {
    return 0;
  }
};

export const shouldShowStopsSection = (routeName: string): boolean => {
  const firstChar = routeName.charAt(0);
  return firstChar !== 'B' && firstChar !== 'S' && firstChar !== 'O';
};
