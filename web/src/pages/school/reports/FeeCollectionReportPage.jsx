import React, { useState, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../../services/api';

const PRIMARY = '#0891B2';
const DARK = '#0e3a5c';
const PIE_COLORS = ['#0891B2', '#f59e0b', '#10b981', '#8b5cf6'];

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function FeeCollectionReportPage() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    date_from: thirtyDaysAgo,
    date_to: today,
    payment_mode: '',
    class_id: '',
    collected_by: '',
  });
  const [classes, setClasses] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });

  // Fetch filter options on mount
  React.useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [classRes] = await Promise.all([
          api.get('/schools/classes'),
        ]);
        setClasses(classRes.data?.data || classRes.data || []);
      } catch (err) {
        console.error('Failed to load filter options', err);
      }
      try {
        const collectorRes = await api.get('/school/staff?role=accountant');
        setCollectors(collectorRes.data?.data || collectorRes.data || []);
      } catch (err) {
        // collectors optional
      }
    };
    fetchFilters();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGenerated(false);
    try {
      const params = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.payment_mode) params.payment_mode = filters.payment_mode;
      if (filters.class_id) params.class_id = filters.class_id;
      if (filters.collected_by) params.collected_by = filters.collected_by;

      const res = await api.get('/school/fee-collections', { params });
      const data = res.data?.data || res.data || [];
      setRawData(Array.isArray(data) ? data : []);
      setGenerated(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch fee collection data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Aggregate raw data by date
  const aggregatedData = useMemo(() => {
    const grouped = {};
    rawData.forEach((item) => {
      const date = item.date || item.payment_date || item.created_at?.split('T')[0] || 'Unknown';
      if (!grouped[date]) {
        grouped[date] = { date, receipt_count: 0, cash_amount: 0, cheque_amount: 0, online_amount: 0, upi_amount: 0, total: 0 };
      }
      grouped[date].receipt_count += 1;
      const amount = Number(item.amount) || 0;
      const mode = (item.payment_mode || '').toLowerCase();
      if (mode === 'cash') grouped[date].cash_amount += amount;
      else if (mode === 'cheque') grouped[date].cheque_amount += amount;
      else if (mode === 'online') grouped[date].online_amount += amount;
      else if (mode === 'upi') grouped[date].upi_amount += amount;
      else grouped[date].cash_amount += amount; // default to cash
      grouped[date].total += amount;
    });
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [rawData]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalCollections = aggregatedData.reduce((sum, d) => sum + d.total, 0);
    const totalReceipts = aggregatedData.reduce((sum, d) => sum + d.receipt_count, 0);
    const avgPerReceipt = totalReceipts > 0 ? totalCollections / totalReceipts : 0;
    const highest = rawData.reduce((max, item) => Math.max(max, Number(item.amount) || 0), 0);
    return { totalCollections, totalReceipts, avgPerReceipt, highest };
  }, [aggregatedData, rawData]);

  // Pie chart data
  const pieData = useMemo(() => {
    const totals = { Cash: 0, Cheque: 0, UPI: 0, Online: 0 };
    aggregatedData.forEach((d) => {
      totals.Cash += d.cash_amount;
      totals.Cheque += d.cheque_amount;
      totals.UPI += d.upi_amount;
      totals.Online += d.online_amount;
    });
    return Object.entries(totals)
      .filter(([, val]) => val > 0)
      .map(([name, value]) => ({ name, value }));
  }, [aggregatedData]);

  // Sorting
  const sortedData = useMemo(() => {
    const sorted = [...aggregatedData];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return sorted;
  }, [aggregatedData, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Totals row
  const totalsRow = useMemo(() => {
    return aggregatedData.reduce(
      (acc, d) => ({
        receipt_count: acc.receipt_count + d.receipt_count,
        cash_amount: acc.cash_amount + d.cash_amount,
        cheque_amount: acc.cheque_amount + d.cheque_amount,
        online_amount: acc.online_amount + d.online_amount,
        upi_amount: acc.upi_amount + d.upi_amount,
        total: acc.total + d.total,
      }),
      { receipt_count: 0, cash_amount: 0, cheque_amount: 0, online_amount: 0, upi_amount: 0, total: 0 }
    );
  }, [aggregatedData]);

  // Export CSV
  const exportCSV = () => {
    const headers = ['Date', 'Receipts', 'Cash', 'Cheque', 'Online', 'UPI', 'Total'];
    const rows = sortedData.map((d) => [
      d.date, d.receipt_count, d.cash_amount, d.cheque_amount, d.online_amount, d.upi_amount, d.total,
    ]);
    rows.push(['TOTAL', totalsRow.receipt_count, totalsRow.cash_amount, totalsRow.cheque_amount, totalsRow.online_amount, totalsRow.upi_amount, totalsRow.total]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fee_collection_report_${filters.date_from}_to_${filters.date_to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF (print)
  const exportPDF = () => {
    window.print();
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto print:p-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: DARK }}>Fee Collection Report</h1>
        <p className="text-gray-500 text-sm mt-1">Analyze fee collections with detailed breakdowns by date and payment mode</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
            <select
              value={filters.payment_mode}
              onChange={(e) => handleFilterChange('payment_mode', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
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
              value={filters.class_id}
              onChange={(e) => handleFilterChange('class_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name || cls.class_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Collected By</label>
            <select
              value={filters.collected_by}
              onChange={(e) => handleFilterChange('collected_by', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            >
              <option value="">All Staff</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Generating...
                </span>
              ) : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 mx-auto mb-3" style={{ color: PRIMARY }} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <p className="text-gray-500 text-sm">Generating report...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {generated && !loading && aggregatedData.length === 0 && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <h3 className="text-lg font-medium text-gray-700 mb-1">No collections found for this period</h3>
          <p className="text-gray-400 text-sm">Try adjusting the date range or filters to see results.</p>
        </div>
      )}

      {/* Report Content */}
      {generated && !loading && aggregatedData.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Collections</p>
              <p className="text-2xl font-bold mt-1" style={{ color: DARK }}>{formatCurrency(summary.totalCollections)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Receipts</p>
              <p className="text-2xl font-bold mt-1" style={{ color: DARK }}>{summary.totalReceipts.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Average per Receipt</p>
              <p className="text-2xl font-bold mt-1" style={{ color: DARK }}>{formatCurrency(Math.round(summary.avgPerReceipt))}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Highest Single Collection</p>
              <p className="text-2xl font-bold mt-1" style={{ color: DARK }}>{formatCurrency(summary.highest)}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Collection Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={aggregatedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Amount']}
                    labelFormatter={(label) => formatDate(label)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="total" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Mode Split</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No mode data</div>
              )}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-3 mb-4 print:hidden">
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Export PDF
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Export Excel
            </button>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100" style={{ backgroundColor: '#f8fafb' }}>
                    {[
                      { key: 'date', label: 'Date' },
                      { key: 'receipt_count', label: 'Receipts' },
                      { key: 'cash_amount', label: 'Cash' },
                      { key: 'cheque_amount', label: 'Cheque' },
                      { key: 'online_amount', label: 'Online' },
                      { key: 'upi_amount', label: 'UPI' },
                      { key: 'total', label: 'Total' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                      >
                        {col.label}
                        <SortIcon column={col.key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 text-gray-600">{row.receipt_count}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(row.cash_amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(row.cheque_amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(row.online_amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(row.upi_amount)}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: DARK }}>{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="border-t-2 border-gray-200 font-bold" style={{ backgroundColor: '#f0f9fb' }}>
                    <td className="px-4 py-3" style={{ color: DARK }}>TOTAL</td>
                    <td className="px-4 py-3" style={{ color: DARK }}>{totalsRow.receipt_count}</td>
                    <td className="px-4 py-3" style={{ color: DARK }}>{formatCurrency(totalsRow.cash_amount)}</td>
                    <td className="px-4 py-3" style={{ color: DARK }}>{formatCurrency(totalsRow.cheque_amount)}</td>
                    <td className="px-4 py-3" style={{ color: DARK }}>{formatCurrency(totalsRow.online_amount)}</td>
                    <td className="px-4 py-3" style={{ color: DARK }}>{formatCurrency(totalsRow.upi_amount)}</td>
                    <td className="px-4 py-3" style={{ color: DARK }}>{formatCurrency(totalsRow.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Print Footer */}
          <div className="hidden print:block mt-4 text-xs text-gray-400 text-center">
            Generated on {new Date().toLocaleString('en-IN')} | Fee Collection Report ({filters.date_from} to {filters.date_to})
          </div>
        </>
      )}
    </div>
  );
}
