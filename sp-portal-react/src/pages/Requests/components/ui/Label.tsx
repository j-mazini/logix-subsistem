import React from 'react';

export function Label({ children, className = '', ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`text-sm font-medium text-slate-700 ${className}`} {...props}>
      {children}
    </label>
  );
}

export default Label;
