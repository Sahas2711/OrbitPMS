import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
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
  HiOutlineUserGroup,
  HiOutlineWrenchScrewdriver,
  HiOutlineBell,
  HiOutlineChevronRight,
} from 'react-icons/hi2';
import { format, parseISO, isToday, isPast } from 'date-fns';

import { getRooms, getBookings } from '../services/api';
import EmptyState from '../components/EmptyState';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsData, bookingsData] = await Promise.all([
        getRooms({ limit: 200 }),
        getBookings({ limit: 100 }),
      ]);
      setRooms(roomsData);
      setBookings(bookingsData);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── KPI Calculations ─────────────────────────────────────────

  const kpis = useMemo(() => {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.status === 'available').length;
    const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
    const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const todaysDate = new Date().toISOString().split('T')[0];
    const todaysCheckIns = bookings.filter(
      (b) => b.check_in_date === todaysDate && b.booking_status === 'confirmed'
    ).length;
    const todaysCheckOuts = bookings.filter(
      (b) => b.check_out_date === todaysDate && b.booking_status === 'checked_in'
    ).length;
    const activeBookings = bookings.filter(
      (b) => b.booking_status === 'confirmed' || b.booking_status === 'checked_in'
    ).length;

    let todayRevenue = 0;
    const todayCheckouts = bookings.filter(
      (b) => b.check_out_date === todaysDate && b.booking_status === 'checked_out'
    );
    todayCheckouts.forEach((b) => {
      if (b.total_amount) todayRevenue += parseFloat(b.total_amount);
    });

    return {
      totalRooms,
      availableRooms,
      occupiedRooms,
      maintenanceRooms,
      occupancyRate,
      todaysCheckIns,
      todaysCheckOuts,
      activeBookings,
      todayRevenue,
    };
  }, [rooms, bookings]);

  // ── KPIs configuration ───────────────────────────────────────

  const kpiCards = [
    {
      label: 'Total Rooms',
      value: kpis.totalRooms,
      icon: HiOutlineBuildingOffice2,
      color: 'text-brand',
      bg: 'bg-brand-50',
      trend: `${kpis.availableRooms} available`,
      trendColor: 'text-alert-success',
    },
    {
      label: 'Occupied Rooms',
      value: kpis.occupiedRooms,
      icon: HiOutlineXCircle,
      color: 'text-alert-error',
      bg: 'bg-red-50',
      trend: `${kpis.occupancyRate}% occupancy`,
      trendColor: 'text-text-muted',
    },
    {
      label: 'Available Rooms',
      value: kpis.availableRooms,
      icon: HiOutlineCheckCircle,
      color: 'text-alert-success',
      bg: 'bg-green-50',
      trend: `${kpis.maintenanceRooms} in maintenance`,
      trendColor: 'text-alert-warning',
    },
    {
      label: "Today's Arrivals",
      value: kpis.todaysCheckIns,
      icon: HiOutlineArrowLeftOnRectangle,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      trend: kpis.todaysCheckIns > 0 ? 'Pending check-in' : 'No arrivals',
      trendColor: kpis.todaysCheckIns > 0 ? 'text-alert-warning' : 'text-text-muted',
    },
    {
      label: "Today's Departures",
      value: kpis.todaysCheckOuts,
      icon: HiOutlineArrowRightOnRectangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      trend: kpis.todaysCheckOuts > 0 ? 'Pending check-out' : 'No departures',
      trendColor: kpis.todaysCheckOuts > 0 ? 'text-alert-warning' : 'text-text-muted',
    },
    {
      label: 'Active Bookings',
      value: kpis.activeBookings,
      icon: HiOutlineCalendarDays,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      trend: `${kpis.todaysCheckIns} checking in today`,
      trendColor: 'text-text-muted',
    },
    {
      label: 'Revenue Today',
      value: `$${kpis.todayRevenue.toFixed(2)}`,
      icon: HiOutlineCurrencyDollar,
      color: 'text-alert-success',
      bg: 'bg-green-50',
      trend: 'From checked-out guests',
      trendColor: 'text-text-muted',
      isCurrency: true,
    },
    {
      label: 'Maintenance',
      value: kpis.maintenanceRooms,
      icon: HiOutlineWrenchScrewdriver,
      color: 'text-alert-warning',
      bg: 'bg-amber-50',
      trend: kpis.maintenanceRooms > 0 ? 'Needs attention' : 'All clear',
      trendColor: kpis.maintenanceRooms > 0 ? 'text-alert-error' : 'text-alert-success',
    },
  ];

  // ── Recent Activity (combined) ───────────────────────────────

  const recentActivity = useMemo(() => {
    const activities = [];

    bookings.slice(0, 10).forEach((b) => {
      const date = b.updated_at || b.created_at || b.check_in_date;
      activities.push({
        id: `booking-${b.id}`,
        type: b.booking_status === 'checked_in' ? 'checkin' : b.booking_status === 'checked_out' ? 'checkout' : 'booking',
        text: b.booking_status === 'checked_in'
          ? `${b.guest_name} checked in to Room ${b.room_number || ''}`
          : b.booking_status === 'checked_out'
            ? `${b.guest_name} checked out from Room ${b.room_number || ''}`
            : `New booking created for ${b.guest_name}`,
        time: date,
        status: b.booking_status,
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    return activities.slice(0, 6);
  }, [bookings]);

  // ── Today's check-ins / check-outs ───────────────────────────

  const todaysDate = new Date().toISOString().split('T')[0];

  const todaysArrivals = bookings.filter(
    (b) => b.check_in_date === todaysDate && b.booking_status === 'confirmed'
  ).slice(0, 5);

  const todaysDepartures = bookings.filter(
    (b) => b.check_out_date === todaysDate && b.booking_status === 'checked_in'
  ).slice(0, 5);

  const urgentActions = useMemo(() => {
    const actions = [];
    bookings.filter((b) => {
      try {
        return b.booking_status === 'confirmed' && isPast(parseISO(b.check_in_date)) && !isToday(parseISO(b.check_in_date));
      } catch { return false; }
    }).slice(0, 3).forEach((b) => {
      actions.push({
        id: `overdue-${b.id}`,
        text: `${b.guest_name} overdue for check-in (Room ${b.room_number})`,
        type: 'overdue',
        action: () => navigate('/arrivals'),
      });
    });
    return actions;
  }, [bookings, navigate]);

  // ── Loading State ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <LuLoader className="w-10 h-10 text-brand animate-spin" />
        <p className="text-body text-text-muted mt-4">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-section-title font-bold text-text-primary m-0">
            {greeting}, {user?.full_name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-body text-text-secondary mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
            <span className="mx-2">·</span>
            <span className="font-medium text-text-primary">{kpis.occupancyRate}% occupancy</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/bookings')}
            className="h-[40px] px-4 rounded-button bg-brand text-white text-small font-medium hover:bg-brand-hover transition-all flex items-center gap-2"
          >
            <HiOutlinePlus className="w-4 h-4" />
            New Booking
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4"
      >
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="bg-bg-card rounded-card border border-border shadow-card p-5 hover:shadow-hover transition-all duration-200 hover:border-border-secondary cursor-default"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                {kpi.isCurrency ? null : (
                  <span className={`text-caption font-medium ${kpi.trendColor} bg-bg-table-header/50 rounded-full px-2 py-0.5`}>
                    {kpi.trend}
                  </span>
                )}
              </div>
              <p className="text-small text-text-muted m-0 font-medium">{kpi.label}</p>
              <p className={`text-display font-bold m-0 mt-0.5 leading-tight ${kpi.color}`}>
                {typeof kpi.value === 'number' && !kpi.isCurrency ? kpi.value.toLocaleString() : kpi.value}
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Middle Section: Operational Center + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Check-ins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 bg-bg-card rounded-card border border-border shadow-card"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineArrowLeftOnRectangle className="w-5 h-5 text-cyan-600" />
              <h3 className="text-body font-semibold text-text-primary m-0">Today's Check-Ins</h3>
            </div>
            <button
              onClick={() => navigate('/arrivals')}
              className="text-caption font-medium text-brand hover:text-brand-hover transition-colors flex items-center gap-0.5"
            >
              View All <HiOutlineChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4">
            {todaysArrivals.length === 0 ? (
              <div className="py-6 text-center">
                <HiOutlineCheckCircle className="w-8 h-8 text-alert-success mx-auto mb-2" />
                <p className="text-small text-text-muted">No arrivals scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysArrivals.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-button bg-cyan-50/50 hover:bg-cyan-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-small font-medium text-text-primary m-0 truncate">{b.guest_name}</p>
                      <p className="text-caption text-text-muted m-0">
                        Room {b.room_number || '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/arrivals')}
                      className="h-[32px] px-3 rounded-button text-caption font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition-all cursor-pointer shrink-0"
                    >
                      Check In
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Today's Check-outs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-1 bg-bg-card rounded-card border border-border shadow-card"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineArrowRightOnRectangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-body font-semibold text-text-primary m-0">Today's Check-Outs</h3>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="text-caption font-medium text-brand hover:text-brand-hover transition-colors flex items-center gap-0.5"
            >
              View All <HiOutlineChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4">
            {todaysDepartures.length === 0 ? (
              <div className="py-6 text-center">
                <HiOutlineCheckCircle className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-small text-text-muted">No departures scheduled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysDepartures.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-button bg-amber-50/50 hover:bg-amber-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-small font-medium text-text-primary m-0 truncate">{b.guest_name}</p>
                      <p className="text-caption text-text-muted m-0">
                        Room {b.room_number || '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/checkout')}
                      className="h-[32px] px-3 rounded-button text-caption font-medium bg-amber-600 text-white hover:bg-amber-700 transition-all cursor-pointer shrink-0"
                    >
                      Check Out
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Urgent Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1 bg-bg-card rounded-card border border-border shadow-card"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <HiOutlineBell className="w-5 h-5 text-alert-error" />
            <h3 className="text-body font-semibold text-text-primary m-0">Urgent Actions</h3>
            {urgentActions.length > 0 && (
              <span className="text-caption font-medium text-white bg-alert-error rounded-full px-2 py-0.5 ml-auto">
                {urgentActions.length}
              </span>
            )}
          </div>
          <div className="p-4">
            {urgentActions.length === 0 && todaysDepartures.length === 0 && todaysArrivals.length === 0 ? (
              <div className="py-6 text-center">
                <HiOutlineCheckCircle className="w-8 h-8 text-alert-success mx-auto mb-2" />
                <p className="text-small text-text-muted">All clear! No urgent actions needed.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    className="w-full flex items-center gap-3 py-2.5 px-3 rounded-button bg-red-50 hover:bg-red-100 transition-colors text-left"
                  >
                    <div className="w-2 h-2 rounded-full bg-alert-error shrink-0 animate-pulse" />
                    <p className="text-small text-text-primary m-0">{action.text}</p>
                  </button>
                ))}
                {urgentActions.length === 0 && (
                  <p className="text-small text-text-muted text-center py-4">No overdue items</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Section: Activity Feed + Room Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-bg-card rounded-card border border-border shadow-card"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-body font-semibold text-text-primary m-0">Recent Activity</h3>
          </div>
          <div className="p-4">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-small text-text-muted">No recent activity</div>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((activity, i) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 py-2.5 px-3 rounded-button hover:bg-bg-table-header/30 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      activity.type === 'checkin' ? 'bg-cyan-500' :
                      activity.type === 'checkout' ? 'bg-amber-500' :
                      'bg-brand'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-small text-text-primary m-0">{activity.text}</p>
                      <p className="text-caption text-text-muted mt-0.5">
                        {(() => {
                          try { return format(parseISO(activity.time), 'MMM d, h:mm a'); }
                          catch { return ''; }
                        })()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Room Status Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-bg-card rounded-card border border-border shadow-card"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-body font-semibold text-text-primary m-0">Room Status Overview</h3>
            <button
              onClick={() => navigate('/rooms')}
              className="text-caption font-medium text-brand hover:text-brand-hover transition-colors flex items-center gap-0.5"
            >
              Manage Rooms <HiOutlineChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-2 h-32 mb-4">
              <div className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(kpis.availableRooms / Math.max(kpis.totalRooms, 1)) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="w-full max-w-[80px] bg-alert-success rounded-t-lg"
                  style={{ minHeight: kpis.availableRooms > 0 ? '8px' : '0px' }}
                />
                <span className="text-caption text-text-muted">Available</span>
                <span className="text-small font-semibold text-text-primary">{kpis.availableRooms}</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(kpis.occupiedRooms / Math.max(kpis.totalRooms, 1)) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-full max-w-[80px] bg-alert-error rounded-t-lg"
                  style={{ minHeight: kpis.occupiedRooms > 0 ? '8px' : '0px' }}
                />
                <span className="text-caption text-text-muted">Occupied</span>
                <span className="text-small font-semibold text-text-primary">{kpis.occupiedRooms}</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(kpis.maintenanceRooms / Math.max(kpis.totalRooms, 1)) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="w-full max-w-[80px] bg-alert-warning rounded-t-lg"
                  style={{ minHeight: kpis.maintenanceRooms > 0 ? '8px' : '0px' }}
                />
                <span className="text-caption text-text-muted">Maintenance</span>
                <span className="text-small font-semibold text-text-primary">{kpis.maintenanceRooms}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-caption text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-alert-success" />
                Available ({kpis.availableRooms})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-alert-error" />
                Occupied ({kpis.occupiedRooms})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-alert-warning" />
                Maintenance ({kpis.maintenanceRooms})
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
