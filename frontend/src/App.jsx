import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RoomManagement from './pages/RoomManagement';
import BookingManagement from './pages/BookingManagement';
import PendingArrivals from './pages/PendingArrivals';
import CheckOut from './pages/CheckOut';
import InvoiceManagement from './pages/InvoiceManagement';
import AvailabilityCalendar from './pages/AvailabilityCalendar';

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

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Room Management */}
          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <RoomManagement />
              </ProtectedRoute>
            }
          />

          {/* Booking Management */}
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingManagement />
              </ProtectedRoute>
            }
          />

          {/* Pending Arrivals */}
          <Route
            path="/arrivals"
            element={
              <ProtectedRoute>
                <PendingArrivals />
              </ProtectedRoute>
            }
          />

          {/* Check Out */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckOut />
              </ProtectedRoute>
            }
          />

          {/* Invoice Management */}
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <InvoiceManagement />
              </ProtectedRoute>
            }
          />

          {/* Availability Calendar */}
          <Route
            path="/availability"
            element={
              <ProtectedRoute>
                <AvailabilityCalendar />
              </ProtectedRoute>
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
