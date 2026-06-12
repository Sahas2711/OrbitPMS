import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineBuildingOffice2,
  HiOutlineSquares2X2,
  HiOutlineTableCells,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2';

import Button from '../components/Button';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import RoomFormModal from '../components/RoomFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../services/api';

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
  const [viewMode, setViewMode] = useState('table');

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Status change
  const [statusChanging, setStatusChanging] = useState({});

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.room_type = typeFilter;
      const data = await getRooms(params);
      setRooms(data);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const filteredRooms = useMemo(() => {
    if (!search) return rooms;
    const q = search.toLowerCase();
    return rooms.filter((r) =>
      r.room_number.toLowerCase().includes(q) ||
      r.room_type.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  }, [rooms, search]);

  // ── CRUD ──────────────────────────────────────────────────────

  const openCreateForm = () => { setEditingRoom(null); setFormOpen(true); };
  const openEditForm = (room) => { setEditingRoom(room); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditingRoom(null); };

  const handleSave = async (payload) => {
    if (editingRoom) {
      const updated = await updateRoom(editingRoom.id, payload);
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success('Room updated');
    } else {
      const created = await createRoom(payload);
      setRooms((prev) => [...prev, created]);
      toast.success('Room created');
    }
    closeForm();
  };

  // ── Delete handlers ──────────────────────────────────────────

  const confirmDelete = (room) => {
    setDeleteTarget(room);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await deleteRoom(deleteTarget.id);
      setRooms((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success('Room deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete room');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (room, newStatus) => {
    setStatusChanging((prev) => ({ ...prev, [room.id]: true }));
    try {
      const updated = await updateRoomStatus(room.id, newStatus);
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success(`Room ${room.room_number} is now ${newStatus}`);
    } catch {
      toast.error('Failed to change status');
    } finally {
      setStatusChanging((prev) => ({ ...prev, [room.id]: false }));
    }
  };

  // ── Bulk actions ──────────────────────────────────────────────

  const handleBulkStatus = async (newStatus) => {
    try {
      for (const id of selectedIds) {
        await updateRoomStatus(id, newStatus);
      }
      toast.success(`${selectedIds.size} rooms updated to ${newStatus}`);
      setSelectedIds(new Set());
      fetchRooms();
    } catch {
      toast.error('Failed to update some rooms');
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await deleteRoom(id);
      }
      toast.success(`${selectedIds.size} rooms deleted`);
      setSelectedIds(new Set());
      fetchRooms();
    } catch {
      toast.error('Failed to delete some rooms');
    }
  };

  // ── Table columns ─────────────────────────────────────────────

  const columns = [
    {
      header: 'Room',
      accessor: 'room_number',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span className="font-semibold text-text-primary">
          {row.room_number}
        </span>
      ),
    },
    {
      header: 'Type',
      accessor: 'room_type',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span className="capitalize text-text-secondary bg-bg-table-header/50 rounded px-2 py-0.5 text-small">{row.room_type}</span>
      ),
    },
    {
      header: 'Price / Night',
      accessor: 'price_per_night',
      sortable: true,
      width: '140px',
      render: (row) => (
        <span className="font-semibold text-text-primary font-mono">${parseFloat(row.price_per_night).toFixed(2)}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      width: '150px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} size="sm" />
          <div className="relative group">
            <select
              value=""
              onChange={(e) => { if (e.target.value) handleStatusChange(row, e.target.value); }}
              disabled={statusChanging[row.id]}
              className="opacity-0 group-hover:opacity-100 w-0 group-hover:w-20 h-6 text-caption bg-transparent border border-border rounded outline-none transition-all cursor-pointer disabled:opacity-30 absolute right-0 top-1/2 -translate-y-1/2"
            >
              <option value="">Change…</option>
              {(VALID_NEXT_STATUS[row.status] || []).map((s) => (
                <option key={s} value={s}>→ {s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      sortable: false,
      render: (row) => (
        <span className="text-text-secondary text-small line-clamp-1">{row.description || <span className="text-text-muted">—</span>}</span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      width: '100px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditForm(row); }}
            className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-brand-50 transition-all"
            title="Edit"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              confirmDelete(row);
            }}
            className="p-1.5 rounded-md text-text-muted hover:text-alert-error hover:bg-red-50 transition-all"
            title="Delete"
          >
            <HiOutlineTrash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search rooms by number, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[40px] pl-9 pr-4 py-2 text-small bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <HiOutlineFunnel className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[40px] pl-8 pr-7 py-2 text-small bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer min-w-[140px]"
            >
              {STATUS_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-[40px] pl-3 pr-7 py-2 text-small bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer min-w-[120px]"
            >
              {ROOM_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-input overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`h-[40px] px-3 transition-all ${viewMode === 'table' ? 'bg-brand text-white' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}
              title="Table View"
            >
              <HiOutlineTableCells className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`h-[40px] px-3 transition-all ${viewMode === 'cards' ? 'bg-brand text-white' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}
              title="Card View"
            >
              <HiOutlineSquares2X2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 mb-4 p-3 bg-brand-50 rounded-card border border-brand-200"
          >
            <span className="text-small font-medium text-text-primary">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={() => handleBulkStatus('available')}
              className="h-[32px] px-3 rounded-button text-caption font-medium bg-alert-success text-white hover:bg-green-600 transition-all"
            >
              <HiOutlineCheckCircle className="w-3.5 h-3.5 inline mr-1" />
              Mark Available
            </button>
            <button
              onClick={() => handleBulkStatus('maintenance')}
              className="h-[32px] px-3 rounded-button text-caption font-medium bg-alert-warning text-white hover:bg-amber-600 transition-all"
            >
              <HiOutlineWrenchScrewdriver className="w-3.5 h-3.5 inline mr-1" />
              Mark Maintenance
            </button>
            <button
              onClick={handleBulkDelete}
              className="h-[32px] px-3 rounded-button text-caption font-medium bg-alert-error text-white hover:bg-red-600 transition-all"
            >
              <HiOutlineTrash className="w-3.5 h-3.5 inline mr-1" />
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-[32px] px-3 text-caption text-text-secondary hover:text-text-primary transition-all"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-small text-text-muted mb-3">
        {loading ? 'Loading rooms...' : `${filteredRooms.length} room${filteredRooms.length !== 1 ? 's' : ''} found`}
      </p>

      {/* Table View */}
      {viewMode === 'table' && (
        <Table
          columns={columns}
          data={filteredRooms}
          loading={loading}
          loadingSkeleton
          emptyMessage="No rooms found"
          emptyDescription={search || statusFilter || typeFilter ? 'Try adjusting your filters.' : 'Get started by adding your first room.'}
          emptyAction={!search && !statusFilter && !typeFilter ? (
            <Button onClick={openCreateForm}><HiOutlinePlus className="w-4 h-4" />Add Room</Button>
          ) : null}
          keyExtractor={(row) => row.id}
          searchable
          searchPlaceholder="Filter rooms..."
          exportable
          selectable
          selectedRows={selectedIds}
          onSelectRow={(id) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onSelectAll={(ids) => setSelectedIds(ids)}
          compact
          pageSize={20}
        />
      )}

      {/* Card View */}
      {viewMode === 'cards' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="bg-bg-card rounded-card border border-border p-4">
                  <div className="skeleton h-5 w-16 mb-3" />
                  <div className="skeleton h-4 w-24 mb-2" />
                  <div className="skeleton h-8 w-20 mb-3" />
                  <div className="skeleton h-6 w-28 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <EmptyState
              title="No rooms found"
              description={search || statusFilter || typeFilter ? 'Try adjusting your filters.' : 'Get started by adding your first room.'}
              actionLabel={!search && !statusFilter && !typeFilter ? 'Add Room' : undefined}
              onAction={!search && !statusFilter && !typeFilter ? openCreateForm : undefined}
              actionIcon={HiOutlinePlus}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRooms.map((room, i) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-bg-card rounded-card border border-border shadow-card p-5 hover:shadow-hover transition-all duration-200 hover:border-border-secondary"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-card-title font-bold text-text-primary m-0">{room.room_number}</p>
                      <p className="text-caption text-text-muted capitalize m-0 mt-0.5">{room.room_type}</p>
                    </div>
                    <StatusBadge status={room.status} size="sm" />
                  </div>
                  <p className="text-display font-bold text-brand m-0">${parseFloat(room.price_per_night).toFixed(2)}</p>
                  <p className="text-caption text-text-muted m-0">per night</p>
                  {room.description && (
                    <p className="text-caption text-text-secondary mt-2 line-clamp-2">{room.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    <div className="relative group">
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) handleStatusChange(room, e.target.value); }}
                        disabled={statusChanging[room.id]}
                        className="h-[32px] px-2 text-caption bg-bg-table-header border border-border rounded-button outline-none cursor-pointer disabled:opacity-50 appearance-none"
                      >
                        <option value="">Change Status</option>
                        {(VALID_NEXT_STATUS[room.status] || []).map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => openEditForm(room)}
                      className="ml-auto p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-brand-50 transition-all"
                    >
                      <HiOutlinePencilSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmDelete(room)}
                      className="p-1.5 rounded-md text-text-muted hover:text-alert-error hover:bg-red-50 transition-all"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      <RoomFormModal open={formOpen} onClose={closeForm} onSave={handleSave} room={editingRoom} />
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Room"
        message={deleteTarget ? `Delete room "${deleteTarget.room_number}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
