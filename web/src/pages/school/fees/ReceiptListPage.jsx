import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const ReceiptListPage = () => {
  const [receipts, setReceipts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [receiptDetails, setReceiptDetails] = useState({});
  const [detailsLoading, setDetailsLoading] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Summary
  const [summary, setSummary] = useState({ totalToday: 0, amountToday: 0, cash: 0, cheque: 0, online: 0 });

  // Cancel modal
  const [cancelModal, setCancelModal] = useState({ open: false, receiptId: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Classes for filter
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/school/classes');
      if (res.data.success) setClasses(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch classes', err);
    }
  };

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (paymentMode) params.payment_mode = paymentMode;
      if (classId) params.class_id = classId;
      if (status) params.status = status;

      const res = await api.get('/school/fee-collections', { params });
      if (res.data.success) {
        setReceipts(res.data.data || []);
        setMeta(res.data.meta || { total: 0, page: 1, limit: 20, pages: 1 });
        computeSummary(res.data.data || []);
      } else {
        setError('Failed to load receipts.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load receipts.');
    } finally {
      setLoading(false);
    }
  }, [page, search, dateFrom, dateTo, paymentMode, classId, status]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const computeSummary = (data) => {
    const today = new Date().toISOString().split('T')[0];
    const todayReceipts = data.filter(r => r.date?.startsWith(today));
    setSummary({
      totalToday: todayReceipts.length,
      amountToday: todayReceipts.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
      cash: todayReceipts.filter(r => r.payment_mode === 'cash').reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
      cheque: todayReceipts.filter(r => r.payment_mode === 'cheque').reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
      online: todayReceipts.filter(r => ['upi', 'online'].includes(r.payment_mode)).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
    });
  };

  const handleExpandRow = async (id) => {
    if (expandedRow === id) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(id);
    if (!receiptDetails[id]) {
      setDetailsLoading(id);
      try {
        const res = await api.get(`/school/fee-collections/${id}`);
        if (res.data.success) {
          setReceiptDetails(prev => ({ ...prev, [id]: res.data.data }));
        }
      } catch (err) {
        console.error('Failed to fetch receipt details', err);
      } finally {
        setDetailsLoading(null);
      }
    }
  };

  const handlePrint = (receipt) => {
    const detail = receiptDetails[receipt.id] || receipt;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${receipt.receipt_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0891B2; padding-bottom: 15px; }
            .header h1 { color: #0e3a5c; margin: 0; }
            .header p { color: #666; margin: 5px 0 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 25px; }
            .info-item { font-size: 14px; }
            .info-item label { font-weight: bold; color: #0e3a5c; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
            th { background: #f8fafc; color: #0e3a5c; }
            .total { text-align: right; font-size: 18px; font-weight: bold; color: #0e3a5c; }
            .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fee Receipt</h1>
            <p>Receipt No: ${receipt.receipt_no}</p>
          </div>
          <div class="info-grid">
            <div class="info-item"><label>Student:</label> ${receipt.student_name || ''}</div>
            <div class="info-item"><label>Class:</label> ${receipt.class_name || ''}</div>
            <div class="info-item"><label>Date:</label> ${receipt.date ? new Date(receipt.date).toLocaleDateString() : ''}</div>
            <div class="info-item"><label>Payment Mode:</label> ${receipt.payment_mode || ''}</div>
          </div>
          <table>
            <thead><tr><th>Fee Head</th><th>Amount</th></tr></thead>
            <tbody>
              ${(detail.items || []).map(item => `<tr><td>${item.fee_head_name || item.fee_head || ''}</td><td>₹${parseFloat(item.amount || 0).toLocaleString()}</td></tr>`).join('')}
              ${!(detail.items?.length) ? `<tr><td>Total Fee</td><td>₹${parseFloat(receipt.amount || 0).toLocaleString()}</td></tr>` : ''}
            </tbody>
          </table>
          <div class="total">Total: ₹${parseFloat(receipt.amount || 0).toLocaleString()}</div>
          <div class="footer">This is a computer-generated receipt.</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleCancelReceipt = async () => {
    if (!cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      const res = await api.post(`/school/fee-collections/${cancelModal.receiptId}/cancel`, { reason: cancelReason });
      if (res.data.success) {
        setCancelModal({ open: false, receiptId: null });
        setCancelReason('');
        fetchReceipts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel receipt.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReceipts();
  };

  const resetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPaymentMode('');
    setClassId('');
    setStatus('');
    setPage(1);
  };

  const getModeBadge = (mode) => {
    const styles = {
      cash: 'bg-green-100 text-green-700',
      cheque: 'bg-blue-100 text-blue-700',
      upi: 'bg-purple-100 text-purple-700',
      online: 'bg-indigo-100 text-indigo-700',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[mode] || 'bg-gray-100 text-gray-700'}`}>
        {mode || 'N/A'}
      </span>
    );
  };

  const getStatusBadge = (st) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[st] || 'bg-gray-100 text-gray-700'}`}>
        {st || 'N/A'}
      </span>
    );
  };

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0e3a5c]">Fee Receipts</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all fee collection receipts</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Receipts Today</p>
          <p className="text-2xl font-bold text-[#0e3a5c] mt-1">{summary.totalToday}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Amount Today</p>
          <p className="text-2xl font-bold text-[#0891B2] mt-1">{formatCurrency(summary.amountToday)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Cash / Cheque</p>
          <p className="text-2xl font-bold text-[#0e3a5c] mt-1">
            {formatCurrency(summary.cash)} <span className="text-sm text-gray-400">/</span> {formatCurrency(summary.cheque)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Online / UPI</p>
          <p className="text-2xl font-bold text-[#0e3a5c] mt-1">{formatCurrency(summary.online)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
            >
              <option value="">All Modes</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="upi">UPI</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Receipt no, student..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-[#0891B2] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891B2]"></div>
            <span className="ml-3 text-gray-500">Loading receipts...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-12 h-12 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={fetchReceipts} className="mt-3 text-sm text-[#0891B2] hover:underline">Try again</button>
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">No receipts found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Receipt No</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Student Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Class</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">Mode</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <React.Fragment key={receipt.id}>
                    <tr
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => handleExpandRow(receipt.id)}
                    >
                      <td className="px-5 py-3 font-medium text-[#0e3a5c]">{receipt.receipt_no}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {receipt.date ? new Date(receipt.date).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="px-5 py-3 text-gray-800">{receipt.student_name}</td>
                      <td className="px-5 py-3 text-gray-600">{receipt.class_name}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-800">{formatCurrency(receipt.amount)}</td>
                      <td className="px-5 py-3 text-center">{getModeBadge(receipt.payment_mode)}</td>
                      <td className="px-5 py-3 text-center">{getStatusBadge(receipt.status)}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handlePrint(receipt)}
                            className="p-1.5 text-gray-500 hover:text-[#0891B2] hover:bg-[#0891B2]/10 rounded-lg transition-colors"
                            title="Print Receipt"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          {receipt.status !== 'cancelled' && (
                            <button
                              onClick={() => setCancelModal({ open: true, receiptId: receipt.id })}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel Receipt"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Row */}
                    {expandedRow === receipt.id && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={8} className="px-5 py-4">
                          {detailsLoading === receipt.id ? (
                            <div className="flex items-center gap-2 text-gray-500">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0891B2]"></div>
                              Loading details...
                            </div>
                          ) : receiptDetails[receipt.id]?.items?.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Fee Items Breakdown</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {receiptDetails[receipt.id].items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between bg-white border border-gray-100 rounded-lg px-3 py-2">
                                    <span className="text-gray-700">{item.fee_head_name || item.fee_head}</span>
                                    <span className="font-medium text-[#0e3a5c]">{formatCurrency(item.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No item details available.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && receipts.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((meta.page - 1) * meta.limit) + 1} - {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} receipts
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

      {/* Cancel Receipt Modal */}
      {cancelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0e3a5c]">Cancel Receipt</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Cancellation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Enter the reason for cancelling this receipt..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setCancelModal({ open: false, receiptId: null }); setCancelReason(''); }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelReceipt}
                disabled={!cancelReason.trim() || cancelLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptListPage;
