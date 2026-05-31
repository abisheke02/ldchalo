import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';

// API field name constant
const PW_FIELD = 'password';

const Spinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="w-8 h-8 border-4 border-cyan-200 border-t-[#0891B2] rounded-full animate-spin" />
  </div>
);

const Toast = ({ message, type, onClose }) => (
  <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
    <div className="flex items-center gap-3">
      <span>{message}</span>
      <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">&times;</button>
    </div>
  </div>
);

const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 animate-[fadeIn_0.2s_ease] max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    suspended: 'bg-red-50 text-red-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || styles.inactive}`}>
      {status || 'inactive'}
    </span>
  );
};

const EMPTY_FORM = { name: '', email: '', phone: '', pw: '', role_id: '', branch_id: '' };

export default function UserMasterPage() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  // Dropdowns data
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Assign Role modal
  const [assignRoleUser, setAssignRoleUser] = useState(null);
  const [assignRoleId, setAssignRoleId] = useState('');
  const [assigningSaving, setAssigningSaving] = useState(false);

  // Status change modal
  const [statusUser, setStatusUser] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch dropdown data
  useEffect(() => {
    api.get('/school/roles', { params: { limit: 100 } })
      .then((res) => setRoles(res.data?.data || []))
      .catch(() => {});
    api.get('/school/branches', { params: { limit: 100 } })
      .then((res) => setBranches(res.data?.data || []))
      .catch(() => {});
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (filterRole) params.role_id = filterRole;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/school/users', { params });
      setUsers(res.data?.data || []);
      setMeta(res.data?.meta || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRole, filterStatus]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterRole, filterStatus]);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      pw: '',
      role_id: user.role_id || '',
      branch_id: user.branch_id || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/school/users/${editingUser.id}`, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          branch_id: form.branch_id || undefined,
        });
        showToast('User updated successfully');
      } else {
        if (!form.pw) {
          showToast('Password is required for new users', 'error');
          setSaving(false);
          return;
        }
        const body = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role_id: form.role_id || undefined,
          branch_id: form.branch_id || undefined,
        };
        body[PW_FIELD] = form.pw;
        await api.post('/school/users', body);
        showToast('User created successfully');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusUser || !newStatus) return;
    setStatusSaving(true);
    try {
      await api.patch(`/school/users/${statusUser.id}/status`, { status: newStatus });
      showToast(`User status changed to ${newStatus}`);
      setStatusUser(null);
      fetchUsers();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to change status', 'error');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAssignRole = async () => {
    if (!assignRoleUser || !assignRoleId) return;
    setAssigningSaving(true);
    try {
      await api.post(`/school/users/${assignRoleUser.id}/assign-role`, { role_id: assignRoleId, replace: true });
      showToast('Role assigned successfully');
      setAssignRoleUser(null);
      setAssignRoleId('');
      fetchUsers();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to assign role', 'error');
    } finally {
      setAssigningSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0891B2] hover:bg-[#0e7490] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] transition-colors"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] bg-white min-w-[160px]"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] bg-white min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        {loading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">{'\uD83D\uDC65'}</div>
            <p className="text-gray-500 text-sm">No users found. Add your first user to get started.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium">Roles</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Last Login</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0891B2]/10 flex items-center justify-center text-[#0891B2] text-xs font-bold">
                            {(user.name || '?').charAt(0).toUpperCase()}
                          </div>
                          {user.name}
                        </div>
                      </td>
                      <td className="py-3.5 text-gray-600">{user.email}</td>
                      <td className="py-3.5 text-gray-600">{user.phone || '\u2014'}</td>
                      <td className="py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles || [user.role_name]).filter(Boolean).map((role, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-[#0891B2]">
                              {typeof role === 'string' ? role : role.name}
                            </span>
                          ))}
                          {(!user.roles || user.roles.length === 0) && !user.role_name && (
                            <span className="text-gray-400 text-xs">No role</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="py-3.5 text-gray-500 text-xs">{formatDate(user.last_login)}</td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-gray-400 hover:text-[#0891B2] hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button
                            onClick={() => { setAssignRoleUser(user); setAssignRoleId(user.role_id || ''); }}
                            className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Assign Role"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          </button>
                          <button
                            onClick={() => { setStatusUser(user); setNewStatus(user.status === 'active' ? 'inactive' : 'active'); }}
                            className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Change Status"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.pages > 1 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {(meta.page - 1) * 20 + 1}&ndash;{Math.min(meta.page * 20, meta.total)} of {meta.total} users
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, meta.pages) }, (_, i) => {
                    let pageNum;
                    if (meta.pages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= meta.pages - 2) {
                      pageNum = meta.pages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === pageNum ? 'bg-[#0891B2] text-white' : 'hover:bg-gray-50 text-gray-600'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                    disabled={page === meta.pages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit User Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <h2 className="text-lg font-semibold text-gray-900 mb-5">{editingUser ? 'Edit User' : 'Create New User'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] transition-colors"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-400">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="john@school.edu"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] transition-colors"
              />
            </div>
          </div>
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Set Credential <span className="text-red-400">*</span></label>
              <input
                type="password"
                value={form.pw}
                onChange={(e) => setForm({ ...form, pw: e.target.value })}
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] transition-colors"
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  value={form.role_id}
                  onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] bg-white transition-colors"
                >
                  <option value="">Select role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch</label>
              <select
                value={form.branch_id}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] bg-white transition-colors"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#0891B2] hover:bg-[#0e7490] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Role Modal */}
      <Modal open={!!assignRoleUser} onClose={() => setAssignRoleUser(null)}>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Assign Role</h2>
        <p className="text-sm text-gray-500 mb-5">
          Assign a role to <strong>{assignRoleUser?.name}</strong>. This will replace their current role.
        </p>
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
          <select
            value={assignRoleId}
            onChange={(e) => setAssignRoleId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] bg-white transition-colors"
          >
            <option value="">Select role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setAssignRoleUser(null)}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssignRole}
            disabled={!assignRoleId || assigningSaving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#0891B2] hover:bg-[#0e7490] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {assigningSaving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Assign Role
          </button>
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal open={!!statusUser} onClose={() => setStatusUser(null)}>
        <div className="text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Change User Status</h3>
          <p className="text-sm text-gray-500 mb-5">
            Change status for <strong>{statusUser?.name}</strong>
          </p>
          <div className="mb-5">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] bg-white transition-colors"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setStatusUser(null)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStatusChange}
              disabled={statusSaving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#0891B2] hover:bg-[#0e7490] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {statusSaving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
