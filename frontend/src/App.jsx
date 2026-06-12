import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LuLoader } from 'react-icons/lu';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// ── Lazy-loaded Page Components ─────────────────────────────────
// Each page is split into a separate chunk and loaded on demand.

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RoomManagement = lazy(() => import('./pages/RoomManagement'));
const BookingManagement = lazy(() => import('./pages/BookingManagement'));
const PendingArrivals = lazy(() => import('./pages/PendingArrivals'));
const CheckOut = lazy(() => import('./pages/CheckOut'));
const InvoiceManagement = lazy(() => import('./pages/InvoiceManagement'));
const AvailabilityCalendar = lazy(() => import('./pages/AvailabilityCalendar'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Settings = lazy(() => import('./pages/Settings'));

// ── Loading Fallback ────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <LuLoader className="w-7 h-7 text-brand animate-spin" />
        <p className="text-small text-text-muted">Loading…</p>
      </div>
    </div>
  );
}

// ── Protected Route Wrapper ─────────────────────────────────────

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

// ── App ─────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontSize: '14px',
              borderRadius: '8px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#16A34A',
                secondary: '#FFFFFF',
              },
              style: {
                background: '#16A34A',
                color: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#DC2626',
                secondary: '#FFFFFF',
              },
              style: {
                background: '#DC2626',
                color: '#FFFFFF',
              },
            },
          }}
        />

        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes with App Shell */}
            <Route
              path="/dashboard"
              element={
                <ProtectedLayout>
                  <Dashboard />
                </ProtectedLayout>
              }
            />
            <Route
              path="/rooms"
              element={
                <ProtectedLayout>
                  <RoomManagement />
                </ProtectedLayout>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedLayout>
                  <BookingManagement />
                </ProtectedLayout>
              }
            />
            <Route
              path="/arrivals"
              element={
                <ProtectedLayout>
                  <PendingArrivals />
                </ProtectedLayout>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedLayout>
                  <CheckOut />
                </ProtectedLayout>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedLayout>
                  <InvoiceManagement />
                </ProtectedLayout>
              }
            />
            <Route
              path="/availability"
              element={
                <ProtectedLayout>
                  <AvailabilityCalendar />
                </ProtectedLayout>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedLayout>
                  <UserManagement />
                </ProtectedLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedLayout>
                  <Settings />
                </ProtectedLayout>
              }
            />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
