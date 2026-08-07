import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AnnouncementsProvider } from './context/AnnouncementsContext';
import { AccessSelect } from './pages/AccessSelect/AccessSelect';
import { Profile } from './pages/Profile/Profile';
import { Login } from './pages/Login/Login';
import { Select } from './pages/Select/Select';
import { Announcements } from './pages/Announcements/Announcements';
import { Assets } from './pages/Assets/Assets';
import { Logistics } from './pages/Logistics/Logistics';
import { Contracts } from './pages/Contracts/Contracts';
import { Invoices } from './pages/Invoices/Invoices';
import { RequestsAdmin } from './pages/RequestsAdmin/RequestsAdmin';
import { RequestsInbox } from './pages/RequestsInbox/RequestsInbox';
import { VendorPerformance } from './pages/VendorPerformance/VendorPerformance';
import { AdhocInvoiceManagement } from './pages/AdhocInvoiceManagement/AdhocInvoiceManagement';
import { FinancialInvoices } from './pages/FinancialInvoices/FinancialInvoices';
import { ServicePartnerInvoices } from './pages/ServicePartnerInvoices/ServicePartnerInvoices';
import { DeductionsDisbursementsRecharges } from './pages/DeductionsDisbursementsRecharges/DeductionsDisbursementsRecharges';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { DailyFinancialInsights } from './pages/DailyFinancialInsights/DailyFinancialInsights';
import { DailyOperationsManagement } from './pages/DailyOperationsManagement/DailyOperationsManagement';
import { DailyGamePlan } from './pages/DailyGamePlan/DailyGamePlan';
import { DailyOperationsReports } from './pages/DailyOperationsReports/DailyOperationsReports';
import { RouteBalance } from './pages/RouteBalance/RouteBalance';
import { RouteBalanceUpload } from './pages/RouteBalance/RouteBalanceUpload';
import { SOPFeed } from './pages/SOPFeed/SOPFeed';
import { Vehicles } from './pages/Vehicles/Vehicles';
import {
  VettingAdminLayout,
  VettingChecklistPage,
  VettingInterviewPage,
} from './pages/Vetting';
import { DriverLogin } from './pages/DriverLogin/DriverLogin';
import {
  DriverLayout,
  DriverInsights,
  DriverProfile,
  DriverDeductions,
  DriverMonth,
  DriverPerformance,
  DriverInvoice,
  DriverRequests,
} from './pages/Driver';
import { WeekPlanner } from './pages/WeekPlanner/WeekPlanner';
import { Workforce } from './pages/Workforce/Workforce';
import { LiveService } from './pages/LiveService/LiveService';
import { CurrentMonth } from './pages/CurrentMonth/CurrentMonth';
import { CurrentPerformance } from './pages/CurrentPerformance/CurrentPerformance';
import { DailyPerformanceInsight } from './pages/DailyPerformanceInsight/DailyPerformanceInsight';
import { Deductions } from './pages/Deductions/Deductions';
import { InvoiceHistory } from './pages/InvoiceHistory/InvoiceHistory';
import { MobileInvoice } from './pages/MobileInvoice/MobileInvoice';
import { Requests } from './pages/Requests/Requests';
import { Subcontractor } from './pages/Subcontractor/Subcontractor';
import { MyDeliveries } from './pages/MyDeliveries/MyDeliveries';
import { MyCases } from './pages/MyCases/MyCases';
import { MySchedule } from './pages/MySchedule/MySchedule';
import { DriverProfile } from './pages/DriverProfile/DriverProfile';
import { TraceQueries } from './pages/TraceQueries/TraceQueries';
import { useViewportAttribute } from './hooks/useViewportAttribute';
import { useRefinementsMotion } from './hooks/useRefinementsMotion';

/**
 * Redirect para a Workforce numa aba concreta, preservando a query.
 *
 * `<Navigate to="/workforce?tab=x" />` não serve: descartaria o `?sp=`, e
 * sem ele useCurrentSp não resolve o Service Provider e a página abre vazia.
 */
function WorkforceRedirect({ tab }: { tab: string }) {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set('tab', tab);
  return <Navigate to={`/workforce?${next.toString()}`} replace />;
}

