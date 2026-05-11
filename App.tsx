import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const POSPage = lazy(() => import('./pages/pos/POSPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const GRNPage = lazy(() => import('./pages/grn/GRNPage'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'));
const SuppliersPage = lazy(() => import('./pages/suppliers/SuppliersPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const currentUser = useStore((s) => s.currentUser);
  if (currentUser) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-dark-400 text-sm">Loading...</span>
      </div>
    </div>
  );
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initAuth = useStore((s) => s.initAuth);
  const startSync = useStore((s) => s.startSync);
  const currentUser = useStore((s) => s.currentUser);
  const authLoading = useStore((s) => s.authLoading);

  useEffect(() => {
    const unsubAuth = initAuth();
    return () => { unsubAuth(); };
  }, [initAuth]);

  useEffect(() => {
    if (currentUser) {
      const unsubSync = startSync();
      return () => { unsubSync(); };
    }
  }, [currentUser, startSync]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-dark-300 text-sm">Connecting to Firebase...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#e5e5e5',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1a1a1a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1a1a1a' } },
          }}
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="grn" element={<GRNPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthInitializer>
    </BrowserRouter>
  );
}
