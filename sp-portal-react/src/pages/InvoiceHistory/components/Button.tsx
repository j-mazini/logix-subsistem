import React from 'react';

/** Minimal Bootstrap-styled stand-in for the Next.js app's shadcn `Button` — this page is Bootstrap-based, not Tailwind. */
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <button ref={ref} className={`btn btn-primary ${className}`} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export default Button;
