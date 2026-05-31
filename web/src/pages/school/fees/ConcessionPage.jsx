import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const ConcessionPage = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [concessions, setConcessions] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Classes & Fee Heads
  const [classes, setClasses] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);

  // New Concession Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    student_id: '',
    student_search: '',
    fee_head_id: '',
    concession_type: 'percentage',
    amount: '',
    percentage: '',
    reason: '',
  });
  const [studentResults, setStudentResults] = useState([]);
  const [studentSearching, setStudentSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reject Modal
  const [rejectModal, setRejectModal] = useState({ open: false, id: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Approve loading
  const [approving, setApproving] = useState(null);

  useEffect(() => {
    fetchClasses();
    fetchFeeHeads();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/school/classes');
      if (res.data.success) setClasses(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch classes', err);
    }
  };

  const fetchFeeHeads = async () => {
    try {
      const res = await api.get('/school/fee-heads');
      if (res.data.success) setFeeHeads(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch fee heads', err);
    }
  };

  const fetchConcessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20 };
      if (activeTab === 'pending') {
        params.status = 'pending';
      } else {
        if (statusFilter) params.status = statusFilter;
      }
      if (search) params.search = search;
      if (classId) params.class_id = classId;

      const res = await api.get('/school/fee-concessions', { params });
      if (res.data.success) {
        setConcessions(res.data.data || []);
        setMeta(res.data.meta || { total: 0, page: 1, limit: 20, pages: 1 });
      } else {
        setError('Failed to load concessions.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load concessions.');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search, classId, statusFilter]);

  useEffect(() => {
    fetchConcessions();
  }, [fetchConcessions]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Student search with debounce
  useEffect(() => {
    if (newForm.student_search.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setStudentSearching(true);
      try {
        const res = await api.get('/school/students', { params: { search: newForm.student_search, limit: 10 } });
        if (res.data.success) setStudentResults(res.data.data || []);
      } catch (err) {
        console.error('Student search failed', err);
      } finally {
        setStudentSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [newForm.student_search]);

  const handleCreateConcession = async (e) => {
    e.preventDefault();
    if (!newForm.student_id || !newForm.fee_head_id || !newForm.reason.trim()) return;
    setCreating(true);
    try {
      const body = {
        student_id: newForm.student_id,
        fee_head_id: newForm.fee_head_id,
        concession_type: newForm.concession_type,
        reason: newForm.reason,
      };
      if (newForm.concession_type === 'percentage') {
        body.percentage = parseFloat(newForm.percentage);
      } else {
        body.amount = parseFloat(newForm.amount);
      }
      const res = await api.post('/school/fee-concessions', body);
      if (res.data.success) {
        setShowNewModal(false);
        resetNewForm();
        fetchConcessions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create concession.');
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (id) => {
    setApproving(id);
    try {
      const res = await api.put(`/school/fee-concessions/${id}/approve`);
      if (res.data.success) {
        fetchConcessions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve concession.');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setRejecting(true);
    try {
      const res = await api.put(`/school/fee-concessions/${rejectModal.id}/reject`, {
        rejection_reason: rejectionReason,
      });
      if (res.data.success) {
        setRejectModal({ open: false, id: null });
        setRejectionReason('');
        fetchConcessions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject concession.');
    } finally {
      setRejecting(false);
    }
  };

  const resetNewForm = () => {
    setNewForm({
      student_id: '',
      student_search: '',
      fee_head_id: '',
      concession_type: 'percentage',
      amount: '',
      percentage: '',
      reason: '',
    });
    setStudentResults([]);
  };

  const selectStudent = (student) => {
    setNewForm(prev => ({
      ...prev,
      student_id: student.id,
      student_search: student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
    }));
    setStudentResults([]);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status || 'N/A'}
      </span>
    );
  };

  const formatValue = (concession) => {
    if (concession.concession_type === 'percentage') {
      return `${concession.percentage || 0}%`;
    }
    return `₹${parseFloat(concession.amount || 0).toLocaleString('en-IN')}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0e3a5c]">Fee Concessions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fee concession requests and approvals</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 bg-[#0891B2] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Concession
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 inline-flex">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-[#0891B2] text-white shadow-sm'
              : 'text-gray-600 hover:text-[#0e3a5c] hover:bg-gray-50'
          }`}
        >
          Pending Requests
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-[#0891B2] text-white shadow-sm'
              : 'text-gray-600 hover:text-[#0e3a5c] hover:bg-gray-50'
          }`}
        >
          All Concessions
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Student name..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setPage(1); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          {activeTab === 'all' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}
          <div>
            <button
              onClick={() => { setSearch(''); setClassId(''); setStatusFilter(''); setPage(1); }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891B2]"></div>
            <span className="ml-3 text-gray-500">Loading concessions...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-12 h-12 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={fetchConcessions} className="mt-3 text-sm text-[#0891B2] hover:underline">Try again</button>
          </div>
        ) : concessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            <p className="text-gray-500">No concessions found</p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'pending' ? 'No pending requests at this time' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Student Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Class</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Fee Head</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Value</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Reason</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Requested By</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {concessions.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{item.student_name}</td>
                    <td className="px-5 py-3 text-gray-600">{item.class_name}</td>
                    <td className="px-5 py-3 text-gray-600">{item.fee_head_name}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {item.concession_type === 'percentage' ? '%' : '₹ Fixed'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-[#0e3a5c]">{formatValue(item)}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate" title={item.reason}>
                      {item.reason}
                    </td>
                    <td className="px-5 py-3 text-center">{getStatusBadge(item.status)}</td>
                    <td className="px-5 py-3 text-gray-600">{item.requested_by}</td>
                    <td className="px-5 py-3 text-center">
                      {item.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={approving === item.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
                            title="Approve"
                          >
                            {approving === item.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-700"></div>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectModal({ open: true, id: item.id })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                            title="Reject"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && concessions.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((meta.page - 1) * meta.limit) + 1} - {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} concessions
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
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
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      page === pageNum
                        ? 'bg-[#0891B2] text-white'
                        : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Concession Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[#0e3a5c]">New Concession Request</h3>
              <button
                onClick={() => { setShowNewModal(false); resetNewForm(); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateConcession} className="space-y-4">
              {/* Student Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                <input
                  type="text"
                  value={newForm.student_search}
                  onChange={(e) => setNewForm(prev => ({ ...prev, student_search: e.target.value, student_id: '' }))}
                  placeholder="Search student by name..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
                />
                {newForm.student_id && (
                  <span className="absolute right-3 top-8 text-green-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {studentResults.length > 0 && !newForm.student_id && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {studentResults.map(student => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => selectStudent(student)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium text-gray-800">
                          {student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim()}
                        </span>
                        {student.class_name && (
                          <span className="ml-2 text-xs text-gray-500">({student.class_name})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {studentSearching && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
                    Searching...
                  </div>
                )}
              </div>

              {/* Fee Head */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Head *</label>
                <select
                  value={newForm.fee_head_id}
                  onChange={(e) => setNewForm(prev => ({ ...prev, fee_head_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
                  required
                >
                  <option value="">Select Fee Head</option>
                  {feeHeads.map(fh => (
                    <option key={fh.id} value={fh.id}>{fh.name}</option>
                  ))}
                </select>
              </div>

              {/* Concession Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concession Type *</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="concession_type"
                      value="percentage"
                      checked={newForm.concession_type === 'percentage'}
                      onChange={(e) => setNewForm(prev => ({ ...prev, concession_type: e.target.value, amount: '', percentage: '' }))}
                      className="w-4 h-4 text-[#0891B2] focus:ring-[#0891B2]"
                    />
                    <span className="text-sm text-gray-700">Percentage (%)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="concession_type"
                      value="fixed"
                      checked={newForm.concession_type === 'fixed'}
                      onChange={(e) => setNewForm(prev => ({ ...prev, concession_type: e.target.value, amount: '', percentage: '' }))}
                      className="w-4 h-4 text-[#0891B2] focus:ring-[#0891B2]"
                    />
                    <span className="text-sm text-gray-700">Fixed Amount (₹)</span>
                  </label>
                </div>
              </div>

              {/* Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {newForm.concession_type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'} *
                </label>
                <input
                  type="number"
                  min="0"
                  step={newForm.concession_type === 'percentage' ? '0.1' : '1'}
                  max={newForm.concession_type === 'percentage' ? '100' : undefined}
                  value={newForm.concession_type === 'percentage' ? newForm.percentage : newForm.amount}
                  onChange={(e) => {
                    if (newForm.concession_type === 'percentage') {
                      setNewForm(prev => ({ ...prev, percentage: e.target.value }));
                    } else {
                      setNewForm(prev => ({ ...prev, amount: e.target.value }));
                    }
                  }}
                  placeholder={newForm.concession_type === 'percentage' ? 'e.g. 25' : 'e.g. 5000'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
                  required
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  value={newForm.reason}
                  onChange={(e) => setNewForm(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  placeholder="Enter the reason for this concession request..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] resize-none"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowNewModal(false); resetNewForm(); }}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newForm.student_id || !newForm.fee_head_id || creating}
                  className="px-4 py-2 text-sm bg-[#0891B2] text-white rounded-lg font-medium hover:bg-[#0891B2]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0e3a5c]">Reject Concession</h3>
                <p className="text-sm text-gray-500">Please provide a reason for rejection.</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Enter the reason for rejecting this request..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectModal({ open: false, id: null }); setRejectionReason(''); }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejecting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConcessionPage;
