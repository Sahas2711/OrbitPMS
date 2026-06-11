import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineBuildingOffice2,
  HiOutlineXMark,
} from 'react-icons/hi2';

import Button from '../components/Button';
import Input from '../components/Input';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
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

const emptyForm = {
  room_number: '',
  room_type: 'standard',
  price_per_night: '',
  description: '',
};

export default function RoomManagement() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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

  // ── Filtered rooms (client-side search) ─────────────────────

  const filteredRooms = rooms.filter((room) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      room.room_number.toLowerCase().includes(q) ||
      room.room_type.toLowerCase().includes(q) ||
      (room.description && room.description.toLowerCase().includes(q))
    );
  });

  // ── Form handlers ────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingRoom(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number,
      room_type: room.room_type,
      price_per_night: room.price_per_night.toString(),
      description: room.description || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRoom(null);
    setFormData(emptyForm);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        room_number: formData.room_number,
        room_type: formData.room_type,
        price_per_night: parseFloat(formData.price_per_night),
        description: formData.description || null,
      };

      if (editingRoom) {
        const updated = await updateRoom(editingRoom.id, payload);
        setRooms((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        toast.success('Room updated successfully');
      } else {
        const created = await createRoom(payload);
        setRooms((prev) => [...prev, created]);
        toast.success('Room created successfully');
      }
      closeForm();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === 'object' && detail?.message
          ? detail.message
          : 'Failed to save room';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room) => {
    if (!window.confirm(`Delete room "${room.room_number}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteRoom(room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      toast.success('Room deleted successfully');
    } catch (err) {
      toast.error('Failed to delete room');
    }
  };

  // ── Table columns ───────────────────────────────────────────

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
        <span className="capitalize text-text-secondary">{row.room_type}</span>
      ),
    },
    {
      header: 'Price / Night',
      accessor: 'price_per_night',
      sortable: true,
      width: '140px',
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
      width: '140px',
      render: (row) => <StatusBadge status={row.status} />,
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
      width: '100px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditForm(row);
            }}
            className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-brand-light transition-all"
            title="Edit room"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
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
      {/* Top Bar */}
      <header className="bg-primary-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HiOutlineBuildingOffice2 className="w-6 h-6 text-brand" />
          <h1 className="text-card-title font-semibold m-0">OrbitPMS</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-section-title font-bold text-text-primary m-0">
              Room Management
            </h2>
            <p className="text-body text-text-secondary mt-1">
              Manage hotel rooms, availability, and pricing
            </p>
          </div>
          <Button onClick={openCreateForm}>
            <HiOutlinePlus className="w-5 h-5" />
            Add Room
          </Button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
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

          {/* Status Filter */}
          <div className="relative">
            <HiOutlineFunnel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[44px] pl-9 pr-8 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer min-w-[160px]"
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
              className="h-[44px] pl-4 pr-8 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer min-w-[140px]"
            >
              {ROOM_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Room Count */}
        <p className="text-small text-text-muted mb-3">
          {loading
            ? 'Loading rooms...'
            : `${filteredRooms.length} room${filteredRooms.length !== 1 ? 's' : ''} found`}
        </p>

        {/* Room Table */}
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

      {/* ── Add/Edit Room Modal ────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-bg-card rounded-modal shadow-modal border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-card-title font-semibold text-text-primary m-0">
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </h3>
              <button
                onClick={closeForm}
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-table-header transition-all"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Room Number */}
              <Input
                label="Room Number"
                placeholder="e.g. 101, 202A"
                value={formData.room_number}
                onChange={(e) => handleFormChange('room_number', e.target.value)}
                required
                disabled={saving}
              />

              {/* Room Type */}
              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">
                  Room Type
                </label>
                <select
                  value={formData.room_type}
                  onChange={(e) => handleFormChange('room_type', e.target.value)}
                  disabled={saving}
                  className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="standard">Standard</option>
                  <option value="deluxe">Deluxe</option>
                  <option value="suite">Suite</option>
                </select>
              </div>

              {/* Price */}
              <Input
                label="Price per Night ($)"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 150.00"
                value={formData.price_per_night}
                onChange={(e) => handleFormChange('price_per_night', e.target.value)}
                required
                disabled={saving}
              />

              {/* Description */}
              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  disabled={saving}
                  rows={3}
                  placeholder="Optional room description..."
                  className="w-full px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  {editingRoom ? 'Update Room' : 'Create Room'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
