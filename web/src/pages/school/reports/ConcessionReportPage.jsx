import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../services/api';

const STATUS_OPTIONS = ['all', 'approved', 'pending', 'rejected'];
const CONCESSION_TYPES = ['all', 'percentage', 'fixed'];
const CATEGORIES = ['Sibling', 'Staff Child', 'Merit', 'Financial Need', 'Management'];

const StatusBadge = ({ status }) => {
  const colors = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

const TypeBadge = ({ type, value }) => {
  if (type === 'percentage') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        {value}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
      ₹{value} Fixed
    </span>
  );
};

export default function ConcessionReportPage() {
  // Filters
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [classFilter, setClassFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Data
  const [concessions, setConcessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Table state
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'category'
  const pageSize = 15;

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchConcessions();
  }, [academicYear, statusFilter]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/school/classes');
      setClasses(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const fetchConcessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { academic_year: academicYear };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/school/fee-concessions', { params });
      setConcessions(res.data?.data || res.data || []);
    } catch (err) {
      setError('Failed to load concession data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered data
  const filteredData = useMemo(() => {
    let data = [...concessions];

    if (classFilter !== 'all') {
      data = data.filter(c => c.class_id === classFilter || c.class_name === classFilter);
    }
    if (typeFilter !== 'all') {
      data = data.filter(c => c.concession_type === typeFilter);
    }
    if (dateFrom) {
      data = data.filter(c => new Date(c.date || c.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      data = data.filter(c => new Date(c.date || c.created_at) <= new Date(dateTo));
    }

    return data;
  }, [concessions, classFilter, typeFilter, dateFrom, dateTo]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const approved = filteredData.filter(c => c.status === 'approved');
    const totalGranted = approved.length;
    const totalWaived = approved.reduce((sum, c) => sum + (parseFloat(c.amount_waived) || 0), 0);
    const uniqueStudents = new Set(approved.map(c => c.student_id)).size;
    const avgPercentage = approved.filter(c => c.concession_type === 'percentage').length > 0
      ? approved.filter(c => c.concession_type === 'percentage').reduce((sum, c) => sum + (parseFloat(c.value) || 0), 0) / approved.filter(c => c.concession_type === 'percentage').length
      : 0;

    return { totalGranted, totalWaived, uniqueStudents, avgPercentage };
  }, [filteredData]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    return CATEGORIES.map(cat => {
      const items = filteredData.filter(c => c.reason_category === cat || c.category === cat);
      const totalWaived = items.reduce((sum, c) => sum + (parseFloat(c.amount_waived) || 0), 0);
      return { category: cat, count: items.length, totalWaived };
    }).filter(c => c.count > 0);
  }, [filteredData]);

  // Sorted & paginated data
  const sortedData = useMemo(() => {
    const data = [...filteredData];
    data.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'amount_waived' || sortField === 'value') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      if (sortField === 'date' || sortField === 'created_at') {
        aVal = new Date(aVal || a.created_at).getTime();
        bVal = new Date(bVal || b.created_at).getTime();
      }
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [filteredData, sortField, sortDir]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // CSV Export
  const exportCSV = useCallback(() => {
    const headers = ['Student Name', 'Class', 'Fee Head', 'Concession Type', 'Value', 'Amount Waived', 'Reason', 'Status', 'Approved By', 'Date'];
    const rows = sortedData.map(c => [
      c.student_name || '',
      c.class_name || '',
      c.fee_head || '',
      c.concession_type || '',
      c.value || '',
      c.amount_waived || '',
      c.reason || '',
      c.status || '',
      c.approved_by || '',
      c.date || c.created_at || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `concession_report_${academicYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sortedData, academicYear]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-cyan-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0e3a5c]">Concession Report</h1>
          <p className="text-sm text-gray-500 mt-1">Analyze fee concessions granted across categories and classes</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0891B2] text-white rounded-lg hover:bg-[#0e7490] transition-colors text-sm font-medium shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Academic Year</label>
            <select
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Class</label>
            <select
              value={classFilter}
              onChange={e => { setClassFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="all">All Classes</option>
              {classes.map(cls => (
                <option key={cls._id || cls.id} value={cls.name || cls.class_name}>
                  {cls.name || cls.class_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Concession Type</label>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              {CONCESSION_TYPES.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : t === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (₹)'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#0891B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Concessions Granted</p>
              <p className="text-2xl font-bold text-[#0e3a5c]">{summaryStats.totalGranted}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Amount Waived</p>
              <p className="text-2xl font-bold text-[#0e3a5c]">₹{summaryStats.totalWaived.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Students with Concession</p>
              <p className="text-2xl font-bold text-[#0e3a5c]">{summaryStats.uniqueStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Average Concession %</p>
              <p className="text-2xl font-bold text-[#0e3a5c]">{summaryStats.avgPercentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('table')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-[#0891B2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Detail View
        </button>
        <button
          onClick={() => setViewMode('category')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'category' ? 'bg-[#0891B2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Category Breakdown
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={fetchConcessions} className="ml-auto text-sm text-red-600 font-medium hover:underline">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-cyan-200 border-t-[#0891B2] rounded-full animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Loading concession data...</p>
        </div>
      )}

      {/* Category Breakdown View */}
      {!loading && viewMode === 'category' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-[#0e3a5c] mb-4">Category Breakdown</h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No data available for breakdown</p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map(cat => {
                const maxWaived = Math.max(...categoryBreakdown.map(c => c.totalWaived), 1);
                const barWidth = (cat.totalWaived / maxWaived) * 100;
                return (
                  <div key={cat.category} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700 shrink-0">{cat.category}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-gray-50 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-[#0891B2] to-cyan-400 rounded-lg transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="text-xs font-medium text-white drop-shadow-sm">
                            {cat.count} concessions
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-28 text-right">
                      <span className="text-sm font-semibold text-[#0e3a5c]">₹{cat.totalWaived.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      {!loading && viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-[#0891B2]" onClick={() => handleSort('student_name')}>
                    Student Name <SortIcon field="student_name" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-[#0891B2]" onClick={() => handleSort('class_name')}>
                    Class <SortIcon field="class_name" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fee Head</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:text-[#0891B2]" onClick={() => handleSort('amount_waived')}>
                    Amount Waived <SortIcon field="amount_waived" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Reason</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Approved By</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-[#0891B2]" onClick={() => handleSort('date')}>
                    Date <SortIcon field="date" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      No concession records found
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => (
                    <tr key={row._id || row.id || idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.student_name}</td>
                      <td className="px-4 py-3 text-gray-600">{row.class_name}</td>
                      <td className="px-4 py-3 text-gray-600">{row.fee_head}</td>
                      <td className="px-4 py-3">
                        <TypeBadge type={row.concession_type} value={row.value} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{parseFloat(row.amount_waived || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate" title={row.reason}>
                        {row.reason || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.approved_by || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {row.date || row.created_at ? new Date(row.date || row.created_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} records
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) page = i + 1;
                  else if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md ${currentPage === page ? 'bg-[#0891B2] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
