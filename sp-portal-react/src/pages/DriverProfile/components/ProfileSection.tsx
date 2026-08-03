import type { ReactNode } from "react";
import { driverProfileStyles as styles, SECTION_TONE, type SectionTone } from "../styles";

interface ProfileSectionProps {
  /** Bootstrap icon class, e.g. "bi-person-vcard". */
  icon: string;
  title: string;
  subtitle?: string;
  /** Header badge colour — gives the stack of cards some rhythm and marks the money/legal ones apart. */
  tone?: SectionTone;
  children: ReactNode;
}

/** Glass card with an icon header — the driver-side equivalent of the SP profile's `.sp-profile-section`. */
export function ProfileSection({ icon, title, subtitle, tone = "violet", children }: ProfileSectionProps) {
  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div className={`${styles.sectionIcon} ${SECTION_TONE[tone]}`}>
          <i className={`bi ${icon} text-lg leading-none`} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className={styles.sectionTitle}>{title}</h2>
          {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
        </div>
      </header>
      <div className={styles.fieldGrid}>{children}</div>
    </section>
  );
}
