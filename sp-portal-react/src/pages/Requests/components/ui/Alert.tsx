import React from 'react';

interface AlertProps {
  variant?: 'default' | 'success' | 'destructive';
  className?: string;
  children: React.ReactNode;
}

const VARIANT_CLASS: Record<NonNullable<AlertProps['variant']>, string> = {
  default: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  destructive: 'border-red-200 bg-red-50 text-red-800',
};

export function Alert({ variant = 'default', className = '', children }: AlertProps) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${VARIANT_CLASS[variant]} ${className}`} role="alert">
      {children}
    </div>
  );
}

export function AlertTitle({ children }: { children: React.ReactNode }) {
  return <div className="font-semibold text-sm">{children}</div>;
}

export function AlertDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm ${className}`}>{children}</div>;
}
