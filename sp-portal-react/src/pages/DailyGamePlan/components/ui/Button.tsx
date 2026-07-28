import React from 'react';

/** Minimal stand-in for the Next.js app's shadcn `Button` (no cva/Radix dependency here). */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'default', className = '', children, ...props }, ref) => {
        const variantClass = variant === 'outline' ? 'dgp-btn dgp-btn--outline' : 'dgp-btn dgp-btn--default';
        return (
            <button ref={ref} className={`${variantClass} ${className}`} {...props}>
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';

export default Button;
