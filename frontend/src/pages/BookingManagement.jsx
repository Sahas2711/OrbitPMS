import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineBuildingOffice2,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from 'react-icons/hi2';
import { format } from 'date-fns';

import Button from '../components/Button';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import BookingFormModal from '../components/BookingFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getBookings, createBooking, updateBooking, deleteBooking } from '../services/api';

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ROOM_TYPE_FILTERS = [
  { value: '', label: 'All Types' },
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'suite', label: 'Suite' },
];

export default function BookingManagement() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch bookings ──────────────────────────────────────────

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

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [statusFilter, typeFilter]);

  // ── Filtered/search bookings (client-side search) ───────────

  const filteredBookings = bookings.filter((b) => {
    // Room type filter (client-side since backend doesn't support it)
    if (typeFilter && b.room_type !== typeFilter) return false;

    // Text search
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.guest_name?.toLowerCase().includes(q) ||
      (b.guest_email && b.guest_email.toLowerCase().includes(q)) ||
      (b.guest_phone && b.guest_phone.toLowerCase().includes(q)) ||
      (b.room_number && b.room_number.toLowerCase().includes(q))
    );
  });

  // ── Total pages calculation ─────────────────────────────────

  const totalPages = hasMore
    ? page + 2 // we know there's at least one more page
    : page + 1;

  // ── CRUD handlers ───────────────────────────────────────────

  const openCreateForm = () => {
    setEditingBooking(null);
    setFormOpen(true);
  };

  const openEditForm = (booking) => {
    setEditingBooking(booking);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingBooking(null);
  };

  const handleSave = async (payload) => {
    if (editingBooking) {
      const updated = await updateBooking(editingBooking.id, payload);
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      toast.success('Booking updated successfully');
    } else {
      const created = await createBooking(payload);
      setBookings((prev) => [created, ...prev]);
      toast.success('Booking created successfully');
    }
    closeForm();
    // Re-fetch to stay in sync
    fetchBookings();
  };

  const confirmDelete = (booking) => setDeleteTarget(booking);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBooking(deleteTarget.id);
      setBookings((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast.success('Booking deleted successfully');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete booking');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    if (!deleting) setDeleteTarget(null);
  };

  // ── Pagination handlers ─────────────────────────────────────

  const goToPrevPage = () => {
    if (page > 0) setPage((p) => p - 1);
  };

  const goToNextPage = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  // ── Table columns ───────────────────────────────────────────

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
            <p className="text-caption text-text-muted m-0 capitalize">{row.room_type}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Check-in',
      accessor: 'check_in_date',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span className="text-text-primary">{format(new Date(row.check_in_date), 'MMM d, yyyy')}</span>
      ),
    },
    {
      header: 'Check-out',
      accessor: 'check_out_date',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span className="text-text-primary">{format(new Date(row.check_out_date), 'MMM d, yyyy')}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'booking_status',
      sortable: true,
      width: '120px',
      render: (row) => <StatusBadge status={row.booking_status} />,
    },
    {
      header: 'Total',
      accessor: 'total_amount',
      sortable: true,
      width: '100px',
      render: (row) => (
        <span className="font-medium text-text-primary">
          {row.total_amount != null ? `$${parseFloat(row.total_amount).toFixed(2)}` : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      width: '90px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditForm(row); }}
            className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-brand-light transition-all"
            title="Edit booking"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); confirmDelete(row); }}
            className="p-1.5 rounded-md text-text-muted hover:text-alert-error hover:bg-red-50 transition-all"
            title="Delete booking"
          >
            <HiOutlineTrash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-svh bg-bg-page">
      <header className="bg-primary-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HiOutlineBuildingOffice2 className="w-6 h-6 text-brand" />
          <h1 className="text-card-title font-semibold m-0">OrbitPMS</h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
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
          <div className="relative flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by guest name, email, phone, or room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[44px] pl-10 pr-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
            />
          </div>

          <div className="relative">
            <HiOutlineFunnel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[44px] pl-9 pr-8 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer min-w-[160px]"
            >
              {STATUS_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-[44px] pl-4 pr-8 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer min-w-[140px]"
            >
              {ROOM_TYPE_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-small text-text-muted">
            {loading
              ? 'Loading bookings...'
              : `${filteredBookings.length} booking${filteredBookings.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={filteredBookings}
          loading={loading}
          emptyMessage="No bookings found"
          emptyDescription={
            search || statusFilter || typeFilter
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by creating your first booking.'
          }
          keyExtractor={(row) => row.id}
        />

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-small text-text-muted">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={page === 0}
                className="h-[36px] px-3 py-1.5 text-small bg-bg-card border border-border rounded-button text-text-primary hover:bg-bg-table-header transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <HiOutlineChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={goToNextPage}
                disabled={!hasMore}
                className="h-[36px] px-3 py-1.5 text-small bg-bg-card border border-border rounded-button text-text-primary hover:bg-bg-table-header transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <HiOutlineChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      <BookingFormModal
        open={formOpen}
        onClose={closeForm}
        onSave={handleSave}
        booking={editingBooking}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={cancelDelete}
        title="Delete Booking"
        message={
          deleteTarget
            ? `Are you sure you want to delete the booking for "${deleteTarget.guest_name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
