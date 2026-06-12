import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LuLoader } from 'react-icons/lu';
import {
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineArrowRightOnRectangle,
  HiOutlineArrowLeftOnRectangle,
  HiOutlinePlus,
  HiOutlineCurrencyDollar,
  HiOutlineChartBarSquare,
} from 'react-icons/hi2';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

import { getRooms, getBookings } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsData, bookingsData] = await Promise.all([
        getRooms({ limit: 200 }),
        getBookings({ limit: 50 }),
      ]);
      setRooms(roomsData);
      setBookings(bookingsData);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── KPIs ────────────────────────────────────────────────────

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.status === 'available').length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance').length;
  const activeBookings = bookings.filter(
    (b) => b.booking_status === 'confirmed' || b.booking_status === 'checked_in'
  ).length;
  const todaysDate = new Date().toISOString().split('T')[0];
  const todaysCheckIns = bookings.filter(
    (b) => b.check_in_date === todaysDate && b.booking_status === 'confirmed'
  ).length;
  const todaysCheckOuts = bookings.filter(
    (b) => b.check_out_date === todaysDate && b.booking_status === 'checked_in'
  ).length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const recentBookings = bookings.slice(0, 5);
  const upcomingArrivals = bookings
    .filter((b) => b.booking_status === 'confirmed')
    .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))
    .slice(0, 5);

  const kpiCards = [
    { label: 'Total Rooms', value: totalRooms, icon: HiOutlineBuildingOffice2, color: 'text-brand', bg: 'bg-brand-light' },
    { label: 'Available', value: availableRooms, icon: HiOutlineCheckCircle, color: 'text-alert-success', bg: 'bg-alert-success/10' },
    { label: 'Occupied', value: occupiedRooms, icon: HiOutlineXCircle, color: 'text-alert-error', bg: 'bg-alert-error/10' },
    { label: 'Occupancy', value: `${occupancyRate}%`, icon: HiOutlineChartBarSquare, color: 'text-alert-info', bg: 'bg-alert-info/10' },
    { label: 'Active Bookings', value: activeBookings, icon: HiOutlineCalendarDays, color: 'text-status-checkedin', bg: 'bg-cyan-50' },
    { label: "Today's Check-Ins", value: todaysCheckIns, icon: HiOutlineArrowLeftOnRectangle, color: 'text-alert-success', bg: 'bg-alert-success/10' },
    { label: "Today's Check-Outs", value: todaysCheckOuts, icon: HiOutlineArrowRightOnRectangle, color: 'text-alert-warning', bg: 'bg-alert-warning/10' },
  { label: 'Maintenance', value: maintenanceRooms, icon: HiOutlineClipboardDocumentList, color: 'text-alert-warning', bg: 'bg-alert-warning/10' },
  { label: 'Revenue', value: '—', icon: HiOutlineCurrencyDollar, color: 'text-alert-success', bg: 'bg-alert-success/10' },
];

  // ── Quick action buttons ────────────────────────────────────

  const quickActions = [
    { label: 'Create Booking', icon: HiOutlinePlus, onClick: () => navigate('/bookings'), color: 'bg-brand text-white hover:bg-brand-hover' },
    { label: 'Check-In Guest', icon: HiOutlineArrowLeftOnRectangle, onClick: () => navigate('/arrivals'), color: 'bg-cyan-500 text-white hover:bg-cyan-600' },
    { label: 'Check-Out Guest', icon: HiOutlineArrowRightOnRectangle, onClick: () => navigate('/checkout'), color: 'bg-alert-warning text-white hover:bg-amber-600' },
    { label: 'Add Room', icon: HiOutlinePlus, onClick: () => navigate('/rooms'), color: 'bg-bg-card text-text-primary border border-border hover:bg-bg-table-header' },
  ];

  // ── Render loading state ────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <LuLoader className="w-10 h-10 text-brand animate-spin" />
        <p className="text-body text-text-muted mt-4">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-section-title font-bold text-text-primary m-0">Dashboard</h2>
        <p className="text-body text-text-secondary mt-1">
          Welcome back, {user?.full_name || user?.email || 'User'}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`h-[40px] px-4 py-2 rounded-button text-small font-medium flex items-center gap-2 transition-all cursor-pointer ${action.color}`}
            >
              <Icon className="w-4 h-4" />
              {action.label}
            </button>
          );
        })}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-bg-card rounded-card border border-border shadow-card p-4 flex items-start gap-3 hover:shadow-hover transition-shadow"
            >
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-caption text-text-muted m-0 truncate">{kpi.label}</p>
                <p className={`text-card-title font-bold ${kpi.color} m-0 mt-0.5`}>
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-bg-card rounded-card border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-body font-semibold text-text-primary m-0">Recent Bookings</h3>
            <button
              onClick={() => navigate('/bookings')}
              className="text-caption font-medium text-brand hover:text-brand-hover transition-colors"
            >
              View All
            </button>
          </div>
          <div className="p-4">
            {recentBookings.length === 0 ? (
              <p className="text-small text-text-muted text-center py-8">No bookings yet</p>
            ) : (
              <div className="space-y-2">
                {recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2 px-3 rounded-button hover:bg-bg-table-header/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-small font-medium text-text-primary m-0 truncate">{b.guest_name}</p>
                      <p className="text-caption text-text-muted m-0">
                        Room {b.room_number || '—'} · {format(parseISO(b.check_in_date), 'MMM d')} - {format(parseISO(b.check_out_date), 'MMM d')}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium capitalize ${
                      b.booking_status === 'confirmed' ? 'bg-alert-info/10 text-alert-info' :
                      b.booking_status === 'checked_in' ? 'bg-cyan-50 text-cyan-600' :
                      b.booking_status === 'checked_out' ? 'bg-slate-100 text-slate-500' :
                      'bg-red-50 text-red-500'
                    }`}>
                      {b.booking_status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Arrivals */}
        <div className="bg-bg-card rounded-card border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-body font-semibold text-text-primary m-0">Upcoming Arrivals</h3>
            <button
              onClick={() => navigate('/arrivals')}
              className="text-caption font-medium text-brand hover:text-brand-hover transition-colors"
            >
              View All
            </button>
          </div>
          <div className="p-4">
            {upcomingArrivals.length === 0 ? (
              <p className="text-small text-text-muted text-center py-8">No upcoming arrivals</p>
            ) : (
              <div className="space-y-2">
                {upcomingArrivals.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2 px-3 rounded-button hover:bg-bg-table-header/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-small font-medium text-text-primary m-0 truncate">{b.guest_name}</p>
                      <p className="text-caption text-text-muted m-0">
                        Room {b.room_number || '—'} · {format(parseISO(b.check_in_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/arrivals')}
                      className="h-[32px] px-3 rounded-button text-caption font-medium bg-brand text-white hover:bg-brand-hover transition-colors cursor-pointer"
                    >
                      Check In
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Room Status Distribution */}
      <div className="mt-6 bg-bg-card rounded-card border border-border shadow-card p-5">
        <h3 className="text-body font-semibold text-text-primary m-0 mb-4">Room Status Overview</h3>
        <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden">
          {availableRooms > 0 && (
            <div
              className="h-full bg-alert-success flex items-center justify-center text-caption font-medium text-white transition-all"
              style={{ width: `${(availableRooms / totalRooms) * 100}%` }}
              title={`${availableRooms} Available`}
            >
              {availableRooms > 2 && `${availableRooms} Available`}
            </div>
          )}
          {occupiedRooms > 0 && (
            <div
              className="h-full bg-alert-error flex items-center justify-center text-caption font-medium text-white transition-all"
              style={{ width: `${(occupiedRooms / totalRooms) * 100}%` }}
              title={`${occupiedRooms} Occupied`}
            >
              {occupiedRooms > 2 && `${occupiedRooms} Occupied`}
            </div>
          )}
          {maintenanceRooms > 0 && (
            <div
              className="h-full bg-alert-warning flex items-center justify-center text-caption font-medium text-white transition-all"
              style={{ width: `${(maintenanceRooms / totalRooms) * 100}%` }}
              title={`${maintenanceRooms} Maintenance`}
            >
              {maintenanceRooms > 2 && `${maintenanceRooms} Maintenance`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-6 mt-3 text-caption text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-alert-success" /> Available ({availableRooms})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-alert-error" /> Occupied ({occupiedRooms})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-alert-warning" /> Maintenance ({maintenanceRooms})
          </span>
        </div>
      </div>
    </div>
  );
}
