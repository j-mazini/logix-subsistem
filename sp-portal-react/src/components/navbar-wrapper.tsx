// @ts-nocheck
import { PortalLayout } from '../layout/PortalLayout';

export default function NavbarWrapper({ children }) {
  return (
    <PortalLayout mainClassName="w-full">
      {children}
    </PortalLayout>
  );
}
