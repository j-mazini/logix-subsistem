import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AccessSelect } from './pages/AccessSelect/AccessSelect';
import { Profile } from './pages/Profile/Profile';
import { Login } from './pages/Login/Login';
import { Select } from './pages/Select/Select';
import { Announcements } from './pages/Announcements/Announcements';
import { Assets } from './pages/Assets/Assets';
import { Contracts } from './pages/Contracts/Contracts';
import { Invoices } from './pages/Invoices/Invoices';
import { RequestsAdmin } from './pages/RequestsAdmin/RequestsAdmin';
import { VendorPerformance } from './pages/VendorPerformance/VendorPerformance';
import { AdhocInvoiceManagement } from './pages/AdhocInvoiceManagement/AdhocInvoiceManagement';
import { DeductionsDisbursementsRecharges } from './pages/DeductionsDisbursementsRecharges/DeductionsDisbursementsRecharges';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { DailyFinancialInsights } from './pages/DailyFinancialInsights/DailyFinancialInsights';
import { DailyOperationsManagement } from './pages/DailyOperationsManagement/DailyOperationsManagement';
import { DailyOperationsReports } from './pages/DailyOperationsReports/DailyOperationsReports';
import { Drivers } from './pages/Drivers/Drivers';
import { RouteBalance } from './pages/RouteBalance/RouteBalance';
import { SOPFeed } from './pages/SOPFeed/SOPFeed';
import { Vehicles } from './pages/Vehicles/Vehicles';
import {
  VettingAdminLayout,
  VettingChecklistPage,
  VettingDashboardPage,
  VettingInterviewPage,
} from './pages/Vetting';
import { WeekPlanner } from './pages/WeekPlanner/WeekPlanner';
import { useViewportAttribute } from './hooks/useViewportAttribute';
import { useRefinementsMotion } from './hooks/useRefinementsMotion';

function App() {
  useViewportAttribute();
  useRefinementsMotion();

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AccessSelect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/select" element={<Select />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/requests-admin" element={<RequestsAdmin />} />
        <Route path="/vendor-performance" element={<VendorPerformance />} />
        <Route path="/adhoc-invoice-management" element={<AdhocInvoiceManagement />} />
        <Route path="/deductions-disbursements-recharges" element={<DeductionsDisbursementsRecharges />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/daily-financial-insights" element={<DailyFinancialInsights />} />
        <Route path="/daily-operations-management" element={<DailyOperationsManagement />} />
        <Route path="/daily-operations-reports" element={<DailyOperationsReports />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/route-balance" element={<RouteBalance />} />
        <Route path="/sop-feed" element={<SOPFeed />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/vetting-admin" element={<Navigate to="/vetting-dashboard" replace />} />
        <Route element={<VettingAdminLayout />}>
          <Route path="/vetting-dashboard" element={<VettingDashboardPage />} />
          <Route path="/vetting-checklist" element={<VettingChecklistPage />} />
          <Route path="/vetting-interview" element={<VettingInterviewPage />} />
        </Route>
        <Route path="/week-planner" element={<WeekPlanner />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
