import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import ProtectedLayout from './components/layout/ProtectedLayout';
import PageLoader from './components/ui/PageLoader';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const BrowseOrganizations = lazy(() => import('./pages/BrowseOrganizations'));
const OrganizationDetail = lazy(() => import('./pages/OrganizationDetail'));
const Transparency = lazy(() => import('./pages/Transparency'));
const SharedReport = lazy(() => import('./pages/SharedReport'));

const PayerDashboard = lazy(() => import('./pages/PayerDashboard'));
const UploadBill = lazy(() => import('./pages/UploadBill'));
const MyBills = lazy(() => import('./pages/MyBills'));
const PayNow = lazy(() => import('./pages/PayNow'));
const Reports = lazy(() => import('./pages/Reports'));

const PayeeDashboard = lazy(() => import('./pages/PayeeDashboard'));
const PayeeBills = lazy(() => import('./pages/PayeeBills'));
const PayeeProfile = lazy(() => import('./pages/PayeeProfile'));

const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminOrganizations = lazy(() => import('./pages/admin/AdminOrganizations'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/organizations" element={<BrowseOrganizations />} />
          <Route path="/organizations/:id" element={<OrganizationDetail />} />
          <Route path="/transparency" element={<Transparency />} />
          <Route path="/shared/:token" element={<SharedReport />} />
        </Route>

        <Route element={<ProtectedLayout roles={['payer']} />}>
          <Route path="/dashboard" element={<PayerDashboard />} />
          <Route path="/upload" element={<UploadBill />} />
          <Route path="/receipts" element={<MyBills />} />
          <Route path="/donate/:orgId" element={<PayNow />} />
          <Route path="/reports" element={<Reports />} />
        </Route>

        <Route element={<ProtectedLayout roles={['payee']} />}>
          <Route path="/payee/dashboard" element={<PayeeDashboard />} />
          <Route path="/payee/bills" element={<PayeeBills />} />
          <Route path="/payee/profile" element={<PayeeProfile />} />
          <Route path="/reports" element={<Reports />} />
        </Route>

        <Route element={<ProtectedLayout roles={['admin']} />}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/organizations" element={<AdminOrganizations />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
