import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { attendanceApi, master } from '../../services/erp-api';

const today = () => new Date().toISOString().split('T')[0];

const LEAVE_TYPES = [
  { value: 'CL', label: 'Casual Leave' },
  { value: 'SL', label: 'Sick Leave' },
  { value: 'EL', label: 'Earned Leave' },
  { value: 'ML', label: 'Maternity Leave' },
  { value: 'PL', label: 'Paternity Leave' },
  { value: 'LWP', label: 'Leave Without Pay' },
  { value: 'OD', label: 'On Duty' },
  { value: 'CO', label: 'Compensatory Off' },
];

export default function LeaveRequestPage() {
  const [form, setForm] = useState({
    leave_type: '',
    from_date: today(),
    to_date: today(),
    reason: '',
    contact_during_leave: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    fetchBalance();
    fetchMyLeaves();
  }, []);

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const data = await master.list('leave-balance');
      setBalance(data || []);
    } catch {
      // balance fetch optional
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchMyLeaves = async () => {
    try {
      const data = await attendanceApi.getLeaveRequests('mine');
      setMyLeaves(data || []);
    } catch {
      // optional
    }
  };

  const handleChange = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'from_date' && next.to_date < value) next.to_date = value;
      return next;
    });
  };

  const calcDays = () => {
    if (!form.from_date || !form.to_date) return 0;
    const diff = new Date(form.to_date) - new Date(form.from_date);
    return Math.max(0, Math.floor(diff / 86400000) + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leave_type) { toast.error('Please select leave type'); return; }
    if (!form.from_date || !form.to_date) { toast.error('Please select dates'); return; }
    if (!form.reason.trim()) { toast.error('Please enter a reason'); return; }
    setSubmitting(true);
    try {
      await attendanceApi.submitLeaveRequest({ ...form, days: calcDays() });
      toast.success('Leave request submitted successfully');
      setForm({ leave_type: '', from_date: today(), to_date: today(), reason: '', contact_during_leave: '' });
      fetchMyLeaves();
    } catch (err) {
      toast.error(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending:  'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

  return (
    <div className="flex flex-col h-full gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Leave Request</h1>
        <p className="text-sm text-gray-500 mt-0.5">Submit a new leave application</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1">
        {/* Leave Request Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-5">New Leave Application</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Leave Type <span className="text-red-500">*</span></label>
                <select value={form.leave_type} onChange={e => handleChange('leave_type', e.target.value)} className={inputCls} required>
                  <option value="">Select Leave Type</option>
                  {LEAVE_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">From Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.from_date} onChange={e => handleChange('from_date', e.target.value)} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.to_date} min={form.from_date} onChange={e => handleChange('to_date', e.target.value)} className={inputCls} required />
                </div>
              </div>

              {form.from_date && form.to_date && (
                <div className="bg-indigo-50 rounded-lg px-4 py-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-indigo-700 font-semibold">{calcDays()} day{calcDays() !== 1 ? 's' : ''} leave</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea
                  rows={4}
                  value={form.reason}
                  onChange={e => handleChange('reason', e.target.value)}
                  placeholder="Describe the reason for leave..."
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact During Leave</label>
                <input
                  type="text"
                  value={form.contact_during_leave}
                  onChange={e => handleChange('contact_during_leave', e.target.value)}
                  placeholder="Phone number during leave"
                  className={inputCls}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {submitting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {submitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="space-y-5">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">Leave Balance</h2>
            {loadingBalance ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : balance.length === 0 ? (
              <p className="text-sm text-gray-400">No balance data available</p>
            ) : (
              <div className="space-y-2">
                {balance.map((b, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{b.leave_type || b.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Used: {b.used || 0}</span>
                      <span className={`text-sm font-bold ${(b.balance || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {b.balance ?? b.available ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Previous Requests */}
      {myLeaves.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-800 mb-4">My Leave History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Leave Type', 'From', 'To', 'Days', 'Reason', 'Applied On', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myLeaves.map((leave, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-700">{leave.leave_type}</td>
                    <td className="px-4 py-2.5 text-gray-600">{leave.from_date}</td>
                    <td className="px-4 py-2.5 text-gray-600">{leave.to_date}</td>
                    <td className="px-4 py-2.5 text-gray-600">{leave.days || 1}</td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">{leave.reason}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{leave.created_at ? new Date(leave.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2.5">{statusBadge(leave.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
