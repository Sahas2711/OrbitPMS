import { useAuth } from '../../context/AuthContext';
import Button from '../Button';
import { HiOutlineArrowRightOnRectangle, HiOutlineBuildingOffice2 } from 'react-icons/hi2';

export default function TopHeader({ collapsed, sidebarWidth }) {
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

  const roleColors = {
    admin: 'bg-purple-100 text-purple-700',
    receptionist: 'bg-cyan-100 text-cyan-700',
    staff: 'bg-slate-100 text-slate-700',
  };

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-white border-b border-border flex items-center justify-between px-6 z-20 transition-all duration-300"
      style={{ left: collapsed ? 80 : 280 }}
    >
      {/* Left: breadcrumb or page title area */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center lg:hidden">
          <HiOutlineBuildingOffice2 className="w-5 h-5 text-brand" />
        </div>
      </div>

      {/* Right: user profile + logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-small font-semibold text-white shrink-0">
            {getInitials(user?.full_name)}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-small font-medium text-text-primary m-0 leading-tight">
              {user?.full_name || 'User'}
            </p>
            <p className={`text-caption font-medium m-0 leading-tight capitalize ${roleColors[user?.role] || 'text-text-muted'}`}>
              {user?.role || ''}
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-border hidden sm:block" />

        <Button
          variant="secondary"
          onClick={logout}
          className="!h-9 !px-3 !text-small"
        >
          <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
