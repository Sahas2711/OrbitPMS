import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineUsers,
  HiOutlineCheckCircle,
  HiOutlineNoSymbol,
} from 'react-icons/hi2';
import { LuLoader } from 'react-icons/lu';

import Button from '../components/Button';
import { getUsers, createUser, toggleUserStatus, deleteUser } from '../services/api';

const ROLES = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'staff', label: 'Staff' },
];

const ROLE_BADGES = {
  admin: 'bg-purple-100 text-purple-700',
  receptionist: 'bg-cyan-100 text-cyan-700',
  staff: 'bg-slate-100 text-slate-700',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Create modal
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: 'staff' });

  // ── Fetch users from API ──────────────────────────────────────

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      const msg = err.response?.data?.detail?.message || 'Failed to load users';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ── Filter ────────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [users, search, roleFilter]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ── Actions ───────────────────────────────────────────────────

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await toggleUserStatus(userId, !currentStatus);
      toast.success('User status updated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Failed to update status');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await deleteUser(userId);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Failed to delete user');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createUser(formData);
      toast.success('User created successfully');
      setFormOpen(false);
      setFormData({ fullName: '', email: '', password: '', role: 'staff' });
      fetchUsers();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'object' && detail?.message
        ? detail.message
        : 'Failed to create user';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-section-title font-bold text-text-primary m-0">User Management</h2>
          <p className="text-body text-text-secondary mt-1">Manage system users and their roles</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <HiOutlinePlus className="w-5 h-5" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[40px] pl-9 pr-4 py-2 text-small bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
          />
        </div>
        <div className="relative">
          <HiOutlineFunnel className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-[40px] pl-8 pr-7 py-2 text-small bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer min-w-[140px]"
          >
            {ROLES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-small text-text-muted mb-3">
        {loading ? 'Loading...' : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
      </p>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-bg-card rounded-card border border-border">
          <LuLoader className="w-8 h-8 text-brand animate-spin" />
          <p className="text-small text-text-muted mt-3">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-bg-card rounded-card border border-border">
          <HiOutlineUsers className="w-12 h-12 text-text-muted mb-4" />
          <h3 className="text-card-title font-semibold text-text-primary m-0">No users found</h3>
          <p className="text-body text-text-secondary mt-2">
            {search || roleFilter ? 'Try adjusting your filters.' : 'Add your first user to get started.'}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-card border border-border bg-bg-card shadow-card">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-bg-table-header">
                <th className="px-4 py-3 text-caption font-semibold text-text-secondary uppercase tracking-wider text-left border-b border-border">User</th>
                <th className="px-4 py-3 text-caption font-semibold text-text-secondary uppercase tracking-wider text-left border-b border-border">Email</th>
                <th className="px-4 py-3 text-caption font-semibold text-text-secondary uppercase tracking-wider text-left border-b border-border">Role</th>
                <th className="px-4 py-3 text-caption font-semibold text-text-secondary uppercase tracking-wider text-left border-b border-border">Status</th>
                <th className="px-4 py-3 text-caption font-semibold text-text-secondary uppercase tracking-wider text-left border-b border-border">Created</th>
                <th className="px-4 py-3 text-caption font-semibold text-text-secondary uppercase tracking-wider text-left border-b border-border w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, idx) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-t border-border/50 hover:bg-brand-50/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-small font-semibold text-white ${
                        u.role === 'admin' ? 'bg-purple-600' : u.role === 'receptionist' ? 'bg-cyan-600' : 'bg-slate-600'
                      }`}>
                        {getInitials(u.full_name)}
                      </div>
                      <span className="font-medium text-text-primary">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium capitalize ${ROLE_BADGES[u.role] || 'bg-slate-100 text-slate-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-caption font-medium ${
                      u.is_active ? 'text-alert-success' : 'text-text-muted'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-alert-success' : 'bg-text-muted'}`} />
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        className="p-1.5 rounded-md text-text-muted hover:text-alert-warning hover:bg-amber-50 transition-all"
                        title={u.is_active ? 'Disable user' : 'Enable user'}
                      >
                        {u.is_active ? <HiOutlineNoSymbol className="w-4 h-4" /> : <HiOutlineCheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-md text-text-muted hover:text-alert-error hover:bg-red-50 transition-all"
                        title="Delete user"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => !saving && setFormOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-card rounded-modal shadow-modal border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <HiOutlineUsers className="w-5 h-5 text-brand" />
                  <h3 className="text-body font-semibold text-text-primary m-0">Add User</h3>
                </div>
                <button onClick={() => setFormOpen(false)} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-table-header transition-all">
                  <HiOutlineXMark className="w-5 h-5" />
                </button>
              </div>
              <form className="p-6 space-y-4" onSubmit={handleCreateUser}>
                <div>
                  <label className="block text-small font-medium text-text-secondary mb-1.5">Full Name</label>
                  <input
                    type="text" placeholder="Enter full name" required
                    value={formData.fullName}
                    onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                    className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
                  />
                </div>
                <div>
                  <label className="block text-small font-medium text-text-secondary mb-1.5">Email</label>
                  <input
                    type="email" placeholder="Enter email address" required
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
                  />
                </div>
                <div>
                  <label className="block text-small font-medium text-text-secondary mb-1.5">Password</label>
                  <input
                    type="password" placeholder="Set initial password" required
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
                  />
                </div>
                <div>
                  <label className="block text-small font-medium text-text-secondary mb-1.5">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                    className="w-full h-[44px] px-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer"
                  >
                    <option value="staff">Staff</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
                  <Button type="submit" loading={saving}>Create User</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
