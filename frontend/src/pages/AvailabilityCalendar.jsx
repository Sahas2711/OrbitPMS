import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineCalendarDays,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineBuildingOffice2,
  HiOutlineSquares2X2,
  HiOutlineWrenchScrewdriver,
  HiOutlineXCircle,
  HiOutlineCheckCircle,
  HiOutlineInformationCircle,
} from 'react-icons/hi2';
import { LuLoader } from 'react-icons/lu';
import { addMonths, subMonths, startOfMonth, getDay } from 'date-fns';

import { getRoomAvailability } from '../services/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_STYLES = {
  available: {
    bg: 'bg-green-100',
    hover: 'hover:bg-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'Available',
  },
  booked: {
    bg: 'bg-red-100',
    hover: 'hover:bg-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
    label: 'Booked',
  },
  maintenance: {
    bg: 'bg-amber-100',
    hover: 'hover:bg-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    label: 'Maintenance',
  },
};

export default function AvailabilityCalendar() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(startOfMonth(today));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const gridRef = useRef(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthLabel = `${MONTH_NAMES[currentDate.getMonth()]} ${year}`;

  // ── Fetch availability data ─────────────────────────────────

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getRoomAvailability(year, month);
      setData(result);
    } catch {
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // ── Month navigation ─────────────────────────────────────────

  const goToPrevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const goToNextMonth = () => setCurrentDate((d) => addMonths(d, 1));
  const goToToday = () => setCurrentDate(startOfMonth(today));

  // ── Generate day headers with day-of-week ────────────────────

  const daysInMonth = data?.days_in_month || 0;
  const dayHeaders = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dow = getDay(date);
    dayHeaders.push({ day, dow });
  }

  // ── Tooltip handler ──────────────────────────────────────────

  const handleCellHover = (roomNumber, day, status, label, event) => {
    const rect = event.target.getBoundingClientRect();
    setHoveredCell({ roomNumber, day, status, label });
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const handleCellLeave = () => setHoveredCell(null);

  // ── Check if a date is today ─────────────────────────────────

  const isToday = (day) => {
    return (
      today.getDate() === day &&
      today.getMonth() === month - 1 &&
      today.getFullYear() === year
    );
  };

  // ── Tooltip ──────────────────────────────────────────────────

  const renderTooltip = () => {
    if (!hoveredCell) return null;
    const config = STATUS_STYLES[hoveredCell.status] || STATUS_STYLES.available;

    return (
      <div
        className="fixed z-50 px-3 py-2 rounded-lg shadow-lg border border-border bg-bg-card pointer-events-none -translate-x-1/2 -translate-y-full"
        style={{ left: tooltipPos.x, top: tooltipPos.y }}
      >
        <p className="text-caption font-semibold text-text-primary m-0 whitespace-nowrap">
          {hoveredCell.roomNumber}
        </p>
        <p className="text-caption text-text-secondary m-0 whitespace-nowrap">
          Day {hoveredCell.day} —{' '}
          <span className={config.text}>{config.label}</span>
        </p>
      </div>
    );
  };

  // ── Legend ───────────────────────────────────────────────────

  const renderLegend = () => (
    <div className="flex flex-wrap items-center gap-4 px-1">
      {Object.entries(STATUS_STYLES).map(([key, config]) => (
        <div key={key} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-sm ${config.bg} border border-current ${config.text}`} />
          <span className="text-caption text-text-secondary">{config.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm border-2 border-brand bg-white" />
        <span className="text-caption text-text-secondary">Today</span>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-svh bg-bg-page">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-section-title font-bold text-text-primary m-0">Availability Calendar</h2>
          <p className="text-body text-text-secondary mt-1">
            View room occupancy and availability across the month
          </p>
        </div>
      </div>

        {/* Month Navigation */}
        <div className="bg-bg-card rounded-card shadow-card border border-border p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={goToPrevMonth}
              className="h-[40px] w-[40px] flex items-center justify-center rounded-button border border-border text-text-primary hover:bg-bg-table-header transition-all hover:border-border-secondary"
              title="Previous month"
            >
              <HiOutlineChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <h3 className="text-card-title font-bold text-text-primary m-0 min-w-[200px] text-center">
                {monthLabel}
              </h3>
              <button
                onClick={goToToday}
                className="h-[36px] px-4 py-1.5 text-caption font-medium bg-brand-light text-brand rounded-button hover:bg-brand hover:text-white transition-all"
              >
                Today
              </button>
            </div>

            <button
              onClick={goToNextMonth}
              className="h-[40px] w-[40px] flex items-center justify-center rounded-button border border-border text-text-primary hover:bg-bg-table-header transition-all hover:border-border-secondary"
              title="Next month"
            >
              <HiOutlineChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {data && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: 'Total Rooms',
                value: data.summary.total_rooms,
                icon: HiOutlineBuildingOffice2,
                color: 'text-text-primary',
                bg: 'bg-bg-table-header',
              },
              {
                label: 'Available',
                value: data.summary.available,
                icon: HiOutlineCheckCircle,
                color: 'text-alert-success',
                bg: 'bg-alert-success/10',
              },
              {
                label: 'Booked',
                value: data.summary.booked,
                icon: HiOutlineXCircle,
                color: 'text-alert-error',
                bg: 'bg-alert-error/10',
              },
              {
                label: 'Maintenance',
                value: data.summary.maintenance,
                icon: HiOutlineWrenchScrewdriver,
                color: 'text-alert-warning',
                bg: 'bg-alert-warning/10',
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-bg-card rounded-card shadow-card border border-border p-4 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-caption text-text-muted m-0">{stat.label}</p>
                    <p className={`text-card-title font-bold ${stat.color} m-0 mt-0.5`}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {data && !loading && (
          <div className="bg-bg-card rounded-card shadow-card border border-border px-4 py-3 mb-4">
            {renderLegend()}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-card rounded-card border border-border">
            <LuLoader className="w-10 h-10 text-brand animate-spin" />
            <p className="text-body text-text-muted mt-4">Loading availability data...</p>
          </div>
        )}

        {/* Calendar Grid */}
        {!loading && data && data.rooms.length > 0 && (
          <div
            ref={gridRef}
            className="bg-bg-card rounded-card shadow-card border border-border overflow-hidden"
          >
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <table className="w-full border-collapse">
                  {/* Day headers row */}
                  <thead>
                    <tr>
                      <th
                        className="sticky left-0 z-20 bg-bg-table-header px-3 py-2.5 text-left border-r border-b border-border"
                        style={{ minWidth: 160 }}
                      >
                        <div className="flex items-center gap-2">
                          <HiOutlineSquares2X2 className="w-4 h-4 text-text-muted" />
                          <span className="text-caption font-semibold text-text-secondary uppercase tracking-wider">
                            Room
                          </span>
                        </div>
                      </th>
                      {dayHeaders.map(({ day, dow }) => (
                        <th
                          key={day}
                          className={`text-center border-b border-border px-1 py-1.5 ${
                            isToday(day) ? 'bg-brand-light' : 'bg-bg-table-header'
                          }`}
                          style={{ minWidth: 32, width: 32 }}
                        >
                          <div className="text-caption text-text-muted font-medium">
                            {DAY_NAMES[dow][0]}
                          </div>
                          <div
                            className={`text-small font-bold leading-tight ${
                              isToday(day)
                                ? 'text-brand'
                                : dow === 0 || dow === 6
                                  ? 'text-alert-error'
                                  : 'text-text-primary'
                            }`}
                          >
                            {day}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* Room rows */}
                  <tbody>
                    {data.rooms.map((room, idx) => (
                      <tr
                        key={room.room_id}
                        className={`transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-bg-table-header/30'
                        } hover:bg-brand-light/30`}
                      >
                        {/* Room info (sticky) */}
                        <td className="sticky left-0 z-10 bg-inherit px-3 py-2 border-r border-b border-border">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                room.status === 'maintenance'
                                  ? 'bg-alert-warning'
                                  : room.status === 'occupied'
                                    ? 'bg-alert-error'
                                    : 'bg-alert-success'
                              }`}
                            />
                            <div>
                              <span className="text-small font-semibold text-text-primary">
                                {room.room_number}
                              </span>
                              <span className="text-caption text-text-muted ml-1.5 capitalize">
                                {room.room_type}
                              </span>
                              <span className="text-caption text-text-muted ml-1.5">
                                · ${parseFloat(room.price_per_night).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Daily cells */}
                        {room.availability.map((daily, dayIdx) => {
                          const config = STATUS_STYLES[daily.status] || STATUS_STYLES.available;
                          return (
                            <td
                              key={dayIdx}
                              className={`text-center border-b border-border p-0.5 transition-all duration-100 cursor-default ${config.bg} ${config.hover}`}
                              style={{ minWidth: 32, width: 32 }}
                              onMouseEnter={(e) =>
                                handleCellHover(
                                  room.room_number,
                                  daily.day,
                                  daily.status,
                                  config.label,
                                  e,
                                )
                              }
                              onMouseLeave={handleCellLeave}
                            >
                              <div
                                className={`w-full h-full flex items-center justify-center`}
                              >
                                <div className={`w-2 h-2 rounded-full ${config.dot} opacity-60`} />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && data && data.rooms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-card rounded-card border border-border">
            <HiOutlineInformationCircle className="w-12 h-12 text-text-muted mb-4" />
            <h3 className="text-card-title font-semibold text-text-primary m-0">No rooms found</h3>
            <p className="text-body text-text-secondary mt-2 text-center max-w-sm">
              Add rooms to your hotel to view the availability calendar.
            </p>
          </div>
        )}

        {/* Room list below grid */}
        {!loading && data && data.rooms.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-text-muted">
            <span className="font-medium">Rooms: {data.rooms.length}</span>
            <span>·</span>
            <span>
              {data.rooms.filter((r) => r.status !== 'maintenance').length} operational
            </span>
            <span>·</span>
            <span>
              {data.rooms.filter((r) => r.status === 'maintenance').length} in maintenance
            </span>
          </div>
        )}
      {/* Floating tooltip */}
      {renderTooltip()}
    </div>
  );
}
