import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { frontOfficeApi } from '../../services/erp-api';

const PURPOSE_OPTIONS = ['Admission Enquiry', 'Fee Query', 'Transport Query', 'General Information', 'Complaint', 'Feedback', 'TC Query', 'Other'];
const CATEGORY_OPTIONS = ['Walk-in', 'Phone Call', 'Email', 'Website', 'Referral', 'Social Media'];
const STATUS_OPTIONS = ['New', 'In Progress', 'Follow-up Needed', 'Converted', 'Closed', 'Not Interested'];

const STATUS_COLORS = {
  'New':               'bg-blue-100 text-blue-700',
  'In Progress':       'bg-yellow-100 text-yellow-700',
  'Follow-up Needed':  'bg-orange-100 text-orange-700',
  'Converted':         'bg-green-100 text-green-700',
  'Closed':            'bg-gray-100 text-gray-600',
  'Not Interested':    'bg-red-100 text-red-600',
};

const EMPTY_FORM = {
  parent_name: '', phone: '', student_name: '', purpose: '',
  category: '', status: 'New', remarks: '', next_followup_date: '',
  class_interested: '',
};

export default function EnquiryCallsPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await frontOfficeApi.getEnquiries(statusFilter ? { status: statusFilter } : {});
      setEnquiries(data || []);
    } catch (err) {
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadEnquiries(); }, [loadEnquiries]);

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ ...EMPTY_FORM, ...item }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.parent_name.trim()) { toast.error('Parent name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
    if (!form.purpose) { toast.error('Please select purpose'); return; }
    setSaving(true);
    try {
      await frontOfficeApi.saveEnquiry(editItem ? { ...form, id: editItem.id } : form);
      toast.success(editItem ? 'Enquiry updated' : 'Enquiry added successfully');
      closeModal();
      loadEnquiries();
    } catch (err) {
      toast.error(err.message || 'Failed to save enquiry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try {
      await frontOfficeApi.deleteEnquiry(id);
      toast.success('Enquiry deleted');
      setEnquiries(prev => prev.filter(e => e.id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = enquiries.filter(e =>
    [e.parent_name, e.student_name, e.phone, e.purpose, e.status].some(v =>
      String(v || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Enquiry Calls</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage admission enquiries and follow-ups</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Call
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" placeholder="Search by name, phone, purpose..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <p className="text-xs text-gray-500 mb-3">{filtered.length} enquiries</p>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-sm">No enquiries found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Enquiry ID', 'Student Name', 'Parent Name', 'Phone', 'Purpose', 'Category', 'Status', 'Date', 'Next Follow-up', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((enq) => (
                <tr key={enq.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{enq.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{enq.student_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{enq.parent_name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{enq.phone}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{enq.purpose}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{enq.category || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[enq.status] || 'bg-gray-100 text-gray-600'}`}>
                      {enq.status || 'New'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {enq.created_at ? new Date(enq.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {enq.next_followup_date || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(enq)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(enq.id)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">{editItem ? 'Edit Enquiry' : 'Add New Enquiry Call'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Parent Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.parent_name} onChange={e => setForm(p => ({...p, parent_name: e.target.value}))} className={inputCls} placeholder="Father / Mother name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone <span className="text-red-500">*</span></label>
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} className={inputCls} placeholder="Mobile number" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Student Name</label>
                  <input type="text" value={form.student_name} onChange={e => setForm(p => ({...p, student_name: e.target.value}))} className={inputCls} placeholder="Applicant name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Class Interested</label>
                  <input type="text" value={form.class_interested} onChange={e => setForm(p => ({...p, class_interested: e.target.value}))} className={inputCls} placeholder="e.g. Grade 6" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Purpose <span className="text-red-500">*</span></label>
                  <select value={form.purpose} onChange={e => setForm(p => ({...p, purpose: e.target.value}))} className={inputCls}>
                    <option value="">Select Purpose</option>
                    {PURPOSE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} className={inputCls}>
                    <option value="">Select Category</option>
                    {CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} className={inputCls}>
                    {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Next Follow-up Date</label>
                  <input type="date" value={form.next_followup_date} onChange={e => setForm(p => ({...p, next_followup_date: e.target.value}))} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
                <textarea rows={3} value={form.remarks} onChange={e => setForm(p => ({...p, remarks: e.target.value}))} className={inputCls} placeholder="Notes about the enquiry..." />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {saving ? 'Saving...' : (editItem ? 'Update' : 'Save Enquiry')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
