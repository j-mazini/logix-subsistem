import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * Port of the Next.js app's `FadeIn` (from `components/animations/page-animation`).
 * `framer-motion` is already a dependency of this app (used across other ported
 * pages), so this drops the `LazyMotion`/`m` indirection and uses `motion.div`
 * directly — same animation, one less abstraction layer.
 */
export function FadeIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export default FadeIn;
