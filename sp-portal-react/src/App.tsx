import { HashRouter, Routes, Route } from 'react-router-dom';
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
import { useViewportAttribute } from './hooks/useViewportAttribute';
import { useRefinementsMotion } from './hooks/useRefinementsMotion';

function App() {
  useViewportAttribute();
  useRefinementsMotion();

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/select" element={<Select />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/requests-admin" element={<RequestsAdmin />} />
        <Route path="/vendor-performance" element={<VendorPerformance />} />
        <Route path="/adhoc-invoice-management" element={<AdhocInvoiceManagement />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
