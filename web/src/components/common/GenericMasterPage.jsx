import React, { useState, useEffect, useCallback } from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { toast } from 'react-hot-toast';

/**
 * GenericMasterPage
 * Renders a complete CRUD page from a config object.
 *
 * Config shape:
 * {
 *   title:       string           - Page heading
 *   subtitle:    string           - Optional sub-heading
 *   addLabel:    string           - "Add New ___"
 *   columns:     [{ key, label, render? }]  - Table columns
 *   fields:      [{ key, label, type, required, options? }]  - Form fields
 *   fetchFn:     async () => []   - Fetches rows
 *   saveFn:      async (data) => {}  - Create or update (pass id for update)
 *   deleteFn:    async (id) => {} - Delete row
 * }
 *
 * Field types: text | number | email | date | select | textarea | toggle
 */

export default function GenericMasterPage({ config }) {
  const { title, subtitle, addLabel, columns, fields, fetchFn, saveFn, deleteFn } = config;

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(null);   // null | 'add' | 'edit'
  const [editing, setEditing] = useState(null);   // row being edited
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [deleting,setDeleting]= useState(null);   // id being deleted

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFn();
      setRows(data || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    const empty = {};
    fields.forEach(f => { empty[f.key] = f.default ?? ''; });
    setForm(empty);
    setEditing(null);
    setModal('add');
  };

  const openEdit = (row) => {
    const prefilled = {};
    fields.forEach(f => { prefilled[f.key] = row[f.key] ?? f.default ?? ''; });
    setForm(prefilled);
    setEditing(row);
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditing(null); setForm({}); };

  const handleSave = async () => {
    // Basic required check
    for (const f of fields) {
      if (f.required && !form[f.key] && form[f.key] !== 0) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    try {
      await saveFn({ ...form, ...(editing ? { id: editing.id } : {}) });
      toast.success(editing ? 'Updated successfully' : 'Added successfully');
      closeModal();
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteFn(id);
      toast.success('Deleted successfully');
      setRows(r => r.filter(row => row.id !== id));
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // Filter rows by search
  const filtered = rows.filter(row =>
    Object.values(row).some(v =>
      String(v ?? '').toLowerCase().includes(search.toLowerCase())
    )
  );

  // Add Actions column
  const allColumns = [
    ...columns,
    {
      key: '_actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
            disabled={deleting === row.id}
            className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 font-medium transition-colors disabled:opacity-50"
          >
            {deleting === row.id ? '...' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {addLabel || `Add New`}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-gray-500 mb-3">
        {loading ? 'Loading...' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}`}
      </p>

      {/* Table */}
      <DataTable columns={allColumns} data={filtered} loading={loading} emptyMessage={`No ${title.toLowerCase()} found`} />

      {/* Add / Edit Modal */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'edit' ? `Edit ${title}` : `Add ${addLabel || title}`}
        size="md"
        footer={
          <>
            <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {saving ? 'Saving...' : (modal === 'edit' ? 'Update' : 'Save')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {fields.map(f => (
            <FormField key={f.key} field={f} value={form[f.key] ?? ''} onChange={v => setForm(prev => ({ ...prev, [f.key]: v }))} />
          ))}
        </div>
      </Modal>
    </div>
  );
}

// ─── FormField ─────────────────────────────────────────────────────────────────
function FormField({ field, value, onChange }) {
  const base = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white";

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} className={base}>
          <option value="">Select {field.label}</option>
          {(field.options || []).map(opt => (
            <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
              {typeof opt === 'string' ? opt : opt.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} className={base} placeholder={field.placeholder || ''} />
      ) : field.type === 'toggle' ? (
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => onChange(!value)}
            className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-300'} relative`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-gray-700">{value ? 'Active' : 'Inactive'}</span>
        </label>
      ) : field.type === 'color' ? (
        <div className="flex items-center gap-3">
          <input type="color" value={value || '#6366F1'} onChange={e => onChange(e.target.value)} className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
          <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="#6366F1" className={`flex-1 ${base}`} />
        </div>
      ) : (
        <input
          type={field.type || 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
          className={base}
        />
      )}

      {field.hint && <p className="text-[11px] text-gray-400 mt-1">{field.hint}</p>}
    </div>
  );
}
