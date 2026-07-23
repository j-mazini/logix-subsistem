// Faithful port of the dhl-vetting-v2 admin pages (dashboard, checklist,
// interview/knowledge test). Firebase/auth are replaced by local shims (see
// ./shims) — everything persists to localStorage, no backend involved.

import { Outlet } from 'react-router-dom';
import { AdminCandidateProvider } from './components/admin/AdminCandidateContext';
import './vetting-globals.css';
import VettingDashboardPage from './vetting/page';
import VettingChecklistPage from './checklist/page';
import VettingInterviewPage from './interview/page';

/** Shared layout route: keeps the selected-candidate context alive across the
 *  dashboard/checklist/interview pages, mirroring Next's admin/layout.tsx. */
export function VettingAdminLayout() {
  return (
    <AdminCandidateProvider>
      <div className="vetting-v2-scope">
        <Outlet />
      </div>
    </AdminCandidateProvider>
  );
}

export { VettingDashboardPage, VettingChecklistPage, VettingInterviewPage };
