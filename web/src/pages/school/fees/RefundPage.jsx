import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'processed', label: 'Processed' },
  { value: 'rejected', label: 'Rejected' },
];

const REFUND_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
];

const statusBadge = (status) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    processed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

export default function RefundPage() {
  const [refunds, setRefunds] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentReceipts, setStudentReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMode, setRefundMode] = useState('cash');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRefunds = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: meta.limit };
      if (filterStatus) params.status = filterStatus;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await api.get('/school/fee-refunds', { params });
      if (res.data.success) {
        setRefunds(res.data.data);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Failed to fetch refunds', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, dateFrom, dateTo, meta.limit]);

  useEffect(() => {
    fetchRefunds(1);
  }, [fetchRefunds]);

  // Student search
  useEffect(() => {
    if (studentSearch.length < 2) { setStudentResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get('/school/students', { params: { search: studentSearch, limit: 10 } });
        if (res.data.success) setStudentResults(res.data.data);
      } catch { setStudentResults([]); }
    }, 400);
    return () => clearTimeout(timeout);
  }, [studentSearch]);

  // Load receipts when student selected
  useEffect(() => {
    if (!selectedStudent) { setStudentReceipts([]); return; }
    (async () => {
      try {
        const res = await api.get('/school/fee-collections', { params: { student_id: selectedStudent._id, status: 'paid', limit: 50 } });
        if (res.data.success) setStudentReceipts(res.data.data);
      } catch { setStudentReceipts([]); }
    })();
  }, [selectedStudent]);

  const resetForm = () => {
    setStudentSearch('');
    setStudentResults([]);
    setSelectedStudent(null);
    setStudentReceipts([]);
    setSelectedReceipt(null);
    setRefundAmount('');
    setRefundMode('cash');
    setBankAccountName('');
    setBankAccountNumber('');
    setBankIfsc('');
    setUpiId('');
    setReason('');
    setFormError('');
  };

  const handleInitiateRefund = async () => {
    setFormError('');
    if (!selectedStudent) return setFormError('Please select a student.');
    if (!selectedReceipt) return setFormError('Please select an original receipt.');
    if (!refundAmount || parseFloat(refundAmount) <= 0) return setFormError('Enter a valid refund amount.');
    if (parseFloat(refundAmount) > selectedReceipt.amount) return setFormError(`Refund amount cannot exceed ₹${selectedReceipt.amount.toLocaleString()}.`);
    if (!reason.trim()) return setFormError('Reason is required.');
    if (refundMode === 'bank_transfer' && (!bankAccountName || !bankAccountNumber || !bankIfsc)) return setFormError('Bank details are required for bank transfer.');
    if (refundMode === 'upi' && !upiId) return setFormError('UPI ID is required.');

    const body = {
      student_id: selectedStudent._id,
      fee_collection_id: selectedReceipt._id,
      refund_amount: parseFloat(refundAmount),
      reason,
      refund_mode: refundMode,
    };
    if (refundMode === 'bank_transfer') {
      body.bank_account_name = bankAccountName;
      body.bank_account_number = bankAccountNumber;
      body.bank_ifsc = bankIfsc;
    }
    if (refundMode === 'upi') {
      body.upi_id = upiId;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/school/fee-refunds', body);
      if (res.data.success) {
        setShowModal(false);
        resetForm();
        fetchRefunds(1);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to initiate refund.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this refund?')) return;
    try {
      await api.put(`/school/fee-refunds/${id}/approve`);
      fetchRefunds(meta.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve.');
    }
  };

  const handleProcess = async (id) => {
    if (!window.confirm('Mark this refund as processed?')) return;
    try {
      await api.put(`/school/fee-refunds/${id}/process`);
      fetchRefunds(meta.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process.');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    try {
      await api.put(`/school/fee-refunds/${rejectId}/reject`, { rejection_reason: rejectionReason });
      setShowRejectModal(false);
      setRejectId(null);
      setRejectionReason('');
      fetchRefunds(meta.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0e3a5c]">Fee Refunds</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fee refund requests and processing</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center px-4 py-2.5 bg-[#0891B2] text-white text-sm font-medium rounded-lg hover:bg-[#0891B2]/90 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Initiate Refund
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none"
            >
              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none" />
          </div>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#0891B2]/20 border-t-[#0891B2] rounded-full animate-spin"></div>
          </div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
            <p className="text-sm">No refund records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Refund Ref</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Student Name</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Original Receipt</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Mode</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600">Status</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-[#0e3a5c]">{r.refund_ref}</td>
                    <td className="py-3 px-3 text-gray-600">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-3 text-gray-700">{r.student_name}</td>
                    <td className="py-3 px-3 text-gray-600">{r.receipt_number}</td>
                    <td className="py-3 px-3 text-right font-medium text-gray-800">₹{r.refund_amount?.toLocaleString()}</td>
                    <td className="py-3 px-3 text-gray-600 capitalize">{r.refund_mode?.replace('_', ' ')}</td>
                    <td className="py-3 px-3 text-center">{statusBadge(r.status)}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {r.status === 'pending' && (
                          <button onClick={() => handleApprove(r._id)} className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                            Approve
                          </button>
                        )}
                        {r.status === 'approved' && (
                          <button onClick={() => handleProcess(r._id)} className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
                            Mark Processed
                          </button>
                        )}
                        {(r.status === 'pending' || r.status === 'approved') && (
                          <button
                            onClick={() => { setRejectId(r._id); setRejectionReason(''); setShowRejectModal(true); }}
                            className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchRefunds(meta.page - 1)}
                disabled={meta.page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => fetchRefunds(meta.page + 1)}
                disabled={meta.page >= meta.pages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Initiate Refund Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-xl">
              <h2 className="text-lg font-bold text-[#0e3a5c]">Initiate Refund</h2>
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
              )}

              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-800">{selectedStudent.name} ({selectedStudent.admission_number})</span>
                    <button onClick={() => { setSelectedStudent(null); setStudentSearch(''); setStudentReceipts([]); setSelectedReceipt(null); }} className="text-xs text-red-600 hover:underline">Change</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search by name or admission number..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none"
                    />
                    {studentResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {studentResults.map(s => (
                          <button key={s._id} onClick={() => { setSelectedStudent(s); setStudentResults([]); setStudentSearch(''); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                            {s.name} — {s.admission_number}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Receipt Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Original Receipt *</label>
                <select
                  value={selectedReceipt?._id || ''}
                  onChange={(e) => setSelectedReceipt(studentReceipts.find(r => r._id === e.target.value) || null)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none"
                  disabled={!selectedStudent}
                >
                  <option value="">Select receipt...</option>
                  {studentReceipts.map(r => (
                    <option key={r._id} value={r._id}>{r.receipt_number} — ₹{r.amount?.toLocaleString()} ({new Date(r.paid_date).toLocaleDateString('en-IN')})</option>
                  ))}
                </select>
              </div>

              {/* Refund Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount *</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  max={selectedReceipt?.amount || ''}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none"
                />
                {selectedReceipt && (
                  <p className="text-xs text-gray-500 mt-1">Max refundable: ₹{selectedReceipt.amount?.toLocaleString()}</p>
                )}
                {selectedReceipt && refundAmount && parseFloat(refundAmount) > selectedReceipt.amount && (
                  <p className="text-xs text-red-600 mt-1">Amount exceeds the original receipt value.</p>
                )}
              </div>

              {/* Refund Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Mode *</label>
                <select
                  value={refundMode}
                  onChange={(e) => setRefundMode(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none"
                >
                  {REFUND_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* Bank Transfer Fields */}
              {refundMode === 'bank_transfer' && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Account Holder Name *</label>
                    <input type="text" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Account Number *</label>
                    <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">IFSC Code *</label>
                    <input type="text" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none" />
                  </div>
                </div>
              )}

              {/* UPI Field */}
              {refundMode === 'upi' && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="block text-xs font-medium text-gray-600 mb-1">UPI ID *</label>
                  <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@upi" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none" />
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for refund..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none resize-none"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleInitiateRefund}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0891B2] rounded-lg hover:bg-[#0891B2]/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting...' : 'Initiate Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[#0e3a5c] mb-4">Reject Refund</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for rejection..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
