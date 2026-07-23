// Barrel for the Vetting pages.
//
// The faithful dhl-vetting-v2 admin ports (dashboard, checklist, interview)
// live in ./vetting, ./checklist and ./interview, with Firebase/auth replaced
// by local shims (./shims) — everything persists to localStorage.
//
// The legacy portal-styled pages (VettingChecklist/VettingInterview) remain
// exported for reference but are no longer routed.

export {
  VettingAdminLayout,
  VettingDashboardPage,
  VettingChecklistPage,
  VettingInterviewPage,
} from './layout';
export { VettingChecklist } from './VettingChecklist';
export { VettingInterview } from './VettingInterview';
