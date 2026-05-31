import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function DayClosurePage() {
  // Today's summary
  const [todaySummary, setTodaySummary] = useState(null);
  const [todayClosed, setTodayClosed] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Cash denominations
  const [denominations, setDenominations] = useState(
    DENOMINATIONS.map(d => ({ denomination: d, count: 0 }))
  );
  const [remarks, setRemarks] = useState('');
  const [closing, setClosing] = useState(false);
  const [closureSuccess, setClosureSuccess] = useState(false);

  // Past closures
  const [closures, setClosures] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loadingClosures, setLoadingClosures] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchTodaySummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await api.get('/school/day-closure/today');
      if (res.data.success) {
        setTodaySummary(res.data.data);
        setTodayClosed(res.data.data?.is_closed || false);
      }
    } catch (err) {
      console.error('Failed to fetch today summary', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchClosures = useCallback(async (page = 1) => {
    setLoadingClosures(true);
    try {
      const params = { page, limit: meta.limit };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await api.get('/school/day-closure', { params });
      if (res.data.success) {
        setClosures(res.data.data);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Failed to fetch closures', err);
    } finally {
      setLoadingClosures(false);
    }
  }, [dateFrom, dateTo, meta.limit]);

  useEffect(() => {
    fetchTodaySummary();
  }, []);

  useEffect(() => {
    fetchClosures(1);
  }, [fetchClosures]);

  const cashTotal = denominations.reduce((sum, d) => sum + d.denomination * d.count, 0);
  const systemCashTotal = todaySummary?.cash_total || 0;
  const cashMatch = cashTotal === systemCashTotal;

  const handleDenominationChange = (index, count) => {
    const updated = [...denominations];
    updated[index] = { ...updated[index], count: Math.max(0, parseInt(count) || 0) };
    setDenominations(updated);
  };

  const handleClosureSubmit = async () => {
    if (!window.confirm('Are you sure you want to close today? This action cannot be undone.')) return;
    setClosing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const body = {
        closure_date: today,
        cash_denominations: denominations.filter(d => d.count > 0),
        remarks,
      };
      const res = await api.post('/school/day-closure', body);
      if (res.data.success) {
        setClosureSuccess(true);
        setTodayClosed(true);
        fetchClosures(1);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close day.');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0e3a5c]">Day Closure</h1>
        <p className="text-sm text-gray-500 mt-1">End-of-day fee reconciliation and closure</p>
      </div>

      {/* Today's Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#0e3a5c]">Today's Collection Summary</h2>
          {todayClosed && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Closed</span>
          )}
        </div>

        {loadingSummary ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#0891B2]/20 border-t-[#0891B2] rounded-full animate-spin"></div>
          </div>
        ) : todaySummary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-gradient-to-br from-[#0891B2]/5 to-[#0891B2]/10 rounded-lg">
              <p className="text-xs text-gray-500 font-medium">Total Collection</p>
              <p className="text-xl font-bold text-[#0e3a5c] mt-1">₹{todaySummary.total_collection?.toLocaleString() || '0'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium">Receipt Count</p>
              <p className="text-xl font-bold text-[#0e3a5c] mt-1">{todaySummary.receipt_count || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium">Cash</p>
              <p className="text-xl font-bold text-[#0e3a5c] mt-1">₹{todaySummary.cash_total?.toLocaleString() || '0'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium">Cheque</p>
              <p className="text-xl font-bold text-[#0e3a5c] mt-1">₹{todaySummary.cheque_total?.toLocaleString() || '0'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium">Online</p>
              <p className="text-xl font-bold text-[#0e3a5c] mt-1">₹{todaySummary.online_total?.toLocaleString() || '0'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium">UPI</p>
              <p className="text-xl font-bold text-[#0e3a5c] mt-1">₹{todaySummary.upi_total?.toLocaleString() || '0'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No collection data available for today.</p>
        )}
      </div>

      {/* Cash Denomination Entry & Closure (only if not closed) */}
      {!todayClosed && !closureSuccess && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-[#0e3a5c] mb-4">Cash Denomination Count</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm max-w-md">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Denomination</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">Count</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {denominations.map((d, idx) => (
                  <tr key={d.denomination} className="border-b border-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-700">₹{d.denomination.toLocaleString()}</td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={d.count}
                        onChange={(e) => handleDenominationChange(idx, e.target.value)}
                        className="w-20 border border-gray-200 rounded-md px-2 py-1 text-sm text-center focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700">₹{(d.denomination * d.count).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="py-3 px-3 font-bold text-[#0e3a5c]" colSpan={2}>Cash Total (Counted)</td>
                  <td className="py-3 px-3 text-right font-bold text-[#0e3a5c]">₹{cashTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Match/Mismatch Indicator */}
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${cashMatch ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {cashMatch ? (
              <>
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm font-medium text-green-800">Cash matches system total (₹{systemCashTotal.toLocaleString()})</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                <span className="text-sm font-medium text-red-800">
                  Mismatch — Counted: ₹{cashTotal.toLocaleString()} | System: ₹{systemCashTotal.toLocaleString()} | Difference: ₹{Math.abs(cashTotal - systemCashTotal).toLocaleString()}
                </span>
              </>
            )}
          </div>

          {/* Remarks */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Any notes for today's closure..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none resize-none"
            />
          </div>

          {/* Confirm Closure */}
          <div className="mt-4">
            <button
              onClick={handleClosureSubmit}
              disabled={closing}
              className="inline-flex items-center px-5 py-2.5 bg-[#0891B2] text-white text-sm font-medium rounded-lg hover:bg-[#0891B2]/90 disabled:opacity-50 transition-colors"
            >
              {closing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Closing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Confirm Day Closure
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Closure Success */}
      {closureSuccess && (
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-green-800">Day Closed Successfully</h3>
              <p className="text-xs text-green-600 mt-0.5">Today's collections have been reconciled and closed.</p>
            </div>
          </div>
        </div>
      )}

      {/* Past Closures */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-[#0e3a5c] mb-4">Past Closures</h2>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2] outline-none" />
          </div>
        </div>

        {loadingClosures ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#0891B2]/20 border-t-[#0891B2] rounded-full animate-spin"></div>
          </div>
        ) : closures.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No past closures found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Date</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-600">Total</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-600">Receipts</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-600">Cash</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-600">Cheque</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-600">Online</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Closed By</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {closures.map((c) => (
                  <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-[#0e3a5c]">{new Date(c.closure_date).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-3 text-right text-gray-800 font-medium">₹{c.total_collection?.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-gray-600">{c.receipt_count}</td>
                    <td className="py-3 px-3 text-right text-gray-600">₹{c.cash_total?.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-gray-600">₹{c.cheque_total?.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-gray-600">₹{c.online_total?.toLocaleString()}</td>
                    <td className="py-3 px-3 text-gray-600">{c.closed_by_name}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                        {c.status || 'closed'}
                      </span>
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
                onClick={() => fetchClosures(meta.page - 1)}
                disabled={meta.page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => fetchClosures(meta.page + 1)}
                disabled={meta.page >= meta.pages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
