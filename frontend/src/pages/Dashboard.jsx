import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { HiOutlineBuildingOffice2, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';

export default function Dashboard() {
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
            Welcome to OrbitPMS. Select a module from the sidebar to get started.
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
