import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineSquares2X2,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineArrowRightOnRectangle,
  HiOutlineReceiptPercent,
  HiOutlineCalendar,
  HiOutlineBuildingOffice2,
  HiOutlineUsers,
  HiOutlineCog6Tooth,
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight,
} from 'react-icons/hi2';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: HiOutlineSquares2X2, roles: ['admin', 'receptionist', 'staff'] },
  { path: '/rooms', label: 'Rooms', icon: HiOutlineBuildingOffice2, roles: ['admin', 'receptionist', 'staff'] },
  { path: '/bookings', label: 'Bookings', icon: HiOutlineCalendarDays, roles: ['admin', 'receptionist', 'staff'] },
  { path: '/arrivals', label: 'Check-In', icon: HiOutlineClipboardDocumentList, roles: ['admin', 'receptionist'] },
  { path: '/checkout', label: 'Check-Out', icon: HiOutlineArrowRightOnRectangle, roles: ['admin', 'receptionist'] },
  { path: '/invoices', label: 'Invoices', icon: HiOutlineReceiptPercent, roles: ['admin', 'receptionist', 'staff'] },
  { path: '/availability', label: 'Calendar', icon: HiOutlineCalendar, roles: ['admin', 'receptionist', 'staff'] },
  { path: '/users', label: 'Users', icon: HiOutlineUsers, roles: ['admin'] },
  { path: '/settings', label: 'Settings', icon: HiOutlineCog6Tooth, roles: ['admin', 'receptionist', 'staff'] },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-primary-900 text-white flex flex-col transition-all duration-300 z-30 ${
        collapsed ? 'w-[80px]' : 'w-[280px]'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-primary-800 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <HiOutlineBuildingOffice2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-small font-semibold text-white m-0 leading-tight">OrbitPMS</p>
            <p className="text-caption text-text-muted m-0 leading-tight">Hotel Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-button text-small font-medium transition-all duration-150 cursor-pointer ${
                active
                  ? 'bg-brand/20 text-white'
                  : 'text-slate-300 hover:bg-primary-800 hover:text-white'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-brand' : ''}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-primary-800 p-2">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-button text-small text-slate-300 hover:bg-primary-800 hover:text-white transition-all duration-150 cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <HiOutlineChevronDoubleRight className="w-5 h-5 shrink-0 mx-auto" />
          ) : (
            <>
              <HiOutlineChevronDoubleLeft className="w-5 h-5 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
