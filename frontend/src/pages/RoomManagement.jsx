import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineBuildingOffice2,
} from 'react-icons/hi2';

import Button from '../components/Button';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import RoomFormModal from '../components/RoomFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getRooms, createRoom, updateRoom, deleteRoom, updateRoomStatus } from '../services/api';

const ROOM_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'suite', label: 'Suite' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
];

// Valid status transitions for the quick-change dropdown
const VALID_NEXT_STATUS = {
  available: ['occupied', 'maintenance'],
  occupied: ['available'],
  maintenance: ['available'],
};

export default function RoomManagement() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Status change tracking
  const [statusChanging, setStatusChanging] = useState({});

  // ── Fetch rooms ──────────────────────────────────────────────

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.room_type = typeFilter;
      const data = await getRooms(params);
      setRooms(data);
    } catch (err) {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // ── Filtered rooms ───────────────────────────────────────────

  const filteredRooms = rooms.filter((room) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      room.room_number.toLowerCase().includes(q) ||
      room.room_type.toLowerCase().includes(q) ||
      (room.description && room.description.toLowerCase().includes(q))
    );
  });

  // ── CRUD handlers ────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingRoom(null);
    setFormOpen(true);
  };

  const openEditForm = (room) => {
    setEditingRoom(room);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingRoom(null);
  };

  const handleSave = async (payload) => {
    if (editingRoom) {
      const updated = await updateRoom(editingRoom.id, payload);
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success('Room updated successfully');
    } else {
      const created = await createRoom(payload);
      setRooms((prev) => [...prev, created]);
      toast.success('Room created successfully');
    }
    closeForm();
  };

  const confirmDelete = (room) => setDeleteTarget(room);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRoom(deleteTarget.id);
      setRooms((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success('Room deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Failed to delete room');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    if (!deleting) setDeleteTarget(null);
  };

  // ── Status Transition Handler ────────────────────────────────

  const handleStatusChange = async (room, newStatus) => {
    setStatusChanging((prev) => ({ ...prev, [room.id]: true }));
    try {
      const updated = await updateRoomStatus(room.id, newStatus);
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success(`Room ${room.room_number} is now ${newStatus}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === 'object' && detail?.message
          ? detail.message
          : 'Failed to change room status';
      toast.error(message);
    } finally {
      setStatusChanging((prev) => ({ ...prev, [room.id]: false }));
    }
  };

  // ── Table columns ───────────────────────────────────────────

  const columns = [
    {
      header: 'Room',
      accessor: 'room_number',
      sortable: true,
      width: '100px',
      render: (row) => (
        <span className="font-semibold text-text-primary">{row.room_number}</span>
      ),
    },
    {
      header: 'Type',
      accessor: 'room_type',
      sortable: true,
      width: '100px',
      render: (row) => (
        <span className="capitalize text-text-secondary">{row.room_type}</span>
      ),
    },
    {
      header: 'Price / Night',
      accessor: 'price_per_night',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span className="font-medium text-text-primary">
          ${parseFloat(row.price_per_night).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      width: '160px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          {/* Quick-status change dropdown */}
          <div className="relative group">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleStatusChange(row, e.target.value);
                e.target.value = ''; // reset select
              }}
              disabled={statusChanging[row.id]}
              className="opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto h-6 px-0 group-hover:px-2 text-caption bg-transparent border border-border rounded outline-none transition-all duration-150 cursor-pointer disabled:opacity-30 absolute right-0 top-1/2 -translate-y-1/2"
            >
              <option value="">Change…</option>
              {(VALID_NEXT_STATUS[row.status] || []).map((s) => (
                <option key={s} value={s}>
                  → {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            {/* Small icon hint on hover */}
            {!statusChanging[row.id] && (
              <button
                onClick={() => {
                  const next = (VALID_NEXT_STATUS[row.status] || [])[0];
                  if (next) handleStatusChange(row, next);
                }}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all text-caption ml-1 shrink-0"
                title={`Change status`}
              >
                ↻
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      sortable: false,
      render: (row) => (
        <span className="text-text-secondary text-small line-clamp-1">
          {row.description || '—'}
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
            title="Edit room"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); confirmDelete(row); }}
            className="p-1.5 rounded-md text-text-muted hover:text-alert-error hover:bg-red-50 transition-all"
            title="Delete room"
          >
            <HiOutlineTrash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────

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
            <h2 className="text-section-title font-bold text-text-primary m-0">Room Management</h2>
            <p className="text-body text-text-secondary mt-1">Manage hotel rooms, availability, and pricing</p>
          </div>
          <Button onClick={openCreateForm}>
            <HiOutlinePlus className="w-5 h-5" />
            Add Room
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search rooms by number, type, or description..."
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
              {ROOM_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-small text-text-muted mb-3">
          {loading ? 'Loading rooms...' : `${filteredRooms.length} room${filteredRooms.length !== 1 ? 's' : ''} found`}
        </p>

        <Table
          columns={columns}
          data={filteredRooms}
          loading={loading}
          emptyMessage="No rooms found"
          emptyDescription={
            search || statusFilter || typeFilter
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by adding your first room.'
          }
          keyExtractor={(row) => row.id}
        />
      </main>

      {/* Create/Edit Modal */}
      <RoomFormModal open={formOpen} onClose={closeForm} onSave={handleSave} room={editingRoom} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={cancelDelete}
        title="Delete Room"
        message={
          deleteTarget
            ? `Are you sure you want to delete room "${deleteTarget.room_number}"? This action cannot be undone.`
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
