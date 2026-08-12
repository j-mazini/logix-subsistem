import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { GradientDotsBackground } from './GradientDotsBackground';

/**
 * Simplified port of the reference app's StandardPageLayout/PageHeader/
 * PageSection/PageContent quartet (app/(private)/components/*.tsx). Dropped:
 * MobileHeader/WelcomeHeader (desktop user-menu chrome tied to that app's
 * multi-role auth) and the admin/supervisor viewport branching — this
 * Driver Portal only ever renders as the driver role, and identity/sign-out
 * already live on the Profile tab.
 */
export function StandardPageLayout({ children }: { children: ReactNode }) {
  return (
    <GradientDotsBackground className="relative min-h-full w-full">
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-[1] mx-auto w-full max-w-full min-w-0 px-1"
      >
        {children}
      </motion.main>
    </GradientDotsBackground>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="pt-2 pb-3 px-1"
    >
      <h1 className="text-[1.4rem] font-extrabold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </motion.div>
  );
}

export function PageSection({ children, className = 'mb-4' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function PageContent({ children, className = 'space-y-4 pb-4' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
