import React from 'react';

/** Minimal stand-in for the Next.js app's shadcn `Input` — no cva/Radix dependency here. */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export default Input;
