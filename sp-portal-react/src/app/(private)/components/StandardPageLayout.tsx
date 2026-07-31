import { ReactNode } from "react";
import { motion } from "framer-motion";
import { GradientDotsBackground } from "./GradientDotsBackground";
import { WelcomeHeader } from "./WelcomeHeader";
import { MobileNavBar } from "./MobileNavBar";
import { DesktopNavBar } from "./DesktopNavBar";
import "../tailwind.css";

interface StandardPageLayoutProps {
  children: ReactNode;
  showWelcomeHeader?: boolean;
  bottomPadding?: string;
}

export function StandardPageLayout({
  children,
  showWelcomeHeader = false,
  bottomPadding = "pb-[70px]",
}: StandardPageLayoutProps) {
  return (
    <GradientDotsBackground className="driver-tw-scope relative min-h-screen z-[1] pointer-events-auto overflow-x-hidden w-full">
      <div className={`max-w-full min-h-screen ${bottomPadding} md:pb-28`}>
        <div
          className="md:hidden"
          style={{
            height: "env(safe-area-inset-top, 0px)",
            minHeight: "env(safe-area-inset-top, 0px)",
          }}
        />

        {showWelcomeHeader && (
          <div className="hidden md:block">
            <WelcomeHeader />
          </div>
        )}

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="mx-auto w-full max-w-full min-w-0 px-[clamp(0.75rem,4vw,1rem)] sm:px-6 lg:px-10 pt-4 sm:pt-8 lg:pt-9 pb-12 lg:pb-14 relative z-[1]"
        >
          {children}
        </motion.main>

        <div
          className="md:hidden"
          style={{
            height: "env(safe-area-inset-bottom, 0px)",
            minHeight: "env(safe-area-inset-bottom, 0px)",
          }}
        />
      </div>

      {/* Mounted per-page rather than in a shared root layout — this Vite
          app has no Next.js-style app/(private)/layout.tsx wrapper, and both
          bars are fixed-positioned so their place in the tree doesn't affect
          layout. */}
      <DesktopNavBar />
      <MobileNavBar />
    </GradientDotsBackground>
  );
}
