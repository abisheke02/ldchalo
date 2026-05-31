import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../services/api';

const MODULES = [
  { key: 'administration', label: 'Administration', icon: '⚙️' },
  { key: 'admission', label: 'Admission', icon: '📋' },
  { key: 'student', label: 'Student', icon: '👨‍🎓' },
  { key: 'fees', label: 'Fees', icon: '💰' },
  { key: 'examination', label: 'Examination', icon: '📝' },
  { key: 'attendance', label: 'Attendance', icon: '✅' },
  { key: 'timetable', label: 'Timetable', icon: '📅' },
  { key: 'communication', label: 'Communication', icon: '💬' },
  { key: 'transport', label: 'Transport', icon: '🚌' },
  { key: 'library', label: 'Library', icon: '📚' },
  { key: 'payroll', label: 'Payroll', icon: '💳' },
  { key: 'reports', label: 'Reports', icon: '📊' },
];

const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

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

export default function PermissionMatrixPage() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [allPermissions, setAllPermissions] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get('/school/roles', { params: { limit: 100 } });
        const rolesList = res.data?.data || [];
        setRoles(rolesList);
        if (rolesList.length > 0) setSelectedRole(rolesList[0]);
      } catch (err) {
        showToast('Failed to load roles', 'error');
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  // Fetch all available permissions
  useEffect(() => {
    const fetchAllPermissions = async () => {
      try {
        const res = await api.get('/school/roles/permissions');
        setAllPermissions(res.data?.data || []);
      } catch (err) {
        // silently fail, will use module/action grid
      }
    };
    fetchAllPermissions();
  }, []);

  // Fetch permissions for selected role
  const fetchRolePermissions = useCallback(async () => {
    if (!selectedRole) return;
    setLoadingPerms(true);
    setDirty(false);
    try {
      const res = await api.get(`/school/roles/${selectedRole.id}/permissions`);
      const data = res.data?.data || {};
      // Normalize to { module: { action: { permission_id, granted } } }
      const normalized = {};
      if (Array.isArray(data)) {
        data.forEach((p) => {
          if (!normalized[p.module]) normalized[p.module] = {};
          normalized[p.module][p.action] = { permission_id: p.id || p.permission_id, granted: p.granted };
        });
      } else {
        // Already grouped by module
        Object.entries(data).forEach(([module, perms]) => {
          normalized[module] = {};
          (Array.isArray(perms) ? perms : []).forEach((p) => {
            normalized[module][p.action] = { permission_id: p.id || p.permission_id, granted: p.granted };
          });
        });
      }
      setPermissions(normalized);
    } catch (err) {
      showToast('Failed to load permissions', 'error');
    } finally {
      setLoadingPerms(false);
    }
  }, [selectedRole]);

  useEffect(() => { fetchRolePermissions(); }, [fetchRolePermissions]);

  // Expand all modules by default
  useEffect(() => {
    const expanded = {};
    MODULES.forEach((m) => { expanded[m.key] = true; });
    setExpandedModules(expanded);
  }, []);

  const toggleModule = (key) => {
    setExpandedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isChecked = (module, action) => {
    return permissions[module]?.[action]?.granted || false;
  };

  const getPermissionId = (module, action) => {
    return permissions[module]?.[action]?.permission_id || `${module}.${action}`;
  };

  const handleToggle = (module, action) => {
    if (selectedRole?.is_system) return;
    setDirty(true);
    setPermissions((prev) => {
      const updated = { ...prev };
      if (!updated[module]) updated[module] = {};
      const current = updated[module][action];
      updated[module] = {
        ...updated[module],
        [action]: {
          permission_id: current?.permission_id || `${module}.${action}`,
          granted: !current?.granted,
        },
      };
      return updated;
    });
  };

  const handleSelectAll = (module) => {
    if (selectedRole?.is_system) return;
    setDirty(true);
    const allGranted = ACTIONS.every((a) => isChecked(module, a));
    setPermissions((prev) => {
      const updated = { ...prev };
      if (!updated[module]) updated[module] = {};
      ACTIONS.forEach((action) => {
        updated[module] = {
          ...updated[module],
          [action]: {
            permission_id: updated[module]?.[action]?.permission_id || `${module}.${action}`,
            granted: !allGranted,
          },
        };
      });
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedRole || selectedRole.is_system) return;
    setSaving(true);
    try {
      const permList = [];
      Object.entries(permissions).forEach(([module, actions]) => {
        Object.entries(actions).forEach(([action, val]) => {
          permList.push({ permission_id: val.permission_id || `${module}.${action}`, granted: val.granted });
        });
      });
      await api.put(`/school/roles/${selectedRole.id}/permissions`, { permissions: permList });
      showToast('Permissions saved successfully');
      setDirty(false);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loadingRoles) return <Spinner />;

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permission Matrix</h1>
          <p className="text-sm text-gray-500 mt-1">Manage access permissions for each role across modules</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving || selectedRole?.is_system}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0891B2] hover:bg-[#0e7490] text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Save Changes
        </button>
      </div>

      {/* Role Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Role:</label>
          <select
            value={selectedRole?.id || ''}
            onChange={(e) => {
              const role = roles.find((r) => r.id === e.target.value || r.id === Number(e.target.value));
              setSelectedRole(role || null);
            }}
            className="flex-1 max-w-xs px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] transition-colors bg-white"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} {role.is_system ? '(System)' : ''}
              </option>
            ))}
          </select>
          {selectedRole?.is_system && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              System role — permissions are read-only
            </span>
          )}
        </div>
      </div>

      {/* Permission Grid */}
      {loadingPerms ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          {MODULES.map((module) => {
            const isExpanded = expandedModules[module.key];
            const grantedCount = ACTIONS.filter((a) => isChecked(module.key, a)).length;
            const allSelected = grantedCount === ACTIONS.length;

            return (
              <div key={module.key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.key)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{module.icon}</span>
                    <span className="text-sm font-semibold text-gray-900">{module.label}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {grantedCount}/{ACTIONS.length}
                    </span>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {/* Module Actions */}
                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-gray-50">
                    <div className="flex items-center gap-6 pt-4 flex-wrap">
                      {/* Select All */}
                      <label className={`flex items-center gap-2 ${selectedRole?.is_system ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => handleSelectAll(module.key)}
                          disabled={selectedRole?.is_system}
                          className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]/20 disabled:opacity-50"
                        />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All</span>
                      </label>
                      <div className="h-5 w-px bg-gray-200" />
                      {ACTIONS.map((action) => (
                        <label key={action} className={`flex items-center gap-2 ${selectedRole?.is_system ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked(module.key, action)}
                            onChange={() => handleToggle(module.key, action)}
                            disabled={selectedRole?.is_system}
                            className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]/20 disabled:opacity-50"
                          />
                          <span className="text-sm text-gray-700 capitalize">{action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
