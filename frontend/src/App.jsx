import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RoomManagement from './pages/RoomManagement';
import BookingManagement from './pages/BookingManagement';
import PendingArrivals from './pages/PendingArrivals';
import CheckOut from './pages/CheckOut';
import InvoiceManagement from './pages/InvoiceManagement';
import AvailabilityCalendar from './pages/AvailabilityCalendar';

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

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
              style: {
                background: '#16A34A',
                color: '#FFFFFF',
              },
            },
            error: {
              style: {
                background: '#DC2626',
                color: '#FFFFFF',
              },
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
