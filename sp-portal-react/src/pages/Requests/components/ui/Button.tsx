import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'destructive';
  size?: 'default' | 'sm';
}

const VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-slate-900 text-white hover:bg-slate-800',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
};

const SIZE_CLASS: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-xs',
};

/** Minimal stand-in for the Next.js app's shadcn `Button` — no cva/Radix dependency here. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export default Button;
