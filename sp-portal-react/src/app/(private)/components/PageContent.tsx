import { ReactNode } from "react";

interface PageContentProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function PageContent({
  children,
  className = "space-y-5 lg:space-y-6",
}: PageContentProps) {
  return <div className={className}>{children}</div>;
}
