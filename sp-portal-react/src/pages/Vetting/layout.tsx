// Faithful port of the dhl-vetting-v2 admin pages (dashboard, checklist,
// interview/knowledge test). Firebase/auth are replaced by local shims (see
// ./shims) — everything persists to localStorage, no backend involved.
//
// The pages render inside the SP portal chrome (PortalLayout: beam sidebar,
// liquid-glass background, admin header) and are re-themed to the portal's
// design language via the scoped tokens in vetting-globals.css.

import { Outlet, useLocation } from 'react-router-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import { AdminCandidateProvider } from './components/admin/AdminCandidateContext';
import './vetting-globals.css';
import VettingDashboardPage from './vetting/page';
import VettingChecklistPage from './checklist/page';
import VettingInterviewPage from './interview/page';

const TITLES: Record<string, string> = {
  '/vetting-dashboard': 'Driver Vetting',
  '/vetting-checklist': 'Vetting Checklist',
  '/vetting-interview': 'Knowledge Test',
};

/** Shared layout route: keeps the selected-candidate context alive across the
 *  dashboard/checklist/interview pages, mirroring Next's admin/layout.tsx. */
export function VettingAdminLayout() {
  const { pathname } = useLocation();
  return (
    <AdminCandidateProvider>
      <PortalLayout mainClassName="vendor-admin-main" title={TITLES[pathname] ?? 'Driver Vetting'}>
        <div className="vetting-v2-scope">
          <Outlet />
        </div>
      </PortalLayout>
    </AdminCandidateProvider>
  );
}

export { VettingDashboardPage, VettingChecklistPage, VettingInterviewPage };
