import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import BrowseOrganizations from './pages/BrowseOrganizations';
import OrganizationDetail from './pages/OrganizationDetail';
import Transparency from './pages/Transparency';
import SharedReport from './pages/SharedReport';
import PayerDashboard from './pages/PayerDashboard';
import UploadBill from './pages/UploadBill';
import MyBills from './pages/MyBills';
import PayNow from './pages/PayNow';
import Reports from './pages/Reports';
import PayeeDashboard from './pages/PayeeDashboard';
import PayeeBills from './pages/PayeeBills';
import PayeeProfile from './pages/PayeeProfile';
import AdminOverview from './pages/admin/AdminOverview';
import AdminOrganizations from './pages/admin/AdminOrganizations';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAudit from './pages/admin/AdminAudit';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/organizations" element={<BrowseOrganizations />} />
        <Route path="/organizations/:id" element={<OrganizationDetail />} />
        <Route path="/transparency" element={<Transparency />} />
        <Route path="/shared/:token" element={<SharedReport />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['payer']}>
              <PayerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute roles={['payer']}>
              <UploadBill />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receipts"
          element={
            <ProtectedRoute roles={['payer']}>
              <MyBills />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donate/:orgId"
          element={
            <ProtectedRoute roles={['payer']}>
              <PayNow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={['payer', 'payee']}>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payee/dashboard"
          element={
            <ProtectedRoute roles={['payee']}>
              <PayeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payee/bills"
          element={
            <ProtectedRoute roles={['payee']}>
              <PayeeBills />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payee/profile"
          element={
            <ProtectedRoute roles={['payee']}>
              <PayeeProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/organizations"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminOrganizations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminAudit />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
