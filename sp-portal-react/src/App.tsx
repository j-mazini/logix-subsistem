import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoadingSpinner } from './components/auth/LoadingSpinner';
import { AccessSelect } from './pages/AccessSelect/AccessSelect';
import { Profile } from './pages/Profile/Profile';
import { Login } from './pages/Login/Login';
import { Select } from './pages/Select/Select';
import { LandingPage } from './pages/Landing/LandingPage';
import { DriverLogin } from './pages/Login/DriverLogin';
import { Announcements } from './pages/Announcements/Announcements';
import { Assets } from './pages/Assets/Assets';
import { Contracts } from './pages/Contracts/Contracts';
import { Invoices } from './pages/Invoices/Invoices';
import { RequestsAdmin } from './pages/RequestsAdmin/RequestsAdmin';
import { VendorPerformance } from './pages/VendorPerformance/VendorPerformance';
import { AdhocInvoiceManagement } from './pages/AdhocInvoiceManagement/AdhocInvoiceManagement';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { DailyFinancialInsights } from './pages/DailyFinancialInsights/DailyFinancialInsights';
import { DailyOperationsManagement } from './pages/DailyOperationsManagement/DailyOperationsManagement';
import { DailyOperationsReports } from './pages/DailyOperationsReports/DailyOperationsReports';
import { Drivers } from './pages/Drivers/Drivers';
import { RouteBalance } from './pages/RouteBalance/RouteBalance';
import { SOPFeed } from './pages/SOPFeed/SOPFeed';
import { Vehicles } from './pages/Vehicles/Vehicles';
import { VettingAdmin } from './pages/VettingAdmin/VettingAdmin';
import { VettingChecklist, VettingInterview } from './pages/Vetting';
import { WeekPlanner } from './pages/WeekPlanner/WeekPlanner';
import { useViewportAttribute } from './hooks/useViewportAttribute';
import { useRefinementsMotion } from './hooks/useRefinementsMotion';

function AppRoutes() {
  useViewportAttribute();
  useRefinementsMotion();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<DriverLogin />} />
      <Route path="/vetting/login" element={<DriverLogin />} />

      {/* Legacy Routes (kept for compatibility) */}
      <Route path="/select" element={<Select />} />
      <Route path="/old-login" element={<Login />} />
      <Route path="/access-select" element={<AccessSelect />} />

      {/* Protected Admin Routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <Announcements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <Assets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <Contracts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <Invoices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests-admin"
        element={
          <ProtectedRoute requiredRoles={['admin', 'vetting_officer']} fallback={<LoadingSpinner />}>
            <RequestsAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor-performance"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <VendorPerformance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/adhoc-invoice-management"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <AdhocInvoiceManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-financial-insights"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <DailyFinancialInsights />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-operations-management"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <DailyOperationsManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-operations-reports"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <DailyOperationsReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/drivers"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <Drivers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/route-balance"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <RouteBalance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sop-feed"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <SOPFeed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicles"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <Vehicles />
          </ProtectedRoute>
        }
      />

      {/* Vetting Routes */}
      <Route
        path="/vetting-admin"
        element={
          <ProtectedRoute requiredRoles={['admin', 'vetting_officer']} fallback={<LoadingSpinner />}>
            <VettingAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vetting-checklist"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <VettingChecklist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vetting-interview"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <VettingInterview />
          </ProtectedRoute>
        }
      />

      <Route
        path="/week-planner"
        element={
          <ProtectedRoute fallback={<LoadingSpinner />}>
            <WeekPlanner />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
