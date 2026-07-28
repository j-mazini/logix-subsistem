import React from 'react';

export interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'sidebar' | 'success';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    children: React.ReactNode;
}

/**
 * Trimmed port of the Next.js app's `StyledButton` — only the `sidebar` variant is
 * used by the Daily Game Plan page, so the other seven variants (primary,
 * neo-glass, liquid-glass, ...) weren't ported.
 */
export const StyledButton = React.forwardRef<HTMLButtonElement, StyledButtonProps>(
    ({ variant = 'sidebar', size = 'md', className = '', children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={`dgp-styled-btn dgp-styled-btn--${variant} dgp-styled-btn--${size} ${className}`}
                disabled={disabled}
                {...props}
            >
                {children}
            </button>
        );
    }
);
StyledButton.displayName = 'StyledButton';

export default StyledButton;
