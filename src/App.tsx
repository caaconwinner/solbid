import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header }       from './components/Header';
import { HomePage }     from './pages/HomePage';
import { AuctionPage }  from './pages/AuctionPage';
import { LoginPage }    from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage }      from './pages/DashboardPage';
import { AdminPage }           from './pages/AdminPage';
import { ForgotPasswordPage }  from './pages/ForgotPasswordPage';
import { ResetPasswordPage }   from './pages/ResetPasswordPage';
import { ReactNode }           from 'react';

function Protected({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  console.log('[protected] isLoading:', isLoading, 'user:', user?.email);
  if (isLoading) return <div className="loading-screen"><div className="spinner" /><p>Authenticating…</p></div>;
  if (!user)     return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <Header />
      <Routes>
        <Route path="/login"          element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register"       element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/" element={<Protected><HomePage /></Protected>} />
        <Route path="/auction/:auctionId" element={<Protected><AuctionPage /></Protected>} />
        <Route path="/account" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#181818',
              color: '#e0e0e0',
              border: '1px solid #222',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#00e87a', secondary: '#000' } },
            error:   { iconTheme: { primary: '#ff3b3b', secondary: '#000' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
