import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlinePlus,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import { format, parseISO } from 'date-fns';

import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import BookingFormModal from '../components/BookingFormModal';
import BookingDrawer from '../components/BookingDrawer';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { getBookings, createBooking, updateBooking, deleteBooking, checkInBooking, checkOutBooking } from '../services/api';

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function BookingManagement() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      params.skip = page * PAGE_SIZE;
      params.limit = PAGE_SIZE;
      const data = await getBookings(params);
      setBookings(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { setPage(0); }, [statusFilter]);

  // ── Search/filter ─────────────────────────────────────────────

  const filteredBookings = useMemo(() => {
    if (!search) return bookings;
    const q = search.toLowerCase();
    return bookings.filter((b) =>
      b.guest_name?.toLowerCase().includes(q) ||
      (b.guest_email && b.guest_email.toLowerCase().includes(q)) ||
      (b.room_number && b.room_number.toLowerCase().includes(q))
    );
  }, [bookings, search]);

  const totalPages = hasMore ? page + 2 : page + 1;

  // ── Drawer handlers ───────────────────────────────────────────

  const openDrawer = (booking) => {
    setSelectedBooking(booking);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedBooking(null), 200);
  };

  // ── CRUD ──────────────────────────────────────────────────────

  const openCreateForm = () => { setEditingBooking(null); setFormOpen(true); };
  const openEditForm = (booking) => { setEditingBooking(booking); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditingBooking(null); };

  const handleSave = async (payload) => {
    if (editingBooking) {
      await updateBooking(editingBooking.id, payload);
      toast.success('Booking updated');
    } else {
      await createBooking(payload);
      toast.success('Booking created');
    }
    closeForm();
    fetchBookings();
  };

  const confirmDelete = (booking) => {
    closeDrawer();
    setDeleteTarget(booking);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBooking(deleteTarget.id);
      toast.success('Booking deleted');
      setDeleteTarget(null);
      fetchBookings();
    } catch {
      toast.error('Failed to delete booking');
    } finally {
      setDeleting(false);
    }
  };

  const handleCheckIn = async (booking) => {
    try {
      await checkInBooking(booking.id);
      toast.success(`${booking.guest_name} checked in!`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to check in');
    }
  };

  const handleCheckOut = async (booking) => {
    try {
      await checkOutBooking(booking.id);
      toast.success(`${booking.guest_name} checked out!`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to check out');
    }
  };

  // ── Table columns ─────────────────────────────────────────────

  const columns = [
    {
      header: 'Guest',
      accessor: 'guest_name',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-text-primary">{row.guest_name}</span>
          {row.guest_email && (
            <p className="text-caption text-text-muted m-0">{row.guest_email}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Room',
      accessor: 'room_number',
      sortable: true,
      width: '100px',
      render: (row) => (
        <div>
          <span className="font-medium text-text-primary">{row.room_number || '—'}</span>
          {row.room_type && (
            <p className="text-caption text-text-muted capitalize m-0">{row.room_type}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Check-in',
      accessor: 'check_in_date',
      sortable: true,
      width: '110px',
      render: (row) => (
        <span className="text-small text-text-primary">
          {(() => { try { return format(parseISO(row.check_in_date), 'MMM d'); } catch { return row.check_in_date; }})()}
        </span>
      ),
    },
    {
      header: 'Check-out',
      accessor: 'check_out_date',
      sortable: true,
      width: '110px',
      render: (row) => (
        <span className="text-small text-text-primary">
          {(() => { try { return format(parseISO(row.check_out_date), 'MMM d'); } catch { return row.check_out_date; }})()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'booking_status',
      sortable: true,
      width: '120px',
      render: (row) => <StatusBadge status={row.booking_status} size="sm" />,
    },
    {
      header: 'Total',
      accessor: 'total_amount',
      sortable: true,
      width: '90px',
      render: (row) => (
        <span className="font-semibold font-mono text-text-primary">
          {row.total_amount != null ? `$${parseFloat(row.total_amount).toFixed(2)}` : '—'}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-section-title font-bold text-text-primary m-0">Booking Management</h2>
          <p className="text-body text-text-secondary mt-1">Manage guest reservations, check-ins, and check-outs</p>
        </div>
        <Button onClick={openCreateForm}>
          <HiOutlinePlus className="w-5 h-5" />
          New Booking
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by guest name, email, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[40px] pl-9 pr-4 py-2 text-small bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
          />
        </div>

        <div className="relative">
          <HiOutlineFunnel className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[40px] pl-8 pr-7 py-2 text-small bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer min-w-[160px]"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <p className="text-small text-text-muted mb-3">
        {loading ? 'Loading...' : `${filteredBookings.length} booking${filteredBookings.length !== 1 ? 's' : ''} found`}
      </p>

      {/* Table */}
      <div className="w-full overflow-x-auto rounded-card border border-border bg-bg-card shadow-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-bg-table-header">
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 text-caption font-semibold text-text-secondary uppercase tracking-wider text-left border-b border-border" style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg className="w-6 h-6 text-brand animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-small text-text-muted">Loading...</p>
                  </div>
                </td>
              </tr>
            ) : filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <HiOutlineCalendarDays className="w-10 h-10 text-text-muted" />
                    <p className="text-body font-medium text-text-secondary">No bookings found</p>
                    <p className="text-small text-text-muted">
                      {search || statusFilter ? 'Try adjusting your filters.' : 'Create your first booking to get started.'}
                    </p>
                    {!search && !statusFilter && (
                      <Button onClick={openCreateForm} className="mt-2">
                        <HiOutlinePlus className="w-4 h-4" />
                        Create Booking
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking, idx) => (
                <motion.tr
                  key={booking.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-t border-border/50 cursor-pointer hover:bg-brand-50/40 transition-colors"
                  onClick={() => openDrawer(booking)}
                >
                  {columns.map((col, i) => (
                    <td key={i} className="px-4 py-3 text-body text-text-primary">
                      {col.render ? col.render(booking) : booking[col.accessor] ?? <span className="text-text-muted">—</span>}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <p className="text-small text-text-muted">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-[34px] px-3 text-small bg-bg-card border border-border rounded-button text-text-primary hover:bg-bg-table-header transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="h-[34px] px-3 text-small bg-bg-card border border-border rounded-button text-text-primary hover:bg-bg-table-header transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <BookingFormModal open={formOpen} onClose={closeForm} onSave={handleSave} booking={editingBooking} />
      <BookingDrawer
        open={drawerOpen}
        booking={selectedBooking}
        onClose={closeDrawer}
        onEdit={(b) => { openEditForm(b); }}
        onDelete={confirmDelete}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Booking"
        message={deleteTarget ? `Delete booking for "${deleteTarget.guest_name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
