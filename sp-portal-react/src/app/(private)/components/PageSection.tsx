import { ReactNode } from "react";

interface PageSectionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function PageSection({
  children,
  className = "mb-6",
}: PageSectionProps) {
  return <div className={className}>{children}</div>;
}
