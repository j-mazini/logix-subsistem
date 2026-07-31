import React from 'react';

/** Minimal stand-in for the Next.js app's shadcn `Table` — plain semantic elements, no Radix dependency. */
export function Table({ className = '', ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={`w-full caption-bottom text-sm ${className}`} {...props} />
    </div>
  );
}

export function TableHeader({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`[&_tr]:border-b ${className}`} {...props} />;
}

export function TableBody({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} />;
}

export function TableRow({ className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`border-b border-slate-100 ${className}`} {...props} />;
}

export function TableHead({ className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`h-10 px-2 text-left align-middle font-medium text-slate-700 whitespace-nowrap ${className}`}
      {...props}
    />
  );
}

export function TableCell({ className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`p-2 align-middle whitespace-nowrap ${className}`} {...props} />;
}

export default Table;
