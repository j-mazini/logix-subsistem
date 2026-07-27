// @ts-nocheck
import React from 'react';
import { breakToMinutes, formatValue } from '../utils';

interface TableCellBreakProps {
  breakTime: string | number | null | undefined;
}

export const TableCellBreak: React.FC<TableCellBreakProps> = ({ breakTime }) => {
  if (!breakTime) return <span>---</span>;
  const minutes = breakToMinutes(breakTime);
  const isRed = minutes !== null && minutes < 30;
  return (
    <span className={isRed ? 'text-[#dc3545] font-semibold' : ''}>
      {formatValue(breakTime)}
    </span>
  );
};

