// @ts-nocheck
import React, { memo } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { dailyOperationsReportsStyles } from '../styles';

interface Column {
  key: string;
  label: string;
  sortable: boolean;
  className?: string;
}

interface TableHeaderProps {
  columns: Column[];
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export const TableHeader = memo<TableHeaderProps>(({
  columns,
  sortField,
  sortDirection,
  onSort,
}) => {
  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            className={`${dailyOperationsReportsStyles.tableHeaderTh} ${
              column.sortable ? dailyOperationsReportsStyles.tableHeaderThSortable : ''
            } ${column.className || ''}`}
            onClick={() => column.sortable && onSort(column.key)}
          >
            <div className={dailyOperationsReportsStyles.tableHeaderContent}>
              {column.label.includes('\n') ? (
                <div className={dailyOperationsReportsStyles.tableHeaderMultiLine}>
                  {column.label.split('\n').map((line, idx) => (
                    <span key={idx}>{line}</span>
                  ))}
                  {column.sortable && sortField === column.key && (
                    sortDirection === 'asc' ? <ArrowDown className={dailyOperationsReportsStyles.tableHeaderSortIcon} /> : <ArrowUp className={dailyOperationsReportsStyles.tableHeaderSortIcon} />
                  )}
                </div>
              ) : (
                <>
                  {column.label}
                  {column.sortable && sortField === column.key && (
                    sortDirection === 'asc' ? <ArrowDown className={dailyOperationsReportsStyles.tableHeaderSortIcon} /> : <ArrowUp className={dailyOperationsReportsStyles.tableHeaderSortIcon} />
                  )}
                </>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
});

TableHeader.displayName = 'TableHeader';

