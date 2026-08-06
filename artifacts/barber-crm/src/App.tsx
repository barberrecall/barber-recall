import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout/app-layout';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthProvider } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';

// Pages
import LoginPage from '@/pages/login';
import RegisterPage from '@/pages/register';
import DashboardPage from '@/pages/dashboard';
import ClientsPage from '@/pages/clients';
import ClientDetailPage from '@/pages/clients/detail';
import ClientNewPage from '@/pages/clients/new';
import ClientEditPage from '@/pages/clients/edit';
import AppointmentsPage from '@/pages/appointments';
import AppointmentNewPage from '@/pages/appointments/new';
import CampaignsPage from '@/pages/campaigns';
import CampaignNewPage from '@/pages/campaigns/new';
import BarbersPage from '@/pages/barbers';
import BarberNewPage from '@/pages/barbers/new';
import BarberEditPage from '@/pages/barbers/edit';
import ServicesPage from '@/pages/services';
import ServiceNewPage from '@/pages/services/new';
import ServiceEditPage from '@/pages/services/edit';
import CouponsPage from '@/pages/coupons';
import CouponNewPage from '@/pages/coupons/new';
import ReportsPage from '@/pages/reports';
import InsightsPage from '@/pages/insights';
import SettingsPage from '@/pages/settings';
import PaymentSuccessPage from '@/pages/payment-success';
import PaymentPendingPage from '@/pages/payment-pending';
import PaymentFailurePage from '@/pages/payment-failure';
import PrivacidadePage from '@/pages/privacidade';
import TermosPage from '@/pages/termos';
import ForgotPasswordPage from '@/pages/forgot-password';
import ResetPasswordPage from '@/pages/reset-password';
import AdminLoginPage from '@/pages/admin/login';
import AdminDashboard from '@/pages/admin/index';
import AdminUsers from '@/pages/admin/users';
import AdminNetworking from '@/pages/admin/networking';
import AdminTrialExpiring from '@/pages/admin/trial-expiring';

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      {/* Públicas: quem esqueceu a senha, por definição, não está autenticado. */}
      <Route path="/esqueci-senha" component={ForgotPasswordPage} />
      <Route path="/redefinir-senha" component={ResetPasswordPage} />
      {/*
        Públicas e sem login: a Apple exige uma URL de política de privacidade
        acessível para aprovar o app, e a LGPD exige que o titular consiga ler
        antes de entregar qualquer dado.
      */}
      <Route path="/privacidade" component={PrivacidadePage} />
      <Route path="/termos" component={TermosPage} />

      {/* Payment return pages — standalone, no auth required */}
      <Route path="/payment/success" component={PaymentSuccessPage} />
      <Route path="/payment/pending" component={PaymentPendingPage} />
      <Route path="/payment/failure" component={PaymentFailurePage} />

      {/* Protected app routes */}
      <Route path="/dashboard">
        <ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/clients">
        <ProtectedRoute><AppLayout><ClientsPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/clients/new">
        <ProtectedRoute><AppLayout><ClientNewPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/clients/:id/edit">
        <ProtectedRoute><AppLayout><ClientEditPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/clients/:id">
        <ProtectedRoute><AppLayout><ClientDetailPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/appointments">
        <ProtectedRoute><AppLayout><AppointmentsPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/appointments/new">
        <ProtectedRoute><AppLayout><AppointmentNewPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/campaigns">
        <ProtectedRoute><AppLayout><CampaignsPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/campaigns/new">
        <ProtectedRoute><AppLayout><CampaignNewPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/barbers">
        <ProtectedRoute><AppLayout><BarbersPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/barbers/new">
        <ProtectedRoute><AppLayout><BarberNewPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/barbers/:id/edit">
        <ProtectedRoute><AppLayout><BarberEditPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/services">
        <ProtectedRoute><AppLayout><ServicesPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/services/new">
        <ProtectedRoute><AppLayout><ServiceNewPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/services/:id/edit">
        <ProtectedRoute><AppLayout><ServiceEditPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/coupons">
        <ProtectedRoute><AppLayout><CouponsPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/coupons/new">
        <ProtectedRoute><AppLayout><CouponNewPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/insights">
        <ProtectedRoute><AppLayout><InsightsPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>
      </Route>

      {/* Admin login — public, no layout */}
      <Route path="/admin/login" component={AdminLoginPage} />

      {/* Admin routes — protected, own layout */}
      <Route path="/admin">
        <AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>
      </Route>
      <Route path="/admin/users">
        <AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>
      </Route>
      <Route path="/admin/networking">
        <AdminRoute><AdminLayout><AdminNetworking /></AdminLayout></AdminRoute>
      </Route>
      <Route path="/admin/trial-expiring">
        <AdminRoute><AdminLayout><AdminTrialExpiring /></AdminLayout></AdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