function App() {
  useViewportAttribute();
  useRefinementsMotion();

  return (
    <HashRouter>
      {/* Inside the router on purpose: the provider reads ?sp= from the URL. */}
      <AnnouncementsProvider>
        <Routes>
          <Route path="/" element={<AccessSelect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/select" element={<Select />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/logistics" element={<Logistics />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/requests-admin" element={<RequestsAdmin />} />
          <Route path="/requests-inbox" element={<RequestsInbox />} />
          <Route path="/trace-queries" element={<TraceQueries />} />
          <Route path="/vendor-performance" element={<VendorPerformance />} />
          <Route path="/adhoc-invoice-management" element={<AdhocInvoiceManagement />} />
          <Route path="/financial-invoices" element={<FinancialInvoices />} />
          <Route path="/service-partner-invoices" element={<ServicePartnerInvoices />} />
          <Route path="/deductions-disbursements-recharges" element={<DeductionsDisbursementsRecharges />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/daily-financial-insights" element={<DailyFinancialInsights />} />
          <Route path="/daily-operations-management" element={<DailyOperationsManagement />} />
          <Route path="/daily-game-plan" element={<DailyGamePlan />} />
          <Route path="/daily-operations-reports" element={<DailyOperationsReports />} />
          {/* Vendors, Compliance e Vetting fundiram-se na Workforce. As rotas
              antigas continuam a responder, cada uma na sua aba. */}
          <Route path="/vendors" element={<WorkforceRedirect tab="vendors" />} />
          <Route path="/drivers" element={<WorkforceRedirect tab="vendors" />} />
          <Route path="/route-balance/upload" element={<RouteBalanceUpload />} />
          <Route path="/route-balance" element={<RouteBalance />} />
          <Route path="/sop-feed" element={<SOPFeed />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vetting-admin" element={<WorkforceRedirect tab="vetting" />} />
          <Route path="/vetting-dashboard" element={<WorkforceRedirect tab="vetting" />} />
          {/* Checklist e Knowledge test continuam em página inteira: são
              fluxos longos por candidato, não uma vista de lista. */}
          <Route element={<VettingAdminLayout />}>
            <Route path="/vetting-checklist" element={<VettingChecklistPage />} />
            <Route path="/vetting-interview" element={<VettingInterviewPage />} />
          </Route>
          {/* Driver Portal — mobile self-service flow, separate bottom-nav shell. */}
          <Route path="/driver-login" element={<DriverLogin />} />
          <Route element={<DriverLayout />}>
            <Route path="/driver" element={<Navigate to="/driver/insights" replace />} />
            <Route path="/driver/insights" element={<DriverInsights />} />
            <Route path="/driver/profile" element={<DriverProfile />} />
            <Route path="/driver/deductions" element={<DriverDeductions />} />
            <Route path="/driver/month" element={<DriverMonth />} />
            <Route path="/driver/performance" element={<DriverPerformance />} />
            <Route path="/driver/invoice" element={<DriverInvoice />} />
            <Route path="/driver/requests" element={<DriverRequests />} />
          </Route>
          <Route path="/week-planner" element={<WeekPlanner />} />
          <Route path="/workforce" element={<Workforce />} />
          <Route path="/compliance" element={<WorkforceRedirect tab="compliance" />} />
          <Route path="/live-service" element={<LiveService />} />
          {/* Driver-facing personal pages: own shell (StandardPageLayout +
              MobileNavBar), ported from the Next.js source's app/(private)/
              courier section rather than the Service Provider admin shell. */}
          <Route path="/current-month" element={<CurrentMonth />} />
          <Route path="/current-performance" element={<CurrentPerformance />} />
          <Route path="/daily-performance-insight" element={<DailyPerformanceInsight />} />
          <Route path="/deductions" element={<Deductions />} />
          <Route path="/invoice-history" element={<InvoiceHistory />} />
          <Route path="/mobile-invoice" element={<MobileInvoice />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/subcontractor" element={<Subcontractor />} />
          <Route path="/my-deliveries" element={<MyDeliveries />} />
          <Route path="/my-cases" element={<MyCases />} />
          <Route path="/my-schedule" element={<MySchedule />} />
          <Route path="/my-profile" element={<DriverProfile />} />
        </Routes>
      </AnnouncementsProvider>
    </HashRouter>
  );
}

export default App;
