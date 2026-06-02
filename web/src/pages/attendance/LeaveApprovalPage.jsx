import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { attendanceApi } from '../../services/erp-api';

export default function LeaveApprovalPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [modal, setModal] = useState(null); // { leave, action }
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getLeaveRequests(statusFilter);
      setRequests(data || []);
    } catch (err) {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const openModal = (leave, action) => {
    setModal({ leave, action });
    setRemarks('');
  };

  const closeModal = () => { setModal(null); setRemarks(''); };

  const handleAction = async () => {
    if (!modal) return;
    if (modal.action === 'reject' && !remarks.trim()) {
      toast.error('Please provide remarks for rejection');
      return;
    }
    setProcessing(true);
    try {
      await attendanceApi.approveLeave(modal.leave.id, modal.action, remarks);
      toast.success(`Leave request ${modal.action === 'approve' ? 'approved' : 'rejected'} successfully`);
      closeModal();
      loadRequests();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending:  'bg-yellow-100 text-yellow-700 border border-yellow-200',
      approved: 'bg-green-100 text-green-700 border border-green-200',
      rejected: 'bg-red-100 text-red-700 border border-red-200',
    };
    return (
      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
      </span>
    );
  };

  const calcDays = (from, to) => {
    if (!from || !to) return 0;
    const diff = new Date(to) - new Date(from);
    return Math.max(0, Math.floor(diff / 86400000) + 1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leave Approval</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve / reject leave requests</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {['pending', 'approved', 'rejected', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Pending',  value: requests.filter(r => r.status?.toLowerCase() === 'pending').length,  color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Approved', value: requests.filter(r => r.status?.toLowerCase() === 'approved').length, color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Rejected', value: requests.filter(r => r.status?.toLowerCase() === 'rejected').length, color: 'bg-red-50 border-red-200 text-red-700' },
        ].map(stat => (
          <div key={stat.label} className={`border rounded-xl p-3 text-center ${stat.color}`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs font-semibold mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No {statusFilter !== 'all' ? statusFilter : ''} leave requests found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Staff Name', 'Department', 'Leave Type', 'From', 'To', 'Days', 'Reason', 'Applied', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((leave) => (
                <tr key={leave.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800 whitespace-nowrap">{leave.staff_name || leave.name || '—'}</div>
                    <div className="text-xs text-gray-400">{leave.employee_code || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{leave.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded">
                      {leave.leave_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{leave.from_date}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{leave.to_date}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-700">{calcDays(leave.from_date, leave.to_date)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-xs">
                    <span className="line-clamp-2">{leave.reason || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {leave.created_at ? new Date(leave.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{statusBadge(leave.status)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(leave.status?.toLowerCase() === 'pending' || !leave.status) && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openModal(leave, 'approve')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openModal(leave, 'reject')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {leave.status?.toLowerCase() !== 'pending' && leave.remarks && (
                      <span className="text-xs text-gray-400 italic">{leave.remarks}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Remarks Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className={`px-6 py-4 ${modal.action === 'approve' ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'}`}>
              <h2 className={`text-base font-bold ${modal.action === 'approve' ? 'text-green-800' : 'text-red-800'}`}>
                {modal.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {modal.leave.staff_name || modal.leave.name} — {modal.leave.leave_type} ({modal.leave.from_date} to {modal.leave.to_date})
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Remarks {modal.action === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder={modal.action === 'approve' ? 'Optional remarks...' : 'Reason for rejection (required)...'}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-60 ${
                  modal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {processing ? 'Processing...' : (modal.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
