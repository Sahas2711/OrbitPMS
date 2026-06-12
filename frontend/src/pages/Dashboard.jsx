import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { HiOutlineBuildingOffice2, HiOutlineArrowRightOnRectangle, HiOutlineSquares2X2, HiOutlineCalendarDays, HiOutlineClipboardDocumentList, HiOutlineArrowLeftOnRectangle, HiOutlineReceiptPercent, HiOutlineCalendar } from 'react-icons/hi2';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-svh bg-bg-page">
      {/* Top Bar */}
      <header className="bg-primary-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HiOutlineBuildingOffice2 className="w-6 h-6 text-brand" />
          <h1 className="text-card-title font-semibold m-0">OrbitPMS</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-small font-semibold text-white">
              {getInitials(user?.full_name)}
            </div>
            <div className="text-right">
              <p className="text-small font-medium text-white m-0">
                {user?.full_name || 'User'}
              </p>
              <p className="text-caption text-text-muted m-0 capitalize">
                {user?.role || ''}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={logout}
            className="!h-9 !px-3 !text-small !border-primary-700 !text-white hover:!bg-primary-800"
          >
            <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-section-title font-bold text-text-primary m-0">
            Dashboard
          </h2>
          <p className="text-body text-text-secondary mt-1">
            Welcome to OrbitPMS. Select a module below to get started.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Rooms', value: '—' },
            { label: 'Occupied', value: '—' },
            { label: 'Available', value: '—' },
            { label: 'Today\'s Revenue', value: '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-bg-card rounded-card shadow-card p-5 border border-border"
            >
              <p className="text-small text-text-muted m-0">{stat.label}</p>
              <p className="text-section-title font-bold text-text-primary mt-1 m-0">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Module Navigation */}
        <div className="mb-8">
          <h3 className="text-card-title font-semibold text-text-primary mb-4">Modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/rooms')}
              className="bg-bg-card rounded-card shadow-card border border-border p-5 text-left transition-all duration-150 hover:shadow-hover hover:-translate-y-0.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center mb-3 group-hover:bg-brand group-hover:text-white transition-all">
                <HiOutlineSquares2X2 className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-body font-semibold text-text-primary m-0">Room Management</h4>
              <p className="text-small text-text-muted mt-1 m-0">Manage hotel rooms, availability, and pricing</p>
            </button>

            <button
              onClick={() => navigate('/bookings')}
              className="bg-bg-card rounded-card shadow-card border border-border p-5 text-left transition-all duration-150 hover:shadow-hover hover:-translate-y-0.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center mb-3 group-hover:bg-brand group-hover:text-white transition-all">
                <HiOutlineCalendarDays className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-body font-semibold text-text-primary m-0">Booking Management</h4>
              <p className="text-small text-text-muted mt-1 m-0">Manage guest reservations, check-ins, and availability</p>
            </button>

            <button
              onClick={() => navigate('/arrivals')}
              className="bg-bg-card rounded-card shadow-card border border-border p-5 text-left transition-all duration-150 hover:shadow-hover hover:-translate-y-0.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center mb-3 group-hover:bg-brand group-hover:text-white transition-all">
                <HiOutlineClipboardDocumentList className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-body font-semibold text-text-primary m-0">Pending Arrivals</h4>
              <p className="text-small text-text-muted mt-1 m-0">View and check in arriving guests</p>
            </button>

            <button
              onClick={() => navigate('/checkout')}
              className="bg-bg-card rounded-card shadow-card border border-border p-5 text-left transition-all duration-150 hover:shadow-hover hover:-translate-y-0.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center mb-3 group-hover:bg-brand group-hover:text-white transition-all">
                <HiOutlineArrowLeftOnRectangle className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-body font-semibold text-text-primary m-0">Check Out</h4>
              <p className="text-small text-text-muted mt-1 m-0">Check out guests and generate invoices</p>
            </button>

            <button
              onClick={() => navigate('/invoices')}
              className="bg-bg-card rounded-card shadow-card border border-border p-5 text-left transition-all duration-150 hover:shadow-hover hover:-translate-y-0.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center mb-3 group-hover:bg-brand group-hover:text-white transition-all">
                <HiOutlineReceiptPercent className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-body font-semibold text-text-primary m-0">Invoices</h4>
              <p className="text-small text-text-muted mt-1 m-0">View and download guest invoices</p>
            </button>

            <button
              onClick={() => navigate('/availability')}
              className="bg-bg-card rounded-card shadow-card border border-border p-5 text-left transition-all duration-150 hover:shadow-hover hover:-translate-y-0.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center mb-3 group-hover:bg-brand group-hover:text-white transition-all">
                <HiOutlineCalendar className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-body font-semibold text-text-primary m-0">Availability Calendar</h4>
              <p className="text-small text-text-muted mt-1 m-0">View room occupancy across the month</p>
            </button>
          </div>
        </div>

        {/* Role Info */}
        <div className="bg-bg-card rounded-card shadow-card p-6 border border-border">
          <h3 className="text-card-title font-semibold text-text-primary m-0">
            Account Details
          </h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-small font-medium text-text-secondary w-24">Email:</span>
              <span className="text-small text-text-primary">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-small font-medium text-text-secondary w-24">Role:</span>
              <span className="text-small text-text-primary capitalize">{user?.role}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-small font-medium text-text-secondary w-24">Status:</span>
              <span className="inline-flex items-center gap-1.5 text-small text-alert-success">
                <span className="w-2 h-2 rounded-full bg-alert-success" />
                Authenticated
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
